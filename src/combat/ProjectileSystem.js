import * as THREE from 'three';
import { closestPointOnSegmentXZ, clamp } from '../mathUtils.js';

const PROJECTILE_RADIUS = 0.14;
const STUCK_LIFETIME = 3;

/** Downward acceleration on every projectile, m/s^2. Tuned for feel, not Earth. */
export const GRAVITY = 11;

/**
 * Hard cap on how high above the muzzle a shot may arc, in metres.
 *
 * Without it, solving the launch angle purely for `range` lobs the arrow ~0.9 m
 * up, which sails clean over a 2 m target standing at half range — physically
 * correct and horrible to play. Capping the apex keeps the whole flight inside
 * a human silhouette while still showing real drop at distance.
 */
export const MAX_ARC_APEX = 0.5;

/**
 * ProjectileSystem — owns every arrow in flight, and they are ballistic:
 * launched at a pitch, pulled down by gravity, pitched to match their own
 * velocity, and stuck in the ground where they land.
 *
 *            ....
 *        ..??    ??..                apex ~0.9 m above the launch
 *     .??            ??..
 *   ?                    ??.
 *  ●  launch (y = 1.25)      ??▼ lands at about the weapon's `range`
 *
 * Collision is a swept test: at 30 m/s an arrow moves ~0.5 m per frame, wider
 * than a target, so testing only the end-of-frame position would let shots
 * tunnel through. We test the distance from the target to the SEGMENT the
 * arrow travelled, then check the arrow's height at that point — so an arrow
 * that has already dropped to ankle height sails under nothing and lands.
 *
 *      prev ●────────────────● next        target ○ r
 *            \____ closest distance ____/
 */
export class ProjectileSystem {
  constructor(scene) {
    this.scene = scene;

    const shaft = new THREE.CylinderGeometry(PROJECTILE_RADIUS * 0.4, PROJECTILE_RADIUS * 0.4, 0.8, 6);
    const head = new THREE.ConeGeometry(PROJECTILE_RADIUS * 0.8, 0.22, 6);
    head.translate(0, 0.5, 0);
    // Align both along local -Z so mesh.lookAt() points the arrow where it flies.
    shaft.rotateX(-Math.PI / 2);
    head.rotateX(-Math.PI / 2);
    this.shaftGeometry = shaft;
    this.headGeometry = head;

    this.shaftMaterial = new THREE.MeshStandardMaterial({ color: 0xd9c89a, roughness: 0.7 });
    this.headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffeeb0,
      emissive: 0xffa02a,
      emissiveIntensity: 0.8,
      roughness: 0.4,
    });

    this._aim = new THREE.Vector3();
  }

  buildMesh() {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(this.shaftGeometry, this.shaftMaterial));
    group.add(new THREE.Mesh(this.headGeometry, this.headMaterial));
    group.children[0].castShadow = true;
    return group;
  }

  /** @param {import('../GameState.js').GameState} state */
  spawn(state, spec) {
    const mesh = this.buildMesh();
    mesh.position.set(spec.x, spec.y, spec.z);
    this.scene.add(mesh);

    const projectile = {
      mesh,
      x: spec.x, y: spec.y, z: spec.z,
      vx: spec.vx, vy: spec.vy ?? 0, vz: spec.vz,
      damage: spec.damage,
      life: spec.lifetime,
      sourceId: spec.sourceId,
      stuck: false,
      stuckTimer: 0,
    };
    this.orient(projectile);
    state.projectiles.push(projectile);
    return projectile;
  }

  orient(p) {
    this._aim.set(p.x + p.vx, p.y + p.vy, p.z + p.vz);
    p.mesh.lookAt(this._aim);
  }

  update(dt, state) {
    const { arena } = state;

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];

      if (p.stuck) {
        p.stuckTimer += dt;
        if (p.stuckTimer > STUCK_LIFETIME) this.despawn(state, i);
        continue;
      }

      const prevX = p.x;
      const prevY = p.y;
      const prevZ = p.z;

      p.vy -= GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.life -= dt;

      p.mesh.position.set(p.x, p.y, p.z);
      this.orient(p);

      let consumed = false;
      for (const enemy of state.enemies) {
        if (enemy.dead) continue;
        const hitRadius = enemy.radius + PROJECTILE_RADIUS;
        const { t, distSq } = closestPointOnSegmentXZ(
          enemy.position.x, enemy.position.z, prevX, prevZ, p.x, p.z
        );
        if (distSq > hitRadius * hitRadius) continue;

        // Height at closest approach must be inside the target's body.
        const yAtHit = prevY + (p.y - prevY) * t;
        if (yAtHit < 0.15 || yAtHit > enemy.height) continue;

        enemy.takeDamage(p.damage, state, { kind: 'ranged', fromX: prevX, fromZ: prevZ });
        consumed = true;
        break;
      }

      if (consumed) {
        this.despawn(state, i);
        continue;
      }

      // Landed: plant it in the ground for a moment instead of vanishing.
      if (p.y <= 0.05) {
        p.stuck = true;
        p.y = 0.05;
        p.mesh.position.y = p.y;
        p.vx = p.vy = p.vz = 0;
        continue;
      }

      const outOfBounds =
        p.x < arena.minX || p.x > arena.maxX || p.z < arena.minZ || p.z > arena.maxZ;
      if (outOfBounds || p.life <= 0) this.despawn(state, i);
    }
  }

  despawn(state, index) {
    this.scene.remove(state.projectiles[index].mesh);
    state.projectiles.splice(index, 1);
  }

  clear(state) {
    for (const p of state.projectiles) this.scene.remove(p.mesh);
    state.projectiles.length = 0;
  }
}
