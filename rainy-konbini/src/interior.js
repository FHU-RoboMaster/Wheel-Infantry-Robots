import * as THREE from 'three';
import {
  palette, toon, addMesh, addBox, addRoundedBox, addCylinder, addPlane,
  addProductBox, addBottle, basicTexture, flatMaterial, addTextPlane,
} from './kit.js';
import { L } from './layout.js';
import * as T from './textures.js';

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(19871024);
const pick = (arr) => arr[Math.floor(random() * arr.length)];
let railMaterial = null;

function getRailMaterial() {
  if (!railMaterial) railMaterial = basicTexture(T.makeShelfRailTexture(), {});
  return railMaterial;
}

const snackColors = [0xe8614e, 0xf1bd4a, 0x4b8c80, 0xe7d8b8, 0x6c8ebf, 0xd37a9f, 0x8a6a4c, 0xf2e9d5];
const drinkColors = [0x4a7d59, 0x72a65a, 0x9b5e3d, 0xd6c17b, 0x3c5f86, 0xb64c43, 0xe1a64c, 0x82b9c9];
const bentoColors = [0xd45445, 0x3b5d61, 0xe4b352, 0x5d8050, 0x773e3c, 0xf0dfbd];

function addOnigiri(parent, x, y, z, wrapColor = 0x3f5f4e, flavorColor = 0xe98b73) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.z = Math.PI / 2;
  parent.add(group);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.095, 0.055, 3),
    toon(0xfffbee)
  );
  body.rotation.x = Math.PI / 2;
  body.castShadow = false;
  group.add(body);
  const nori = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.06), toon(wrapColor));
  nori.position.set(0, -0.035, 0.029);
  group.add(nori);
  const flavor = new THREE.Mesh(new THREE.CircleGeometry(0.018, 8), flatMaterial(flavorColor));
  flavor.position.set(0, 0.018, 0.03);
  group.add(flavor);
  return group;
}

function addBento(parent, x, y, z, color) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = (random() - 0.5) * 0.08;
  parent.add(g);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.055, 0.2), toon(0xf3e8d3));
  tray.position.y = 0.03;
  tray.castShadow = false;
  g.add(tray);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.025, 0.21), toon(color));
  lid.position.y = 0.07;
  g.add(lid);
  const band = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.038), flatMaterial(0xf9f0dc));
  band.position.set(0, 0.05, 0.106);
  g.add(band);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.014, 8), flatMaterial(0xd85c4b));
  dot.position.set(0, 0.05, 0.107);
  g.add(dot);
  return g;
}

function addSnackStrip(parent, x, y, z, color, width = 0.15, height = 0.2) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const bag = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.055), toon(color));
  bag.castShadow = false;
  g.add(bag);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.8, height * 0.26),
    flatMaterial(0xf8f3e4)
  );
  label.position.set(0, height * 0.08, 0.029);
  g.add(label);
  return g;
}

