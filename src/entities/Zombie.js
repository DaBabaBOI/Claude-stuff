import * as THREE from 'three';
import { Enemy } from './Enemy.js';
import { angleDelta, clamp, dampAngle, yawFromDirection } from '../mathUtils.js';

/**
 * Zombie — the first enemy that fights back.
 *
 * One small state machine, driven purely by distance to the player:
 *
 *        far away            within aggro           within reach
 *   IDLE ──────────► CHASE ──────────────► WINDUP ──────────► STRIKE ──► RECOVER
 *    ▲                 ▲                     │  (telegraphed)     │         │
 *    └─── player lost ─┘                     └── player stepped ──┘         │
 *                                                out: whiff                 │
 *    └──────────────────────── cooldown ─────────────────────────────────────┘
 *
 * WINDUP is deliberately long (0.5 s) and visible — arms rear up overhead —
 * so the attack can be dodged. The damage only lands in a short STRIKE window,
 * and only if the player is still inside the cone at that instant, which means
 * backing off during the windup genuinely saves you.
 */

const STATE = {
  IDLE: 'idle',
  CHASE: 'chase',
  WINDUP: 'windup',
  STRIKE: 'strike',
  RECOVER: 'recover',
};

export class Zombie extends Enemy {
  constructor({ scene, position, speed = 2.3, damage = 9 }) {
    super({ scene, position, maxHealth: 60, respawnDelay: Infinity });

    // Re-skin the inherited rig: sunken green, ragged.
    this.rig.materials.cloth.color.setHex(0x4c6b3c);
    this.rig.materials.accent.color.setHex(0x2f4227);
    this.rig.materials.skin.color.setHex(0x9fb08a);

    this.speed = speed;
    this.damage = damage;
    this.aggroRange = 16;
    this.attackRange = 1.9;
    this.attackArc = (100 * Math.PI) / 180;

    this.windupTime = 0.42;
    this.strikeTime = 0.12;
    this.recoverTime = 0.32;
    this.attackCooldown = 0.75;
    /**
     * Fraction of walking speed kept while winding up and recovering. A zombie
     * that roots itself the moment it raises its arms is trivially walked away
     * from, and the attack lands on where you *were*.
     */
    this.windupSpeedFactor = 0.62;
    this.recoverSpeedFactor = 0.35;

    this.isZombie = true;
    this.state = STATE.IDLE;
    this.stateTimer = 0;
    this.cooldownTimer = 0;
    this.attackProgress = 0;
    this.hasStruck = false;
    this.removeAfter = 2.5; // seconds of corpse before it is cleaned up
  }

  get isAttacking() {
    return this.state === STATE.WINDUP || this.state === STATE.STRIKE || this.state === STATE.RECOVER;
  }

  /** Progress 0..1 across the whole windup+strike+recover animation. */
  get animationProgress() {
    const total = this.windupTime + this.strikeTime + this.recoverTime;
    if (this.state === STATE.WINDUP) return (this.stateTimer / this.windupTime) * (this.windupTime / total);
    if (this.state === STATE.STRIKE) {
      return (this.windupTime + this.stateTimer) / total;
    }
    if (this.state === STATE.RECOVER) {
      return (this.windupTime + this.strikeTime + this.stateTimer) / total;
    }
    return 0;
  }

  setState(next) {
    this.state = next;
    this.stateTimer = 0;
    if (next === STATE.WINDUP) this.hasStruck = false;
  }

  update(dt, state) {
    if (this.dead) {
      this.deathTimer += dt;
      this.rig.root.position.set(this.position.x, 0, this.position.z);
      this.rig.update(dt, {
        time: state.time,
        state: 'death',
        moveSpeed01: 0,
        hitProgress: 1,
        deathProgress: this.deathTimer / 0.8,
      });
      return;
    }

    this.stateTimer += dt;
    this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);

    // Occasional groan while hunting, so a pack behind you is audible.
    this.groanTimer = (this.groanTimer ?? Math.random() * 4) - dt;
    if (this.groanTimer <= 0) {
      this.groanTimer = 3 + Math.random() * 5;
      if (this.state !== STATE.IDLE) state.pushEvent('zombie-groan');
    }
    if (this.hitTimer < 0.18) this.hitTimer += dt;

