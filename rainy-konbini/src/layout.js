export const L = {
  half: 8,
  asphaltTop: 0.10,
  sidewalkTop: 0.20,
  floorTop: 0.24,
  store: {
    x0: -6.10,
    x1: 1.75,
    z0: -6.10,
    z1: 1.55,
    wallTop: 3.55,
    glassBottom: 0.42,
    glassTop: 3.00,
    chamfer: 1.20,
  },
  chamfer: {
    frontX: 0.55,
    frontZ: 1.55,
    sideX: 1.75,
    sideZ: 0.35,
  },
  door: {
    x: 1.15,
    z: 0.95,
    angle: Math.PI / 4,
    width: Math.SQRT2 * 1.2,
  },
};

export const storeCenter = {
  x: (L.store.x0 + L.store.x1) / 2,
  z: (L.store.z0 + L.store.z1) / 2,
};

export const doorNormal = {
  x: Math.SQRT1_2,
  z: Math.SQRT1_2,
};
