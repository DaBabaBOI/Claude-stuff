import * as THREE from 'three';

/**
 * Environment — renderer settings, lighting, and the arena it all falls on.
 *
 * Everything here is generated at runtime, same as the audio: no textures to
 * load, no network at runtime. Three things do most of the visual work:
 *
 *   1. ACES tone mapping, so bright metal rolls off instead of clipping to a
 *      flat white blob.
 *   2. A real environment map (a gradient, run through PMREM), so every
 *      MeshStandardMaterial has something to reflect. Without one, the "metal"
 *      in the scene is just grey.
 *   3. A textured floor. A single flat colour reads as a placeholder no matter
 *      how good the lighting is.
 */

const ARENA_HALF = 20;

export function configureRenderer(renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Filmic response curve: highlights roll off instead of clipping, which is
  // what stops lit metal turning into a white smear.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
}

/**
 * A three-stop vertical gradient, wrapped as an equirectangular map and run
 * through PMREM so materials can use it for ambient reflection. Cheap stand-in
 * for an HDRI, and the difference between "grey plastic" and "steel" is almost
 * entirely this.
 */
export function createEnvironment(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#6d86b8');   // cool overhead light
  sky.addColorStop(0.45, '#3c4560');
  sky.addColorStop(0.55, '#2a2f42');
  sky.addColorStop(1, '#16161c');   // dark ground bounce
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // A warm patch, so reflections have some direction to them rather than
  // being a uniform wash.
  const warm = ctx.createRadialGradient(70, 40, 4, 70, 40, 60);
  warm.addColorStop(0, 'rgba(255, 206, 140, 0.85)');
  warm.addColorStop(1, 'rgba(255, 206, 140, 0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(texture).texture;
  pmrem.dispose();
  texture.dispose();

  return envMap;
}

/** Deterministic value noise, so the floor looks the same every run. */
function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Flagstone floor: tiles with per-tile colour variation, dark mortar, and
 * speckle. The roughness map is a second pass of the same noise, so the floor
 * catches light unevenly instead of shining like a single sheet of plastic.
 */
function createFloorTextures() {
  const size = 512;
  const tiles = 8;
  const step = size / tiles;

  const colour = document.createElement('canvas');
  colour.width = colour.height = size;
  const c = colour.getContext('2d');

  const rough = document.createElement('canvas');
  rough.width = rough.height = size;
  const r = rough.getContext('2d');

  c.fillStyle = '#20242e';
  c.fillRect(0, 0, size, size);
  r.fillStyle = '#b4b4b4';
  r.fillRect(0, 0, size, size);

  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      // Offset every other row so it reads as masonry, not graph paper.
      const offset = ty % 2 === 0 ? 0 : step / 2;
      const x = (tx * step + offset) % size;
      const y = ty * step;
      const shade = 0.72 + hash(tx, ty) * 0.42;

      c.fillStyle = `rgb(${Math.round(58 * shade)}, ${Math.round(64 * shade)}, ${Math.round(78 * shade)})`;
      c.fillRect(x + 1.5, y + 1.5, step - 3, step - 3);
      if (offset > 0 && x + step > size) {
        c.fillRect(x - size + 1.5, y + 1.5, step - 3, step - 3);
      }

      const wear = Math.round(150 + hash(tx + 31, ty + 17) * 90);
      r.fillStyle = `rgb(${wear}, ${wear}, ${wear})`;
      r.fillRect(x + 1.5, y + 1.5, step - 3, step - 3);
    }
  }

  // Speckle: grit in the stone and blotches in the roughness.
  for (let i = 0; i < 4200; i++) {
    const x = hash(i, 3) * size;
    const y = hash(i, 7) * size;
    const v = hash(i, 11);
    c.fillStyle = `rgba(${v > 0.5 ? 255 : 0}, ${v > 0.5 ? 250 : 0}, ${v > 0.5 ? 235 : 0}, 0.045)`;
    c.fillRect(x, y, 2, 2);
    r.fillStyle = `rgba(255,255,255,${0.05 + v * 0.06})`;
    r.fillRect(hash(i, 13) * size, hash(i, 19) * size, 6, 6);
  }

  const colourMap = new THREE.CanvasTexture(colour);
  colourMap.colorSpace = THREE.SRGBColorSpace;
  const roughMap = new THREE.CanvasTexture(rough);

  for (const map of [colourMap, roughMap]) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(10, 10);
    map.anisotropy = 8;
  }

  return { colourMap, roughMap };
}

/** Warm, flickering light sources. They are also the only thing lighting the
 *  floor's far corners, so the arena has somewhere darker to be. */
