import * as THREE from 'three';
import { AppleChanTreeTarget } from './appleChan';
import { OrchardTextureLibrary } from './textures';

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
  triggerTreeShake: (treeIndex: number, worldPos: THREE.Vector3) => number;
  triggerWaterNursery: (worldPos: THREE.Vector3) => void;
  update: (dt: number, elapsed: number, nightFactor: number) => void;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

/**
 * Deterministic terrain elevation (integer-snapped Minecraft voxel terraces)
 * with flat main orchard clearing, lowered brook channel, and rolling hills beyond.
 */
export function computeOrchardElevation(gx: number, gz: number): number {
  const ix = Math.round(gx);
  const iz = Math.round(gz);

  // Brook channel winding along the east/southeast side (x around 10..12)
  const brookCenter = 10.5 + Math.sin(iz * 0.22) * 1.8;
  if (Math.abs(ix - brookCenter) <= 1.35) {
    return -1;
  }

  // Central playable orchard plateau stays level at y = 0 for clean paths & cottage
  const distFromCenter = Math.hypot(ix, iz);
  if (distFromCenter < 13.5) {
    return 0;
  }

  // Rolling terraced hills surrounding the orchard perimeter so there is no floating void edge
  const edgeRamp = Math.max(0, (distFromCenter - 13.5) * 0.24);
  const hillWave =
    Math.sin(ix * 0.16) * Math.cos(iz * 0.15) * 2.1 +
    Math.sin((ix + iz) * 0.11) * 1.2;
  return Math.max(0, Math.round(edgeRamp + Math.max(0, hillWave)));
}

