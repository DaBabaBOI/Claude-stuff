import * as THREE from 'three';
import { Enemy } from './Enemy.js';
import { createWeaponModel } from './weaponModels.js';
import { ArrowBundle } from './ArrowBundle.js';
import { RangedWeapon } from '../combat/RangedWeapon.js';
import { angleDelta, clamp, dampAngle, directionFromYaw, yawFromDirection } from '../mathUtils.js';

/**
 * Skeleton archer — the enemy that makes standing still a mistake.
 *
 * Where a zombie closes the distance, a skeleton wants to keep it. It holds a
 * band between `minRange` and `maxRange`, and only shoots from inside it:
 *
 *      ◀── back away ──│◀──── shoots from in here ────▶│── walk closer ──▶
 *      0              4.5 m                          13 m            aggro 22 m
 *
 * The draw is the whole fight: 0.9 s with the string visibly pulling back, then
 * one arrow at a fixed power. Arrows are slow enough (18 m/s) to sidestep if
 * you are moving when it looses — so the counterplay is to keep moving and
 * close the gap, not to out-trade it.
 */

const STATE = {
  IDLE: 'idle',
  REPOSITION: 'reposition',
  DRAW: 'draw',
  LOOSE: 'loose',
  RECOVER: 'recover',
};

/** Fixed draw strength for skeletons: they never fire a weak snap shot. */
const SKELETON_POWER = 0.8;

export class Skeleton extends Enemy {
  constructor({ scene, projectileSystem, position }) {
    super({ scene, position, maxHealth: 45, respawnDelay: Infinity });

    this.isSkeleton = true;
    this.projectileSystem = projectileSystem;

    // Bone: pale everywhere, no cloth colour.
    this.rig.materials.cloth.color.setHex(0xd8d4c4);
    this.rig.materials.accent.color.setHex(0xb3ae9c);
    this.rig.materials.skin.color.setHex(0xe6e2d4);

    this.bow = new RangedWeapon({
      id: 'bone-bow',
      name: 'Bone Bow',
      damage: 11,
      speed: 0.7,
      range: 16,
      projectileSpeed: 18,
      ammoCapacity: 99,
      reloadTime: 0,
      model: 'bow',
    });
    this.rig.offHandSocket.add(createWeaponModel('bow'));

    this.speed = 2.6;
    this.aggroRange = 22;
    this.minRange = 4.5;
    this.maxRange = 13;
    this.fireArc = (35 * Math.PI) / 180;

    this.drawTime = 0.9;
    this.looseTime = 0.15;
    this.recoverTime = 0.5;
    this.shotCooldown = 1.4;

    this.state = STATE.IDLE;
    this.stateTimer = 0;
    this.hasLoosed = false;
    this.cooldownTimer = 0;
    this.removeAfter = 2.5;
    this.strafeDirection = Math.random() < 0.5 ? -1 : 1;
  }

  /**
   * Drop part of the quiver. A skeleton is the natural source of arrows, and
   * this is what makes archers worth pushing through instead of ignoring:
   * kill the thing shooting at you and it pays for the shots you spent.
   */
  onDeath(state) {
    state.pickups.push(
      new ArrowBundle({ scene: this.scene, position: this.position, amount: 4 })
    );
    state.pushEvent('drop');
  }

  get isAiming() {
    return this.state === STATE.DRAW;
  }

  /** 0..1 string pull, drives the rig's draw pose and reads as the telegraph. */
  get drawAmount() {
    if (this.state === STATE.DRAW) return clamp(this.stateTimer / this.drawTime, 0, 1);
    if (this.state === STATE.LOOSE) return 0;
    return 0;
  }

