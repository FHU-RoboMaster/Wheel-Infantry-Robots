import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const palette = {
  ink: 0x101522,
  outline: 0x0b1019,
  cream: 0xf1e2c4,
  warmWhite: 0xfff3d7,
  storeWall: 0xe9dcc2,
  storeWallShade: 0xd8c7a8,
  teal: 0x23535a,
  deepTeal: 0x173f47,
  mint: 0x9fc8bd,
  coral: 0xdc634b,
  amber: 0xf0b65c,
  asphalt: 0x1b2634,
  pavement: 0x777e8b,
  curb: 0x9a9ca2,
  glass: 0xb7dce3,
  steel: 0x9aa7ad,
  darkSteel: 0x3b4a50,
  wood: 0x87664b,
  night: 0x0a1424,
};

const gradientData = new Uint8Array([38, 88, 150, 214, 255]);
export const toonGradient = new THREE.DataTexture(gradientData, gradientData.length, 1, THREE.RedFormat);
toonGradient.minFilter = THREE.NearestFilter;
toonGradient.magFilter = THREE.NearestFilter;
toonGradient.generateMipmaps = false;
toonGradient.needsUpdate = true;

const materialCache = new Map();

export function toon(color, options = {}) {
  const key = `${color}-${JSON.stringify(options)}`;
  if (!materialCache.has(key)) {
    const material = new THREE.MeshToonMaterial({
      color,
      gradientMap: toonGradient,
      ...options,
    });
    materialCache.set(key, material);
  }
  return materialCache.get(key);
}

const outlineMaterials = new Map();

function getOutlineMaterial(width) {
  if (!outlineMaterials.has(width)) {
    outlineMaterials.set(width, new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uWidth: { value: width },
          uColor: { value: new THREE.Color(palette.outline) },
        },
      ]),
      vertexShader: /* glsl */ `
        uniform float uWidth;
        #include <common>
        #include <fog_pars_vertex>
        void main() {
          vec3 objectNormal = normalize(normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vec3 worldNormal = normalize(mat3(modelMatrix) * objectNormal);
          worldPosition.xyz += worldNormal * uWidth;
          vec4 mvPosition = viewMatrix * worldPosition;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        #include <common>
        #include <fog_pars_fragment>
        void main() {
          gl_FragColor = vec4(uColor, 1.0);
          #include <fog_fragment>
        }
      `,
      side: THREE.BackSide,
      fog: true,
    }));
  }
  return outlineMaterials.get(width);
}

export function addOutline(mesh, width = 0.016) {
  if (!mesh.geometry || mesh.userData.noOutline) return null;
  const outline = new THREE.Mesh(mesh.geometry, getOutlineMaterial(width));
  outline.name = 'outline';
  outline.renderOrder = -1;
  outline.castShadow = false;
  outline.receiveShadow = false;
  outline.frustumCulled = mesh.frustumCulled;
  mesh.add(outline);
  return outline;
}

export function addMesh(parent, geometry, material, {
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  outline = 0,
  castShadow = true,
  receiveShadow = true,
  name = '',
} = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.scale.set(...scale);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  if (name) m.name = name;
  if (outline > 0) addOutline(m, outline);
  parent.add(m);
  return m;
}

const boxGeoCache = new Map();
export function boxGeo(w, h, d) {
  const key = `${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}`;
  if (!boxGeoCache.has(key)) boxGeoCache.set(key, new THREE.BoxGeometry(w, h, d));
  return boxGeoCache.get(key);
}

export function addBox(parent, w, h, d, color, {
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  outline = 0.012,
  castShadow = true,
  receiveShadow = true,
  material = null,
  name = '',
} = {}) {
  return addMesh(parent, boxGeo(w, h, d), material || toon(color), {
    position, rotation, outline, castShadow, receiveShadow, name,
  });
}

