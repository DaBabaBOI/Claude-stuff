import * as THREE from 'three';
import { distSqPointSegmentXZ, yawFromDirection } from '../mathUtils.js';

const PROJECTILE_RADIUS = 0.14;

/**
 * ProjectileSystem — owns every arrow/bolt in flight.
 *
 * Collision is a swept test: at 30 m/s an arrow moves ~0.5 m per frame, which
 * is wider than a dummy, so testing only the end-of-frame position would let
 * shots tunnel straight through. Instead we test the distance from the enemy to
 * the SEGMENT the arrow travelled this frame.
 *
 *      prev ●────────────────● next        enemy ○ r
 *            \____ closest distance ____/
 */
export class ProjectileSystem {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.geometry = new THREE.CylinderGeometry(
      PROJECTILE_RADIUS * 0.45,
      PROJECTILE_RADIUS * 0.45,
      0.85,
      6
    );
    // Lay the cylinder down so its axis runs along local -Z (our "forward").
    this.geometry.rotateX(Math.PI / 2);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffeeb0,
      emissive: 0xffb03a,
      emissiveIntensity: 0.9,
      roughness: 0.5,
    });
  }

  /** @param {import('../GameState.js').GameState} state */
  spawn(state, spec) {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.castShadow = true;
    mesh.position.set(spec.x, spec.y, spec.z);
    mesh.rotation.y = yawFromDirection(spec.vx, spec.vz);
    this.scene.add(mesh);

    state.projectiles.push({
      mesh,
      x: spec.x,
      y: spec.y,
      z: spec.z,
      vx: spec.vx,
      vz: spec.vz,
      damage: spec.damage,
      life: spec.lifetime,
      sourceId: spec.sourceId,
    });
  }

  update(dt, state) {
    const { arena } = state;

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      const prevX = p.x;
      const prevZ = p.z;

      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.life -= dt;
      p.mesh.position.set(p.x, p.y, p.z);

      let consumed = false;

      for (const enemy of state.enemies) {
        if (enemy.dead) continue;
        const hitRadius = enemy.radius + PROJECTILE_RADIUS;
        const dSq = distSqPointSegmentXZ(
          enemy.position.x,
          enemy.position.z,
          prevX,
          prevZ,
          p.x,
          p.z
        );
        if (dSq <= hitRadius * hitRadius) {
          enemy.takeDamage(p.damage, state, {
            kind: 'ranged',
            fromX: prevX,
            fromZ: prevZ,
          });
          consumed = true;
          break;
        }
      }

      const outOfBounds =
        p.x < arena.minX || p.x > arena.maxX || p.z < arena.minZ || p.z > arena.maxZ;

      if (consumed || outOfBounds || p.life <= 0) {
        this.scene.remove(p.mesh);
        state.projectiles.splice(i, 1);
      }
    }
  }

  /** Remove everything in flight (used by the scene reset). */
  clear(state) {
    for (const p of state.projectiles) this.scene.remove(p.mesh);
    state.projectiles.length = 0;
  }
}
