import * as THREE from 'three';
import { GameState } from './GameState.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { Zombie, ZOMBIE_RANKS, rollRank } from './entities/Zombie.js';
import { Skeleton } from './entities/Skeleton.js';
import { ArrowBundle } from './entities/ArrowBundle.js';
import { ProjectileSystem } from './combat/ProjectileSystem.js';
import { createMelee, createRanged } from './combat/weapons.config.js';
import { InputManager } from './systems/InputManager.js';
import { CameraController, VIEW_FIRST_PERSON, VIEW_TOP_DOWN } from './systems/CameraController.js';
import { HUD } from './ui/HUD.js';
import { AudioManager } from './systems/AudioManager.js';
import { Mend } from './abilities/Mend.js';
import { DashStrike } from './abilities/DashStrike.js';

const MAX_DELTA = 1 / 20; // never simulate more than a 50 ms step

// --- Renderer / scene ------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11151d);
scene.fog = new THREE.Fog(0x11151d, 34, 58);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);

scene.add(new THREE.HemisphereLight(0x9fb8e0, 0x2a2118, 0.9));
const sun = new THREE.DirectionalLight(0xfff0d8, 1.5);
sun.position.set(-9, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -25;
sun.shadow.camera.right = 25;
sun.shadow.camera.top = 25;
sun.shadow.camera.bottom = -25;
scene.add(sun);

// --- Arena -----------------------------------------------------------------
const state = new GameState();

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x3b4252, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(40, 40, 0x55607a, 0x39414f);
grid.position.y = 0.01;
scene.add(grid);

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3140, roughness: 0.95 });
for (const [x, z, w, d] of [[0, -20, 40, 1], [0, 20, 40, 1], [-20, 0, 1, 40], [20, 0, 1, 40]]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, d), wallMaterial);
  wall.position.set(x, 0.8, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
}

// --- Entities --------------------------------------------------------------
const projectiles = new ProjectileSystem(scene);

const player = new Player({ scene, projectileSystem: projectiles });
player.equipMelee(createMelee('sword'));
player.equipRanged(createRanged('bow'));
player.abilities[0] = new Mend();
player.abilities[1] = new DashStrike();
state.player = player;

// The dummy stays: it is the thing you tune weapon feel against.
const dummy = new Enemy({ scene, position: new THREE.Vector3(0, 0, -6) });
state.enemies.push(dummy);

// --- Zombie waves ----------------------------------------------------------
const WAVE_SIZE = 4;
const WAVE_DELAY = 6;
let nextWaveAt = 4;

function ringPosition(radius) {
  const angle = Math.random() * Math.PI * 2;
  return new THREE.Vector3(
    THREE.MathUtils.clamp(player.position.x + Math.cos(angle) * radius, -18, 18),
    0,
    THREE.MathUtils.clamp(player.position.z + Math.sin(angle) * radius, -18, 18)
  );
}

function spawnWave() {
  const step = Math.floor(state.time / 45); // slowly gets busier
  const zombies = WAVE_SIZE + step;
  const skeletons = 1 + step;

  // Ranks lean heavier the longer the run goes on.
  const progress = Math.min(1, state.time / 180);
  for (let i = 0; i < zombies; i++) {
    state.enemies.push(
      new Zombie({
        scene,
        position: ringPosition(12 + Math.random() * 5),
        rank: rollRank(progress),
      })
    );
  }
  // Archers start further out — their job is to punish standing still.
  for (let i = 0; i < skeletons; i++) {
    state.enemies.push(
      new Skeleton({
        scene,
        projectileSystem: projectiles,
        position: ringPosition(15 + Math.random() * 4),
      })
    );
  }
}

// --- Arrow bundles ---------------------------------------------------------
// There is no reload: the quiver is what you have, and these are the only way
// to refill it. A few are kept on the field at all times so running dry is a
// reason to move rather than a dead end.
const MAX_BUNDLES = 3;
const BUNDLE_INTERVAL = 7;
const BUNDLE_AMOUNT = 5;
let nextBundleAt = 3;

function spawnArrowBundle() {
  // Somewhere in the arena, but not on top of the player — collecting should
  // cost you a walk.
  for (let attempt = 0; attempt < 12; attempt++) {
    const x = THREE.MathUtils.randFloat(state.arena.minX + 2, state.arena.maxX - 2);
    const z = THREE.MathUtils.randFloat(state.arena.minZ + 2, state.arena.maxZ - 2);
    if (Math.hypot(x - player.position.x, z - player.position.z) < 5) continue;
    state.pickups.push(
      new ArrowBundle({ scene, position: new THREE.Vector3(x, 0, z), amount: BUNDLE_AMOUNT })
    );
    return true;
  }
  return false;
}

function updatePickups(dt) {
  if (state.pickups.length < MAX_BUNDLES && state.time >= nextBundleAt) {
    if (spawnArrowBundle()) nextBundleAt = state.time + BUNDLE_INTERVAL;
  }

  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const bundle = state.pickups[i];
    bundle.update(dt);
    if (player.dead || !bundle.overlaps(player)) continue;

    const taken = player.addArrows(bundle.amount);
    if (taken === 0) continue; // quiver full: leave it on the ground

    state.pushEvent('pickup', { amount: taken });
    state.pushDamageEvent({ x: bundle.position.x, y: 1.2, z: bundle.position.z }, taken, 'pickup');
    bundle.dispose();
    state.pickups.splice(i, 1);
  }
}

