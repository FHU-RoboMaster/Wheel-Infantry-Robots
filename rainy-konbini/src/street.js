import * as THREE from 'three';
import {
  palette, toon, addMesh, addBox, addRoundedBox, addCylinder, addPlane,
  addTextPlane, basicTexture, flatMaterial, glowSprite,
} from './kit.js';
import { L } from './layout.js';
import * as T from './textures.js';

const up = new THREE.Vector3(0, 1, 0);

function tubeBetween(parent, a, b, radius, color, {
  radialSegments = 6,
  castShadow = true,
  material = null,
  outline = 0,
} = {}) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, radialSegments);
  const mesh = new THREE.Mesh(geometry, material || toon(color));
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addWheel(parent, x, y, z, radius, rimColor, spokes = 10) {
  const wheel = new THREE.Group();
  wheel.position.set(x, y, z);
  parent.add(wheel);
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.022, 6, 26),
    toon(0x222b2d)
  );
  tire.rotation.y = Math.PI / 2;
  tire.castShadow = true;
  wheel.add(tire);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius - 0.023, 0.008, 5, 26),
    toon(rimColor)
  );
  rim.rotation.y = Math.PI / 2;
  wheel.add(rim);
  for (let i = 0; i < spokes; i++) {
    const angle = (i / spokes) * Math.PI * 2;
    const px = 0;
    const py = Math.sin(angle) * (radius - 0.03);
    const pz = Math.cos(angle) * (radius - 0.03);
    tubeBetween(wheel, [px, 0, 0], [px, py, pz], 0.004, 0xaeb2a6, {
      radialSegments: 4, castShadow: false,
    });
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 10), toon(0x9ca7a0));
  hub.rotation.z = Math.PI / 2;
  hub.castShadow = true;
  wheel.add(hub);
  return wheel;
}

function addBicycle(parent) {
  const g = new THREE.Group();
  g.position.set(2.02, L.sidewalkTop, -3.38);
  g.rotation.y = 0.04;
  g.rotation.z = -0.025;
  parent.add(g);

  const frameColor = 0x6c8a7c;
  addWheel(g, 0, 0.34, -0.55, 0.32, 0xb6beb3, 10);
  addWheel(g, 0, 0.34, 0.55, 0.32, 0xb6beb3, 10);

  // Main step-through frame.
  const rearAxle = [0, 0.34, -0.55];
  const frontAxle = [0, 0.34, 0.55];
  const crank = [0, 0.3, -0.02];
  const seatTop = [0, 0.78, -0.28];
  const headTop = [0, 0.76, 0.32];
  tubeBetween(g, rearAxle, crank, 0.018, frameColor);
  tubeBetween(g, crank, seatTop, 0.02, frameColor);
  tubeBetween(g, seatTop, headTop, 0.021, frameColor);
  tubeBetween(g, crank, headTop, 0.018, frameColor);
  tubeBetween(g, headTop, frontAxle, 0.018, 0xd8d3c2);
  tubeBetween(g, seatTop, rearAxle, 0.017, frameColor);
  tubeBetween(g, seatTop, [0, 0.9, -0.34], 0.014, 0xb8b8a9);
  tubeBetween(g, headTop, [0, 0.9, 0.4], 0.014, 0xb8b8a9);

  // Fenders, rack, saddle and chain guard.
  const fenderGeo = new THREE.TorusGeometry(0.345, 0.012, 4, 20, Math.PI);
  const fenderFront = new THREE.Mesh(fenderGeo, toon(0xcfccbd));
  fenderFront.rotation.y = Math.PI / 2;
  fenderFront.position.set(0, 0.35, 0.55);
  g.add(fenderFront);
  const fenderRear = fenderFront.clone();
  fenderRear.position.set(0, 0.35, -0.55);
  g.add(fenderRear);

  addBox(g, 0.26, 0.035, 0.38, 0x8d9287, {
    position: [0, 0.64, -0.48], outline: 0, castShadow: false,
  });
  addBox(g, 0.15, 0.055, 0.24, 0x2a302f, {
    position: [0, 0.9, -0.3], rotation: [0.04, 0, 0], outline: 0.003,
  });
  addCylinder(g, 0.022, 0.022, 0.5, 0x4b4e48, {
    position: [0, 0.96, 0.38], rotation: [0, 0, Math.PI / 2], radialSegments: 8, outline: 0,
  });
  addBox(g, 0.1, 0.035, 0.035, 0x6b6657, {
    position: [0.22, 0.97, 0.38], rotation: [0, 0.25, 0], outline: 0.002,
  });
  addBox(g, 0.1, 0.035, 0.035, 0x6b6657, {
    position: [-0.22, 0.97, 0.38], rotation: [0, -0.25, 0], outline: 0.002,
  });
  addCylinder(g, 0.08, 0.08, 0.025, 0xd6cfbc, {
    position: [0, 0.37, -0.02], rotation: [0, 0, Math.PI / 2], radialSegments: 12, outline: 0.003,
  });
  addBox(g, 0.22, 0.04, 0.08, 0x7d8177, {
    position: [0, 0.3, -0.02], outline: 0, castShadow: false,
  });
  const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.022, 0.06), toon(0x3b4240));
  pedal.position.set(0.12, 0.23, 0.08);
  g.add(pedal);

  // Front basket, made from visible wire edges.
  const basket = new THREE.Group();
  basket.position.set(0, 0.75, 0.69);
  g.add(basket);
  const basketGeo = new THREE.BoxGeometry(0.34, 0.23, 0.3);
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(basketGeo),
    new THREE.LineBasicMaterial({ color: 0x53605a, transparent: true, opacity: 0.9 })
  );
  basket.add(edge);
  for (let i = 0; i < 5; i++) {
    tubeBetween(basket, [-0.17, -0.11 + i * 0.055, 0.15], [0.17, -0.11 + i * 0.055, 0.15], 0.003, 0x7d8c83, {
      radialSegments: 3, castShadow: false,
    });
  }
  addBox(basket, 0.33, 0.02, 0.29, 0x9a7b51, {
    position: [0, -0.12, 0], outline: 0, castShadow: false,
  });

  // Kickstand and tiny headlamp.
  tubeBetween(g, [0, 0.26, -0.08], [0.17, 0.01, -0.12], 0.011, 0x77827b, { radialSegments: 5 });
  addCylinder(g, 0.035, 0.035, 0.045, 0xf1dda6, {
    position: [0, 0.55, 0.76], rotation: [Math.PI / 2, 0, 0], radialSegments: 10, outline: 0.002,
    material: flatMaterial(0xffe4a8, { toneMapped: false }),
  });
  return g;
}

