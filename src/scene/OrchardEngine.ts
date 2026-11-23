import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AppleChanCharacter } from './appleChan';
import { OrchardAudio } from './audio';
import { buildOrchardWorld, OrchardWorldHandle } from './orchardWorld';
import { createOrchardTextures, OrchardTextureLibrary } from './textures';
import {
  AppleChanOutfit,
  CameraPreset,
  OrchardStats,
  SceneCallbacks,
  TimeOfDay,
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
    pos: new THREE.Vector3(6.8, 7.6, 15.6),
    target: new THREE.Vector3(-0.6, 2.2, 0.2),
  },
  cottage: {
    pos: new THREE.Vector3(-1.8, 5.2, 1.8),
    target: new THREE.Vector3(-8.2, 2.6, -6.2),
  },
  brook: {
    pos: new THREE.Vector3(16.2, 5.4, 10.6),
    target: new THREE.Vector3(9.4, 1.3, 3.2),
  },
};

// Scratch math objects (zero GC per frame)
const _mouse = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _charPos = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _targetGoal = new THREE.Vector3();

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

  private timeOfDay: TimeOfDay = 'morning';
  private activeCameraPreset: CameraPreset | null = 'orchard';
  private followAppleChan = false;
  private cameraTransitionActive = false;
  private currentNightFactor = 0;

  private stats: OrchardStats = {
    applesHarvested: 0,
    treesHugged: 0,
    saplingsWatered: 0,
  };
  private speechId = 0;

  private frameId = 0;
  private disposed = false;
  private lastTimestamp = performance.now();
  private elapsed = 0;

  // Pointer interaction state
  private pointerDownPos = { x: 0, y: 0 };
  private lastHoverRaycast = 0;

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

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
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
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

    // 3. Camera & Smoothly Damped OrbitControls
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 240);
    this.camera.position.copy(STATIC_CAMERA_PRESETS.orchard.pos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(STATIC_CAMERA_PRESETS.orchard.target);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.475;
    this.controls.minPolarAngle = 0.2;
    this.controls.minDistance = 2.8;
    this.controls.maxDistance = 38;
    this.controls.update();

    this.controls.addEventListener('start', this.onUserControlStart);

    // 4. Balanced 3-Point Warm/Cool Lighting Rig
    this.sunLight = new THREE.DirectionalLight(
      initPreset.sunColor,
      initPreset.sunIntensity,
    );
    this.sunLight.position.copy(initPreset.sunPos);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 90;
    const d = 24;
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

    // 5. Procedural Textures, Orchard World & Hero Character Apple-chan
    this.textures = createOrchardTextures(this.renderer);
    this.world = buildOrchardWorld(this.textures);
    this.scene.add(this.world.group);

    this.appleChan = new AppleChanCharacter(
      this.textures,
      this.world.groundHeightAt,
      this.world.trees.map((t) => t.target),
      {
        onTreeHugPeak: (treeIndex, pos) => {
          const dropped = this.world.triggerTreeShake(treeIndex, pos);
          this.audio.playTreeHug();
          if (dropped > 0) {
            window.setTimeout(() => this.audio.playApplePop(), 260);
          }
          this.stats = {
            ...this.stats,
            treesHugged: this.stats.treesHugged + 1,
            applesHarvested: this.stats.applesHarvested + dropped,
          };
          this.callbacks.onStatsChange(this.stats);
        },
        onWaterSplash: (pos) => {
          this.world.triggerWaterNursery(pos);
          this.audio.playWatering();
          this.stats = {
            ...this.stats,
            saplingsWatered: this.stats.saplingsWatered + 1,
          };
          this.callbacks.onStatsChange(this.stats);
        },
        onSpeech: (text) => {
          this.speechId += 1;
          this.callbacks.onSpeech({ id: this.speechId, text });
        },
        onActionChange: (action) => {
          this.callbacks.onActionChange(action);
        },
      },
    );
    this.scene.add(this.appleChan.group);

    this.clickables = [this.appleChan.hitProxy, ...this.world.clickables];

    // Pre-warm shaders on GPU devices
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Event listeners
    window.addEventListener('resize', this.onResize);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('webglcontextlost', this.onContextLost);

    // Start loop
    this.tick();
  }

  public setTimeOfDay(mode: TimeOfDay): void {
    this.timeOfDay = mode;
  }

  public setOutfit(outfit: AppleChanOutfit): void {
    this.appleChan.setOutfit(outfit);
    this.audio.playApplePop();
    this.speechId += 1;
    const text =
      outfit === 'spring'
        ? '"Spring overalls ready! Let’s tend the orchard saplings!"'
        : outfit === 'idol'
          ? '"Ta-da! Idol outfit ready—even the apple trees are cheering!"'
          : '"Back in my favorite apple shirt and striped socks!"';
    this.callbacks.onSpeech({
      id: this.speechId,
      text,
    });
  }

  public setCameraPreset(preset: CameraPreset): void {
    this.activeCameraPreset = preset;
    this.followAppleChan = preset === 'appleChan';
    this.cameraTransitionActive = true;
  }

  public triggerHugNearestTree(): void {
    this.appleChan.commandHugTree();
  }

  public triggerWaterSaplings(): void {
    this.appleChan.commandWaterSaplings();
  }

  public triggerWave(): void {
    this.appleChan.commandWave();
    this.audio.playCheerfulWave();
  }

  public setAudioEnabled(enabled: boolean): void {
    this.audio.setEnabled(enabled);
  }

  private onUserControlStart = (): void => {
    if (this.cameraTransitionActive || this.followAppleChan) {
      this.cameraTransitionActive = false;
      this.followAppleChan = false;
      this.activeCameraPreset = null;
      this.callbacks.onCameraPresetClear();
    }
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
      this.appleChan.commandHugTree(hitData.treeIndex);
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

  private updateLighting(dt: number): void {
    const target = LIGHTING_PRESETS[this.timeOfDay];
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

  private updateCamera(dt: number): void {
    const damp = 1 - Math.exp(-4.5 * dt);

    if (this.followAppleChan) {
      this.appleChan.getWorldPosition(_charPos);
      _targetGoal.set(_charPos.x, _charPos.y + 1.12, _charPos.z);
      _camGoal.set(_charPos.x + 1.75, _charPos.y + 1.65, _charPos.z + 2.45);
      this.camera.position.lerp(_camGoal, damp);
      this.controls.target.lerp(_targetGoal, damp);
    } else if (
      this.cameraTransitionActive &&
      this.activeCameraPreset &&
      this.activeCameraPreset !== 'appleChan'
    ) {
      const preset = STATIC_CAMERA_PRESETS[this.activeCameraPreset];
      this.camera.position.lerp(preset.pos, damp);
      this.controls.target.lerp(preset.target, damp);
      if (
        this.camera.position.distanceTo(preset.pos) < 0.06 &&
        this.controls.target.distanceTo(preset.target) < 0.06
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
    this.appleChan.update(dt, this.elapsed);
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