function addFridgeBay(parent, x, width, headerTexture, colors, anim) {
  const bay = new THREE.Group();
  bay.position.set(x, L.floorTop, -5.53);
  parent.add(bay);

  const h = 2.28;
  addBox(bay, width, h, 0.07, 0xe7ddc9, {
    position: [0, h / 2, 0.30], outline: 0.012, castShadow: true, receiveShadow: true,
  });
  addBox(bay, width, 0.09, 0.62, 0xd4c7af, {
    position: [0, 0.045, 0], outline: 0.008,
  });
  addBox(bay, width, 0.09, 0.62, 0xe3d8c3, {
    position: [0, h - 0.03, 0], outline: 0.008,
  });
  addBox(bay, 0.065, h, 0.62, 0xe8ddc9, {
    position: [-width / 2 + 0.03, h / 2, 0], outline: 0.01,
  });
  addBox(bay, 0.065, h, 0.62, 0xe8ddc9, {
    position: [width / 2 - 0.03, h / 2, 0], outline: 0.01,
  });

  // Bright cold interior panel and subtle vertical light tubes.
  addBox(bay, width - 0.11, h - 0.16, 0.035, 0xdfeef4, {
    position: [0, h / 2, -0.285], outline: 0.006, castShadow: false,
    material: toon(0xe4f4f8, { emissive: 0x8ec7d3, emissiveIntensity: 0.22 }),
  });
  addBox(bay, 0.025, h - 0.3, 0.03, 0xffffff, {
    position: [-width / 2 + 0.14, h / 2, -0.255], outline: 0,
    material: flatMaterial(0xd9f6ff, { toneMapped: false }),
  });
  addBox(bay, 0.025, h - 0.3, 0.03, 0xffffff, {
    position: [width / 2 - 0.14, h / 2, -0.255], outline: 0,
    material: flatMaterial(0xd9f6ff, { toneMapped: false }),
  });

  const shelfYs = [0.52, 0.97, 1.42, 1.87];
  shelfYs.forEach((y, level) => {
    addBox(bay, width - 0.11, 0.035, 0.52, 0xe9e5dc, {
      position: [0, y, 0.02], outline: 0.005, castShadow: false,
    });
    const count = Math.max(4, Math.floor(width / 0.15));
    for (let i = 0; i < count; i++) {
      const bx = -width / 2 + 0.105 + i * ((width - 0.21) / Math.max(1, count - 1));
      if (level === 3) {
        addProductBox(bay, bx, y + 0.09, 0.13, 0.105, 0.16, 0.09, pick(colors), 0, random() > 0.7 ? 0xf8f1dd : null);
      } else {
        addBottle(bay, bx, y + 0.02, 0.13, pick(colors), 0.86 + random() * 0.14);
      }
    }
    addBox(bay, width - 0.1, 0.052, 0.02, 0xe7dfce, {
      position: [0, y - 0.01, 0.283], outline: 0.004, castShadow: false,
      material: getRailMaterial(),
    });
  });

  // Cooler glass, frame, and a long pull handle.
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.13, h - 0.19), new THREE.MeshBasicMaterial({
    color: 0xcde7ed, transparent: true, opacity: 0.08, depthWrite: false,
    side: THREE.DoubleSide,
  }));
  glass.position.set(0, h / 2, 0.34);
  bay.add(glass);
  addBox(bay, width - 0.09, 0.035, 0.035, 0xd5c9b4, {
    position: [0, h - 0.11, 0.34], outline: 0.004,
  });
  addBox(bay, width - 0.09, 0.035, 0.035, 0xd5c9b4, {
    position: [0, 0.12, 0.34], outline: 0.004,
  });
  addCylinder(bay, 0.012, 0.012, h * 0.42, 0x8f999a, {
    position: [width / 2 - 0.12, h * 0.55, 0.37], radialSegments: 6, outline: 0,
  });

  addBox(bay, width - 0.04, 0.34, 0.07, 0xf1e3ca, {
    position: [0, h + 0.07, 0.27], outline: 0.006, castShadow: false,
  });
  const header = addTextPlane(bay, headerTexture, width - 0.08, 0.28, {
    position: [0, h + 0.07, 0.312],
    toneMapped: false,
  });
  header.castShadow = false;

  return bay;
}

function addGondola(parent, x, z, width, depth, height) {
  const g = new THREE.Group();
  g.position.set(x, L.floorTop, z);
  parent.add(g);
  addBox(g, width, 0.14, depth, 0x274c4b, {
    position: [0, 0.07, 0], outline: 0.01,
  });
  addBox(g, 0.06, height, depth, 0xe8ddc8, {
    position: [-width / 2 + 0.03, height / 2, 0], outline: 0.008,
  });
  addBox(g, 0.06, height, depth, 0xe8ddc8, {
    position: [width / 2 - 0.03, height / 2, 0], outline: 0.008,
  });
  addBox(g, width - 0.12, height - 0.18, 0.06, 0xcfc2a9, {
    position: [0, height / 2, -depth / 2 + 0.03], outline: 0.008,
  });

  const shelfYs = [0.36, 0.72, 1.08, height - 0.04];
  shelfYs.forEach((y, level) => {
    addBox(g, width - 0.08, 0.035, depth - 0.03, 0xece4d5, {
      position: [0, y, 0.005], outline: 0.005, castShadow: false,
    });
    if (level === shelfYs.length - 1) return;
    const count = Math.max(7, Math.floor(width / 0.22));
    for (let i = 0; i < count; i++) {
      const bx = -width / 2 + 0.14 + i * ((width - 0.28) / Math.max(1, count - 1));
      const w = 0.105 + random() * 0.05;
      const h = 0.14 + random() * 0.055;
      if (random() > 0.72) {
        addSnackStrip(g, bx, y + h / 2 + 0.018, depth / 2 - 0.075, pick(snackColors), w, h);
      } else {
        addProductBox(g, bx, y + h / 2 + 0.018, depth / 2 - 0.085, w, h, 0.075, pick(snackColors), 0, random() > 0.7 ? 0xf7f0df : null);
      }
    }
    addBox(g, width - 0.1, 0.055, 0.018, 0xf7ecd7, {
      position: [0, y + 0.015, depth / 2 + 0.012], outline: 0.004, castShadow: false,
      material: getRailMaterial(),
    });
    addBox(g, width - 0.12, 0.028, 0.028, 0x9aa6a0, {
      position: [0, y, depth / 2 + 0.03], outline: 0.003, castShadow: false,
    });
  });

  // Row of price strips and a few top merchandise items.
  for (let i = 0; i < 5; i++) {
    addProductBox(g, -width / 2 + 0.25 + i * (width - 0.5) / 4, height + 0.1, 0, 0.2, 0.16, 0.2, pick(snackColors));
  }
  return g;
}

