import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildWorld } from './world.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x08111b, 0.013);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(85, 32, 20),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec3 dir = normalize(vWorldPosition);
        float h = clamp(dir.y * 1.25 + 0.06, 0.0, 1.0);
        vec3 horizon = vec3(0.022, 0.043, 0.078);
        vec3 zenith = vec3(0.004, 0.009, 0.021);
        vec3 col = mix(horizon, zenith, smoothstep(0.0, 0.62, h));
        vec2 flatDir = normalize(dir.xz + vec2(0.0001));
        float cityGlow = pow(max(0.0, dot(flatDir, normalize(vec2(-0.72, 0.55)))), 5.0);
        col += vec3(0.018, 0.026, 0.042) * cityGlow * (1.0 - smoothstep(0.0, 0.42, h));
        float band = exp(-pow((h - 0.18) * 8.0, 2.0));
        col += vec3(0.008, 0.013, 0.025) * band;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
);
scene.add(sky);

function createWetEnvironment() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#070e1c');
  sky.addColorStop(0.42, '#162844');
  sky.addColorStop(0.5, '#24384e');
  sky.addColorStop(0.54, '#101720');
  sky.addColorStop(1, '#030507');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 512);
  const glows = [
    [150, 270, 170, 'rgba(255,171,91,.2)'],
    [480, 250, 230, 'rgba(103,173,192,.12)'],
    [830, 265, 190, 'rgba(255,145,104,.12)'],
  ];
  glows.forEach(([x, y, radius, color]) => {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1024, 512);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const generator = new THREE.PMREMGenerator(renderer);
  generator.compileEquirectangularShader();
  const env = generator.fromEquirectangular(texture).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  texture.dispose();
}

createWetEnvironment();

const camera = new THREE.PerspectiveCamera(33, window.innerWidth / window.innerHeight, 0.1, 160);
camera.position.set(16.25, 6.5, 19.15);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-1.2, 0.5, -1.2);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = false;
controls.minDistance = 7.5;
controls.maxDistance = 60;
controls.minPolarAngle = 0.24;
controls.maxPolarAngle = 1.44;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.82;
controls.update();

const baseDistance = camera.position.distanceTo(controls.target);
const framePoints = [];
for (const x of [-8, 8]) {
  for (const y of [-0.9, 0.2]) {
    for (const z of [-8, 8]) framePoints.push(new THREE.Vector3(x, y, z));
  }
}

function fitCameraToAspect() {
  const direction = camera.position.clone().sub(controls.target).normalize();
  let distance = baseDistance;
  const margin = 0.94;
  for (let iteration = 0; iteration < 5; iteration++) {
    camera.position.copy(controls.target).addScaledVector(direction, distance);
    camera.lookAt(controls.target);
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    let overflow = 0;
    framePoints.forEach((point) => {
      const projected = point.clone().project(camera);
      overflow = Math.max(overflow, Math.abs(projected.x) / margin, Math.abs(projected.y) / margin);
    });
    if (overflow <= 1.001) break;
    distance *= overflow * 1.015;
  }
  camera.position.copy(controls.target).addScaledVector(direction, distance);
  controls.update();
}

fitCameraToAspect();

const world = buildWorld(scene);

const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
  type: THREE.HalfFloatType,
  samples: 2,
});
const composer = new EffectComposer(renderer, renderTarget);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5),
  0.26,
  0.52,
  0.92
);
composer.addPass(bloom);
bloom.setSize(window.innerWidth * 0.5, window.innerHeight * 0.5);

const grade = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float dist = length(centered * vec2(1.0, 1.24));
      vec2 aberration = centered * dist * 0.0024;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + aberration).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - aberration).b;

      col.r *= 1.012;
      col.b *= 1.045;
      col = mix(col, col * vec3(0.93, 0.98, 1.08), 0.28);

      float vig = smoothstep(0.94, 0.24, dist);
      col *= mix(0.62, 1.0, vig);
      float grain = hash(uv * uResolution + fract(uTime) * 97.0) - 0.5;
      col += grain * 0.012;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
composer.addPass(grade);
composer.addPass(new OutputPass());

let lastTime = performance.now();
let elapsed = 0;

function animate(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  elapsed += dt;
  world.update(elapsed, dt);
  controls.update();
  grade.uniforms.uTime.value = elapsed;
  composer.render();
}

renderer.setAnimationLoop(animate);

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(width, height);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(width, height);
  bloom.setSize(width * 0.5, height * 0.5);
  grade.uniforms.uResolution.value.set(width, height);
  fitCameraToAspect();
}
window.addEventListener('resize', onResize);

// Exposed for inspection and automated visual checks only; there is no visible UI.
window.__diorama = { scene, camera, renderer, composer, controls, world };
