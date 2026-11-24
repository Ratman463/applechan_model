import * as THREE from 'three';
import { AppleChanTreeTarget } from './appleChan';
import { OrchardTextureLibrary } from './textures';
import { FarmPlotState, Season, WeatherKind } from './types';

export interface InteractiveTree {
  group: THREE.Group;
  canopyGroup: THREE.Group;
  hitProxy: THREE.Mesh;
  target: AppleChanTreeTarget;
  shakeAmount: number;
  baseX: number;
  baseZ: number;
}

interface FloatingParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  spin: number;
  gravity: number;
  kind: 'heart' | 'apple' | 'water' | 'smoke';
}

interface AmbientPetal {
  mesh: THREE.Mesh;
  baseX: number;
  baseZ: number;
  phase: number;
  speed: number;
  fallSpeed: number;
}

interface VoxelBee {
  group: THREE.Group;
  wingL: THREE.Mesh;
  wingR: THREE.Mesh;
  centerX: number;
  centerY: number;
  centerZ: number;
  radius: number;
  speed: number;
  phase: number;
}

interface CollectibleApple {
  group: THREE.Group;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  golden: boolean;
  grounded: boolean;
  phase: number;
}

export interface OrchardWorldHandle {
  group: THREE.Group;
  trees: InteractiveTree[];
  clickables: THREE.Object3D[];
  lanternLights: THREE.PointLight[];
  windowGlowMat: THREE.MeshStandardMaterial;
  lanternGlowMat: THREE.MeshStandardMaterial;
  starsGroup: THREE.Group;
  firefliesGroup: THREE.Group;
  groundHeightAt: (x: number, z: number) => number;
  resolveWalkPosition: (x: number, z: number, out: THREE.Vector2) => void;
  triggerTreeShake: (
    treeIndex: number,
    worldPos: THREE.Vector3,
    extraDrop?: boolean,
  ) => { dropped: number; isBonus: boolean };
  triggerWaterNursery: (worldPos: THREE.Vector3) => void;
  triggerShippingBinBounce: () => void;
  syncFarmPlots: (plots: FarmPlotState[]) => void;
  setMagnetBonus: (enabled: boolean) => void;
  setRushActive: (active: boolean) => void;
  spawnStarterApples: () => void;
  checkCollectibles: (charPos: THREE.Vector3, dt: number) => { red: number; golden: number };
  getNearestTree: (x: number, z: number, maxDist: number) => number | null;
  isNearNursery: (x: number, z: number) => boolean;
  isNearShippingBin: (x: number, z: number) => boolean;
  isNearShopStall: (x: number, z: number) => boolean;
  isNearCottageDoor: (x: number, z: number) => boolean;
  isInsideCottage: (x: number, z: number) => boolean;
  isNearCraftingTable: (x: number, z: number) => boolean;
  isNearCottageBed: (x: number, z: number) => boolean;
  isNearCottageChest: (x: number, z: number) => boolean;
  updateCottageInterior: (charPos: THREE.Vector3, dt: number) => void;
  setSeason: (season: Season) => void;
  setWeather: (weather: WeatherKind) => void;
  update: (dt: number, elapsed: number, nightFactor: number) => void;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

/**
 * Deterministic terrain elevation (integer-snapped Minecraft voxel terraces)
 * spanning an expanded 65x65 voxel valley with:
 * - Central level orchard plateau (y = 0)
 * - Winding eastern sparkling brook (y = -1)
 * - Climbable 1-block stepped NW Windmill Hill (y = 1..3)
 * - Climbable NE Waterfall Cliffs (y = 1..4)
 * - Eastern Blossom Plateau (y = 1..2)
 * - South-West Campfire Overlook Knoll (y = 1..2)
 * - Natural rolling perimeter hills beyond
 */
export function computeOrchardElevation(gx: number, gz: number): number {
  const ix = Math.round(gx);
  const iz = Math.round(gz);

  // Brook channel winding along the east side (x around 10.5..12.5)
  const brookCenter = 10.5 + Math.sin(iz * 0.19) * 1.9;
  if (Math.abs(ix - brookCenter) <= 1.35 && iz > -15) {
    return -1;
  }

  // Central playable orchard clearing stays flat at y = 0 for cottage, plaza, & garden
  const distFromCenter = Math.hypot(ix, iz);
  if (distFromCenter < 13.8) {
    return 0;
  }

  // Sculpted climbable NW Windmill Hilltop around (-18, -18)
  const dWindmill = Math.hypot(ix + 18, iz + 18);
  if (dWindmill < 5.5) return 3;
  if (dWindmill < 8.2) return 2;
  if (dWindmill < 11.2) return 1;

  // Sculpted NE Waterfall Cliff around (18, -17)
  const dWaterfall = Math.hypot(ix - 18, iz + 17);
  if (dWaterfall < 4.2) return 4;
  if (dWaterfall < 6.8) return 3;
  if (dWaterfall < 9.5) return 2;
  if (dWaterfall < 12.2) return 1;

  // Sculpted Eastern Blossom Gazebo Plateau around (20, 6)
  const dGazebo = Math.hypot(ix - 20, iz - 6);
  if (dGazebo < 6.0) return 2;
  if (dGazebo < 9.5) return 1;

  // Sculpted SW Campfire Overlook Knoll around (-17, 16)
  const dCamp = Math.hypot(ix + 17, iz - 16);
  if (dCamp < 4.8) return 2;
  if (dCamp < 8.0) return 1;

  // Keep south entrance road & bridge approaches smoothly navigable at y = 0..1
  if (Math.abs(ix) <= 2 && iz >= 12 && iz <= 25) {
    return iz > 21 ? 1 : 0;
  }
  if (iz >= 13 && iz <= 16 && ix >= 6 && ix <= 17) {
    return 0;
  }

  // Rolling terraced hills framing the expanded outer valley
  const edgeRamp = Math.max(0, (distFromCenter - 19.5) * 0.2);
  const hillWave =
    Math.sin(ix * 0.14) * Math.cos(iz * 0.13) * 1.9 +
    Math.sin((ix + iz) * 0.1) * 1.1;
  return Math.max(0, Math.min(5, Math.round(edgeRamp + Math.max(0, hillWave))));
}

function isOnDirtPath(ix: number, iz: number): boolean {
  // Entrance south path extending out into the expanded meadow
  if (Math.abs(ix) <= 1 && iz >= -4 && iz <= 24) return true;
  // Branch west to Cottage front porch (-8, -5) and continuing up toward NW Windmill
  if (iz >= -4 && iz <= -2 && ix >= -15 && ix <= 1) return true;
  if (ix >= -16 && ix <= -14 && iz >= -14 && iz <= -2) return true;
  // Loop around Grand Mother Apple Tree at (0, -2)
  const distCenter = Math.hypot(ix - 0, iz + 2);
  if (distCenter >= 2.2 && distCenter <= 4.1) return true;
  // Branch east across oak footbridge to Eastern Blossom Plateau
  if (iz >= 1 && iz <= 2 && ix >= 0 && ix <= 19) return true;
  // South-east path across the stone bridge
  if (iz >= 14 && iz <= 15 && ix >= 0 && ix <= 19) return true;
  // Path connecting south road to SW Campfire Overlook
  if (iz >= 14 && iz <= 15 && ix >= -14 && ix <= 0) return true;
  // Branch south-east to Seedling Nursery (6..9, 4..6)
  if (ix >= 4 && ix <= 7 && iz >= 2 && iz <= 6) return true;
  return false;
}

function isNurserySoil(ix: number, iz: number): boolean {
  return ix >= 7 && ix <= 9 && iz >= 4 && iz <= 7;
}

export function buildOrchardWorld(
  textures: OrchardTextureLibrary,
): OrchardWorldHandle {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const trees: InteractiveTree[] = [];
  const clickables: THREE.Object3D[] = [];
  const lanternLights: THREE.PointLight[] = [];
  const saplings: THREE.Group[] = [];
  const particles: FloatingParticle[] = [];
  const collectibles: CollectibleApple[] = [];
  const petals: AmbientPetal[] = [];
  const bees: VoxelBee[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Shared unit voxel box
  const blockGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));