function addVendingMachine(parent, tex, anim, { x = 2.08, z = -0.32, rotationY = 0 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, L.sidewalkTop, z);
  g.rotation.y = rotationY;
  parent.add(g);

  addRoundedBox(g, 0.62, 1.88, 1.0, 0.045, 0xbf4140, {
    position: [0, 0.94, 0], outline: 0.012,
  });
  addBox(g, 0.58, 0.14, 0.96, 0xe5dfd1, {
    position: [0.01, 1.81, 0], outline: 0.006,
    material: toon(0xf0e7d4, { emissive: 0x6a5c41, emissiveIntensity: 0.2 }),
  });
  addBox(g, 0.03, 1.7, 0.9, 0xf7f0df, {
    position: [0.318, 1.1, 0], outline: 0.004, castShadow: false,
  });
  const displayMat = basicTexture(tex.vending, { toneMapped: false, side: THREE.DoubleSide });
  addPlane(g, 0.88, 1.6, displayMat, {
    position: [0.338, 1.16, 0], rotation: [0, Math.PI / 2, 0],
  }).renderOrder = 5;
  addBox(g, 0.38, 0.26, 0.92, 0x8f3032, {
    position: [0.03, 0.21, 0], outline: 0.008,
  });
  addBox(g, 0.06, 0.17, 0.4, 0x1f292c, {
    position: [0.33, 0.35, 0.12], outline: 0.004,
  });
  addBox(g, 0.07, 0.12, 0.1, 0x252f31, {
    position: [0.33, 0.86, -0.4], outline: 0.003,
  });
  addBox(g, 0.05, 0.025, 0.03, 0xd7caa9, {
    position: [0.37, 0.86, -0.34], outline: 0,
  });
  addCylinder(g, 0.025, 0.025, 1.35, 0xa9b6b5, {
    position: [0.33, 0.98, 0.43], radialSegments: 6, outline: 0.002,
  });

  const halo = glowSprite(anim.glowTex, 0xffc8b0, 1.55, 0.2);
  halo.position.set(0.62, 1.35, -0.15);
  g.add(halo);
  const light = new THREE.PointLight(0xffb99c, 2.8, 2.8, 2);
  light.position.set(0.66, 1.45, -0.1);
  g.add(light);
  anim.vending = { halo, light, baseOpacity: 0.2 };
  return g;
}

function addCat(parent, anim) {
  const cat = new THREE.Group();
  cat.position.set(-5.45, L.sidewalkTop, 2.02);
  cat.rotation.y = 0.42;
  parent.add(cat);

  const body = addMesh(cat, new THREE.SphereGeometry(0.145, 12, 8), toon(0xd8b58d), {
    position: [0, 0.17, 0], scale: [1.25, 1.06, 0.92], outline: 0.007, castShadow: true,
  });
  addMesh(cat, new THREE.SphereGeometry(0.08, 10, 7), toon(0xf3ead6), {
    position: [0.015, 0.15, 0.105], scale: [0.9, 0.95, 0.55], outline: 0.004,
  });
  const head = new THREE.Group();
  head.position.set(0, 0.35, 0.035);
  cat.add(head);
  addMesh(head, new THREE.SphereGeometry(0.105, 12, 8), toon(0xd8b58d), {
    position: [0, 0, 0], scale: [1.05, 1, 0.95], outline: 0.006,
  });
  addMesh(head, new THREE.SphereGeometry(0.055, 10, 7), toon(0xf4ecd8), {
    position: [0, -0.03, 0.085], scale: [1.15, 0.72, 0.66], outline: 0.002,
  });
  const earGeo = new THREE.ConeGeometry(0.04, 0.075, 4);
  [-1, 1].forEach((side) => {
    addMesh(head, earGeo, toon(0x5d4338), {
      position: [side * 0.065, 0.095, 0.0], rotation: [0, 0, side * -0.16], outline: 0.003,
    });
    addMesh(head, new THREE.SphereGeometry(0.012, 6, 4), flatMaterial(0x7ede91, { toneMapped: false }), {
      position: [side * 0.035, 0.012, 0.091], outline: 0,
    });
  });
  addMesh(head, new THREE.SphereGeometry(0.009, 6, 4), flatMaterial(0x4a3431), {
    position: [0, -0.022, 0.143], outline: 0,
  });
  addMesh(head, new THREE.SphereGeometry(0.035, 8, 6), toon(0x7b4a2f), {
    position: [0.065, 0.055, -0.01], scale: [0.7, 1.0, 0.55], outline: 0.002,
  });
  addMesh(head, new THREE.SphereGeometry(0.028, 8, 6), toon(0x4c3b32), {
    position: [-0.055, 0.06, 0.015], scale: [0.7, 0.8, 0.48], outline: 0.002,
  });

  // A curled tail, pivoted at the back so it can move in the rain.
  const tailPivot = new THREE.Group();
  tailPivot.position.set(-0.02, 0.11, -0.13);
  cat.add(tailPivot);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.12, -0.02, -0.08),
    new THREE.Vector3(-0.17, 0.03, 0.08),
    new THREE.Vector3(-0.1, 0.11, 0.12),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 12, 0.022, 6, false), toon(0x6d4b38));
  tail.castShadow = true;
  tailPivot.add(tail);

  // Tiny paws.
  [-0.075, 0.075].forEach((x) => {
    addCylinder(cat, 0.027, 0.03, 0.06, 0xf2ead7, {
      position: [x, 0.035, 0.1], rotation: [Math.PI / 2, 0, 0], radialSegments: 7, outline: 0.002,
    });
  });

  anim.cat = { cat, head, tailPivot };
  return cat;
}