function addMagazineRack(parent, textures) {
  const g = new THREE.Group();
  g.position.set(-4.1, L.floorTop, 0.87);
  parent.add(g);
  addBox(g, 2.45, 0.12, 0.5, 0x375b59, {
    position: [0, 0.06, 0], outline: 0.01,
  });
  addBox(g, 2.45, 1.2, 0.06, 0xe7ddc8, {
    position: [0, 0.6, -0.22], outline: 0.008,
  });
  addBox(g, 2.45, 0.04, 0.4, 0xece2ce, {
    position: [0, 0.76, 0], outline: 0.005,
  });
  addBox(g, 2.45, 0.04, 0.4, 0xece2ce, {
    position: [0, 1.15, 0], outline: 0.005,
  });
  addBox(g, 2.45, 0.07, 0.46, 0x2f5554, {
    position: [0, 1.24, 0], outline: 0.008,
  });
  addTextPlane(g, T.makeInteriorSignTexture('雑誌・コミック', 'MAGAZINES & COMICS', {
    bg: '#f2e7d2', width: 700, height: 180,
  }), 1.75, 0.3, {
    position: [0, 1.47, 0.04],
  });
  const covers = [];
  for (let i = 0; i < 8; i++) covers.push(T.makeMagazineTexture(i));
  for (let row = 0; row < 2; row++) {
    const y = row === 0 ? 0.46 : 0.87;
    const z = 0.18;
    for (let i = 0; i < 6; i++) {
      const mat = basicTexture(covers[(i + row * 3) % covers.length], { side: THREE.DoubleSide });
      const cover = addPlane(g, 0.27, 0.36, mat, {
        position: [-1.02 + i * 0.405, y + 0.19, z + 0.02],
        rotation: [-0.08, 0.07 * (i % 2 ? 1 : -1), 0],
      });
      cover.castShadow = false;
      addBox(g, 0.285, 0.385, 0.02, 0xf5eedf, {
        position: [-1.02 + i * 0.405, y + 0.19, z - 0.01],
        outline: 0.003, castShadow: false,
      });
    }
  }
  return g;
}

function addPoster(parent, texture, x, y, z, rotationY, width, height, frameColor = 0xe6d8bf) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotationY;
  parent.add(g);
  addBox(g, width + 0.055, height + 0.055, 0.035, frameColor, {
    position: [0, 0, -0.012], outline: 0.004, castShadow: false,
  });
  addPlane(g, width, height, basicTexture(texture, { side: THREE.DoubleSide }), {
    position: [0, 0, 0.008],
  });
  return g;
}

function addHangingSign(parent, texture, position) {
  const g = new THREE.Group();
  g.position.set(...position);
  parent.add(g);
  const width = 2.0;
  const height = 0.34;
  addBox(g, width + 0.06, height + 0.06, 0.055, 0xe6d8ba, {
    position: [0, 0, 0], outline: 0.006, castShadow: false,
  });
  const mat = basicTexture(texture, { side: THREE.DoubleSide, toneMapped: false });
  addPlane(g, width, height, mat, { position: [0, 0, 0.032] });
  addPlane(g, width, height, mat, { position: [0, 0, -0.032], rotation: [0, Math.PI, 0] });
  [-0.75, 0.75].forEach((x) => {
    addCylinder(g, 0.007, 0.007, 0.56, 0x5f6864, {
      position: [x, height / 2 + 0.28, 0], radialSegments: 5, outline: 0, castShadow: false,
    });
  });
  return g;
}

