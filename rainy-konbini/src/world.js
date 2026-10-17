import * as THREE from 'three';
import {
  palette, toon, addMesh, addBox, addRoundedBox, addCylinder, addPlane,
  addTextPlane, basicTexture, flatMaterial, glassMaterial, glassReflectionTexture,
  reflectionPlane, glowSprite, addOutline,
} from './kit.js';
import { L, doorNormal } from './layout.js';
import { buildInterior } from './interior.js';
import { buildStreet, updateStreet } from './street.js';
import { buildWeather, updateWeather } from './effects.js';
import * as T from './textures.js';

function createTextures() {
  return {
    asphalt: T.makeAsphaltTexture(),
    pavement: T.makePavementTexture(),
    storeFloor: T.makeStoreFloorTexture(),
    sign: T.makeSignTexture(),
    verticalSign: T.makeVerticalSignTexture(),
    poster: Array.from({ length: 6 }, (_, i) => T.makePosterTexture(i)),
    magazine: Array.from({ length: 8 }, (_, i) => T.makeMagazineTexture(i)),
    vending: T.makeVendingTexture(),
    streetSign: T.makeStreetSignTexture(),
    parkingSign: T.makeParkingSignTexture(),
    bulletin: T.makeBulletinTexture(),
    reflection: T.makeReflectionTexture(),
    storefrontReflection: T.makeStorefrontReflectionTexture(),
    glow: T.makeGlowTexture(),
    rainStreak: T.makeRainStreakTexture(),
    mat: T.makeMatTexture(),
    roadText: T.makeRoadTextTexture(),
    nameplate: T.makeNameplateTexture(),
    alleySign: T.makeAlleySignTexture(),
    openSign: T.makeOpenSignTexture(),
    aframe: T.makeAFrameTexture(),
    windowStickers: [
      T.makeWindowStickerTexture('ATM', '24H SERVICE'),
      T.makeWindowStickerTexture('Wi-Fi', 'FREE CONNECT'),
      T.makeWindowStickerTexture('COPY', 'マルチコピー'),
      T.makeWindowStickerTexture('宅配便', '24H 受付', { fg: '#28575d', accent: '#d95f49' }),
    ],
    glassReflection: glassReflectionTexture(),
    floorArrow: T.makeFloorArrowTexture(),
    doorDecal: T.makeDoorDecalTexture(),
    vanishing: T.makeVanishingPointTexture(),
  };
}

function buildPlinth(root, tex) {
  const g = new THREE.Group();
  g.name = 'plinth';
  root.add(g);

  addRoundedBox(g, 16.3, 0.85, 16.3, 0.13, 0x18232e, {
    position: [0, -0.45, 0], outline: 0.024, castShadow: true, receiveShadow: true,
    material: toon(0x1a2632, { emissive: 0x070c14, emissiveIntensity: 0.3 }),
  });

  // Thin brass edging turns the base into a collectible model plinth.
  addBox(g, 16.36, 0.045, 0.055, 0x9d8459, {
    position: [0, -0.055, 8.14], outline: 0.005,
  });
  addBox(g, 16.36, 0.045, 0.055, 0x9d8459, {
    position: [0, -0.055, -8.14], outline: 0.005,
  });
  addBox(g, 0.055, 0.045, 16.36, 0x9d8459, {
    position: [8.14, -0.055, 0], outline: 0.005,
  });
  addBox(g, 0.055, 0.045, 16.36, 0x9d8459, {
    position: [-8.14, -0.055, 0], outline: 0.005,
  });
  addBox(g, 16.33, 0.025, 16.33, 0x2b3b44, {
    position: [0, -0.085, 0], outline: 0.002, castShadow: false,
  });

  const plaqueFrame = addBox(g, 5.4, 0.6, 0.035, 0x24363a, {
    position: [0, -0.43, 8.155], outline: 0.004, castShadow: false,
  });
  addPlane(g, 5.2, 0.5, basicTexture(tex.nameplate, { toneMapped: false }), {
    position: [0, -0.43, 8.177],
  });
  return g;
}

function addRoadPlane(parent, width, depth, x, z, y, material, rotationY = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rotationY;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = false;
  mesh.renderOrder = 2;
  parent.add(mesh);
  return mesh;
}