function addAFrameSign(parent, tex) {
  const g = new THREE.Group();
  g.position.set(-3.05, L.sidewalkTop, 2.16);
  g.rotation.y = -0.05;
  parent.add(g);
  const front = new THREE.Group();
  front.position.set(0, 0.46, 0.105);
  front.rotation.x = -0.12;
  g.add(front);
  addBox(front, 0.54, 0.9, 0.035, 0x294845, { position: [0, 0, 0], outline: 0.005 });
  addPlane(front, 0.48, 0.82, basicTexture(tex.aframe), {
    position: [0, 0, 0.021],
  });
  const back = new THREE.Group();
  back.position.set(0, 0.46, -0.105);
  back.rotation.x = 0.12;
  g.add(back);
  addBox(back, 0.54, 0.9, 0.035, 0x294845, { position: [0, 0, 0], outline: 0.005 });
  addBox(back, 0.48, 0.82, 0.01, 0x1d3533, { position: [0, 0, -0.021], outline: 0 });
  addCylinder(g, 0.02, 0.02, 0.56, 0x6a5842, {
    position: [0, 0.915, 0], rotation: [0, 0, Math.PI / 2], radialSegments: 6, outline: 0.002,
  });
  [-0.23, 0.23].forEach((x) => {
    addBox(g, 0.055, 0.04, 0.33, 0x49564f, {
      position: [x, 0.015, 0], outline: 0.002,
    });
  });
  return g;
}

function addBins(parent) {
  const labels = [
    ['かん・びん', 'CANS & BOTTLES', '#dbe8df'],
    ['ペット', 'PET BOTTLES', '#e9dfc8'],
    ['もえる', 'BURNABLE', '#efd9d0'],
  ];
  const colors = [0x3e7470, 0xbec7b8, 0xb75c4b];
  const g = new THREE.Group();
  g.position.set(2.17, L.sidewalkTop, 0.58);
  parent.add(g);
  labels.forEach(([title, sub, bg], i) => {
    const x = 0;
    const z = i * 0.37;
    addRoundedBox(g, 0.48, 0.78, 0.32, 0.035, colors[i], {
      position: [x, 0.39, z], outline: 0.008,
    });
    addBox(g, 0.44, 0.12, 0.3, 0x304a49, {
      position: [x + 0.02, 0.75, z], outline: 0.004,
    });
    addBox(g, 0.02, 0.16, 0.13, 0x1c2b2b, {
      position: [x + 0.25, 0.68, z], outline: 0.002,
    });
    const labelTex = T.makeBinLabelTexture(title, sub, bg);
    addPlane(g, 0.27, 0.15, basicTexture(labelTex, { toneMapped: true }), {
      position: [x + 0.251, 0.44, z], rotation: [0, Math.PI / 2, 0],
    });
  });
  return g;
}

function addUmbrellaStand(parent) {
  const g = new THREE.Group();
  g.position.set(2.2, L.sidewalkTop, 1.98);
  parent.add(g);
  addCylinder(g, 0.2, 0.22, 0.58, 0x2e5655, {
    position: [0, 0.29, 0], radialSegments: 18, outline: 0.008,
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 20), toon(0x8f9d91));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.57;
  rim.castShadow = true;
  g.add(rim);
  addCylinder(g, 0.15, 0.15, 0.02, 0x1d3333, {
    position: [0, 0.57, 0], radialSegments: 16, outline: 0.002,
  });
  const colors = [0x3f5e68, 0xb25b4b, 0xd8d9cc];
  colors.forEach((color, i) => {
    const umbrella = new THREE.Group();
    umbrella.position.set((i - 1) * 0.1, 0.28, (i % 2 - 0.5) * 0.08);
    umbrella.rotation.z = (i - 1) * 0.11;
    umbrella.rotation.x = (i - 1) * 0.06;
    g.add(umbrella);
    addCylinder(umbrella, 0.011, 0.011, 1.1, 0x8a8f85, {
      position: [0, 0.55, 0], radialSegments: 5, outline: 0,
    });
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.58, 8), toon(color));
    canopy.position.set(0, 1.03, 0);
    canopy.castShadow = true;
    umbrella.add(canopy);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.1, 5), toon(0xb3a78e));
    tip.position.set(0, 1.36, 0);
    umbrella.add(tip);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 5, 10, Math.PI), toon(0x5e4a3b));
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 0.01, 0);
    umbrella.add(handle);
  });
  return g;
}

