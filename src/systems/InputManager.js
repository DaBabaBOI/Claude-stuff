import * as THREE from 'three';
import { yawFromDirection } from '../mathUtils.js';

/**
 * InputManager — turns keyboard/mouse (or a gamepad) into two simple things
 * the rest of the game can read:
 *
 *   input.moveVector  -> normalised {x, z} in WORLD space
 *   input.aimYaw      -> the yaw the player should face
 *
 * The camera is locked to a fixed angle with no yaw, so screen-up is world -Z
 * and no camera-relative transform is needed. Mouse aim is a ray from the
 * camera onto the ground plane (y = 0).
 */

/** Cursor closer than this to the hero counts as "no aim" (see update()). */
const AIM_DEAD_ZONE = 0.9;

const KEY_BINDINGS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  KeyR: 'reload',
  Digit1: 'hold-melee',
  Digit2: 'hold-ranged',
  KeyH: 'debug-hurt',
  KeyQ: 'debug-reset',
};

export class InputManager {
  constructor(domElement) {
    this.dom = domElement;
    this.down = new Set();
    this.pressedThisFrame = new Set();
    this._queued = new Set();

    this.moveVector = { x: 0, z: 0 };
    this.aimYaw = 0;
    this.hasAim = false;
    this.aimPoint = new THREE.Vector3();

    this.pointer = new THREE.Vector2(0, 0);
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.gamepadIndex = null;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      const action = KEY_BINDINGS[e.code];
      if (!action) return;
      if (!this.down.has(action)) this._queued.add(action);
      this.down.add(action);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      const action = KEY_BINDINGS[e.code];
      if (action) this.down.delete(action);
    });
    window.addEventListener('blur', () => this.down.clear());

    this.dom.addEventListener('pointermove', (e) => {
      const rect = this.dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });
    this.dom.addEventListener('pointerdown', (e) => {
      const action = e.button === 2 ? 'ranged' : 'melee';
      if (!this.down.has(action)) this._queued.add(action);
      this.down.add(action);
    });
    window.addEventListener('pointerup', (e) => {
      this.down.delete(e.button === 2 ? 'ranged' : 'melee');
    });
    this.dom.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('gamepadconnected', (e) => { this.gamepadIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', () => { this.gamepadIndex = null; });
  }

  isDown(action) { return this.down.has(action); }
  justPressed(action) { return this.pressedThisFrame.has(action); }

  /** Call once per frame, before anything reads input. */
  update(camera, playerPosition) {
    this.pressedThisFrame = this._queued;
    this._queued = new Set();

    let x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    let z = (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0);

    const pad = this.readGamepad();
    if (pad) {
      if (Math.abs(pad.moveX) + Math.abs(pad.moveZ) > 0) { x = pad.moveX; z = pad.moveZ; }
      for (const [action, pressed] of Object.entries(pad.buttons)) {
        if (pressed && !this.down.has(action)) { this._queued.add(action); this.down.add(action); }
        else if (!pressed && pad.owns.has(action)) this.down.delete(action);
      }
    }

    const len = Math.hypot(x, z);
    this.moveVector = len > 1 ? { x: x / len, z: z / len } : { x, z };

    // Aim: right stick wins if it is being pushed, otherwise the mouse ray.
    // hasAim is recomputed every frame, never latched: a cursor sitting on top
    // of the hero must NOT count as aim, or camera lag alone would spin the
    // character around while running.
    this.hasAim = false;
    if (pad && Math.hypot(pad.aimX, pad.aimZ) > 0.3) {
      this.aimYaw = yawFromDirection(pad.aimX, pad.aimZ);
      this.hasAim = true;
    } else {
      this.raycaster.setFromCamera(this.pointer, camera);
      const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.aimPoint);
      if (hit) {
        const dx = this.aimPoint.x - playerPosition.x;
        const dz = this.aimPoint.z - playerPosition.z;
        if (Math.hypot(dx, dz) > AIM_DEAD_ZONE) {
          this.aimYaw = yawFromDirection(dx, dz);
          this.hasAim = true;
        }
      }
    }
  }

  readGamepad() {
    if (this.gamepadIndex === null || !navigator.getGamepads) return null;
    const pad = navigator.getGamepads()[this.gamepadIndex];
    if (!pad) return null;
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    const owns = new Set(['melee', 'ranged', 'sprint', 'reload']);
    return {
      moveX: dz(pad.axes[0] ?? 0),
      moveZ: dz(pad.axes[1] ?? 0),
      aimX: dz(pad.axes[2] ?? 0),
      aimZ: dz(pad.axes[3] ?? 0),
      owns,
      buttons: {
        melee: Boolean(pad.buttons[7]?.pressed || pad.buttons[2]?.pressed),
        ranged: Boolean(pad.buttons[5]?.pressed || pad.buttons[3]?.pressed),
        sprint: Boolean(pad.buttons[10]?.pressed),
        reload: Boolean(pad.buttons[1]?.pressed),
      },
    };
  }
}