function buildGround(root, tex) {
  const g = new THREE.Group();
  g.name = 'ground';
  root.add(g);

  addBox(g, 15.92, 0.16, 15.92, 0x24303d, {
    position: [0, 0.02, 0], outline: 0.018, castShadow: false, receiveShadow: true,
    material: toon(0x5b6d82, { map: tex.asphalt, emissive: 0x101c2b, emissiveIntensity: 0.5 }),
  });

  // A thin clear-coated layer catches the neon and streetlamps like wet asphalt.
  const wetLayer = new THREE.Mesh(new THREE.PlaneGeometry(15.7, 15.7), new THREE.MeshPhysicalMaterial({
    color: 0x0d1d2a, transparent: true, opacity: 0.3, roughness: 0.06,
    metalness: 0.32, clearcoat: 1, clearcoatRoughness: 0.025,
    depthWrite: false, side: THREE.DoubleSide,
  }));
  wetLayer.rotation.x = -Math.PI / 2;
  wetLayer.position.y = L.asphaltTop + 0.004;
  wetLayer.renderOrder = 1;
  g.add(wetLayer);

  const pavementMat = toon(0xa9b1bc, { map: tex.pavement, emissive: 0x0d151e, emissiveIntensity: 0.4 });
  addBox(g, 10.55, 0.2, 1.1, palette.pavement, {
    position: [-2.625, 0.1, 2.05], outline: 0.014, castShadow: false, receiveShadow: true,
    material: pavementMat,
  });
  addBox(g, 1.1, 0.2, 9.4, palette.pavement, {
    position: [2.05, 0.1, -3.2], outline: 0.014, castShadow: false, receiveShadow: true,
    material: pavementMat,
  });

  // Curbs and gutters.
  const curbMat = toon(0xa7a8a5);
  addBox(g, 10.75, 0.15, 0.15, 0xa7a8a5, {
    position: [-2.58, 0.155, 2.63], outline: 0.008, material: curbMat,
  });
  addBox(g, 0.15, 0.15, 9.55, 0xa7a8a5, {
    position: [2.63, 0.155, -3.24], outline: 0.008, material: curbMat,
  });
  addBox(g, 10.7, 0.03, 0.19, 0x2f3a43, {
    position: [-2.58, 0.114, 2.79], outline: 0, castShadow: false,
  });
  addBox(g, 0.19, 0.03, 9.55, 0x2f3a43, {
    position: [2.79, 0.114, -3.24], outline: 0, castShadow: false,
  });

  // Tactile paving strips.
  const tactileMat = toon(0xc7a449, { emissive: 0x34250b, emissiveIntensity: 0.2 });
  addBox(g, 9.6, 0.018, 0.17, 0xc7a449, {
    position: [-2.95, 0.211, 2.23], outline: 0, castShadow: false, material: tactileMat,
  });
  addBox(g, 0.17, 0.018, 8.7, 0xc7a449, {
    position: [2.2, 0.211, -3.35], outline: 0, castShadow: false, material: tactileMat,
  });
  addBox(g, 0.17, 0.018, 0.95, 0xc7a449, {
    position: [1.54, 0.211, 1.92], outline: 0, castShadow: false, material: tactileMat,
  });

  // Road paint, crosswalks, parking bay and a stop message.
  const paintMat = new THREE.MeshBasicMaterial({
    color: 0xd8e2df, transparent: true, opacity: 0.46, depthWrite: false, side: THREE.DoubleSide,
  });
  for (let i = 0; i < 7; i++) {
    addRoadPlane(g, 0.32, 1.2, 2.9 + i * 0.74, 3.55, L.asphaltTop + 0.012, paintMat);
  }
  for (let i = 0; i < 7; i++) {
    addRoadPlane(g, 1.35, 0.34, 6.46, 2.92 + i * 0.74, L.asphaltTop + 0.012, paintMat);
  }
  addRoadPlane(g, 4.8, 0.13, 5.05, 2.9, L.asphaltTop + 0.012, paintMat);
  addRoadPlane(g, 0.13, 4.6, 2.9, 5.05, L.asphaltTop + 0.012, paintMat);
  addRoadPlane(g, 2.9, 0.12, 4.28, 7.1, L.asphaltTop + 0.012, paintMat);
  // parking bay
  addRoadPlane(g, 0.11, 3.0, 3.0, -3.35, L.asphaltTop + 0.012, paintMat);
  addRoadPlane(g, 0.11, 3.0, 5.3, -3.35, L.asphaltTop + 0.012, paintMat);
  addRoadPlane(g, 2.3, 0.11, 4.15, -4.83, L.asphaltTop + 0.012, paintMat);
  addRoadPlane(g, 2.3, 0.11, 4.15, -1.87, L.asphaltTop + 0.012, paintMat);
  const word = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.82), new THREE.MeshBasicMaterial({
    map: tex.roadText, transparent: true, opacity: 0.58, depthWrite: false, side: THREE.DoubleSide,
  }));
  word.rotation.x = -Math.PI / 2;
  word.position.set(5.25, L.asphaltTop + 0.014, 6.7);
  word.renderOrder = 2;
  g.add(word);

  // Parking stopper and tire marks.
  addBox(g, 1.4, 0.12, 0.16, 0xc1b9a6, {
    position: [4.15, 0.16, -4.55], rotation: [0, 0.02, 0], outline: 0.006, castShadow: false,
  });
  const tireMat = flatMaterial(0x1a222a, { transparent: true, opacity: 0.35 });
  for (let i = 0; i < 2; i++) {
    addRoadPlane(g, 0.08, 2.7, 3.7 + i * 1.15, -3.1, L.asphaltTop + 0.011, tireMat);
  }

  // Manhole cover.
  const manhole = new THREE.Group();
  manhole.position.set(4.35, L.asphaltTop + 0.014, -0.8);
  g.add(manhole);
  const cover = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), toon(0x55595a));
  cover.rotation.x = -Math.PI / 2;
  manhole.add(cover);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.018, 6, 32), toon(0x797b75));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.008;
  manhole.add(ring);
  for (let i = 0; i < 6; i++) {
    addBox(manhole, 0.53, 0.01, 0.012, 0x3e4345, {
      position: [0, 0.007, 0], rotation: [0, i * Math.PI / 6, 0], outline: 0, castShadow: false,
    });
  }

  // Drain grates along both gutters.
  const grateMat = toon(0x3c474b);
  for (let i = 0; i < 7; i++) {
    const drain = new THREE.Group();
    drain.position.set(-6.7 + i * 1.65, L.asphaltTop + 0.016, 2.79);
    g.add(drain);
    addBox(drain, 0.52, 0.02, 0.19, 0x313c41, { position: [0, 0, 0], outline: 0.002, castShadow: false });
    for (let s = 0; s < 6; s++) {
      addBox(drain, 0.045, 0.012, 0.15, 0x728085, {
        position: [-0.2 + s * 0.08, 0.012, 0], outline: 0, castShadow: false,
      });
    }
  }
  for (let i = 0; i < 6; i++) {
    const drain = new THREE.Group();
    drain.position.set(2.79, L.asphaltTop + 0.016, -6.3 + i * 1.6);
    g.add(drain);
    addBox(drain, 0.19, 0.02, 0.52, 0x313c41, { position: [0, 0, 0], outline: 0.002, castShadow: false });
    for (let s = 0; s < 6; s++) {
      addBox(drain, 0.15, 0.012, 0.045, 0x728085, {
        position: [0, 0.012, -0.2 + s * 0.08], outline: 0, castShadow: false,
      });
    }
  }

  return g;
}

