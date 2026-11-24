import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SpeechCategory, TRANSLATIONS } from '../i18n';
import { AppleChanCharacter } from './appleChan';
import { OrchardAudio } from './audio';
import {
  CROP_SPECS,
  createEmptyLedger,
  generateDailyOrders,
  getSeasonForDay,
  getSellPrice,
  loadFarmState,
  sanitizeFarmState,
  saveFarmState,
  UPGRADE_PRICES,
} from './farmConfig';
import { buildOrchardWorld, OrchardWorldHandle } from './orchardWorld';
import { createOrchardTextures, OrchardTextureLibrary } from './textures';
import {
  AppleChanOutfit,
  CameraPreset,
  CropId,
  FarmState,
  Language,
  OrchardStats,
  OrchardUpgrades,
  PersistedGameState,
  ProduceId,
  RushState,
  SceneCallbacks,
  TimeMode,
  TimeOfDay,
  WeatherKind,
} from './types';

interface LightingPresetConfig {
  sky: THREE.Color;
  fog: THREE.Color;
  fogDensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  sunPos: THREE.Vector3;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  rimColor: THREE.Color;
  rimIntensity: number;
  lanternIntensity: number;
  windowEmissive: number;
  nightFactor: number;
  exposure: number;
}

const LIGHTING_PRESETS: Record<TimeOfDay, LightingPresetConfig> = {
  morning: {
    sky: new THREE.Color(0x8fd0ff),
    fog: new THREE.Color(0xbce4ff),
    fogDensity: 0.0115,
    sunColor: new THREE.Color(0xfff3d6),
    sunIntensity: 2.35,
    sunPos: new THREE.Vector3(24, 34, 18),
    hemiSky: new THREE.Color(0xbbe6ff),
    hemiGround: new THREE.Color(0x6e8f48),
    hemiIntensity: 0.95,
    rimColor: new THREE.Color(0xd8efff),
    rimIntensity: 0.45,
    lanternIntensity: 0.35,
    windowEmissive: 0.08,
    nightFactor: 0,
    exposure: 1.08,
  },
  sunset: {
    sky: new THREE.Color(0xf09d78),
    fog: new THREE.Color(0xf4b28a),
    fogDensity: 0.014,
    sunColor: new THREE.Color(0xff9c54),
    sunIntensity: 2.1,
    sunPos: new THREE.Vector3(-30, 14, 16),
    hemiSky: new THREE.Color(0xffc79e),
    hemiGround: new THREE.Color(0x5d4b37),
    hemiIntensity: 0.72,
    rimColor: new THREE.Color(0xffd2a6),
    rimIntensity: 0.55,
    lanternIntensity: 1.85,
    windowEmissive: 0.65,
    nightFactor: 0.35,
    exposure: 1.04,
  },
  night: {
    sky: new THREE.Color(0x16213d),
    fog: new THREE.Color(0x1b2747),
    fogDensity: 0.016,
    sunColor: new THREE.Color(0xaec6ff),
    sunIntensity: 0.85,
    sunPos: new THREE.Vector3(-18, 30, -22),
    hemiSky: new THREE.Color(0x3a528a),
    hemiGround: new THREE.Color(0x1c2824),
    hemiIntensity: 0.55,
    rimColor: new THREE.Color(0x88b0ff),
    rimIntensity: 0.4,
    lanternIntensity: 3.1,
    windowEmissive: 1.15,
    nightFactor: 1.0,
    exposure: 1.05,
  },
};

const STATIC_CAMERA_PRESETS: Record<
  Exclude<CameraPreset, 'appleChan'>,
  { pos: THREE.Vector3; target: THREE.Vector3 }
> = {
  orchard: {
    pos: new THREE.Vector3(9.5, 11.5, 21.0),
    target: new THREE.Vector3(0.0, 2.2, 0.0),
  },
  cottage: {
    pos: new THREE.Vector3(-1.4, 5.4, 2.2),
    target: new THREE.Vector3(-8.5, 2.6, -6.4),
  },
  windmill: {
    pos: new THREE.Vector3(-7.5, 12.2, -7.2),
    target: new THREE.Vector3(-18.0, 6.2, -18.0),
  },
  brook: {
    pos: new THREE.Vector3(24.5, 7.2, 14.5),
    target: new THREE.Vector3(14.0, 1.8, 4.5),
  },
};

const STATS_STORAGE_KEY = 'applechan_orchard_stats_v1';
const RUSH_DURATION_SEC = 60;
const TRUST_MILESTONES = [50, 100, 150, 200];

// Scratch math objects (zero GC per frame)
const _mouse = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _charPos = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _targetGoal = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _targetDelta = new THREE.Vector3();
const _splashPos = new THREE.Vector3(8.0, 0.7, 5.5);
const _dynSky = new THREE.Color();
const _dynFog = new THREE.Color();
const _dynSunColor = new THREE.Color();
const _dynHemiSky = new THREE.Color();
const _dynHemiGround = new THREE.Color();
const _dynRimColor = new THREE.Color();
const _dynSunPos = new THREE.Vector3();
const _weatherGreySky = new THREE.Color(0x7c8fa6);
const _weatherStormSky = new THREE.Color(0x4a586e);
const _weatherSnowSky = new THREE.Color(0xcbdced);

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function loadSavedStats(): OrchardStats {
  const fallback: OrchardStats = {
    applesHarvested: 0,
    goldenApples: 0,
    treesHugged: 0,
    saplingsWatered: 0,
    trustPercent: 0,
    bestRushScore: 0,
  };
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<OrchardStats>;
    return {
      applesHarvested: Math.max(0, Number(parsed.applesHarvested) || 0),
      goldenApples: Math.max(0, Number(parsed.goldenApples) || 0),
      treesHugged: Math.max(0, Number(parsed.treesHugged) || 0),
      saplingsWatered: Math.max(0, Number(parsed.saplingsWatered) || 0),
      trustPercent: Math.min(200, Math.max(0, Number(parsed.trustPercent) || 0)),
      bestRushScore: Math.max(0, Number(parsed.bestRushScore) || 0),
    };
  } catch {
    return fallback;
  }
}

function saveStats(stats: OrchardStats): void {
  try {
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota or sandbox restrictions
  }
}

export class OrchardEngine {
  private readonly container: HTMLElement;
  private readonly callbacks: SceneCallbacks;
  private readonly isSoftwareGl: boolean;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly envTexture: THREE.Texture;

