import { MeleeWeapon } from './MeleeWeapon.js';
import { RangedWeapon } from './RangedWeapon.js';

/**
 * PHASE 1 stat table — deliberately only the two placeholder weapons the
 * skeleton needs. The full roster (scythe, daggers, shortbow, crossbow) is
 * milestone 2; it drops straight into this file with no code changes anywhere
 * else, because the classes above already carry every field the roster needs.
 *
 * Units: damage = HP, speed = uses/sec, range = metres, projectileSpeed = m/s.
 */
export const MELEE_CONFIGS = {
  sword: {
    id: 'sword',
    name: 'Training Sword',
    damage: 12,
    speed: 1.2,       // attacks per second
    range: 2.3,       // metres from the player's centre
    arcDegrees: 100,  // width of the damage cone
    windupRatio: 0.35,
    activeRatio: 0.25,
    model: 'sword',
  },
};

export const RANGED_CONFIGS = {
  bow: {
    id: 'bow',
    name: 'Training Bow',
    damage: 14,
    speed: 1.0,          // shots per second
    range: 20,           // metres before the arrow expires
    projectileSpeed: 30, // m/s
    ammoCapacity: 12,
    reloadTime: 1.4,
    releaseDelay: 0.1,
    chargeTime: 0.85,  // hold to draw; a tap shoots a weak, loopy arrow
    model: 'bow',
  },
};

export function createMelee(id) {
  const config = MELEE_CONFIGS[id];
  if (!config) throw new Error(`Unknown melee weapon: ${id}`);
  return new MeleeWeapon(config);
}

export function createRanged(id) {
  const config = RANGED_CONFIGS[id];
  if (!config) throw new Error(`Unknown ranged weapon: ${id}`);
  return new RangedWeapon(config);
}