function buildPuddlesAndReflections(root, tex) {
  const g = new THREE.Group();
  g.name = 'wet-ground';
  root.add(g);

  const puddleMat = new THREE.MeshPhysicalMaterial({
    color: 0x183648, roughness: 0.035, metalness: 0.34,
    clearcoat: 1, clearcoatRoughness: 0.03,
    transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false,
  });
  const puddles = [
    [-3.6, 3.55, 1.55, 0.65, 0.001],
    [-0.9, 4.25, 1.95, 0.72, 0.000],
    [1.65, 2.18, 0.72, 0.32, 0.001],
    [3.75, -1.2, 1.65, 0.58, 0.002],
    [5.2, 5.15, 0.95, 0.48, 0.000],
    [-7.05, 0.95, 0.62, 0.88, 0.004],
    [-2.7, 1.88, 0.58, 0.24, 0.003],
    [4.8, 2.0, 0.8, 0.38, 0.001],
    [-6.9, -3.4, 0.64, 0.85, 0.002],
    [0.9, 5.55, 1.35, 0.48, 0.002],
    [2.15, 4.4, 0.72, 0.32, 0.001],
  ];
  const puddleGlowMat = new THREE.MeshBasicMaterial({
    map: tex.glow, color: 0x6f8ba5, transparent: true, opacity: 0.035,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  puddles.forEach(([x, z, rx, rz, yOff], index) => {
    const isSidewalk = (z > 1.5 && z < 2.6) || (x > 1.5 && x < 2.6);
    const y = (isSidewalk ? L.sidewalkTop : L.asphaltTop) + 0.012 + yOff;
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 42), puddleMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = index * 0.47;
    mesh.scale.set(rx, rz, 1);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 2;
    g.add(mesh);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), puddleGlowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.scale.set(rx * 0.92, rz * 0.85, 1);
    glow.position.set(x, y + 0.002, z);
    glow.renderOrder = 3;
    g.add(glow);
  });

  const reflections = [
    { x: -2.6, z: 4.25, w: 5.4, l: 5.2, color: 0xffad61, opacity: 0.32, angle: 0 },
    { x: -0.7, z: 3.65, w: 2.8, l: 3.2, color: 0xffe4b2, opacity: 0.26, angle: 0.02 },
    { x: 0.95, z: 4.2, w: 1.2, l: 3.5, color: 0xff7b62, opacity: 0.24, angle: -0.04 },
    { x: -6.45, z: 3.25, w: 1.2, l: 2.9, color: 0xff8d79, opacity: 0.3, angle: 0.02 },
    { x: -6.3, z: 3.0, w: 0.8, l: 2.6, color: 0xffb477, opacity: 0.26, angle: 0.15 },
    { x: -4.7, z: 2.75, w: 0.9, l: 2.4, color: 0xc7e0de, opacity: 0.12, angle: 0 },
    { x: 5.0, z: 5.1, w: 0.6, l: 2.3, color: 0x7bc2cf, opacity: 0.16, angle: 0.25 },
    { x: 2.3, z: -2.8, w: 0.5, l: 2.0, color: 0xd8e8df, opacity: 0.14, angle: Math.PI / 2 },
    { x: 4.8, z: 5.4, w: 4.8, l: 3.6, color: 0x5e93a8, opacity: 0.11, angle: 0.1 },
    { x: -2.05, z: 1.87, w: 7.1, l: 1.15, color: 0xffbe6f, opacity: 0.24, angle: 0 },
    { x: -0.2, z: 1.78, w: 3.2, l: 0.9, color: 0xfff0c9, opacity: 0.2, angle: 0 },
    { x: 1.1, z: 3.95, w: 0.45, l: 2.5, color: 0x67d2cb, opacity: 0.3, angle: -0.02 },
    { x: -0.35, z: 3.8, w: 0.35, l: 2.2, color: 0xff9176, opacity: 0.28, angle: 0.03 },
    { x: -2.45, z: 3.55, w: 0.3, l: 2.0, color: 0xffd994, opacity: 0.25, angle: 0 },
    { x: -4.55, z: 3.3, w: 0.32, l: 2.1, color: 0x7ecfbd, opacity: 0.16, angle: -0.03 },
    { x: 5.62, z: 5.05, w: 0.32, l: 1.8, color: 0x62e0a0, opacity: 0.18, angle: 0.06 },
  ];
  reflections.forEach((r) => {
    const isSidewalk = (r.z > 1.5 && r.z < 2.6) || (r.x > 1.5 && r.x < 2.6);
    const group = new THREE.Group();
    group.position.set(r.x, (isSidewalk ? L.sidewalkTop : L.asphaltTop) + 0.018, r.z);
    group.rotation.y = r.angle;
    const mesh = reflectionPlane(r.w, r.l, r.color, r.opacity, tex.reflection);
    group.add(mesh);
    g.add(group);
  });

  // A few soft window-light pools on the pavement.
  const poolMat = new THREE.MeshBasicMaterial({
    map: tex.glow, color: 0xffb96e, transparent: true, opacity: 0.075,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  for (let i = 0; i < 3; i++) {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.5), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(-4.6 + i * 2.2, L.sidewalkTop + 0.012, 1.86);
    pool.renderOrder = 3;
    g.add(pool);
  }

  // Painted, elongated shop reflection on the wet front and side streets.
  function addFacadeReflection(x, z, width, length, rotationY, opacity) {
    const group = new THREE.Group();
    group.position.set(x, L.asphaltTop + 0.024, z);
    group.rotation.y = rotationY;
    const material = new THREE.MeshBasicMaterial({
      map: tex.storefrontReflection,
      color: 0xffffff,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    material.color.setRGB(1.15, 1.15, 1.15);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
    plane.rotation.x = -Math.PI / 2;
    plane.renderOrder = 4;
    group.add(plane);
    g.add(group);
    return group;
  }
  addFacadeReflection(-2.2, 4.7, 8.2, 4.3, 0, 0.6);
  addFacadeReflection(4.3, -2.3, 7.4, 3.6, Math.PI / 2, 0.34);

  // Coloured pools under the vending machine and streetlamp.
  const vendingPool = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.5), new THREE.MeshBasicMaterial({
    map: tex.glow, color: 0xff8875, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }));
  vendingPool.rotation.x = -Math.PI / 2;
  vendingPool.position.set(-6.5, L.asphaltTop + 0.025, 3.2);
  vendingPool.renderOrder = 4;
  g.add(vendingPool);

  const lampPool = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.0), new THREE.MeshBasicMaterial({
    map: tex.glow, color: 0xffb760, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }));
  lampPool.rotation.x = -Math.PI / 2;
  lampPool.position.set(-6.8, L.asphaltTop + 0.026, 3.7);
  lampPool.renderOrder = 4;
  g.add(lampPool);

  const broadPools = [
    { x: -2.5, z: 4.1, w: 9.5, l: 5.0, color: 0xffa95e, opacity: 0.11 },
    { x: 1.3, z: 3.25, w: 3.8, l: 3.0, color: 0xff8c6e, opacity: 0.08 },
    { x: 4.6, z: -1.8, w: 4.5, l: 4.0, color: 0x6c9caf, opacity: 0.06 },
  ];
  broadPools.forEach((pool) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pool.w, pool.l), new THREE.MeshBasicMaterial({
      map: tex.glow, color: pool.color, transparent: true, opacity: pool.opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pool.x, L.asphaltTop + 0.027, pool.z);
    mesh.renderOrder = 4;
    g.add(mesh);
  });

  return g;
}

