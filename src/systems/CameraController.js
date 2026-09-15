import * as THREE from 'three';
import { damp } from '../mathUtils.js';

/**
 * CameraController — a locked top-down/isometric chase camera.
 *
 * Decision (locked in for the project): fixed angle, no rotation, no zoom
 * during play. The camera sits at a constant offset from the hero and eases
 * toward it, with a small lean toward where you are aiming so the cursor side
 * of the screen shows a bit more.
 *
 *        camera
 *           \   offset (0, 11.5, 9)  ~52 degrees down
 *            \
 *             ●  hero
 */
export class CameraController {
  constructor(camera, { offset = new THREE.Vector3(0, 11.5, 9) } = {}) {
    this.camera = camera;
    this.offset = offset.clone();
    this.lookTarget = new THREE.Vector3();
    this.desired = new THREE.Vector3();
  }

  snapTo(position) {
    this.lookTarget.copy(position);
    this.camera.position.copy(position).add(this.offset);
    this.camera.lookAt(this.lookTarget);
  }

  update(dt, position, aimPoint) {
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
  }
}