function isOnDirtPath(ix: number, iz: number): boolean {
  // Entrance south path leading to central Grand Tree & branching to Cottage + Brook Bridge
  if (Math.abs(ix) <= 1 && iz >= -4 && iz <= 13) return true;
  // Branch west to Cottage front porch (-8, -5)
  if (iz >= -4 && iz <= -2 && ix >= -9 && ix <= 1) return true;
  // Loop around Grand Mother Apple Tree at (0, -2)
  const distCenter = Math.hypot(ix - 0, iz + 2);
  if (distCenter >= 2.2 && distCenter <= 4.1) return true;
  // Branch east across footbridge to nursery & brook (z around 1..3)
  if (iz >= 1 && iz <= 2 && ix >= 0 && ix <= 14) return true;
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
  // 2. INSTANCED VOXEL TERRAIN + EXTENDED ROLLING HORIZON MEADOW
  // =========================================================================
  const radius = 21;
  const grassPositions: [number, number, number][] = [];
  const dirtPositions: [number, number, number][] = [];
  const pathPositions: [number, number, number][] = [];
  const farmlandPositions: [number, number, number][] = [];
  const brookWaterPositions: [number, number, number][] = [];

  for (let ix = -radius; ix <= radius; ix++) {
    for (let iz = -radius; iz <= radius; iz++) {
      const h = computeOrchardElevation(ix, iz);
      if (h === -1) {
        // Brook bed & water surface
        dirtPositions.push([ix, -1.5, iz]);
        brookWaterPositions.push([ix, -0.22, iz]);
      } else if (isNurserySoil(ix, iz) && h === 0) {
        farmlandPositions.push([ix, h - 0.52, iz]);
      } else if (isOnDirtPath(ix, iz) && h === 0) {
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

  // Extended distant rolling meadow skirt beyond the detailed voxel grid so horizon blends into fog naturally
  const skirtGeo = trackGeo(new THREE.PlaneGeometry(240, 240, 28, 28));
  skirtGeo.rotateX(-Math.PI / 2);
  const skirtPos = skirtGeo.attributes.position;
  for (let i = 0; i < skirtPos.count; i++) {
    const x = skirtPos.getX(i);
    const z = skirtPos.getZ(i);
    const dist = Math.hypot(x, z);
    if (dist < 22) {
      skirtPos.setY(i, -1.6);
    } else {
      const hills =
        Math.sin(x * 0.06) * Math.cos(z * 0.06) * 4.5 +
        Math.max(0, (dist - 22) * 0.07);
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

  // Helper to get exact walkable ground height (including bridge deck!)
  const groundHeightAt = (x: number, z: number): number => {
    // Arched oak footbridge over the brook around x in [8.5, 13.5], z in [0.4, 2.8]
    if (x >= 8.2 && x <= 13.8 && z >= 0.4 && z <= 2.8) {
      const t = (x - 8.2) / (13.8 - 8.2);
      return Math.sin(t * Math.PI) * 0.62 + 0.12;
    }
    const h = computeOrchardElevation(x, z);
    return Math.max(0, h);
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

  // Outer perimeter grove (natural tree framing so edges merge gently into horizon fog)
  const perimeterTrees: [number, number][] = [
    [-19, -16],
    [-13, -18],
    [-4, -18],
    [5, -18],
    [14, -17],
    [19, -11],
    [19, 1],
    [19, 13],
    [13, 18],
    [-12, 17],
    [-18, 12],
    [-19, 2],
  ];
  for (const [px, pz] of perimeterTrees) {
    createAppleTree(px, pz, {
      trunkHeight: 3 + ((Math.abs(px + pz) % 2)),
      blossom: (px + pz) % 3 === 0,
    });
  }

  // =========================================================================
  // 4. APPLE-CHAN'S COZY ORCHARD COTTAGE (Composite 12+ Part Voxel Structure)
  // =========================================================================
  const buildOrchardCottage = (cx: number, cz: number) => {
    const cottage = new THREE.Group();
    const gy = computeOrchardElevation(cx, cz);
    cottage.position.set(cx, gy, cz);

    // Cobblestone foundation (7w x 1h x 6d)
    const foundation = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7, 1, 6)),
      cobbleMat,
    );
    foundation.position.set(0, 0.5, 0);
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    cottage.add(foundation);

    // Cream plaster main walls (6.6w x 3.2h x 5.6d)
    const mainWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.6, 3.2, 5.6)),
      plasterMat,
    );
    mainWall.position.set(0, 2.6, 0);
    mainWall.castShadow = true;
    mainWall.receiveShadow = true;
    cottage.add(mainWall);

    // Four timber corner oak log pillars
    for (const sx of [-3.25, 3.25]) {
      for (const sz of [-2.75, 2.75]) {
        const post = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.62, 3.4, 0.62)),
          oakLogMats,
        );
        post.position.set(sx, 2.7, sz);
        post.castShadow = true;
        cottage.add(post);
      }
    }

    // Horizontal dark-oak timber framing beams
    const frontBeam = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7.1, 0.32, 0.35)),
      darkOakMat,
    );
    frontBeam.position.set(0, 4.2, 2.85);
    cottage.add(frontBeam);
    const backBeam = frontBeam.clone();
    backBeam.position.z = -2.85;
    cottage.add(backBeam);

    // Stepped Minecraft-style pitched terracotta gable roof
    for (let step = 0; step < 5; step++) {
      const spanZ = 7.2 - step * 1.25;
      const roofRow = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(7.8, 0.62, Math.max(1.1, spanZ))),
        roofMat,
      );
      roofRow.position.set(0, 4.45 + step * 0.56, 0);
      roofRow.castShadow = true;
      roofRow.receiveShadow = true;
      cottage.add(roofRow);
    }
    // Dark oak gable end fill triangles
    for (let step = 0; step < 4; step++) {
      const spanZ = 5.4 - step * 1.25;
      const gable = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(6.55, 0.58, Math.max(0.8, spanZ))),
        plasterMat,
      );
      gable.position.set(0, 4.4 + step * 0.56, 0);
      cottage.add(gable);
    }

    // Cozy oak door & timber porch awning facing +Z (toward the orchard path)
    const doorFrame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.36, 2.25, 0.2)),
      darkOakMat,
    );
    doorFrame.position.set(0, 2.12, 2.84);
    cottage.add(doorFrame);
    const door = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.04, 2.02, 0.24)),
      oakPlankMat,
    );
    door.position.set(0, 2.01, 2.86);
    cottage.add(door);
    const doorKnob = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.14, 0.12)),
      appleGoldMat,
    );
    doorKnob.position.set(0.32, 1.95, 2.98);
    cottage.add(doorKnob);

    // Front wooden porch steps & deck
    const porchDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.4, 0.5, 1.8)),
      oakPlankMat,
    );
    porchDeck.position.set(0, 0.25, 3.85);
    porchDeck.receiveShadow = true;
    cottage.add(porchDeck);

    // Porch posts + overhanging awning
    for (const px of [-1.5, 1.5]) {
      const pPost = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.28, 2.7, 0.28)),
        oakLogMats,
      );
      pPost.position.set(px, 1.85, 4.55);
      pPost.castShadow = true;
      cottage.add(pPost);
    }
    const porchRoof = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.8, 0.35, 2.1)),
      roofMat,
    );
    porchRoof.position.set(0, 3.3, 3.85);
    porchRoof.rotation.x = 0.16;
    porchRoof.castShadow = true;
    cottage.add(porchRoof);

    // Warm glowing paned windows + flower boxes
    const windowPositions: [number, number, number, number][] = [
      [-2.0, 2.55, 2.85, 0],
      [2.0, 2.55, 2.85, 0],
      [3.35, 2.55, 0.0, Math.PI / 2],
      [-3.35, 2.55, 0.0, Math.PI / 2],
    ];
    for (const [wx, wy, wz, ry] of windowPositions) {
      const win = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.15, 1.15, 0.16)),
        windowGlowMat,
      );
      win.position.set(wx, wy, wz);
      win.rotation.y = ry;
      cottage.add(win);

      // Flower box under window
      const sill = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.3, 0.28, 0.36)),
        darkOakMat,
      );
      sill.position.set(wx, wy - 0.72, wz + (ry === 0 ? 0.16 : 0));
      if (ry !== 0) sill.position.x += wx > 0 ? 0.16 : -0.16;
      sill.rotation.y = ry;
      cottage.add(sill);
    }

    // Cobblestone Chimney rising through the roof (emits cozy smoke puffs!)
    const chimney = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.1, 3.8, 1.1)),
      mossyCobbleMat,
    );
    chimney.position.set(-2.1, 5.8, -1.2);
    chimney.castShadow = true;
    cottage.add(chimney);
    const chimneyCap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.36, 0.26, 1.36)),
      cobbleMat,
    );
    chimneyCap.position.set(-2.1, 7.75, -1.2);
    cottage.add(chimneyCap);

    // Porch Lantern + PointLight
    const porchLantern = buildVoxelLantern(ironMat, lanternGlowMat, trackGeo);
    porchLantern.position.set(1.5, 2.7, 4.55);
    cottage.add(porchLantern);
    const pLight = new THREE.PointLight(0xffb552, 1.9, 13, 1.8);
    pLight.position.set(cx + 1.5, gy + 2.6, cz + 4.55);
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
    crate1.position.set(-2.6, 0.43, 3.6);
    crate1.castShadow = true;
    crate1.receiveShadow = true;
    cottage.add(crate1);

    const barrel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.92, 1.0, 0.92)),
      [barrelSideMat, barrelSideMat, oakPlankMat, oakPlankMat, barrelSideMat, barrelSideMat],
    );
    barrel.position.set(2.55, 0.5, 3.55);
    barrel.castShadow = true;
    cottage.add(barrel);

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
  // 8. SEEDLING NURSERY GARDEN (Interactive Growing Apple Saplings!)
  // =========================================================================
  const saplingMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.saplingSprite,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.85,
    }),
  );
  const crossPlane1 = trackGeo(new THREE.PlaneGeometry(0.95, 0.95));
  const crossPlane2 = trackGeo(new THREE.PlaneGeometry(0.95, 0.95));
  crossPlane2.rotateY(Math.PI / 2);

  for (let ix = 7; ix <= 9; ix++) {
    for (let iz = 4; iz <= 7; iz++) {
      if ((ix + iz) % 2 === 0) {
        const sap = new THREE.Group();
        sap.position.set(ix, 0, iz);
        const p1 = new THREE.Mesh(crossPlane1, saplingMat);
        p1.position.y = 0.45;
        p1.rotation.y = Math.PI / 4;
        const p2 = new THREE.Mesh(crossPlane2, saplingMat);
        p2.position.y = 0.45;
        p2.rotation.y = Math.PI / 4;
        sap.add(p1, p2);
        sap.scale.setScalar(0.85);
        group.add(sap);
        saplings.push(sap);
      }
    }
  }

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

  const plantGeo = trackGeo(new THREE.PlaneGeometry(0.68, 0.68));
  for (let i = 0; i < 88; i++) {
    const angle = i * 2.39996;
    const dist = 3.2 + (i % 15) * 0.95;
    const fx = Math.cos(angle) * dist;
    const fz = Math.sin(angle) * dist;
    const ix = Math.round(fx);
    const iz = Math.round(fz);
    if (isOnDirtPath(ix, iz) || isNurserySoil(ix, iz)) continue;
    if (ix < -4 && ix > -13 && iz < -3 && iz > -11) continue; // skip cottage footprint
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
    group.add(tuft);
  }

  // =========================================================================
  // 10. LIVING MINECRAFT DETAILS: BLOCKY CLOUDS, DISTANT HOT-AIR BALLOON,
  //     VOXEL BEES, BLOSSOM PETALS, STARRY NIGHT SKY & FIREFLIES
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
    [-22, 22, -26, 9, 5],
    [8, 24, -30, 12, 6],
    [28, 21, -10, 8, 5],
    [-26, 23, 8, 10, 4],
    [16, 25, 22, 11, 5],
    [-4, 23, 28, 8, 4],
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

  const triggerTreeShake = (treeIndex: number, worldPos: THREE.Vector3): number => {
    const t = trees[treeIndex];
    if (!t) return 0;
    t.shakeAmount = 1.0;
    spawnHeartBurst(worldPos);

    // Drop 3 fresh ripe apples from the shaking canopy!
    const droppedCount = 3;
    for (let i = 0; i < droppedCount; i++) {
      const aMesh = new THREE.Mesh(
        dropAppleGeo,
        Math.random() > 0.8 ? appleGoldMat : appleRedMat,
      );
      aMesh.castShadow = true;
      const angle = (i / droppedCount) * Math.PI * 2 + Math.random();
      aMesh.position.set(
        t.baseX + Math.cos(angle) * 1.4,
        t.group.position.y + 3.1,
        t.baseZ + Math.sin(angle) * 1.4,
      );
      group.add(aMesh);
      particles.push({
        mesh: aMesh,
        vel: new THREE.Vector3(
          Math.cos(angle) * 1.2,
          1.4 + Math.random() * 0.8,
          Math.sin(angle) * 1.2,
        ),
        life: 0,
        maxLife: 2.2,
        spin: 4.0,
        gravity: 9.8,
        kind: 'apple',
      });
    }
    return droppedCount;
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
    // Grow saplings joyfully!
    for (const sap of saplings) {
      const next = Math.min(1.45, sap.scale.x + 0.14);
      sap.scale.setScalar(next);
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

    // Drift Minecraft clouds lazily across the sky
    cloudsGroup.children.forEach((cloud, idx) => {
      cloud.position.x += clampedDt * (0.35 + (idx % 3) * 0.12);
      if (cloud.position.x > 46) cloud.position.x = -46;
    });

    // Gentle bobbing & slow drift of the distant Hot-Air Balloon
    balloonGroup.position.y = 17.2 + Math.sin(elapsed * 0.55) * 1.1;
    balloonGroup.rotation.y = Math.sin(elapsed * 0.25) * 0.25;

    // Buzzing Minecraft bees
    for (const bee of bees) {
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

    // Drifting blossom petals
    for (const p of petals) {
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
    triggerTreeShake,
    triggerWaterNursery,
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