function addWindowGlass(parent, width, height, position, rotationY, tex, opacity = 0.09) {
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, height), glassMaterial(opacity));
  glass.position.set(...position);
  glass.rotation.y = rotationY;
  glass.renderOrder = 6;
  parent.add(glass);
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.98, height * 0.96), new THREE.MeshBasicMaterial({
    map: tex.glassReflection, color: 0xbcd9e5, transparent: true, opacity: 0.07,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: true,
  }));
  overlay.position.set(...position);
  overlay.rotation.y = rotationY;
  overlay.position.z += rotationY === 0 ? 0.008 : 0;
  overlay.position.x += rotationY === Math.PI / 2 ? 0.008 : 0;
  overlay.renderOrder = 7;
  parent.add(overlay);
  return { glass, overlay };
}

function buildStoreShell(root, tex, anim) {
  const store = new THREE.Group();
  store.name = 'store';
  root.add(store);

  // Large exterior walls use a one-sided diffuse response so interior lamps do
  // not bleed through the shell onto the back alley.
  const wallMat = new THREE.MeshLambertMaterial({ color: palette.storeWall });
  const wallShadeMat = new THREE.MeshLambertMaterial({ color: palette.storeWallShade });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xb3a68f });

  addBox(store, 7.9, 3.34, 0.18, palette.storeWall, {
    position: [-2.175, 1.9, -6.05], outline: 0.022, material: wallMat,
  });
  addBox(store, 0.18, 3.34, 7.6, palette.storeWall, {
    position: [-6.05, 1.9, -2.3], outline: 0.022, material: wallMat,
  });
  addBox(store, 0.2, 3.34, 0.45, palette.storeWallShade, {
    position: [1.7, 1.9, -5.82], outline: 0.018, material: wallShadeMat,
  });
  addBox(store, 0.3, 3.34, 0.2, palette.storeWall, {
    position: [-5.96, 1.9, 1.47], outline: 0.018, material: wallMat,
  });
  addBox(store, 7.7, 0.38, 0.2, palette.deepTeal, {
    position: [-2.2, 3.2, 1.57], outline: 0.012,
  });
  addBox(store, 0.2, 0.38, 7.45, palette.deepTeal, {
    position: [1.7, 3.2, -2.32], outline: 0.012,
  });

  // Low kick panels and window sills.
  addBox(store, 6.4, 0.25, 0.12, palette.teal, {
    position: [-2.63, 0.33, 1.61], outline: 0.01,
  });
  addBox(store, 0.12, 0.25, 6.1, palette.teal, {
    position: [1.72, 0.33, -2.68], outline: 0.01,
  });
  addBox(store, 6.4, 0.045, 0.16, 0xb8b4a7, {
    position: [-2.63, 0.455, 1.64], outline: 0.004,
  });
  addBox(store, 0.16, 0.045, 6.1, 0xb8b4a7, {
    position: [1.75, 0.455, -2.68], outline: 0.004,
  });

  addWindowGlass(store, 6.35, 2.58, [-2.625, 1.71, 1.585], 0, tex, 0.075);
  addWindowGlass(store, 6.05, 2.58, [1.765, 1.71, -2.675], Math.PI / 2, tex, 0.075);

  const frameMat = toon(0xe8e2d3);
  const frameOutline = 0.006;
  [-5.8, -3.85, -1.9, 0.55].forEach((x) => {
    addBox(store, 0.085, 2.66, 0.11, 0xe8e2d3, {
      position: [x, 1.73, 1.64], outline: frameOutline, material: frameMat,
    });
  });
  addBox(store, 6.4, 0.08, 0.11, 0xe8e2d3, {
    position: [-2.63, 3.015, 1.64], outline: frameOutline, material: frameMat,
  });
  [-5.7, -3.8, -1.9, 0.35].forEach((z) => {
    addBox(store, 0.11, 2.66, 0.085, 0xe8e2d3, {
      position: [1.81, 1.73, z], outline: frameOutline, material: frameMat,
    });
  });
  addBox(store, 0.11, 0.08, 6.1, 0xe8e2d3, {
    position: [1.81, 3.015, -2.68], outline: frameOutline, material: frameMat,
  });

  // Door assembly aligned to the chamfer.
  const door = new THREE.Group();
  door.position.set(L.door.x, 0, L.door.z);
  door.rotation.y = L.door.angle;
  store.add(door);
  const doorW = L.door.width;
  addBox(door, 0.1, 2.52, 0.18, 0xdad3c3, {
    position: [-doorW / 2 + 0.05, 1.48, 0], outline: 0.007,
  });
  addBox(door, 0.1, 2.52, 0.18, 0xdad3c3, {
    position: [doorW / 2 - 0.05, 1.48, 0], outline: 0.007,
  });
  addBox(door, doorW, 0.12, 0.18, 0xdad3c3, {
    position: [0, 2.7, 0], outline: 0.007,
  });
  addBox(door, doorW, 0.18, 0.16, palette.deepTeal, {
    position: [0, 0.27, 0], outline: 0.006,
  });
  addBox(door, doorW, 0.07, 0.16, 0xd7d0c1, {
    position: [0, 2.57, 0], outline: 0.004,
  });

  const panels = [];
  [-1, 1].forEach((side) => {
    const panel = new THREE.Group();
    panel.position.set(side * 0.397, 0, 0);
    door.add(panel);
    const pw = 0.76;
    const ph = 2.18;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.08, ph - 0.1), glassMaterial(0.12));
    glass.position.set(0, 1.46, 0.01);
    glass.renderOrder = 8;
    panel.add(glass);
    addBox(panel, pw, 0.055, 0.05, 0xd8d1c1, {
      position: [0, 0.38, 0], outline: 0.003,
    });
    addBox(panel, pw, 0.055, 0.05, 0xd8d1c1, {
      position: [0, 2.53, 0], outline: 0.003,
    });
    addBox(panel, 0.05, ph, 0.05, 0xd8d1c1, {
      position: [-pw / 2 + 0.025, 1.46, 0], outline: 0.003,
    });
    addBox(panel, 0.05, ph, 0.05, 0xd8d1c1, {
      position: [pw / 2 - 0.025, 1.46, 0], outline: 0.003,
    });
    addBox(panel, 0.035, 0.44, 0.06, 0x7c8b89, {
      position: [side * (pw / 2 - 0.09), 1.33, 0.07], outline: 0.002,
    });
    panels.push(panel);
  });
  const decal = addTextPlane(door, tex.doorDecal, 0.52, 0.26, {
    position: [0.39, 1.92, 0.05], transparent: true, opacity: 0.85,
  });
  decal.renderOrder = 9;

  addBox(door, 0.38, 0.1, 0.16, 0x26363b, {
    position: [0, 2.82, 0.02], outline: 0.004,
  });
  addBox(door, 0.07, 0.022, 0.022, 0x79e3a2, {
    position: [0.1, 2.82, 0.11], outline: 0,
    material: flatMaterial(0x67de93, { toneMapped: false }),
  });
  anim.door = {
    panels,
    light: null,
    sensor: null,
    closed: 0.397,
    travel: 0.51,
  };

  // Door mat sits just outside the chamfer.
  const matGroup = new THREE.Group();
  matGroup.position.set(L.door.x + doorNormal.x * 0.48, L.sidewalkTop + 0.012, L.door.z + doorNormal.z * 0.48);
  matGroup.rotation.y = L.door.angle;
  store.add(matGroup);
  const doorMat = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.85), basicTexture(tex.mat));
  doorMat.rotation.x = -Math.PI / 2;
  doorMat.renderOrder = 2;
  matGroup.add(doorMat);

  // Canopy over the window and door.
  const canopy = new THREE.Group();
  canopy.position.set(0, 0, 0);
  store.add(canopy);
  addBox(canopy, 8.05, 0.1, 0.76, 0xefe3cd, {
    position: [-2.2, 2.96, 1.94], outline: 0.012,
  });
  addBox(canopy, 8.05, 0.06, 0.07, 0xc85845, {
    position: [-2.2, 2.94, 2.31], outline: 0.004,
  });
  addBox(canopy, 0.76, 0.1, 7.9, 0xefe3cd, {
    position: [2.06, 2.96, -2.3], outline: 0.012,
  });
  addBox(canopy, 0.07, 0.06, 7.9, 0xc85845, {
    position: [2.43, 2.94, -2.3], outline: 0.004,
  });
  const chamferCanopy = new THREE.Group();
  chamferCanopy.position.set(L.door.x, 0, L.door.z);
  chamferCanopy.rotation.y = L.door.angle;
  store.add(chamferCanopy);
  addBox(chamferCanopy, 1.83, 0.1, 0.76, 0xefe3cd, {
    position: [0, 2.96, 0.37], outline: 0.012,
  });
  addBox(chamferCanopy, 1.83, 0.06, 0.07, 0xc85845, {
    position: [0, 2.94, 0.74], outline: 0.004,
  });

  // A restrained mint LED rim under the awning pairs with the warm interior.
  const ledMat = flatMaterial(0x5ebdb2, { toneMapped: false });
  addBox(canopy, 8.02, 0.024, 0.022, 0x5ebdb2, {
    position: [-2.2, 2.905, 2.326], outline: 0, castShadow: false, material: ledMat,
  });
  addBox(canopy, 0.022, 0.024, 7.86, 0x5ebdb2, {
    position: [2.443, 2.905, -2.3], outline: 0, castShadow: false, material: ledMat,
  });
  addBox(chamferCanopy, 1.8, 0.024, 0.022, 0x5ebdb2, {
    position: [0, 2.905, 0.756], outline: 0, castShadow: false, material: ledMat,
  });

  const downlightPositions = [
    [-5.2, 2.91, 2.02],
    [-2.9, 2.91, 2.02],
    [-0.5, 2.91, 2.02],
    [1.15, 2.91, 1.95],
  ];
  downlightPositions.forEach((pos) => {
    addCylinder(store, 0.06, 0.085, 0.035, 0xd8d1bf, {
      position: [pos[0], pos[1], pos[2]], radialSegments: 12, outline: 0.002, castShadow: false,
    });
    addCylinder(store, 0.045, 0.045, 0.012, 0xffe2a2, {
      position: [pos[0], pos[1] - 0.025, pos[2]], radialSegments: 12, outline: 0, castShadow: false,
      material: flatMaterial(0xffdf9a, { toneMapped: false }),
    });
  });

  // Fascia band and signboards.
  addBox(store, 7.9, 0.76, 0.16, 0xf1e4ca, {
    position: [-2.175, 3.38, 1.64], outline: 0.014,
  });
  addBox(store, 0.16, 0.76, 7.62, 0xf1e4ca, {
    position: [1.82, 3.38, -2.29], outline: 0.014,
  });
  addBox(store, 1.7, 0.76, 0.16, 0xf1e4ca, {
    position: [L.door.x, 3.38, L.door.z], rotation: [0, L.door.angle, 0], outline: 0.014,
  });
  addBox(store, 7.9, 0.05, 0.18, palette.teal, {
    position: [-2.175, 3.02, 1.66], outline: 0.004,
  });
  addBox(store, 0.18, 0.05, 7.62, palette.teal, {
    position: [1.84, 3.02, -2.29], outline: 0.004,
  });
  addBox(store, 7.9, 0.035, 0.18, 0xc85b46, {
    position: [-2.175, 3.745, 1.66], outline: 0.003,
  });
  addBox(store, 0.18, 0.035, 7.62, 0xc85b46, {
    position: [1.84, 3.745, -2.29], outline: 0.003,
  });

  const signMat = basicTexture(tex.sign, { toneMapped: false });
  const frontSign = addPlane(store, 5.15, 0.65, signMat, {
    position: [-2.62, 3.38, 1.729],
  });
  frontSign.renderOrder = 5;
  const sideSign = addPlane(store, 4.25, 0.65, signMat, {
    position: [1.91, 3.38, -2.23], rotation: [0, Math.PI / 2, 0],
  });
  sideSign.renderOrder = 5;

  // Vertical projecting sign at the left end of the facade.
  const vSign = new THREE.Group();
  vSign.position.set(-5.42, 2.34, 1.88);
  store.add(vSign);
  addBox(vSign, 0.14, 1.62, 0.38, 0x183f47, { position: [0, 0, 0], outline: 0.008 });
  addBox(vSign, 0.05, 0.05, 0.38, 0x29484b, { position: [0, 0.84, 0], outline: 0.002 });
  addBox(vSign, 0.05, 0.05, 0.38, 0x29484b, { position: [0, -0.84, 0], outline: 0.002 });
  const vSignMat = basicTexture(tex.verticalSign, { toneMapped: false, side: THREE.DoubleSide });
  const sideA = addPlane(vSign, 0.36, 1.55, vSignMat, {
    position: [0.073, 0, 0], rotation: [0, Math.PI / 2, 0],
  });
  const sideB = addPlane(vSign, 0.36, 1.55, vSignMat, {
    position: [-0.073, 0, 0], rotation: [0, -Math.PI / 2, 0],
  });
  sideA.renderOrder = 6;
  sideB.renderOrder = 6;
  addBox(vSign, 0.7, 0.045, 0.045, 0x6d7d76, { position: [0.3, 0.75, -0.16], outline: 0, rotation: [0, 0.3, 0] });
  addBox(vSign, 0.7, 0.04, 0.04, 0x6d7d76, { position: [0.3, -0.75, -0.16], outline: 0, rotation: [0, 0.3, 0] });
  anim.flicker = { material: vSignMat, signObjects: [sideA, sideB], light: null, base: 1 };
  const vsLight = new THREE.PointLight(0xffdaa1, 2.2, 3.0, 2);
  vsLight.position.set(-5.4, 2.3, 2.12);
  store.add(vsLight);
  anim.flicker.light = vsLight;
  const vsGlow = glowSprite(tex.glow, 0xffc37b, 0.72, 0.12);
  vsGlow.position.set(-5.4, 2.35, 2.16);
  store.add(vsGlow);

  // Open sign inside the glass.
  const openSignMat = basicTexture(tex.openSign, { toneMapped: false, side: THREE.DoubleSide });
  addPlane(store, 0.38, 0.23, openSignMat, {
    position: [-1.12, 1.95, 1.59],
  }).renderOrder = 9;

  // Frosted service stickers on the shop windows.
  tex.windowStickers.slice(0, 3).forEach((sticker, index) => {
    const material = basicTexture(sticker, { transparent: true, side: THREE.DoubleSide, opacity: 0.88 });
    const decal = addPlane(store, 0.37, 0.21, material, {
      position: [-5.22 + index * 0.5, 2.34, 1.596],
    });
    decal.renderOrder = 9;
  });
  const sideStickerMat = basicTexture(tex.windowStickers[3], {
    transparent: true, side: THREE.DoubleSide, opacity: 0.86,
  });
  addPlane(store, 0.37, 0.21, sideStickerMat, {
    position: [1.785, 2.3, -1.15], rotation: [0, Math.PI / 2, 0],
  }).renderOrder = 9;

  // Roof slab, parapet and rooftop machinery.
  addBox(store, 8.2, 0.19, 7.95, 0xa89d8a, {
    position: [-2.14, 3.68, -2.28], outline: 0.016, material: roofMat,
  });
  addBox(store, 8.2, 0.18, 0.14, 0x9a907e, {
    position: [-2.14, 3.84, 1.55], outline: 0.006, material: roofMat,
  });
  addBox(store, 8.2, 0.18, 0.14, 0x9a907e, {
    position: [-2.14, 3.84, -6.11], outline: 0.006, material: roofMat,
  });
  addBox(store, 0.14, 0.18, 7.7, 0x9a907e, {
    position: [1.88, 3.84, -2.28], outline: 0.006, material: roofMat,
  });
  addBox(store, 0.14, 0.18, 7.7, 0x9a907e, {
    position: [-6.16, 3.84, -2.28], outline: 0.006, material: roofMat,
  });
  const roofUnit = new THREE.Group();
  roofUnit.position.set(-4.55, 3.77, -4.0);
  store.add(roofUnit);
  addRoundedBox(roofUnit, 0.95, 0.56, 0.7, 0.04, 0xbec4bd, { position: [0, 0.28, 0], outline: 0.008 });
  addBox(roofUnit, 0.58, 0.04, 0.58, 0x596867, { position: [0, 0.58, 0], outline: 0.004 });
  addCylinder(roofUnit, 0.25, 0.25, 0.025, 0x606d6a, {
    position: [0, 0.58, 0], rotation: [Math.PI / 2, 0, 0], radialSegments: 16, outline: 0.003,
  });
  for (let i = 0; i < 4; i++) {
    addBox(roofUnit, 0.04, 0.02, 0.5, 0x8c9692, {
      position: [-0.35 + i * 0.23, 0.58, 0], outline: 0, castShadow: false,
    });
  }
  addCylinder(store, 0.09, 0.1, 0.7, 0xaab1ab, {
    position: [0.8, 3.98, -5.15], radialSegments: 12, outline: 0.005,
  });
  addCylinder(store, 0.16, 0.16, 0.05, 0x7d8985, {
    position: [0.8, 4.35, -5.15], radialSegments: 12, outline: 0.003,
  });
  addCylinder(store, 0.045, 0.045, 0.8, 0x7b8782, {
    position: [-5.35, 4.15, -1.4], radialSegments: 8, outline: 0.003,
  });

  // Exterior conduits and a small utility box on the side wall.
  addCylinder(store, 0.045, 0.045, 3.1, 0x516461, {
    position: [1.62, 1.8, 1.36], radialSegments: 8, outline: 0.003,
  });
  addCylinder(store, 0.045, 0.045, 3.0, 0x516461, {
    position: [1.62, 1.8, -5.98], radialSegments: 8, outline: 0.003,
  });
  addBox(store, 0.3, 0.42, 0.12, 0xc9c4b7, {
    position: [1.59, 2.28, -1.43], outline: 0.005,
  });
  addBox(store, 0.22, 0.04, 0.02, 0x5d6c69, { position: [1.59, 2.38, -1.5], outline: 0 });
  addBox(store, 0.22, 0.04, 0.02, 0x5d6c69, { position: [1.59, 2.28, -1.5], outline: 0 });
  addBox(store, 0.22, 0.04, 0.02, 0x5d6c69, { position: [1.59, 2.18, -1.5], outline: 0 });

  // Back-of-house details.
  const backDoor = new THREE.Group();
  backDoor.position.set(-3.95, 0.22, -6.17);
  store.add(backDoor);
  addBox(backDoor, 0.86, 1.98, 0.08, 0x8e9a95, { position: [0, 0.99, 0], outline: 0.007 });
  addBox(backDoor, 0.62, 0.38, 0.02, 0x405558, { position: [0, 1.58, 0.055], outline: 0.003 });
  addBox(backDoor, 0.16, 0.025, 0.02, 0x9ea7a1, {
    position: [0.26, 1.02, 0.065], rotation: [0, 0, Math.PI / 2], outline: 0,
  });
  addBox(store, 0.55, 0.4, 0.35, 0xb9b8ab, {
    position: [-2.75, 0.42, -6.35], outline: 0.006,
  });
  addCylinder(store, 0.11, 0.11, 0.85, 0x808d87, {
    position: [-1.6, 0.64, -6.36], radialSegments: 12, outline: 0.004,
  });
  addCylinder(store, 0.18, 0.18, 0.06, 0x6f7d78, {
    position: [-1.6, 1.07, -6.36], radialSegments: 12, outline: 0.002,
  });
  addCylinder(store, 0.035, 0.035, 2.6, 0x5c6e69, {
    position: [-5.86, 1.55, -6.16], radialSegments: 8, outline: 0.003,
  });

  // Rear service facade: canopy, delivery signage, AC units, vents and pipework.
  addBox(store, 1.3, 0.08, 0.58, 0xefe3cd, {
    position: [-3.95, 2.42, -6.43], outline: 0.007,
  });
  addBox(store, 1.3, 0.035, 0.06, 0xc85845, {
    position: [-3.95, 2.39, -6.71], outline: 0.003,
  });
  const staffSign = addTextPlane(store, T.makeInteriorSignTexture('納品口', 'STAFF  ·  DELIVERY', {
    bg: '#f1e4ca', fg: '#2c4c4e', accent: '#d65e48', width: 700, height: 220,
  }), 1.05, 0.29, {
    position: [-3.95, 2.7, -6.18], rotation: [0, Math.PI, 0],
  });
  staffSign.renderOrder = 5;
  addBox(store, 0.95, 0.17, 0.35, 0xaaa99d, {
    position: [-3.95, 0.2, -6.37], outline: 0.004,
  });

  const backAC = new THREE.Group();
  backAC.position.set(-5.22, 2.16, -6.26);
  store.add(backAC);
  addRoundedBox(backAC, 0.92, 0.55, 0.3, 0.035, 0xbfc6bd, {
    position: [0, 0, 0], outline: 0.007,
  });
  addCylinder(backAC, 0.2, 0.2, 0.025, 0x5e706c, {
    position: [-0.22, 0.02, -0.16], rotation: [Math.PI / 2, 0, 0], radialSegments: 18, outline: 0.002,
  });
  for (let i = 0; i < 5; i++) {
    addBox(backAC, 0.018, 0.012, 0.4, 0x96a29d, {
      position: [0.16, -0.18 + i * 0.08, -0.17], outline: 0, castShadow: false,
    });
  }
  addBox(backAC, 1.02, 0.05, 0.06, 0x6e7b76, {
    position: [0, -0.32, -0.06], outline: 0,
  });
  addCylinder(store, 0.026, 0.026, 0.85, 0x6f7d77, {
    position: [-4.72, 1.74, -6.3], radialSegments: 6, outline: 0.001,
  });

  const backGroundAC = new THREE.Group();
  backGroundAC.position.set(1.0, 0.1, -6.48);
  store.add(backGroundAC);
  addRoundedBox(backGroundAC, 0.82, 0.56, 0.46, 0.035, 0xc6c9bd, {
    position: [0, 0.28, 0], outline: 0.007,
  });
  addCylinder(backGroundAC, 0.18, 0.18, 0.022, 0x74837d, {
    position: [0.12, 0.29, -0.24], rotation: [Math.PI / 2, 0, 0], radialSegments: 18, outline: 0.002,
  });
  for (let i = 0; i < 4; i++) {
    addBox(backGroundAC, 0.46, 0.015, 0.03, 0x98a49e, {
      position: [-0.06, 0.13 + i * 0.09, -0.245], outline: 0, castShadow: false,
    });
  }
  addCylinder(store, 0.025, 0.025, 1.2, 0x687873, {
    position: [0.62, 0.7, -6.36], radialSegments: 6, outline: 0.001,
  });

  // A maintenance ladder and a bundle of conduits break up the long rear wall.
  const ladder = new THREE.Group();
  ladder.position.set(-0.48, 0, -6.2);
  store.add(ladder);
  [-0.25, 0.25].forEach((x) => {
    addCylinder(ladder, 0.022, 0.022, 2.65, 0x64736e, {
      position: [x, 2.55, 0], radialSegments: 5, outline: 0.002,
    });
  });
  for (let i = 0; i < 8; i++) {
    addBox(ladder, 0.56, 0.022, 0.026, 0x76837e, {
      position: [0, 1.35 + i * 0.31, 0], outline: 0, castShadow: false,
    });
  }
  addCylinder(store, 0.032, 0.032, 3.15, 0x647570, {
    position: [-2.65, 1.68, -6.19], radialSegments: 6, outline: 0.002,
  });
  addCylinder(store, 0.028, 0.028, 2.8, 0x647570, {
    position: [-2.85, 1.52, -6.19], radialSegments: 6, outline: 0.002,
  });
  addBox(store, 0.3, 0.42, 0.11, 0xc5c1b4, {
    position: [0.45, 2.15, -6.20], outline: 0.004,
  });
  for (let i = 0; i < 3; i++) {
    addBox(store, 0.21, 0.022, 0.022, 0x5d6d68, {
      position: [0.45, 2.25 - i * 0.08, -6.26], outline: 0, castShadow: false,
    });
  }
  addBox(store, 0.78, 0.42, 0.08, 0x707e79, {
    position: [-5.85, 3.0, -6.17], outline: 0.004,
  });
  for (let i = 0; i < 5; i++) {
    addBox(store, 0.64, 0.025, 0.015, 0x4d5c58, {
      position: [-5.85, 2.87 + i * 0.06, -6.215], outline: 0, castShadow: false,
    });
  }
  // Subtle vertical cladding joints.
  for (let i = 0; i < 7; i++) {
    addBox(store, 0.018, 3.15, 0.018, 0xcbbd9f, {
      position: [-5.6 + i * 1.18, 1.75, -6.145], outline: 0, castShadow: false,
    });
  }

  // A small back lightbox keeps the shop identifiable from every orbit angle.
  addBox(store, 2.9, 0.43, 0.06, 0xeadcc1, {
    position: [-2.3, 3.1, -6.16], outline: 0.005,
  });
  addPlane(store, 2.76, 0.35, basicTexture(tex.sign, { toneMapped: false }), {
    position: [-2.3, 3.1, -6.195], rotation: [0, Math.PI, 0],
  }).renderOrder = 5;
  const backCam = new THREE.Group();
  backCam.position.set(-4.95, 3.12, -6.2);
  store.add(backCam);
  addBox(backCam, 0.32, 0.04, 0.08, 0x4c5c58, {
    position: [0, 0, 0], outline: 0.002,
  });
  addCylinder(backCam, 0.065, 0.075, 0.18, 0xcfcabb, {
    position: [0.02, -0.11, -0.06], rotation: [0.5, 0, 0], radialSegments: 8, outline: 0.003,
  });
  addCylinder(backCam, 0.028, 0.028, 0.06, 0x263638, {
    position: [0.02, -0.18, -0.16], rotation: [0.5, 0, 0], radialSegments: 8, outline: 0,
  });

  // Barred service window, meter box and a weathered poster on the alley wall.
  addBox(store, 0.08, 0.68, 0.8, 0x2b363a, {
    position: [-6.16, 2.02, -4.8], outline: 0.005,
  });
  for (let i = 0; i < 4; i++) {
    addBox(store, 0.035, 0.62, 0.025, 0x7a8580, {
      position: [-6.21, 2.02, -5.07 + i * 0.18], outline: 0, castShadow: false,
    });
  }
  addBox(store, 0.13, 0.52, 0.38, 0xb9b5a8, {
    position: [-6.16, 2.48, -3.35], outline: 0.004,
  });
  addBox(store, 0.1, 0.3, 0.24, 0x9da79f, {
    position: [-6.16, 1.24, -3.35], outline: 0.003,
  });
  addCylinder(store, 0.035, 0.035, 2.4, 0x667570, {
    position: [-6.18, 1.55, -5.8], radialSegments: 6, outline: 0.001,
  });
  addBox(store, 0.05, 0.68, 0.48, 0x5b4d3e, {
    position: [-6.16, 2.12, -1.63], outline: 0.004,
  });
  addPlane(store, 0.41, 0.58, basicTexture(T.makePosterTexture(5), { side: THREE.DoubleSide }), {
    position: [-6.19, 2.12, -1.63], rotation: [0, -Math.PI / 2, 0],
  });

  return store;
}