  // =========================================================================
  // 1. MATERIALS LIBRARY (calibrated roughness & metalness contrast!)
  // =========================================================================
  const grassTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.grassTop.map,
      bumpMap: textures.grassTop.bumpMap,
      bumpScale: 0.035,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );
  const grassSideMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.grassSide.map,
      bumpMap: textures.grassSide.bumpMap,
      bumpScale: 0.04,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );
  const dirtMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.dirt.map,
      bumpMap: textures.dirt.bumpMap,
      bumpScale: 0.04,
      roughness: 0.95,
      metalness: 0.0,
    }),
  );
  const grassBlockMats = [
    grassSideMat,
    grassSideMat,
    grassTopMat,
    dirtMat,
    grassSideMat,
    grassSideMat,
  ];

  const pathTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.dirtPathTop.map,
      bumpMap: textures.dirtPathTop.bumpMap,
      bumpScale: 0.03,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );
  const pathSideMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.dirtPathSide.map,
      bumpMap: textures.dirtPathSide.bumpMap,
      bumpScale: 0.03,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );
  const pathBlockMats = [
    pathSideMat,
    pathSideMat,
    pathTopMat,
    dirtMat,
    pathSideMat,
    pathSideMat,
  ];

  const farmlandMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.farmlandTop.map,
      bumpMap: textures.farmlandTop.bumpMap,
      bumpScale: 0.05,
      roughness: 0.82,
      metalness: 0.0,
    }),
  );
  const farmlandWetMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.farmlandWetTop.map,
      bumpMap: textures.farmlandWetTop.bumpMap,
      bumpScale: 0.05,
      roughness: 0.45,
      metalness: 0.02,
    }),
  );

  const cobbleMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.cobblestone.map,
      bumpMap: textures.cobblestone.bumpMap,
      bumpScale: 0.055,
      roughness: 0.86,
      metalness: 0.04,
    }),
  );
  const mossyCobbleMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.mossyCobble.map,
      bumpMap: textures.mossyCobble.bumpMap,
      bumpScale: 0.055,
      roughness: 0.88,
      metalness: 0.02,
    }),
  );
  const oakBarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.oakBark.map,
      bumpMap: textures.oakBark.bumpMap,
      bumpScale: 0.055,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );
  const oakLogTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.oakLogTop.map,
      bumpMap: textures.oakLogTop.bumpMap,
      bumpScale: 0.04,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );
  const oakLogMats = [
    oakBarkMat,
    oakBarkMat,
    oakLogTopMat,
    oakLogTopMat,
    oakBarkMat,
    oakBarkMat,
  ];

  const oakPlankMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.oakPlanks.map,
      bumpMap: textures.oakPlanks.bumpMap,
      bumpScale: 0.04,
      roughness: 0.8,
      metalness: 0.0,
    }),
  );
  const darkOakMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.darkOakPlanks.map,
      bumpMap: textures.darkOakPlanks.bumpMap,
      bumpScale: 0.04,
      roughness: 0.78,
      metalness: 0.0,
    }),
  );
  const plasterMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.cottagePlaster.map,
      bumpMap: textures.cottagePlaster.bumpMap,
      bumpScale: 0.025,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );
  const roofMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.terracottaRoof.map,
      bumpMap: textures.terracottaRoof.bumpMap,
      bumpScale: 0.05,
      roughness: 0.72,
      metalness: 0.02,
    }),
  );
  const leavesLushMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.leavesLush.map,
      bumpMap: textures.leavesLush.bumpMap,
      bumpScale: 0.045,
      roughness: 0.85,
      metalness: 0.0,
    }),
  );
  const leavesBlossomMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.leavesBlossom.map,
      bumpMap: textures.leavesBlossom.bumpMap,
      bumpScale: 0.045,
      roughness: 0.82,
      metalness: 0.0,
    }),
  );
  // Glossy crisp apples contrasting against matte bark & leaves!
  const appleRedMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.appleRed.map,
      bumpMap: textures.appleRed.bumpMap,
      bumpScale: 0.015,
      roughness: 0.24,
      metalness: 0.06,
    }),
  );
  const appleGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.appleGold.map,
      bumpMap: textures.appleGold.bumpMap,
      bumpScale: 0.015,
      roughness: 0.18,
      metalness: 0.42,
    }),
  );
  const ironMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b4046,
      roughness: 0.3,
      metalness: 0.86,
    }),
  );
  const windowGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.windowPane,
      roughness: 0.18,
      metalness: 0.12,
      emissive: new THREE.Color(0xffbd5c),
      emissiveIntensity: 0.08,
    }),
  );
  const lanternGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.lanternGlass,
      roughness: 0.2,
      emissive: new THREE.Color(0xffb845),
      emissiveIntensity: 0.75,
    }),
  );
  const barrelSideMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.barrelSide.map,
      bumpMap: textures.barrelSide.bumpMap,
      bumpScale: 0.04,
      roughness: 0.76,
      metalness: 0.15,
    }),
  );
  const appleCrateTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.appleCrateTop.map,
      bumpMap: textures.appleCrateTop.bumpMap,
      bumpScale: 0.04,
      roughness: 0.55,
      metalness: 0.04,
    }),
  );
  const hayMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.hayBale.map,
      bumpMap: textures.hayBale.bumpMap,
      bumpScale: 0.05,
      roughness: 0.94,
    }),
  );

  // =========================================================================
  // 2. INSTANCED VOXEL TERRAIN (EXPANDED 65x65 VALLEY) + HORIZON MEADOW
  // =========================================================================
  const radius = 32;
  const grassPositions: [number, number, number][] = [];
  const dirtPositions: [number, number, number][] = [];
  const pathPositions: [number, number, number][] = [];
  const farmlandPositions: [number, number, number][] = [];
  const brookWaterPositions: [number, number, number][] = [];

  for (let ix = -radius; ix <= radius; ix++) {
    for (let iz = -radius; iz <= radius; iz++) {
      const h = computeOrchardElevation(ix, iz);
      if (h === -1) {
        dirtPositions.push([ix, -1.5, iz]);
        brookWaterPositions.push([ix, -0.22, iz]);
      } else if (isNurserySoil(ix, iz) && h === 0) {
        farmlandPositions.push([ix, h - 0.52, iz]);
      } else if (isOnDirtPath(ix, iz) && h <= 2) {
        pathPositions.push([ix, h - 0.53, iz]);
      } else {
        grassPositions.push([ix, h - 0.5, iz]);
      }
      // Fill cliff risers where elevation steps up so zero gaps ever show
      if (h > 0) {
        for (let y = h - 1; y >= 0; y--) {
          const n1 = computeOrchardElevation(ix + 1, iz);
          const n2 = computeOrchardElevation(ix - 1, iz);
          const n3 = computeOrchardElevation(ix, iz + 1);
          const n4 = computeOrchardElevation(ix, iz - 1);
          if (n1 <= y || n2 <= y || n3 <= y || n4 <= y) {
            dirtPositions.push([ix, y - 0.5, iz]);
          }
        }
      }
    }
  }

  const addInstancedBlocks = (
    positions: [number, number, number][],
    mat: THREE.Material | THREE.Material[],
    tintRange = 0,
    receiveShadow = true,
  ) => {
    if (positions.length === 0) return null;
    const mesh = new THREE.InstancedMesh(blockGeo, mat, positions.length);
    mesh.receiveShadow = receiveShadow;
    mesh.castShadow = false;
    for (let i = 0; i < positions.length; i++) {
      const [x, y, z] = positions[i];
      _dummy.position.set(x, y, z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
      if (tintRange > 0) {
        const v = 1 - tintRange * 0.5 + (((x * 13 + z * 29) & 15) / 15) * tintRange;
        _color.setRGB(v, v, v);
        mesh.setColorAt(i, _color);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
    return mesh;
  };

  addInstancedBlocks(grassPositions, grassBlockMats, 0.08, true);
  addInstancedBlocks(dirtPositions, dirtMat, 0.06, true);
  addInstancedBlocks(pathPositions, pathBlockMats, 0.05, true);
  addInstancedBlocks(farmlandPositions, farmlandMat, 0.05, true);

  // Extended distant rolling meadow skirt beyond the detailed voxel grid
  const skirtGeo = trackGeo(new THREE.PlaneGeometry(320, 320, 32, 32));
  skirtGeo.rotateX(-Math.PI / 2);
  const skirtPos = skirtGeo.attributes.position;
  for (let i = 0; i < skirtPos.count; i++) {
    const x = skirtPos.getX(i);
    const z = skirtPos.getZ(i);
    const dist = Math.hypot(x, z);
    if (dist < 33) {
      skirtPos.setY(i, -1.6);
    } else {
      const hills =
        Math.sin(x * 0.045) * Math.cos(z * 0.045) * 6.0 +
        Math.max(0, (dist - 33) * 0.075);
      skirtPos.setY(i, Math.max(-0.5, hills));
    }
  }
  skirtGeo.computeVertexNormals();
  const skirtMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x62a847,
      roughness: 0.96,
      metalness: 0.0,
    }),
  );
  const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
  skirtMesh.receiveShadow = true;
  group.add(skirtMesh);

  // Sparkling Animated Brook Water
  const waterGeo = trackGeo(new THREE.BoxGeometry(1, 0.55, 1));
  const waterMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.water,
      roughness: 0.14,
      metalness: 0.12,
      transparent: true,
      opacity: 0.84,
    }),
  );
  const waterInst = new THREE.InstancedMesh(
    waterGeo,
    waterMat,
    brookWaterPositions.length,
  );
  for (let i = 0; i < brookWaterPositions.length; i++) {
    const [x, y, z] = brookWaterPositions[i];
    _dummy.position.set(x, y, z);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    waterInst.setMatrixAt(i, _dummy.matrix);
  }
  waterInst.instanceMatrix.needsUpdate = true;
  waterInst.computeBoundingSphere();
  group.add(waterInst);

  // Exact walkable ground height (including bridges, enterable cottage floor & climbable voxel terraces!)
  const groundHeightAt = (x: number, z: number): number => {
    // 0. Enterable Orchard Cottage porch & interior wooden floor
    if (x >= -11.9 && x <= -5.1 && z >= -10.1 && z <= -2.4) {
      return 0.22;
    }
    // 1. East Arched Oak Footbridge over the brook: x in [8.2, 13.8], z in [0.4, 2.8]
    if (x >= 8.2 && x <= 13.8 && z >= 0.4 && z <= 2.8) {
      const t = (x - 8.2) / (13.8 - 8.2);
      return Math.sin(t * Math.PI) * 0.62 + 0.12;
    }
    // 2. South-East Stone Arch Bridge over the brook: x in [7.8, 13.8], z in [13.2, 15.8]
    if (x >= 7.8 && x <= 13.8 && z >= 13.2 && z <= 15.8) {
      const t = (x - 7.8) / (13.8 - 7.8);
      return Math.sin(t * Math.PI) * 0.72 + 0.12;
    }
    const h = computeOrchardElevation(x, z);
    return Math.max(0, h);
  };

  // Expanded playable world bounds (all terraced hills, enterable cottage, windmill, gazebo, campfire overlook reachable!)
  const resolveWalkPosition = (x: number, z: number, out: THREE.Vector2): void => {
    let nx = THREE.MathUtils.clamp(x, -26.5, 26.5);
    let nz = THREE.MathUtils.clamp(z, -26.5, 26.5);

    // Enterable Orchard Cottage around (-8.5, -7.2) with open front doorway at x in [-9.15, -7.85], z in [-5.25, -3.95]
    const inDoorway = nx >= -9.15 && nx <= -7.85 && nz >= -5.25 && nz <= -3.95;
    if (!inDoorway) {
      const inInteriorRoom = nx > -11.55 && nx < -5.45 && nz > -9.65 && nz < -4.75;
      if (inInteriorRoom) {
        nx = THREE.MathUtils.clamp(nx, -11.2, -5.8);
        nz = THREE.MathUtils.clamp(nz, -9.25, -4.95);

        // Soft furniture footprints inside cottage:
        // 1) Minecraft Crafting Table at (-10.55, -8.85)
        if (nx < -9.75 && nz < -8.05) {
          if (Math.abs(nx - -9.75) < Math.abs(nz - -8.05)) nx = -9.75;
          else nz = -8.05;
        }
        // 2) Minecraft Oak Chest at (-10.55, -6.75)
        if (nx < -9.75 && nz > -7.5 && nz < -6.0) {
          nx = -9.75;
        }
        // 3) Minecraft Red Bed at (-6.65, -8.75)
        if (nx > -7.55 && nz < -7.55) {
          if (Math.abs(nx - -7.55) < Math.abs(nz - -7.55)) nx = -7.55;
          else nz = -7.55;
        }
      } else if (nx > -12.25 && nx < -4.75 && nz > -10.45 && nz < -4.05) {
        const dRight = Math.abs(nx - -4.75);
        const dFront = Math.abs(nz - -4.05);
        const dLeft = Math.abs(nx - -12.25);
        const dBack = Math.abs(nz - -10.45);
        const minD = Math.min(dRight, dFront, dLeft, dBack);
        if (minD === dFront) nz = -4.05;
        else if (minD === dRight) nx = -4.75;
        else if (minD === dLeft) nx = -12.25;
        else nz = -10.45;
      }
    }

    // Windmill tower base solid footprint around (-18, -18)
    if (nx > -20.2 && nx < -15.8 && nz > -20.2 && nz < -15.8) {
      const dR = Math.abs(nx - -15.8);
      const dL = Math.abs(nx - -20.2);
      const dF = Math.abs(nz - -15.8);
      const dB = Math.abs(nz - -20.2);
      const minD = Math.min(dR, dL, dF, dB);
      if (minD === dF) nz = -15.8;
      else if (minD === dR) nx = -15.8;
      else if (minD === dL) nx = -20.2;
      else nz = -20.2;
    }

    // Prevent wading into the brook channel except on either bridge
    const onNorthBridge = nz >= 0.55 && nz <= 2.65;
    const onSouthBridge = nz >= 13.35 && nz <= 15.65;
    if (!onNorthBridge && !onSouthBridge && nz > -14.5) {
      const brookCenter = 10.5 + Math.sin(nz * 0.19) * 1.9;
      if (Math.abs(nx - brookCenter) < 1.55) {
        nx = nx < brookCenter ? brookCenter - 1.55 : brookCenter + 1.55;
      }
    }

    out.set(nx, nz);
  };

  // =========================================================================
  // 3. COMPOSITE MINECRAFT APPLE TREES (Hero Grand Tree + 15 Orchard Trees)
  // =========================================================================
  const createAppleTree = (
    x: number,
    z: number,
    opts: {
      trunkHeight: number;
      wide?: boolean;
      blossom?: boolean;
      golden?: boolean;
      hero?: boolean;
    },
  ): InteractiveTree => {
    const treeGroup = new THREE.Group();
    const gy = computeOrchardElevation(x, z);
    treeGroup.position.set(x, gy, z);

    // Contact shadow grounding
    const shadow = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(opts.hero ? 5.6 : 4.2, opts.hero ? 5.6 : 4.2)).rotateX(
        -Math.PI / 2,
      ),
      trackMat(
        new THREE.MeshBasicMaterial({
          map: textures.contactShadow,
          transparent: true,
          depthWrite: false,
          opacity: 0.42,
        }),
      ),
    );
    shadow.position.y = 0.025;
    treeGroup.add(shadow);

    // Trunk & sturdy roots (multi-part composite)
    const trunkW = opts.hero ? 1.25 : 0.92;
    for (let y = 0; y < opts.trunkHeight; y++) {
      const log = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(trunkW, 1, trunkW)),
        oakLogMats,
      );
      log.position.y = y + 0.5;
      log.castShadow = true;
      log.receiveShadow = true;
      treeGroup.add(log);
    }

    // Exposed root buttresses around base
    const rootOffsets: [number, number][] = [
      [0.62, 0],
      [-0.62, 0],
      [0, 0.62],
      [0, -0.62],
    ];
    for (const [rx, rz] of rootOffsets) {
      const root = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.45, 0.48, 0.45)),
        oakLogMats,
      );
      root.position.set(rx * (opts.hero ? 1.1 : 0.85), 0.24, rz * (opts.hero ? 1.1 : 0.85));
      root.castShadow = true;
      root.receiveShadow = true;
      treeGroup.add(root);
    }

    // Canopy Group (shakes cheerfully when Apple-chan hugs the trunk!)
    const canopyGroup = new THREE.Group();
    canopyGroup.position.y = opts.trunkHeight;
    treeGroup.add(canopyGroup);

    const leafMat = opts.blossom ? leavesBlossomMat : leavesLushMat;
    const layers = opts.hero
      ? [
          { y: -0.2, r: 2 },
          { y: 0.8, r: 2 },
          { y: 1.8, r: 1 },
          { y: 2.7, r: 0 },
        ]
      : [
          { y: -0.1, r: 2 },
          { y: 0.9, r: 1 },
          { y: 1.8, r: 0 },
        ];

    const leafCoords: [number, number, number][] = [];
    for (const layer of layers) {
      for (let lx = -layer.r; lx <= layer.r; lx++) {
        for (let lz = -layer.r; lz <= layer.r; lz++) {
          // Classic Minecraft rounded-corner voxel canopy silhouette
          const corner =
            layer.r >= 2 && Math.abs(lx) === layer.r && Math.abs(lz) === layer.r;
          if (corner && (lx + lz + x) % 2 !== 0) continue;
          leafCoords.push([lx, layer.y, lz]);
        }
      }
    }

    // Extra side bough blocks on Hero Grand Tree
    if (opts.hero) {
      leafCoords.push([3, 0.2, 0], [-3, 0.2, 0], [0, 0.2, 3], [0, 0.2, -3]);
    }

    const leafInst = new THREE.InstancedMesh(blockGeo, leafMat, leafCoords.length);
    leafInst.castShadow = true;
    leafInst.receiveShadow = true;
    for (let i = 0; i < leafCoords.length; i++) {
      const [lx, ly, lz] = leafCoords[i];
      _dummy.position.set(lx, ly, lz);
      _dummy.scale.set(1.01, 1.01, 1.01);
      _dummy.updateMatrix();
      leafInst.setMatrixAt(i, _dummy.matrix);
      const shade = 0.92 + ((i * 37) % 10) * 0.018;
      _color.setRGB(shade, shade, shade);
      leafInst.setColorAt(i, _color);
    }
    leafInst.instanceMatrix.needsUpdate = true;
    if (leafInst.instanceColor) leafInst.instanceColor.needsUpdate = true;
    leafInst.computeBoundingSphere();
    canopyGroup.add(leafInst);

    // Glossy Hanging Voxel Apples tucked beneath and around the canopy!
    const appleGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.34, 0.32));
    const stemGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.14, 0.06));
    const leafBitGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.06, 0.08));
    const applePositions: [number, number, number][] = [
      [1.45, -0.78, 0.7],
      [-1.45, -0.76, -0.6],
      [0.65, -0.78, 1.5],
      [-0.75, -0.74, 1.4],
      [1.2, 0.25, -1.52],
      [-1.35, 0.22, 1.2],
      [0.3, -0.78, -1.5],
    ];
    if (opts.hero) {
      applePositions.push([2.4, -0.35, 0.2], [-2.3, -0.35, -0.3], [0.2, -0.35, 2.4]);
    }

    applePositions.forEach(([ax, ay, az], idx) => {
      const aGroup = new THREE.Group();
      aGroup.position.set(ax, ay, az);
      const isGold = opts.golden && idx % 2 === 0;
      const fruit = new THREE.Mesh(appleGeo, isGold ? appleGoldMat : appleRedMat);
      fruit.castShadow = true;
      const stem = new THREE.Mesh(stemGeo, darkOakMat);
      stem.position.y = 0.21;
      const leafBit = new THREE.Mesh(leafBitGeo, leavesLushMat);
      leafBit.position.set(0.08, 0.23, 0);
      aGroup.add(fruit, stem, leafBit);
      canopyGroup.add(aGroup);
    });

    // Hero Grand Mother Apple Tree extras: warm hanging lantern + cozy reading log bench (Archive File 1!)
    if (opts.hero) {
      const lantern = buildVoxelLantern(ironMat, lanternGlowMat, trackGeo);
      lantern.position.set(1.4, opts.trunkHeight - 1.35, 1.25);
      treeGroup.add(lantern);

      const pLight = new THREE.PointLight(0xffb954, 1.8, 12, 1.8);
      pLight.position.set(x + 1.4, gy + opts.trunkHeight - 1.45, z + 1.25);
      group.add(pLight);
      lanternLights.push(pLight);

      // Little resting wooden stump cushion beneath the Grand Tree
      const stump = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.76, 0.52, 0.76)),
        oakLogMats,
      );
      stump.position.set(1.35, 0.26, 0.95);
      stump.castShadow = true;
      stump.receiveShadow = true;
      treeGroup.add(stump);
    }

    // Clickable hit proxy for tree hugging
    const hitProxy = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.6, opts.trunkHeight + 2.4, 2.6)),
      trackMat(new THREE.MeshBasicMaterial({ visible: false })),
    );
    hitProxy.position.y = (opts.trunkHeight + 2.2) * 0.5;
    const treeIndex = trees.length;
    hitProxy.userData = { clickable: 'tree', treeIndex };
    treeGroup.add(hitProxy);
    clickables.push(hitProxy);

    group.add(treeGroup);

    const record: InteractiveTree = {
      group: treeGroup,
      canopyGroup,
      hitProxy,
      target: {
        index: treeIndex,
        x,
        z,
        trunkRadius: trunkW * 0.5,
      },
      shakeAmount: 0,
      baseX: x,
      baseZ: z,
    };
    trees.push(record);
    return record;
  };

  // Centerpiece Grand Mother Apple Tree (Archive File 1 & 3 heart of the orchard!)
  createAppleTree(0, -2, { trunkHeight: 4, blossom: true, hero: true });

  // Curated Orchard Rows — lush red fruiting trees, golden honey trees, and blooming blossom trees
  const orchardTreeSpecs: [number, number, number, boolean, boolean][] = [
    [-5.5, 4.5, 3, false, false],
    [-9.5, 4.0, 4, true, false],
    [-5.0, 9.5, 3, true, false],
    [-10.5, 9.2, 4, false, true],
    [5.2, -5.2, 3, false, false],
    [6.5, -10.0, 4, true, false],
    [1.0, -9.8, 3, false, true],
    [-4.5, -10.5, 4, true, false],
    [5.0, 9.8, 3, false, false],
    [14.5, -3.5, 4, true, false],
    [15.2, 4.5, 3, false, true],
    [14.0, 9.5, 4, false, false],
    [-14.5, -2.5, 4, false, false],
    [-14.0, -9.5, 3, true, false],
    [-14.5, 6.0, 4, true, false],
  ];
  for (const [tx, tz, th, blossom, golden] of orchardTreeSpecs) {
    createAppleTree(tx, tz, { trunkHeight: th, blossom, golden });
  }

  // Outer expanded hillside & valley apple groves (climbable & scenic!)
  const perimeterTrees: [number, number, boolean, boolean][] = [
    // South meadow & entrance avenue
    [-6.5, 16.5, true, false],
    [5.5, 17.0, false, false],
    [-11.5, 21.5, false, true],
    [8.0, 23.0, true, false],
    [-3.5, 25.0, false, false],
    // SW Campfire overlook grove
    [-22.0, 14.0, true, false],
    [-21.5, 21.0, false, true],
    [-13.0, 22.0, false, false],
    // NW Windmill hillside grove
    [-24.0, -10.0, true, false],
    [-25.5, -18.5, false, true],
    [-13.0, -24.0, true, false],
    [-4.5, -21.0, false, false],
    [4.5, -20.5, true, true],
    // NE Waterfall cliffs & Eastern Blossom Plateau
    [13.0, -18.5, false, false],
    [24.0, -14.0, true, false],
    [23.5, -4.0, false, true],
    [25.5, 5.5, true, false],
    [23.5, 14.5, false, false],
    [16.5, 20.5, true, true],
    [-24.0, 3.0, false, false],
  ];
  for (const [px, pz, blossom, golden] of perimeterTrees) {
    createAppleTree(px, pz, {
      trunkHeight: 3 + (Math.abs(Math.round(px + pz)) % 2),
      blossom,
      golden,
    });
  }

  // =========================================================================
  // 4. APPLE-CHAN'S COZY ORCHARD COTTAGE (Composite 12+ Part Voxel Structure)
  // =========================================================================
  // Seasonal winter snow caps group (roof snow blankets across the valley)
  const winterSnowCaps = new THREE.Group();
  winterSnowCaps.visible = false;
  group.add(winterSnowCaps);

  const snowBlockMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f8fc,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );

  // Minecraft Crafting Table, Bed & Interior Materials
  const craftingTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.craftingTableTop.map,
      bumpMap: textures.craftingTableTop.bumpMap,
      bumpScale: 0.03,
      roughness: 0.78,
      metalness: 0.02,
    }),
  );
  const craftingSideMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.craftingTableSide.map,
      bumpMap: textures.craftingTableSide.bumpMap,
      bumpScale: 0.03,
      roughness: 0.8,
      metalness: 0.04,
    }),
  );
  const bedRedMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc9352b, roughness: 0.88 }),
  );
  const bedPillowMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.9 }),
  );
  const rugMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb94a3e, roughness: 0.94 }),
  );
  const rugTrimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe9c983, roughness: 0.92 }),
  );

  // Enterable Cottage interactive handles
  let cottageDoorPivot = new THREE.Group();
  let cottageRoofGroup = new THREE.Group();
  let cottageRoofSnowGroup = new THREE.Group();
  let cottageInteriorLight: THREE.PointLight | null = null;
  let cottageDoorAngle = 0;

  const buildOrchardCottage = (cx: number, cz: number) => {
    const cottage = new THREE.Group();
    const gy = computeOrchardElevation(cx, cz);
    cottage.position.set(cx, gy, cz);

    // 1. Level Oak Plank Floor Slab (top at y = 0.22 so Apple-chan walks right in!)
    const floorSlab = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.9, 0.24, 5.9)),
      oakPlankMat,
    );
    floorSlab.position.set(0, 0.1, 0);
    floorSlab.receiveShadow = true;
    cottage.add(floorSlab);

    // Cozy Center Woven Rug on the wooden floor
    const rugOuter = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.6, 0.03, 2.0)),
      rugTrimMat,
    );
    rugOuter.position.set(0.15, 0.235, -0.2);
    rugOuter.receiveShadow = true;
    const rugInner = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.2, 0.035, 1.6)),
      rugMat,
    );
    rugInner.position.set(0.15, 0.24, -0.2);
    rugInner.receiveShadow = true;
    cottage.add(rugOuter, rugInner);

    // 2. Cobblestone Base Trim around exterior perimeter (split at front doorway!)
    const baseBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.0, 0.52, 0.42)), cobbleMat);
    baseBack.position.set(0, 0.26, -2.75);
    baseBack.castShadow = true;
    baseBack.receiveShadow = true;
    const baseLeft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.52, 5.9)), cobbleMat);
    baseLeft.position.set(-3.29, 0.26, 0);
    baseLeft.castShadow = true;
    baseLeft.receiveShadow = true;
    const baseRight = baseLeft.clone();
    baseRight.position.x = 3.29;
    const baseFrontL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.65, 0.52, 0.42)), cobbleMat);
    baseFrontL.position.set(-2.16, 0.26, 2.75);
    baseFrontL.castShadow = true;
    const baseFrontR = baseFrontL.clone();
    baseFrontR.position.x = 2.16;
    cottage.add(baseBack, baseLeft, baseRight, baseFrontL, baseFrontR);

    // 3. Hollow Cream Plaster Perimeter Walls (enterable interior!)
    const backWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.8, 3.4, 0.34)), plasterMat);
    backWall.position.set(0, 2.18, -2.75);
    backWall.castShadow = true;
    backWall.receiveShadow = true;

    const leftWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.34, 3.4, 5.8)), plasterMat);
    leftWall.position.set(-3.25, 2.18, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;

    const rightWall = leftWall.clone();
    rightWall.position.x = 3.25;

    // Front wall split around a 1.7-wide x 2.45-tall open doorway
    const frontWallL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.55, 3.4, 0.34)), plasterMat);
    frontWallL.position.set(-2.12, 2.18, 2.75);
    frontWallL.castShadow = true;
    frontWallL.receiveShadow = true;

    const frontWallR = frontWallL.clone();
    frontWallR.position.x = 2.12;

    const frontLintel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.78, 1.24, 0.34)), plasterMat);
    frontLintel.position.set(0, 3.26, 2.75);
    frontLintel.castShadow = true;

    cottage.add(backWall, leftWall, rightWall, frontWallL, frontWallR, frontLintel);

    // Four timber corner oak log pillars
    for (const sx of [-3.28, 3.28]) {
      for (const sz of [-2.78, 2.78]) {
        const post = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.56, 3.9, 0.56)),
          oakLogMats,
        );
        post.position.set(sx, 1.98, sz);
        post.castShadow = true;
        cottage.add(post);
      }
    }

    // Horizontal dark-oak timber framing beams
    const frontBeam = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7.1, 0.3, 0.36)),
      darkOakMat,
    );
    frontBeam.position.set(0, 3.92, 2.82);
    cottage.add(frontBeam);
    const backBeam = frontBeam.clone();
    backBeam.position.z = -2.82;
    cottage.add(backBeam);

    // 4. Doorway Frame + Swinging Oak Door (opens automatically as Apple-chan walks up!)
    const doorJambL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 2.52, 0.42)), darkOakMat);
    doorJambL.position.set(-0.85, 1.48, 2.76);
    const doorJambR = doorJambL.clone();
    doorJambR.position.x = 0.85;
    const doorTopBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.88, 0.18, 0.42)), darkOakMat);
    doorTopBar.position.set(0, 2.68, 2.76);
    cottage.add(doorJambL, doorJambR, doorTopBar);

    cottageDoorPivot = new THREE.Group();
    cottageDoorPivot.position.set(-0.75, 0.22, 2.76);
    const doorMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.5, 2.38, 0.14)),
      oakPlankMat,
    );
    doorMesh.position.set(0.75, 1.19, 0);
    doorMesh.castShadow = true;
    const doorWindow = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.54, 0.54, 0.17)),
      windowGlowMat,
    );
    doorWindow.position.set(0.75, 1.65, 0);
    const doorKnobOuter = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.14, 0.24)),
      appleGoldMat,
    );
    doorKnobOuter.position.set(1.26, 1.1, 0);
    cottageDoorPivot.add(doorMesh, doorWindow, doorKnobOuter);
    cottage.add(cottageDoorPivot);

    // 5. Cutaway Roof Group (hides cleanly when Apple-chan walks inside for a clear dollhouse view!)
    cottageRoofGroup = new THREE.Group();
    cottageRoofSnowGroup = new THREE.Group();
    cottageRoofSnowGroup.visible = false;

    for (let step = 0; step < 5; step++) {
      const spanZ = 7.2 - step * 1.25;
      const ry = 4.18 + step * 0.56;
      const roofRow = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(7.8, 0.62, Math.max(1.1, spanZ))),
        roofMat,
      );
      roofRow.position.set(0, ry, 0);
      roofRow.castShadow = true;
      roofRow.receiveShadow = true;
      cottageRoofGroup.add(roofRow);

      // Winter snow blanket on each roof tier
      const snowRow = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(7.92, 0.16, Math.max(1.16, spanZ + 0.08))),
        snowBlockMat,
      );
      snowRow.position.set(0, ry + 0.36, 0);
      cottageRoofSnowGroup.add(snowRow);
    }
    for (let step = 0; step < 4; step++) {
      const spanZ = 5.4 - step * 1.25;
      const gable = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(6.55, 0.58, Math.max(0.8, spanZ))),
        plasterMat,
      );
      gable.position.set(0, 4.14 + step * 0.56, 0);
      cottageRoofGroup.add(gable);
    }

    // Cobblestone Chimney rising through the roof
    const chimney = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.1, 3.8, 1.1)),
      mossyCobbleMat,
    );
    chimney.position.set(-2.1, 5.55, -1.2);
    chimney.castShadow = true;
    cottageRoofGroup.add(chimney);
    const chimneyCap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.36, 0.26, 1.36)),
      cobbleMat,
    );
    chimneyCap.position.set(-2.1, 7.5, -1.2);
    cottageRoofGroup.add(chimneyCap);

    cottageRoofGroup.add(cottageRoofSnowGroup);
    cottage.add(cottageRoofGroup);

    // 6. Front Wooden Porch Deck (flush at y = 0.22 with interior floor!) & Awning
    const porchDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.6, 0.24, 1.9)),
      oakPlankMat,
    );
    porchDeck.position.set(0, 0.1, 3.85);
    porchDeck.receiveShadow = true;
    cottage.add(porchDeck);

    for (const px of [-1.55, 1.55]) {
      const pPost = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.28, 2.85, 0.28)),
        oakLogMats,
      );
      pPost.position.set(px, 1.62, 4.55);
      pPost.castShadow = true;
      cottage.add(pPost);
    }
    const porchRoof = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.85, 0.34, 2.15)),
      roofMat,
    );
    porchRoof.position.set(0, 3.16, 3.85);
    porchRoof.rotation.x = 0.14;
    porchRoof.castShadow = true;
    cottage.add(porchRoof);

    // Winter snow cap on porch awning
    const porchSnow = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.92, 0.14, 2.2)),
      snowBlockMat,
    );
    porchSnow.position.set(cx, gy + 3.38, cz + 3.85);
    porchSnow.rotation.x = 0.14;
    winterSnowCaps.add(porchSnow);

    // Warm glowing paned windows + flower boxes
    const windowPositions: [number, number, number, number][] = [
      [-2.12, 2.28, 2.86, 0],
      [2.12, 2.28, 2.86, 0],
      [3.36, 2.28, 0.0, Math.PI / 2],
      [-3.36, 2.28, 0.0, Math.PI / 2],
    ];
    for (const [wx, wy, wz, ry] of windowPositions) {
      const win = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.15, 1.1, 0.16)),
        windowGlowMat,
      );
      win.position.set(wx, wy, wz);
      win.rotation.y = ry;
      cottage.add(win);

      const sill = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.3, 0.26, 0.34)),
        darkOakMat,
      );
      sill.position.set(wx, wy - 0.68, wz + (ry === 0 ? 0.16 : 0));
      if (ry !== 0) sill.position.x += wx > 0 ? 0.16 : -0.16;
      sill.rotation.y = ry;
      cottage.add(sill);
    }

    // 7. GROUNDED INTERIOR FURNITURE (Minecraft Crafting Table, Red Bed, Oak Chest!)
    // A) Minecraft 3x3 Crafting Table at local (-2.05, 0.22, -1.65) -> world (-10.55, 0.22, -8.85)
    const craftingTableMats = [
      craftingSideMat,
      craftingSideMat,
      craftingTopMat,
      oakPlankMat,
      craftingSideMat,
      craftingSideMat,
    ];
    const craftingTable = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.0, 1.0, 1.0)),
      craftingTableMats,
    );
    craftingTable.position.set(-2.05, 0.72, -1.65);
    craftingTable.castShadow = true;
    craftingTable.receiveShadow = true;
    cottage.add(craftingTable);

    const craftingHit = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.45, 1.55, 1.45)),
      trackMat(new THREE.MeshBasicMaterial({ visible: false })),
    );
    craftingHit.position.set(-2.05, 0.92, -1.65);
    craftingHit.userData = { clickable: 'craftingTable' };
    cottage.add(craftingHit);
    clickables.push(craftingHit);

    // B) Minecraft Oak Storage Chest at local (-2.05, 0.22, 0.45) -> world (-10.55, 0.22, -6.75)
    const chestGroup = new THREE.Group();
    chestGroup.position.set(-2.05, 0.22, 0.45);
    const chestBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.92, 0.62, 0.92)),
      oakPlankMat,
    );
    chestBody.position.y = 0.31;
    chestBody.castShadow = true;
    const chestLid = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.96, 0.24, 0.96)),
      darkOakMat,
    );
    chestLid.position.y = 0.74;
    chestLid.castShadow = true;
    const chestLatch = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.22, 0.16)),
      appleGoldMat,
    );
    chestLatch.position.set(0.46, 0.62, 0);
    chestGroup.add(chestBody, chestLid, chestLatch);
    cottage.add(chestGroup);

    const chestHit = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.3, 1.3, 1.3)),
      trackMat(new THREE.MeshBasicMaterial({ visible: false })),
    );
    chestHit.position.set(-2.05, 0.75, 0.45);
    chestHit.userData = { clickable: 'cottageChest' };
    cottage.add(chestHit);
    clickables.push(chestHit);

    // C) Minecraft Red Voxel Bed at local (1.85, 0.22, -1.55) -> world (-6.65, 0.22, -8.75)
    const bedGroup = new THREE.Group();
    bedGroup.position.set(1.85, 0.22, -1.55);
    const bedFrame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.25, 0.32, 2.05)),
      darkOakMat,
    );
    bedFrame.position.y = 0.22;
    bedFrame.castShadow = true;
    const bedHeadboard = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.28, 0.72, 0.16)),
      darkOakMat,
    );
    bedHeadboard.position.set(0, 0.48, -0.96);
    const bedQuilt = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.18, 0.28, 1.35)),
      bedRedMat,
    );
    bedQuilt.position.set(0, 0.46, 0.28);
    bedQuilt.castShadow = true;
    const bedPillow = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.14, 0.26, 0.56)),
      bedPillowMat,
    );
    bedPillow.position.set(0, 0.48, -0.62);
    bedGroup.add(bedFrame, bedHeadboard, bedQuilt, bedPillow);
    cottage.add(bedGroup);

    const bedHit = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.6, 1.2, 2.25)),
      trackMat(new THREE.MeshBasicMaterial({ visible: false })),
    );
    bedHit.position.set(1.85, 0.72, -1.55);
    bedHit.userData = { clickable: 'cottageBed' };
    cottage.add(bedHit);
    clickables.push(bedHit);

    // D) Cozy Back-Wall Oak Sideboard + Apple Bowl
    const sideboard = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.5, 0.86, 0.65)),
      darkOakMat,
    );
    sideboard.position.set(-0.05, 0.65, -2.2);
    sideboard.castShadow = true;
    const bowlApple = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.28, 0.28, 0.28)),
      appleRedMat,
    );
    bowlApple.position.set(-0.22, 1.22, -2.18);
    const bowlGold = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.26, 0.26, 0.26)),
      appleGoldMat,
    );
    bowlGold.position.set(0.18, 1.21, -2.2);
    cottage.add(sideboard, bowlApple, bowlGold);

    // Warm Interior Hanging Lantern + PointLight (always warmly lit when inside!)
    const indoorLantern = buildVoxelLantern(ironMat, lanternGlowMat, trackGeo);
    indoorLantern.position.set(0, 3.25, -0.35);
    cottage.add(indoorLantern);
    cottageInteriorLight = new THREE.PointLight(0xffcf82, 1.6, 11, 1.6);
    cottageInteriorLight.position.set(cx, gy + 3.0, cz - 0.35);
    group.add(cottageInteriorLight);

    // Porch Lantern + PointLight
    const porchLantern = buildVoxelLantern(ironMat, lanternGlowMat, trackGeo);
    porchLantern.position.set(1.55, 2.6, 4.55);
    cottage.add(porchLantern);
    const pLight = new THREE.PointLight(0xffb552, 1.9, 13, 1.8);
    pLight.position.set(cx + 1.55, gy + 2.5, cz + 4.55);
    group.add(pLight);
    lanternLights.push(pLight);

    // Stacked Apple Crates & Cider Barrel beside the porch
    const crateMats = [
      oakPlankMat,
      oakPlankMat,
      appleCrateTopMat,
      oakPlankMat,
      oakPlankMat,
      oakPlankMat,
    ];
    const crate1 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.86, 0.86, 0.86)),
      crateMats,
    );
    crate1.position.set(-2.65, 0.43, 3.6);
    crate1.castShadow = true;
    crate1.receiveShadow = true;
    cottage.add(crate1);

    const barrel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.92, 1.0, 0.92)),
      [barrelSideMat, barrelSideMat, oakPlankMat, oakPlankMat, barrelSideMat, barrelSideMat],
    );
    barrel.position.set(2.6, 0.5, 3.55);
    barrel.castShadow = true;
    cottage.add(barrel);

    // Hay bales beside the cottage
    const hay1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.95, 0.95)), hayMat);
    hay1.position.set(4.1, 0.475, -1.2);
    hay1.castShadow = true;
    cottage.add(hay1);
    const hay2 = hay1.clone();
    hay2.position.set(4.1, 0.475, -0.2);
    cottage.add(hay2);
    const hay3 = hay1.clone();
    hay3.position.set(4.1, 1.425, -0.7);
    cottage.add(hay3);

    group.add(cottage);
  };
  buildOrchardCottage(-8.5, -7.2);

  // =========================================================================
  // 4B. STARDEW-STYLE WOODEN SHIPPING BIN (Beside Cottage Porch!)
  // =========================================================================
  const shippingBinGroup = new THREE.Group();
  shippingBinGroup.position.set(-4.6, computeOrchardElevation(-4.6, -2.9), -2.9);
  const binBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.5, 0.9, 1.05)),
    oakPlankMat,
  );
  binBody.position.y = 0.45;
  binBody.castShadow = true;
  binBody.receiveShadow = true;
  const binBand = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.56, 0.14, 1.11)),
    ironMat,
  );
  binBand.position.y = 0.56;
  const shippingLidPivot = new THREE.Group();
  shippingLidPivot.position.set(0, 0.92, -0.52);
  const binLid = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.62, 0.16, 1.16)),
    darkOakMat,
  );
  binLid.position.set(0, 0.08, 0.52);
  binLid.castShadow = true;
  const binGoldBadge = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.28, 0.2, 0.08)),
    appleGoldMat,
  );
  binGoldBadge.position.set(0, 0.58, 0.56);
  shippingLidPivot.add(binLid);
  const binHitProxy = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.9, 1.6, 1.6)),
    trackMat(new THREE.MeshBasicMaterial({ visible: false })),
  );
  binHitProxy.position.y = 0.8;
  binHitProxy.userData = { clickable: 'shippingBin' };
  shippingBinGroup.add(binBody, binBand, binGoldBadge, shippingLidPivot, binHitProxy);
  clickables.push(binHitProxy);
  group.add(shippingBinGroup);

  let shippingLidBounce = 0;
  const triggerShippingBinBounce = () => {
    shippingLidBounce = 1.0;
  };

  // =========================================================================
  // 4C. ORCHARD MARKET STALL (Bilingual Shop Sign + Striped Awning!)
  // =========================================================================
  const shopStallGroup = new THREE.Group();
  shopStallGroup.position.set(4.5, computeOrchardElevation(4.5, 7.4), 7.4);
  shopStallGroup.rotation.y = -0.35;
  const stallCounter = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.5, 0.92, 1.15)),
    oakPlankMat,
  );
  stallCounter.position.y = 0.46;
  stallCounter.castShadow = true;
  stallCounter.receiveShadow = true;
  shopStallGroup.add(stallCounter);
  for (const px of [-1.12, 1.12]) {
    const post = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.18, 2.35, 0.18)),
      darkOakMat,
    );
    post.position.set(px, 1.18, -0.42);
    post.castShadow = true;
    shopStallGroup.add(post);
  }
  const awningRedMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd64b42, roughness: 0.8 }));
  const awningCreamMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf9f1df, roughness: 0.82 }));
  for (let s = 0; s < 5; s++) {
    const stripe = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.54, 0.14, 1.55)),
      s % 2 === 0 ? awningRedMat : awningCreamMat,
    );
    stripe.position.set(-1.08 + s * 0.54, 2.38, 0.08);
    stripe.rotation.x = 0.22;
    stripe.castShadow = true;
    shopStallGroup.add(stripe);
  }
  const shopSignMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.shopSignBoard,
      roughness: 0.72,
    }),
  );
  const shopSign = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.1, 0.56, 0.1)),
    [oakPlankMat, oakPlankMat, oakPlankMat, oakPlankMat, shopSignMat, shopSignMat],
  );
  shopSign.position.set(0, 1.85, -0.45);
  shopStallGroup.add(shopSign);
  // Display apples on counter
  const stallApple1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.28, 0.28)), appleRedMat);
  stallApple1.position.set(-0.6, 1.06, 0.05);
  const stallApple2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.28, 0.28)), appleGoldMat);
  stallApple2.position.set(0.0, 1.06, 0.05);
  const stallApple3 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.28, 0.28)), appleRedMat);
  stallApple3.position.set(0.6, 1.06, 0.05);
  shopStallGroup.add(stallApple1, stallApple2, stallApple3);

  const shopHitProxy = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.8, 2.6, 1.8)),
    trackMat(new THREE.MeshBasicMaterial({ visible: false })),
  );
  shopHitProxy.position.y = 1.25;
  shopHitProxy.userData = { clickable: 'shopStall' };
  shopStallGroup.add(shopHitProxy);
  clickables.push(shopHitProxy);
  group.add(shopStallGroup);

  // =========================================================================
  // 5. ORCHARD ENTRANCE ARCHWAY + CUSTOM PIXEL SIGNBOARD
  // =========================================================================
  const buildEntranceArch = (ax: number, az: number) => {
    const arch = new THREE.Group();
    arch.position.set(ax, computeOrchardElevation(ax, az), az);

    for (const sx of [-2.3, 2.3]) {
      const base = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.96, 0.9, 0.96)),
        mossyCobbleMat,
      );
      base.position.set(sx, 0.45, 0);
      base.castShadow = true;
      base.receiveShadow = true;
      arch.add(base);

      const pillar = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.76, 3.4, 0.76)),
        oakLogMats,
      );
      pillar.position.set(sx, 2.6, 0);
      pillar.castShadow = true;
      arch.add(pillar);

      const lantern = buildVoxelLantern(ironMat, lanternGlowMat, trackGeo);
      lantern.position.set(sx * 0.78, 3.35, 0.55);
      arch.add(lantern);
    }

    const crossBeam = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.8, 0.62, 0.84)),
      darkOakMat,
    );
    crossBeam.position.set(0, 4.35, 0);
    crossBeam.castShadow = true;
    arch.add(crossBeam);

    const roofCap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.3, 0.42, 1.4)),
      roofMat,
    );
    roofCap.position.set(0, 4.82, 0);
    roofCap.castShadow = true;
    arch.add(roofCap);

    // Pixel-art signboard reading "Apple-chan's Orchard"
    const signMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.signBoard,
        roughness: 0.75,
      }),
    );
    const signMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.9, 1.05, 0.14)),
      [oakPlankMat, oakPlankMat, oakPlankMat, oakPlankMat, signMat, signMat],
    );
    signMesh.position.set(0, 3.65, 0.42);
    signMesh.castShadow = true;
    arch.add(signMesh);

    const archLight = new THREE.PointLight(0xffb954, 1.5, 11, 1.8);
    archLight.position.set(ax, 3.5, az + 0.8);
    group.add(archLight);
    lanternLights.push(archLight);

    group.add(arch);
  };
  buildEntranceArch(0, 11.2);

  // =========================================================================
  // 6. ARCHED OAK FOOTBRIDGE OVER THE BROOK
  // =========================================================================
  const buildFootbridge = () => {
    const bridge = new THREE.Group();
    const plankCount = 10;
    for (let i = 0; i < plankCount; i++) {
      const t = i / (plankCount - 1);
      const bx = 8.4 + t * 5.2;
      const by = Math.sin(t * Math.PI) * 0.62 + 0.04;
      const plank = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.56, 0.18, 2.5)),
        oakPlankMat,
      );
      plank.position.set(bx, by, 1.6);
      plank.castShadow = true;
      plank.receiveShadow = true;
      bridge.add(plank);

      // Bridge railings at ends and middle
      if (i === 0 || i === 3 || i === 6 || i === plankCount - 1) {
        for (const rz of [0.45, 2.75]) {
          const post = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(0.22, 1.05, 0.22)),
            darkOakMat,
          );
          post.position.set(bx, by + 0.56, rz);
          post.castShadow = true;
          bridge.add(post);
        }
      }
    }
    // Handrails
    for (const rz of [0.45, 2.75]) {
      const railL = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.75, 0.14, 0.14)),
        darkOakMat,
      );
      railL.position.set(9.7, 1.32, rz);
      railL.rotation.z = 0.22;
      bridge.add(railL);
      const railR = railL.clone();
      railR.position.set(12.3, 1.32, rz);
      railR.rotation.z = -0.22;
      bridge.add(railR);
    }
    group.add(bridge);
  };
  buildFootbridge();

  // =========================================================================
  // 6B. EXPANDED LANDSCAPE LANDMARKS:
  //     (1) SOUTH-EAST STONE ARCH BRIDGE, (2) NW HILLTOP SPINNING WINDMILL,
  //     (3) EASTERN BLOSSOM TEA GAZEBO, (4) NE CASCADING VOXEL WATERFALL,
  //     (5) SW CAMPFIRE OVERLOOK KNOLL & MOSSY BOULDERS
  // =========================================================================
  const buildStoneBridge = () => {
    const sBridge = new THREE.Group();
    const steps = 11;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const bx = 7.9 + t * 5.8;
      const by = Math.sin(t * Math.PI) * 0.72 + 0.04;
      const slab = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.6, 0.24, 2.6)),
        i % 2 === 0 ? cobbleMat : mossyCobbleMat,
      );
      slab.position.set(bx, by, 14.5);
      slab.castShadow = true;
      slab.receiveShadow = true;
      sBridge.add(slab);

      if (i === 0 || i === 5 || i === steps - 1) {
        for (const rz of [13.25, 15.75]) {
          const pillar = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(0.36, 0.95, 0.36)),
            mossyCobbleMat,
          );
          pillar.position.set(bx, by + 0.48, rz);
          pillar.castShadow = true;
          sBridge.add(pillar);
        }
      }
    }
    group.add(sBridge);
  };
  buildStoneBridge();

  // Spinning Composite Voxel Windmill on the climbable NW Hilltop (-18, -18, y=3)
  const windmillBladesPivot = new THREE.Group();
  const buildHilltopWindmill = (wx: number, wz: number) => {
    const wm = new THREE.Group();
    const gy = computeOrchardElevation(wx, wz);
    wm.position.set(wx, gy, wz);

    // Stone base & tapered plaster/timber tower
    const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.2, 1.8, 4.2)), cobbleMat);
    base.position.y = 0.9;
    base.castShadow = true;
    base.receiveShadow = true;
    wm.add(base);

    const midTower = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 3.6, 3.4)), plasterMat);
    midTower.position.y = 3.6;
    midTower.castShadow = true;
    midTower.receiveShadow = true;
    wm.add(midTower);

    const upperTower = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.8, 2.4, 2.8)), oakPlankMat);
    upperTower.position.y = 6.6;
    upperTower.castShadow = true;
    wm.add(upperTower);

    // Timber corner beams
    for (const sx of [-1.72, 1.72]) {
      for (const sz of [-1.72, 1.72]) {
        const beam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 4.0, 0.32)), darkOakMat);
        beam.position.set(sx, 3.6, sz);
        wm.add(beam);
      }
    }

    // Stepped terracotta cap roof
    const cap1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.6, 0.7, 3.6)), roofMat);
    cap1.position.y = 8.15;
    cap1.castShadow = true;
    const cap2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 0.75, 2.4)), roofMat);
    cap2.position.y = 8.85;
    const cap3 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.8, 1.1)), roofMat);
    cap3.position.y = 9.55;
    wm.add(cap1, cap2, cap3);

    // Glowing tower window facing the orchard
    const wmWin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 1.1, 0.16)), windowGlowMat);
    wmWin.position.set(0, 3.8, 1.74);
    wm.add(wmWin);

    // Spinning 4-blade windmill rotor hub facing southeast toward the orchard valley
    const rotorHub = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.65, 0.65, 0.9)), ironMat);
    windmillBladesPivot.position.set(0, 6.7, 1.72);
    windmillBladesPivot.add(rotorHub);

    const sailMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xfbf3df, roughness: 0.78 }),
    );
    for (let i = 0; i < 4; i++) {
      const armGroup = new THREE.Group();
      armGroup.rotation.z = (i * Math.PI) / 2;
      const spar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 4.1, 0.16)), darkOakMat);
      spar.position.y = 2.05;
      spar.castShadow = true;
      const sail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.88, 3.1, 0.08)), sailMat);
      sail.position.set(0.52, 2.35, 0.05);
      sail.castShadow = true;
      armGroup.add(spar, sail);
      windmillBladesPivot.add(armGroup);
    }
    wm.add(windmillBladesPivot);

    // Hilltop lantern & warm point light
    const wmLantern = buildVoxelLantern(ironMat, lanternGlowMat, trackGeo);
    wmLantern.position.set(1.85, 2.35, 2.15);
    wm.add(wmLantern);
    const wmLight = new THREE.PointLight(0xffbe5c, 1.5, 14, 1.7);
    wmLight.position.set(wx + 1.85, gy + 2.2, wz + 2.15);
    group.add(wmLight);
    lanternLights.push(wmLight);

    // Rotate slightly so sails face the main valley
    wm.rotation.y = 0.48;
    group.add(wm);
  };
  buildHilltopWindmill(-18, -18);

  // Eastern Blossom Tea Gazebo on the climbable Eastern Plateau (20, 6, y=2)
  const buildBlossomGazebo = (gx: number, gz: number) => {
    const gzGroup = new THREE.Group();
    const gy = computeOrchardElevation(gx, gz);
    gzGroup.position.set(gx, gy, gz);

    const floor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.4, 0.36, 4.4)), oakPlankMat);
    floor.position.y = 0.18;
    floor.receiveShadow = true;
    gzGroup.add(floor);

    for (const px of [-1.85, 1.85]) {
      for (const pz of [-1.85, 1.85]) {
        const post = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 3.0, 0.32)), darkOakMat);
        post.position.set(px, 1.85, pz);
        post.castShadow = true;
        gzGroup.add(post);
      }
    }
    const roof1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.0, 0.45, 5.0)), roofMat);
    roof1.position.y = 3.55;
    roof1.castShadow = true;
    const roof2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 0.48, 3.2)), roofMat);
    roof2.position.y = 4.02;
    const roof3 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 0.45, 1.4)), roofMat);
    roof3.position.y = 4.48;
    gzGroup.add(roof1, roof2, roof3);

    // Winter snow caps atop gazebo roof tiers
    const gSnow1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.1, 0.14, 5.1)), snowBlockMat);
    gSnow1.position.set(gx, gy + 3.84, gz);
    const gSnow2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.3, 0.14, 3.3)), snowBlockMat);
    gSnow2.position.set(gx, gy + 4.32, gz);
    const gSnow3 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.14, 1.5)), snowBlockMat);
    gSnow3.position.set(gx, gy + 4.76, gz);
    winterSnowCaps.add(gSnow1, gSnow2, gSnow3);

    // Center tea table + twin benches + hanging lantern
    const table = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.3, 0.72, 1.3)), oakPlankMat);
    table.position.y = 0.72;
    table.castShadow = true;
    const teapot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.32, 0.32)), appleRedMat);
    teapot.position.set(0, 1.24, 0);
    gzGroup.add(table, teapot);

    const gLantern = buildVoxelLantern(ironMat, lanternGlowMat, trackGeo);
    gLantern.position.set(0, 3.0, 0);
    gzGroup.add(gLantern);
    const gLight = new THREE.PointLight(0xffb858, 1.4, 12, 1.7);
    gLight.position.set(gx, gy + 2.8, gz);
    group.add(gLight);
    lanternLights.push(gLight);

    group.add(gzGroup);
  };
  buildBlossomGazebo(20, 6);

  // NE Cascading Voxel Waterfall tumbling down the mossy cliff toward the brook
  const waterfallStreamMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.water,
      roughness: 0.14,
      metalness: 0.1,
      transparent: true,
      opacity: 0.86,
    }),
  );
  const buildWaterfall = () => {
    const wf = new THREE.Group();
    // Cascading water blocks stepping from cliff (16, -15, y=4) down to brook (12, -13, y=0)
    const falls: [number, number, number, number, number, number][] = [
      [15.8, 3.7, -15.6, 2.2, 0.45, 2.2],
      [14.4, 2.4, -14.8, 2.0, 2.6, 1.1],
      [13.4, 1.1, -14.0, 2.2, 2.0, 1.2],
      [12.2, 0.12, -13.3, 3.0, 0.4, 3.0],
    ];
    for (const [fx, fy, fz, fw, fh, fd] of falls) {
      const m = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(fw, fh, fd)), waterfallStreamMat);
      m.position.set(fx, fy, fz);
      wf.add(m);
    }
    // Flanking mossy cliff boulders
    const rocks: [number, number, number, number][] = [
      [16.2, 2.2, -13.6, 1.3],
      [12.5, 1.6, -15.4, 1.4],
      [14.0, 0.4, -12.0, 0.9],
    ];
    for (const [rx, ry, rz, rs] of rocks) {
      const r = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(rs, rs * 0.9, rs)), mossyCobbleMat);
      r.position.set(rx, ry, rz);
      r.castShadow = true;
      r.receiveShadow = true;
      wf.add(r);
    }
    group.add(wf);
  };
  buildWaterfall();

  // SW Campfire Overlook Knoll (-17, 16, y=2) with warm flickering campfire & log benches
  const campfireLight = new THREE.PointLight(0xff8e36, 1.8, 12, 1.7);
  const campfireFlame = new THREE.Group();
  const buildCampfireOverlook = (cx: number, cz: number) => {
    const camp = new THREE.Group();
    const gy = computeOrchardElevation(cx, cz);
    camp.position.set(cx, gy, cz);

    // Stone ring & crossed oak firewood logs
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const stone = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.34, 0.42)), cobbleMat);
      stone.position.set(Math.cos(a) * 0.72, 0.17, Math.sin(a) * 0.72);
      camp.add(stone);
    }
    const log1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.05, 0.22, 0.24)), oakLogMats);
    log1.position.y = 0.14;
    log1.rotation.y = 0.6;
    const log2 = log1.clone();
    log2.rotation.y = -0.6;
    camp.add(log1, log2);

    // Glowing voxel flames
    const flameMat1 = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xff7b24 }),
    );
    const flameMat2 = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xffe066 }),
    );
    const f1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.56, 0.42)), flameMat1);
    f1.position.y = 0.42;
    const f2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.42, 0.24)), flameMat2);
    f2.position.y = 0.64;
    campfireFlame.add(f1, f2);
    camp.add(campfireFlame);

    // Two cozy oak log benches facing the fire
    for (const [bx, bz, rot] of [
      [-1.9, 0.4, 0.2],
      [0.6, 1.9, 1.4],
    ] as [number, number, number][]) {
      const bench = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.55, 0.46, 1.75)), oakLogMats);
      bench.position.set(bx, 0.23, bz);
      bench.rotation.y = rot;
      bench.castShadow = true;
      bench.receiveShadow = true;
      camp.add(bench);
    }

    campfireLight.position.set(cx, gy + 1.1, cz);
    group.add(campfireLight);
    lanternLights.push(campfireLight);
    group.add(camp);
  };
  buildCampfireOverlook(-17, 16);

  // Decorative mossy meadow boulders scattered across the bigger landscape
  const boulderSpots: [number, number, number][] = [
    [-14, 7, 1.1],
    [16, 12, 1.25],
    [18, -6, 1.0],
    [-9, 19, 1.15],
    [9, 21, 0.95],
    [-21, -5, 1.3],
  ];
  for (const [bx, bz, bs] of boulderSpots) {
    const by = computeOrchardElevation(bx, bz);
    if (by < 0) continue;
    const rock = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bs, bs * 0.72, bs * 0.9)),
      mossyCobbleMat,
    );
    rock.position.set(bx, by + bs * 0.35, bz);
    rock.rotation.y = bx * 0.7;
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  // =========================================================================
  // 7. STONE WISHING WELL + HARVEST APPLE CART + PICNIC TABLE + FENCES
  // =========================================================================
  const buildWishingWell = (wx: number, wz: number) => {
    const well = new THREE.Group();
    well.position.set(wx, computeOrchardElevation(wx, wz), wz);

    // Cobble rim (4 wall blocks around sparkling water interior)
    const rimParts: [number, number, number, number][] = [
      [0, 0.9, 2.2, 0.45],
      [0, -0.9, 2.2, 0.45],
      [-0.9, 0, 0.45, 1.4],
      [0.9, 0, 0.45, 1.4],
    ];
    for (const [rx, rz, rw, rd] of rimParts) {
      const m = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(rw, 0.95, rd)),
        mossyCobbleMat,
      );
      m.position.set(rx, 0.475, rz);
      m.castShadow = true;
      m.receiveShadow = true;
      well.add(m);
    }
    const wellWater = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.4, 0.1, 1.4)),
      waterMat,
    );
    wellWater.position.y = 0.58;
    well.add(wellWater);

    // Twin oak posts + pitched roof + rope bucket
    for (const px of [-0.9, 0.9]) {
      const post = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.24, 2.0, 0.24)),
        darkOakMat,
      );
      post.position.set(px, 1.9, 0);
      post.castShadow = true;
      well.add(post);
    }
    const roof1 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.6, 0.35, 2.4)),
      roofMat,
    );
    roof1.position.y = 2.95;
    roof1.castShadow = true;
    well.add(roof1);
    const roof2 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.4, 0.35, 1.4)),
      roofMat,
    );
    roof2.position.y = 3.3;
    well.add(roof2);

    const bucket = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.42, 0.42, 0.42)),
      oakPlankMat,
    );
    bucket.position.set(0, 1.35, 0);
    well.add(bucket);
    const rope = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.06, 1.35, 0.06)),
      hayMat,
    );
    rope.position.set(0, 2.2, 0);
    well.add(rope);

    group.add(well);
  };
  buildWishingWell(5.5, -1.8);

  // Harvest Apple Cart parked near the path
  const buildHarvestCart = (cx: number, cz: number, rotY: number) => {
    const cart = new THREE.Group();
    cart.position.set(cx, computeOrchardElevation(cx, cz), cz);
    cart.rotation.y = rotY;

    const bed = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.7, 0.22, 2.3)),
      oakPlankMat,
    );
    bed.position.y = 0.65;
    bed.castShadow = true;
    cart.add(bed);

    // Side rails
    for (const sx of [-0.8, 0.8]) {
      const side = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.14, 0.56, 2.3)),
        darkOakMat,
      );
      side.position.set(sx, 1.0, 0);
      side.castShadow = true;
      cart.add(side);
    }
    const back = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.7, 0.56, 0.14)),
      darkOakMat,
    );
    back.position.set(0, 1.0, -1.1);
    cart.add(back);

    // Handles
    for (const hx of [-0.52, 0.52]) {
      const h = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.12, 0.12, 1.1)),
        darkOakMat,
      );
      h.position.set(hx, 0.72, 1.65);
      cart.add(h);
    }

    // Two spoked wooden wheels
    for (const wx of [-0.94, 0.94]) {
      const wheel = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.16, 0.96, 0.96)),
        darkOakMat,
      );
      wheel.position.set(wx, 0.48, -0.15);
      wheel.castShadow = true;
      cart.add(wheel);
      const hub = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.22, 0.24, 0.24)),
        ironMat,
      );
      hub.position.set(wx, 0.48, -0.15);
      cart.add(hub);
    }

    // Mound of glossy harvested red & golden apples inside the cart!
    const aGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.32, 0.32));
    const cartApples: [number, number, number, boolean][] = [
      [-0.35, 0.92, -0.5, false],
      [0.05, 0.92, -0.45, false],
      [0.4, 0.92, -0.3, true],
      [-0.25, 0.92, 0.15, false],
      [0.2, 0.92, 0.25, false],
      [-0.08, 1.2, -0.18, false],
      [0.26, 1.18, -0.05, true],
      [-0.3, 0.92, 0.6, false],
      [0.18, 0.92, 0.65, false],
    ];
    for (const [ax, ay, az, gold] of cartApples) {
      const ap = new THREE.Mesh(aGeo, gold ? appleGoldMat : appleRedMat);
      ap.position.set(ax, ay, az);
      ap.rotation.y = ax * 2.1;
      ap.castShadow = true;
      cart.add(ap);
    }

    group.add(cart);
  };
  buildHarvestCart(-3.6, 7.2, 0.42);

  // =========================================================================
  // 8. INTERACTIVE 6-PLOT STARDEW FARM GARDEN (Plant, Water & Harvest!)
  // =========================================================================
  const plotCoords: [number, number][] = [
    [7, 4],
    [9, 4],
    [7, 5.5],
    [9, 5.5],
    [7, 7],
    [9, 7],
  ];
  const berryFruitMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd94e8f,
      roughness: 0.28,
      metalness: 0.06,
    }),
  );
  const sproutGreenMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x76c954, roughness: 0.78 }),
  );
  const ripeSparkleMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xfff08a }),
  );

  interface VisualFarmPlot {
    soilMesh: THREE.Mesh;
    cropRoot: THREE.Group;
    ripeIndicator: THREE.Mesh;
    worldX: number;
    worldZ: number;
  }
  const visualFarmPlots: VisualFarmPlot[] = [];
  const plotSoilGeo = trackGeo(new THREE.BoxGeometry(1.18, 0.16, 1.18));
  const plotHitGeo = trackGeo(new THREE.BoxGeometry(1.3, 1.35, 1.3));
  const sproutGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.26, 0.18));
  const bushGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.56, 0.68));
  const miniTrunkGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.65, 0.24));
  const miniCanopyGeo = trackGeo(new THREE.BoxGeometry(0.84, 0.68, 0.84));
  const miniFruitGeo = trackGeo(new THREE.BoxGeometry(0.2, 0.2, 0.2));
  const sparkleGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.16, 0.16));

  plotCoords.forEach(([px, pz], plotIndex) => {
    const plotGroup = new THREE.Group();
    plotGroup.position.set(px, 0, pz);

    const soilMesh = new THREE.Mesh(plotSoilGeo, farmlandMat);
    soilMesh.position.y = 0.02;
    soilMesh.receiveShadow = true;
    plotGroup.add(soilMesh);

    const cropRoot = new THREE.Group();
    cropRoot.position.y = 0.08;
    plotGroup.add(cropRoot);

    const ripeIndicator = new THREE.Mesh(sparkleGeo, ripeSparkleMat);
    ripeIndicator.position.set(0, 1.45, 0);
    ripeIndicator.visible = false;
    plotGroup.add(ripeIndicator);

    const hitProxy = new THREE.Mesh(
      plotHitGeo,
      trackMat(new THREE.MeshBasicMaterial({ visible: false })),
    );
    hitProxy.position.y = 0.65;
    hitProxy.userData = { clickable: 'farmPlot', plotIndex };
    plotGroup.add(hitProxy);
    clickables.push(hitProxy);

    group.add(plotGroup);
    saplings.push(cropRoot);
    visualFarmPlots.push({
      soilMesh,
      cropRoot,
      ripeIndicator,
      worldX: px,
      worldZ: pz,
    });
  });

  const syncFarmPlots = (plots: FarmPlotState[]) => {
    plots.forEach((p, idx) => {
      const vp = visualFarmPlots[idx];
      if (!vp) return;
      vp.soilMesh.material = p.watered ? farmlandWetMat : farmlandMat;

      while (vp.cropRoot.children.length > 0) {
        vp.cropRoot.remove(vp.cropRoot.children[0]);
      }

      if (!p.crop) {
        vp.ripeIndicator.visible = false;
        return;
      }

      const isRipe = p.stage >= p.maxStage;
      vp.ripeIndicator.visible = isRipe;

      if (p.stage === 0) {
        // Freshly planted tiny twin sprouts
        const s1 = new THREE.Mesh(sproutGeo, sproutGreenMat);
        s1.position.set(-0.14, 0.13, 0.08);
        const s2 = new THREE.Mesh(sproutGeo, sproutGreenMat);
        s2.position.set(0.14, 0.15, -0.08);
        vp.cropRoot.add(s1, s2);
      } else if (!isRipe) {
        // Mid-growth sapling / leafy shrub
        const trunk = new THREE.Mesh(miniTrunkGeo, oakBarkMat);
        trunk.position.y = 0.28;
        const leaf = new THREE.Mesh(bushGeo, leavesLushMat);
        leaf.position.y = 0.62;
        leaf.castShadow = true;
        vp.cropRoot.add(trunk, leaf);
      } else {
        // Ripe ready-to-harvest crop!
        if (p.crop === 'honeyBerry') {
          const bush = new THREE.Mesh(bushGeo, leavesLushMat);
          bush.position.y = 0.34;
          bush.castShadow = true;
          vp.cropRoot.add(bush);
          const offsets: [number, number, number][] = [
            [-0.24, 0.56, 0.24],
            [0.24, 0.48, 0.2],
            [0.0, 0.66, -0.22],
            [-0.2, 0.42, -0.2],
          ];
          for (const [bx, by, bz] of offsets) {
            const berry = new THREE.Mesh(miniFruitGeo, berryFruitMat);
            berry.position.set(bx, by, bz);
            vp.cropRoot.add(berry);
          }
        } else {
          const trunk = new THREE.Mesh(miniTrunkGeo, oakBarkMat);
          trunk.position.y = 0.32;
          const canopy = new THREE.Mesh(
            miniCanopyGeo,
            p.crop === 'goldenSapling' ? leavesBlossomMat : leavesLushMat,
          );
          canopy.position.y = 0.84;
          canopy.castShadow = true;
          vp.cropRoot.add(trunk, canopy);
          const fruitMat = p.crop === 'goldenSapling' ? appleGoldMat : appleRedMat;
          const offsets: [number, number, number][] = [
            [-0.36, 0.72, 0.28],
            [0.36, 0.74, -0.22],
            [0.1, 0.68, 0.38],
          ];
          for (const [fx, fy, fz] of offsets) {
            const f = new THREE.Mesh(miniFruitGeo, fruitMat);
            f.position.set(fx, fy, fz);
            vp.cropRoot.add(f);
          }
        }
      }
    });
  };

  // Wooden Orchard Split-Rail Fence framing the south front & nursery garden
  const buildFenceSegment = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const steps = Math.max(1, Math.round(Math.hypot(dx, dz) / 1.5));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const fx = x1 + dx * t;
      const fz = z1 + dz * t;
      const fy = computeOrchardElevation(fx, fz);
      const post = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.24, 1.05, 0.24)),
        oakPlankMat,
      );
      post.position.set(fx, fy + 0.525, fz);
      post.castShadow = true;
      group.add(post);

      if (i < steps) {
        const nx = x1 + dx * ((i + 1) / steps);
        const nz = z1 + dz * ((i + 1) / steps);
        const ny = computeOrchardElevation(nx, nz);
        const segLen = Math.hypot(nx - fx, nz - fz);
        const angle = Math.atan2(nx - fx, nz - fz);
        for (const ry of [0.38, 0.78]) {
          const rail = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(0.1, 0.14, segLen)),
            oakPlankMat,
          );
          rail.position.set((fx + nx) * 0.5, (fy + ny) * 0.5 + ry, (fz + nz) * 0.5);
          rail.rotation.y = angle;
          group.add(rail);
        }
      }
    }
  };
  buildFenceSegment(-12, 11.2, -3.2, 11.2);
  buildFenceSegment(3.2, 11.2, 8.2, 11.2);
  buildFenceSegment(-12, 11.2, -12, 2.5);

  // =========================================================================
  // 9. WILDFLOWERS & TALL GRASS TUFTS (Scattered Botanical Details)
  // =========================================================================
  const flowerMats = [
    trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.wildflowerRed,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.85,
      }),
    ),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.wildflowerYellow,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.85,
      }),
    ),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.wildflowerBlue,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.85,
      }),
    ),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.grassTuft,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.9,
      }),
    ),
  ];

  const flowersGroup = new THREE.Group();
  const plantGeo = trackGeo(new THREE.PlaneGeometry(0.68, 0.68));
  for (let i = 0; i < 165; i++) {
    const angle = i * 2.39996;
    const dist = 3.2 + (i % 24) * 1.02;
    const fx = Math.cos(angle) * dist;
    const fz = Math.sin(angle) * dist;
    const ix = Math.round(fx);
    const iz = Math.round(fz);
    if (isOnDirtPath(ix, iz) || isNurserySoil(ix, iz)) continue;
    if (ix < -4 && ix > -13 && iz < -3 && iz > -11) continue; // skip cottage footprint
    if (ix < -15 && ix > -21 && iz < -15 && iz > -21) continue; // skip windmill base
    const fy = computeOrchardElevation(ix, iz);
    if (fy < 0) continue;

    const mat = flowerMats[i % flowerMats.length];
    const tuft = new THREE.Group();
    tuft.position.set(fx, fy + 0.32, fz);
    const a = new THREE.Mesh(plantGeo, mat);
    a.rotation.y = Math.PI / 4;
    const b = new THREE.Mesh(plantGeo, mat);
    b.rotation.y = -Math.PI / 4;
    tuft.add(a, b);
    flowersGroup.add(tuft);
  }
  group.add(flowersGroup);

  // =========================================================================
  // 10. LIVING MINECRAFT DETAILS: BLOCKY CLOUDS, DISTANT HOT-AIR BALLOON,
  //     VOXEL BEES, BLOSSOM PETALS, STARRY NIGHT SKY, FIREFLIES & 3D WEATHER
  // =========================================================================
  // Fluffy Minecraft Blocky Clouds
  const cloudsGroup = new THREE.Group();
  const cloudMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      transparent: true,
      opacity: 0.88,
    }),
  );
  const cloudConfigs: [number, number, number, number, number][] = [
    [-26, 23, -30, 10, 5],
    [8, 25, -34, 13, 6],
    [32, 22, -10, 9, 5],
    [-30, 24, 10, 11, 5],
    [18, 26, 26, 12, 5],
    [-4, 24, 32, 9, 4],
    [0, 25, -6, 10, 5],
    [-16, 23, 20, 8, 4],
  ];
  for (const [cx, cy, cz, cw, cd] of cloudConfigs) {
    const cg = new THREE.Group();
    cg.position.set(cx, cy, cz);
    const main = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(cw, 1.4, cd)), cloudMat);
    const puff = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(cw * 0.65, 1.1, cd * 0.72)),
      cloudMat,
    );
    puff.position.set(cw * 0.14, 0.9, 0.4);
    cg.add(main, puff);
    cloudsGroup.add(cg);
  }
  group.add(cloudsGroup);

  // Live 3D Weather Precipitation (Rain & Snow InstancedMeshes)
  let currentWeather: WeatherKind = 'clear';
  const RAIN_COUNT = 240;
  const rainGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.72, 0.05));
  const rainMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xaad8ff,
      transparent: true,
      opacity: 0.62,
    }),
  );
  const rainInst = new THREE.InstancedMesh(rainGeo, rainMat, RAIN_COUNT);
  rainInst.frustumCulled = false;
  rainInst.visible = false;
  const rainDrops: { x: number; y: number; z: number; speed: number }[] = [];
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainDrops.push({
      x: (Math.random() - 0.5) * 56,
      y: Math.random() * 24,
      z: (Math.random() - 0.5) * 56,
      speed: 17 + Math.random() * 6,
    });
  }
  group.add(rainInst);

  const SNOW_COUNT = 200;
  const snowGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.14, 0.14));
  const snowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf7fbff,
      transparent: true,
      opacity: 0.88,
    }),
  );
  const snowInst = new THREE.InstancedMesh(snowGeo, snowMat, SNOW_COUNT);
  snowInst.frustumCulled = false;
  snowInst.visible = false;
  const snowFlakes: { x: number; y: number; z: number; speed: number; phase: number }[] = [];
  for (let i = 0; i < SNOW_COUNT; i++) {
    snowFlakes.push({
      x: (Math.random() - 0.5) * 56,
      y: Math.random() * 22,
      z: (Math.random() - 0.5) * 56,
      speed: 2.2 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
    });
  }
  group.add(snowInst);

  let currentSeason: Season = 'spring';

  const setWeather = (weather: WeatherKind) => {
    currentWeather = weather;
    rainInst.visible = weather === 'rain' || weather === 'storm';
    snowInst.visible = weather === 'snow' || (currentSeason === 'winter' && !rainInst.visible);
    if (weather === 'storm') {
      cloudMat.color.setHex(0x8c99ad);
      cloudMat.opacity = 0.96;
    } else if (weather === 'rain') {
      cloudMat.color.setHex(0xb8c5d6);
      cloudMat.opacity = 0.94;
    } else if (weather === 'cloudy') {
      cloudMat.color.setHex(0xe8eef5);
      cloudMat.opacity = 0.92;
    } else if (weather === 'snow') {
      cloudMat.color.setHex(0xf2f7ff);
      cloudMat.opacity = 0.9;
    } else {
      cloudMat.color.setHex(0xffffff);
      cloudMat.opacity = 0.85;
    }
  };

  const setSeason = (season: Season) => {
    currentSeason = season;
    textures.setSeason(season);

    if (season === 'winter') {
      skirtMat.color.setHex(0xdce9f5);
      waterMat.color.setHex(0xd6f0ff);
      waterMat.roughness = 0.08;
      waterMat.opacity = 0.9;
      winterSnowCaps.visible = true;
      cottageRoofSnowGroup.visible = true;
      flowersGroup.visible = false;
    } else if (season === 'autumn') {
      skirtMat.color.setHex(0xb08f42);
      waterMat.color.setHex(0xffffff);
      waterMat.roughness = 0.14;
      waterMat.opacity = 0.84;
      winterSnowCaps.visible = false;
      cottageRoofSnowGroup.visible = false;
      flowersGroup.visible = true;
      petalMat.color.setHex(0xe88a34);
    } else if (season === 'summer') {
      skirtMat.color.setHex(0x4c9538);
      waterMat.color.setHex(0xffffff);
      waterMat.roughness = 0.14;
      waterMat.opacity = 0.84;
      winterSnowCaps.visible = false;
      cottageRoofSnowGroup.visible = false;
      flowersGroup.visible = true;
      petalMat.color.setHex(0xe6f7c6);
    } else {
      skirtMat.color.setHex(0x62a847);
      waterMat.color.setHex(0xffffff);
      waterMat.roughness = 0.14;
      waterMat.opacity = 0.84;
      winterSnowCaps.visible = false;
      cottageRoofSnowGroup.visible = false;
      flowersGroup.visible = true;
      petalMat.color.setHex(0xffd6e6);
    }

    snowInst.visible = currentWeather === 'snow' || (season === 'winter' && !rainInst.visible);
  };

  // Whimsical Distant Hot-Air Balloon (Heartwarming Easter Egg from Apple-chan's Promotion Record!)
  const balloonGroup = new THREE.Group();
  balloonGroup.position.set(28, 17, -28);
  const balloonRedMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe35d52, roughness: 0.65 }));
  const balloonCreamMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfff2d6, roughness: 0.7 }));
  const balloonGreenMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x8cc279, roughness: 0.68 }));
  const bLower = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 1.4, 2.4)), balloonCreamMat);
  bLower.position.y = 1.6;
  const bMid = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.6, 2.2, 3.6)), balloonRedMat);
  bMid.position.y = 3.2;
  const bTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 1.2, 2.6)), balloonGreenMat);
  bTop.position.y = 4.8;
  const bBasket = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.9, 1.1)), oakPlankMat);
  bBasket.position.y = -0.2;
  const bRope1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 1.2, 0.08)), hayMat);
  bRope1.position.set(-0.45, 0.6, -0.45);
  const bRope2 = bRope1.clone();
  bRope2.position.set(0.45, 0.6, 0.45);
  balloonGroup.add(bLower, bMid, bTop, bBasket, bRope1, bRope2);
  group.add(balloonGroup);

  // Cute Blocky Minecraft Bees buzzing around the orchard blossoms
  const beeYellowMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf4c73b, roughness: 0.6 }));
  const beeStripeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.75 }));
  const beeWingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xeaf7ff,
      transparent: true,
      opacity: 0.72,
      roughness: 0.2,
    }),
  );

  const beeSpots: [number, number, number][] = [
    [1.8, 3.4, -1.2],
    [-4.8, 2.8, 4.2],
    [7.8, 1.8, 5.2],
    [4.8, 3.1, -4.6],
  ];
  beeSpots.forEach(([bx, by, bz], idx) => {
    const bg = new THREE.Group();
    const bBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.2, 0.3)), beeYellowMat);
    const bStripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.23, 0.21, 0.08)), beeStripeMat);
    bStripe.position.z = -0.04;
    const bTail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.23, 0.21, 0.07)), beeStripeMat);
    bTail.position.z = -0.13;
    const wingGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.02, 0.14));
    const wingL = new THREE.Mesh(wingGeo, beeWingMat);
    wingL.position.set(-0.14, 0.12, 0);
    const wingR = new THREE.Mesh(wingGeo, beeWingMat);
    wingR.position.set(0.14, 0.12, 0);
    bg.add(bBody, bStripe, bTail, wingL, wingR);
    group.add(bg);
    bees.push({
      group: bg,
      wingL,
      wingR,
      centerX: bx,
      centerY: by,
      centerZ: bz,
      radius: 1.3 + idx * 0.35,
      speed: 0.9 + idx * 0.22,
      phase: idx * 1.7,
    });
  });

  // Drifting Pink-White Apple Blossom Petals
  const petalGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.03, 0.11));
  const petalMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffd6e6, roughness: 0.5 }),
  );
  for (let i = 0; i < 36; i++) {
    const m = new THREE.Mesh(petalGeo, petalMat);
    const px = (Math.sin(i * 12.7) * 14);
    const pz = (Math.cos(i * 8.3) * 14);
    const py = 1.5 + (i % 7) * 1.1;
    m.position.set(px, py, pz);
    group.add(m);
    petals.push({
      mesh: m,
      baseX: px,
      baseZ: pz,
      phase: i * 0.7,
      speed: 0.7 + (i % 5) * 0.16,
      fallSpeed: 0.32 + (i % 4) * 0.1,
    });
  }

  // Twinkling Voxel Stars (visible in Starry Night mode)
  const starsGroup = new THREE.Group();
  const starGeo = trackGeo(new THREE.BoxGeometry(0.45, 0.45, 0.45));
  const starMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xfff8d6, transparent: true, opacity: 0 }),
  );
  const starInst = new THREE.InstancedMesh(starGeo, starMat, 120);
  for (let i = 0; i < 120; i++) {
    const theta = (i * 2.39996) % (Math.PI * 2);
    const phi = 0.2 + ((i * 19) % 100) / 100 * 0.95;
    const r = 68;
    _dummy.position.set(
      Math.cos(theta) * Math.sin(phi) * r,
      Math.cos(phi) * r + 14,
      Math.sin(theta) * Math.sin(phi) * r,
    );
    const s = 0.65 + (i % 4) * 0.28;
    _dummy.scale.set(s, s, s);
    _dummy.updateMatrix();
    starInst.setMatrixAt(i, _dummy.matrix);
  }
  starInst.instanceMatrix.needsUpdate = true;
  starInst.computeBoundingSphere();
  starsGroup.add(starInst);
  group.add(starsGroup);

  // Warm Golden Orchard Fireflies (visible at Dusk / Starry Night)
  const firefliesGroup = new THREE.Group();
  const fireflyGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.12, 0.12));
  const fireflyMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xffe478, transparent: true, opacity: 0 }),
  );
  const fireflyMeshes: { mesh: THREE.Mesh; bx: number; by: number; bz: number; phase: number }[] = [];
  for (let i = 0; i < 28; i++) {
    const m = new THREE.Mesh(fireflyGeo, fireflyMat);
    const bx = Math.sin(i * 5.3) * 12;
    const bz = Math.cos(i * 4.1) * 12;
    const by = 1.2 + (i % 5) * 0.7;
    m.position.set(bx, by, bz);
    firefliesGroup.add(m);
    fireflyMeshes.push({ mesh: m, bx, by, bz, phase: i * 1.1 });
  }
  group.add(firefliesGroup);

  // =========================================================================
  // 11. DYNAMIC INTERACTION PARTICLES (Hearts, Falling Apples, Water Drops, Smoke)
  // =========================================================================
  const heartGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.22, 0.08));
  const heartMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xf47a88 }),
  );
  const dropAppleGeo = trackGeo(new THREE.BoxGeometry(0.3, 0.32, 0.3));
  const waterDropGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.11, 0.11));
  const waterDropMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x6fd0ff }));
  const smokeGeo = trackGeo(new THREE.BoxGeometry(0.45, 0.45, 0.45));
  const smokeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf0eee9,
      transparent: true,
      opacity: 0.55,
      roughness: 1,
    }),
  );

  const spawnHeartBurst = (origin: THREE.Vector3) => {
    for (let i = 0; i < 8; i++) {
      const heart = new THREE.Mesh(heartGeo, heartMat);
      heart.position.set(
        origin.x + (Math.random() - 0.5) * 1.4,
        origin.y + 0.4 + Math.random() * 0.8,
        origin.z + (Math.random() - 0.5) * 1.4,
      );
      group.add(heart);
      particles.push({
        mesh: heart,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.7,
          1.1 + Math.random() * 0.9,
          (Math.random() - 0.5) * 0.7,
        ),
        life: 0,
        maxLife: 1.7 + Math.random() * 0.5,
        spin: (Math.random() - 0.5) * 3,
        gravity: -0.1,
        kind: 'heart',
      });
    }
  };

  // =========================================================================
  // 11B. PLAYABLE GAME ELEMENTS: COLLECTIBLE APPLES & HARVEST RUSH BEACONS
  // =========================================================================
  const dropStemGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.12, 0.06));
  const dropLeafGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.06, 0.08));
  const goldHaloGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.46, 0.46));
  const goldHaloMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffe46b,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );

  // Reachable orchard & hillside trees eligible for Golden Harvest Rush beacons
  const rushCandidateIndices: number[] = [];
  for (let i = 0; i < trees.length; i++) {
    const t = trees[i];
    if (Math.abs(t.baseX) <= 18.0 && Math.abs(t.baseZ) <= 18.0) {
      rushCandidateIndices.push(i);
    }
  }

  let rushActive = false;
  const activeBonusTreeIndices = new Set<number>();
  const beaconStarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffd74a,
      emissive: new THREE.Color(0xffb422),
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.35,
    }),
  );
  const beaconRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffe875,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  const beaconGroup = new THREE.Group();
  const beaconMeshes: { treeIdx: number; marker: THREE.Group }[] = [];
  group.add(beaconGroup);

  const buildBeaconMarker = (): THREE.Group => {
    const m = new THREE.Group();
    const core = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.58, 0.58, 0.58)),
      beaconStarMat,
    );
    core.rotation.set(Math.PI / 4, Math.PI / 4, 0);
    const bar1 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.05, 0.2, 0.2)),
      beaconStarMat,
    );
    const bar2 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.2, 1.05, 0.2)),
      beaconStarMat,
    );
    const ring = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.95, 1.28, 16)).rotateX(-Math.PI / 2),
      beaconRingMat,
    );
    ring.position.y = -4.2;
    m.add(core, bar1, bar2, ring);
    return m;
  };

  const refreshRushBeacons = (excludeIdx = -1) => {
    while (beaconMeshes.length > 0) {
      const removed = beaconMeshes.pop();
      if (removed) beaconGroup.remove(removed.marker);
    }
    activeBonusTreeIndices.clear();
    if (!rushActive || rushCandidateIndices.length === 0) return;

    const pool = rushCandidateIndices.filter((idx) => idx !== excludeIdx);
    const count = Math.min(3, pool.length);
    for (let i = 0; i < count; i++) {
      const pickPos = Math.floor(Math.random() * pool.length);
      const treeIdx = pool.splice(pickPos, 1)[0];
      activeBonusTreeIndices.add(treeIdx);
      const t = trees[treeIdx];
      const marker = buildBeaconMarker();
      marker.position.set(t.baseX, t.group.position.y + 6.8, t.baseZ);
      beaconGroup.add(marker);
      beaconMeshes.push({ treeIdx, marker });
    }
  };

  const spawnCollectibleApple = (
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    golden: boolean,
  ) => {
    // Cap max active dropped apples for smooth frame pacing
    if (collectibles.length >= 36) {
      const oldest = collectibles.shift();
      if (oldest) group.remove(oldest.group);
    }
    const aGroup = new THREE.Group();
    const fruit = new THREE.Mesh(dropAppleGeo, golden ? appleGoldMat : appleRedMat);
    fruit.castShadow = true;
    const stem = new THREE.Mesh(dropStemGeo, darkOakMat);
    stem.position.y = 0.2;
    const leaf = new THREE.Mesh(dropLeafGeo, leavesLushMat);
    leaf.position.set(0.08, 0.22, 0);
    aGroup.add(fruit, stem, leaf);
    if (golden) {
      const halo = new THREE.Mesh(goldHaloGeo, goldHaloMat);
      aGroup.add(halo);
    }
    aGroup.position.set(x, y, z);
    group.add(aGroup);
    collectibles.push({
      group: aGroup,
      vel: new THREE.Vector3(vx, vy, vz),
      age: 0,
      maxAge: rushActive ? 22 : 28,
      golden,
      grounded: false,
      phase: Math.random() * Math.PI * 2,
    });
  };

  const spawnStarterApples = () => {
    const spots: [number, number, boolean][] = [
      [-1.8, 3.6, false],
      [1.8, 2.2, true],
      [-3.5, 0.8, false],
      [2.8, -1.8, false],
      [4.5, 3.2, true],
    ];
    for (const [sx, sz, gold] of spots) {
      spawnCollectibleApple(
        sx,
        groundHeightAt(sx, sz) + 1.4,
        sz,
        (Math.random() - 0.5) * 0.4,
        1.2,
        (Math.random() - 0.5) * 0.4,
        gold,
      );
    }
  };

  const setRushActive = (active: boolean) => {
    rushActive = active;
    if (active) {
      refreshRushBeacons();
      spawnStarterApples();
    } else {
      refreshRushBeacons();
    }
  };

  let magnetBonus = false;
  const setMagnetBonus = (enabled: boolean) => {
    magnetBonus = enabled;
  };

  const checkCollectibles = (
    charPos: THREE.Vector3,
    dt: number,
  ): { red: number; golden: number } => {
    let red = 0;
    let golden = 0;
    const clampedDt = Math.min(dt, 0.05);
    const magnetRangeSq = magnetBonus ? 12.2 : 5.2;
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      const dx = charPos.x - c.group.position.x;
      const dz = charPos.z - c.group.position.z;
      const distSq = dx * dx + dz * dz;
      // Gentle Minecraft-style item magnet pull when Apple-chan walks nearby!
      if (c.age > 0.35 && distSq < magnetRangeSq) {
        const dist = Math.sqrt(distSq) || 0.001;
        if (dist < 0.95) {
          if (c.golden) golden++;
          else red++;
          group.remove(c.group);
          collectibles.splice(i, 1);
          continue;
        }
        const pull = (magnetBonus ? 11.5 : 8.5) * clampedDt;
        c.group.position.x += (dx / dist) * pull;
        c.group.position.z += (dz / dist) * pull;
        c.group.position.y = THREE.MathUtils.lerp(
          c.group.position.y,
          charPos.y + 0.65,
          10 * clampedDt,
        );
      }
    }
    return { red, golden };
  };

  const getNearestTree = (x: number, z: number, maxDist: number): number | null => {
    let bestIdx: number | null = null;
    let bestDistSq = maxDist * maxDist;
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      const dx = t.baseX - x;
      const dz = t.baseZ - z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  const isNearNursery = (x: number, z: number): boolean => {
    const dx = x - 8.0;
    const dz = z - 5.5;
    return dx * dx + dz * dz < 11.5;
  };

  const isNearShippingBin = (x: number, z: number): boolean => {
    const dx = x - -4.6;
    const dz = z - -2.9;
    return dx * dx + dz * dz < 6.5;
  };

  const isNearShopStall = (x: number, z: number): boolean => {
    const dx = x - 4.5;
    const dz = z - 7.4;
    return dx * dx + dz * dz < 7.5;
  };

  const isNearCottageDoor = (x: number, z: number): boolean => {
    const dx = x - -8.5;
    const dz = z - -4.3;
    return dx * dx + dz * dz < 4.5;
  };

  const isInsideCottage = (x: number, z: number): boolean => {
    return x > -11.9 && x < -5.1 && z > -10.1 && z < -4.35;
  };

  const isNearCraftingTable = (x: number, z: number): boolean => {
    const dx = x - -10.55;
    const dz = z - -8.85;
    return dx * dx + dz * dz < 4.2;
  };

  const isNearCottageBed = (x: number, z: number): boolean => {
    const dx = x - -6.65;
    const dz = z - -8.75;
    return dx * dx + dz * dz < 4.6;
  };

  const isNearCottageChest = (x: number, z: number): boolean => {
    const dx = x - -10.55;
    const dz = z - -6.75;
    return dx * dx + dz * dz < 3.8;
  };

  const updateCottageInterior = (charPos: THREE.Vector3, dt: number): void => {
    const inside = isInsideCottage(charPos.x, charPos.z);
    const nearDoor = isNearCottageDoor(charPos.x, charPos.z) || inside;
    const targetDoorAngle = nearDoor ? -1.48 : 0;
    cottageDoorAngle = THREE.MathUtils.damp(cottageDoorAngle, targetDoorAngle, 7.5, Math.min(dt, 0.05));
    cottageDoorPivot.rotation.y = cottageDoorAngle;

    // Smooth cutaway: hide pitched cottage roof while Apple-chan is inside so Crafting Table, Bed & Chest are crystal-clear!
    cottageRoofGroup.visible = !inside;
    if (cottageInteriorLight) {
      cottageInteriorLight.intensity = THREE.MathUtils.damp(
        cottageInteriorLight.intensity,
        inside ? 2.6 : 1.1,
        6,
        Math.min(dt, 0.05),
      );
    }
  };

  const triggerTreeShake = (
    treeIndex: number,
    worldPos: THREE.Vector3,
    extraDrop = false,
  ): { dropped: number; isBonus: boolean } => {
    const t = trees[treeIndex];
    if (!t) return { dropped: 0, isBonus: false };
    t.shakeAmount = 1.0;
    spawnHeartBurst(worldPos);

    const isBonus = rushActive && activeBonusTreeIndices.has(treeIndex);
    const droppedCount = (isBonus ? 5 : 3) + (extraDrop ? 1 : 0);

    for (let i = 0; i < droppedCount; i++) {
      const isGolden = isBonus ? i < 2 : Math.random() > 0.78;
      const angle = (i / droppedCount) * Math.PI * 2 + Math.random() * 0.6;
      const spawnX = t.baseX + Math.cos(angle) * 1.35;
      const spawnZ = t.baseZ + Math.sin(angle) * 1.35;
      spawnCollectibleApple(
        spawnX,
        t.group.position.y + 3.0,
        spawnZ,
        Math.cos(angle) * (1.3 + Math.random() * 0.6),
        1.8 + Math.random() * 0.9,
        Math.sin(angle) * (1.3 + Math.random() * 0.6),
        isGolden,
      );
    }

    if (isBonus) {
      // Immediately rotate the golden beacons so the player dashes to the next ripe tree!
      refreshRushBeacons(treeIndex);
    }
    return { dropped: droppedCount, isBonus };
  };

  const triggerWaterNursery = (worldPos: THREE.Vector3) => {
    for (let i = 0; i < 16; i++) {
      const drop = new THREE.Mesh(waterDropGeo, waterDropMat);
      drop.position.set(
        worldPos.x + (Math.random() - 0.5) * 1.6,
        worldPos.y + 0.5 + Math.random() * 0.5,
        worldPos.z + (Math.random() - 0.5) * 1.6,
      );
      group.add(drop);
      particles.push({
        mesh: drop,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.2,
          0.6 + Math.random() * 0.8,
          (Math.random() - 0.5) * 1.2,
        ),
        life: 0,
        maxLife: 1.0 + Math.random() * 0.3,
        spin: 2,
        gravity: 5.5,
        kind: 'water',
      });
    }
  };

  let smokeTimer = 0;

  const update = (dt: number, elapsed: number, nightFactor: number) => {
    const clampedDt = Math.min(dt, 0.05);

    // Scroll brook water texture gently downstream
    textures.water.offset.y -= clampedDt * 0.18;
    textures.water.offset.x += clampedDt * 0.04;

    // Gentle orchard breeze + tree-hug canopy shaking
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      const breeze = Math.sin(elapsed * 1.3 + i * 0.9) * 0.014;
      if (t.shakeAmount > 0.001) {
        t.shakeAmount = THREE.MathUtils.damp(t.shakeAmount, 0, 4.2, clampedDt);
        const shake = Math.sin(elapsed * 32) * 0.095 * t.shakeAmount;
        t.canopyGroup.rotation.z = breeze + shake;
        t.canopyGroup.rotation.x = Math.cos(elapsed * 26) * 0.055 * t.shakeAmount;
      } else {
        t.canopyGroup.rotation.z = breeze;
        t.canopyGroup.rotation.x = 0;
      }
    }

    // Drift Minecraft clouds lazily across the sky (faster in stormy weather)
    const cloudSpeedMult = currentWeather === 'storm' ? 2.4 : currentWeather === 'rain' ? 1.6 : 1.0;
    cloudsGroup.children.forEach((cloud, idx) => {
      cloud.position.x += clampedDt * (0.35 + (idx % 3) * 0.12) * cloudSpeedMult;
      if (cloud.position.x > 58) cloud.position.x = -58;
    });

    // Spin hilltop windmill sails gently in the orchard breeze!
    const windSpeed = currentWeather === 'storm' ? 2.4 : currentWeather === 'rain' ? 1.5 : 0.85;
    windmillBladesPivot.rotation.z -= clampedDt * windSpeed;

    // Flicker SW Campfire flames warmly
    const flamePulse = 0.88 + Math.sin(elapsed * 14) * 0.14 + Math.cos(elapsed * 23) * 0.08;
    campfireFlame.scale.set(1, flamePulse, 1);

    // Animate 3D Raindrops & Snowflakes when weather is active
    if (rainInst.visible) {
      const stormMult = currentWeather === 'storm' ? 1.35 : 1.0;
      for (let i = 0; i < RAIN_COUNT; i++) {
        const d = rainDrops[i];
        d.y -= d.speed * stormMult * clampedDt;
        d.x += (currentWeather === 'storm' ? 3.2 : 1.4) * clampedDt;
        if (d.y < 0) {
          d.y = 20 + Math.random() * 6;
          d.x = (Math.random() - 0.5) * 56;
          d.z = (Math.random() - 0.5) * 56;
        }
        _dummy.position.set(d.x, d.y, d.z);
        _dummy.rotation.set(0, 0, currentWeather === 'storm' ? 0.18 : 0.08);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        rainInst.setMatrixAt(i, _dummy.matrix);
      }
      rainInst.instanceMatrix.needsUpdate = true;
    }

    if (snowInst.visible) {
      for (let i = 0; i < SNOW_COUNT; i++) {
        const f = snowFlakes[i];
        f.y -= f.speed * clampedDt;
        const sx = f.x + Math.sin(elapsed * 1.4 + f.phase) * 0.9;
        const sz = f.z + Math.cos(elapsed * 1.1 + f.phase) * 0.9;
        if (f.y < 0) {
          f.y = 19 + Math.random() * 5;
          f.x = (Math.random() - 0.5) * 56;
          f.z = (Math.random() - 0.5) * 56;
        }
        _dummy.position.set(sx, f.y, sz);
        _dummy.rotation.set(elapsed * 0.8 + f.phase, elapsed * 0.6, 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        snowInst.setMatrixAt(i, _dummy.matrix);
      }
      snowInst.instanceMatrix.needsUpdate = true;
    }

    // Gentle bobbing & slow drift of the distant Hot-Air Balloon
    balloonGroup.position.y = 17.2 + Math.sin(elapsed * 0.55) * 1.1;
    balloonGroup.rotation.y = Math.sin(elapsed * 0.25) * 0.25;

    // Buzzing Minecraft bees (hide during rain/storm/snow or winter)
    const fairWeather = currentWeather === 'clear' || currentWeather === 'cloudy';
    const activeWarmSeason = fairWeather && currentSeason !== 'winter';
    for (const bee of bees) {
      bee.group.visible = activeWarmSeason;
      if (!activeWarmSeason) continue;
      const a = elapsed * bee.speed + bee.phase;
      const nx = bee.centerX + Math.cos(a) * bee.radius;
      const nz = bee.centerZ + Math.sin(a * 1.3) * bee.radius * 0.8;
      const ny = bee.centerY + Math.sin(a * 2.4) * 0.35;
      const dx = nx - bee.group.position.x;
      const dz = nz - bee.group.position.z;
      bee.group.position.set(nx, ny, nz);
      bee.group.rotation.y = Math.atan2(dx, dz);
      const flap = Math.sin(elapsed * 42 + bee.phase) * 0.55;
      bee.wingL.rotation.z = flap;
      bee.wingR.rotation.z = -flap;
    }

    // Drifting seasonal petals/leaves (hide in rain/storm/snow/winter)
    for (const p of petals) {
      p.mesh.visible = activeWarmSeason;
      if (!activeWarmSeason) continue;
      p.mesh.position.y -= p.fallSpeed * clampedDt;
      p.mesh.position.x = p.baseX + Math.sin(elapsed * p.speed + p.phase) * 1.2;
      p.mesh.position.z = p.baseZ + Math.cos(elapsed * p.speed * 0.8 + p.phase) * 0.9;
      p.mesh.rotation.y += clampedDt * 1.4;
      p.mesh.rotation.z = Math.sin(elapsed * 2 + p.phase) * 0.6;
      if (p.mesh.position.y < 0.2) {
        p.mesh.position.y = 6.8 + (p.phase % 2.4);
      }
    }

    // Chimney cozy smoke puffs
    smokeTimer -= clampedDt;
    if (smokeTimer <= 0) {
      smokeTimer = 0.85;
      const sMesh = new THREE.Mesh(smokeGeo, smokeMat);
      sMesh.position.set(-10.6, 8.1, -8.4);
      group.add(sMesh);
      particles.push({
        mesh: sMesh,
        vel: new THREE.Vector3(0.22 + Math.random() * 0.15, 0.95, 0.08),
        life: 0,
        maxLife: 3.4,
        spin: 0.4,
        gravity: -0.05,
        kind: 'smoke',
      });
    }

    // Update dynamic interaction particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += clampedDt;
      if (p.life >= p.maxLife) {
        group.remove(p.mesh);
        particles.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * clampedDt;
      p.mesh.position.addScaledVector(p.vel, clampedDt);
      p.mesh.rotation.y += p.spin * clampedDt;

      if (p.kind === 'apple') {
        const gy = groundHeightAt(p.mesh.position.x, p.mesh.position.z) + 0.16;
        if (p.mesh.position.y < gy) {
          p.mesh.position.y = gy;
          p.vel.y = Math.abs(p.vel.y) * 0.32;
          p.vel.x *= 0.65;
          p.vel.z *= 0.65;
        }
        const fade = p.life > p.maxLife - 0.5 ? (p.maxLife - p.life) / 0.5 : 1;
        p.mesh.scale.setScalar(Math.max(0.01, fade));
      } else if (p.kind === 'heart') {
        const t = p.life / p.maxLife;
        p.mesh.scale.setScalar(Math.sin(t * Math.PI) * 1.15);
      } else if (p.kind === 'smoke') {
        const t = p.life / p.maxLife;
        p.mesh.scale.setScalar(0.5 + t * 1.5);
      }
    }

    // Animate Harvest Rush golden beacons
    for (let i = 0; i < beaconMeshes.length; i++) {
      const b = beaconMeshes[i];
      const t = trees[b.treeIdx];
      b.marker.position.y = t.group.position.y + 6.7 + Math.sin(elapsed * 3.4 + i) * 0.42;
      b.marker.rotation.y = elapsed * 2.1 + i;
    }

    // Animate physical collectible apples (bounce, settle, spin & bob on grass)
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      c.age += clampedDt;
      if (c.age >= c.maxAge) {
        group.remove(c.group);
        collectibles.splice(i, 1);
        continue;
      }
      c.group.rotation.y += (c.golden ? 3.2 : 2.1) * clampedDt;
      if (!c.grounded) {
        c.vel.y -= 10.5 * clampedDt;
        c.group.position.addScaledVector(c.vel, clampedDt);
        const gy = groundHeightAt(c.group.position.x, c.group.position.z) + 0.24;
        if (c.group.position.y <= gy) {
          c.group.position.y = gy;
          if (Math.abs(c.vel.y) > 1.2) {
            c.vel.y = Math.abs(c.vel.y) * 0.34;
            c.vel.x *= 0.55;
            c.vel.z *= 0.55;
          } else {
            c.grounded = true;
            c.vel.set(0, 0, 0);
          }
        }
      } else {
        const baseGy = groundHeightAt(c.group.position.x, c.group.position.z) + 0.28;
        c.group.position.y = baseGy + Math.sin(elapsed * 3.6 + c.phase) * 0.09;
      }
      // Gentle blink-shrink right before despawning
      if (c.age > c.maxAge - 2.0) {
        const remain = (c.maxAge - c.age) / 2.0;
        c.group.scale.setScalar(Math.max(0.05, remain));
      }
    }

    // Animate Shipping Bin lid pop when items are shipped
    if (shippingLidBounce > 0.005) {
      shippingLidBounce = THREE.MathUtils.damp(shippingLidBounce, 0, 5.5, clampedDt);
      shippingLidPivot.rotation.x = -Math.sin(shippingLidBounce * Math.PI) * 0.95;
    } else {
      shippingLidPivot.rotation.x = 0;
    }

    // Bobbing ripe-crop sparkles in the Stardew garden bed
    for (let i = 0; i < visualFarmPlots.length; i++) {
      const vp = visualFarmPlots[i];
      if (vp.ripeIndicator.visible) {
        vp.ripeIndicator.position.y = 1.42 + Math.sin(elapsed * 4.2 + i) * 0.12;
        vp.ripeIndicator.rotation.y = elapsed * 2.8 + i;
      }
    }

    // Starry sky & fireflies smooth visibility with nightFactor
    starMat.opacity = THREE.MathUtils.clamp((nightFactor - 0.25) * 1.35, 0, 0.95);
    starsGroup.visible = starMat.opacity > 0.02;
    starsGroup.rotation.y = elapsed * 0.008;

    fireflyMat.opacity = THREE.MathUtils.clamp((nightFactor - 0.15) * 1.25, 0, 0.92);
    firefliesGroup.visible = fireflyMat.opacity > 0.02;
    if (firefliesGroup.visible) {
      for (const f of fireflyMeshes) {
        f.mesh.position.x = f.bx + Math.sin(elapsed * 0.9 + f.phase) * 0.9;
        f.mesh.position.y = f.by + Math.sin(elapsed * 1.6 + f.phase * 1.4) * 0.45;
        f.mesh.position.z = f.bz + Math.cos(elapsed * 0.8 + f.phase) * 0.9;
        const pulse = 0.65 + Math.sin(elapsed * 3.4 + f.phase) * 0.35;
        f.mesh.scale.setScalar(pulse);
      }
    }
  };

  return {
    group,
    trees,
    clickables,
    lanternLights,
    windowGlowMat,
    lanternGlowMat,
    starsGroup,
    firefliesGroup,
    groundHeightAt,
    resolveWalkPosition,
    triggerTreeShake,
    triggerWaterNursery,
    triggerShippingBinBounce,
    syncFarmPlots,
    setMagnetBonus,
    setRushActive,
    spawnStarterApples,
    checkCollectibles,
    getNearestTree,
    isNearNursery,
    isNearShippingBin,
    isNearShopStall,
    isNearCottageDoor,
    isInsideCottage,
    isNearCraftingTable,
    isNearCottageBed,
    isNearCottageChest,
    updateCottageInterior,
    setSeason,
    setWeather,
    update,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

function buildVoxelLantern(
  ironMat: THREE.Material,
  glowMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const g = new THREE.Group();
  const chain = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.32, 0.06)), ironMat);
  chain.position.y = 0.32;
  const topCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.08, 0.32)), ironMat);
  topCap.position.y = 0.15;
  const core = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.28, 0.24)), glowMat);
  const bottomCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.08, 0.32)), ironMat);
  bottomCap.position.y = -0.15;
  g.add(chain, topCap, core, bottomCap);
  return g;
}
