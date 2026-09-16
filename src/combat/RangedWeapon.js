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
    /**
     * Whether this weapon can refill itself. A bow cannot: its arrows live in
     * the quiver on your back, and the only way to get more is to pick them up.
     */
    this.reloadable = config.reloadable ?? true;
    this.projectileSpeed = config.projectileSpeed ?? 24;
    /** Seconds between pulling the trigger and the projectile leaving. */
    this.releaseDelay = config.releaseDelay ?? 0.12;

    /**
     * Seconds to a full draw. 0 means the weapon fires the instant you press
     * (a crossbow's trigger), so one class covers both without a branch at
     * every call site.
     */
    this.chargeTime = config.chargeTime ?? 0;
    /** Damage and arrow-speed multipliers at zero draw and at a full one. */
    this.minPower = config.minPower ?? 0.45;
    this.maxPower = config.maxPower ?? 1.65;
    this.minVelocity = config.minVelocity ?? 0.65;
    this.maxVelocity = config.maxVelocity ?? 1.3;

    this.drawing = false;
    /** 0..1 draw strength. Read by the HUD and the rig's draw pose. */
    this.charge = 0;

    /**
     * Seconds to a full draw. 0 means the weapon fires the instant you press
     * (a crossbow's trigger), so the same class covers both without a branch
     * at every call site.
     */
    this.chargeTime = config.chargeTime ?? 0;
    /** Damage and arrow-speed multipliers at zero draw and at a full one. */
    this.minPower = config.minPower ?? 0.45;
    this.maxPower = config.maxPower ?? 1.65;
    this.minVelocity = config.minVelocity ?? 0.65;
    this.maxVelocity = config.maxVelocity ?? 1.3;

    this.drawing = false;
    /** 0..1 draw strength. Read by the HUD and the rig's draw pose. */
    this.charge = 0;

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
  get chargeable() {
    return this.chargeTime > 0;
  }

  /** Damage this shot would do if released right now. */
  chargedDamage(charge = this.charge) {
    return this.damage * (this.minPower + (this.maxPower - this.minPower) * charge);
  }

  /** Arrow speed this shot would leave at. A full draw also shoots flatter. */
  chargedVelocity(charge = this.charge) {
    return (
      this.projectileSpeed * (this.minVelocity + (this.maxVelocity - this.minVelocity) * charge)
    );
  }

  /**
   * Start pulling the string. Returns false when the shot cannot be taken at
   * all, so the HUD never shows a draw that will not fire.
   */
  beginDraw(now) {
    if (!this.canUse(now) || this.drawing) return false;
    this.drawing = true;
    this.charge = 0;
    return true;
  }

  /** Advance the draw. Charge clamps at full: over-holding does nothing. */
  updateDraw(dt) {
    if (!this.drawing) return;
    this.charge = this.chargeTime > 0 ? clamp(this.charge + dt / this.chargeTime, 0, 1) : 1;
  }

  cancelDraw() {
    this.drawing = false;
    this.charge = 0;
  }

  launchPitchFor(velocity = this.projectileSpeed) {
    const sin2 = clamp((GRAVITY * this.range) / (velocity ** 2), 0, 1);
    const solved = 0.5 * Math.asin(sin2);
    const capped = Math.asin(clamp(Math.sqrt(2 * GRAVITY * MAX_ARC_APEX) / velocity, 0, 1));
    return Math.min(solved, capped);
  }

  get launchPitch() {
    return this.launchPitchFor();
  }

  /** Safety cap only — gravity normally ends the flight first. */
  get projectileLifetime() {
    return (this.range / this.projectileSpeed) * 2.5;
  }

  canUse(now) {
    return super.canUse(now) && !this.reloading && this.ammo > 0;
  }

  /** Put arrows back in the quiver. Returns how many actually fitted. */
  addAmmo(count) {
    const before = this.ammo;
    this.ammo = Math.min(this.ammoCapacity, this.ammo + count);
    return this.ammo - before;
  }

  /**
   * Fire one shot. Returns the spawned projectile spec, or null if the shot
   * could not be taken (cooldown, empty magazine, mid-reload).
   * @param {number} now
   * @param {{x:number,y:number,z:number}} origin
   * @param {{x:number,z:number}} direction unit vector in XZ
   */
  use(now, origin, direction, { charge = null, team = 'player' } = {}) {
    if (!this.canUse(now)) {
      if (this.ammo <= 0) this.beginReload(now);
      this.cancelDraw();
      return null;
    }

    const power = charge ?? (this.chargeable ? this.charge : 1);
    this.drawing = false;
    this.charge = 0;
    this.ammo -= 1;
    this.startCooldown(now);
    this.firing = true;
    this.fireProgress = 0;

    // Split the muzzle speed between "along the aim" and "up", so the shot
    // arcs instead of flying on rails. `pitch` may be overridden by the
    // caller (first-person aiming looks up and down).
    const velocity = this.chargedVelocity(power);
    const pitch = direction.pitch ?? this.launchPitchFor(velocity);
    const horizontal = velocity * Math.cos(pitch);

    return {
      x: origin.x,
      y: origin.y,
      z: origin.z,
      vx: direction.x * horizontal,
      vy: velocity * Math.sin(pitch),
      vz: direction.z * horizontal,
      damage: this.chargedDamage(power),
      lifetime: this.projectileLifetime,
      team,
      power,
    };
  }

  beginReload(now) {
    if (!this.reloadable || this.reloading || this.ammo === this.ammoCapacity) return false;
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
    if (this.drawing) this.updateDraw(dt);
    if (this.firing) {
      this.fireProgress += dt / this.animationDuration;
      if (this.fireProgress >= 1) {
        this.fireProgress = 1;
        this.firing = false;
      }
    }
  }
}