function addCheckout(parent, tex, anim) {
  const g = new THREE.Group();
  g.position.set(0.35, L.floorTop, -2.28);
  parent.add(g);

  addBox(g, 1.55, 0.76, 0.62, 0x245358, { position: [0, 0.38, 0], outline: 0.014 });
  addBox(g, 1.55, 0.06, 0.7, 0xeadfc9, { position: [0, 0.79, 0], outline: 0.008 });
  addBox(g, 1.4, 0.36, 0.05, 0xe6d5b8, { position: [0, 0.44, 0.33], outline: 0.006 });
  addBox(g, 1.4, 0.06, 0.075, 0xc48b50, { position: [0, 0.67, 0.34], outline: 0.005 });

  // POS terminal, customer display and scanner.
  addBox(g, 0.28, 0.14, 0.22, 0x25353a, { position: [0.33, 0.89, -0.02], outline: 0.008 });
  addBox(g, 0.05, 0.3, 0.055, 0x3b4b4d, {
    position: [0.33, 1.09, -0.06], rotation: [0.12, 0, 0], outline: 0.004,
  });
  addPlane(g, 0.31, 0.2, basicTexture(T.makeInteriorSignTexture('いらっしゃいませ', 'HOSHIMI POS  ·  24H', {
    bg: '#dff4e8', fg: '#1c5559', accent: '#dc644c', width: 560, height: 340,
  }), { toneMapped: false }), {
    position: [0.33, 1.2, -0.025], rotation: [-0.19, 0, 0],
  });
  addBox(g, 0.18, 0.08, 0.16, 0x26383c, { position: [-0.28, 0.86, 0.16], outline: 0.005 });
  addBox(g, 0.14, 0.016, 0.14, 0xb8483f, { position: [-0.28, 0.902, 0.16], outline: 0 });

  // Card reader.
  addBox(g, 0.17, 0.055, 0.12, 0x34464a, { position: [0.6, 0.845, 0.18], rotation: [0, -0.2, 0], outline: 0.004 });
  addPlane(g, 0.12, 0.06, flatMaterial(0x9be3dd), { position: [0.6, 0.88, 0.225], rotation: [-0.35, -0.2, 0] });

  // Oden warmer with a warm, glassy countertop glow.
  const oden = new THREE.Group();
  oden.position.set(-0.5, 0.84, 0.0);
  g.add(oden);
  addBox(oden, 0.45, 0.085, 0.3, 0xb9ae98, { position: [0, 0.04, 0], outline: 0.006 });
  addBox(oden, 0.41, 0.008, 0.26, 0xdca14f, {
    position: [0, 0.085, 0], outline: 0, material: flatMaterial(0xdf9e42, { toneMapped: false }),
  });
  for (let ix = 0; ix < 3; ix++) {
    for (let iz = 0; iz < 2; iz++) {
      const x = -0.135 + ix * 0.135;
      const z = -0.065 + iz * 0.13;
      addCylinder(oden, 0.032, 0.032, 0.045, ix === 1 ? 0xf0e1b7 : 0xa6793e, {
        position: [x, 0.115, z], radialSegments: 7, outline: 0.002,
      });
    }
  }
  const odenGlass = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.16, 0.32), new THREE.MeshBasicMaterial({
    color: 0xdff0ef, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide,
  }));
  odenGlass.position.set(0, 0.18, 0);
  oden.add(odenGlass);
  addBox(oden, 0.47, 0.025, 0.34, 0xb2a68e, { position: [0, 0.265, 0], outline: 0.004 });
  anim.steamAnchors.push({ x: 0.35 - 0.5, y: L.floorTop + 1.11, z: -2.28, scale: 0.13, color: 0xffe6b8 });

  addBox(g, 0.55, 0.035, 0.1, 0xf0e8d8, { position: [-0.49, 0.82, 0.22], outline: 0.003 });

  // Staff-side counter with coffee machine, cups, microwave and hot case.
  const back = new THREE.Group();
  back.position.set(0.0, 0, -1.23);
  g.add(back);
  addBox(back, 1.72, 0.72, 0.54, 0x315a59, { position: [0, 0.36, 0], outline: 0.012 });
  addBox(back, 1.8, 0.055, 0.62, 0xe9deca, { position: [0, 0.77, 0], outline: 0.008 });
  addBox(back, 1.6, 0.4, 0.05, 0xdaccb4, { position: [0, 0.4, 0.28], outline: 0.005 });

  const coffee = new THREE.Group();
  coffee.position.set(0.38, 0.8, 0.02);
  back.add(coffee);
  addRoundedBox(coffee, 0.4, 0.62, 0.34, 0.035, 0xe6e2d9, { position: [0, 0.31, 0], outline: 0.006 });
  addBox(coffee, 0.32, 0.17, 0.02, 0x23353b, { position: [0, 0.45, 0.181], outline: 0.003 });
  addPlane(coffee, 0.25, 0.11, flatMaterial(0xa8e4dc), { position: [0, 0.48, 0.194] });
  addBox(coffee, 0.4, 0.06, 0.22, 0x38494a, { position: [0, 0.16, 0.11], outline: 0.004 });
  addCylinder(coffee, 0.035, 0.035, 0.04, 0xf6f0df, {
    position: [0.1, 0.11, 0.22], radialSegments: 10, outline: 0.002,
  });
  addCylinder(coffee, 0.03, 0.03, 0.09, 0x25363a, {
    position: [0.1, 0.23, 0.18], radialSegments: 8, outline: 0.002,
  });
  addCylinder(coffee, 0.035, 0.035, 0.04, 0xf6f0df, {
    position: [-0.1, 0.11, 0.22], radialSegments: 10, outline: 0.002,
  });
  addCylinder(coffee, 0.03, 0.03, 0.09, 0x25363a, {
    position: [-0.1, 0.23, 0.18], radialSegments: 8, outline: 0.002,
  });
  for (let i = 0; i < 3; i++) {
    addCylinder(coffee, 0.05, 0.05, 0.055, 0xf8f0db, {
      position: [-0.13 + i * 0.045, 0.72, 0.02], radialSegments: 8, outline: 0.002,
    });
  }
  anim.steamAnchors.push({ x: 0.73, y: L.floorTop + 1.5, z: -3.49, scale: 0.075, color: 0xffe9c7 });

  const microwave = new THREE.Group();
  microwave.position.set(-0.45, 0.8, 0.0);
  back.add(microwave);
  addRoundedBox(microwave, 0.42, 0.28, 0.34, 0.02, 0xd8d7ce, { position: [0, 0.14, 0], outline: 0.005 });
  addBox(microwave, 0.27, 0.19, 0.01, 0x28353a, { position: [-0.04, 0.15, 0.175], outline: 0.002 });
  addPlane(microwave, 0.22, 0.14, flatMaterial(0x6f9691), { position: [-0.04, 0.15, 0.182] });
  addBox(microwave, 0.025, 0.2, 0.02, 0x9eaaa9, { position: [0.155, 0.14, 0.18], outline: 0 });

  // Hot snack case.
  const hotCase = new THREE.Group();
  hotCase.position.set(-0.53, 0.8, 0.0);
  back.add(hotCase);
  addBox(hotCase, 0.38, 0.22, 0.28, 0xe1b25f, {
    position: [0, 0.11, 0], outline: 0.006,
    material: toon(0xd9a94e, { emissive: 0x8b4f18, emissiveIntensity: 0.35 }),
  });
  const hotGlass = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.26), new THREE.MeshPhysicalMaterial({
    color: 0xffe9bf, transparent: true, opacity: 0.18, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide,
  }));
  hotGlass.position.set(0, 0.18, 0);
  hotCase.add(hotGlass);
  for (let i = 0; i < 4; i++) {
    const chicken = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), toon(0xa95a2d));
    chicken.scale.set(1.3, 0.7, 1);
    chicken.position.set(-0.12 + i * 0.08, 0.1, 0.03);
    hotCase.add(chicken);
  }

  // Small receipt and bag rack.
  addBox(g, 0.2, 0.18, 0.08, 0x2b3d40, { position: [0.28, 0.69, 0.36], outline: 0.004 });
  addBox(g, 0.02, 0.07, 0.02, 0xe6e1d2, { position: [0.28, 0.83, 0.36], outline: 0 });
  return g;
}

