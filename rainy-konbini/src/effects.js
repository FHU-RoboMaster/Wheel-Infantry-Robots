import * as THREE from 'three';
import { L } from './layout.js';
import { flatMaterial, glowSprite } from './kit.js';

function surfaceHeight(x, z) {
  const onFrontWalk = z >= 1.5 && z <= 2.6 && x >= -7.9 && x <= 2.6;
  const onSideWalk = x >= 1.5 && x <= 2.6 && z >= -7.9 && z <= 1.5;
  return onFrontWalk || onSideWalk ? L.sidewalkTop : L.asphaltTop;
}

function insideStore(x, z, margin = 0.1) {
  return x > L.store.x0 - margin && x < L.store.x1 + margin && z > L.store.z0 - margin && z < L.store.z1 + margin;
}

function createRain(tex, group) {
  const count = 950;
  const positions = new Float32Array(count * 6);
  const drops = [];
  const windX = 0.16;
  const windZ = 0.06;
  const rand = (a, b) => a + Math.random() * (b - a);

  for (let i = 0; i < count; i++) {
    const x = rand(-8.4, 8.4);
    const z = rand(-8.4, 8.4);
    const floor = insideStore(x, z) ? 3.9 : surfaceHeight(x, z) + 0.02;
    const y = rand(floor + 0.5, 10.5);
    const length = rand(0.26, 0.58);
    const speed = rand(8.5, 15.5);
    drops.push({ x, z, y, floor, length, speed, phase: Math.random() });
    const offset = i * 6;
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
    positions[offset + 3] = x - windX * length;
    positions[offset + 4] = y - length;
    positions[offset + 5] = z - windZ * length;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xb8d4e8,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const rain = new THREE.LineSegments(geometry, material);
  rain.frustumCulled = false;
  rain.renderOrder = 20;
  group.add(rain);

  // A second, very faint veil of slower drops makes the rain feel volumetric.
  const veilCount = 220;
  const veilPositions = new Float32Array(veilCount * 6);
  const veilDrops = [];
  for (let i = 0; i < veilCount; i++) {
    const x = rand(-8.6, 8.6);
    const z = rand(-8.6, 8.6);
    const floor = insideStore(x, z) ? 4.0 : surfaceHeight(x, z);
    const y = rand(floor + 1, 12);
    const length = rand(0.7, 1.2);
    const speed = rand(4.2, 7.2);
    veilDrops.push({ x, z, y, floor, length, speed });
  }
  const veilGeo = new THREE.BufferGeometry();
  veilGeo.setAttribute('position', new THREE.BufferAttribute(veilPositions, 3));
  const veilMat = new THREE.LineBasicMaterial({
    color: 0x8eafc9, transparent: true, opacity: 0.065,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const veil = new THREE.LineSegments(veilGeo, veilMat);
  veil.frustumCulled = false;
  veil.renderOrder = 19;
  group.add(veil);

  return { rain, geometry, positions, drops, windX, windZ, veil, veilGeo, veilPositions, veilDrops };
}

function createRipples(group, tex) {
  const ripples = [];
  const geometry = new THREE.RingGeometry(0.055, 0.066, 20);
  const spots = [
    [-3.6, 3.55], [-2.95, 3.75], [-0.9, 4.25], [-1.45, 4.6], [1.65, 2.18],
    [3.75, -1.2], [4.2, -1.35], [5.2, 5.15], [-7.05, 0.95], [-2.7, 1.88],
    [4.8, 2.0], [-6.9, -3.4], [0.35, 5.4], [3.1, 6.2], [6.4, 4.1],
    [-4.9, 2.22], [-6.8, 2.28], [2.3, 0.4], [2.25, -2.2], [5.7, -3.8],
  ];
  for (let i = 0; i < 34; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xb8dce8, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 12;
    group.add(mesh);
    const spot = i < spots.length ? spots[i] : [Math.random() * 12 - 6, Math.random() * 12 - 6];
    const isWalk = (spot[1] > 1.5 && spot[1] < 2.6) || (spot[0] > 1.5 && spot[0] < 2.6);
    const surface = (isWalk ? L.sidewalkTop : L.asphaltTop) + 0.018;
    ripples.push({
      mesh, material, x: spot[0], z: spot[1], y: surface,
      offset: Math.random(), speed: 0.22 + Math.random() * 0.25,
      maxScale: 1.1 + Math.random() * 1.6,
      alive: true,
    });
  }
  return ripples;
}

function createGlassDrips(group, tex) {
  const front = [];
  const side = [];
  const geometry = new THREE.PlaneGeometry(0.022, 0.32);
  const material = new THREE.MeshBasicMaterial({
    map: tex.rainStreak, color: 0xcce7f2, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const material2 = material.clone();
  material2.opacity = 0.34;

  const rand = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 15; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    const x = rand(-5.55, 0.38);
    mesh.position.set(x, rand(0.5, 2.9), 1.61);
    mesh.rotation.z = rand(-0.05, 0.05);
    mesh.renderOrder = 10;
    group.add(mesh);
    front.push({ mesh, x, y: mesh.position.y, speed: rand(0.08, 0.22), length: rand(0.25, 0.45) });
  }
  for (let i = 0; i < 11; i++) {
    const mesh = new THREE.Mesh(geometry, material2);
    const z = rand(-5.55, 0.24);
    mesh.position.set(1.81, rand(0.5, 2.9), z);
    mesh.rotation.y = Math.PI / 2;
    mesh.rotation.z = rand(-0.05, 0.05);
    mesh.renderOrder = 10;
    group.add(mesh);
    side.push({ mesh, z, y: mesh.position.y, speed: rand(0.075, 0.19), length: rand(0.22, 0.42) });
  }
  return { front, side };
}

function createEaveDrips(group, tex) {
  const drops = [];
  const splashes = [];
  const dropMat = new THREE.MeshBasicMaterial({
    color: 0xd0eaf5, transparent: true, opacity: 0.78, toneMapped: false,
  });
  const dropGeo = new THREE.SphereGeometry(0.022, 6, 4);
  const ringGeo = new THREE.RingGeometry(0.055, 0.068, 16);
  const positions = [
    [-5.7, 2.35], [-4.4, 2.36], [-3.2, 2.35], [-1.9, 2.36], [-0.6, 2.35], [0.7, 2.36], [1.8, 2.35],
    [2.42, -4.3], [2.42, -2.7], [2.42, -1.1], [2.42, 0.6],
  ];
  positions.forEach(([x, z], index) => {
    const drop = new THREE.Mesh(dropGeo, dropMat);
    drop.scale.set(1, 1.8, 1);
    group.add(drop);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc5e5f0, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, surfaceHeight(x, z) + 0.02, z);
    ring.renderOrder = 13;
    group.add(ring);
    drops.push({
      mesh: drop, ring, material: ringMat,
      x, z, startY: 2.93,
      phase: index / positions.length + Math.random() * 0.04,
      duration: 2.2 + Math.random() * 1.5,
      ground: surfaceHeight(x, z),
    });
  });
  return drops;
}

function createMist(group, tex) {
  const sprites = [];
  const material = new THREE.SpriteMaterial({
    map: tex.glow, color: 0x7ea9c4, transparent: true, opacity: 0.035,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  for (let i = 0; i < 5; i++) {
    const sprite = new THREE.Sprite(material.clone());
    sprite.position.set(-5 + i * 2.2, 0.55 + Math.random() * 0.2, 2 + Math.random() * 3);
    sprite.scale.set(5.5, 1.6, 1);
    group.add(sprite);
    sprites.push(sprite);
  }
  return sprites;
}

export function buildWeather(root, tex, anim) {
  const group = new THREE.Group();
  group.name = 'weather';
  root.add(group);

  anim.rain = createRain(tex, group);
  anim.ripples = createRipples(group, tex);
  anim.glassDrips = createGlassDrips(group, tex);
  anim.eaveDrips = createEaveDrips(group, tex);
  anim.mist = createMist(group, tex);

  return group;
}

export function updateWeather(t, dt, anim) {
  const rainData = anim.rain;
  const { drops, positions, geometry, veilDrops, veilPositions, veilGeo, windX, windZ } = rainData;
  const clampDt = Math.min(dt, 0.05);

  for (let i = 0; i < drops.length; i++) {
    const drop = drops[i];
    drop.y -= drop.speed * clampDt;
    if (drop.y < drop.floor) {
      drop.y = 10.2 + Math.random() * 1.8;
      drop.x = Math.random() * 16.8 - 8.4;
      drop.z = Math.random() * 16.8 - 8.4;
      drop.floor = insideStore(drop.x, drop.z) ? 3.9 : surfaceHeight(drop.x, drop.z) + 0.02;
      drop.length = 0.26 + Math.random() * 0.32;
      drop.speed = 8.5 + Math.random() * 7;
    }
    const offset = i * 6;
    positions[offset] = drop.x;
    positions[offset + 1] = drop.y;
    positions[offset + 2] = drop.z;
    positions[offset + 3] = drop.x - windX * drop.length;
    positions[offset + 4] = drop.y - drop.length;
    positions[offset + 5] = drop.z - windZ * drop.length;
  }
  geometry.attributes.position.needsUpdate = true;

  for (let i = 0; i < veilDrops.length; i++) {
    const drop = veilDrops[i];
    drop.y -= drop.speed * clampDt;
    if (drop.y < drop.floor) {
      drop.y = 11 + Math.random() * 2;
      drop.x = Math.random() * 17.2 - 8.6;
      drop.z = Math.random() * 17.2 - 8.6;
      drop.floor = insideStore(drop.x, drop.z) ? 4.0 : surfaceHeight(drop.x, drop.z);
      drop.length = 0.7 + Math.random() * 0.55;
    }
    const offset = i * 6;
    veilPositions[offset] = drop.x;
    veilPositions[offset + 1] = drop.y;
    veilPositions[offset + 2] = drop.z;
    veilPositions[offset + 3] = drop.x - windX * drop.length;
    veilPositions[offset + 4] = drop.y - drop.length;
    veilPositions[offset + 5] = drop.z - windZ * drop.length;
  }
  veilGeo.attributes.position.needsUpdate = true;

  // Puddle rings, each on its own cycle.
  anim.ripples.forEach((ripple) => {
    const phase = (t * ripple.speed + ripple.offset) % 1;
    const scale = 0.14 + phase * ripple.maxScale;
    ripple.mesh.scale.set(scale, scale, 1);
    ripple.material.opacity = Math.sin(phase * Math.PI) * (0.11 + 0.09 * (1 - phase));
    ripple.mesh.position.set(ripple.x, ripple.y, ripple.z);
  });

  // Rain sliding down the shop glass.
  anim.glassDrips.front.forEach((drip, i) => {
    drip.y -= drip.speed * clampDt;
    drip.mesh.position.y = drip.y;
    drip.mesh.position.x = drip.x + Math.sin(t * 0.7 + i) * 0.006;
    if (drip.y < 0.35) {
      drip.y = 2.95;
      drip.x = -5.55 + Math.random() * 5.95;
      drip.mesh.position.x = drip.x;
    }
  });
  anim.glassDrips.side.forEach((drip, i) => {
    drip.y -= drip.speed * clampDt;
    drip.mesh.position.y = drip.y;
    drip.mesh.position.z = drip.z + Math.sin(t * 0.6 + i) * 0.006;
    if (drip.y < 0.35) {
      drip.y = 2.95;
      drip.z = -5.55 + Math.random() * 5.8;
      drip.mesh.position.z = drip.z;
    }
  });

  // Eave drops and their tiny impacts.
  anim.eaveDrips.forEach((drip) => {
    const phase = ((t + drip.phase * drip.duration) % drip.duration) / drip.duration;
    if (phase < 0.72) {
      const p = phase / 0.72;
      drip.mesh.visible = true;
      drip.mesh.position.set(drip.x, drip.startY - p * (drip.startY - drip.ground), drip.z);
      drip.mesh.scale.set(1, 1.8 + p * 1.7, 1);
      drip.material.opacity = 0;
    } else {
      drip.mesh.visible = false;
      const p = (phase - 0.72) / 0.28;
      drip.ring.scale.setScalar(0.35 + p * 2.1);
      drip.material.opacity = (1 - p) * 0.2;
    }
  });

  anim.mist.forEach((sprite, i) => {
    sprite.position.x += Math.sin(t * 0.07 + i) * 0.0008;
    sprite.material.opacity = 0.022 + Math.sin(t * 0.16 + i) * 0.008;
  });
}
