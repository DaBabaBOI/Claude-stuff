/**
 * Ability — base class for the three ability slots.
 *
 * Per the build spec, every ability needs a cooldown, a resource cost, a clear
 * visual tell, and an identity that leans on one weapon more than the others.
 * This class owns the first two; the tell and the effect are the subclass's.
 *
 * Cooldowns are per ability, never shared, so all three can be planned around
 * independently.
 */
export class Ability {
  constructor({ id, name, key, cooldown, staminaCost = 0, description = '' }) {
    this.id = id;
    this.name = name;
    /** Key label for the HUD — the binding itself lives in InputManager. */
    this.key = key;
    this.cooldown = cooldown;
    this.staminaCost = staminaCost;
    this.description = description;

    this.readyAt = 0;
  }

  cooldownRemaining(now) {
    return Math.max(0, this.readyAt - now);
  }

  /** 0 while cooling down, 1 when ready — what the HUD sweep draws. */
  cooldownProgress(now) {
    if (this.cooldown <= 0) return 1;
    return 1 - this.cooldownRemaining(now) / this.cooldown;
  }

  isReady(now) {
    return now >= this.readyAt;
  }

  canUse(state, player) {
    return (
      this.isReady(state.time) && !player.dead && player.stamina >= this.staminaCost
    );
  }

  /**
   * Fire the ability. Subclasses override `apply()`, not this, so the cost and
   * cooldown bookkeeping can never be forgotten.
   */
  trigger(state, player) {
    if (!this.canUse(state, player)) return false;
    if (!this.apply(state, player)) return false;

    player.stamina -= this.staminaCost;
    this.readyAt = state.time + this.cooldown;
    return true;
  }

  /** @returns {boolean} whether the ability actually did anything. */
  apply() {
    return false;
  }

  /** Per-frame hook for abilities with a duration. */
  update() {}
}