function addBackroom(parent, tex, anim) {
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0.55, L.floorTop, -5.965);
  parent.add(doorGroup);
  addBox(doorGroup, 0.9, 2.12, 0.08, 0xc9d1cc, { position: [0, 1.06, 0], outline: 0.008 });
  addBox(doorGroup, 0.8, 1.98, 0.035, 0xaebbb8, { position: [0, 1.03, 0.06], outline: 0.004 });
  addBox(doorGroup, 0.36, 0.32, 0.025, 0x42565b, { position: [0, 1.56, 0.085], outline: 0.002 });
  addPlane(doorGroup, 0.27, 0.19, flatMaterial(0x68888c), { position: [0, 1.56, 0.10] });
  addCylinder(doorGroup, 0.018, 0.018, 0.14, 0x77837e, {
    position: [0.32, 1.03, 0.105], rotation: [0, 0, Math.PI / 2], outline: 0,
    radialSegments: 6,
  });
  addTextPlane(doorGroup, T.makeInteriorSignTexture('STAFF ONLY', '従業員専用', {
    bg: '#edf0e8', fg: '#3d4a4a', accent: '#7b8885', width: 620, height: 240,
  }), 0.47, 0.19, { position: [0, 2.27, 0.10] });

  const lockers = new THREE.Group();
  lockers.position.set(1.28, L.floorTop, -5.78);
  parent.add(lockers);
  addBox(lockers, 0.48, 1.88, 0.36, 0xadb9b2, { position: [0, 0.94, 0], outline: 0.008 });
  for (let i = 0; i < 3; i++) {
    addBox(lockers, 0.42, 0.54, 0.03, 0x98a8a3, { position: [0, 0.32 + i * 0.59, 0.19], outline: 0.003 });
    addBox(lockers, 0.17, 0.025, 0.02, 0x586b6a, { position: [0, 0.15 + i * 0.59, 0.205], outline: 0 });
    for (let v = 0; v < 3; v++) {
      addBox(lockers, 0.2, 0.012, 0.005, 0x4e625f, { position: [0, 0.51 + i * 0.59 - v * 0.03, 0.208], outline: 0 });
    }
  }

  // Cardboard stock stacked near the back door.
  for (let i = 0; i < 5; i++) {
    addBox(parent, 0.38, 0.3, 0.32, 0xbf9b6f, {
      position: [0.05, L.floorTop + 0.15 + (i % 2) * 0.31, -5.75 - Math.floor(i / 2) * 0.02],
      rotation: [0, 0.06 * (i % 3), 0], outline: 0.006,
    });
  }

  // Stockroom light leaking above the door.
  addBox(parent, 0.58, 0.05, 0.12, 0xfff2cd, {
    position: [0.55, 2.74, -5.91], outline: 0,
    material: flatMaterial(0xffe3a6, { toneMapped: false }),
  });
}