  private readonly sunLight: THREE.DirectionalLight;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly rimLight: THREE.DirectionalLight;
  private readonly fog: THREE.FogExp2;

  private readonly textures: OrchardTextureLibrary;
  private readonly world: OrchardWorldHandle;
  private readonly appleChan: AppleChanCharacter;
  private readonly audio = new OrchardAudio();
  private readonly clickables: THREE.Object3D[];

  private language: Language;
  private timeMode: TimeMode = 'realtime';
  private realTimeHour = new Date().getHours() + new Date().getMinutes() / 60;
  private weather: WeatherKind = 'clear';
  private activeCameraPreset: CameraPreset | null = 'appleChan';
  private autoFocusChar = true;
  private recenterCameraDistance = false;
  private cameraTransitionActive = false;
  private currentNightFactor = 0;

  private stats: OrchardStats;
  private farm: FarmState;
  private rush: RushState;
  private comboTimer = 0;
  private lastRushEmitSec = RUSH_DURATION_SEC;

  private speechId = 0;
  private quoteCounters: Partial<Record<SpeechCategory, number>> = {};

  private readonly pressedKeys = new Set<string>();
  private inputPaused = false;

  private frameId = 0;
  private disposed = false;
  private lastTimestamp = performance.now();
  private elapsed = 0;

  // Pointer interaction state
  private pointerDownPos = { x: 0, y: 0 };
  private lastHoverRaycast = 0;

  constructor(
    container: HTMLElement,
    callbacks: SceneCallbacks,
    initialLanguage: Language,
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.language = initialLanguage;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.stats = loadSavedStats();
    this.farm = loadFarmState();
    this.rush = {
      active: false,
      finished: false,
      timeLeft: RUSH_DURATION_SEC,
      score: 0,
      combo: 0,
      bestScore: this.stats.bestRushScore,
      isNewRecord: false,
      roundApples: 0,
      roundGolden: 0,
    };

    // 1. WebGLRenderer with ACESFilmicToneMapping & SRGBColorSpace
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = LIGHTING_PRESETS.morning.exposure;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 2. Scene, Horizon-Matched Fog & Studio RoomEnvironment IBL
    this.scene = new THREE.Scene();
    const initPreset = LIGHTING_PRESETS.morning;
    this.scene.background = initPreset.sky.clone();
    this.fog = new THREE.FogExp2(initPreset.fog.getHex(), initPreset.fogDensity);
    this.scene.fog = this.fog;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmrem.dispose();

    // 3. Camera & Smoothly Damped OrbitControls (auto-focused on Apple-chan on launch!)
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 320);
    this.camera.position.set(2.4, 4.4, 9.6);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(-0.6, 1.15, 2.8);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.475;
    this.controls.minPolarAngle = 0.2;
    this.controls.minDistance = 2.8;
    this.controls.maxDistance = 54;
    this.controls.update();

    this.controls.addEventListener('start', this.onUserControlStart);

    // 4. Balanced 3-Point Warm/Cool Lighting Rig (expanded shadow frustum for bigger valley)
    this.sunLight = new THREE.DirectionalLight(
      initPreset.sunColor,
      initPreset.sunIntensity,
    );
    this.sunLight.position.copy(initPreset.sunPos);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 130;
    const d = 38;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(
      initPreset.hemiSky,
      initPreset.hemiGround,
      initPreset.hemiIntensity,
    );
    this.scene.add(this.hemiLight);

    this.rimLight = new THREE.DirectionalLight(
      initPreset.rimColor,
      initPreset.rimIntensity,
    );
    this.rimLight.position.set(-20, 16, -24);
    this.scene.add(this.rimLight);

    // 5. Procedural Textures (with live EN/ZH 3D signboards), World & Apple-chan
    this.textures = createOrchardTextures(this.renderer);
    this.textures.setSignLanguage(initialLanguage);

    this.world = buildOrchardWorld(this.textures);
    this.world.syncFarmPlots(this.farm.plots);
    this.world.setMagnetBonus(this.farm.upgrades.magnetBasket);
    this.scene.add(this.world.group);

    // Drop a few inviting collectible apples along the sunny orchard path on startup!
    this.world.spawnStarterApples();

    this.appleChan = new AppleChanCharacter(
      this.textures,
      this.world.groundHeightAt,
      this.world.resolveWalkPosition,
      this.world.trees.map((t) => t.target),
      {
        onTreeHugPeak: (treeIndex, pos) => {
          if (!this.rush.active && !this.spendEnergy(4)) {
            this.emitSpeechCategory('lowEnergy');
            return;
          }
          const { dropped, isBonus } = this.world.triggerTreeShake(
            treeIndex,
            pos,
            this.farm.upgrades.magnetBasket,
          );
          this.audio.playTreeHug();
          if (dropped > 0) {
            window.setTimeout(() => this.audio.playApplePop(), 220);
          }
          if (this.rush.active && isBonus) {
            this.rush.score += 40;
            this.emitRushState();
          }
          this.addProgress({
            treesHugged: 1,
            trustDelta: isBonus ? 8 : 5,
          });
        },
        onWaterSplash: (pos) => {
          const energyCost = this.farm.upgrades.copperCan ? 3 : 6;
          if (!this.spendEnergy(energyCost)) {
            this.emitSpeechCategory('lowEnergy');
            return;
          }
          this.world.triggerWaterNursery(pos);
          this.audio.playWatering();
          let wateredAny = false;
          const nextPlots = this.farm.plots.map((plot) => {
            if (!plot.watered && (this.farm.upgrades.copperCan || plot.crop !== null)) {
              wateredAny = true;
              return { ...plot, watered: true };
            }
            return plot;
          });
          // If no crops planted yet, still moisten all plots visually
          const finalPlots = wateredAny
            ? nextPlots
            : this.farm.plots.map((plot) => ({ ...plot, watered: true }));
          this.updateFarm({ ...this.farm, plots: finalPlots });
          this.world.syncFarmPlots(finalPlots);
          this.addProgress({
            saplingsWatered: 1,
            trustDelta: this.farm.upgrades.copperCan ? 8 : 6,
          });
        },
        onSpeechCategory: (cat) => {
          this.emitSpeechCategory(cat);
        },
        onActionChange: (action) => {
          this.callbacks.onActionChange(action);
        },
      },
    );
    this.scene.add(this.appleChan.group);
    this.appleChan.getWorldPosition(_charPos);
    this.controls.target.set(_charPos.x, _charPos.y + 1.15, _charPos.z);
    this.camera.position.set(_charPos.x + 3.0, _charPos.y + 4.0, _charPos.z + 6.8);
    this.controls.update();

