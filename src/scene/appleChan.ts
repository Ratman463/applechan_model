import * as THREE from 'three';
import { OrchardTextureLibrary } from './textures';
import { AppleChanAction, AppleChanOutfit } from './types';

export interface AppleChanTreeTarget {
  index: number;
  x: number;
  z: number;
  trunkRadius: number;
}

export interface AppleChanCallbacks {
  onTreeHugPeak: (treeIndex: number, worldPos: THREE.Vector3) => void;
  onWaterSplash: (worldPos: THREE.Vector3) => void;
  onSpeech: (text: string) => void;
  onActionChange: (action: AppleChanAction) => void;
}

const HUG_QUOTES = [
  '"Can I... hug you?" *squeezes the apple trunk tightly!*',
  '"Every tree in this orchard is my family!"',
  '"Oops, sorry... I forgot not everyone is as sturdy as an apple tree!"',
  '"Hehe, the leaves rustle happily whenever I give them a big hug!"',
];

const WATER_QUOTES = [
  '"Drink up, little saplings! Grow tall enough to reach the blue sky!"',
  '"Green like grass, blue like the sky—my two favorite colors!"',
  '"Five years of planting trees, and every sprout still makes me smile!"',
];

const WAVE_QUOTES = [
  '"Welcome to my apple orchard! Would you like a freshly picked apple?"',
  '"I can manage the whole orchard myself... though having you visit is nice!"',
  '"Look up! The blossoms look so pretty against the sky today!"',
];

// Reusable scratch math objects (zero GC in animation loop)
const _tmpPos = new THREE.Vector3();

export class AppleChanCharacter {
  public readonly group = new THREE.Group();
  public readonly hitProxy: THREE.Mesh;

  private readonly textures: OrchardTextureLibrary;
  private readonly callbacks: AppleChanCallbacks;
  private readonly groundHeightAt: (x: number, z: number) => number;
  private readonly trees: AppleChanTreeTarget[];
  private readonly nurserySpot = new THREE.Vector3(6.5, 0, 5.2);

  // Articulated hierarchy
  private readonly bodyRoot = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly backHairPivot = new THREE.Group();
  private readonly frontStrandPivot = new THREE.Group();
  private readonly leftArmPivot = new THREE.Group();
  private readonly rightArmPivot = new THREE.Group();
  private readonly leftLegPivot = new THREE.Group();
  private readonly rightLegPivot = new THREE.Group();
  private readonly skirtGroup = new THREE.Group();
  private readonly idolCoattailGroup = new THREE.Group();
  private readonly headbandGroup = new THREE.Group();
  private readonly springRibbonsGroup = new THREE.Group();
  private readonly idolAppleClipGroup = new THREE.Group();
  private readonly wateringCanGroup = new THREE.Group();
  private readonly appleBasketGroup = new THREE.Group();

  // Swappable materials
  private readonly faceMat: THREE.MeshStandardMaterial;
  private readonly torsoFrontMat: THREE.MeshStandardMaterial;
  private readonly torsoBackMat: THREE.MeshStandardMaterial;
  private readonly torsoSideMat: THREE.MeshStandardMaterial;
  private readonly armMat: THREE.MeshStandardMaterial;
  private readonly legMat: THREE.MeshStandardMaterial;
  private readonly skirtMat: THREE.MeshStandardMaterial;

  // State machine
  private outfit: AppleChanOutfit = 'common';
  private action: AppleChanAction = 'stroll';
  private actionTimer = 0;
  private blinkTimer = 2.6;
  private isBlinking = false;
  private walkPhase = 0;
  private targetPos = new THREE.Vector3(0, 0, 2.2);
  private targetTree: AppleChanTreeTarget | null = null;
  private hasTriggeredPeak = false;
  private hugQuoteIdx = 0;
  private waterQuoteIdx = 0;
  private waveQuoteIdx = 0;

  // Scenic orchard patrol waypoints along the dirt paths
  private readonly waypoints: [number, number][] = [
    [0.0, 2.6],
    [-3.4, 2.2],
    [-5.8, -1.5],
    [-2.0, -4.6],
    [2.4, -3.5],
    [5.2, 0.5],
    [4.4, 4.4],
    [0.5, 6.2],
  ];
  private waypointIdx = 0;
  private idlePause = 0;

