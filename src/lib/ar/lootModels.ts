/**
 * Trailhead Arcade PBR 3D Loot Model Factory for Three.js.
 * Matches docs/design-handoff/STYLE_GUIDE.md & loota-mobile's CoinEntity / GiftCardEntity:
 *  - Gold Coin: Brushed metallic gold (#FFC21A / #FFE066) with embossed rim
 *    (supporting all 4 CoinStyles: classic, thickRim, detailed, beveled) and 4-point compass star.
 *  - Epic Gift Card: Glossy iridescent purple-to-pink card (#A78BFA -> #8B5CF6 -> #EC4899)
 *    with raised metallic gold cross-ribbon and 4-point white/gold sparkle bow.
 *  - Perceptual Grounding: Soft radial ground light-pool shadow + distant horizon light shaft.
 */

import * as THREE from 'three';
import { DESIGN_TOKENS, type CoinStyle } from './experienceConfig';
import type { LootObjectType } from './types';

function createSoftRadialTexture(innerRgba: string, outerRgba: string, size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.04,
      size / 2,
      size / 2,
      size * 0.5
    );
    grad.addColorStop(0, innerRgba);
    grad.addColorStop(0.55, outerRgba);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createGiftCardFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Iridescent Epic Purple -> Magenta gradient matching STYLE_GUIDE.md
    const grad = ctx.createLinearGradient(0, 0, 512, 320);
    grad.addColorStop(0, DESIGN_TOKENS.colors.epicBright);
    grad.addColorStop(0.55, DESIGN_TOKENS.colors.epic);
    grad.addColorStop(1, DESIGN_TOKENS.colors.epicPink);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 320);

    // Subtle holographic sheen diagonal band
    const sheen = ctx.createLinearGradient(80, 0, 420, 320);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    sheen.addColorStop(0.55, 'rgba(255,255,255,0.06)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, 512, 320);

    // Deep pine outline frame
    ctx.strokeStyle = DESIGN_TOKENS.colors.ink;
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 492, 300);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createFourPointStarShape(outerR: number, innerR: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * Sets up bright outdoor studio lighting + synthetic environment reflections
 * so brushed metallic gold coins sparkle convincingly over live camera video.
 */
export function setupLootLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  const ambient = new THREE.HemisphereLight(0xfffdf8, 0x31493b, 1.35);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff4d6, 2.2);
  keyLight.position.set(4, 10, 6);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xdceeff, 1.1);
  rimLight.position.set(-6, 5, -5);
  scene.add(rimLight);

  // Build a lightweight procedural PMREM environment for metallic gold shine
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xeef6ff);

    const skyPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    skyPanel.position.set(0, 6, 0);
    skyPanel.rotation.x = Math.PI / 2;
    envScene.add(skyPanel);

    const warmPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 10),
      new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide })
    );
    warmPanel.position.set(6, 2, 5);
    warmPanel.lookAt(0, 0, 0);
    envScene.add(warmPanel);

    const groundPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color: 0x26c26b, side: THREE.DoubleSide })
    );
    groundPanel.position.set(0, -6, 0);
    groundPanel.rotation.x = Math.PI / 2;
    envScene.add(groundPanel);

    const renderTarget = pmrem.fromScene(envScene, 0.04);
    scene.environment = renderTarget.texture;
    pmrem.dispose();
  } catch {
    // Non-fatal on limited WebGL contexts
  }
}

