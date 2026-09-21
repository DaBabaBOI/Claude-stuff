import { MeleeWeapon } from './MeleeWeapon.js';
import { RangedWeapon } from './RangedWeapon.js';

/**
 * The weapon catalogue: six archetypes crossed with nine families, 54 weapons.
 *
 * Crossing two small tables beats hand-writing fifty entries. The archetype
 * decides how a weapon PLAYS — a scythe is slow and wide, daggers are fast and
 * short — and the family decides how good it is and what else it does. So every
 * one of the 54 is a real, distinguishable weapon rather than a reskin, and a
 * Rusted Scythe still feels like a scythe.
 *
 *              rusted  iron  steel  silvered  bone  ember  frost  storm  grave
 *   sword         ·      ·      ·       ·       ·     ·      ·      ·      ·
 *   scythe        ·      ·      ·       ·       ·     ·      ·      ·      ·
 *   daggers       ·      ·      ·       ·       ·     ·      ·      ·      ·
 *   shortbow      ·      ·      ·       ·       ·     ·      ·      ·      ·
 *   bow           ·      ·      ·       ·       ·     ·      ·      ·      ·
 *   crossbow      ·      ·      ·       ·       ·     ·      ·      ·      ·
 */

/** How a weapon plays. Straight from the original build spec's stat tables. */
export const ARCHETYPES = {
  sword: {
    name: 'Sword', type: 'melee', model: 'sword',
    damage: 12, speed: 1.2, range: 2.3, arcDegrees: 100,
    windupRatio: 0.35, activeRatio: 0.25,
    blurb: 'Balanced single target. The reliable all-rounder.',
  },
  scythe: {
    name: 'Scythe', type: 'melee', model: 'scythe',
    damage: 22, speed: 0.7, range: 3.0, arcDegrees: 170,
    windupRatio: 0.42, activeRatio: 0.28,
    blurb: 'Slow, wide, hits everything in the arc. Punishes a whiff.',
  },
  daggers: {
    name: 'Daggers', type: 'melee', model: 'daggers',
    damage: 6, speed: 2.0, range: 1.6, arcDegrees: 70,
    windupRatio: 0.25, activeRatio: 0.3,
    blurb: 'Low per hit, high per second. Rewards getting close.',
  },
  shortbow: {
    name: 'Shortbow', type: 'ranged', model: 'shortbow',
    damage: 9, speed: 1.5, range: 14, projectileSpeed: 26,
    ammoCapacity: 16, chargeTime: 0.4, reloadable: false,
    blurb: 'Fast and spammable. Short range, quick draw.',
  },
  bow: {
    name: 'Bow', type: 'ranged', model: 'bow',
    damage: 14, speed: 1.0, range: 20, projectileSpeed: 30,
    ammoCapacity: 12, chargeTime: 0.85, reloadable: false,
    blurb: 'Balanced. Rewards a full draw.',
  },
  crossbow: {
    name: 'Crossbow', type: 'ranged', model: 'crossbow',
    damage: 26, speed: 0.5, range: 24, projectileSpeed: 42,
    ammoCapacity: 6, chargeTime: 0, reloadable: false,
    blurb: 'One heavy bolt, no draw. Misses hurt.',
  },
};

/**
 * What a weapon is made of: how good it is, and what else it does.
 * `weight` is its share of drops early on, `lateWeight` deep into a run.
 */
export const FAMILIES = [
  { id: 'rusted', name: 'Rusted', rarity: 'common', damage: 0.75, speed: 0.92, weight: 30, lateWeight: 4 },
  { id: 'iron', name: 'Iron', rarity: 'common', damage: 1, speed: 1, weight: 26, lateWeight: 10 },
  { id: 'steel', name: 'Steel', rarity: 'uncommon', damage: 1.18, speed: 1.05, weight: 18, lateWeight: 18 },
  { id: 'silvered', name: 'Silvered', rarity: 'uncommon', damage: 1.24, speed: 1.08, weight: 12, lateWeight: 18, modifier: 'pierce' },
  { id: 'bone', name: 'Bone', rarity: 'rare', damage: 1.3, speed: 1.16, weight: 7, lateWeight: 16, modifier: 'crit' },
  { id: 'ember', name: 'Ember', rarity: 'rare', damage: 1.4, speed: 1, weight: 5, lateWeight: 14, modifier: 'burn' },
  { id: 'frost', name: 'Frost', rarity: 'epic', damage: 1.5, speed: 0.96, weight: 2, lateWeight: 10, modifier: 'chill' },
  { id: 'storm', name: 'Storm', rarity: 'epic', damage: 1.6, speed: 1.1, weight: 1.5, lateWeight: 7, modifier: 'shock' },
  { id: 'grave', name: 'Gravebound', rarity: 'legendary', damage: 1.9, speed: 1.15, weight: 0.5, lateWeight: 3, modifier: 'leech' },
];