  constructor(
    textures: OrchardTextureLibrary,
    groundHeightAt: (x: number, z: number) => number,
    trees: AppleChanTreeTarget[],
    callbacks: AppleChanCallbacks,
  ) {
    this.textures = textures;
    this.groundHeightAt = groundHeightAt;
    this.trees = trees;
    this.callbacks = callbacks;

    this.group.name = 'AppleChan';
    this.group.add(this.bodyRoot);

    // Materials with calibrated PBR roughness differences (soft cotton fabric vs glossy flower/hair accents)
    this.faceMat = new THREE.MeshStandardMaterial({
      map: textures.acFaceNormal,
      roughness: 0.72,
      metalness: 0.0,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      map: textures.acSkin,
      roughness: 0.72,
      metalness: 0.0,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      map: textures.acHair,
      roughness: 0.56,
      metalness: 0.04,
    });
    this.torsoFrontMat = new THREE.MeshStandardMaterial({
      map: textures.acShirtFront,
      roughness: 0.85,
      metalness: 0.0,
    });
    this.torsoBackMat = new THREE.MeshStandardMaterial({
      map: textures.acShirtBack,
      roughness: 0.85,
      metalness: 0.0,
    });
    this.torsoSideMat = new THREE.MeshStandardMaterial({
      color: 0x89c0df,
      roughness: 0.85,
      metalness: 0.0,
    });
    this.armMat = new THREE.MeshStandardMaterial({
      map: textures.acShirtSleeve,
      roughness: 0.82,
      metalness: 0.0,
    });
    this.legMat = new THREE.MeshStandardMaterial({
      map: textures.acStripedSock,
      roughness: 0.86,
      metalness: 0.0,
    });
    this.skirtMat = new THREE.MeshStandardMaterial({
      map: textures.acSkirtPleated,
      roughness: 0.86,
      metalness: 0.0,
    });
    const skirtMat = this.skirtMat;

    // Soft radial contact shadow flush under Apple-chan's feet
    const shadowGeo = new THREE.PlaneGeometry(1.15, 1.15);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.position.y = 0.025;
    this.group.add(contactShadow);

    // -----------------------------------------------------------------------
    // 1. LEGS (petite Minecraft proportions, 0.56 height, bottom at y = 0)
    // -----------------------------------------------------------------------
    const legGeo = new THREE.BoxGeometry(0.2, 0.56, 0.2);
    const leftLegMesh = new THREE.Mesh(legGeo, this.legMat);
    leftLegMesh.position.y = -0.28;
    leftLegMesh.castShadow = true;
    leftLegMesh.receiveShadow = true;
    this.leftLegPivot.position.set(-0.115, 0.56, 0);
    this.leftLegPivot.add(leftLegMesh);
    this.bodyRoot.add(this.leftLegPivot);

    const rightLegMesh = new THREE.Mesh(legGeo, this.legMat);
    rightLegMesh.position.y = -0.28;
    rightLegMesh.castShadow = true;
    rightLegMesh.receiveShadow = true;
    this.rightLegPivot.position.set(0.115, 0.56, 0);
    this.rightLegPivot.add(rightLegMesh);
    this.bodyRoot.add(this.rightLegPivot);

    // -----------------------------------------------------------------------
    // 2. TORSO (0.46w x 0.54h x 0.24d, centered at y = 0.83)
    // -----------------------------------------------------------------------
    const torsoGeo = new THREE.BoxGeometry(0.46, 0.54, 0.24);
    const torsoMaterials = [
      this.torsoSideMat, // +X
      this.torsoSideMat, // -X
      this.torsoSideMat, // +Y
      this.torsoSideMat, // -Y
      this.torsoFrontMat, // +Z (front with apple emblem!)
      this.torsoBackMat, // -Z
    ];
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMaterials);
    torsoMesh.position.y = 0.83;
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    this.bodyRoot.add(torsoMesh);