function addBulletinBoard(parent, tex) {
  const g = new THREE.Group();
  g.position.set(2.26, L.sidewalkTop, -5.08);
  g.rotation.y = Math.PI / 2;
  parent.add(g);
  addBox(g, 1.3, 0.95, 0.09, 0x725741, {
    position: [0, 1.24, 0], outline: 0.009,
  });
  addPlane(g, 1.17, 0.82, basicTexture(tex.bulletin, { toneMapped: true }), {
    position: [0, 1.24, 0.052],
  });
  addBox(g, 1.47, 0.08, 0.19, 0x5a4535, {
    position: [0, 1.77, 0], outline: 0.006,
  });
  addBox(g, 1.37, 0.06, 0.12, 0x7d6047, {
    position: [0, 1.71, 0.01], outline: 0.004,
  });
  [-0.52, 0.52].forEach((x) => {
    addBox(g, 0.075, 1.5, 0.075, 0x536a65, {
      position: [x, 0.75, -0.05], outline: 0.005,
    });
    addCylinder(g, 0.09, 0.1, 0.04, 0x4b5b57, {
      position: [x, 0.02, -0.05], radialSegments: 8, outline: 0.003,
    });
  });
  return g;
}

function addStreetlamp(parent, tex, anim) {
  const g = new THREE.Group();
  g.position.set(-7.45, L.sidewalkTop, 2.35);
  parent.add(g);
  addCylinder(g, 0.17, 0.21, 0.22, 0x445c59, {
    position: [0, 0.11, 0], radialSegments: 12, outline: 0.008,
  });
  addCylinder(g, 0.07, 0.095, 4.05, 0x273f44, {
    position: [0, 2.14, 0], radialSegments: 10, outline: 0.009,
  });
  addCylinder(g, 0.095, 0.09, 0.14, 0x546c68, {
    position: [0, 4.2, 0], radialSegments: 10, outline: 0.004,
  });
  // Curved arm.
  tubeBetween(g, [0, 4.18, 0], [0.12, 4.38, 0], 0.045, 0x273f44, { radialSegments: 8 });
  tubeBetween(g, [0.12, 4.38, 0], [0.55, 4.47, 0], 0.045, 0x273f44, { radialSegments: 8 });
  tubeBetween(g, [0.55, 4.47, 0], [0.83, 4.39, 0], 0.042, 0x273f44, { radialSegments: 8 });
  tubeBetween(g, [0.83, 4.39, 0], [0.83, 4.2, 0], 0.035, 0x273f44, { radialSegments: 8 });

  const lamp = new THREE.Group();
  lamp.position.set(0.83, 4.0, 0);
  g.add(lamp);
  addCylinder(lamp, 0.15, 0.19, 0.06, 0x2c3c3e, {
    position: [0, 0.19, 0], radialSegments: 6, outline: 0.004,
  });
  addCylinder(lamp, 0.2, 0.145, 0.09, 0x2c3c3e, {
    position: [0, 0.14, 0], radialSegments: 6, outline: 0.004,
  });
  addCylinder(lamp, 0.16, 0.16, 0.34, 0xffdb9d, {
    position: [0, -0.04, 0], radialSegments: 6, outline: 0.003,
    material: toon(0xffdfa7, { emissive: 0xffbd6b, emissiveIntensity: 0.55 }),
  });
  addCylinder(lamp, 0.14, 0.18, 0.05, 0x2c3c3e, {
    position: [0, -0.24, 0], radialSegments: 6, outline: 0.003,
  });
  addCylinder(lamp, 0.02, 0.02, 0.06, 0x4e5c58, {
    position: [0, -0.28, 0], radialSegments: 5, outline: 0,
  });
  const halo = glowSprite(anim.glowTex, 0xffc477, 1.35, 0.15);
  halo.position.set(0.83, 3.92, 0);
  g.add(halo);

  const light = new THREE.PointLight(0xffb35d, 8, 6.8, 2);
  light.position.set(0.83, 3.9, 0);
  g.add(light);
  anim.streetlamp = { light, halo, base: 8 };

  const plaque = addTextPlane(g, tex.streetSign, 0.92, 0.36, {
    position: [0, 2.55, 0.086],
  });
  plaque.castShadow = false;
  addBox(g, 0.82, 0.03, 0.03, 0x536c66, {
    position: [0, 2.77, 0.06], outline: 0, castShadow: false,
  });
  return g;
}

function addGuardrail(parent, x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const length = Math.hypot(dx, dz);
  const g = new THREE.Group();
  g.position.set((x0 + x1) / 2, L.sidewalkTop, (z0 + z1) / 2);
  g.rotation.y = Math.atan2(-dz, dx);
  parent.add(g);

  const postCount = Math.max(2, Math.ceil(length / 1.25) + 1);
  for (let i = 0; i < postCount; i++) {
    const x = -length / 2 + (i * length) / (postCount - 1);
    addCylinder(g, 0.032, 0.036, 0.92, 0xe7e3d6, {
      position: [x, 0.46, 0], radialSegments: 8, outline: 0.004,
    });
    addCylinder(g, 0.043, 0.043, 0.045, 0xe0d9c8, {
      position: [x, 0.94, 0], radialSegments: 8, outline: 0.002,
    });
    addBox(g, 0.035, 0.19, 0.035, 0x356966, {
      position: [x, 0.82, 0], outline: 0.001, castShadow: false,
    });
  }
  [0.53, 0.83].forEach((y) => {
    addCylinder(g, 0.027, 0.027, length, 0xe9e5d9, {
      position: [0, y, 0], rotation: [0, 0, Math.PI / 2], radialSegments: 8, outline: 0.003,
    });
  });
  return g;
}

