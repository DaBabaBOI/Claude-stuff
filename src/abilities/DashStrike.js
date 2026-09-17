import { Ability } from './Ability.js';

/**
 * Dash Strike — a short roll that cannot be hit, and hurts anything it goes
 * through.
 *
 *      ●═══════════════▶        0.22 s, ~4.5 m, invulnerable the whole way
 *       ╲__ anything inside this swept line takes melee damage, once
 *
 * This is the answer to being surrounded. Backpedalling is deliberately slow
 * and melee reach is short, so without a way out, a pack of zombies plus an
 * archer is a fight you can only kite. Making it *also* deal damage means it is
 * a commitment rather than a panic button: you dash toward something, not away
 * from everything.
 *
 * Damage comes from the equipped melee weapon, so it scales with whatever you
 * are carrying and leans on the melee build, as the spec intends.
 */
export class DashStrike extends Ability {
  constructor() {
    super({
      id: 'dash-strike',
      name: 'Dash',
      key: 'E',
      cooldown: 3.5,
      staminaCost: 20,
      description: 'Roll a short distance. Invulnerable, and cuts what you pass through.',
    });
    this.distance = 4.5;
    this.duration = 0.22;
    this.damageScale = 1;
  }

  apply(state, player) {
    // Dash where you are steering, or where you face if you are standing still.
    const move = state.input?.moveVector;
    const direction =
      move && (move.x !== 0 || move.z !== 0)
        ? { x: move.x, z: move.z }
        : null;

    const started = player.startDash({
      direction,
      distance: this.distance,
      duration: this.duration,
      damage: (player.equippedMelee?.damage ?? 0) * this.damageScale,
    });
    if (!started) return false;

    state.pushEvent('dash');
    return true;
  }
}