function buildStoreLighting(store, anim) {
  const lights = new THREE.Group();
  lights.name = 'store-lights';
  store.add(lights);

  const warm = [
    [-2.45, 2.55, -4.1, 7.4, 8.4],
    [-2.0, 2.5, -1.45, 8.0, 8.0],
    [0.45, 2.4, -0.7, 4.2, 4.8],
  ];
  warm.forEach(([x, y, z, intensity, distance]) => {
    const light = new THREE.PointLight(0xffd5a0, intensity, distance, 2);
    light.position.set(x, y, z);
    lights.add(light);
  });
  const coolerLight = new THREE.PointLight(0xc6e8ff, 2.2, 3.8, 2);
  coolerLight.position.set(-4.2, 1.7, -4.55);
  lights.add(coolerLight);

  const doorLight = new THREE.PointLight(0xffc47c, 1.5, 3.6, 2);
  doorLight.position.set(L.door.x + 0.7, 2.2, L.door.z + 0.7);
  lights.add(doorLight);
  anim.door.light = doorLight;

  const facadeSpill = new THREE.PointLight(0xffc67e, 1.7, 4.0, 2);
  facadeSpill.position.set(-1.1, 2.25, 2.25);
  lights.add(facadeSpill);

  // Small luminous halo sprites make the downlights read at a distance.
  const halo = glowSprite(anim.glowTex, 0xffd58f, 0.36, 0.22);
  halo.position.set(-1.7, 2.88, 2.06);
  store.add(halo);

  return lights;
}

