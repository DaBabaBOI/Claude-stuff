import * as THREE from 'three';
import { closestPointOnSegmentXZ } from '../mathUtils.js';
import { createArrowModel } from '../entities/weaponModels.js';
import { applyWeaponHit } from './damage.js';

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
    this._aim = new THREE.Vector3();
  }

  buildMesh() {
    // Same art as the arrow nocked on the bow, so what you loose is what you
    // were holding: brown shaft, white head and fletching.
    return createArrowModel();
  }

  /** @param {import('../GameState.js').GameState} state */
  spawn(state, spec) {
    const mesh = this.buildMesh();
    mesh.scale.setScalar(0.75 + 0.35 * (spec.power ?? 1));
    mesh.position.set(spec.x, spec.y, spec.z);
    this.scene.add(mesh);

    const projectile = {
      mesh,
      x: spec.x, y: spec.y, z: spec.z,
      vx: spec.vx, vy: spec.vy ?? 0, vz: spec.vz,
      damage: spec.damage,
      life: spec.lifetime,
      /** 'player' arrows hit enemies; 'enemy' arrows hit the player. */
      team: spec.team ?? 'player',
      power: spec.power ?? 1,
      weapon: spec.weapon ?? null,
      modifier: spec.modifier ?? null,
      attacker: spec.attacker ?? null,
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
      const targets = p.team === 'player' ? state.enemies : [state.player];
      for (const enemy of targets) {
        if (!enemy || enemy.dead) continue;
        const hitRadius = enemy.radius + PROJECTILE_RADIUS;
        const { t, distSq } = closestPointOnSegmentXZ(
          enemy.position.x, enemy.position.z, prevX, prevZ, p.x, p.z
        );
        if (distSq > hitRadius * hitRadius) continue;

        // Height at closest approach must be inside the target's body.
        const yAtHit = prevY + (p.y - prevY) * t;
        if (yAtHit < 0.15 || yAtHit > enemy.height) continue;

        if (p.weapon) {
          // Carry the firing weapon along so its modifier applies on impact.
          applyWeaponHit({
            weapon: { damage: p.damage, modifier: p.modifier },
            target: enemy,
            state,
            attacker: p.attacker,
            fromX: prevX,
            fromZ: prevZ,
            kind: 'ranged',
          });
        } else {
          enemy.takeDamage(p.damage, state, { kind: 'ranged', fromX: prevX, fromZ: prevZ });
        }
        consumed = true;
        break;
      }

      if (consumed) {
        this.despawn(state, i);
        continue;
      }

      // Landed: plant it in the ground for a moment instead of vanishing.
      if (p.y <= 0.05) {
        state.pushEvent('arrow-ground');
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
