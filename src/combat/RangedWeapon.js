import { Weapon } from './Weapon.js';
import { GRAVITY, MAX_ARC_APEX } from './ProjectileSystem.js';
import { clamp } from '../mathUtils.js';

/**
 * RangedWeapon — spawns projectiles through the ProjectileSystem.
 *
 * Two different "speeds" live here on purpose:
 *   speed            — shots per second (how often you may fire)
 *   projectileSpeed  — metres per second (how fast the arrow travels)
 *
 * Arrows are ballistic, so `range` is not a timer — it is the distance the shot
 * is aimed to CARRY. The launch pitch is solved from the projectile motion
 * equation so the arrow returns to launch height at exactly `range`:
 *
 *     sin(2 * pitch) = gravity * range / speed^2
 *
 * A crossbow (fast, long range) therefore shoots almost flat, while a weak
 * shortbow lobs — straight out of the stat table, with no per-weapon tuning.
 */
export class RangedWeapon extends Weapon {
  constructor(config) {
    super({ ...config, type: 'ranged' });

    this.ammoCapacity = config.ammoCapacity ?? 10;
    this.reloadTime = config.reloadTime ?? 1.5;
    this.projectileSpeed = config.projectileSpeed ?? 24;
    /** Seconds between pulling the trigger and the projectile leaving. */
    this.releaseDelay = config.releaseDelay ?? 0.12;

    this.ammo = this.ammoCapacity;
    this.reloading = false;
    this.reloadEndsAt = 0;

    /** 0..1 progress through the draw/release animation. */
    this.fireProgress = 1;
    this.firing = false;
  }

  /** Time the draw+release animation takes (capped by the fire cooldown). */
  get animationDuration() {
    return Math.min(this.cooldown * 0.9, 0.5);
  }

  /**
   * Launch angle in radians (see the class comment), capped so the shot never
   * arcs higher than MAX_ARC_APEX above the muzzle:
   *
   *     apex = (speed * sin(pitch))^2 / (2 * gravity)
   *   → pitch_max = asin(sqrt(2 * gravity * apex) / speed)
   */
  get launchPitch() {
    const sin2 = clamp((GRAVITY * this.range) / (this.projectileSpeed ** 2), 0, 1);
    const solved = 0.5 * Math.asin(sin2);
    const capped = Math.asin(
      clamp(Math.sqrt(2 * GRAVITY * MAX_ARC_APEX) / this.projectileSpeed, 0, 1)
    );
    return Math.min(solved, capped);
  }

  /** Safety cap only — gravity normally ends the flight first. */
  get projectileLifetime() {
    return (this.range / this.projectileSpeed) * 2.5;
  }

  canUse(now) {
    return super.canUse(now) && !this.reloading && this.ammo > 0;
  }

  /**
   * Fire one shot. Returns the spawned projectile spec, or null if the shot
   * could not be taken (cooldown, empty magazine, mid-reload).
   * @param {number} now
   * @param {{x:number,y:number,z:number}} origin
   * @param {{x:number,z:number}} direction unit vector in XZ
   */
  use(now, origin, direction) {
    if (!this.canUse(now)) {
      if (this.ammo <= 0) this.beginReload(now);
      return null;
    }

    this.ammo -= 1;
    this.startCooldown(now);
    this.firing = true;
    this.fireProgress = 0;

    // Split the muzzle speed between "along the aim" and "up", so the shot
    // arcs instead of flying on rails. `pitch` may be overridden by the
    // caller (first-person aiming looks up and down).
    const pitch = direction.pitch ?? this.launchPitch;
    const horizontal = this.projectileSpeed * Math.cos(pitch);

    return {
      x: origin.x,
      y: origin.y,
      z: origin.z,
      vx: direction.x * horizontal,
      vy: this.projectileSpeed * Math.sin(pitch),
      vz: direction.z * horizontal,
      damage: this.damage,
      lifetime: this.projectileLifetime,
      sourceId: 'player',
    };
  }

  beginReload(now) {
    if (this.reloading || this.ammo === this.ammoCapacity) return false;
    this.reloading = true;
    this.reloadEndsAt = now + this.reloadTime;
    return true;
  }

  /** 0..1 progress of an in-flight reload (1 when not reloading). */
  reloadProgress(now) {
    if (!this.reloading) return 1;
    return 1 - Math.max(0, this.reloadEndsAt - now) / this.reloadTime;
  }

  update(dt, { state }) {
    if (this.reloading && state.time >= this.reloadEndsAt) {
      this.reloading = false;
      this.ammo = this.ammoCapacity;
    }
    if (this.firing) {
      this.fireProgress += dt / this.animationDuration;
      if (this.fireProgress >= 1) {
        this.fireProgress = 1;
        this.firing = false;
      }
    }
  }
}
