import * as THREE from 'three';
import { TRANSLATIONS } from '../i18n';
import { Language, Season } from './types';

/**
 * Seeded pseudo-random helper so procedural Minecraft pixel textures are
 * crisp, deterministic, and rich in hand-crafted variation.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbStr(r: number, g: number, b: number, a = 1): string {
  return a < 1
    ? `rgba(${clampByte(r)},${clampByte(g)},${clampByte(b)},${a})`
    : `rgb(${clampByte(r)},${clampByte(g)},${clampByte(b)})`;
}

export interface VoxelTexturePair {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

export interface OrchardTextureLibrary {
  grassTop: VoxelTexturePair;
  grassSide: VoxelTexturePair;
  dirt: VoxelTexturePair;
  dirtPathTop: VoxelTexturePair;
  dirtPathSide: VoxelTexturePair;
  farmlandTop: VoxelTexturePair;
  farmlandWetTop: VoxelTexturePair;
  cobblestone: VoxelTexturePair;
  mossyCobble: VoxelTexturePair;
  oakBark: VoxelTexturePair;
  oakLogTop: VoxelTexturePair;
  oakPlanks: VoxelTexturePair;
  darkOakPlanks: VoxelTexturePair;
  cottagePlaster: VoxelTexturePair;
  terracottaRoof: VoxelTexturePair;
  leavesLush: VoxelTexturePair;
  leavesBlossom: VoxelTexturePair;
  appleRed: VoxelTexturePair;
  appleGold: VoxelTexturePair;
  appleCrateTop: VoxelTexturePair;
  barrelSide: VoxelTexturePair;
  hayBale: VoxelTexturePair;
  craftingTableTop: VoxelTexturePair;
  craftingTableSide: VoxelTexturePair;
  windowPane: THREE.CanvasTexture;
  water: THREE.CanvasTexture;
  signBoard: THREE.CanvasTexture;
  shopSignBoard: THREE.CanvasTexture;
  setSignLanguage: (lang: Language) => void;
  setSeason: (season: Season) => void;
  lanternGlass: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  wildflowerRed: THREE.CanvasTexture;
  wildflowerYellow: THREE.CanvasTexture;
  wildflowerBlue: THREE.CanvasTexture;
  grassTuft: THREE.CanvasTexture;
  saplingSprite: THREE.CanvasTexture;
  // Apple-chan meta Minecraft OC character pixel textures
  acFaceNormal: THREE.CanvasTexture;
  acFaceBlink: THREE.CanvasTexture;
  acFaceHappy: THREE.CanvasTexture;
  acHeadSideLeft: THREE.CanvasTexture;
  acHeadSideRight: THREE.CanvasTexture;
  acHair: THREE.CanvasTexture;
  acHairTop: THREE.CanvasTexture;
  acHairOverlayFront: THREE.CanvasTexture;
  acHairOverlaySideLeft: THREE.CanvasTexture;
  acHairOverlaySideRight: THREE.CanvasTexture;
  acSkin: THREE.CanvasTexture;
  acShirtFront: THREE.CanvasTexture;
  acShirtBack: THREE.CanvasTexture;
  acShirtSleeve: THREE.CanvasTexture;
  acSkirtPleated: THREE.CanvasTexture;
  acStripedSock: THREE.CanvasTexture;
  acOverallsFront: THREE.CanvasTexture;
  acOverallsBack: THREE.CanvasTexture;
  acBeigeSleeve: THREE.CanvasTexture;
  acCheckeredBand: THREE.CanvasTexture;
  acClogShoe: THREE.CanvasTexture;
  acIdolFront: THREE.CanvasTexture;
  acIdolBack: THREE.CanvasTexture;
  acIdolSleeve: THREE.CanvasTexture;
  acIdolSkirt: THREE.CanvasTexture;
  acIdolStocking: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeat = false,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = anisotropy;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  tex.needsUpdate = true;
  return tex;
}

function finalizeDataTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeat = false,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = anisotropy;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  tex.needsUpdate = true;
  return tex;
}

function createVoxelPair(
  size: number,
  anisotropy: number,
  drawFn: (
    ctx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
    size: number,
  ) => void,
  repeat = false,
): VoxelTexturePair {
  const [cCanvas, cCtx] = makeCanvas(size, size);
  const [bCanvas, bCtx] = makeCanvas(size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);
  drawFn(cCtx, bCtx, size);
  return {
    map: finalizeColorTexture(cCanvas, anisotropy, repeat),
    bumpMap: finalizeDataTexture(bCanvas, anisotropy, repeat),
  };
}

function fillPixelNoise(
  ctx: CanvasRenderingContext2D,
  bCtx: CanvasRenderingContext2D,
  size: number,
  palette: string[],
  seed: number,
  bumpVariance = 40,
): void {
  const rand = mulberry32(seed);
  const rgbs = palette.map(hexToRgb);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = Math.floor(rand() * rgbs.length);
      const [r, g, b] = rgbs[idx];
      const jitter = (rand() - 0.5) * 14;
      ctx.fillStyle = rgbStr(r + jitter, g + jitter, b + jitter);
      ctx.fillRect(x, y, 1, 1);

      const bv = clampByte(128 + (rand() - 0.5) * bumpVariance * 2);
      bCtx.fillStyle = rgbStr(bv, bv, bv);
      bCtx.fillRect(x, y, 1, 1);
    }
  }
}

export function createOrchardTextures(
  renderer: THREE.WebGLRenderer,
): OrchardTextureLibrary {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const allTextures: THREE.Texture[] = [];

  const track = <T extends THREE.Texture>(t: T): T => {
    allTextures.push(t);
    return t;
  };
  const trackPair = (p: VoxelTexturePair): VoxelTexturePair => {
    allTextures.push(p.map, p.bumpMap);
    return p;
  };

  // 1. Dynamic Seasonal Grass Top (Spring meadow / Summer emerald / Autumn ochre / Winter snowy!)
  const [grassTopC, grassTopCtx] = makeCanvas(16, 16);
  const [grassTopBC, grassTopBCtx] = makeCanvas(16, 16);
  const grassTop: VoxelTexturePair = trackPair({
    map: finalizeColorTexture(grassTopC, aniso),
    bumpMap: finalizeDataTexture(grassTopBC, aniso),
  });

  const drawSeasonalGrassTop = (season: Season) => {
    const s = 16;
    grassTopBCtx.fillStyle = '#808080';
    grassTopBCtx.fillRect(0, 0, s, s);
    if (season === 'winter') {
      fillPixelNoise(
        grassTopCtx,
        grassTopBCtx,
        s,
        ['#EEF6FC', '#F7FBFE', '#E1EEF7', '#E7F2FA', '#F2F8FC'],
        101,
        24,
      );
      const rand = mulberry32(106);
      for (let i = 0; i < 16; i++) {
        const x = Math.floor(rand() * s);
        const y = Math.floor(rand() * s);
        grassTopCtx.fillStyle = rand() > 0.4 ? '#FFFFFF' : '#C7DCEB';
        grassTopCtx.fillRect(x, y, 1, 1);
      }
    } else if (season === 'autumn') {
      fillPixelNoise(
        grassTopCtx,
        grassTopBCtx,
        s,
        ['#B3913D', '#C4A047', '#9F7F34', '#BA9841', '#AA8738'],
        101,
        44,
      );
      const rand = mulberry32(104);
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(rand() * s);
        const y = Math.floor(rand() * s);
        grassTopCtx.fillStyle = rand() > 0.35 ? '#D4B254' : '#856728';
        grassTopCtx.fillRect(x, y, 1, 1);
      }
    } else if (season === 'summer') {
      fillPixelNoise(
        grassTopCtx,
        grassTopBCtx,
        s,
        ['#4F9E3C', '#5AA944', '#469034', '#63B54B', '#4C9839'],
        101,
        46,
      );
      const rand = mulberry32(103);
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(rand() * s);
        const y = Math.floor(rand() * s);
        grassTopCtx.fillStyle = rand() > 0.35 ? '#76C75B' : '#3A7A2B';
        grassTopCtx.fillRect(x, y, 1, 1);
      }
    } else {
      fillPixelNoise(
        grassTopCtx,
        grassTopBCtx,
        s,
        ['#69B34C', '#74BE54', '#5DA542', '#7EC75B', '#64AC47'],
        101,
        46,
      );
      const rand = mulberry32(102);
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(rand() * s);
        const y = Math.floor(rand() * s);
        grassTopCtx.fillStyle = rand() > 0.35 ? '#90D66B' : '#4E8F37';
        grassTopCtx.fillRect(x, y, 1, 1);
        grassTopBCtx.fillStyle = '#c8c8c8';
        grassTopBCtx.fillRect(x, y, 1, 1);
      }
    }
    grassTop.map.needsUpdate = true;
    grassTop.bumpMap.needsUpdate = true;
  };

  // 2. Dirt
  const dirt = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      fillPixelNoise(
        ctx,
        bCtx,
        s,
        ['#8C6239', '#7D5530', '#966A40', '#6E4B2A', '#A17449'],
        201,
        55,
      );
      const rand = mulberry32(202);
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(rand() * s);
        const y = Math.floor(rand() * s);
        ctx.fillStyle = '#B89B7A';
        ctx.fillRect(x, y, 1, 1);
        bCtx.fillStyle = '#e0e0e0';
        bCtx.fillRect(x, y, 1, 1);
      }
    }),
  );

  // 3. Dynamic Seasonal Grass Side (overhanging green turf OR iconic Minecraft snowy grass side!)
  const [grassSideC, grassSideCtx] = makeCanvas(16, 16);
  const [grassSideBC, grassSideBCtx] = makeCanvas(16, 16);
  const grassSide: VoxelTexturePair = trackPair({
    map: finalizeColorTexture(grassSideC, aniso),
    bumpMap: finalizeDataTexture(grassSideBC, aniso),
  });

  const drawSeasonalGrassSide = (season: Season) => {
    const s = 16;
    grassSideBCtx.fillStyle = '#808080';
    grassSideBCtx.fillRect(0, 0, s, s);
    fillPixelNoise(
      grassSideCtx,
      grassSideBCtx,
      s,
      ['#8C6239', '#7D5530', '#966A40', '#6E4B2A'],
      211,
      50,
    );
    const rand = mulberry32(212);
    const overhang = [3, 4, 3, 5, 4, 3, 4, 6, 4, 3, 5, 4, 3, 4, 5, 3];
    for (let x = 0; x < s; x++) {
      const h = overhang[x % overhang.length];
      for (let y = 0; y < h; y++) {
        const isEdge = y === h - 1;
        if (season === 'winter') {
          grassSideCtx.fillStyle = isEdge
            ? '#CBE0EE'
            : rand() > 0.45
              ? '#F6FAFE'
              : '#E7F2F9';
        } else if (season === 'autumn') {
          grassSideCtx.fillStyle = isEdge
            ? '#8E6F2B'
            : rand() > 0.45
              ? '#C29E46'
              : '#AC8A39';
        } else if (season === 'summer') {
          grassSideCtx.fillStyle = isEdge
            ? '#3D7E2D'
            : rand() > 0.45
              ? '#59A842'
              : '#4A9336';
        } else {
          grassSideCtx.fillStyle = isEdge
            ? '#52943A'
            : rand() > 0.45
              ? '#72BD53'
              : '#62A945';
        }
        grassSideCtx.fillRect(x, y, 1, 1);
        grassSideBCtx.fillStyle = isEdge ? '#555555' : '#dcdcdc';
        grassSideBCtx.fillRect(x, y, 1, 1);
      }
      if (h < s) {
        grassSideCtx.fillStyle = '#5B3C21';
        grassSideCtx.fillRect(x, h, 1, 1);
      }
    }
    grassSide.map.needsUpdate = true;
    grassSide.bumpMap.needsUpdate = true;
  };

  // 4. Dirt Path Top (warm packed orchard walkway)
  const dirtPathTop = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      fillPixelNoise(
        ctx,
        bCtx,
        s,
        ['#C7A56B', '#B9965C', '#D2B27A', '#AD8B53', '#C29F64'],
        301,
        35,
      );
      const rand = mulberry32(302);
      for (let i = 0; i < 14; i++) {
        const x = Math.floor(rand() * s);
        const y = Math.floor(rand() * s);
        ctx.fillStyle = rand() > 0.5 ? '#DFC38E' : '#967643';
        ctx.fillRect(x, y, 1, 1);
      }
    }),
  );

  const dirtPathSide = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      fillPixelNoise(
        ctx,
        bCtx,
        s,
        ['#8C6239', '#7D5530', '#966A40', '#6E4B2A'],
        311,
        45,
      );
      for (let x = 0; x < s; x++) {
        for (let y = 0; y < 3; y++) {
          ctx.fillStyle = y === 2 ? '#A6834D' : '#C9A76D';
          ctx.fillRect(x, y, 1, 1);
          bCtx.fillStyle = '#c8c8c8';
          bCtx.fillRect(x, y, 1, 1);
        }
      }
    }),
  );

  // 5. Farmland Top (tilled moist nursery rows)
  const farmlandTop = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      const rand = mulberry32(350);
      for (let y = 0; y < s; y++) {
        const furrow = y % 4 === 0 || y % 4 === 3;
        for (let x = 0; x < s; x++) {
          const v = (rand() - 0.5) * 14;
          if (furrow) {
            ctx.fillStyle = rgbStr(82 + v, 52 + v, 29 + v);
            bCtx.fillStyle = '#404040';
          } else {
            ctx.fillStyle = rgbStr(116 + v, 77 + v, 44 + v);
            bCtx.fillStyle = '#d4d4d4';
          }
          ctx.fillRect(x, y, 1, 1);
          bCtx.fillRect(x, y, 1, 1);
        }
      }
    }),
  );

  // 5B. Wet Watered Farmland Top (dark rich watered soil!)
  const farmlandWetTop = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      const rand = mulberry32(355);
      for (let y = 0; y < s; y++) {
        const furrow = y % 4 === 0 || y % 4 === 3;
        for (let x = 0; x < s; x++) {
          const v = (rand() - 0.5) * 10;
          if (furrow) {
            ctx.fillStyle = rgbStr(52 + v, 32 + v, 18 + v);
            bCtx.fillStyle = '#383838';
          } else {
            ctx.fillStyle = rgbStr(74 + v, 47 + v, 26 + v);
            bCtx.fillStyle = '#c8c8c8';
          }
          ctx.fillRect(x, y, 1, 1);
          bCtx.fillRect(x, y, 1, 1);
        }
      }
    }),
  );

  // 6. Cobblestone & Mossy Cobblestone
  const drawCobble = (
    ctx: CanvasRenderingContext2D,
    bCtx: CanvasRenderingContext2D,
    s: number,
    mossy: boolean,
    seed: number,
  ) => {
    const rand = mulberry32(seed);
    ctx.fillStyle = '#5B5E62';
    ctx.fillRect(0, 0, s, s);
    bCtx.fillStyle = '#303030';
    bCtx.fillRect(0, 0, s, s);

    const stones = [
      [0, 0, 7, 5],
      [8, 0, 8, 6],
      [0, 6, 5, 5],
      [6, 7, 6, 4],
      [13, 7, 3, 5],
      [0, 12, 8, 4],
      [9, 12, 7, 4],
    ];
    for (const [sx, sy, sw, sh] of stones) {
      const base = 132 + Math.floor(rand() * 34);
      for (let y = sy; y < sy + sh; y++) {
        for (let x = sx; x < sx + sw; x++) {
          const border = x === sx || y === sy || x === sx + sw - 1 || y === sy + sh - 1;
          const highlight = y === sy && x < sx + sw - 1;
          const shade = border ? (highlight ? 16 : -26) : Math.floor((rand() - 0.5) * 18);
          const v = base + shade;
          if (mossy && (border || rand() < 0.22) && rand() < 0.45) {
            ctx.fillStyle = rand() > 0.5 ? '#5E8E43' : '#4D7837';
            bCtx.fillStyle = '#909090';
          } else {
            ctx.fillStyle = rgbStr(v, v + 2, v + 5);
            bCtx.fillStyle = border ? '#505050' : '#d8d8d8';
          }
          ctx.fillRect(x, y, 1, 1);
          bCtx.fillRect(x, y, 1, 1);
        }
      }
    }
  };

  const cobblestone = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => drawCobble(ctx, bCtx, s, false, 401)),
  );
  const mossyCobble = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => drawCobble(ctx, bCtx, s, true, 402)),
  );

  // 7. Oak Bark & Cut Log Top
  const oakBark = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      const rand = mulberry32(501);
      for (let x = 0; x < s; x++) {
        const ridge = x % 3 === 0 ? -18 : x % 3 === 1 ? 12 : 0;
        for (let y = 0; y < s; y++) {
          const streak = (Math.sin(y * 0.8 + x * 1.9) * 8) + (rand() - 0.5) * 14;
          const r = 110 + ridge + streak;
          const g = 81 + ridge * 0.8 + streak * 0.7;
          const b = 50 + ridge * 0.6 + streak * 0.5;
          ctx.fillStyle = rgbStr(r, g, b);
          ctx.fillRect(x, y, 1, 1);

          const bv = clampByte(128 + ridge * 2.5 + (rand() - 0.5) * 28);
          bCtx.fillStyle = rgbStr(bv, bv, bv);
          bCtx.fillRect(x, y, 1, 1);
        }
      }
    }),
  );

  const oakLogTop = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      const cx = (s - 1) / 2;
      const cy = (s - 1) / 2;
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
          const isBark = x === 0 || y === 0 || x === s - 1 || y === s - 1;
          if (isBark) {
            ctx.fillStyle = '#6B4C2C';
            bCtx.fillStyle = '#a0a0a0';
          } else {
            const ring = Math.floor(d) % 2 === 0;
            ctx.fillStyle = ring ? '#C79E68' : '#AD834E';
            bCtx.fillStyle = ring ? '#c8c8c8' : '#969696';
          }
          ctx.fillRect(x, y, 1, 1);
          bCtx.fillRect(x, y, 1, 1);
        }
      }
    }),
  );

  // 8. Oak Planks & Dark Oak Planks
  const drawPlanks = (
    ctx: CanvasRenderingContext2D,
    bCtx: CanvasRenderingContext2D,
    s: number,
    baseRgb: [number, number, number],
    seed: number,
  ) => {
    const rand = mulberry32(seed);
    const [br, bg, bb] = baseRgb;
    for (let y = 0; y < s; y++) {
      const seam = y % 4 === 0;
      const plankIdx = Math.floor(y / 4);
      const vSplit = (plankIdx * 7 + 4) % s;
      const rowTint = (plankIdx % 2 === 0 ? 6 : -6);
      for (let x = 0; x < s; x++) {
        const isSplit = x === vSplit;
        const grain = (rand() - 0.5) * 12;
        if (seam || isSplit) {
          ctx.fillStyle = rgbStr(br - 36, bg - 30, bb - 22);
          bCtx.fillStyle = '#383838';
        } else {
          ctx.fillStyle = rgbStr(br + rowTint + grain, bg + rowTint + grain * 0.8, bb + rowTint * 0.6 + grain * 0.6);
          bCtx.fillStyle = rgbStr(150 + grain * 2, 150 + grain * 2, 150 + grain * 2);
        }
        ctx.fillRect(x, y, 1, 1);
        bCtx.fillRect(x, y, 1, 1);
      }
    }
  };

  const oakPlanks = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) =>
      drawPlanks(ctx, bCtx, s, [188, 146, 92], 601),
    ),
  );
  const darkOakPlanks = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) =>
      drawPlanks(ctx, bCtx, s, [104, 71, 44], 602),
    ),
  );

  // 9. Cottage Warm Cream Plaster (stucco with subtle timber-frame feel)
  const cottagePlaster = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      fillPixelNoise(
        ctx,
        bCtx,
        s,
        ['#F3EBDD', '#ECE2D0', '#F8F2E6', '#E5D9C4'],
        640,
        22,
      );
    }),
  );

  // 10. Terracotta Roof Shingles (warm apple-red / brick cottage roof)
  const terracottaRoof = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      const rand = mulberry32(650);
      for (let y = 0; y < s; y++) {
        const row = Math.floor(y / 4);
        const lip = y % 4 === 3;
        for (let x = 0; x < s; x++) {
          const colSplit = (x + (row % 2) * 2) % 4 === 0;
          const jitter = (rand() - 0.5) * 14;
          if (lip) {
            ctx.fillStyle = rgbStr(136 + jitter, 62 + jitter * 0.5, 48 + jitter * 0.4);
            bCtx.fillStyle = '#3c3c3c';
          } else if (colSplit) {
            ctx.fillStyle = rgbStr(154 + jitter, 72 + jitter * 0.5, 56 + jitter * 0.4);
            bCtx.fillStyle = '#707070';
          } else {
            ctx.fillStyle = rgbStr(188 + jitter, 90 + jitter * 0.6, 68 + jitter * 0.5);
            bCtx.fillStyle = '#d6d6d6';
          }
          ctx.fillRect(x, y, 1, 1);
          bCtx.fillRect(x, y, 1, 1);
        }
      }
    }),
  );

  // 11. Dynamic Seasonal Apple Tree Leaves (Spring blossoms / Summer lush / Autumn amber / Winter snow-dusted)
  const [leavesLushC, leavesLushCtx] = makeCanvas(16, 16);
  const [leavesLushBC, leavesLushBCtx] = makeCanvas(16, 16);
  const leavesLush: VoxelTexturePair = trackPair({
    map: finalizeColorTexture(leavesLushC, aniso),
    bumpMap: finalizeDataTexture(leavesLushBC, aniso),
  });

  const [leavesBlossomC, leavesBlossomCtx] = makeCanvas(16, 16);
  const [leavesBlossomBC, leavesBlossomBCtx] = makeCanvas(16, 16);
  const leavesBlossom: VoxelTexturePair = trackPair({
    map: finalizeColorTexture(leavesBlossomC, aniso),
    bumpMap: finalizeDataTexture(leavesBlossomBC, aniso),
  });

  const drawLeaves = (
    ctx: CanvasRenderingContext2D,
    bCtx: CanvasRenderingContext2D,
    s: number,
    withBlossoms: boolean,
    season: Season,
    seed: number,
  ) => {
    const rand = mulberry32(seed);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, s, s);

    let palette: string[];
    let shadowCol: string;
    if (season === 'winter') {
      palette = withBlossoms
        ? ['#E3EFF7', '#D4E6F2', '#5A8568', '#EDF5FA', '#6E997B']
        : ['#4C7A5B', '#5D8C6C', '#DDEBF4', '#3D664B', '#EDF5FA'];
      shadowCol = '#2C4A38';
    } else if (season === 'autumn') {
      palette = withBlossoms
        ? ['#E0882C', '#ECA63B', '#CF6924', '#F2B84B', '#C45522']
        : ['#C8762A', '#DA9236', '#B36122', '#E5A842', '#9D501E'];
      shadowCol = '#6E3214';
    } else if (season === 'summer') {
      palette = ['#3A7D2C', '#499338', '#56A442', '#2E6923', '#64B44D'];
      shadowCol = '#1F4B18';
    } else {
      palette = ['#4A8F36', '#5BA843', '#6AB84E', '#3D7A2C', '#7BC85C'];
      shadowCol = '#2E5E21';
    }

    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const c = palette[Math.floor(rand() * palette.length)];
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
        const bv = 130 + Math.floor(rand() * 70);
        bCtx.fillStyle = rgbStr(bv, bv, bv);
        bCtx.fillRect(x, y, 1, 1);
      }
    }
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(rand() * s);
      const y = Math.floor(rand() * s);
      ctx.fillStyle = shadowCol;
      ctx.fillRect(x, y, 1, 1);
      bCtx.fillStyle = '#282828';
      bCtx.fillRect(x, y, 1, 1);
    }
    if (withBlossoms && season === 'spring') {
      const spots = [
        [2, 2],
        [10, 3],
        [5, 9],
        [12, 11],
        [2, 13],
      ];
      for (const [bx, by] of spots) {
        ctx.fillStyle = '#FFE4EE';
        ctx.fillRect(bx, by, 2, 2);
        ctx.fillStyle = '#FFC2D6';
        ctx.fillRect(bx + 1, by, 1, 1);
        ctx.fillStyle = '#FFE278';
        ctx.fillRect(bx, by + 1, 1, 1);
        bCtx.fillStyle = '#f0f0f0';
        bCtx.fillRect(bx, by, 2, 2);
      }
    } else if (season === 'winter') {
      // Crisp white snow flecks resting on leaf clusters
      for (let i = 0; i < 16; i++) {
        const sx = Math.floor(rand() * (s - 1));
        const sy = Math.floor(rand() * 8);
        ctx.fillStyle = '#F7FBFE';
        ctx.fillRect(sx, sy, 2, 1);
      }
    }
  };

  const setSeason = (season: Season) => {
    drawSeasonalGrassTop(season);
    drawSeasonalGrassSide(season);
    drawLeaves(leavesLushCtx, leavesLushBCtx, 16, false, season, 701);
    leavesLush.map.needsUpdate = true;
    leavesLush.bumpMap.needsUpdate = true;
    drawLeaves(leavesBlossomCtx, leavesBlossomBCtx, 16, true, season, 702);
    leavesBlossom.map.needsUpdate = true;
    leavesBlossom.bumpMap.needsUpdate = true;
  };
  setSeason('spring');

  // 12. Glossy Red & Golden Voxel Apples
  const drawApple = (
    ctx: CanvasRenderingContext2D,
    bCtx: CanvasRenderingContext2D,
    s: number,
    palette: string[],
    highlight: string,
    seed: number,
  ) => {
    fillPixelNoise(ctx, bCtx, s, palette, seed, 18);
    // Crisp specular shine patch
    ctx.fillStyle = highlight;
    ctx.fillRect(3, 3, 3, 2);
    ctx.fillRect(3, 5, 2, 2);
    // Subtle dark shade near bottom
    ctx.fillStyle = 'rgba(40,10,5,0.22)';
    ctx.fillRect(0, s - 3, s, 3);
  };

  const appleRed = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) =>
      drawApple(ctx, bCtx, s, ['#D93830', '#E8473C', '#C42C26', '#E04036'], '#FF9B8E', 801),
    ),
  );
  const appleGold = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) =>
      drawApple(ctx, bCtx, s, ['#F2C138', '#FFD24C', '#E0AC28', '#F7C942'], '#FFF4B8', 802),
    ),
  );

  // 13. Apple Crate Top & Wooden Barrel Side
  const appleCrateTop = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      // Wooden crate rim
      drawPlanks(ctx, bCtx, s, [175, 132, 80], 810);
      // Inner packed red & green apples
      ctx.fillStyle = '#4B321C';
      ctx.fillRect(2, 2, 12, 12);
      const apples = [
        [3, 3, '#D93830'],
        [7, 3, '#E84A3E'],
        [10, 4, '#88C446'],
        [4, 7, '#E04238'],
        [8, 7, '#C92D26'],
        [10, 9, '#E84A3E'],
        [3, 10, '#F0BE3A'],
        [7, 10, '#D93830'],
      ] as const;
      for (const [ax, ay, col] of apples) {
        ctx.fillStyle = col;
        ctx.fillRect(ax, ay, 3, 3);
        ctx.fillStyle = '#FFE0D6';
        ctx.fillRect(ax, ay, 1, 1);
        bCtx.fillStyle = '#eeeeee';
        bCtx.fillRect(ax, ay, 3, 3);
      }
    }),
  );

  const barrelSide = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      const rand = mulberry32(820);
      for (let x = 0; x < s; x++) {
        const staveSeam = x % 4 === 0;
        for (let y = 0; y < s; y++) {
          const ironBand = y === 2 || y === 3 || y === 12 || y === 13;
          if (ironBand) {
            const v = 64 + Math.floor((rand() - 0.5) * 16);
            ctx.fillStyle = rgbStr(v, v + 4, v + 8);
            bCtx.fillStyle = '#e8e8e8';
          } else if (staveSeam) {
            ctx.fillStyle = '#6A4728';
            bCtx.fillStyle = '#404040';
          } else {
            const j = (rand() - 0.5) * 12;
            ctx.fillStyle = rgbStr(156 + j, 114 + j * 0.8, 68 + j * 0.6);
            bCtx.fillStyle = '#b4b4b4';
          }
          ctx.fillRect(x, y, 1, 1);
          bCtx.fillRect(x, y, 1, 1);
        }
      }
    }),
  );

  // 14. Hay Bale
  const hayBale = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      fillPixelNoise(
        ctx,
        bCtx,
        s,
        ['#D8B14C', '#E4BF58', '#C69E3B', '#ECC965'],
        830,
        42,
      );
      // Red twine bands
      ctx.fillStyle = '#B8392E';
      ctx.fillRect(0, 4, s, 2);
      ctx.fillRect(0, 11, s, 2);
      bCtx.fillStyle = '#ffffff';
      bCtx.fillRect(0, 4, s, 2);
      bCtx.fillRect(0, 11, s, 2);
    }),
  );

  // 14B. Iconic Minecraft Crafting Table (3x3 Grid Top & Saw/Tool Oak Sides)
  const craftingTableTop = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      fillPixelNoise(
        ctx,
        bCtx,
        s,
        ['#BC8A4F', '#C8965A', '#AE7C43', '#D1A065'],
        840,
        24,
      );
      // Dark oak border rim
      ctx.fillStyle = '#5E3C1E';
      ctx.fillRect(0, 0, s, 2);
      ctx.fillRect(0, s - 2, s, 2);
      ctx.fillRect(0, 0, 2, s);
      ctx.fillRect(s - 2, 0, 2, s);
      // Crisp 3x3 crafting matrix lines
      ctx.fillStyle = '#4B2E16';
      ctx.fillRect(5, 2, 1, 12);
      ctx.fillRect(10, 2, 1, 12);
      ctx.fillRect(2, 5, 12, 1);
      ctx.fillRect(2, 10, 12, 1);
      bCtx.fillStyle = '#383838';
      bCtx.fillRect(5, 2, 1, 12);
      bCtx.fillRect(10, 2, 1, 12);
      bCtx.fillRect(2, 5, 12, 1);
      bCtx.fillRect(2, 10, 12, 1);
    }),
  );

  const craftingTableSide = trackPair(
    createVoxelPair(16, aniso, (ctx, bCtx, s) => {
      drawPlanks(ctx, bCtx, s, [168, 124, 74], 842);
      // Dark top apron trim
      ctx.fillStyle = '#5E3C1E';
      ctx.fillRect(0, 0, s, 3);
      ctx.fillStyle = '#3E2510';
      ctx.fillRect(0, 3, s, 1);
      // Hanging iron saw on left
      ctx.fillStyle = '#8F969E';
      ctx.fillRect(3, 5, 2, 7);
      ctx.fillStyle = '#6A717A';
      ctx.fillRect(5, 6, 1, 5);
      ctx.fillStyle = '#4E3119';
      ctx.fillRect(3, 4, 3, 2);
      // Hanging hammer on right
      ctx.fillStyle = '#7C5430';
      ctx.fillRect(11, 6, 1, 6);
      ctx.fillStyle = '#4E545C';
      ctx.fillRect(9, 4, 5, 2);
      bCtx.fillStyle = '#efefef';
      bCtx.fillRect(3, 5, 3, 7);
      bCtx.fillRect(9, 4, 5, 8);
    }),
  );

  // 15. Cottage Window Pane (warm oak mullions + subtle reflection)
  const windowPane = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 16);
      ctx.fillStyle = '#CFE9F8';
      ctx.fillRect(0, 0, 16, 16);
      // Sky glint stripes
      ctx.fillStyle = '#F2FAFF';
      ctx.fillRect(3, 3, 2, 2);
      ctx.fillRect(5, 5, 1, 1);
      ctx.fillRect(10, 10, 2, 2);
      // Wood frame + cross mullions
      ctx.fillStyle = '#7C5332';
      ctx.fillRect(0, 0, 16, 2);
      ctx.fillRect(0, 14, 16, 2);
      ctx.fillRect(0, 0, 2, 16);
      ctx.fillRect(14, 0, 2, 16);
      ctx.fillRect(7, 0, 2, 16);
      ctx.fillRect(0, 7, 16, 2);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  // 16. Sparkling Minecraft Water (tileable)
  const water = track(
    (() => {
      const [c, ctx] = makeCanvas(32, 32);
      const rand = mulberry32(900);
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const wave = Math.sin((x + y * 0.5) * 0.5) * 14;
          const sparkle = rand() > 0.94 ? 38 : 0;
          ctx.fillStyle = rgbStr(
            58 + wave * 0.5 + sparkle,
            152 + wave + sparkle,
            218 + wave * 0.7 + sparkle * 0.6,
          );
          ctx.fillRect(x, y, 1, 1);
        }
      }
      return finalizeColorTexture(c, aniso, true);
    })(),
  );

  // 17. Dynamic Bilingual 3D Orchard Signboard & Market Stall Sign
  const [signCanvas, signCtx] = makeCanvas(256, 96);
  const signBoard = track(finalizeColorTexture(signCanvas, aniso));

  const [shopSignCanvas, shopSignCtx] = makeCanvas(256, 72);
  const shopSignBoard = track(finalizeColorTexture(shopSignCanvas, aniso));

  const drawMainSign = (lang: Language) => {
    const t = TRANSLATIONS[lang];
    const ctx = signCtx;
    ctx.fillStyle = '#B88952';
    ctx.fillRect(0, 0, 256, 96);
    for (let y = 0; y < 96; y += 24) {
      ctx.fillStyle = '#8F6437';
      ctx.fillRect(0, y, 256, 3);
    }
    ctx.strokeStyle = '#5D3C1E';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 90);
    // Cute pixel apple badge on left
    ctx.fillStyle = '#D93B32';
    ctx.fillRect(20, 34, 24, 24);
    ctx.fillStyle = '#FF9C8F';
    ctx.fillRect(24, 38, 6, 6);
    ctx.fillStyle = '#5D3C1E';
    ctx.fillRect(30, 26, 4, 8);
    ctx.fillStyle = '#6BC04B';
    ctx.fillRect(34, 26, 10, 6);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (lang === 'zh') {
      ctx.fillStyle = '#3B2310';
      ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(t.signLine1, 56, 38);
      ctx.fillStyle = '#5A3718';
      ctx.font = 'bold 18px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(t.signLine2, 58, 68);
    } else {
      ctx.fillStyle = '#3B2310';
      ctx.font = 'bold 26px "Bricolage Grotesque", sans-serif';
      ctx.fillText(t.signLine1, 56, 36);
      ctx.fillStyle = '#523217';
      ctx.font = 'bold 22px "Bricolage Grotesque", sans-serif';
      ctx.fillText(t.signLine2, 56, 66);
    }
    signBoard.needsUpdate = true;
  };

  const drawShopSign = (lang: Language) => {
    const t = TRANSLATIONS[lang];
    const ctx = shopSignCtx;
    ctx.fillStyle = '#C4955B';
    ctx.fillRect(0, 0, 256, 72);
    ctx.strokeStyle = '#5D3C1E';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 66);
    ctx.fillStyle = '#3B2310';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font =
      lang === 'zh'
        ? 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif'
        : 'bold 26px "Bricolage Grotesque", sans-serif';
    ctx.fillText(t.shopSignLine, 128, 37);
    shopSignBoard.needsUpdate = true;
  };

  const setSignLanguage = (lang: Language) => {
    drawMainSign(lang);
    drawShopSign(lang);
  };
  setSignLanguage('en');

  // 18. Lantern Glass Core
  const lanternGlass = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 16);
      ctx.fillStyle = '#FFBE4F';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#FFE89E';
      ctx.fillRect(3, 3, 10, 10);
      ctx.fillStyle = '#FFF9DC';
      ctx.fillRect(5, 5, 6, 6);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  // 19. Soft Radial Contact Shadow
  const contactShadow = track(
    (() => {
      const [c, ctx] = makeCanvas(64, 64);
      const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
      grad.addColorStop(0, 'rgba(20, 32, 16, 0.52)');
      grad.addColorStop(0.55, 'rgba(20, 32, 16, 0.22)');
      grad.addColorStop(1, 'rgba(20, 32, 16, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    })(),
  );

  // 20. Cross-billboard Botanical Sprites (Wildflowers, Grass Tuft, Apple Sapling)
  const makeFlowerTex = (petal: string, center: string): THREE.CanvasTexture => {
    const [c, ctx] = makeCanvas(16, 16);
    ctx.clearRect(0, 0, 16, 16);
    // Stem & leaves
    ctx.fillStyle = '#4B8E34';
    ctx.fillRect(7, 7, 2, 9);
    ctx.fillStyle = '#62B146';
    ctx.fillRect(5, 11, 2, 2);
    ctx.fillRect(9, 10, 2, 2);
    // Petals
    ctx.fillStyle = petal;
    ctx.fillRect(5, 3, 6, 6);
    ctx.fillRect(6, 2, 4, 8);
    ctx.fillRect(4, 4, 8, 4);
    // Center
    ctx.fillStyle = center;
    ctx.fillRect(7, 5, 2, 2);
    return finalizeColorTexture(c, aniso);
  };

  const wildflowerRed = track(makeFlowerTex('#E8524A', '#FFE37A'));
  const wildflowerYellow = track(makeFlowerTex('#F7DF6E', '#D88D2A'));
  const wildflowerBlue = track(makeFlowerTex('#75BCE8', '#FFF4A3'));

  const grassTuft = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 16);
      ctx.clearRect(0, 0, 16, 16);
      const blades = [
        [2, 10, 2, 6, '#569E3D'],
        [4, 7, 2, 9, '#6EBD51'],
        [7, 5, 2, 11, '#7ECE5F'],
        [10, 8, 2, 8, '#5DA843'],
        [12, 10, 2, 6, '#4C8E35'],
      ] as const;
      for (const [x, y, w, h, col] of blades) {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, w, h);
      }
      return finalizeColorTexture(c, aniso);
    })(),
  );

  const saplingSprite = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 16);
      ctx.clearRect(0, 0, 16, 16);
      // Trunk stem
      ctx.fillStyle = '#7A512E';
      ctx.fillRect(7, 8, 2, 8);
      ctx.fillRect(6, 14, 4, 2);
      // Leaf canopy
      ctx.fillStyle = '#4B9136';
      ctx.fillRect(4, 3, 8, 6);
      ctx.fillStyle = '#6DC04F';
      ctx.fillRect(5, 2, 6, 5);
      ctx.fillRect(3, 5, 10, 3);
      // Tiny baby apple blossom!
      ctx.fillStyle = '#FFE0EC';
      ctx.fillRect(10, 4, 2, 2);
      ctx.fillStyle = '#E04238';
      ctx.fillRect(5, 6, 2, 2);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  // =========================================================================
  // APPLE-CHAN META MINECRAFT OC PIXEL TEXTURES (16x16 HD Skin / 8x8 Grid)
  // Authentic meta Minecraft anime skin shading + 2nd-layer hair overlay!
  // =========================================================================

  const makeFace = (mode: 'normal' | 'blink' | 'happy'): THREE.CanvasTexture => {
    const [c, ctx] = makeCanvas(16, 16);
    // Luminous warm porcelain skin base
    ctx.fillStyle = '#FDEEE6';
    ctx.fillRect(0, 0, 16, 16);

    // Subtle skin depth along very bottom chin & outer edges
    ctx.fillStyle = '#F8DFD3';
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(15, 0, 1, 16);

    // Inner-layer hair cap along forehead top (rows 0..3) & delicate bangs shadow (row 4)
    ctx.fillStyle = '#A6C98E';
    ctx.fillRect(0, 0, 16, 3);
    ctx.fillStyle = '#92B779';
    ctx.fillRect(0, 3, 16, 1);
    // Side framing hairline down upper temples
    ctx.fillStyle = '#A6C98E';
    ctx.fillRect(0, 3, 2, 5);
    ctx.fillRect(14, 3, 2, 5);
    ctx.fillStyle = '#92B779';
    ctx.fillRect(0, 8, 1, 5);
    ctx.fillRect(15, 8, 1, 5);
    // Soft shadow cast onto skin directly under bangs
    ctx.fillStyle = '#F2D8CC';
    ctx.fillRect(2, 4, 12, 1);
    ctx.fillRect(6, 5, 4, 1);

    // Soft rosy cheek blush right below outer eye corners (meta Minecraft kawaii placement)
    ctx.fillStyle = mode === 'happy' ? '#F7A9A1' : '#F9C9C0';
    ctx.fillRect(1, 12, 3, 2);
    ctx.fillRect(12, 12, 3, 2);
    if (mode === 'happy') {
      ctx.fillStyle = '#F08880';
      ctx.fillRect(2, 12, 1, 1);
      ctx.fillRect(13, 12, 1, 1);
    }

    if (mode === 'normal') {
      // Meta Minecraft Anime Eyes: crisp white sclera on OUTER column + rich emerald-to-mint iris gradient!
      const drawMetaEye = (startX: number, isLeftEye: boolean) => {
        // Soft curved dark-olive upper lash line (row 7)
        ctx.fillStyle = '#3C4E37';
        ctx.fillRect(startX, 7, 4, 1);
        // Slight wing lash on outer corner
        ctx.fillStyle = '#536A4B';
        ctx.fillRect(isLeftEye ? startX : startX + 3, 8, 1, 1);

        // White sclera on outer column (crucial meta Minecraft OC eye read!)
        const scleraX = isLeftEye ? startX : startX + 3;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(scleraX, 8, 1, 4);
        // Subtle cool top shadow on sclera
        ctx.fillStyle = '#E6ECE8';
        ctx.fillRect(scleraX, 8, 1, 1);

        // 3-pixel-wide emerald-to-mint gradient iris (rows 8..11)
        const irisX = isLeftEye ? startX + 1 : startX;
        // Row 8: deep forest-emerald upper iris shadow
        ctx.fillStyle = '#3B6A46';
        ctx.fillRect(irisX, 8, 3, 1);
        // Row 9: rich emerald iris + darker central pupil pixel
        ctx.fillStyle = '#539962';
        ctx.fillRect(irisX, 9, 3, 1);
        ctx.fillStyle = '#2E5238';
        ctx.fillRect(irisX + 1, 9, 1, 1);
        // Row 10: bright apple-leaf mint glow
        ctx.fillStyle = '#84C991';
        ctx.fillRect(irisX, 10, 3, 1);
        // Row 11: luminous pastel mint lower rim
        ctx.fillStyle = '#BCEBC2';
        ctx.fillRect(irisX, 11, 3, 1);
        ctx.fillStyle = '#6AA876';
        ctx.fillRect(irisX + (isLeftEye ? 2 : 0), 11, 1, 1);

        // Crisp anime specular catchlight highlights!
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(irisX + (isLeftEye ? 0 : 2), 8, 1, 1);
        ctx.fillRect(irisX + (isLeftEye ? 2 : 0), 10, 1, 1);
      };

      drawMetaEye(2, true);
      drawMetaEye(10, false);

      // Clean meta Minecraft mouth: NO heavy dark line! Just a whisper-soft 2px pastel smile tint
      ctx.fillStyle = '#E5A8A0';
      ctx.fillRect(7, 13, 2, 1);
    } else if (mode === 'blink') {
      // Gentle curved closed eyelashes
      ctx.fillStyle = '#475C41';
      ctx.fillRect(2, 10, 4, 1);
      ctx.fillRect(10, 10, 4, 1);
      ctx.fillStyle = '#738C6A';
      ctx.fillRect(2, 9, 1, 1);
      ctx.fillRect(13, 9, 1, 1);
      ctx.fillStyle = '#E5A8A0';
      ctx.fillRect(7, 13, 2, 1);
    } else {
      // Happy > < eyes matching official Apple-chan chibi art!
      ctx.fillStyle = '#465B40';
      // Left '>'
      ctx.fillRect(2, 8, 1, 1);
      ctx.fillRect(3, 9, 1, 1);
      ctx.fillRect(4, 10, 1, 1);
      ctx.fillRect(3, 11, 1, 1);
      ctx.fillRect(2, 12, 1, 1);
      // Right '<'
      ctx.fillRect(13, 8, 1, 1);
      ctx.fillRect(12, 9, 1, 1);
      ctx.fillRect(11, 10, 1, 1);
      ctx.fillRect(12, 11, 1, 1);
      ctx.fillRect(13, 12, 1, 1);
      // Cute tiny open pink smile with 1-pixel white fang (小虎牙)!
      ctx.fillStyle = '#E67C7A';
      ctx.fillRect(7, 13, 2, 2);
      ctx.fillStyle = '#B85D5B';
      ctx.fillRect(6, 13, 1, 1);
      ctx.fillRect(9, 13, 1, 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(8, 13, 1, 1);
    }

    return finalizeColorTexture(c, aniso);
  };

  const acFaceNormal = track(makeFace('normal'));
  const acFaceBlink = track(makeFace('blink'));
  const acFaceHappy = track(makeFace('happy'));

  // Base hair texture with soft anime vertical strand shading & pastel halo highlight
  const drawHairBase = (ctx: CanvasRenderingContext2D, seed: number) => {
    const rand = mulberry32(seed);
    for (let x = 0; x < 16; x++) {
      const strand = x % 4 === 0 ? -9 : x % 4 === 2 ? 8 : 0;
      for (let y = 0; y < 16; y++) {
        // Subtle anime hair shine band around upper-middle rows
        const shine = y === 4 || y === 5 ? 14 : y >= 13 ? -10 : 0;
        const j = (rand() - 0.5) * 6;
        ctx.fillStyle = rgbStr(
          164 + strand + shine + j,
          201 + strand + shine + j,
          140 + strand * 0.8 + shine * 0.8 + j,
        );
        ctx.fillRect(x, y, 1, 1);
      }
    }
  };

  const acHair = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 16);
      drawHairBase(ctx, 950);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  // Crown top hair with gentle center part swirl
  const acHairTop = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 16);
      drawHairBase(ctx, 951);
      // Subtle darker center part line
      ctx.fillStyle = '#84A86D';
      ctx.fillRect(7, 4, 2, 8);
      // Soft halo highlight ring
      ctx.fillStyle = '#C2E3AA';
      ctx.fillRect(4, 3, 8, 1);
      ctx.fillRect(4, 12, 8, 1);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  // Side head base faces (shows warm cheek skin near front-bottom edge like side-view reference!)
  const makeHeadSide = (frontOnRight: boolean): THREE.CanvasTexture => {
    const [c, ctx] = makeCanvas(16, 16);
    drawHairBase(ctx, frontOnRight ? 952 : 953);
    // Expose cheek/jaw skin on the front-bottom quadrant
    ctx.fillStyle = '#FDEEE6';
    if (frontOnRight) {
      ctx.fillRect(11, 8, 5, 8);
      ctx.fillStyle = '#F4D8CB';
      ctx.fillRect(10, 9, 1, 7);
      // Cheek side-lock curve
      ctx.fillStyle = '#A6C98E';
      ctx.fillRect(11, 8, 2, 5);
      ctx.fillStyle = '#8CB273';
      ctx.fillRect(11, 13, 1, 2);
    } else {
      ctx.fillRect(0, 8, 5, 8);
      ctx.fillStyle = '#F4D8CB';
      ctx.fillRect(5, 9, 1, 7);
      ctx.fillStyle = '#A6C98E';
      ctx.fillRect(3, 8, 2, 5);
      ctx.fillStyle = '#8CB273';
      ctx.fillRect(4, 13, 1, 2);
    }
    return finalizeColorTexture(c, aniso);
  };
  const acHeadSideLeft = track(makeHeadSide(true));
  const acHeadSideRight = track(makeHeadSide(false));

  // Authentic Minecraft 2nd-Layer Hat/Hair Overlay (Alpha-Cutout Fluffy Anime Bangs!)
  const acHairOverlayFront = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 16);
      ctx.clearRect(0, 0, 16, 16);
      // Fluffy asymmetrical anime bangs matching Apple-chan's official sheets!
      const bangs: [number, number, number, number, string][] = [
        // Top crown fringe
        [0, 0, 16, 4, '#A8CC90'],
        [0, 0, 16, 1, '#BBE0A2'],
        // Left & right side-framing locks tapering cleanly past cheeks
        [0, 4, 2, 10, '#A2C68A'],
        [0, 14, 1, 2, '#8EB576'],
        [14, 4, 2, 10, '#A2C68A'],
        [15, 14, 1, 2, '#8EB576'],
        // Soft inner cheek wisps (do NOT block eyes!)
        [2, 4, 2, 3, '#A8CC90'],
        [2, 7, 1, 1, '#8EB576'],
        [12, 4, 2, 3, '#A8CC90'],
        [13, 7, 1, 1, '#8EB576'],
        // Signature asymmetrical center-parted front tuft dipping delicately between eyes!
        [5, 4, 6, 2, '#AED196'],
        [6, 6, 3, 2, '#A2C68A'],
        [7, 8, 2, 1, '#8CB374'],
        // Delicate light highlights on bangs
        [4, 2, 3, 1, '#C5E7AD'],
        [9, 2, 3, 1, '#C5E7AD'],
      ];
      for (const [x, y, w, h, col] of bangs) {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, w, h);
      }
      return finalizeColorTexture(c, aniso);
    })(),
  );

  const makeHairOverlaySide = (frontOnRight: boolean): THREE.CanvasTexture => {
    const [c, ctx] = makeCanvas(16, 16);
    ctx.clearRect(0, 0, 16, 16);
    // Layered outer hair silhouette on side profile
    ctx.fillStyle = '#A8CC90';
    ctx.fillRect(0, 0, 16, 5);
    ctx.fillStyle = '#BBE0A2';
    ctx.fillRect(2, 2, 12, 1);
    if (frontOnRight) {
      ctx.fillStyle = '#A2C68A';
      ctx.fillRect(0, 5, 11, 11);
      ctx.fillRect(11, 5, 3, 6);
      ctx.fillStyle = '#8EB576';
      ctx.fillRect(10, 11, 2, 5);
      ctx.fillRect(13, 9, 2, 5);
    } else {
      ctx.fillStyle = '#A2C68A';
      ctx.fillRect(5, 5, 11, 11);
      ctx.fillRect(2, 5, 3, 6);
      ctx.fillStyle = '#8EB576';
      ctx.fillRect(4, 11, 2, 5);
      ctx.fillRect(1, 9, 2, 5);
    }
    return finalizeColorTexture(c, aniso);
  };
  const acHairOverlaySideLeft = track(makeHairOverlaySide(true));
  const acHairOverlaySideRight = track(makeHairOverlaySide(false));

  // Soft warm skin texture
  const acSkin = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 16);
      ctx.fillStyle = '#FDEEE6';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#F5DDD1';
      ctx.fillRect(0, 14, 16, 2);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  // Common Outfit: Sky-blue T-shirt with cute reddish-brown apple & green leaf emblem!
  const acShirtFront = track(
    (() => {
      const [c, ctx] = makeCanvas(32, 32);
      // Sky blue cotton fabric
      ctx.fillStyle = '#89C0DF';
      ctx.fillRect(0, 0, 32, 32);
      // Subtle collar scoop
      ctx.fillStyle = '#FCEAE0';
      ctx.fillRect(11, 0, 10, 3);
      ctx.fillRect(13, 3, 6, 1);
      // Collar trim
      ctx.fillStyle = '#6EA5C4';
      ctx.fillRect(10, 0, 1, 4);
      ctx.fillRect(21, 0, 1, 4);
      ctx.fillRect(11, 4, 10, 1);
      // Soft side shading
      ctx.fillStyle = '#79B1D1';
      ctx.fillRect(0, 0, 3, 32);
      ctx.fillRect(29, 0, 3, 32);
      ctx.fillRect(0, 29, 32, 3);

      // Iconic centered Apple Emblem (warm crimson-brown apple + tiny green leaf)
      ctx.fillStyle = '#B85440';
      ctx.fillRect(11, 12, 10, 10);
      ctx.fillRect(10, 14, 12, 6);
      ctx.fillRect(12, 22, 8, 1);
      // Apple highlight
      ctx.fillStyle = '#D9755E';
      ctx.fillRect(12, 14, 3, 3);
      // Stem
      ctx.fillStyle = '#6D4329';
      ctx.fillRect(15, 9, 2, 3);
      // Cute sage-green leaf
      ctx.fillStyle = '#7FB564';
      ctx.fillRect(17, 9, 4, 2);
      ctx.fillRect(18, 11, 2, 1);

      return finalizeColorTexture(c, aniso);
    })(),
  );

  const acShirtBack = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 16);
      ctx.fillStyle = '#89C0DF';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#77AFCE';
      ctx.fillRect(0, 0, 2, 16);
      ctx.fillRect(14, 0, 2, 16);
      ctx.fillRect(0, 14, 16, 2);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  const acShirtSleeve = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 32);
      // Upper half sky-blue T-shirt sleeve
      ctx.fillStyle = '#89C0DF';
      ctx.fillRect(0, 0, 16, 13);
      ctx.fillStyle = '#6EA5C4';
      ctx.fillRect(0, 12, 16, 2);
      // Lower half bare arm & hand
      ctx.fillStyle = '#FCEAE0';
      ctx.fillRect(0, 14, 16, 18);
      ctx.fillStyle = '#F2D6C8';
      ctx.fillRect(0, 14, 16, 1);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  // White Pleated Skirt (crisp white with vertical slate-grey pleat shadows)
  const acSkirtPleated = track(
    (() => {
      const [c, ctx] = makeCanvas(32, 16);
      ctx.fillStyle = '#F5F7FA';
      ctx.fillRect(0, 0, 32, 16);
      for (let x = 0; x < 32; x += 4) {
        ctx.fillStyle = '#B8C4CF';
        ctx.fillRect(x, 0, 1, 16);
        ctx.fillStyle = '#DCE3EA';
        ctx.fillRect(x + 1, 0, 1, 16);
      }
      // Subtle hem border
      ctx.fillStyle = '#C9D3DC';
      ctx.fillRect(0, 14, 32, 2);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  // Iconic Green & Mint Striped Calf Socks (worn as shoes in Common Outfit!)
  const acStripedSock = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 32);
      // Upper bare knee/thigh
      ctx.fillStyle = '#FCEAE0';
      ctx.fillRect(0, 0, 16, 11);
      // Striped green-and-mint calf sock below
      const stripeColors = ['#7CC28E', '#C4E8C7'];
      for (let y = 11; y < 32; y++) {
        const stripe = Math.floor((y - 11) / 3) % 2;
        ctx.fillStyle = stripeColors[stripe];
        ctx.fillRect(0, y, 16, 1);
      }
      // Top ribbed cuff accent
      ctx.fillStyle = '#5E9F70';
      ctx.fillRect(0, 11, 16, 1);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  // Spring Outfit: Beige T-shirt + Sky-blue Denim Short Overalls with front pocket!
  const acOverallsFront = track(
    (() => {
      const [c, ctx] = makeCanvas(32, 32);
      // Warm beige/taupe tee base
      ctx.fillStyle = '#CABDB5';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#FCEAE0';
      ctx.fillRect(11, 0, 10, 3);
      // Blue denim straps
      ctx.fillStyle = '#82A6BC';
      ctx.fillRect(6, 0, 4, 10);
      ctx.fillRect(22, 0, 4, 10);
      // Main bib & shorts
      ctx.fillRect(5, 8, 22, 24);
      ctx.fillRect(0, 20, 32, 12);
      // Stitching & chest pocket
      ctx.fillStyle = '#5F7F94';
      ctx.fillRect(10, 12, 12, 1);
      ctx.fillRect(10, 20, 12, 1);
      ctx.fillRect(10, 12, 1, 9);
      ctx.fillRect(21, 12, 1, 9);
      // Brass overall buttons
      ctx.fillStyle = '#E6C677';
      ctx.fillRect(7, 9, 2, 2);
      ctx.fillRect(23, 9, 2, 2);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  const acOverallsBack = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 16);
      ctx.fillStyle = '#CABDB5';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#82A6BC';
      ctx.fillRect(3, 0, 2, 8);
      ctx.fillRect(11, 0, 2, 8);
      ctx.fillRect(0, 7, 16, 9);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  const acBeigeSleeve = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 32);
      ctx.fillStyle = '#CABDB5';
      ctx.fillRect(0, 0, 16, 13);
      ctx.fillStyle = '#B0A198';
      ctx.fillRect(0, 12, 16, 2);
      ctx.fillStyle = '#FCEAE0';
      ctx.fillRect(0, 14, 16, 18);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  const acCheckeredBand = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 4);
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 4; y++) {
          const check = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0;
          ctx.fillStyle = check ? '#9FC4DA' : '#EAF3F8';
          ctx.fillRect(x, y, 1, 1);
        }
      }
      return finalizeColorTexture(c, aniso);
    })(),
  );

  const acClogShoe = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 32);
      // Denim short cuff at top
      ctx.fillStyle = '#82A6BC';
      ctx.fillRect(0, 0, 16, 6);
      ctx.fillStyle = '#6A8DA3';
      ctx.fillRect(0, 5, 16, 2);
      // Bare leg
      ctx.fillStyle = '#FCEAE0';
      ctx.fillRect(0, 7, 16, 11);
      // White ruffled sock
      ctx.fillStyle = '#F4ECE8';
      ctx.fillRect(0, 18, 16, 6);
      ctx.fillStyle = '#DCD0C9';
      for (let x = 0; x < 16; x += 2) {
        ctx.fillRect(x, 18, 1, 2);
      }
      // Warm chestnut brown clog shoe
      ctx.fillStyle = '#996C52';
      ctx.fillRect(0, 24, 16, 8);
      ctx.fillStyle = '#734E39';
      ctx.fillRect(0, 30, 16, 2);
      ctx.fillStyle = '#E8D5C5';
      ctx.fillRect(5, 25, 6, 3);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  // Idol Outfit (from Apple-chan's Official Idol Sheet!):
  // Sky-blue corset bodice, white ruffled collar with black bow, pink striped chest ribbon + blue heart clasp!
  const acIdolFront = track(
    (() => {
      const [c, ctx] = makeCanvas(32, 32);
      // Sky blue bodice base
      ctx.fillStyle = '#8CCCE6';
      ctx.fillRect(0, 0, 32, 32);
      // White ruffled off-shoulder collar & neckline
      ctx.fillStyle = '#FDEEE6';
      ctx.fillRect(8, 0, 16, 5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 5, 32, 5);
      ctx.fillStyle = '#DCE8F0';
      for (let x = 0; x < 32; x += 4) {
        ctx.fillRect(x, 9, 2, 1);
      }
      // Collar stand + tiny black bow at throat
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(10, 0, 12, 4);
      ctx.fillStyle = '#2A2D34';
      ctx.fillRect(13, 3, 6, 2);
      // Pink & white striped chest ribbon bow
      ctx.fillStyle = '#D96D88';
      ctx.fillRect(9, 8, 14, 5);
      ctx.fillRect(11, 13, 3, 6);
      ctx.fillRect(18, 13, 3, 6);
      ctx.fillStyle = '#F4B8C6';
      ctx.fillRect(10, 9, 12, 1);
      ctx.fillRect(12, 14, 1, 4);
      ctx.fillRect(19, 14, 1, 4);
      // Sky-blue heart clasp in center of ribbon
      ctx.fillStyle = '#5EB6DC';
      ctx.fillRect(14, 9, 4, 4);
      ctx.fillStyle = '#B8E8FA';
      ctx.fillRect(15, 10, 2, 2);
      // White corset lacing down the center
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(14, 18, 4, 12);
      ctx.fillStyle = '#6DB4D4';
      ctx.fillRect(15, 20, 2, 2);
      ctx.fillRect(15, 24, 2, 2);
      // Pink heart-apple waist trim at bottom
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 29, 32, 3);
      ctx.fillStyle = '#D96D88';
      ctx.fillRect(12, 27, 8, 5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(14, 28, 4, 3);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  const acIdolBack = track(
    (() => {
      const [c, ctx] = makeCanvas(32, 32);
      ctx.fillStyle = '#8CCCE6';
      ctx.fillRect(0, 0, 32, 32);
      // White ruffled back collar
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 32, 8);
      ctx.fillStyle = '#DCE8F0';
      ctx.fillRect(0, 7, 32, 1);
      // Cute pink & white heart + bow motif on back bodice (from reference Back view!)
      ctx.fillStyle = '#D96D88';
      ctx.fillRect(11, 13, 10, 8);
      ctx.fillRect(13, 21, 6, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(13, 15, 6, 5);
      ctx.fillStyle = '#5EB6DC';
      ctx.fillRect(14, 22, 4, 4);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  const acIdolSleeve = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 32);
      // Off-shoulder porcelain skin
      ctx.fillStyle = '#FDEEE6';
      ctx.fillRect(0, 0, 16, 5);
      // White ruffled top shoulder band
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 4, 16, 3);
      // Sky-blue puff sleeve with pink apple badge
      ctx.fillStyle = '#8CCCE6';
      ctx.fillRect(0, 7, 16, 7);
      ctx.fillStyle = '#D96D88';
      ctx.fillRect(6, 9, 4, 4);
      ctx.fillStyle = '#88C46E';
      ctx.fillRect(8, 8, 2, 1);
      // White lower ruffle cuff
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 14, 16, 2);
      // Bare forearm + white wrist cuff with blue dot
      ctx.fillStyle = '#FDEEE6';
      ctx.fillRect(0, 16, 16, 11);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 26, 16, 4);
      ctx.fillStyle = '#5EB6DC';
      ctx.fillRect(7, 27, 2, 2);
      ctx.fillStyle = '#FDEEE6';
      ctx.fillRect(0, 30, 16, 2);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  const acIdolSkirt = track(
    (() => {
      const [c, ctx] = makeCanvas(32, 16);
      // Crisp white idol skirt
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 32, 12);
      // Subtle pleat folds
      ctx.fillStyle = '#E4ECF2';
      for (let x = 0; x < 32; x += 4) {
        ctx.fillRect(x, 0, 1, 12);
      }
      // Signature pink ribbon trim wave
      ctx.fillStyle = '#D96D88';
      ctx.fillRect(0, 8, 32, 2);
      // Sky-blue ruffled under-petticoat hem
      ctx.fillStyle = '#8CCCE6';
      ctx.fillRect(0, 12, 32, 4);
      ctx.fillStyle = '#5CA8CC';
      for (let x = 0; x < 32; x += 3) {
        ctx.fillRect(x, 12, 1, 4);
      }
      return finalizeColorTexture(c, aniso);
    })(),
  );

  // Idol Outfit Iconic Sky-Blue & White Striped Thigh-High Stockings + Dark Brown Shoes!
  const acIdolStocking = track(
    (() => {
      const [c, ctx] = makeCanvas(16, 32);
      // Bare upper thigh
      ctx.fillStyle = '#FDEEE6';
      ctx.fillRect(0, 0, 16, 5);
      // Sky-blue ruffled stocking cuff
      ctx.fillStyle = '#8CCCE6';
      ctx.fillRect(0, 5, 16, 2);
      // Crisp sky-blue & white horizontal stripes
      for (let y = 7; y < 26; y++) {
        const blueStripe = Math.floor((y - 7) / 2) % 2 === 0;
        ctx.fillStyle = blueStripe ? '#9AD6EC' : '#FFFFFF';
        ctx.fillRect(0, y, 16, 1);
      }
      // Dark chocolate Mary-Jane shoe + tiny cream flower accent
      ctx.fillStyle = '#4A3832';
      ctx.fillRect(0, 26, 16, 6);
      ctx.fillStyle = '#332520';
      ctx.fillRect(0, 30, 16, 2);
      ctx.fillStyle = '#FFF0B8';
      ctx.fillRect(6, 27, 4, 2);
      return finalizeColorTexture(c, aniso);
    })(),
  );

  return {
    grassTop,
    grassSide,
    dirt,
    dirtPathTop,
    dirtPathSide,
    farmlandTop,
    farmlandWetTop,
    cobblestone,
    mossyCobble,
    oakBark,
    oakLogTop,
    oakPlanks,
    darkOakPlanks,
    cottagePlaster,
    terracottaRoof,
    leavesLush,
    leavesBlossom,
    appleRed,
    appleGold,
    appleCrateTop,
    barrelSide,
    hayBale,
    craftingTableTop,
    craftingTableSide,
    windowPane,
    water,
    signBoard,
    shopSignBoard,
    setSignLanguage,
    setSeason,
    lanternGlass,
    contactShadow,
    wildflowerRed,
    wildflowerYellow,
    wildflowerBlue,
    grassTuft,
    saplingSprite,
    acFaceNormal,
    acFaceBlink,
    acFaceHappy,
    acHeadSideLeft,
    acHeadSideRight,
    acHair,
    acHairTop,
    acHairOverlayFront,
    acHairOverlaySideLeft,
    acHairOverlaySideRight,
    acSkin,
    acShirtFront,
    acShirtBack,
    acShirtSleeve,
    acSkirtPleated,
    acStripedSock,
    acOverallsFront,
    acOverallsBack,
    acBeigeSleeve,
    acCheckeredBand,
    acClogShoe,
    acIdolFront,
    acIdolBack,
    acIdolSleeve,
    acIdolSkirt,
    acIdolStocking,
    dispose: () => {
      allTextures.forEach((t) => t.dispose());
    },
  };
}