    const player = state.player;
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const distance = Math.hypot(dx, dz);
    const targetYaw = yawFromDirection(dx, dz);

    let moving = 0;

    switch (this.state) {
      case STATE.IDLE:
        if (!player.dead && distance < this.aggroRange) this.setState(STATE.CHASE);
        break;

      case STATE.CHASE: {
        if (player.dead || distance > this.aggroRange * 1.3) { this.setState(STATE.IDLE); break; }
        this.facing = dampAngle(this.facing, targetYaw, 0.0025, dt);
        if (distance <= this.attackRange && this.cooldownTimer === 0) {
          this.setState(STATE.WINDUP);
          break;
        }
        moving = this.stepToward(dx, dz, distance, this.speed * dt, player);
        break;
      }

      case STATE.WINDUP:
        // Keeps walking you down while the arms come up, and keeps turning, so
        // the strike lands where you are rather than where you were. Slower
        // than a full charge, so sidestepping still beats it.
        this.facing = dampAngle(this.facing, targetYaw, 0.06, dt);
        moving = this.stepToward(dx, dz, distance, this.speed * this.windupSpeedFactor * dt, player);
        if (this.stateTimer >= this.windupTime) this.setState(STATE.STRIKE);
        break;

      case STATE.STRIKE:
        if (!this.hasStruck) {
          this.hasStruck = true;
          this.tryHit(state, player, distance, targetYaw);
        }
        if (this.stateTimer >= this.strikeTime) this.setState(STATE.RECOVER);
        break;

      case STATE.RECOVER:
        this.facing = dampAngle(this.facing, targetYaw, 0.35, dt);
        moving = this.stepToward(dx, dz, distance, this.speed * this.recoverSpeedFactor * dt, player);
        if (this.stateTimer >= this.recoverTime) {
          this.cooldownTimer = this.attackCooldown;
          this.setState(STATE.CHASE);
        }
        break;
    }

    // Knockback from being hit, and a shove apart from other enemies so a pack
    // does not collapse into one spot.
    this.position.x += this.knockback.x * dt;
    this.position.z += this.knockback.z * dt;
    this.knockback.multiplyScalar(Math.pow(0.02, dt));
    this.separate(dt, state);

    this.position.x = clamp(this.position.x, state.arena.minX + this.radius, state.arena.maxX - this.radius);
    this.position.z = clamp(this.position.z, state.arena.minZ + this.radius, state.arena.maxZ - this.radius);

    this.rig.root.position.set(this.position.x, 0, this.position.z);
    this.rig.root.rotation.y = this.facing;
    this.rig.update(dt, {
      time: state.time,
      state: this.isAttacking ? 'attack-claw' : moving ? 'walk' : 'idle',
      moveSpeed01: moving,
      attackProgress: this.animationProgress,
      hitProgress: this.hitTimer / 0.18,
      deathProgress: 0,
    });
  }

  /** Walk `step` metres toward the player, stopping short of overlapping them. */
  stepToward(dx, dz, distance, step, player) {
    if (distance <= this.radius + player.radius) return 0;
    this.position.x += (dx / distance) * step;
    this.position.z += (dz / distance) * step;
    return 1;
  }

  tryHit(state, player, distance, targetYaw) {
    if (player.dead) return;
    if (distance > this.attackRange + player.radius) return;
    if (Math.abs(angleDelta(this.facing, targetYaw)) > this.attackArc / 2) return;
    player.takeDamage(this.damage, state);
  }

  separate(dt, state) {
    for (const other of state.enemies) {
      if (other === this || other.dead) continue;
      const dx = this.position.x - other.position.x;
      const dz = this.position.z - other.position.z;
      const dist = Math.hypot(dx, dz);
      const minDist = this.radius + other.radius;
      if (dist > 0.0001 && dist < minDist) {
        const push = ((minDist - dist) / dist) * 0.5;
        this.position.x += dx * push;
        this.position.z += dz * push;
      }
    }
  }
}
