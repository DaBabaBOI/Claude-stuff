import { Weapon } from './Weapon.js';
import { angleDelta, yawFromDirection } from '../mathUtils.js';

/**
 * MeleeWeapon — a swing is a small state machine over one animation:
 *
 *   |--- windup ---|--- active ---|--- recovery ---|
 *   0             wu             wu+ac            1     (normalised progress)
 *
 * Hit detection only runs during the ACTIVE window, and each enemy can be hit
 * at most once per swing (`hitThisSwing`). That single rule is what lets the
 * scythe hit a whole arc later without double-dipping on one target.
 */
export class MeleeWeapon extends Weapon {
  constructor(config) {
    super({ ...config, type: 'melee' });

    /** Full width of the damage arc, in degrees, centred on where you face. */
    this.arcDegrees = config.arcDegrees ?? 90;
    /** Phase split of the swing animation. Must sum to <= 1. */
    this.windupRatio = config.windupRatio ?? 0.35;
    this.activeRatio = config.activeRatio ?? 0.25;

    this.swinging = false;
    /** 0..1 progress through the swing animation (drives the rig pose). */
    this.swingProgress = 0;
    this.swingDuration = 0;
    this.hitThisSwing = new Set();
  }

  /** Length of the swing animation: slightly shorter than the cooldown. */
  get animationDuration() {
    return Math.min(this.cooldown * 0.9, 0.75);
  }

  get phase() {
    if (!this.swinging) return 'idle';
    if (this.swingProgress < this.windupRatio) return 'windup';
    if (this.swingProgress < this.windupRatio + this.activeRatio) return 'active';
    return 'recovery';
  }

  /**
   * Begin a swing. Returns true if the attack actually started.
   */
  use(now) {
    if (!this.canUse(now) || this.swinging) return false;
    this.swinging = true;
    this.swingProgress = 0;
    this.swingDuration = this.animationDuration;
    this.hitThisSwing.clear();
    this.startCooldown(now);
    return true;
  }

  /**
   * Advance the swing and apply damage during the active window.
   * @param {number} dt seconds
   * @param {{owner: any, state: import('../GameState.js').GameState}} ctx
   */
  update(dt, ctx) {
    if (!this.swinging) return;

    const wasActive = this.phase === 'active';
    this.swingProgress += dt / this.swingDuration;
    if (this.swingProgress >= 1) {
      this.swingProgress = 1;
      this.swinging = false;
    }
    const isActive = this.phase === 'active';

    if (wasActive || isActive) this.applyHits(ctx);
  }

  applyHits({ owner, state }) {
    const halfArc = (this.arcDegrees * Math.PI) / 180 / 2;

    for (const enemy of state.enemies) {
      if (enemy.dead || this.hitThisSwing.has(enemy)) continue;

      const dx = enemy.position.x - owner.position.x;
      const dz = enemy.position.z - owner.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > this.range + enemy.radius) continue;

      const toTarget = yawFromDirection(dx, dz);
      if (Math.abs(angleDelta(owner.facing, toTarget)) > halfArc) continue;

      this.hitThisSwing.add(enemy);
      enemy.takeDamage(this.damage, state, {
        kind: 'melee',
        fromX: owner.position.x,
        fromZ: owner.position.z,
      });
    }
  }
}