function addUtilityPole(parent, x, z, height, hasTransformer = false) {
  const g = new THREE.Group();
  g.position.set(x, L.asphaltTop, z);
  parent.add(g);
  addCylinder(g, 0.08, 0.14, height, 0x8d9692, {
    position: [0, height / 2, 0], radialSegments: 10, outline: 0.01,
  });
  addCylinder(g, 0.16, 0.18, 0.16, 0x87908c, {
    position: [0, 0.08, 0], radialSegments: 10, outline: 0.004,
  });
  [height * 0.77, height * 0.87].forEach((y, level) => {
    addBox(g, 1.45, 0.09, 0.1, 0x707c78, {
      position: [0, y, 0], outline: 0.004,
    });
    [-0.55, 0, 0.55].forEach((offset) => {
      addCylinder(g, 0.038, 0.048, 0.16, 0xd5d6cc, {
        position: [offset, y + 0.12, 0], radialSegments: 7, outline: 0.002,
      });
      addCylinder(g, 0.025, 0.025, 0.08, 0x8b8f87, {
        position: [offset, y + 0.23, 0], radialSegments: 6, outline: 0.001,
      });
    });
  });
  if (hasTransformer) {
    addCylinder(g, 0.18, 0.18, 0.56, 0x919c97, {
      position: [-0.34, height * 0.6, 0.15], radialSegments: 12, outline: 0.005,
    });
    addCylinder(g, 0.22, 0.22, 0.06, 0x6e7c78, {
      position: [-0.34, height * 0.6 + 0.3, 0.15], radialSegments: 12, outline: 0.002,
    });
    addBox(g, 0.18, 0.45, 0.28, 0x7f8985, {
      position: [0.18, height * 0.5, -0.18], outline: 0.004,
    });
  }
  // Step bolts and a climbing ladder.
  for (let i = 0; i < 6; i++) {
    addBox(g, 0.28, 0.025, 0.025, 0x68736e, {
      position: [0, 1.1 + i * 0.45, 0.1], outline: 0, castShadow: false,
    });
  }
  addCylinder(g, 0.012, 0.012, height * 0.78, 0x3e4b4d, {
    position: [0.11, height * 0.45, -0.1], radialSegments: 4, outline: 0, castShadow: false,
  });

  const topY = L.asphaltTop + height * 0.87 + 0.22;
  return { group: g, top: new THREE.Vector3(x, topY, z) };
}

function addWire(parent, from, to, heightOffset, sag, color = 0x1b2327) {
  const start = from.clone();
  start.y += heightOffset;
  const end = to.clone();
  end.y += heightOffset;
  const middle = start.clone().add(end).multiplyScalar(0.5);
  middle.y -= sag;
  const curve = new THREE.CatmullRomCurve3([start, middle, end], false, 'catmullrom', 0.15);
  const geometry = new THREE.TubeGeometry(curve, 28, 0.012, 4, false);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color }));
  mesh.castShadow = false;
  parent.add(mesh);
}

function addTrafficSignal(parent, pole, anim) {
  const g = new THREE.Group();
  g.position.set(pole.x, 3.32, pole.z + 0.04);
  parent.add(g);
  addCylinder(g, 0.032, 0.04, 1.55, 0x4e5b58, {
    position: [-0.8, 0.27, 0], rotation: [0, 0, Math.PI / 2], radialSegments: 8, outline: 0.002,
  });
  addBox(g, 0.17, 0.17, 0.16, 0x56635f, {
    position: [-1.58, 0.27, 0], outline: 0.004,
  });
  addBox(g, 0.67, 0.24, 0.2, 0x283437, {
    position: [-1.58, 0.24, 0.11], outline: 0.006,
  });
  addBox(g, 0.62, 0.035, 0.05, 0x1b2528, {
    position: [-1.58, 0.36, 0.22], outline: 0.002,
  });
  const lensColors = [0xef4b45, 0xf1bc45, 0x4dd78f];
  const dimColors = [0x4d2325, 0x4b4025, 0x244b3c];
  const lenses = [];
  [-0.21, 0, 0.21].forEach((x, i) => {
    const material = new THREE.MeshBasicMaterial({ color: lensColors[i], toneMapped: true });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.068, 20), material);
    lens.position.set(-1.58 + x, 0.24, 0.216);
    g.add(lens);
    addBox(g, 0.12, 0.022, 0.08, 0x1b2528, {
      position: [-1.58 + x, 0.32, 0.24], outline: 0,
    });
    lenses.push({ lens, material, active: lensColors[i], dim: dimColors[i] });
  });
  const glow = glowSprite(anim.glowTex, lensColors[2], 0.8, 0.0);
  glow.position.set(-1.79, 0.24, 0.28);
  g.add(glow);
  anim.traffic = {
    group: g, lenses, glow, positions: [-0.21, 0, 0.21],
  };
  return g;
}

function addParkingSign(parent, tex) {
  const g = new THREE.Group();
  g.position.set(5.34, L.asphaltTop, -4.7);
  parent.add(g);
  addCylinder(g, 0.035, 0.045, 2.2, 0x65736e, {
    position: [0, 1.1, 0], radialSegments: 8, outline: 0.004,
  });
  addBox(g, 0.04, 0.8, 0.07, 0x72807b, {
    position: [0, 1.55, 0], outline: 0.002,
  });
  const sign = addTextPlane(g, tex, 0.5, 0.7, {
    position: [0.045, 1.65, 0], rotation: [0, Math.PI / 2, 0],
  });
  sign.castShadow = false;
  addBox(g, 0.04, 0.74, 0.54, 0x526660, {
    position: [0.015, 1.65, 0], outline: 0.003,
  });
  addCylinder(g, 0.12, 0.15, 0.04, 0x4e5b56, {
    position: [0, 0.02, 0], radialSegments: 8, outline: 0.002,
  });
  return g;
}

