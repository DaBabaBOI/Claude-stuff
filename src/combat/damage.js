import { MODIFIERS } from './weapons.config.js';

/**
 * One place where a weapon's damage becomes an enemy's problem.
 *
 * Both the melee arc and the projectile system route through here, so a
 * weapon's modifier works the same whether it was swung or shot, and adding a
 * new modifier means touching one file rather than every attack path.
 */
export function applyWeaponHit({ weapon, target, state, attacker, fromX, fromZ, kind }) {
  if (!target || target.dead) return 0;

  const modifier = weapon?.modifier ? MODIFIERS[weapon.modifier] : null;
  let damage = weapon?.damage ?? 0;
  let critical = false;

  if (modifier && weapon.modifier === 'crit' && Math.random() < modifier.chance) {
    damage *= modifier.multiplier;
    critical = true;
  }

  const dealt = target.takeDamage(damage, state, {
    kind: critical ? 'crit' : kind,
    fromX,
    fromZ,
    ignoreDefense: weapon?.modifier === 'pierce',
  });

  if (!modifier) return dealt;

  switch (weapon.modifier) {
    case 'burn':
      target.applyBurn(modifier.dps, modifier.duration);
      break;

    case 'chill':
      target.applyChill(modifier.slow, modifier.duration);
      break;

    case 'shock': {
      // Jump to the nearest OTHER enemy, so it rewards fighting a crowd.
      let nearest = null;
      let nearestDist = modifier.radius;
      for (const other of state.enemies) {
        if (other === target || other.dead) continue;
        const dist = Math.hypot(
          other.position.x - target.position.x,
          other.position.z - target.position.z
        );
        if (dist < nearestDist) {
          nearest = other;
          nearestDist = dist;
        }
      }
      if (nearest) {
        nearest.takeDamage(dealt * modifier.share, state, {
          kind: 'shock',
          fromX: target.position.x,
          fromZ: target.position.z,
        });
        state.pushEvent('shock');
      }
      break;
    }

    case 'leech':
      if (attacker && attacker.health < attacker.maxHealth) {
        const healed = Math.max(1, Math.round(dealt * modifier.share));
        attacker.health = Math.min(attacker.maxHealth, attacker.health + healed);
        state.pushDamageEvent(
          { x: attacker.position.x, y: 2, z: attacker.position.z },
          healed,
          'heal'
        );
      }
      break;

    default:
      break;
  }

  return dealt;
}