function buildLighting(scene, anim) {
  const hemi = new THREE.HemisphereLight(0x809ccb, 0x28252d, 0.6);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0xb6c8e8, 1.45);
  moon.position.set(-9, 14, 8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -11;
  moon.shadow.camera.right = 11;
  moon.shadow.camera.top = 11;
  moon.shadow.camera.bottom = -11;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 35;
  moon.shadow.bias = -0.0003;
  moon.shadow.normalBias = 0.025;
  scene.add(moon);

  const rim = new THREE.DirectionalLight(0x5473a6, 0.65);
  rim.position.set(10, 7, -12);
  scene.add(rim);

  const frontFill = new THREE.DirectionalLight(0x9b7b9a, 0.32);
  frontFill.position.set(6, 5, 12);
  scene.add(frontFill);

  return { hemi, moon, rim, frontFill };
}

function smoothstep(edge0, edge1, value) {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

export function buildWorld(scene) {
  const tex = createTextures();
  const anim = {
    steamAnchors: [],
    glowTex: tex.glow,
    flicker: null,
    door: null,
    traffic: null,
    rain: null,
    ripples: [],
    glassDrips: [],
    eaveDrips: [],
    time: 0,
  };

  const root = new THREE.Group();
  root.name = 'rainy-konbini-diorama';
  scene.add(root);

  buildPlinth(root, tex);
  buildGround(root, tex);
  buildPuddlesAndReflections(root, tex);

  const store = buildStoreShell(root, tex, anim);
  buildStoreLighting(store, anim);
  const interior = buildInterior(store, tex, anim);

  const street = buildStreet(root, tex, anim);
  const weather = buildWeather(root, tex, anim);
  const lights = buildLighting(scene, anim);

  function update(t, dt) {
    anim.time = t;

    // Automatic door opens every seventeen seconds, just long enough for a gust of rain.
    const cycle = 19;
    const phase = (t + 7.2) % cycle;
    let open = 0;
    if (phase > 11.0 && phase < 15.8) {
      open = smoothstep(11.0, 12.2, phase) * (1 - smoothstep(14.7, 15.8, phase));
    }
    anim.door.panels.forEach((panel, index) => {
      const direction = index === 0 ? -1 : 1;
      panel.position.x = direction * (anim.door.closed + anim.door.travel * open);
    });
    anim.door.light.intensity = 1.5 + open * 1.6;

    // Faint electrical instability in the projecting sign.
    const t2 = t * 0.82;
    let flicker = 0.965 + Math.sin(t2 * 8.3) * 0.018 + Math.sin(t2 * 21.7 + 1.7) * 0.012;
    if (Math.sin(t2 * 0.52 + 2.1) > 0.997) flicker *= 0.65;
    anim.flicker.light.intensity = 2.2 * flicker;
    anim.flicker.material.color.setRGB(flicker, flicker, flicker);
    anim.flicker.signObjects.forEach((object) => {
      object.material.opacity = 1;
    });

    // Steam curls from oden and the coffee machine.
    anim.steam.forEach((particle, index) => {
      const local = (t * 0.18 + particle.phase) % 1;
      particle.sprite.position.x = particle.baseX + Math.sin(local * 6.0 + index) * 0.035;
      particle.sprite.position.z = particle.baseZ + Math.cos(local * 5.0 + index) * 0.025;
      particle.sprite.position.y = particle.baseY + local * 0.62;
      particle.material.opacity = Math.sin(local * Math.PI) * 0.11;
      particle.sprite.scale.setScalar(particle.scale * (0.7 + local * 1.3));
    });

    updateStreet(t, dt, anim);
    updateWeather(t, dt, anim);
  }

  return {
    root,
    store,
    interior,
    street,
    weather,
    lights,
    anim,
    textures: tex,
    update,
  };
}