export function createTrailheadCoinMesh(style: CoinStyle = 'classic'): THREE.Group {
  const root = new THREE.Group();
  root.name = 'trailhead_coin';

  const radius = 0.24; // ~19 inches diameter in AR for crisp visibility from 15m away
  const totalThickness = 0.046;

  // Rim & center proportions from COIN_STYLES_GUIDE.md
  const profile = {
    classic: { rimPct: 0.12, centerHeightPct: 0.64 },
    thickRim: { rimPct: 0.17, centerHeightPct: 0.52 },
    detailed: { rimPct: 0.13, centerHeightPct: 0.58 },
    beveled: { rimPct: 0.13, centerHeightPct: 0.62 },
  }[style];

  const goldRimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DESIGN_TOKENS.colors.gold),
    metalness: 0.88,
    roughness: 0.2,
    emissive: new THREE.Color(DESIGN_TOKENS.colors.goldDark),
    emissiveIntensity: 0.18,
  });

  const goldFaceMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DESIGN_TOKENS.colors.goldBright),
    metalness: 0.82,
    roughness: 0.26,
    emissive: new THREE.Color(DESIGN_TOKENS.colors.gold),
    emissiveIntensity: 0.14,
  });

  const starMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DESIGN_TOKENS.colors.surface),
    metalness: 0.3,
    roughness: 0.25,
    emissive: new THREE.Color(0xfff4cc),
    emissiveIntensity: 0.35,
  });

  // Outer raised rim ring (hollow cylinder wall via ExtrudeGeometry with hole)
  const rimOuter = new THREE.Shape();
  rimOuter.absarc(0, 0, radius, 0, Math.PI * 2, false);
  const rimHole = new THREE.Path();
  rimHole.absarc(0, 0, radius * (1 - profile.rimPct), 0, Math.PI * 2, true);
  rimOuter.holes.push(rimHole);

  const rimGeo = new THREE.ExtrudeGeometry(rimOuter, {
    depth: totalThickness,
    bevelEnabled: true,
    bevelThickness: style === 'beveled' ? 0.008 : 0.004,
    bevelSize: style === 'beveled' ? 0.008 : 0.004,
    bevelSegments: style === 'beveled' ? 3 : 2,
    curveSegments: 40,
  });
  rimGeo.center();
  const rimMesh = new THREE.Mesh(rimGeo, goldRimMat);
  root.add(rimMesh);

  // Recessed inner center disc
  const centerThickness = totalThickness * profile.centerHeightPct;
  const centerGeo = new THREE.CylinderGeometry(
    radius * (1 - profile.rimPct * 0.7),
    radius * (1 - profile.rimPct * 0.7),
    centerThickness,
    40
  );
  centerGeo.rotateX(Math.PI / 2);
  const centerMesh = new THREE.Mesh(centerGeo, goldFaceMat);
  root.add(centerMesh);

  // Optional stepped inner ridge for 'detailed' style
  if (style === 'detailed') {
    const innerRingGeo = new THREE.TorusGeometry(radius * 0.76, 0.007, 10, 40);
    const frontRidge = new THREE.Mesh(innerRingGeo, goldRimMat);
    frontRidge.position.z = centerThickness * 0.52;
    const backRidge = new THREE.Mesh(innerRingGeo, goldRimMat);
    backRidge.position.z = -centerThickness * 0.52;
    root.add(frontRidge, backRidge);
  }

  // Embossed 4-point Trailhead Compass Star on both front & back faces
  const starShape = createFourPointStarShape(radius * 0.48, radius * 0.16);
  const starGeo = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.009,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 1,
  });
  starGeo.center();

  const frontStar = new THREE.Mesh(starGeo, starMat);
  frontStar.position.z = centerThickness * 0.5 + 0.005;
  const backStar = new THREE.Mesh(starGeo, starMat);
  backStar.position.z = -(centerThickness * 0.5 + 0.005);
  root.add(frontStar, backStar);

  return root;
}

export function createTrailheadGiftCardMesh(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'trailhead_giftcard';

  const width = 0.44;
  const height = 0.28;
  const depth = 0.022;

  const faceTex = createGiftCardFaceTexture();
  const edgeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DESIGN_TOKENS.colors.epicDark),
    metalness: 0.55,
    roughness: 0.3,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    metalness: 0.42,
    roughness: 0.22,
    emissive: new THREE.Color(DESIGN_TOKENS.colors.epic),
    emissiveIntensity: 0.16,
  });

  const cardGeo = new THREE.BoxGeometry(width, height, depth);
  const cardMesh = new THREE.Mesh(cardGeo, [
    edgeMat,
    edgeMat,
    edgeMat,
    edgeMat,
    faceMat,
    faceMat,
  ]);
  root.add(cardMesh);

  // Raised metallic gold cross-ribbon (horizontal + vertical)
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DESIGN_TOKENS.colors.gold),
    metalness: 0.85,
    roughness: 0.2,
    emissive: new THREE.Color(DESIGN_TOKENS.colors.goldDark),
    emissiveIntensity: 0.2,
  });

  const hRibbon = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.006, 0.044, depth + 0.008),
    ribbonMat
  );
  const vRibbon = new THREE.Mesh(
    new THREE.BoxGeometry(0.044, height + 0.006, depth + 0.008),
    ribbonMat
  );
  vRibbon.position.x = -width * 0.16;
  root.add(hRibbon, vRibbon);

  // Center sparkle emblem at ribbon intersection (front & back)
  const bowStar = createFourPointStarShape(0.055, 0.02);
  const bowGeo = new THREE.ExtrudeGeometry(bowStar, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 1,
  });
  bowGeo.center();
  const bowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DESIGN_TOKENS.colors.surface),
    metalness: 0.35,
    roughness: 0.2,
    emissive: new THREE.Color(0xfff4cc),
    emissiveIntensity: 0.4,
  });

  const frontBow = new THREE.Mesh(bowGeo, bowMat);
  frontBow.position.set(-width * 0.16, 0, depth * 0.5 + 0.01);
  const backBow = new THREE.Mesh(bowGeo, bowMat);
  backBow.position.set(-width * 0.16, 0, -(depth * 0.5 + 0.01));
  root.add(frontBow, backBow);

  return root;
}

