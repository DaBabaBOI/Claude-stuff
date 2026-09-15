/**
 * Weapon — base class for every melee and ranged weapon.
 *
 * Phase 1 contract (from the build spec):
 *   name, type ('melee' | 'ranged'), damage, speed, range
 *   ranged only: ammoCapacity, reloadTime
 *
 * `speed` is uses-per-second for BOTH types (attacks/sec, shots/sec). Ranged
 * weapons keep projectile velocity in a separate `projectileSpeed` field so the
 * upgrade curve can scale "how fast you attack" without also scaling "how fast
 * the arrow flies".
 *
 * `level` and the upgrade curve are deliberately NOT implemented yet — that is
 * milestone 3. The field exists so nothing has to change shape later.
 */
export class Weapon {
  constructor({
    id,
    name,
    type,
    damage,
    speed,
    range,
    model = null,
    level = 0,
  }) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.baseDamage = damage;
    this.baseSpeed = speed;
    this.range = range;
    this.model = model;
    this.level = level;

    /** Timestamp (GameState.time) at which this weapon may be used again. */
    this.nextReadyAt = 0;
  }

  /** Effective damage. Milestone 3 will apply the upgrade curve here. */
  get damage() {
    return this.baseDamage;
  }

  /** Effective uses per second. Milestone 3 will apply the upgrade curve here. */
  get speed() {
    return this.baseSpeed;
  }

  /** Seconds between uses. */
  get cooldown() {
    return 1 / this.speed;
  }

  /** Seconds left before the weapon can be used again (0 when ready). */
  cooldownRemaining(now) {
    return Math.max(0, this.nextReadyAt - now);
  }

  canUse(now) {
    return now >= this.nextReadyAt;
  }

  /** Subclasses call this from their own use() once the attack is committed. */
  startCooldown(now) {
    this.nextReadyAt = now + this.cooldown;
  }
}