/** Every modifier does something real; none of them are just a label. */
export const MODIFIERS = {
  pierce: { name: 'Piercing', blurb: 'Ignores armour.' },
  crit: { name: 'Keen', blurb: '25% chance to hit for double.', chance: 0.25, multiplier: 2 },
  burn: { name: 'Burning', blurb: 'Sets the target alight.', dps: 6, duration: 3 },
  chill: { name: 'Chilling', blurb: 'Slows the target by 45%.', slow: 0.55, duration: 2.5 },
  shock: { name: 'Arcing', blurb: 'Half damage jumps to a nearby enemy.', share: 0.5, radius: 4.5 },
  leech: { name: 'Leeching', blurb: 'Heals you for a fifth of the damage.', share: 0.2 },
};

export const RARITIES = {
  common: { name: 'Common', colour: 0xb9c2d0, order: 0 },
  uncommon: { name: 'Uncommon', colour: 0x6fd08a, order: 1 },
  rare: { name: 'Rare', colour: 0x5aa7f0, order: 2 },
  epic: { name: 'Epic', colour: 0xb47cf2, order: 3 },
  legendary: { name: 'Legendary', colour: 0xf0a63c, order: 4 },
};

function buildCatalogue() {
  const entries = [];
  for (const [archetypeId, archetype] of Object.entries(ARCHETYPES)) {
    for (const family of FAMILIES) {
      entries.push({
        id: `${family.id}-${archetypeId}`,
        archetype: archetypeId,
        family: family.id,
        name: `${family.name} ${archetype.name}`,
        rarity: family.rarity,
        modifier: family.modifier ?? null,
        blurb: archetype.blurb,
        // Rounded so the numbers on screen are readable, not 13.799999.
        damage: Math.round(archetype.damage * family.damage * 10) / 10,
        speed: Math.round(archetype.speed * family.speed * 100) / 100,
      });
    }
  }
  return entries;
}

/** All 54, in a stable order. */
export const CATALOGUE = buildCatalogue();
const BY_ID = new Map(CATALOGUE.map((entry) => [entry.id, entry]));

export function getWeaponEntry(id) {
  return BY_ID.get(id) ?? null;
}

/** Build the live weapon object for a catalogue id. */
export function createWeapon(id) {
  const entry = BY_ID.get(id);
  if (!entry) throw new Error(`Unknown weapon: ${id}`);
  const archetype = ARCHETYPES[entry.archetype];

  const config = {
    ...archetype,
    id: entry.id,
    name: entry.name,
    damage: entry.damage,
    speed: entry.speed,
    rarity: entry.rarity,
    modifier: entry.modifier,
    archetype: entry.archetype,
  };

  return archetype.type === 'melee' ? new MeleeWeapon(config) : new RangedWeapon(config);
}

/** Convenience for the starting kit and for tests. */
export const createMelee = (archetype = 'sword', family = 'iron') => createWeapon(`${family}-${archetype}`);
export const createRanged = (archetype = 'bow', family = 'iron') => createWeapon(`${family}-${archetype}`);

function pickWeighted(items, weightOf) {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/**
 * Roll a drop. `progress` (0..1) slides the family weights from mostly-rusted
 * toward the good stuff, so what falls off a zombie gets better as a run goes
 * on without a separate difficulty dial.
 *
 * @param {number} progress
 * @param {'melee'|'ranged'|null} preferType nudge toward what the enemy carried
 */
export function rollWeaponDrop(progress = 0, preferType = null) {
  const t = Math.min(1, Math.max(0, progress));
  const family = pickWeighted(FAMILIES, (f) => f.weight + (f.lateWeight - f.weight) * t);

  const archetypeIds = Object.keys(ARCHETYPES);
  const archetypeId = pickWeighted(archetypeIds, (id) => {
    const archetype = ARCHETYPES[id];
    if (!preferType) return 1;
    return archetype.type === preferType ? 3 : 1;
  });

  return `${family.id}-${archetypeId}`;
}