function createBrazier(scene, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.38, 1.1, 7),
    new THREE.MeshStandardMaterial({ color: 0x2c303c, roughness: 0.95 })
  );
  plinth.position.y = 0.55;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.22, 0.26, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a3226, roughness: 0.8, metalness: 0.4 })
  );
  bowl.position.y = 1.2;
  bowl.castShadow = true;
  group.add(bowl);

  const emberMaterial = new THREE.MeshStandardMaterial({
    color: 0xff9b3d,
    emissive: 0xff6a12,
    emissiveIntensity: 2.4,
    roughness: 0.6,
  });
  const ember = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), emberMaterial);
  ember.position.y = 1.32;
  group.add(ember);

  const light = new THREE.PointLight(0xffa64d, 14, 16, 2);
  light.position.set(0, 1.5, 0);
  group.add(light);

  scene.add(group);
  return { light, ember, emberMaterial, phase: Math.random() * Math.PI * 2 };
}

export function buildArena(scene, envMap) {
  scene.background = new THREE.Color(0x0b0d13);
  scene.environment = envMap;
  scene.fog = new THREE.Fog(0x0b0d13, 26, 62);

  const { colourMap, roughMap } = createFloorTextures();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2),
    new THREE.MeshStandardMaterial({
      map: colourMap,
      roughnessMap: roughMap,
      roughness: 1,
      metalness: 0.05,
      envMapIntensity: 0.5,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const stone = new THREE.MeshStandardMaterial({
    color: 0x2a3040,
    roughness: 0.9,
    metalness: 0.05,
    envMapIntensity: 0.6,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: 0x384156,
    roughness: 0.75,
    metalness: 0.15,
  });

  const walls = [
    [0, -ARENA_HALF, ARENA_HALF * 2, 1],
    [0, ARENA_HALF, ARENA_HALF * 2, 1],
    [-ARENA_HALF, 0, 1, ARENA_HALF * 2],
    [ARENA_HALF, 0, 1, ARENA_HALF * 2],
  ];
  for (const [x, z, w, d] of walls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, d), stone);
    wall.position.set(x, 1.3, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.22, d + 0.25), trim);
    cap.position.set(x, 2.65, z);
    cap.castShadow = true;
    scene.add(cap);
  }

  // Pillars break up the floor and give the shadows something to do.
  const pillarGeometry = new THREE.CylinderGeometry(0.42, 0.5, 4.2, 8);
  for (const [px, pz] of [
    [-12, -12], [12, -12], [-12, 12], [12, 12],
    [0, -15], [0, 15], [-15, 0], [15, 0],
  ]) {
    const pillar = new THREE.Mesh(pillarGeometry, stone);
    pillar.position.set(px, 2.1, pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);
  }

  const braziers = [
    createBrazier(scene, -8, -8),
    createBrazier(scene, 8, -8),
    createBrazier(scene, -8, 8),
    createBrazier(scene, 8, 8),
  ];

  return {
    /** Flicker, so the warm light is not a dead lamp. */
    update(time) {
      for (const b of braziers) {
        const flicker = 0.82 + Math.sin(time * 9 + b.phase) * 0.1 + Math.sin(time * 23 + b.phase) * 0.06;
        b.light.intensity = 14 * flicker;
        b.emberMaterial.emissiveIntensity = 2.4 * flicker;
        b.ember.rotation.y += 0.01;
        b.ember.scale.setScalar(0.95 + flicker * 0.08);
      }
    },
  };
}

/**
 * Key, fill and rim. The key is the only shadow caster — more shadow maps buys
 * very little here and costs a lot. Its frustum is pulled in tight around the
 * arena so the shadow map's texels land where the action is.
 */
export function buildLighting(scene) {
  scene.add(new THREE.HemisphereLight(0x8aa2d0, 0x241d18, 0.55));

  const key = new THREE.DirectionalLight(0xffeccd, 2.1);
  key.position.set(-11, 18, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -22;
  key.shadow.camera.right = 22;
  key.shadow.camera.top = 22;
  key.shadow.camera.bottom = -22;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 46;
  key.shadow.bias = -0.0009;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  // Cool fill from the opposite side, to keep shadowed faces readable.
  const fill = new THREE.DirectionalLight(0x6f8fd6, 0.55);
  fill.position.set(12, 9, -10);
  scene.add(fill);

  // Low rim from behind, which is what separates a dark character from a dark
  // floor in a top-down view.
  const rim = new THREE.DirectionalLight(0xbcd2ff, 0.7);
  rim.position.set(3, 5, -16);
  scene.add(rim);

  return { key, fill, rim };
}