    // -----------------------------------------------------------------------
    // 3. 3D FLARED PLEATED WHITE SKIRT (Common Outfit signature detail)
    // -----------------------------------------------------------------------
    const skirtCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.24, 0.3),
      skirtMat,
    );
    skirtCore.position.y = 0.52;
    skirtCore.castShadow = true;
    skirtCore.receiveShadow = true;
    this.skirtGroup.add(skirtCore);

    // Angled pleated lower panels for genuine silhouette flair
    const frontPleat = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.16, 0.04),
      skirtMat,
    );
    frontPleat.position.set(0, 0.45, 0.16);
    frontPleat.rotation.x = -0.22;
    frontPleat.castShadow = true;
    this.skirtGroup.add(frontPleat);

    const backPleat = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.16, 0.04),
      skirtMat,
    );
    backPleat.position.set(0, 0.45, -0.16);
    backPleat.rotation.x = 0.22;
    backPleat.castShadow = true;
    this.skirtGroup.add(backPleat);

    const leftPleat = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.16, 0.32),
      skirtMat,
    );
    leftPleat.position.set(-0.27, 0.45, 0);
    leftPleat.rotation.z = -0.2;
    this.skirtGroup.add(leftPleat);

    const rightPleat = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.16, 0.32),
      skirtMat,
    );
    rightPleat.position.set(0.27, 0.45, 0);
    rightPleat.rotation.z = 0.2;
    this.skirtGroup.add(rightPleat);

    this.bodyRoot.add(this.skirtGroup);

    // Idol Outfit split sky-blue back coattail accent
    const coattailMat = new THREE.MeshStandardMaterial({
      color: 0x8ccce6,
      roughness: 0.8,
    });
    const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.04), coattailMat);
    tailL.position.set(-0.12, 0.44, -0.19);
    tailL.rotation.set(0.24, 0, -0.1);
    const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.04), coattailMat);
    tailR.position.set(0.12, 0.44, -0.19);
    tailR.rotation.set(0.24, 0, 0.1);
    this.idolCoattailGroup.add(tailL, tailR);
    this.idolCoattailGroup.visible = false;
    this.bodyRoot.add(this.idolCoattailGroup);

    // -----------------------------------------------------------------------
    // 4. ARMS (slim Minecraft Alex-style 3px proportions: 0.16w x 0.52h)
    // -----------------------------------------------------------------------
    const armGeo = new THREE.BoxGeometry(0.16, 0.5, 0.17);
    const leftArmMesh = new THREE.Mesh(armGeo, this.armMat);
    leftArmMesh.position.y = -0.21;
    leftArmMesh.castShadow = true;
    this.leftArmPivot.position.set(-0.32, 1.04, 0);
    this.leftArmPivot.add(leftArmMesh);
    this.bodyRoot.add(this.leftArmPivot);

    const rightArmMesh = new THREE.Mesh(armGeo, this.armMat);
    rightArmMesh.position.y = -0.21;
    rightArmMesh.castShadow = true;
    this.rightArmPivot.position.set(0.32, 1.04, 0);
    this.rightArmPivot.add(rightArmMesh);
    this.bodyRoot.add(this.rightArmPivot);

    // Held Props: Voxel Watering Can (attached to right hand, shown when watering)
    this.buildWateringCan();
    this.wateringCanGroup.position.set(0, -0.44, 0.16);
    this.wateringCanGroup.visible = false;
    this.rightArmPivot.add(this.wateringCanGroup);

    // Held Prop: Tiny Woven Apple Basket (attached to left hand when strolling)
    this.buildAppleBasket();
    this.appleBasketGroup.position.set(-0.02, -0.45, 0.08);
    this.appleBasketGroup.visible = true;
    this.leftArmPivot.add(this.appleBasketGroup);

    // -----------------------------------------------------------------------
    // 5. META MINECRAFT OC HEAD + 2ND-LAYER ALPHA-CUTOUT HAIR OVERLAY SHELL
    // -----------------------------------------------------------------------
    this.headGroup.position.set(0, 1.1, 0);
    this.bodyRoot.add(this.headGroup);

    const hairTopMat = new THREE.MeshStandardMaterial({
      map: textures.acHairTop,
      roughness: 0.58,
      metalness: 0.03,
    });
    const headSideLMat = new THREE.MeshStandardMaterial({
      map: textures.acHeadSideLeft,
      roughness: 0.65,
      metalness: 0.02,
    });
    const headSideRMat = new THREE.MeshStandardMaterial({
      map: textures.acHeadSideRight,
      roughness: 0.65,
      metalness: 0.02,
    });

    // Crisp 8x8x8 proportioned Minecraft base head cube (0.50 x 0.50 x 0.50)
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMats = [
      headSideRMat, // +X (front is on left of UV)
      headSideLMat, // -X (front is on right of UV)
      hairTopMat, // +Y
      skinMat, // -Y
      this.faceMat, // +Z (meta Minecraft anime face!)
      hairMat, // -Z
    ];
    const headMesh = new THREE.Mesh(headGeo, headMats);
    headMesh.position.y = 0.25;
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    this.headGroup.add(headMesh);

    // Authentic Minecraft 2nd-Layer Hat/Hair Overlay Shell (0.545 cube — zero harsh shadows on eyes!)
    const invisibleMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const overlayFrontMat = new THREE.MeshStandardMaterial({
      map: textures.acHairOverlayFront,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.56,
    });
    const overlaySideLMat = new THREE.MeshStandardMaterial({
      map: textures.acHairOverlaySideLeft,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.56,
    });
    const overlaySideRMat = new THREE.MeshStandardMaterial({
      map: textures.acHairOverlaySideRight,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.56,
    });
    const hatLayerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.545, 0.545, 0.545),
      [
        overlaySideRMat, // +X
        overlaySideLMat, // -X
        hairTopMat, // +Y
        invisibleMat, // -Y
        overlayFrontMat, // +Z (delicate asymmetrical bangs!)
        hairMat, // -Z
      ],
    );
    hatLayerMesh.position.y = 0.25;
    hatLayerMesh.castShadow = false;
    hatLayerMesh.receiveShadow = false;
    this.headGroup.add(hatLayerMesh);

    // Signature Double-Volume Front Hair Strand draped neatly over her left shoulder (+X side)
    this.frontStrandPivot.position.set(0.24, 0.04, 0.16);
    const frontStrandUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.3, 0.075),
      hairMat,
    );
    frontStrandUpper.position.set(0, -0.14, 0);
    frontStrandUpper.castShadow = true;
    this.frontStrandPivot.add(frontStrandUpper);
    const frontStrandTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.12, 0.065),
      hairMat,
    );
    frontStrandTip.position.set(0.005, -0.33, 0.005);
    this.frontStrandPivot.add(frontStrandTip);
    this.headGroup.add(this.frontStrandPivot);

    // Long Flowing Tapered Sage-Green Back Hair (multi-stepped Minecraft OC silhouette)
    this.backHairPivot.position.set(0, 0.22, -0.27);
    const backHairMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.64, 0.085),
      hairMat,
    );
    backHairMain.position.set(0, -0.26, -0.02);
    backHairMain.castShadow = true;
    this.backHairPivot.add(backHairMain);

    const backHairLower = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.24, 0.07),
      hairMat,
    );
    backHairLower.position.set(0, -0.64, -0.025);
    backHairLower.castShadow = true;
    this.backHairPivot.add(backHairLower);
    this.headGroup.add(this.backHairPivot);

    // Signature Sleek 3D Yellow 5-Petal Flower Hairpin (viewer's right / character's upper-left!)
    const flowerGroup = new THREE.Group();
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xf9ebb2,
      roughness: 0.35,
      metalness: 0.05,
    });
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0xdfa738,
      roughness: 0.3,
      metalness: 0.1,
    });
    const centerBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.055, 0.04),
      centerMat,
    );
    flowerGroup.add(centerBlock);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.3;
      const petal = new THREE.Mesh(
        new THREE.BoxGeometry(0.058, 0.058, 0.03),
        petalMat,
      );
      petal.position.set(Math.cos(angle) * 0.052, Math.sin(angle) * 0.052, -0.004);
      petal.rotation.z = angle;
      flowerGroup.add(petal);
    }
    flowerGroup.position.set(0.21, 0.41, 0.295);
    flowerGroup.rotation.set(-0.14, 0.22, -0.14);
    this.headGroup.add(flowerGroup);

    // Idol Outfit Cute Tiny Red Apple Hairclip (viewer's left / character's right!)
    const clipAppleMat = new THREE.MeshStandardMaterial({
      color: 0xd94540,
      roughness: 0.28,
    });
    const clipLeafMat = new THREE.MeshStandardMaterial({
      color: 0x67b552,
      roughness: 0.5,
    });
    const clipBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.085, 0.04),
      clipAppleMat,
    );
    const clipStem = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.035, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 }),
    );
    clipStem.position.set(0, 0.055, 0);
    const clipLeaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.025, 0.025),
      clipLeafMat,
    );
    clipLeaf.position.set(0.03, 0.05, 0);
    this.idolAppleClipGroup.add(clipBody, clipStem, clipLeaf);
    this.idolAppleClipGroup.position.set(-0.21, 0.40, 0.295);
    this.idolAppleClipGroup.rotation.set(-0.14, -0.22, 0.12);
    this.idolAppleClipGroup.visible = false;
    this.headGroup.add(this.idolAppleClipGroup);

    // Checkered Sky-Blue & White Headband (shared by Spring & Idol Outfits!)
    const bandMat = new THREE.MeshStandardMaterial({
      map: textures.acCheckeredBand,
      roughness: 0.72,
    });
    const headband = new THREE.Mesh(
      new THREE.BoxGeometry(0.565, 0.062, 0.565),
      bandMat,
    );
    headband.position.set(0, 0.445, 0);
    this.headbandGroup.add(headband);
    this.headbandGroup.visible = false;
    this.headGroup.add(this.headbandGroup);

    // Dusty-Pink Side Ribbons (Spring Outfit exclusive)
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xc9b2b5,
      roughness: 0.7,
    });
    const leftRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.12, 0.12),
      ribbonMat,
    );
    leftRibbon.position.set(-0.295, 0.4, 0.03);
    this.springRibbonsGroup.add(leftRibbon);
    const rightRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.12, 0.12),
      ribbonMat,
    );
    rightRibbon.position.set(0.295, 0.4, 0.03);
    this.springRibbonsGroup.add(rightRibbon);
    this.springRibbonsGroup.visible = false;
    this.headGroup.add(this.springRibbonsGroup);

    // Invisible simplified raycast hit proxy for effortless clicking
    this.hitProxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.85, 0.95),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.hitProxy.position.y = 0.92;
    this.hitProxy.userData = { clickable: 'appleChan' };
    this.group.add(this.hitProxy);

    // Initial placement on the orchard dirt path near the center
    const startX = -0.6;
    const startZ = 2.8;
    this.group.position.set(startX, this.groundHeightAt(startX, startZ), startZ);
    this.group.rotation.y = 0.3;
  }

  private buildWateringCan(): void {
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x6eaad4,
      roughness: 0.32,
      metalness: 0.45,
    });
    const spoutTipMat = new THREE.MeshStandardMaterial({
      color: 0xdfb95b,
      roughness: 0.25,
      metalness: 0.72,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.24), metalMat);
    const spout = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.24), metalMat);
    spout.position.set(0, 0.04, 0.2);
    spout.rotation.x = -0.35;
    const rose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), spoutTipMat);
    rose.position.set(0, 0.08, 0.32);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.18), metalMat);
    handle.position.set(0, 0.14, -0.04);
    this.wateringCanGroup.add(body, spout, rose, handle);
  }

  private buildAppleBasket(): void {
    const weaveMat = new THREE.MeshStandardMaterial({
      map: this.textures.oakPlanks.map,
      roughness: 0.88,
    });
    const redMat = new THREE.MeshStandardMaterial({
      map: this.textures.appleRed.map,
      roughness: 0.28,
    });
    const basketBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.18, 0.24),
      weaveMat,
    );
    const handleArch = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.04, 0.04),
      weaveMat,
    );
    handleArch.position.set(0, 0.16, 0);
    const handleL = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.16, 0.04),
      weaveMat,
    );
    handleL.position.set(-0.12, 0.08, 0);
    const handleR = handleL.clone();
    handleR.position.x = 0.12;

    // 3 glossy mini apples tucked inside
    const a1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), redMat);
    a1.position.set(-0.05, 0.1, 0.02);
    const a2 = a1.clone();
    a2.position.set(0.05, 0.1, -0.02);
    const a3 = a1.clone();
    a3.position.set(0.0, 0.13, 0.03);

    this.appleBasketGroup.add(basketBase, handleArch, handleL, handleR, a1, a2, a3);
  }

  public setOutfit(outfit: AppleChanOutfit): void {
    this.outfit = outfit;
    if (outfit === 'common') {
      this.torsoFrontMat.map = this.textures.acShirtFront;
      this.torsoBackMat.map = this.textures.acShirtBack;
      this.torsoSideMat.color.setHex(0x89c0df);
      this.armMat.map = this.textures.acShirtSleeve;
      this.legMat.map = this.textures.acStripedSock;
      this.skirtMat.map = this.textures.acSkirtPleated;
      this.skirtGroup.visible = true;
      this.idolCoattailGroup.visible = false;
      this.headbandGroup.visible = false;
      this.springRibbonsGroup.visible = false;
      this.idolAppleClipGroup.visible = false;
    } else if (outfit === 'spring') {
      this.torsoFrontMat.map = this.textures.acOverallsFront;
      this.torsoBackMat.map = this.textures.acOverallsBack;
      this.torsoSideMat.color.setHex(0x82a6bc);
      this.armMat.map = this.textures.acBeigeSleeve;
      this.legMat.map = this.textures.acClogShoe;
      this.skirtGroup.visible = false;
      this.idolCoattailGroup.visible = false;
      this.headbandGroup.visible = true;
      this.springRibbonsGroup.visible = true;
      this.idolAppleClipGroup.visible = false;
    } else {
      // Idol Outfit (from Apple-chan's Official Idol Sheet!)
      this.torsoFrontMat.map = this.textures.acIdolFront;
      this.torsoBackMat.map = this.textures.acIdolBack;
      this.torsoSideMat.color.setHex(0x8ccce6);
      this.armMat.map = this.textures.acIdolSleeve;
      this.legMat.map = this.textures.acIdolStocking;
      this.skirtMat.map = this.textures.acIdolSkirt;
      this.skirtGroup.visible = true;
      this.idolCoattailGroup.visible = true;
      this.headbandGroup.visible = true;
      this.springRibbonsGroup.visible = false;
      this.idolAppleClipGroup.visible = true;
    }
    this.torsoFrontMat.needsUpdate = true;
    this.torsoBackMat.needsUpdate = true;
    this.armMat.needsUpdate = true;
    this.legMat.needsUpdate = true;
    this.skirtMat.needsUpdate = true;
  }

  public getOutfit(): AppleChanOutfit {
    return this.outfit;
  }

  public getWorldPosition(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.group.position);
  }

  public commandHugTree(treeIndex?: number): void {
    if (this.trees.length === 0) return;
    let chosen: AppleChanTreeTarget;
    if (treeIndex !== undefined && this.trees[treeIndex]) {
      chosen = this.trees[treeIndex];
    } else {
      // Pick closest tree to Apple-chan (or alternate slightly so she visits different trees)
      let bestDist = Infinity;
      chosen = this.trees[0];
      for (const t of this.trees) {
        const dx = t.x - this.group.position.x;
        const dz = t.z - this.group.position.z;
        const d = dx * dx + dz * dz;
        if (d < bestDist && d > 1.2) {
          bestDist = d;
          chosen = t;
        }
      }
    }
    this.targetTree = chosen;
    // Stand right flush against the trunk facing it
    const dx = this.group.position.x - chosen.x;
    const dz = this.group.position.z - chosen.z;
    const dist = Math.hypot(dx, dz) || 1;
    const hugDist = chosen.trunkRadius + 0.36;
    this.targetPos.set(
      chosen.x + (dx / dist) * hugDist,
      0,
      chosen.z + (dz / dist) * hugDist,
    );
    this.action = 'hug';
    this.actionTimer = 0;
    this.hasTriggeredPeak = false;
    this.wateringCanGroup.visible = false;
    this.appleBasketGroup.visible = false;
    this.callbacks.onActionChange('hug');
  }

  public commandWaterSaplings(): void {
    this.targetTree = null;
    this.targetPos.copy(this.nurserySpot);
    this.action = 'water';
    this.actionTimer = 0;
    this.hasTriggeredPeak = false;
    this.wateringCanGroup.visible = true;
    this.appleBasketGroup.visible = false;
    this.callbacks.onActionChange('water');
  }

  public commandWave(): void {
    this.targetTree = null;
    this.action = 'wave';
    this.actionTimer = 0;
    this.hasTriggeredPeak = false;
    this.wateringCanGroup.visible = false;
    this.appleBasketGroup.visible = true;
    this.callbacks.onActionChange('wave');
    const quote = WAVE_QUOTES[this.waveQuoteIdx % WAVE_QUOTES.length];
    this.waveQuoteIdx++;
    this.callbacks.onSpeech(quote);
  }

  private setFaceTexture(tex: THREE.CanvasTexture): void {
    if (this.faceMat.map !== tex) {
      this.faceMat.map = tex;
      this.faceMat.needsUpdate = true;
    }
  }

  public update(dt: number, elapsed: number): void {
    const clampedDt = Math.min(dt, 0.05);

    // Periodic cute blinking when not in happy > < mode
    this.blinkTimer -= clampedDt;
    if (this.blinkTimer <= 0) {
      if (this.isBlinking) {
        this.isBlinking = false;
        this.blinkTimer = 2.4 + Math.random() * 2.8;
      } else {
        this.isBlinking = true;
        this.blinkTimer = 0.13;
      }
    }

    let isMoving = false;
    let isHappyFace = false;

    if (this.action === 'stroll') {
      if (this.idlePause > 0) {
        this.idlePause -= clampedDt;
      } else {
        const [wx, wz] = this.waypoints[this.waypointIdx];
        this.targetPos.set(wx, 0, wz);
        const arrived = this.moveToward(this.targetPos.x, this.targetPos.z, 1.55, clampedDt);
        isMoving = !arrived;
        if (arrived) {
          this.waypointIdx = (this.waypointIdx + 1) % this.waypoints.length;
          this.idlePause = 1.4 + Math.random() * 1.6;
        }
      }
      this.appleBasketGroup.visible = true;
      this.wateringCanGroup.visible = false;
    } else if (this.action === 'hug' && this.targetTree) {
      const arrived = this.moveToward(this.targetPos.x, this.targetPos.z, 2.85, clampedDt);
      if (!arrived) {
        isMoving = true;
      } else {
        // Face directly into the tree trunk and give a big squeeze!
        const faceAngle = Math.atan2(
          this.targetTree.x - this.group.position.x,
          this.targetTree.z - this.group.position.z,
        );
        this.group.rotation.y = this.dampAngle(
          this.group.rotation.y,
          faceAngle,
          12,
          clampedDt,
        );
        this.actionTimer += clampedDt;
        isHappyFace = true;

        if (!this.hasTriggeredPeak && this.actionTimer > 0.25) {
          this.hasTriggeredPeak = true;
          _tmpPos.set(this.targetTree.x, this.group.position.y + 1.5, this.targetTree.z);
          this.callbacks.onTreeHugPeak(this.targetTree.index, _tmpPos);
          const quote = HUG_QUOTES[this.hugQuoteIdx % HUG_QUOTES.length];
          this.hugQuoteIdx++;
          this.callbacks.onSpeech(quote);
        }

        // Hug pose: arms wrapped forward and inward around the trunk, leaning affectionately
        const squeeze = Math.sin(this.actionTimer * 7) * 0.08;
        this.leftArmPivot.rotation.x = THREE.MathUtils.damp(
          this.leftArmPivot.rotation.x,
          -1.45,
          10,
          clampedDt,
        );
        this.rightArmPivot.rotation.x = THREE.MathUtils.damp(
          this.rightArmPivot.rotation.x,
          -1.45,
          10,
          clampedDt,
        );
        this.leftArmPivot.rotation.z = THREE.MathUtils.damp(
          this.leftArmPivot.rotation.z,
          0.36 + squeeze,
          10,
          clampedDt,
        );
        this.rightArmPivot.rotation.z = THREE.MathUtils.damp(
          this.rightArmPivot.rotation.z,
          -0.36 - squeeze,
          10,
          clampedDt,
        );
        this.headGroup.rotation.z = THREE.MathUtils.damp(
          this.headGroup.rotation.z,
          0.16,
          8,
          clampedDt,
        );
        this.bodyRoot.position.y = Math.abs(Math.sin(this.actionTimer * 5)) * 0.04;

        if (this.actionTimer >= 3.2) {
          this.action = 'stroll';
          this.targetTree = null;
          this.idlePause = 0.6;
          this.callbacks.onActionChange('stroll');
        }
      }
    } else if (this.action === 'water') {
      const arrived = this.moveToward(this.targetPos.x, this.targetPos.z, 2.6, clampedDt);
      if (!arrived) {
        isMoving = true;
      } else {
        // Face the nursery saplings at (8.5, 5.2)
        const faceAngle = Math.atan2(
          8.5 - this.group.position.x,
          5.2 - this.group.position.z,
        );
        this.group.rotation.y = this.dampAngle(
          this.group.rotation.y,
          faceAngle,
          10,
          clampedDt,
        );
        this.actionTimer += clampedDt;
        isHappyFace = this.actionTimer > 0.4;

        // Tilt watering can rhythmically
        const pour = Math.sin(this.actionTimer * 5.5) * 0.2;
        this.rightArmPivot.rotation.x = THREE.MathUtils.damp(
          this.rightArmPivot.rotation.x,
          -1.05 + pour,
          10,
          clampedDt,
        );
        this.leftArmPivot.rotation.x = THREE.MathUtils.damp(
          this.leftArmPivot.rotation.x,
          0.25,
          10,
          clampedDt,
        );
        this.headGroup.rotation.x = THREE.MathUtils.damp(
          this.headGroup.rotation.x,
          0.22,
          8,
          clampedDt,
        );

        if (!this.hasTriggeredPeak && this.actionTimer > 0.35) {
          this.hasTriggeredPeak = true;
          _tmpPos.set(8.4, this.group.position.y + 0.7, 5.2);
          this.callbacks.onWaterSplash(_tmpPos);
          const quote = WATER_QUOTES[this.waterQuoteIdx % WATER_QUOTES.length];
          this.waterQuoteIdx++;
          this.callbacks.onSpeech(quote);
        }

        if (this.actionTimer >= 3.0) {
          this.action = 'stroll';
          this.wateringCanGroup.visible = false;
          this.appleBasketGroup.visible = true;
          this.callbacks.onActionChange('stroll');
        }
      }
    } else if (this.action === 'wave') {
      this.actionTimer += clampedDt;
      isHappyFace = true;
      // Cheerful little double-hop + enthusiastic right-hand wave!
      const hopPhase = this.actionTimer * 7.2;
      const hopHeight =
        this.actionTimer < 1.8 ? Math.max(0, Math.sin(hopPhase)) * 0.28 : 0;
      this.bodyRoot.position.y = hopHeight;
      this.rightArmPivot.rotation.x = THREE.MathUtils.damp(
        this.rightArmPivot.rotation.x,
        -2.55,
        12,
        clampedDt,
      );
      this.rightArmPivot.rotation.z = Math.sin(this.actionTimer * 15) * 0.32 - 0.2;
      this.leftArmPivot.rotation.x = THREE.MathUtils.damp(
        this.leftArmPivot.rotation.x,
        -0.3,
        10,
        clampedDt,
      );
      this.headGroup.rotation.z = Math.sin(this.actionTimer * 8) * 0.1;

      if (this.actionTimer >= 2.6) {
        this.action = 'stroll';
        this.callbacks.onActionChange('stroll');
      }
    }

    // Standard walking / idle limb kinematics when not locked in hug/water/wave peak
    const inCustomPose =
      (this.action === 'hug' && !isMoving) ||
      (this.action === 'water' && !isMoving) ||
      this.action === 'wave';

    if (!inCustomPose) {
      if (isMoving) {
        const strideSpeed = this.action === 'stroll' ? 7.2 : 10.5;
        this.walkPhase += clampedDt * strideSpeed;
        const swing = Math.sin(this.walkPhase) * 0.58;
        this.leftLegPivot.rotation.x = swing;
        this.rightLegPivot.rotation.x = -swing;
        this.leftArmPivot.rotation.x = -swing * 0.72;
        this.rightArmPivot.rotation.x = swing * 0.72;
        this.leftArmPivot.rotation.z = THREE.MathUtils.damp(
          this.leftArmPivot.rotation.z,
          0.08,
          10,
          clampedDt,
        );
        this.rightArmPivot.rotation.z = THREE.MathUtils.damp(
          this.rightArmPivot.rotation.z,
          -0.08,
          10,
          clampedDt,
        );
        // Cheerful bouncy step!
        this.bodyRoot.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.085;
        this.headGroup.rotation.z = Math.sin(this.walkPhase) * 0.05;
        this.headGroup.rotation.x = THREE.MathUtils.damp(
          this.headGroup.rotation.x,
          0,
          8,
          clampedDt,
        );
      } else {
        // Gentle cheerful breathing & head look-around
        this.leftLegPivot.rotation.x = THREE.MathUtils.damp(
          this.leftLegPivot.rotation.x,
          0,
          10,
          clampedDt,
        );
        this.rightLegPivot.rotation.x = THREE.MathUtils.damp(
          this.rightLegPivot.rotation.x,
          0,
          10,
          clampedDt,
        );
        this.leftArmPivot.rotation.x = THREE.MathUtils.damp(
          this.leftArmPivot.rotation.x,
          Math.sin(elapsed * 2.1) * 0.05,
          8,
          clampedDt,
        );
        this.rightArmPivot.rotation.x = THREE.MathUtils.damp(
          this.rightArmPivot.rotation.x,
          -Math.sin(elapsed * 2.1) * 0.05,
          8,
          clampedDt,
        );
        this.leftArmPivot.rotation.z = THREE.MathUtils.damp(
          this.leftArmPivot.rotation.z,
          0.08,
          8,
          clampedDt,
        );
        this.rightArmPivot.rotation.z = THREE.MathUtils.damp(
          this.rightArmPivot.rotation.z,
          -0.08,
          8,
          clampedDt,
        );
        this.bodyRoot.position.y = Math.sin(elapsed * 2.8) * 0.025;
        this.headGroup.rotation.y = Math.sin(elapsed * 0.9) * 0.24;
        this.headGroup.rotation.z = Math.sin(elapsed * 1.4) * 0.05;
        this.headGroup.rotation.x = THREE.MathUtils.damp(
          this.headGroup.rotation.x,
          0,
          8,
          clampedDt,
        );
      }
    } else {
      // Relax legs while hugging / watering / waving
      this.leftLegPivot.rotation.x = THREE.MathUtils.damp(
        this.leftLegPivot.rotation.x,
        0,
        10,
        clampedDt,
      );
      this.rightLegPivot.rotation.x = THREE.MathUtils.damp(
        this.rightLegPivot.rotation.x,
        0,
        10,
        clampedDt,
      );
      this.headGroup.rotation.y = THREE.MathUtils.damp(
        this.headGroup.rotation.y,
        0,
        10,
        clampedDt,
      );
    }

    // Gentle hair sway physics
    const hairTargetRot = isMoving ? 0.22 + Math.abs(Math.sin(this.walkPhase)) * 0.1 : 0.06;
    this.backHairPivot.rotation.x = THREE.MathUtils.damp(
      this.backHairPivot.rotation.x,
      hairTargetRot + Math.sin(elapsed * 2.3) * 0.04,
      8,
      clampedDt,
    );
    this.frontStrandPivot.rotation.z = Math.sin(elapsed * 2.6) * 0.04;

    // Expression selection
    if (isHappyFace) {
      this.setFaceTexture(this.textures.acFaceHappy);
    } else if (this.isBlinking) {
      this.setFaceTexture(this.textures.acFaceBlink);
    } else {
      this.setFaceTexture(this.textures.acFaceNormal);
    }

    // Always stay flush with ground height
    const groundY = this.groundHeightAt(this.group.position.x, this.group.position.z);
    this.group.position.y = THREE.MathUtils.damp(
      this.group.position.y,
      groundY,
      18,
      clampedDt,
    );
  }

  private moveToward(tx: number, tz: number, speed: number, dt: number): boolean {
    const dx = tx - this.group.position.x;
    const dz = tz - this.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.18) {
      return true;
    }
    const step = Math.min(dist, speed * dt);
    this.group.position.x += (dx / dist) * step;
    this.group.position.z += (dz / dist) * step;
    const desiredYaw = Math.atan2(dx, dz);
    this.group.rotation.y = this.dampAngle(this.group.rotation.y, desiredYaw, 10, dt);
    return false;
  }

  private dampAngle(current: number, target: number, lambda: number, dt: number): number {
    let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * (1 - Math.exp(-lambda * dt));
  }
}