function updateWaves(dt) {
  const isSpawned = (e) => e.isZombie || e.isSkeleton;
  const alive = state.enemies.filter((e) => isSpawned(e) && !e.dead).length;

  // Clean up corpses once they have finished falling over.
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (isSpawned(enemy) && enemy.dead && enemy.deathTimer > enemy.removeAfter) {
      scene.remove(enemy.rig.root);
      state.enemies.splice(i, 1);
    }
  }

  if (state.wavesEnabled && alive === 0 && state.time >= nextWaveAt) {
    spawnWave();
    state.pushEvent('wave');
    nextWaveAt = state.time + WAVE_DELAY;
  }
}

const input = new InputManager(renderer.domElement);
state.input = input;
const cameraController = new CameraController(camera);
cameraController.snapTo(player.position);
const hud = new HUD(document);
const audio = new AudioManager();
audio.attachUnlock(window);

// --- Loop ------------------------------------------------------------------
const clock = new THREE.Clock();

function setView(mode) {
  cameraController.setMode(mode);
  const firstPerson = mode === VIEW_FIRST_PERSON;
  player.rig.setHeadVisible(!firstPerson);
  // Movement basis: world-space under the fixed top-down camera, camera-space
  // in first person.
  input.moveBasisYaw = firstPerson ? player.facing : null;
  if (firstPerson) {
    input.lookYaw = player.facing;
    renderer.domElement.requestPointerLock?.();
  } else {
    document.exitPointerLock?.();
    cameraController.snapTo(player.position);
  }
  document.body.classList.toggle('first-person', firstPerson);
}

function handleActions() {
  const firstPerson = cameraController.isFirstPerson;
  if (input.justPressed('melee')) player.swingMelee(state);

  // The bow is draw-and-hold: press pulls the string, release looses it.
  if (input.justPressed('ranged')) player.drawRanged(state);
  if (input.justReleased('ranged')) {
    player.fireRanged(state, firstPerson ? input.lookPitch : null);
  }
  // Swinging the sword abandons a half-drawn shot.
  if (input.justPressed('melee')) player.equippedRanged?.cancelDraw();
  if (input.justPressed('toggle-view')) {
    setView(firstPerson ? VIEW_TOP_DOWN : VIEW_FIRST_PERSON);
  }
  for (let slot = 0; slot < 3; slot++) {
    if (input.justPressed(`ability-${slot + 1}`)) player.useAbility(slot, state);
  }
  if (input.justPressed('hold-melee')) player.setHeld('melee');
  if (input.justPressed('hold-ranged')) player.setHeld('ranged');
  if (input.justPressed('mute')) hud.showToast(audio.toggleMute() ? 'Sound off' : 'Sound on');
  if (input.justPressed('debug-hurt')) player.takeDamage(12, state);
  if (input.justPressed('debug-reset')) resetScene();
}

function resetScene() {
  player.respawn();
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (enemy.isZombie || enemy.isSkeleton) {
      scene.remove(enemy.rig.root);
      state.enemies.splice(i, 1);
    } else {
      enemy.respawn();
    }
  }
  projectiles.clear(state);
  for (const bundle of state.pickups) bundle.dispose();
  state.pickups.length = 0;
  nextWaveAt = state.time + 2;
  nextBundleAt = state.time + 1;
  if (!cameraController.isFirstPerson) cameraController.snapTo(player.position);
}

let inventoryOpen = false;

function toggleInventory() {
  inventoryOpen = !inventoryOpen;
  state.paused = inventoryOpen;
  hud.setInventoryOpen(inventoryOpen, state, player);
  if (inventoryOpen) document.exitPointerLock?.();
}

function tick() {
  requestAnimationFrame(tick);

  const dt = Math.min(clock.getDelta(), MAX_DELTA);
  state.delta = dt;
  state.time += dt;
  state.frame += 1;

  // Input runs even while paused, or the key that opened the inventory could
  // never close it again.
  input.update(camera, player.position);
  if (input.justPressed('inventory')) toggleInventory();

  if (!state.paused) {
    // Hit stop freezes the simulation for a few frames on a heavy landing. The
    // camera and the sound keep running through it — the freeze is what gives
    // the hit weight, and freezing the feedback with it would read as a stutter.
    const frozen = state.hitStop > 0;
    if (frozen) {
      state.hitStop = Math.max(0, state.hitStop - dt);
    } else {
      handleActions();

      player.update(dt, state, input);
      for (const enemy of state.enemies) enemy.update(dt, state);
      projectiles.update(dt, state);
      updateWaves(dt);
      updatePickups(dt);
    }

    audio.update(state);

    // In first person the hero turns with the mouse, so the movement basis has
    // to follow them every frame.
    if (cameraController.isFirstPerson) input.moveBasisYaw = player.facing;

    cameraController.update(
      dt,
      player.position,
      input.hasAim ? input.aimPoint : null,
      { yaw: player.facing, pitch: input.lookPitch },
      state
    );
  }

  hud.update(state.paused ? 0 : dt, state, camera);
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

tick();

// Exposed so the smoke test (tools/verify.mjs) can drive the game headlessly.
// Harmless in normal play, and handy in the console while tuning feel.
window.__game = {
  state, player, input, projectiles, scene, camera, cameraController, hud,
  resetScene, setView, spawnWave, spawnArrowBundle, audio, toggleInventory, rollRank,
  /** Test hook: drop a zombie of a named rank at a spot. */
  spawnRankedZombie(rankId, { x, z }) {
    const rank = ZOMBIE_RANKS.find((r) => r.id === rankId) ?? ZOMBIE_RANKS[0];
    const zombie = new Zombie({ scene, position: new THREE.Vector3(x, 0, z), rank });
    state.enemies.push(zombie);
    return zombie;
  },
  clearZombies() {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      if (state.enemies[i].isZombie || state.enemies[i].isSkeleton) {
        scene.remove(state.enemies[i].rig.root);
        state.enemies.splice(i, 1);
      }
    }
  },
};