    this.clickables = [this.appleChan.hitProxy, ...this.world.clickables];

    // Hydrate React HUD with persisted stats, farm state & best score
    this.callbacks.onStatsChange({ ...this.stats });
    this.callbacks.onFarmStateChange(this.cloneFarm());
    this.callbacks.onRushStateChange({ ...this.rush });

    // Pre-warm shaders on GPU devices
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Event listeners
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('webglcontextlost', this.onContextLost);

    // Start loop
    this.tick();
  }

  public setLanguage(lang: Language): void {
    this.language = lang;
    // Dynamically redraw in-world 3D wooden entrance sign & market shop sign!
    this.textures.setSignLanguage(lang);
  }

  public setInputPaused(paused: boolean): void {
    this.inputPaused = paused;
    if (paused) {
      this.pressedKeys.clear();
    }
  }

  public setTimeMode(mode: TimeMode): void {
    this.timeMode = mode;
  }

  public setRealTimeHour(hourDecimal: number): void {
    this.realTimeHour = ((hourDecimal % 24) + 24) % 24;
  }

  public setWeather(weather: WeatherKind): void {
    this.weather = weather;
    this.world.setWeather(weather);
    // Rain & storms naturally moisten outdoor garden plots!
    if (weather === 'rain' || weather === 'storm') {
      const hasDryPlot = this.farm.plots.some((p) => !p.watered);
      if (hasDryPlot) {
        const wetPlots = this.farm.plots.map((p) => ({ ...p, watered: true }));
        this.updateFarm({ ...this.farm, plots: wetPlots });
        this.world.syncFarmPlots(wetPlots);
      }
    }
  }

  public getPersistedState(): PersistedGameState {
    return {
      farm: this.cloneFarm(),
      stats: { ...this.stats },
      outfit: this.appleChan.getOutfit(),
    };
  }

  public hydratePersistedState(state: Partial<PersistedGameState>): void {
    if (state.farm) {
      const cleanFarm = sanitizeFarmState(state.farm);
      this.farm = cleanFarm;
      saveFarmState(cleanFarm);
      this.world.syncFarmPlots(cleanFarm.plots);
      this.world.setMagnetBonus(cleanFarm.upgrades.magnetBasket);
      this.callbacks.onFarmStateChange(this.cloneFarm());
    }
    if (state.stats && typeof state.stats === 'object') {
      const s = state.stats;
      this.stats = {
        applesHarvested: Math.max(0, Number(s.applesHarvested) || 0),
        goldenApples: Math.max(0, Number(s.goldenApples) || 0),
        treesHugged: Math.max(0, Number(s.treesHugged) || 0),
        saplingsWatered: Math.max(0, Number(s.saplingsWatered) || 0),
        trustPercent: Math.min(200, Math.max(0, Number(s.trustPercent) || 0)),
        bestRushScore: Math.max(0, Number(s.bestRushScore) || 0),
      };
      this.rush.bestScore = this.stats.bestRushScore;
      saveStats(this.stats);
      this.callbacks.onStatsChange({ ...this.stats });
      this.emitRushState();
    }
    if (state.outfit === 'common' || state.outfit === 'spring' || state.outfit === 'idol') {
      this.appleChan.setOutfit(state.outfit);
    }
  }

  public setOutfit(outfit: AppleChanOutfit): void {
    this.appleChan.setOutfit(outfit);
    this.audio.playApplePop();
    const cat: SpeechCategory =
      outfit === 'spring'
        ? 'outfitSpring'
        : outfit === 'idol'
          ? 'outfitIdol'
          : 'outfitCommon';
    this.emitSpeechCategory(cat);
  }

  public setCameraPreset(preset: CameraPreset): void {
    this.activeCameraPreset = preset;
    if (preset === 'appleChan') {
      this.autoFocusChar = true;
      this.recenterCameraDistance = true;
      this.cameraTransitionActive = false;
    } else {
      this.autoFocusChar = false;
      this.recenterCameraDistance = false;
      this.cameraTransitionActive = true;
    }
  }

  public triggerHugNearestTree(): void {
    if (!this.rush.active && this.farm.energy < 4) {
      this.emitSpeechCategory('lowEnergy');
      return;
    }
    this.appleChan.commandHugTree();
  }

  public triggerWaterSaplings(): void {
    const cost = this.farm.upgrades.copperCan ? 3 : 6;
    if (this.farm.energy < cost) {
      this.emitSpeechCategory('lowEnergy');
      return;
    }
    this.appleChan.commandWaterSaplings();
  }

  public triggerWave(): void {
    this.appleChan.commandWave();
    this.audio.playCheerfulWave();
  }

  public triggerInteract(): void {
    this.appleChan.getWorldPosition(_charPos);
    if (this.world.isNearShippingBin(_charPos.x, _charPos.z)) {
      this.callbacks.onOpenJournalTab('bag');
      return;
    }
    if (this.world.isNearShopStall(_charPos.x, _charPos.z)) {
      this.callbacks.onOpenJournalTab('shop');
      return;
    }
    if (this.world.isNearCottageDoor(_charPos.x, _charPos.z)) {
      this.sleepAndAdvanceDay();
      return;
    }
    if (this.world.isNearNursery(_charPos.x, _charPos.z)) {
      const ripeIdx = this.farm.plots.findIndex(
        (p) => p.crop !== null && p.stage >= p.maxStage,
      );
      if (ripeIdx !== -1) {
        this.interactFarmPlot(ripeIdx);
        return;
      }
      const emptyIdx = this.farm.plots.findIndex((p) => p.crop === null);
      if (emptyIdx !== -1 && this.getFirstAvailableSeed() !== null) {
        this.interactFarmPlot(emptyIdx);
        return;
      }
      this.triggerWaterSaplings();
      return;
    }
    const nearTree = this.world.getNearestTree(_charPos.x, _charPos.z, 5.2);
    if (nearTree !== null) {
      this.appleChan.commandHugTree(nearTree);
    } else {
      this.triggerHugNearestTree();
    }
  }

  // =========================================================================
  // STARDEW VALLEY FARMING, CRAFTING, SHOPPING & DAY CYCLE ACTIONS
  // =========================================================================
  private cloneFarm(): FarmState {
    return {
      ...this.farm,
      inventory: {
        ...this.farm.inventory,
        seeds: { ...this.farm.inventory.seeds },
      },
      upgrades: { ...this.farm.upgrades },
      plots: this.farm.plots.map((p) => ({ ...p })),
      shippingBin: { ...this.farm.shippingBin },
      orders: this.farm.orders.map((o) => ({ ...o })),
      pendingSummary: this.farm.pendingSummary
        ? {
            ...this.farm.pendingSummary,
            shipped: { ...this.farm.pendingSummary.shipped },
          }
        : null,
    };
  }

  private updateFarm(next: FarmState): void {
    this.farm = next;
    saveFarmState(this.farm);
    this.callbacks.onFarmStateChange(this.cloneFarm());
  }

  private spendEnergy(amount: number): boolean {
    if (this.farm.energy < amount) return false;
    this.updateFarm({
      ...this.farm,
      energy: Math.max(0, this.farm.energy - amount),
    });
    return true;
  }

  private getFirstAvailableSeed(): CropId | null {
    const order: CropId[] = ['goldenSapling', 'appleSapling', 'honeyBerry'];
    for (const c of order) {
      if (this.farm.inventory.seeds[c] > 0) return c;
    }
    return null;
  }

  public plantInFirstEmptyPlot(): void {
    const ripeIdx = this.farm.plots.findIndex(
      (p) => p.crop !== null && p.stage >= p.maxStage,
    );
    if (ripeIdx !== -1) {
      this.interactFarmPlot(ripeIdx);
      return;
    }
    const emptyIdx = this.farm.plots.findIndex((p) => p.crop === null);
    if (emptyIdx !== -1) {
      this.interactFarmPlot(emptyIdx);
    } else {
      this.triggerWaterSaplings();
    }
  }

  public interactFarmPlot(plotIndex: number): void {
    const plot = this.farm.plots[plotIndex];
    if (!plot) return;

    // 1. If RIPE -> Harvest directly into basket!
    if (plot.crop !== null && plot.stage >= plot.maxStage) {
      const spec = CROP_SPECS[plot.crop];
      const inv = { ...this.farm.inventory, seeds: { ...this.farm.inventory.seeds } };
      inv[spec.yieldItem] += spec.yieldAmount;
      const nextPlots = this.farm.plots.map((p, idx) =>
        idx === plotIndex
          ? { ...p, crop: null, stage: 0, maxStage: 1, watered: false }
          : p,
      );
      this.updateFarm({ ...this.farm, inventory: inv, plots: nextPlots });
      this.world.syncFarmPlots(nextPlots);
      this.appleChan.pulseHappyFace(0.9);
      this.audio.playCollect(plot.crop === 'goldenSapling', 3);
      this.emitSpeechCategory('cropHarvest');
      this.addProgress({
        apples: spec.yieldItem === 'redApples' ? spec.yieldAmount : 0,
        golden: spec.yieldItem === 'goldenApples' ? spec.yieldAmount : 0,
        trustDelta: 8,
      });
      return;
    }

    // 2. If EMPTY -> Plant a seed from pouch!
    if (plot.crop === null) {
      const seed = this.getFirstAvailableSeed();
      if (!seed) {
        this.emitSpeechCategory('noSeeds');
        this.callbacks.onOpenJournalTab('shop');
        return;
      }
      if (!this.spendEnergy(3)) {
        this.emitSpeechCategory('lowEnergy');
        return;
      }
      const spec = CROP_SPECS[seed];
      const nextSeeds = {
        ...this.farm.inventory.seeds,
        [seed]: Math.max(0, this.farm.inventory.seeds[seed] - 1),
      };
      const nextPlots = this.farm.plots.map((p, idx) =>
        idx === plotIndex
          ? { ...p, crop: seed, stage: 0, maxStage: spec.growDays, watered: false }
          : p,
      );
      this.updateFarm({
        ...this.farm,
        inventory: { ...this.farm.inventory, seeds: nextSeeds },
        plots: nextPlots,
      });
      this.world.syncFarmPlots(nextPlots);
      this.audio.playPlantSeed();
      this.emitSpeechCategory('planted');
      return;
    }

    // 3. If PLANTED & DRY -> Water it (or all plots if Copper Can owned)!
    if (!plot.watered) {
      const cost = this.farm.upgrades.copperCan ? 3 : 4;
      if (!this.spendEnergy(cost)) {
        this.emitSpeechCategory('lowEnergy');
        return;
      }
      const nextPlots = this.farm.plots.map((p, idx) =>
        this.farm.upgrades.copperCan || idx === plotIndex ? { ...p, watered: true } : p,
      );
      this.updateFarm({ ...this.farm, plots: nextPlots });
      this.world.syncFarmPlots(nextPlots);
      this.world.triggerWaterNursery(_splashPos);
      this.audio.playWatering();
      this.emitSpeechCategory('water');
      this.addProgress({ saplingsWatered: 1, trustDelta: 4 });
    }
  }

  public shipItem(item: ProduceId, count: number): void {
    const owned = this.farm.inventory[item];
    const qty = Math.min(owned, Math.max(0, count));
    if (qty <= 0) return;

    const nextInv = {
      ...this.farm.inventory,
      [item]: owned - qty,
      seeds: { ...this.farm.inventory.seeds },
    };
    const nextBin = {
      ...this.farm.shippingBin,
      [item]: this.farm.shippingBin[item] + qty,
    };
    this.updateFarm({
      ...this.farm,
      inventory: nextInv,
      shippingBin: nextBin,
    });
    this.world.triggerShippingBinBounce();
    this.audio.playCoinChime();
    this.emitSpeechCategory('shipped');
  }

  public eatProduce(item: 'redApples' | 'honeyBerries'): void {
    if (this.farm.inventory[item] <= 0) return;
    if (this.farm.energy >= this.farm.maxEnergy) return;
    const nextInv = {
      ...this.farm.inventory,
      [item]: this.farm.inventory[item] - 1,
      seeds: { ...this.farm.inventory.seeds },
    };
    this.updateFarm({
      ...this.farm,
      energy: Math.min(this.farm.maxEnergy, this.farm.energy + 25),
      inventory: nextInv,
    });
    this.appleChan.pulseHappyFace(0.8);
    this.audio.playApplePop();
    this.emitSpeechCategory('ateFruit');
  }

  public craftArtisan(recipe: 'cider' | 'pie'): void {
    const inv = { ...this.farm.inventory, seeds: { ...this.farm.inventory.seeds } };
    if (recipe === 'cider') {
      if (inv.redApples < 3) return;
      inv.redApples -= 3;
      inv.ciderBottles += 1;
    } else {
      if (inv.redApples < 2 || inv.goldenApples < 1) return;
      inv.redApples -= 2;
      inv.goldenApples -= 1;
      inv.applePies += 1;
    }
    this.updateFarm({ ...this.farm, inventory: inv });
    this.audio.playCheerfulWave();
    this.emitSpeechCategory('crafted');
    this.addProgress({ trustDelta: 6 });
  }

  public buySeed(crop: CropId): void {
    const price = CROP_SPECS[crop].seedPrice;
    if (this.farm.gold < price) return;
    const nextSeeds = {
      ...this.farm.inventory.seeds,
      [crop]: this.farm.inventory.seeds[crop] + 1,
    };
    this.updateFarm({
      ...this.farm,
      gold: this.farm.gold - price,
      inventory: { ...this.farm.inventory, seeds: nextSeeds },
    });
    this.audio.playCoinChime();
  }

  public buyUpgrade(key: keyof OrchardUpgrades): void {
    if (this.farm.upgrades[key]) return;
    const price = UPGRADE_PRICES[key];
    if (this.farm.gold < price) return;
    const nextUpgrades = { ...this.farm.upgrades, [key]: true };
    this.updateFarm({
      ...this.farm,
      gold: this.farm.gold - price,
      upgrades: nextUpgrades,
    });
    this.world.setMagnetBonus(nextUpgrades.magnetBasket);
    this.audio.playRushFinish(true);
    this.addProgress({ trustDelta: 12 });
  }

  public deliverOrder(orderId: string): void {
    const idx = this.farm.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;
    const order = this.farm.orders[idx];
    if (order.completed) return;
    if (this.farm.inventory[order.item] < order.required) return;

    const nextInv = {
      ...this.farm.inventory,
      [order.item]: this.farm.inventory[order.item] - order.required,
      seeds: { ...this.farm.inventory.seeds },
    };
    const nextOrders = this.farm.orders.map((o, i) =>
      i === idx ? { ...o, completed: true } : o,
    );
    this.updateFarm({
      ...this.farm,
      gold: this.farm.gold + order.rewardGold,
      inventory: nextInv,
      orders: nextOrders,
    });
    this.audio.playRushFinish(true);
    this.emitSpeechCategory('orderComplete');
    this.addProgress({ trustDelta: order.rewardTrust });
  }

  public sleepAndAdvanceDay(): void {
    if (this.rush.active) return;

    const shipped = { ...this.farm.shippingBin };
    const produceKeys: ProduceId[] = [
      'redApples',
      'goldenApples',
      'honeyBerries',
      'ciderBottles',
      'applePies',
    ];
    let totalGoldEarned = 0;
    for (const k of produceKeys) {
      totalGoldEarned +=
        shipped[k] * getSellPrice(k, this.farm.upgrades.artisanKeg);
    }

    let cropsGrown = 0;
    const nextPlots = this.farm.plots.map((p) => {
      if (p.crop !== null && p.watered && p.stage < p.maxStage) {
        cropsGrown++;
        return { ...p, stage: Math.min(p.maxStage, p.stage + 1), watered: false };
      }
      return { ...p, watered: false };
    });

    const finishedDay = this.farm.day;
    const finishedSeason = this.farm.season;
    const nextDay = finishedDay + 1;
    const nextSeason = getSeasonForDay(nextDay);

    const nextFarm: FarmState = {
      ...this.farm,
      day: nextDay,
      season: nextSeason,
      gold: this.farm.gold + totalGoldEarned,
      energy: this.farm.maxEnergy,
      plots: nextPlots,
      shippingBin: createEmptyLedger(),
      orders: generateDailyOrders(nextDay),
      pendingSummary: {
        dayFinished: finishedDay,
        season: finishedSeason,
        shipped,
        totalGoldEarned,
        cropsGrown,
      },
    };

    this.updateFarm(nextFarm);
    this.world.syncFarmPlots(nextPlots);
    this.world.spawnStarterApples();
    this.audio.playNewDayChime();
    this.emitSpeechCategory('newDay');
  }

  public dismissDaySummary(): void {
    if (!this.farm.pendingSummary) return;
    this.updateFarm({ ...this.farm, pendingSummary: null });
  }

  // =========================================================================
  // 60-SECOND HARVEST RUSH ARCADE MINI-GAME
  // =========================================================================
  public startHarvestRush(): void {
    this.rush = {
      active: true,
      finished: false,
      timeLeft: RUSH_DURATION_SEC,
      score: 0,
      combo: 0,
      bestScore: this.stats.bestRushScore,
      isNewRecord: false,
      roundApples: 0,
      roundGolden: 0,
    };
    this.comboTimer = 0;
    this.lastRushEmitSec = RUSH_DURATION_SEC;
    this.world.setRushActive(true);
    this.appleChan.setRushMode(true);
    this.audio.playRushStart();
    this.emitSpeechCategory('rushStart');
    this.emitRushState();
  }

  public stopHarvestRush(dismissResults = true): void {
    this.world.setRushActive(false);
    this.appleChan.setRushMode(false);
    this.rush = {
      ...this.rush,
      active: false,
      finished: dismissResults ? false : this.rush.finished,
      combo: 0,
    };
    this.emitRushState();
  }

  public setAudioEnabled(enabled: boolean): void {
    this.audio.setEnabled(enabled);
  }

  private emitSpeechCategory(cat: SpeechCategory): void {
    const pool = TRANSLATIONS[this.language].quotes[cat];
    if (!pool || pool.length === 0) return;
    const idx = this.quoteCounters[cat] ?? 0;
    this.quoteCounters[cat] = idx + 1;
    this.speechId += 1;
    this.callbacks.onSpeech({
      id: this.speechId,
      text: pool[idx % pool.length],
    });
  }

  private addProgress(delta: {
    apples?: number;
    golden?: number;
    treesHugged?: number;
    saplingsWatered?: number;
    trustDelta?: number;
  }): void {
    const prevTrust = this.stats.trustPercent;
    const nextTrust = Math.min(200, prevTrust + (delta.trustDelta ?? 0));
    this.stats = {
      ...this.stats,
      applesHarvested: this.stats.applesHarvested + (delta.apples ?? 0),
      goldenApples: this.stats.goldenApples + (delta.golden ?? 0),
      treesHugged: this.stats.treesHugged + (delta.treesHugged ?? 0),
      saplingsWatered: this.stats.saplingsWatered + (delta.saplingsWatered ?? 0),
      trustPercent: nextTrust,
    };
    saveStats(this.stats);
    this.callbacks.onStatsChange({ ...this.stats });

    for (const milestone of TRUST_MILESTONES) {
      if (prevTrust < milestone && nextTrust >= milestone) {
        this.emitSpeechCategory('archiveUnlock');
        break;
      }
    }
  }

  private emitRushState(): void {
    this.callbacks.onRushStateChange({ ...this.rush });
  }

  private onUserControlStart = (): void => {
    // Allow free 360° mouse orbiting around Apple-chan without losing auto-focus!
    // Only cancel static landmark fly-to transitions or distance recentering.
    if (this.cameraTransitionActive) {
      this.cameraTransitionActive = false;
      if (this.activeCameraPreset !== 'appleChan') {
        this.activeCameraPreset = null;
        this.callbacks.onCameraPresetClear();
      }
    }
    this.recenterCameraDistance = false;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (
      this.inputPaused ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    const code = e.code;
    if (
      code === 'KeyW' ||
      code === 'KeyA' ||
      code === 'KeyS' ||
      code === 'KeyD' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      this.pressedKeys.add(code);
      // Immediately auto-focus camera back on Apple-chan whenever player moves!
      if (!this.autoFocusChar || this.cameraTransitionActive) {
        this.autoFocusChar = true;
        this.recenterCameraDistance = true;
        this.cameraTransitionActive = false;
        this.activeCameraPreset = 'appleChan';
      }
    } else if (code === 'Space') {
      e.preventDefault();
      if (!this.autoFocusChar) {
        this.autoFocusChar = true;
        this.recenterCameraDistance = true;
        this.cameraTransitionActive = false;
        this.activeCameraPreset = 'appleChan';
      }
      if (this.appleChan.triggerJump()) {
        this.audio.playJump();
      }
    } else if (code === 'KeyE') {
      this.triggerInteract();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.pressedKeys.delete(e.code);
  };

  private onWindowBlur = (): void => {
    this.pressedKeys.clear();
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDownPos.x = e.clientX;
    this.pointerDownPos.y = e.clientY;
  };

  private onPointerUp = (e: PointerEvent): void => {
    const dist = Math.hypot(
      e.clientX - this.pointerDownPos.x,
      e.clientY - this.pointerDownPos.y,
    );
    if (dist > 6) return; // Was an orbit drag, not a click

    const rect = this.renderer.domElement.getBoundingClientRect();
    _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_mouse, this.camera);
    const hits = _raycaster.intersectObjects(this.clickables, false);
    if (hits.length === 0) return;

    const hitData = hits[0].object.userData;
    if (hitData.clickable === 'appleChan') {
      this.triggerWave();
    } else if (hitData.clickable === 'tree') {
      if (!this.rush.active && this.farm.energy < 4) {
        this.emitSpeechCategory('lowEnergy');
        return;
      }
      this.appleChan.commandHugTree(hitData.treeIndex);
    } else if (hitData.clickable === 'farmPlot') {
      this.interactFarmPlot(hitData.plotIndex);
    } else if (hitData.clickable === 'shippingBin') {
      this.world.triggerShippingBinBounce();
      this.callbacks.onOpenJournalTab('bag');
    } else if (hitData.clickable === 'shopStall') {
      this.callbacks.onOpenJournalTab('shop');
    } else if (hitData.clickable === 'cottageDoor') {
      this.sleepAndAdvanceDay();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const now = performance.now();
    if (now - this.lastHoverRaycast < 65) return;
    this.lastHoverRaycast = now;

    const rect = this.renderer.domElement.getBoundingClientRect();
    _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_mouse, this.camera);
    const hits = _raycaster.intersectObjects(this.clickables, false);
    this.renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
  };

  private onResize = (): void => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private computeTargetLighting(): {
    sky: THREE.Color;
    fog: THREE.Color;
    fogDensity: number;
    sunColor: THREE.Color;
    sunIntensity: number;
    sunPos: THREE.Vector3;
    hemiSky: THREE.Color;
    hemiGround: THREE.Color;
    hemiIntensity: number;
    rimColor: THREE.Color;
    rimIntensity: number;
    lanternIntensity: number;
    windowEmissive: number;
    nightFactor: number;
    exposure: number;
  } {
    let base: LightingPresetConfig;
    let blendB: LightingPresetConfig | null = null;
    let blendT = 0;

    if (this.timeMode !== 'realtime') {
      base = LIGHTING_PRESETS[this.timeMode];
    } else {
      const h = this.realTimeHour;
      if (h >= 5.2 && h < 7.2) {
        // Dawn: night -> sunset -> morning
        const t = (h - 5.2) / 2.0;
        if (t < 0.5) {
          base = LIGHTING_PRESETS.night;
          blendB = LIGHTING_PRESETS.sunset;
          blendT = t * 2;
        } else {
          base = LIGHTING_PRESETS.sunset;
          blendB = LIGHTING_PRESETS.morning;
          blendT = (t - 0.5) * 2;
        }
      } else if (h >= 7.2 && h < 16.5) {
        base = LIGHTING_PRESETS.morning;
      } else if (h >= 16.5 && h < 19.2) {
        // Golden sunset transition
        const t = (h - 16.5) / 2.7;
        if (t < 0.55) {
          base = LIGHTING_PRESETS.morning;
          blendB = LIGHTING_PRESETS.sunset;
          blendT = t / 0.55;
        } else {
          base = LIGHTING_PRESETS.sunset;
          blendB = LIGHTING_PRESETS.night;
          blendT = (t - 0.55) / 0.45;
        }
      } else {
        base = LIGHTING_PRESETS.night;
      }
    }

    _dynSky.copy(base.sky);
    _dynFog.copy(base.fog);
    _dynSunColor.copy(base.sunColor);
    _dynHemiSky.copy(base.hemiSky);
    _dynHemiGround.copy(base.hemiGround);
    _dynRimColor.copy(base.rimColor);
    _dynSunPos.copy(base.sunPos);

    let fogDensity = base.fogDensity * 0.82; // Slightly lighter fog for bigger expanded valley
    let sunIntensity = base.sunIntensity;
    let hemiIntensity = base.hemiIntensity;
    let rimIntensity = base.rimIntensity;
    let lanternIntensity = base.lanternIntensity;
    let windowEmissive = base.windowEmissive;
    let nightFactor = base.nightFactor;
    let exposure = base.exposure;

    if (blendB) {
      _dynSky.lerp(blendB.sky, blendT);
      _dynFog.lerp(blendB.fog, blendT);
      _dynSunColor.lerp(blendB.sunColor, blendT);
      _dynHemiSky.lerp(blendB.hemiSky, blendT);
      _dynHemiGround.lerp(blendB.hemiGround, blendT);
      _dynRimColor.lerp(blendB.rimColor, blendT);
      _dynSunPos.lerp(blendB.sunPos, blendT);
      fogDensity = THREE.MathUtils.lerp(fogDensity, blendB.fogDensity * 0.82, blendT);
      sunIntensity = THREE.MathUtils.lerp(sunIntensity, blendB.sunIntensity, blendT);
      hemiIntensity = THREE.MathUtils.lerp(hemiIntensity, blendB.hemiIntensity, blendT);
      rimIntensity = THREE.MathUtils.lerp(rimIntensity, blendB.rimIntensity, blendT);
      lanternIntensity = THREE.MathUtils.lerp(lanternIntensity, blendB.lanternIntensity, blendT);
      windowEmissive = THREE.MathUtils.lerp(windowEmissive, blendB.windowEmissive, blendT);
      nightFactor = THREE.MathUtils.lerp(nightFactor, blendB.nightFactor, blendT);
      exposure = THREE.MathUtils.lerp(exposure, blendB.exposure, blendT);
    }

    // Real-time sun arc across the sky during daytime
    if (this.timeMode === 'realtime' && this.realTimeHour >= 6 && this.realTimeHour <= 19) {
      const arc = ((this.realTimeHour - 6) / 13) * Math.PI;
      _dynSunPos.set(
        Math.cos(arc) * 34,
        Math.max(10, Math.sin(arc) * 42),
        18,
      );
    }

    // Weather atmospheric modulation
    const dayAmount = 1 - nightFactor * 0.7;
    if (this.weather === 'cloudy') {
      _dynSky.lerp(_weatherGreySky, 0.35 * dayAmount);
      _dynFog.lerp(_weatherGreySky, 0.35 * dayAmount);
      sunIntensity *= 0.82;
      fogDensity *= 1.12;
    } else if (this.weather === 'rain') {
      _dynSky.lerp(_weatherGreySky, 0.58 * dayAmount);
      _dynFog.lerp(_weatherGreySky, 0.62 * dayAmount);
      sunIntensity *= 0.62;
      hemiIntensity *= 0.85;
      fogDensity *= 1.32;
      lanternIntensity = Math.max(lanternIntensity, 1.35);
    } else if (this.weather === 'storm') {
      _dynSky.lerp(_weatherStormSky, 0.72 * dayAmount);
      _dynFog.lerp(_weatherStormSky, 0.75 * dayAmount);
      sunIntensity *= 0.45;
      hemiIntensity *= 0.72;
      fogDensity *= 1.48;
      lanternIntensity = Math.max(lanternIntensity, 2.2);
      windowEmissive = Math.max(windowEmissive, 0.75);
    } else if (this.weather === 'snow') {
      _dynSky.lerp(_weatherSnowSky, 0.48 * dayAmount);
      _dynFog.lerp(_weatherSnowSky, 0.52 * dayAmount);
      sunIntensity *= 0.86;
      fogDensity *= 1.24;
    }

    return {
      sky: _dynSky,
      fog: _dynFog,
      fogDensity,
      sunColor: _dynSunColor,
      sunIntensity,
      sunPos: _dynSunPos,
      hemiSky: _dynHemiSky,
      hemiGround: _dynHemiGround,
      hemiIntensity,
      rimColor: _dynRimColor,
      rimIntensity,
      lanternIntensity,
      windowEmissive,
      nightFactor,
      exposure,
    };
  }

  private updateLighting(dt: number): void {
    const target = this.computeTargetLighting();
    const alpha = 1 - Math.exp(-3.2 * dt);

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.lerp(target.sky, alpha);
    }
    this.fog.color.lerp(target.fog, alpha);
    this.fog.density = THREE.MathUtils.lerp(this.fog.density, target.fogDensity, alpha);

    this.sunLight.color.lerp(target.sunColor, alpha);
    this.sunLight.intensity = THREE.MathUtils.lerp(
      this.sunLight.intensity,
      target.sunIntensity,
      alpha,
    );
    this.sunLight.position.lerp(target.sunPos, alpha);

    this.hemiLight.color.lerp(target.hemiSky, alpha);
    this.hemiLight.groundColor.lerp(target.hemiGround, alpha);
    this.hemiLight.intensity = THREE.MathUtils.lerp(
      this.hemiLight.intensity,
      target.hemiIntensity,
      alpha,
    );

    this.rimLight.color.lerp(target.rimColor, alpha);
    this.rimLight.intensity = THREE.MathUtils.lerp(
      this.rimLight.intensity,
      target.rimIntensity,
      alpha,
    );

    for (const light of this.world.lanternLights) {
      light.intensity = THREE.MathUtils.lerp(
        light.intensity,
        target.lanternIntensity,
        alpha,
      );
    }
    this.world.windowGlowMat.emissiveIntensity = THREE.MathUtils.lerp(
      this.world.windowGlowMat.emissiveIntensity,
      target.windowEmissive,
      alpha,
    );
    this.world.lanternGlowMat.emissiveIntensity = THREE.MathUtils.lerp(
      this.world.lanternGlowMat.emissiveIntensity,
      0.5 + target.nightFactor * 1.1,
      alpha,
    );
    this.currentNightFactor = THREE.MathUtils.lerp(
      this.currentNightFactor,
      target.nightFactor,
      alpha,
    );
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(
      this.renderer.toneMappingExposure,
      target.exposure,
      alpha,
    );
  }

  private updatePlayerMovementAndGameplay(dt: number): void {
    const forward =
      (this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp') ? 1 : 0) -
      (this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown') ? 1 : 0);
    const right =
      (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight') ? 1 : 0) -
      (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft') ? 1 : 0);

    const camYaw = Math.atan2(
      this.controls.target.x - this.camera.position.x,
      this.controls.target.z - this.camera.position.z,
    );
    this.appleChan.setPlayerInput(forward, right, camYaw);

    this.appleChan.update(dt, this.elapsed);
    this.appleChan.getWorldPosition(_charPos);

    // Check collectible red & golden apple magnet pickup -> adds straight to bag!
    const picked = this.world.checkCollectibles(_charPos, dt);
    if (picked.red > 0 || picked.golden > 0) {
      const totalPicked = picked.red + picked.golden;
      this.appleChan.pulseHappyFace(0.65);

      const nextInv = {
        ...this.farm.inventory,
        redApples: this.farm.inventory.redApples + picked.red,
        goldenApples: this.farm.inventory.goldenApples + picked.golden,
        seeds: { ...this.farm.inventory.seeds },
      };
      this.updateFarm({ ...this.farm, inventory: nextInv });

      if (this.rush.active) {
        this.rush.combo += totalPicked;
        this.comboTimer = 4.2;
        const mult = Math.min(4, 1 + Math.floor(this.rush.combo / 4));
        this.rush.score += (picked.red * 10 + picked.golden * 35) * mult;
        this.rush.roundApples += picked.red + picked.golden;
        this.rush.roundGolden += picked.golden;
        this.emitRushState();
      }

      this.audio.playCollect(picked.golden > 0, this.rush.combo);
      if (picked.golden > 0) {
        this.emitSpeechCategory('goldenApple');
      }
      this.addProgress({
        apples: picked.red + picked.golden,
        golden: picked.golden,
        trustDelta: picked.red * 2 + picked.golden * 7,
      });
    }

    // Harvest Rush 60s countdown & combo decay
    if (this.rush.active) {
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0 && this.rush.combo > 0) {
          this.rush.combo = 0;
          this.emitRushState();
        }
      }

      this.rush.timeLeft = Math.max(0, this.rush.timeLeft - dt);
      const ceilSec = Math.ceil(this.rush.timeLeft);
      if (ceilSec !== this.lastRushEmitSec) {
        this.lastRushEmitSec = ceilSec;
        this.emitRushState();
      }

      if (this.rush.timeLeft <= 0) {
        const isRecord = this.rush.score > this.stats.bestRushScore;
        if (isRecord) {
          this.stats = { ...this.stats, bestRushScore: this.rush.score };
          saveStats(this.stats);
          this.callbacks.onStatsChange({ ...this.stats });
        }
        // Bonus Gold payout into your Stardew farm wallet!
        const bonusGold = Math.round(this.rush.score / 4);
        if (bonusGold > 0) {
          this.updateFarm({ ...this.farm, gold: this.farm.gold + bonusGold });
        }
        this.world.setRushActive(false);
        this.appleChan.setRushMode(false);
        this.rush = {
          ...this.rush,
          active: false,
          finished: true,
          timeLeft: 0,
          bestScore: Math.max(this.stats.bestRushScore, this.rush.score),
          isNewRecord: isRecord,
        };
        this.audio.playRushFinish(isRecord);
        this.emitSpeechCategory(isRecord ? 'rushRecord' : 'rushFinish');
        this.emitRushState();
      }
    }
  }

  private updateCamera(dt: number): void {
    const damp = 1 - Math.exp(-6.5 * dt);

    if (this.autoFocusChar) {
      this.appleChan.getWorldPosition(_charPos);
      _targetGoal.set(_charPos.x, _charPos.y + 1.15, _charPos.z);

      // Preserve user's chosen orbit angle & distance around Apple-chan while keeping her dead-center!
      _camOffset.subVectors(this.camera.position, this.controls.target);
      _targetDelta.subVectors(_targetGoal, this.controls.target).multiplyScalar(damp);
      this.controls.target.add(_targetDelta);

      // If switching back from a far scenic landmark or zoomed too far out, smoothly pull into a clear 3rd-person framing
      if (this.recenterCameraDistance) {
        const currentDist = _camOffset.length();
        const desiredDist = THREE.MathUtils.clamp(currentDist, 5.2, 10.5);
        const targetDist = currentDist > 11.5 || currentDist < 3.6 ? 8.4 : desiredDist;
        const nextDist = THREE.MathUtils.lerp(currentDist, targetDist, damp);
        if (currentDist > 0.001) {
          _camOffset.multiplyScalar(nextDist / currentDist);
        } else {
          _camOffset.set(2.8, 3.8, 6.8);
        }
        // Keep comfortable elevated angle above Apple-chan
        if (_camOffset.y < 1.8) {
          _camOffset.y = THREE.MathUtils.lerp(_camOffset.y, 3.2, damp);
        }
        if (Math.abs(currentDist - targetDist) < 0.15) {
          this.recenterCameraDistance = false;
        }
      }

      _camGoal.copy(this.controls.target).add(_camOffset);
      // Never allow camera to dip beneath climbed terrain hills
      const minCamY = this.world.groundHeightAt(_camGoal.x, _camGoal.z) + 0.85;
      if (_camGoal.y < minCamY) {
        _camGoal.y = minCamY;
      }
      this.camera.position.copy(_camGoal);
    } else if (
      this.cameraTransitionActive &&
      this.activeCameraPreset &&
      this.activeCameraPreset !== 'appleChan'
    ) {
      const preset = STATIC_CAMERA_PRESETS[this.activeCameraPreset];
      const flyDamp = 1 - Math.exp(-4.2 * dt);
      this.camera.position.lerp(preset.pos, flyDamp);
      this.controls.target.lerp(preset.target, flyDamp);
      if (
        this.camera.position.distanceTo(preset.pos) < 0.08 &&
        this.controls.target.distanceTo(preset.target) < 0.08
      ) {
        this.cameraTransitionActive = false;
      }
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = now;
    this.elapsed += dt;

    this.updateLighting(dt);
    this.updatePlayerMovementAndGameplay(dt);
    this.world.update(dt, this.elapsed, this.currentNightFactor);
    this.updateCamera(dt);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.controls.removeEventListener('start', this.onUserControlStart);
    this.controls.dispose();
    this.world.dispose();
    this.textures.dispose();
    this.envTexture.dispose();
    this.audio.dispose();
    this.renderer.dispose();
    if (canvas.parentNode === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