function addCeiling(parent, tex, anim) {
  addBox(parent, 7.55, 0.08, 7.45, 0xf1e6d1, {
    position: [-2.2, 3.08, -2.3], outline: 0.012, castShadow: false,
  });
  const stripZ = [-4.8, -3.2, -1.6, 0.0];
  stripZ.forEach((z, index) => {
    addBox(parent, 6.5, 0.028, 0.24, 0xfff7df, {
      position: [-2.45, 3.015, z], outline: 0, castShadow: false,
      material: flatMaterial(index % 2 === 0 ? 0xfff4cf : 0xfff8e7, { toneMapped: false }),
    });
    addBox(parent, 6.6, 0.02, 0.33, 0xe3d7c0, {
      position: [-2.45, 3.04, z], outline: 0.003, castShadow: false,
    });
  });
  // Tiny ceiling speakers and vents add interior realism.
  for (let i = 0; i < 4; i++) {
    addCylinder(parent, 0.07, 0.07, 0.025, 0xd8d0c1, {
      position: [-5.0 + i * 1.55, 3.045, -0.75], radialSegments: 10, outline: 0.002, castShadow: false,
    });
    addBox(parent, 0.3, 0.02, 0.14, 0xb8b2a6, {
      position: [-5.0 + i * 1.55, 3.04, -3.95], outline: 0, castShadow: false,
    });
  }
}

function addCoffeeAndMagazines(parent) {
  // A small second magazine tier on the front-left wall.
  addBox(parent, 0.08, 1.9, 2.2, 0xd9cbb5, {
    position: [-5.9, 1.2, -1.15], outline: 0.008,
  });
  for (let i = 0; i < 4; i++) {
    addBox(parent, 0.04, 0.03, 1.9, 0xeadfc9, {
      position: [-5.85, 0.55 + i * 0.42, -1.15], outline: 0.002, castShadow: false,
    });
  }
}

function addStoreDetails(parent, tex, anim) {
  // Floor guides.
  const arrowMat = basicTexture(T.makeFloorArrowTexture(), { transparent: true, side: THREE.DoubleSide });
  const arrow1 = addPlane(parent, 0.42, 0.8, arrowMat, {
    position: [-0.1, L.floorTop + 0.006, -0.55],
    rotation: [-Math.PI / 2, 0, 0],
  });
  arrow1.renderOrder = 2;
  const arrow2 = addPlane(parent, 0.34, 0.65, arrowMat, {
    position: [-2.4, L.floorTop + 0.006, -0.55],
    rotation: [-Math.PI / 2, 0, Math.PI],
  });
  arrow2.renderOrder = 2;

  // Small wet-floor cone and mat near the entrance.
  const cone = new THREE.Group();
  cone.position.set(0.72, L.floorTop, 0.25);
  parent.add(cone);
  addCylinder(cone, 0.11, 0.16, 0.04, 0xd8b252, { position: [0, 0.02, 0], radialSegments: 10, outline: 0.004 });
  addMesh(cone, new THREE.ConeGeometry(0.095, 0.35, 10), toon(0xe2b45a), {
    position: [0, 0.21, 0], outline: 0.005,
  });
  addCylinder(cone, 0.11, 0.11, 0.04, 0xf1e8d7, { position: [0, 0.055, 0], radialSegments: 10, outline: 0.003 });

  // Ceiling-hung aisle signs.
  addHangingSign(parent, T.makeInteriorSignTexture('おにぎり・お弁当', 'RICE  ·  BENTO  ·  DELI', {
    bg: '#f5ead5', fg: '#24545a', accent: '#db6048', width: 920, height: 220,
  }), [-3.3, 2.47, -1.2]);
  addHangingSign(parent, T.makeInteriorSignTexture('飲料・お菓子', 'DRINKS  ·  SNACKS  ·  SWEETS', {
    bg: '#f5ead5', fg: '#24545a', accent: '#e0a54d', width: 920, height: 220,
  }), [-1.5, 2.47, -3.45]);
  addHangingSign(parent, T.makeInteriorSignTexture('レジ・コーヒー', 'CHECKOUT  ·  COFFEE', {
    bg: '#f5ead5', fg: '#24545a', accent: '#db6048', width: 920, height: 220,
  }), [0.0, 2.47, -1.4]);

  // Back-wall promotional strip and posters.
  const strip = addTextPlane(parent, T.makeInteriorSignTexture('NEW  ·  秋のいちおし', 'HOSHIMI SELECT  ·  AUTUMN 2026', {
    bg: '#f1d8a1', fg: '#375251', accent: '#d95b44', width: 1000, height: 200,
  }), 2.5, 0.34, { position: [-1.1, 2.78, -5.96] });
  strip.castShadow = false;

  addPoster(parent, T.makePosterTexture(0), -1.55, 2.28, -5.92, 0, 0.44, 0.62);
  addPoster(parent, T.makePosterTexture(1), -4.95, 2.55, -5.92, 0, 0.38, 0.54);
  addPoster(parent, T.makePosterTexture(3), -5.91, 2.0, -3.36, Math.PI / 2, 0.44, 0.62);
  addPoster(parent, T.makePosterTexture(2), 1.66, 2.02, -5.45, -Math.PI / 2, 0.39, 0.55);
  addPoster(parent, T.makePosterTexture(4), 1.66, 2.58, -4.72, -Math.PI / 2, 0.32, 0.46);

  // Window decals, kept faint enough to see the interior.
  const stickerMat = flatMaterial(0xf7f1df, { transparent: true, opacity: 0.75, depthWrite: false });
  const stickerG = new THREE.Group();
  stickerG.position.set(-1.8, 1.3, 1.575);
  parent.add(stickerG);
  addPlane(stickerG, 0.55, 0.22, stickerMat, { position: [0, 0, 0] });
  addTextPlane(stickerG, T.makeInteriorSignTexture('ATM', '24H  SERVICE', {
    bg: '#f7f1df', fg: '#2f6467', accent: '#d45f49', width: 560, height: 220,
  }), 0.52, 0.18, { position: [0, 0, 0.004] });

  // Tiny curtained staff doorway at the far end, plus a mop and bucket.
  addBox(parent, 0.08, 1.65, 0.3, 0xf2e8d4, {
    position: [-4.35, 1.02, -5.86], outline: 0.003,
  });
  addCylinder(parent, 0.025, 0.025, 0.9, 0x9b7b54, {
    position: [-3.9, 0.67, -5.55], rotation: [0.2, 0, 0.24], outline: 0.002,
  });
  addCylinder(parent, 0.17, 0.2, 0.22, 0x5f8b8b, {
    position: [-3.65, 0.35, -5.5], radialSegments: 12, outline: 0.004,
  });
}

