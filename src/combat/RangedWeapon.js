import { Weapon } from './Weapon.js';

/**
 * RangedWeapon — spawns projectiles through the ProjectileSystem.
 *
 * Two different "speeds" live here on purpose:
 *   speed            — shots per second (how often you may fire)
 *   projectileSpeed  — metres per second (how fast the arrow travels)
 *
 * `range` is converted into projectile lifetime, so a shortbow's arrow simply
 * expires sooner than a crossbow bolt instead of needing separate logic.
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

  get projectileLifetime() {
    return this.range / this.projectileSpeed;
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

    return {
      x: origin.x,
      y: origin.y,
      z: origin.z,
      vx: direction.x * this.projectileSpeed,
      vz: direction.z * this.projectileSpeed,
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