function addAlley(parent, tex, anim) {
  const g = new THREE.Group();
  g.name = 'alley';
  parent.add(g);

  // Long low wall along the outside of the narrow lane.
  addBox(g, 0.24, 1.45, 9.1, 0x5e6665, {
    position: [-7.86, 0.79, -2.8], outline: 0.014,
  });
  addBox(g, 0.31, 0.09, 9.15, 0x858b85, {
    position: [-7.86, 1.5, -2.8], outline: 0.006,
  });
  for (let i = 0; i < 6; i++) {
    addBox(g, 0.26, 0.02, 9.0, 0x4e5757, {
      position: [-7.86, 0.32 + i * 0.22, -2.8], outline: 0, castShadow: false,
    });
  }
  // Old gate and barred window in the wall.
  addBox(g, 0.12, 1.6, 0.88, 0x4b4337, {
    position: [-7.72, 0.9, -5.8], outline: 0.008,
  });
  addBox(g, 0.08, 0.8, 0.6, 0x2b3437, {
    position: [-7.64, 1.2, -2.4], outline: 0.006,
  });
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.045, 0.74, 0.025, 0x7d8580, {
      position: [-7.59, 1.2, -2.61 + i * 0.14], outline: 0, castShadow: false,
    });
  }

  // Entrance posts and noren curtain.
  addCylinder(g, 0.06, 0.065, 2.35, 0x6a543e, {
    position: [-7.62, 2.17, 1.62], radialSegments: 8, outline: 0.004,
  });
  addCylinder(g, 0.06, 0.065, 2.35, 0x6a543e, {
    position: [-6.35, 2.17, 1.62], radialSegments: 8, outline: 0.004,
  });
  addCylinder(g, 0.045, 0.045, 1.35, 0x5f4b38, {
    position: [-6.985, 3.28, 1.62], rotation: [0, 0, Math.PI / 2], radialSegments: 8, outline: 0.003,
  });
  const norenMat = basicTexture(T.makeNorenTexture(), { side: THREE.DoubleSide, toneMapped: true });
  const noren = addPlane(g, 1.35, 0.64, norenMat, {
    position: [-6.985, 2.93, 1.63],
  });
  noren.castShadow = true;
  for (let i = 0; i < 2; i++) {
    addBox(g, 0.014, 0.5, 0.02, 0x172a36, {
      position: [-7.19 + i * 0.42, 2.76, 1.665], outline: 0, castShadow: false,
    });
  }

  // Vertical alley sign, warm red lantern and utility pipes.
  addBox(g, 0.13, 1.04, 0.36, 0x6c292c, {
    position: [-6.24, 2.3, 0.78], outline: 0.008,
  });
  const alleySignMat = basicTexture(tex.alleySign, { side: THREE.DoubleSide, toneMapped: false });
  addPlane(g, 0.32, 1.0, alleySignMat, {
    position: [-6.17, 2.3, 0.78], rotation: [0, Math.PI / 2, 0],
  }).renderOrder = 6;
  addPlane(g, 0.32, 1.0, alleySignMat, {
    position: [-6.31, 2.3, 0.78], rotation: [0, -Math.PI / 2, 0],
  }).renderOrder = 6;
  addBox(g, 0.55, 0.045, 0.045, 0x6b786f, {
    position: [-6.44, 2.7, 0.72], rotation: [0, 0.12, 0], outline: 0,
  });
  const alleySignGlow = glowSprite(anim.glowTex, 0xff7465, 0.64, 0.14);
  alleySignGlow.position.set(-6.07, 2.3, 0.78);
  g.add(alleySignGlow);

  const lantern = new THREE.Group();
  lantern.position.set(-6.35, 2.15, -0.18);
  g.add(lantern);
  addCylinder(lantern, 0.03, 0.03, 0.22, 0x3e3a32, {
    position: [0, 0.22, 0], radialSegments: 6, outline: 0.002,
  });
  const lanternBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), toon(0xc74e43, {
    emissive: 0xff5b3f, emissiveIntensity: 0.8,
  }));
  lanternBody.scale.set(1, 1.35, 1);
  lantern.add(lanternBody);
  addCylinder(lantern, 0.11, 0.13, 0.05, 0x3f3931, {
    position: [0, 0.24, 0], radialSegments: 10, outline: 0.002,
  });
  addCylinder(lantern, 0.11, 0.13, 0.045, 0x3f3931, {
    position: [0, -0.24, 0], radialSegments: 10, outline: 0.002,
  });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.178 - i * 0.016, 0.003, 4, 18), toon(0x7e322f));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.12 + i * 0.12;
    lantern.add(ring);
  }
  const lanternGlow = glowSprite(anim.glowTex, 0xff6d53, 1.2, 0.32);
  lanternGlow.position.set(0, 0, 0);
  lantern.add(lanternGlow);
  const lanternLight = new THREE.PointLight(0xff6b4f, 3.2, 3.6, 2);
  lanternLight.position.set(-6.18, 2.12, -0.13);
  g.add(lanternLight);
  anim.alleyLantern = { light: lanternLight, glow: lanternGlow, base: 3.2 };

  // Wall-mounted air conditioner and pipework.
  const ac = new THREE.Group();
  ac.position.set(-6.28, 2.35, -2.5);
  ac.rotation.y = Math.PI;
  g.add(ac);
  addRoundedBox(ac, 0.24, 0.52, 0.78, 0.03, 0xd5d5c9, {
    position: [0, 0, 0], outline: 0.006,
  });
  addCylinder(ac, 0.17, 0.17, 0.035, 0x788783, {
    position: [0.13, 0.01, 0.08], rotation: [0, 0, Math.PI / 2], radialSegments: 18, outline: 0.003,
  });
  for (let i = 0; i < 5; i++) {
    addBox(ac, 0.015, 0.02, 0.25, 0x9caaa5, {
      position: [0.15, -0.12 + i * 0.06, -0.22], outline: 0, castShadow: false,
    });
  }
  addBox(ac, 0.4, 0.03, 0.04, 0x6d7b76, {
    position: [-0.1, -0.31, 0], outline: 0,
  });
  addCylinder(ac, 0.025, 0.025, 0.4, 0x6d7b76, {
    position: [0.14, -0.15, -0.34], rotation: [0, 0, 0.2], radialSegments: 6, outline: 0.001,
  });
  addCylinder(g, 0.038, 0.038, 2.9, 0x61736e, {
    position: [-6.12, 1.5, -3.25], radialSegments: 8, outline: 0.003,
  });

  // Crates, bin bags and a warm little end-of-alley lamp.
  for (let i = 0; i < 3; i++) {
    addBox(g, 0.4, 0.28, 0.32, 0x9a7a50, {
      position: [-7.25, 0.34 + (i % 2) * 0.29, 0.28 - Math.floor(i / 2) * 0.06],
      rotation: [0, 0.06 * i, 0], outline: 0.005,
    });
    addBox(g, 0.32, 0.015, 0.24, 0xb9925f, {
      position: [-7.25, 0.49 + (i % 2) * 0.29, 0.28 - Math.floor(i / 2) * 0.06],
      outline: 0, castShadow: false,
    });
  }
  for (let i = 0; i < 3; i++) {
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), toon(0x252b30));
    bag.scale.set(1, 1.25, 0.9);
    bag.position.set(-7.35 + i * 0.22, 0.3, -1.3 + i * 0.16);
    bag.castShadow = true;
    g.add(bag);
  }
  addBox(g, 0.26, 0.065, 0.09, 0xffd89e, {
    position: [-6.16, 2.32, -5.4], outline: 0,
    material: flatMaterial(0xffc778, { toneMapped: false }),
  });


  return g;
}