  setState(next) {
    this.state = next;
    this.stateTimer = 0;
    if (next === STATE.LOOSE) this.hasLoosed = false;
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
    if (this.hitTimer < 0.18) this.hitTimer += dt;
    this.bow.update(dt, { state });

    const player = state.player;
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const distance = Math.hypot(dx, dz);
    const targetYaw = yawFromDirection(dx, dz);
    let moving = 0;

    switch (this.state) {
      case STATE.IDLE:
        if (!player.dead && distance < this.aggroRange) this.setState(STATE.REPOSITION);
        break;

      case STATE.REPOSITION: {
        if (player.dead || distance > this.aggroRange * 1.3) { this.setState(STATE.IDLE); break; }
        this.facing = dampAngle(this.facing, targetYaw, 0.002, dt);

        const inBand = distance >= this.minRange && distance <= this.maxRange;
        if (inBand && this.cooldownTimer === 0) {
          this.setState(STATE.DRAW);
          break;
        }
        moving = 1;
        const step = this.speed * dt;
        if (distance < this.minRange) {
          // Too close: back off, keeping the player in view.
          this.position.x -= (dx / distance) * step;
          this.position.z -= (dz / distance) * step;
        } else if (distance > this.maxRange) {
          this.position.x += (dx / distance) * step;
          this.position.z += (dz / distance) * step;
        } else {
          // In the band but reloading: circle instead of standing still.
          this.position.x += (-dz / distance) * step * this.strafeDirection;
          this.position.z += (dx / distance) * step * this.strafeDirection;
        }
        break;
      }

      case STATE.DRAW:
        this.facing = dampAngle(this.facing, targetYaw, 0.08, dt);
        if (distance < this.minRange * 0.7) {
          // Shoved out of range mid-draw: give up the shot rather than firing
          // point blank.
          this.setState(STATE.REPOSITION);
          this.cooldownTimer = 0.4;
          break;
        }
        if (this.stateTimer >= this.drawTime) this.setState(STATE.LOOSE);
        break;

      case STATE.LOOSE:
        if (!this.hasLoosed) {
          this.hasLoosed = true;
          this.loose(state, targetYaw);
        }
        if (this.stateTimer >= this.looseTime) this.setState(STATE.RECOVER);
        break;

      case STATE.RECOVER:
        if (this.stateTimer >= this.recoverTime) {
          this.cooldownTimer = this.shotCooldown;
          this.strafeDirection = Math.random() < 0.35 ? -this.strafeDirection : this.strafeDirection;
          this.setState(STATE.REPOSITION);
        }
        break;
    }

    this.position.x += this.knockback.x * dt;
    this.position.z += this.knockback.z * dt;
    this.knockback.multiplyScalar(Math.pow(0.02, dt));
    this.separate(dt, state);

    this.position.x = clamp(this.position.x, state.arena.minX + this.radius, state.arena.maxX - this.radius);
    this.position.z = clamp(this.position.z, state.arena.minZ + this.radius, state.arena.maxZ - this.radius);

    this.rig.root.position.set(this.position.x, 0, this.position.z);
    this.rig.root.rotation.y = this.facing;

    let rigState = 'idle';
    if (this.state === STATE.DRAW) rigState = 'draw-ranged';
    else if (this.state === STATE.LOOSE || this.state === STATE.RECOVER) rigState = 'attack-ranged';
    else if (moving) rigState = 'walk';

    this.rig.update(dt, {
      time: state.time,
      state: rigState,
      moveSpeed01: moving,
      attackKind: 'bow',
      attackProgress: this.state === STATE.RECOVER ? 0.6 : 0.1,
      drawAmount: this.drawAmount,
      hitProgress: this.hitTimer / 0.18,
      deathProgress: 0,
    });
  }

  loose(state, targetYaw) {
    if (Math.abs(angleDelta(this.facing, targetYaw)) > this.fireArc) return;
    this.bow.nextReadyAt = 0;
    const dir = directionFromYaw(this.facing);
    const origin = {
      x: this.position.x + dir.x * 0.5,
      y: 1.3,
      z: this.position.z + dir.z * 0.5,
    };
    const shot = this.bow.use(state.time, origin, dir, {
      charge: SKELETON_POWER,
      team: 'enemy',
    });
    if (shot) {
      this.projectileSystem.spawn(state, shot);
      state.pushEvent('bow-release', { power: SKELETON_POWER, source: 'enemy' });
    }
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