export function addRoundedBox(parent, w, h, d, radius, color, {
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  outline = 0.012,
  castShadow = true,
  receiveShadow = true,
  material = null,
  name = '',
  segments = 2,
} = {}) {
  const geo = new RoundedBoxGeometry(w, h, d, segments, radius);
  return addMesh(parent, geo, material || toon(color), {
    position, rotation, outline, castShadow, receiveShadow, name,
  });
}

export function addCylinder(parent, radiusTop, radiusBottom, height, color, {
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radialSegments = 16,
  outline = 0.01,
  castShadow = true,
  receiveShadow = true,
  material = null,
  name = '',
  openEnded = false,
} = {}) {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, 1, openEnded);
  return addMesh(parent, geo, material || toon(color), {
    position, rotation, outline, castShadow, receiveShadow, name,
  });
}

export function addPlane(parent, w, h, material, {
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  castShadow = false,
  receiveShadow = false,
  name = '',
} = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

export function basicTexture(texture, {
  opacity = 1,
  transparent = false,
  side = THREE.FrontSide,
  color = 0xffffff,
  blending = THREE.NormalBlending,
  depthWrite = true,
  toneMapped = true,
} = {}) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    color,
    transparent,
    opacity,
    side,
    blending,
    depthWrite,
    toneMapped,
  });
}

export function glassMaterial(opacity = 0.12, tint = 0xbfe2ea) {
  return new THREE.MeshBasicMaterial({
    color: tint,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

const glassReflectionCache = new Map();
export function glassReflectionTexture() {
  if (glassReflectionCache.has('texture')) return glassReflectionCache.get('texture');
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 512);
  const grad = ctx.createLinearGradient(0, 0, 256, 512);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.4, 'rgba(210,240,255,.18)');
  grad.addColorStop(0.56, 'rgba(255,255,255,.32)');
  grad.addColorStop(0.68, 'rgba(180,225,255,.08)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.save();
  ctx.translate(120, 0);
  ctx.rotate(-0.42);
  ctx.fillRect(-60, -40, 170, 620);
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  glassReflectionCache.set('texture', tex);
  return tex;
}

export function reflectionPlane(width, length, color, opacity = 0.7, texture) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 3;
  return mesh;
}

export function glowSprite(texture, color, size = 1, opacity = 0.6) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  return sprite;
}

export function flatMaterial(color, {
  transparent = false,
  opacity = 1,
  side = THREE.FrontSide,
  blending = THREE.NormalBlending,
  depthWrite = true,
  toneMapped = false,
} = {}) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent,
    opacity,
    side,
    blending,
    depthWrite,
    toneMapped,
  });
}

export function addTextPlane(parent, texture, w, h, options = {}) {
  const mat = basicTexture(texture, {
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.DoubleSide,
    toneMapped: options.toneMapped ?? true,
  });
  return addPlane(parent, w, h, mat, {
    position: options.position,
    rotation: options.rotation,
    name: options.name,
  });
}

export function addProductBox(parent, x, y, z, w, h, d, color, rotationY = 0, labelColor = null) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  parent.add(group);
  const body = new THREE.Mesh(boxGeo(w, h, d), toon(color));
  body.castShadow = false;
  body.receiveShadow = false;
  group.add(body);
  if (labelColor !== null) {
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.78, h * 0.24),
      flatMaterial(labelColor)
    );
    label.position.set(0, h * 0.02, d / 2 + 0.002);
    group.add(label);
  }
  return group;
}

export function addBottle(parent, x, y, z, color, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.05 * scale, 0.23 * scale, 8), toon(color));
  body.position.y = 0.115 * scale;
  group.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.035 * scale, 0.055 * scale, 8), toon(color));
  neck.position.y = 0.255 * scale;
  group.add(neck);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.028 * scale, 0.028 * scale, 0.025 * scale, 8), toon(palette.warmWhite));
  cap.position.y = 0.294 * scale;
  group.add(cap);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.065 * scale, 0.085 * scale), flatMaterial(0xf8f0dd));
  label.position.set(0, 0.14 * scale, 0.047 * scale);
  group.add(label);
  return group;
}

export function makeCanvasLineTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
