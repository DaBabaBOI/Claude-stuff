import * as THREE from 'three';
import { clamp, directionFromYaw, yawFromDirection } from '../mathUtils.js';

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
  KeyV: 'toggle-view',
  KeyM: 'mute',
  Space: 'jump',
};

const PITCH_LIMIT = Math.PI / 2 - 0.05;
const LOOK_SENSITIVITY = 0.0022;
/**
 * Without pointer lock the cursor can teleport — re-entering the window, the
 * browser recentring it when a lock is granted — and one such jump whips the
 * whole view around. Real mouse movement never exceeds this per event, so
 * anything bigger is a teleport and gets dropped.
 */
const MAX_UNLOCKED_LOOK_DELTA = 120;

export class InputManager {
  constructor(domElement) {
    this.dom = domElement;
    this.down = new Set();
    this.pressedThisFrame = new Set();
    this.releasedThisFrame = new Set();
    this._queued = new Set();
    this._queuedReleases = new Set();

    this.moveVector = { x: 0, z: 0 };
    this.aimYaw = 0;
    this.hasAim = false;
    this.aimPoint = new THREE.Vector3();

    this.pointer = new THREE.Vector2(0, 0);
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.gamepadIndex = null;

    /**
     * Mouse-look state, used by first-person mode. In top-down mode aim comes
     * from the ground ray instead and these are left alone.
     */
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.pointerLocked = false;
    this.skipNextLook = false;
    /**
     * When set, WASD is interpreted relative to this yaw (first person: W is
     * "the way the camera points"). When null, WASD is world-space, which is
     * what a fixed top-down camera wants.
     */
    this.moveBasisYaw = null;

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
      if (action) this.release(action);
    });
    // Losing focus mid-draw must release the shot, not freeze it half-drawn.
    window.addEventListener('blur', () => {
      for (const action of [...this.down]) this.release(action);
    });

    this.dom.addEventListener('pointermove', (e) => {
      // Deltas drive mouse-look whenever first person is active. Pointer lock
      // makes it seamless, but movementX/Y work unlocked too, so a host that
      // refuses the lock still gets a playable game.
      if (this.pointerLocked || this.moveBasisYaw !== null) {
        const dx = e.movementX ?? 0;
        const dy = e.movementY ?? 0;
        if (this.skipNextLook) {
          this.skipNextLook = false;
          return;
        }
        if (
          !this.pointerLocked &&
          (Math.abs(dx) > MAX_UNLOCKED_LOOK_DELTA || Math.abs(dy) > MAX_UNLOCKED_LOOK_DELTA)
        ) {
          return;
        }
        this.lookYaw -= dx * LOOK_SENSITIVITY;
        this.lookPitch = clamp(
          this.lookPitch - dy * LOOK_SENSITIVITY,
          -PITCH_LIMIT,
          PITCH_LIMIT
        );
        return;
      }
      const rect = this.dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });
    this.dom.addEventListener('pointerdown', (e) => {
      // In first person, clicking also (re)captures the pointer. The attack is
      // still queued: swallowing the click would make the game unplayable
      // anywhere the lock is refused.
      if (this.moveBasisYaw !== null && !this.pointerLocked) {
        this.dom.requestPointerLock?.();
      }
      const action = e.button === 2 ? 'ranged' : 'melee';
      if (!this.down.has(action)) this._queued.add(action);
      this.down.add(action);
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.dom;
      // Browsers recentre the cursor when the lock engages or releases and
      // deliver that jump as one huge movement delta. Dropping the first event
      // after a lock change stops the view snapping on entry and exit.
      this.skipNextLook = true;
    });
    window.addEventListener('pointerup', (e) => {
      this.release(e.button === 2 ? 'ranged' : 'melee');
    });
    this.dom.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('gamepadconnected', (e) => { this.gamepadIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', () => { this.gamepadIndex = null; });
  }

  isDown(action) { return this.down.has(action); }
  justPressed(action) { return this.pressedThisFrame.has(action); }
  /** True on the single frame an input was let go — how a charged shot fires. */
  justReleased(action) { return this.releasedThisFrame.has(action); }

  release(action) {
    if (this.down.delete(action)) this._queuedReleases.add(action);
  }

  /** Call once per frame, before anything reads input. */
  update(camera, playerPosition) {
    this.pressedThisFrame = this._queued;
    this._queued = new Set();
    this.releasedThisFrame = this._queuedReleases;
    this._queuedReleases = new Set();

    let x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    let z = (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0);

    const pad = this.readGamepad();
    if (pad) {
      if (Math.abs(pad.moveX) + Math.abs(pad.moveZ) > 0) { x = pad.moveX; z = pad.moveZ; }
      for (const [action, pressed] of Object.entries(pad.buttons)) {
        if (pressed && !this.down.has(action)) { this._queued.add(action); this.down.add(action); }
        else if (!pressed && pad.owns.has(action)) this.release(action);
      }
    }

    // Map stick/key input into world space. Top-down: the camera never
    // rotates, so screen-up is world -Z and raw input IS world input.
    // First person: rotate it onto the camera's basis.
    let wx = x;
    let wz = z;
    if (this.moveBasisYaw !== null) {
      const forward = directionFromYaw(this.moveBasisYaw);
      const rightX = -forward.z;
      const rightZ = forward.x;
      wx = rightX * x + forward.x * -z;
      wz = rightZ * x + forward.z * -z;
    }
    const len = Math.hypot(wx, wz);
    this.moveVector = len > 1 ? { x: wx / len, z: wz / len } : { x: wx, z: wz };

    // First person: the mouse IS the aim, no ground ray involved.
    if (this.moveBasisYaw !== null) {
      this.aimYaw = this.lookYaw;
      this.hasAim = true;
      return;
    }

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