export function buildInterior(parent, tex, anim) {
  const interior = new THREE.Group();
  interior.name = 'interior';
  parent.add(interior);

  // Warm inner wall skins hide the exterior shell and keep the shop envelope clean.
  addPlane(interior, 7.5, 2.72, toon(0xf1e4ce), {
    position: [-2.2, 1.64, -5.95],
  });
  addPlane(interior, 7.35, 2.72, toon(0xecdfc9), {
    position: [-5.94, 1.64, -2.28], rotation: [0, Math.PI / 2, 0],
  });
  addBox(interior, 7.42, 0.12, 0.04, palette.deepTeal, {
    position: [-2.2, 0.31, -5.91], outline: 0.003, castShadow: false,
  });
  addBox(interior, 0.04, 0.12, 7.25, palette.deepTeal, {
    position: [-5.90, 0.31, -2.28], outline: 0.003, castShadow: false,
  });

  const floor = addBox(interior, 7.55, 0.08, 7.35, 0xe2d4be, {
    position: [-2.15, L.floorTop - 0.04, -2.3], outline: 0.014,
    material: toon(0xe0d3bd, { map: tex.storeFloor }),
  });
  floor.castShadow = false;

  // Dark entry mat inside the sliding door, aligned with the chamfer.
  const matGroup = new THREE.Group();
  matGroup.position.set(0.77, L.floorTop + 0.006, 0.72);
  matGroup.rotation.y = Math.PI / 4;
  interior.add(matGroup);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.9), basicTexture(tex.mat));
  mat.rotation.x = -Math.PI / 2;
  matGroup.add(mat);

  addCeiling(interior, tex, anim);

  addFridgeBay(interior, -5.35, 1.04, T.makeCoolerHeaderTexture('つめたい飲料'), [
    0x3d7b5d, 0x81a957, 0xe0c56f, 0x3d5d82, 0xb64c43, 0x77b1b2, 0xd3a951, 0xefe9d5,
  ], anim);
  addFridgeBay(interior, -4.29, 1.04, T.makeCoolerHeaderTexture('お茶・水'), [
    0x6ba154, 0x85ad6a, 0xbcc76d, 0x2f6d59, 0x9bc9c9, 0xe2e1d1, 0x426d7a, 0xd4c58e,
  ], anim);
  addFridgeBay(interior, -3.23, 1.04, T.makeCoolerHeaderTexture('COFFEE'), [
    0x3f2b24, 0x6e4a34, 0xaa6c3e, 0xd7b878, 0xeee2c4, 0x863f37, 0x4b5e75, 0xc69458,
  ], anim);

  // Warm bento / onigiri wall shelf.
  const bento = new THREE.Group();
  bento.position.set(-1.78, L.floorTop, -5.55);
  interior.add(bento);
  addBox(bento, 1.3, 2.25, 0.06, 0xe6d8c1, { position: [0, 1.125, -0.27], outline: 0.012 });
  addBox(bento, 0.07, 2.25, 0.58, 0xe6d8c1, { position: [-0.615, 1.125, 0], outline: 0.01 });
  addBox(bento, 0.07, 2.25, 0.58, 0xe6d8c1, { position: [0.615, 1.125, 0], outline: 0.01 });
  addBox(bento, 1.3, 0.09, 0.58, 0xe2d3b9, { position: [0, 2.21, 0], outline: 0.01 });
  addBox(bento, 1.3, 0.14, 0.58, 0xd8c8ad, { position: [0, 0.07, 0], outline: 0.01 });
  addBox(bento, 1.28, 0.36, 0.06, 0x2e5a59, { position: [0, 2.1, 0.255], outline: 0.005 });
  addTextPlane(bento, T.makeInteriorSignTexture('お弁当・おにぎり', 'FRESH  ·  DAILY', {
    bg: '#2e5a59', fg: '#f7ebd2', accent: '#e0a54d', width: 700, height: 180,
  }), 1.12, 0.27, { position: [0, 2.1, 0.292] });
  [0.48, 0.93, 1.38, 1.82].forEach((y, level) => {
    addBox(bento, 1.18, 0.035, 0.5, 0xf2eadb, {
      position: [0, y, 0.02], outline: 0.004, castShadow: false,
    });
    addBox(bento, 1.18, 0.16, 0.025, 0xffe6aa, {
      position: [0, y - 0.075, 0.293], outline: 0, castShadow: false,
      material: flatMaterial(0xffdd9e, { toneMapped: false }),
    });
    for (let i = 0; i < 3; i++) {
      const bx = -0.37 + i * 0.37;
      if (level === 1 || level === 2) {
        addBento(bento, bx, y + 0.02, 0.17, pick(bentoColors));
      } else {
        addOnigiri(bento, bx, y + 0.09, 0.17, pick([0x3f5f4e, 0x273a33]), pick([0xe98b73, 0xd8b45c, 0xb95b4e]));
      }
    }
  });

  addBackroom(interior, tex, anim);
  addCoffeeAndMagazines(interior);

  addGondola(interior, -3.8, -1.2, 3.25, 0.82, 1.42);
  addGondola(interior, -3.95, -2.95, 2.95, 0.82, 1.42);

  // Small chilled dessert case by the right-hand window.
  const dessert = new THREE.Group();
  dessert.position.set(1.28, L.floorTop, -4.35);
  interior.add(dessert);
  addBox(dessert, 0.56, 0.86, 0.52, 0xe0d5c1, { position: [0, 0.43, 0], outline: 0.008 });
  addBox(dessert, 0.5, 0.014, 0.4, 0xeaf6f1, {
    position: [0, 0.87, 0], outline: 0, material: flatMaterial(0xdff5ec, { toneMapped: false }),
  });
  for (let i = 0; i < 4; i++) {
    addBox(dessert, 0.11, 0.08, 0.1, pick([0xf4e4c2, 0xe7c6d1, 0xd9e5cf, 0xf0d59f]), {
      position: [-0.18 + i * 0.12, 0.94, -0.08], outline: 0.002, castShadow: false,
    });
  }
  addBox(dessert, 0.52, 0.38, 0.02, 0xcfe7e3, {
    position: [0, 1.1, 0.27], outline: 0.003, castShadow: false,
    material: new THREE.MeshPhysicalMaterial({
      color: 0xd8ecea, transparent: true, opacity: 0.22, roughness: 0.02, depthWrite: false,
    }),
  });

  addMagazineRack(interior, tex);
  addCheckout(interior, tex, anim);
  addStoreDetails(interior, tex, anim);

  // Warm interior bounce light volumes: thin translucent planes behind windows give the glass a glow.
  addBox(interior, 7.3, 0.03, 0.04, 0xffe8b2, {
    position: [-2.2, 2.98, 1.36], outline: 0, castShadow: false,
    material: flatMaterial(0xffd98c, { toneMapped: false }),
  });

  // Steam sprites for oden and coffee.
  anim.steam = [];
  anim.steamAnchors.forEach((anchor) => {
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex.glow, color: anchor.color, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(anchor.x + (i - 1.5) * 0.03, anchor.y, anchor.z + (i - 1.5) * 0.02);
      sprite.scale.setScalar(anchor.scale);
      interior.add(sprite);
      anim.steam.push({
        sprite, material: mat, baseX: anchor.x + (i - 1.5) * 0.03,
        baseY: anchor.y, baseZ: anchor.z + (i - 1.5) * 0.02,
        phase: i / 4 + Math.random() * 0.2, scale: anchor.scale,
      });
    }
  });

  return { group: interior, floor };
}