function addBackAlley(parent, tex) {
  const g = new THREE.Group();
  g.position.set(0, 0, 0);
  parent.add(g);
  addBox(g, 7.8, 0.5, 0.22, 0x5e6665, {
    position: [-2.2, 0.35, -7.52], outline: 0.008,
  });
  addBox(g, 7.85, 0.06, 0.28, 0x808680, {
    position: [-2.2, 0.63, -7.52], outline: 0.004,
  });
  for (let i = 0; i < 5; i++) {
    const x = -5.9 + i * 1.9;
    addBox(g, 0.055, 0.9, 0.055, 0x5f706b, {
      position: [x, 1.08, -7.52], outline: 0.002,
    });
  }
  [0.85, 1.12, 1.42].forEach((y) => {
    addBox(g, 7.7, 0.025, 0.025, 0x53645f, {
      position: [-2.2, y, -7.52], outline: 0, castShadow: false,
    });
  });
  const dumpster = new THREE.Group();
  dumpster.position.set(-.5, L.asphaltTop, -7.1);
  g.add(dumpster);
  addRoundedBox(dumpster, 0.9, 0.85, 0.7, 0.04, 0x3e5d5d, {
    position: [0, 0.42, 0], outline: 0.008,
  });
  addBox(dumpster, 0.96, 0.08, 0.76, 0x2e4648, {
    position: [0, 0.88, 0], rotation: [0.04, 0, 0], outline: 0.005,
  });
  addBox(dumpster, 0.52, 0.05, 0.08, 0x9caa9e, {
    position: [0, 0.94, 0.3], outline: 0.003,
  });
  addBox(dumpster, 0.5, 0.18, 0.24, 0x4e6c64, {
    position: [0.7, 1.0, -0.1], outline: 0.004,
  });
  const groundAC = new THREE.Group();
  groundAC.position.set(1.05, L.asphaltTop, -7.16);
  g.add(groundAC);
  addRoundedBox(groundAC, 0.8, 0.58, 0.48, 0.04, 0xc8ccc3, {
    position: [0, 0.29, 0], outline: 0.007,
  });
  addCylinder(groundAC, 0.2, 0.2, 0.025, 0x778580, {
    position: [0, 0.29, 0.25], rotation: [Math.PI / 2, 0, 0], radialSegments: 18, outline: 0.002,
  });
  for (let i = 0; i < 4; i++) {
    addBox(groundAC, 0.5, 0.015, 0.02, 0x9ca9a4, {
      position: [0, 0.14 + i * 0.08, 0.26], outline: 0, castShadow: false,
    });
  }
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.46, 0.34, 0.38, 0xb99468, {
      position: [-3.2 + i * 0.12, 0.35 + (i % 2) * 0.34, -7.15],
      rotation: [0, 0.1 * i, 0], outline: 0.005,
    });
  }
  addBox(g, 0.52, 0.04, 0.06, 0xffd89e, {
    position: [-3.95, 2.45, -6.22], outline: 0,
    material: flatMaterial(0xffc06d, { toneMapped: false }),
  });
  const backLight = new THREE.PointLight(0xffb96f, 1.8, 2.8, 2);
  backLight.position.set(-3.95, 2.3, -6.55);
  g.add(backLight);
  return g;
}

