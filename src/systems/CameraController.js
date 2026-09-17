import * as THREE from 'three';
import { damp } from '../mathUtils.js';

export const VIEW_TOP_DOWN = 'top-down';
export const VIEW_FIRST_PERSON = 'first-person';

/** Eye height of the hero, in metres — just below the top of the head. */
const EYE_HEIGHT = 1.64;

/**
 * CameraController — two views, one hero.
 *
 * TOP-DOWN (default): fixed angle, no rotation, no zoom during play. The
 * camera sits at a constant offset from the hero and eases toward it, with a
 * small lean toward the cursor so that side of the screen shows a bit more.
 *
 *        camera
 *           \   offset (0, 11.5, 9)  ~52 degrees down
 *            \
 *             ●  hero
 *
 * FIRST PERSON: the camera sits at the hero's eyes and takes its yaw and pitch
 * straight from mouse-look. No easing at all — a follow lag you can see from
 * inside your own head reads as motion sickness, not weight.
 *
 *        ●═══►  eye at y = 1.64, yaw = facing, pitch = look
 */
export class CameraController {
  constructor(camera, { offset = new THREE.Vector3(0, 11.5, 9) } = {}) {
    this.camera = camera;
    this.offset = offset.clone();
    this.lookTarget = new THREE.Vector3();
    this.desired = new THREE.Vector3();
    this.mode = VIEW_TOP_DOWN;
    this.shakeOffset = new THREE.Vector3();
  }

  /**
   * Shake decays exponentially and is applied as a small positional offset,
   * never a rotation — a rotating first-person camera reads as nausea rather
   * than impact. First person gets a third of the amplitude for the same reason.
   */
  applyShake(dt, state) {
    if (state.shake <= 0.001) {
      state.shake = 0;
      this.shakeOffset.set(0, 0, 0);
      return;
    }
    state.shake *= Math.pow(0.02, dt);
    const amplitude = state.shake * (this.isFirstPerson ? 0.05 : 0.16);
    this.shakeOffset.set(
      (Math.random() * 2 - 1) * amplitude,
      (Math.random() * 2 - 1) * amplitude * 0.6,
      (Math.random() * 2 - 1) * amplitude
    );
    this.camera.position.add(this.shakeOffset);
  }

  get isFirstPerson() {
    return this.mode === VIEW_FIRST_PERSON;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === VIEW_TOP_DOWN) {
      this.camera.rotation.set(0, 0, 0);
      this.camera.rotation.order = 'XYZ';
    } else {
      // YXZ: yaw first, then pitch — the order that keeps the horizon level.
      this.camera.rotation.order = 'YXZ';
    }
  }

  snapTo(position) {
    this.lookTarget.copy(position);
    this.camera.position.copy(position).add(this.offset);
    this.camera.lookAt(this.lookTarget);
  }

  update(dt, position, aimPoint, look = null, state = null) {
    if (this.isFirstPerson) {
      this.camera.position.set(position.x, position.y + EYE_HEIGHT, position.z);
      this.camera.rotation.y = look?.yaw ?? 0;
      this.camera.rotation.x = look?.pitch ?? 0;
      this.camera.rotation.z = 0;
      if (state) this.applyShake(dt, state);
      return;
    }

    // Lean up to 1.5 m toward the aim point without unanchoring the hero.
    const leanX = aimPoint ? THREE.MathUtils.clamp((aimPoint.x - position.x) * 0.15, -1.5, 1.5) : 0;
    const leanZ = aimPoint ? THREE.MathUtils.clamp((aimPoint.z - position.z) * 0.15, -1.5, 1.5) : 0;

    this.desired.set(position.x + leanX, position.y, position.z + leanZ);

    this.lookTarget.x = damp(this.lookTarget.x, this.desired.x, 0.001, dt);
    this.lookTarget.y = damp(this.lookTarget.y, this.desired.y + 1, 0.001, dt);
    this.lookTarget.z = damp(this.lookTarget.z, this.desired.z, 0.001, dt);

    this.camera.position.set(
      this.lookTarget.x + this.offset.x,
      this.offset.y,
      this.lookTarget.z + this.offset.z
    );
    this.camera.lookAt(this.lookTarget);
    if (state) this.applyShake(dt, state);
  }
}