function createSoftBeaconTexture(rgb: [number, number, number]): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(w, h);
    const data = img.data;
    const [r, g, b] = rgb;

    // Smooth 2D Gaussian-feathered vertical light veil:
    //  - Horizontal falloff dissolves cleanly to 0 before left/right edges
    //  - Vertical falloff softly blooms around the lower-middle core and fades out at top & bottom
    for (let y = 0; y < h; y++) {
      const ny = y / (h - 1); // 0 = top, 1 = bottom
      // Vertical envelope: smooth rise from bottom (1 -> 0.58) and gentle sky fade toward top (0.58 -> 0)
      const vBottom = Math.min(1, Math.max(0, (1 - ny) / 0.22));
      const vTop = Math.min(1, Math.max(0, ny / 0.72));
      const vSmooth =
        (vBottom * vBottom * (3 - 2 * vBottom)) *
        Math.pow(vTop * vTop * (3 - 2 * vTop), 1.35);

      // Soft warm core boost near center-lower region where distance pill sits
      const coreDist = (ny - 0.56) / 0.24;
      const coreBoost = 0.65 + 0.55 * Math.exp(-coreDist * coreDist);

      for (let x = 0; x < w; x++) {
        const nx = (x / (w - 1)) * 2 - 1; // -1..1
        // Gaussian horizontal feathering (reaches ~0 well before |nx| = 1)
        const hGauss = Math.exp(-5.2 * nx * nx);
        // Edge clamp to guarantee exact zero alpha at canvas border
        const edgeFade = Math.max(0, 1 - Math.pow(Math.abs(nx), 4));
        const alpha = Math.min(1, vSmooth * hGauss * edgeFade * coreBoost);

        const idx = (y * w + x) * 4;
        // Brighten core slightly toward sunlit white for a natural atmospheric glow
        const coreWhite = Math.min(1, alpha * 0.55);
        data[idx] = Math.round(r + (255 - r) * coreWhite);
        data[idx + 1] = Math.round(g + (255 - g) * coreWhite);
        data[idx + 2] = Math.round(b + (255 - b) * coreWhite);
        data[idx + 3] = Math.round(alpha * 225);
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function createFarDistanceLabelSprite(isEpic: boolean): {
  sprite: THREE.Sprite;
  updateText: (text: string) => void;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  let lastText = '';

  const updateText = (text: string) => {
    if (!ctx || text === lastText) return;
    lastText = text;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padX = 32;
    const padY = 28;
    const pillW = canvas.width - padX * 2;
    const pillH = canvas.height - padY * 2;
    const radius = pillH / 2;
    const accentColor = isEpic ? DESIGN_TOKENS.colors.epicBright : DESIGN_TOKENS.colors.gold;

    // Deep grounding shadow + high-contrast Deep Pine fill so the pill pops over bright glow & sky
    ctx.save();
    ctx.shadowColor = 'rgba(10, 20, 14, 0.65)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    drawRoundedRect(ctx, padX, padY, pillW, pillH, radius);
    ctx.fillStyle = 'rgba(22, 38, 29, 0.95)';
    ctx.fill();
    ctx.restore();

    // Crisp outer accent keyline matching Trailhead Arcade rarity
    drawRoundedRect(ctx, padX, padY, pillW, pillH, radius);
    ctx.lineWidth = 7;
    ctx.strokeStyle = accentColor;
    ctx.stroke();

    // Subtle sunlit inner rim for tactile depth
    drawRoundedRect(ctx, padX + 5, padY + 5, pillW - 10, pillH - 10, radius - 5);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 253, 248, 0.22)';
    ctx.stroke();

    // Vibrant loot accent dot on left
    ctx.beginPath();
    ctx.arc(padX + 54, canvas.height / 2, 16, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = DESIGN_TOKENS.colors.surface;
    ctx.stroke();

    // High-contrast crisp monospace distance readout
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = DESIGN_TOKENS.colors.surface;
    ctx.font = '800 62px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2 + 24, canvas.height / 2 + 2);
    ctx.restore();

    tex.needsUpdate = true;
  };

  updateText('100 ft');

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  // Always draw strictly above farBeacon (renderOrder = 10) so additive glow never bleeds over the text
  sprite.renderOrder = 20;
  sprite.visible = false;
  return { sprite, updateText };
}

export interface LootEntityBundle {
  root: THREE.Group;
  visual: THREE.Group;
  groundShadow: THREE.Mesh;
  focusRing: THREE.Mesh;
  farBeacon: THREE.Mesh;
  farDistanceSprite: THREE.Sprite;
  updateFarDistanceText: (text: string) => void;
}

let sharedShadowTexture: THREE.CanvasTexture | null = null;
let sharedGoldBeaconTexture: THREE.CanvasTexture | null = null;
let sharedEpicBeaconTexture: THREE.CanvasTexture | null = null;

/**
 * Builds the complete AR loot entity with:
 *  - Animated visual mesh (Coin or Epic Gift Card)
 *  - Projected soft ground light-pool shadow for spatial stability cues
 *  - Pulsing focus halo ring (shown when targeted in summon hotspot)
 *  - Soft Gaussian-feathered distant glow + centered distance label (shown >30m in middle third)
 */
export function createLootEntityBundle(
  objectType: LootObjectType,
  coinStyle: CoinStyle = 'classic'
): LootEntityBundle {
  const root = new THREE.Group();
  const isEpic = objectType === 'giftCard';

  const visual = isEpic
    ? createTrailheadGiftCardMesh()
    : createTrailheadCoinMesh(coinStyle);
  root.add(visual);

  // Soft projected ground shadow / glow disc
  if (!sharedShadowTexture) {
    sharedShadowTexture = createSoftRadialTexture(
      'rgba(22, 38, 29, 0.42)',
      'rgba(255, 194, 26, 0.16)'
    );
  }
  const shadowMat = new THREE.MeshBasicMaterial({
    map: sharedShadowTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const groundShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), shadowMat);
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = -1.1;
  root.add(groundShadow);

  // Focus halo ring (Trailhead Blaze Orange / Gold ring)
  const ringColor = isEpic
    ? DESIGN_TOKENS.colors.epicBright
    : DESIGN_TOKENS.colors.goldBright;
  const focusRing = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.38, 40),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(ringColor),
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  root.add(focusRing);

  // Soft Gaussian-feathered vertical glow plane (billboarded around Y in ARViewport)
  if (!sharedGoldBeaconTexture) {
    sharedGoldBeaconTexture = createSoftBeaconTexture([255, 198, 42]);
  }
  if (!sharedEpicBeaconTexture) {
    sharedEpicBeaconTexture = createSoftBeaconTexture([167, 139, 250]);
  }
  const farBeacon = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 2.4),
    new THREE.MeshBasicMaterial({
      map: isEpic ? sharedEpicBeaconTexture : sharedGoldBeaconTexture,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  farBeacon.renderOrder = 10;
  farBeacon.visible = false;
  root.add(farBeacon);

  // Distance badge centered cleanly inside the soft glow
  const { sprite: farDistanceSprite, updateText: updateFarDistanceText } =
    createFarDistanceLabelSprite(isEpic);
  root.add(farDistanceSprite);

  return {
    root,
    visual,
    groundShadow,
    focusRing,
    farBeacon,
    farDistanceSprite,
    updateFarDistanceText,
  };
}

/**
 * Debug 360-degree horizon ring matching loota-mobile's ARViewContainer+Horizon.swift
 */
export function createDebugHorizonRing(): THREE.Mesh {
  const geo = new THREE.TorusGeometry(25, 0.06, 12, 72);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(DESIGN_TOKENS.colors.skyBright),
    transparent: true,
    opacity: 0.55,
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.visible = false;
  return ring;
}