function addCornerDetails(parent, tex, anim) {
  // A small stack of delivery crates at the store's back corner.
  for (let i = 0; i < 3; i++) {
    addBox(parent, 0.42, 0.28, 0.34, 0x947653, {
      position: [-5.65, L.sidewalkTop + 0.16 + (i % 2) * 0.3, 1.86 - Math.floor(i / 2) * 0.06],
      rotation: [0, 0.08 * i, 0], outline: 0.005,
    });
  }
  // Floor-mounted air-conditioner drip pipe near the side window.
  addCylinder(parent, 0.022, 0.022, 1.9, 0x71817c, {
    position: [1.72, 1.15, -5.58], radialSegments: 5, outline: 0.001,
  });
  return null;
}

export function buildStreet(root, tex, anim) {
  const g = new THREE.Group();
  g.name = 'street';
  root.add(g);

  addVendingMachine(g, tex, anim, { x: -6.6, z: 1.95, rotationY: -Math.PI / 2 });
  addBins(g);
  addAFrameSign(g, tex);
  addCat(g, anim);
  addUmbrellaStand(g);
  addBicycle(g);
  addBulletinBoard(g, tex);
  addStreetlamp(g, tex, anim);
  addGuardrail(g, -7.65, 2.5, -5.95, 2.5);
  addGuardrail(g, 2.48, -1.35, 2.48, -0.45);
  addGuardrail(g, 2.48, -6.55, 2.48, -5.35);
  addParkingSign(g, tex.parkingSign);

  const poleA = addUtilityPole(g, -7.35, 6.75, 5.1, false);
  const poleB = addUtilityPole(g, 7.42, -2.78, 5.2, true);
  const poleC = addUtilityPole(g, 7.42, -6.92, 4.9, false);
  const wireOffsets = [
    { x: -0.55, y: 0.03, sag: 0.42 },
    { x: -0.2, y: 0.1, sag: 0.48 },
    { x: 0.2, y: 0.11, sag: 0.5 },
    { x: 0.55, y: 0.05, sag: 0.46 },
    { x: 0, y: -0.55, sag: 0.35 },
  ];
  wireOffsets.forEach((offset, i) => {
    const a = poleA.top.clone();
    const b = poleB.top.clone();
    a.x += offset.x;
    b.x += offset.x;
    addWire(g, a, b, offset.y, offset.sag, i === 4 ? 0x20262a : 0x1b2327);
  });
  const wireOffsetsBC = [
    { x: -0.5, y: 0.03, sag: 0.27 },
    { x: -0.15, y: 0.1, sag: 0.3 },
    { x: 0.2, y: 0.1, sag: 0.3 },
    { x: 0.5, y: 0.03, sag: 0.26 },
  ];
  wireOffsetsBC.forEach((offset) => {
    const b = poleB.top.clone();
    const c = poleC.top.clone();
    b.z += offset.x;
    c.z += offset.x;
    addWire(g, b, c, offset.y, offset.sag);
  });

  addTrafficSignal(g, { x: 7.42, z: -2.74, y: 3.32 }, anim);
  addAlley(g, tex, anim);
  addBackAlley(g, tex);
  addCornerDetails(g, tex, anim);

  return g;
}

function setLens(entry, isActive) {
  entry.material.color.setHex(isActive ? entry.active : entry.dim);
}

export function updateStreet(t, dt, anim) {
  if (anim.traffic) {
    const phase = (t + 2.4) % 15.0;
    let active = 2;
    if (phase >= 7.0 && phase < 9.0) active = 1;
    else if (phase >= 9.0) active = 0;
    const colors = [0xef4b45, 0xf1bc45, 0x4dd78f];
    anim.traffic.lenses.forEach((entry, i) => setLens(entry, i === active));
    const pos = anim.traffic.positions[active];
    anim.traffic.glow.position.x = -1.58 + pos;
    anim.traffic.glow.material.color.setHex(colors[active]);
    const pulse = 0.12 + 0.08 * (0.5 + 0.5 * Math.sin(t * 2.4));
    anim.traffic.glow.material.opacity = active === 1 ? pulse * 0.8 : pulse;
  }

  if (anim.alleyLantern) {
    const flicker = 0.9 + Math.sin(t * 7.1) * 0.035 + Math.sin(t * 17.3 + 0.4) * 0.02;
    anim.alleyLantern.light.intensity = anim.alleyLantern.base * flicker;
    anim.alleyLantern.glow.material.opacity = 0.18 * flicker;
  }
  if (anim.vending) {
    const pulse = 0.14 + Math.sin(t * 2.2) * 0.008;
    anim.vending.halo.material.opacity = pulse;
  }
  if (anim.streetlamp) {
    const flicker = 0.985 + Math.sin(t * 9.7) * 0.008;
    anim.streetlamp.light.intensity = anim.streetlamp.base * flicker;
  }
  if (anim.cat) {
    anim.cat.tailPivot.rotation.y = Math.sin(t * 1.35) * 0.2;
    anim.cat.tailPivot.rotation.z = Math.sin(t * 0.85 + 1.2) * 0.06;
    anim.cat.head.rotation.y = Math.sin(t * 0.42) * 0.07 + Math.sin(t * 1.2) * 0.012;
    anim.cat.head.rotation.x = Math.sin(t * 0.68 + 2.0) * 0.025;
  }
  return null;
}
