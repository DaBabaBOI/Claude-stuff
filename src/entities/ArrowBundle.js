import * as THREE from 'three';
import { createArrowBundle } from './weaponModels.js';

/**
 * ArrowBundle — a pickup lying on the ground.
 *
 * With reloading gone, this is the only way to refill the quiver, so it has to
 * be findable: it bobs and turns so it catches the eye across a dark arena, and
 * the pickup radius is generous because stopping precisely on a small object
 * while three zombies close in is not the interesting part of the fight.
 */
export class ArrowBundle {
  constructor({ scene, position, amount = 5 }) {
    this.scene = scene;
    this.position = position.clone();
    this.amount = amount;
    this.radius = 1.1;
    this.collected = false;
    this.age = Math.random() * Math.PI * 2; // desync the bob between bundles

    this.mesh = createArrowBundle(amount);
    // Slightly oversized: from the top-down camera this is the only ammo in the
    // world, and it has to be spottable across a dark arena.
    this.mesh.scale.setScalar(1.3);
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  update(dt) {
    this.age += dt;
    this.mesh.rotation.y += dt * 0.9;
    this.mesh.position.y = this.position.y + 0.18 + Math.sin(this.age * 2) * 0.08;
  }

  /** True when the player is close enough to pick it up. */
  overlaps(player) {
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    return Math.hypot(dx, dz) <= this.radius + player.radius;
  }

  dispose() {
    this.scene.remove(this.mesh);
  }
}
