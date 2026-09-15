import * as THREE from 'three';
import { GameState } from './GameState.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { ProjectileSystem } from './combat/ProjectileSystem.js';
import { createMelee, createRanged } from './combat/weapons.config.js';
import { InputManager } from './systems/InputManager.js';
import { CameraController } from './systems/CameraController.js';
import { HUD } from './ui/HUD.js';

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
state.player = player;

state.enemies.push(new Enemy({ scene, position: new THREE.Vector3(0, 0, -4) }));

const input = new InputManager(renderer.domElement);
const cameraController = new CameraController(camera);
cameraController.snapTo(player.position);
const hud = new HUD(document);

// --- Loop ------------------------------------------------------------------
const clock = new THREE.Clock();

function handleActions() {
  if (input.justPressed('melee')) player.swingMelee(state);
  if (input.justPressed('ranged')) player.fireRanged(state);
  if (input.justPressed('reload')) player.reload(state);
  if (input.justPressed('hold-melee')) player.setHeld('melee');
  if (input.justPressed('hold-ranged')) player.setHeld('ranged');
  if (input.justPressed('debug-hurt')) player.takeDamage(12, state);
  if (input.justPressed('debug-reset')) resetScene();
}

function resetScene() {
  player.respawn();
  for (const enemy of state.enemies) enemy.respawn();
  projectiles.clear(state);
  cameraController.snapTo(player.position);
}

function tick() {
  requestAnimationFrame(tick);

  const dt = Math.min(clock.getDelta(), MAX_DELTA);
  state.delta = dt;
  state.time += dt;
  state.frame += 1;

  input.update(camera, player.position);
  handleActions();

  player.update(dt, state, input);
  for (const enemy of state.enemies) enemy.update(dt, state);
  projectiles.update(dt, state);

  cameraController.update(dt, player.position, input.hasAim ? input.aimPoint : null);
  hud.update(dt, state, camera);

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
window.__game = { state, player, input, projectiles, resetScene, scene, camera };
