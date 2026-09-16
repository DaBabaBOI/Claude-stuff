import { Ability } from './Ability.js';

/**
 * Mend — the heal.
 *
 * Deliberately short cooldown: it is meant to be leaned on, part of the rhythm
 * of a fight rather than an emergency button you hoard. What keeps it honest is
 * the stamina cost — healing and sprinting draw on the same pool, so escaping
 * and recovering compete, and you cannot do both forever.
 *
 * It also refuses to fire at full health, so a mistimed press does not eat the
 * cooldown for nothing.
 */
export class Mend extends Ability {
  constructor() {
    super({
      id: 'mend',
      name: 'Mend',
      key: 'Q',
      cooldown: 7,
      staminaCost: 25,
      description: 'Restore health. Shares stamina with sprinting.',
    });
    this.amount = 32;
  }

  canUse(state, player) {
    return super.canUse(state, player) && player.health < player.maxHealth;
  }

  apply(state, player) {
    const before = player.health;
    player.health = Math.min(player.maxHealth, player.health + this.amount);
    const healed = Math.round(player.health - before);
    if (healed <= 0) return false;

    player.rig.triggerFlash(0.8);
    state.pushDamageEvent(
      { x: player.position.x, y: 2.0, z: player.position.z },
      healed,
      'heal'
    );
    state.pushEvent('heal', { amount: healed });
    return true;
  }
}
