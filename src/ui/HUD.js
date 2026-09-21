import * as THREE from 'three';
import { MODIFIERS } from '../combat/weapons.config.js';

const MODIFIER_LABELS = Object.fromEntries(
  Object.entries(MODIFIERS).map(([id, mod]) => [id, `${mod.name} — ${mod.blurb}`])
);

const DAMAGE_NUMBER_LIFETIME = 0.9;

/**
 * HUD — minimum viable feedback for Phase 1: health, stamina, ammo, which
 * weapon is in hand, and floating damage numbers.
 *
 * Damage numbers are plain DOM elements projected from a world position each
 * frame, so they stay glued to the thing that got hit while the camera moves.
 * (Ability icons with cooldown sweeps are milestone 5 — no abilities exist yet.)
 */
export class HUD {
  constructor(root = document) {
    this.el = {
      healthFill: root.getElementById('health-fill'),
      healthText: root.getElementById('health-text'),
      staminaFill: root.getElementById('stamina-fill'),
      ammoText: root.getElementById('ammo-text'),
      ammoRow: root.getElementById('ammo-row'),
      meleeChip: root.getElementById('chip-melee'),
      rangedChip: root.getElementById('chip-ranged'),
      dummyFill: root.getElementById('dummy-fill'),
      dummyText: root.getElementById('dummy-text'),
      waveText: root.getElementById('wave-text'),
      drawRow: root.getElementById('draw-row'),
      drawFill: root.getElementById('draw-fill'),
      drawText: root.getElementById('draw-text'),
      crosshair: root.getElementById('crosshair'),
      healthbars: root.getElementById('healthbars'),
      toast: root.getElementById('toast'),
      abilities: root.getElementById('abilities'),
      loot: root.getElementById('loot'),
      inventory: root.getElementById('inventory'),
      invList: root.getElementById('inv-list'),
      dead: root.getElementById('dead'),
      floaters: root.getElementById('floaters'),
    };
    this.floaters = [];
    /** Pool of reusable health-bar elements, keyed by the enemy they track. */
    this.healthBars = new Map();
    this.barPool = [];
    this.toastTimer = 0;
    this.abilitySlots = [];
    this._v = new THREE.Vector3();
  }

  update(dt, state, camera) {
    const player = state.player;

    const hp = player.health / player.maxHealth;
    this.el.healthFill.style.width = `${hp * 100}%`;
    this.el.healthText.textContent = `${Math.round(player.health)} / ${player.maxHealth}`;
    this.el.staminaFill.style.width = `${(player.stamina / player.maxStamina) * 100}%`;

    const ranged = player.equippedRanged;
    if (ranged) {
      this.el.ammoRow.hidden = false;
      this.el.ammoText.textContent =
        ranged.ammo === 0 ? 'none — find a bundle' : `${ranged.ammo} / ${ranged.ammoCapacity}`;
      this.el.ammoRow.classList.toggle('empty', ranged.ammo === 0);
    } else {
      this.el.ammoRow.hidden = true;
    }

    // Draw meter: only on screen while the string is actually pulled.
    const drawing = Boolean(player.equippedRanged?.drawing);
    const charge = player.drawStrength;
    this.el.drawRow.classList.toggle('drawing', drawing);
    this.el.drawRow.classList.toggle('full', charge >= 1);
    if (drawing) {
      this.el.drawFill.style.width = `${charge * 100}%`;
      this.el.drawText.textContent = `${Math.round(charge * 100)}%  ·  ${Math.round(
        player.equippedRanged.chargedDamage(charge)
      )} dmg`;
    }
    this.el.crosshair.classList.toggle('full', drawing && charge >= 1);
    this.el.crosshair.style.transform = drawing ? `scale(${1 + (1 - charge) * 0.9})` : 'scale(1)';

    this.updateAbilities(state, player);
    this.updateLootPrompt(state, player);

    this.el.meleeChip.classList.toggle('held', player.heldSlot === 'melee');
    this.el.rangedChip.classList.toggle('held', player.heldSlot === 'ranged');
    this.el.meleeChip.textContent = player.equippedMelee ? `1 ${player.equippedMelee.name}` : '1 —';
    this.el.rangedChip.textContent = player.equippedRanged ? `2 ${player.equippedRanged.name}` : '2 —';

    this.el.dead.classList.toggle('show', player.dead);

    const zombies = state.enemies.filter((e) => e.isZombie && !e.dead).length;
    const skeletons = state.enemies.filter((e) => e.isSkeleton && !e.dead).length;
    this.el.waveText.textContent =
      zombies + skeletons === 0
        ? 'Next wave incoming'
        : `Zombies: ${zombies}   ·   Skeletons: ${skeletons}`;

    const dummy = state.enemies[0];
    if (dummy) {
      this.el.dummyFill.style.width = `${(dummy.health / dummy.maxHealth) * 100}%`;
      this.el.dummyText.textContent = dummy.dead
        ? 'Test Dummy — down (respawning)'
        : `Test Dummy — ${Math.round(dummy.health)} / ${dummy.maxHealth}`;
    }

    this.drainDamageEvents(state);
    this.updateFloaters(dt, camera);
    this.updateHealthBars(state, camera);

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast.classList.remove('show');
    }
  }

  /**
   * Ability slots. The cooldown is drawn as a conic-gradient wipe over the
   * slot, so "how long until I can heal again" is readable at a glance rather
   * than as a number to decode mid-fight.
   */
  updateAbilities(state, player) {
    if (this.abilitySlots.length === 0) {
      for (let i = 0; i < player.abilities.length; i++) {
        const el = document.createElement('div');
        el.className = 'ability empty';
        el.innerHTML = '<i class="k"></i><i class="sweep"></i><span class="label"></span>';
        this.el.abilities.appendChild(el);
        this.abilitySlots.push({
          el,
          key: el.querySelector('.k'),
          sweep: el.querySelector('.sweep'),
          label: el.querySelector('.label'),
        });
      }
    }

    const keys = ['Q', 'E', 'R'];
    for (let i = 0; i < this.abilitySlots.length; i++) {
      const slot = this.abilitySlots[i];
      const ability = player.abilities[i];
      slot.key.textContent = keys[i];

      if (!ability) {
        slot.el.classList.add('empty');
        slot.el.classList.remove('ready');
        slot.label.textContent = '—';
        continue;
      }

      const progress = ability.cooldownProgress(state.time);
      const ready = ability.canUse(state, player);
      slot.el.classList.remove('empty');
      slot.el.classList.toggle('ready', ready);
      slot.label.textContent = ability.name;
      slot.sweep.style.background = `conic-gradient(rgba(4,6,10,0.05) ${
        progress * 360
      }deg, rgba(4,6,10,0.78) 0deg)`;
    }
  }

  /**
   * Inventory: what you are carrying and the numbers behind it. Read-only for
   * now — there is nothing to swap to yet.
   */
  renderInventory(state, player) {
    const rows = [];
    const stat = (label, value) => `<div class="inv-stat"><span>${label}</span><b>${value}</b></div>`;

    const melee = player.equippedMelee;
    if (melee) {
      rows.push(`
        <div class="inv-item">
          <div class="inv-head"><span class="inv-name">${melee.name}</span>
            <span class="inv-slot">${melee.rarity} melee</span></div>
          ${melee.modifier ? `<p class="inv-empty">${MODIFIER_LABELS[melee.modifier]}</p>` : ''}
          <div class="inv-stats">
            ${stat('Damage', melee.damage)}
            ${stat('Speed', `${melee.speed.toFixed(2)} /s`)}
            ${stat('DPS', (melee.damage * melee.speed).toFixed(1))}
            ${stat('Range', `${melee.range.toFixed(1)} m`)}
            ${stat('Arc', `${melee.arcDegrees}°`)}
          </div>
        </div>`);
    }

    const ranged = player.equippedRanged;
    if (ranged) {
      rows.push(`
        <div class="inv-item">
          <div class="inv-head"><span class="inv-name">${ranged.name}</span>
            <span class="inv-slot">${ranged.rarity} ranged</span></div>
          ${ranged.modifier ? `<p class="inv-empty">${MODIFIER_LABELS[ranged.modifier]}</p>` : ''}
          <div class="inv-stats">
            ${stat('Damage', `${ranged.chargedDamage(0).toFixed(1)} – ${ranged.chargedDamage(1).toFixed(1)}`)}
            ${stat('Draw time', `${ranged.chargeTime.toFixed(2)} s`)}
            ${stat('Rate', `${ranged.speed.toFixed(2)} /s`)}
            ${stat('Range', `${ranged.range.toFixed(0)} m`)}
            ${stat('Arrow speed', `${ranged.chargedVelocity(0).toFixed(0)} – ${ranged.chargedVelocity(1).toFixed(0)} m/s`)}
            ${stat('Arrows', `${ranged.ammo} / ${ranged.ammoCapacity}`)}
          </div>
        </div>`);
    }

    rows.push(`
      <div class="inv-item">
        <div class="inv-head"><span class="inv-name">${
          player.equippedArmor ? player.equippedArmor.name : 'No armour'
        }</span><span class="inv-slot">Armour</span></div>
        ${
          player.equippedArmor
            ? `<div class="inv-stats">${stat('Defense', player.equippedArmor.defense)}</div>`
            : '<p class="inv-empty">Nothing equipped. Defense 0.</p>'
        }
      </div>`);

    const abilityRows = player.abilities
      .map((ability, i) => {
        const key = ['Q', 'E', 'R'][i];
        if (!ability) return `<div class="inv-stat"><span>${key}</span><b>Empty</b></div>`;
        return `<div class="inv-stat"><span>${key} · ${ability.name}</span><b>${
          ability.cooldown
        }s · ${ability.staminaCost} stam</b></div>`;
      })
      .join('');
    rows.push(`
      <div class="inv-item">
        <div class="inv-head"><span class="inv-name">Abilities</span>
          <span class="inv-slot">3 slots</span></div>
        <div class="inv-stats">${abilityRows}</div>
      </div>`);

    rows.push(`
      <div class="inv-item">
        <div class="inv-head"><span class="inv-name">You</span>
          <span class="inv-slot">Hero</span></div>
        <div class="inv-stats">
          ${stat('Health', `${Math.round(player.health)} / ${player.maxHealth}`)}
          ${stat('Stamina', `${Math.round(player.stamina)} / ${player.maxStamina}`)}
          ${stat('Move speed', '5.4 m/s')}
          ${stat('Defense', player.defense)}
        </div>
      </div>`);

    this.el.invList.innerHTML = rows.join('');
  }

  setInventoryOpen(open, state, player) {
    this.el.inventory.classList.toggle('show', open);
    if (open) this.renderInventory(state, player);
  }

  /**
   * The loot prompt. It answers the only question that matters while standing
   * on a weapon — is this better than mine? — by showing the deltas against
   * whatever occupies the same slot, so you never have to open a menu mid-fight.
   */
  updateLootPrompt(state, player) {
    const drop = state.nearestDrop;
    this.el.loot.classList.toggle('show', Boolean(drop));
    if (!drop) {
      this.lootShownFor = null;
      return;
    }
    if (this.lootShownFor === drop) return;
    this.lootShownFor = drop;

    const entry = drop.entry;
    const archetype = drop.archetype;
    const current = archetype.type === 'melee' ? player.equippedMelee : player.equippedRanged;
    const rarity = drop.rarity;

    const delta = (label, next, prev, unit = '', better = 'higher') => {
      const diff = next - prev;
      const good = better === 'higher' ? diff > 0 : diff < 0;
      const cls = Math.abs(diff) < 0.005 ? '' : good ? 'up' : 'down';
      const sign = diff > 0 ? '+' : '';
      const change = Math.abs(diff) < 0.005 ? '' : ` <span class="${cls}">${sign}${diff.toFixed(1)}</span>`;
      return `<span>${label} ${next.toFixed(1)}${unit}${change}</span>`;
    };

    const modifier = entry.modifier
      ? `<div class="loot-mod">${MODIFIER_LABELS[entry.modifier] ?? entry.modifier}</div>`
      : '';

    this.el.loot.style.setProperty('--loot-colour', `#${rarity.colour.toString(16).padStart(6, '0')}`);
    this.el.loot.innerHTML = `
      <div class="loot-rarity">${rarity.name} · ${archetype.type}</div>
      <div class="loot-name">${entry.name}</div>
      ${modifier}
      <div class="loot-stats">
        ${delta('DMG', entry.damage, current?.baseDamage ?? 0)}
        ${delta('SPD', entry.speed, current?.baseSpeed ?? 0, '/s')}
        ${delta('RNG', archetype.range, current?.range ?? 0, ' m')}
      </div>
      <div class="take">Press <kbd>F</kbd> to take · drops what you carry</div>`;
  }

  /** Brief centred message — mute state, mode changes. */
  showToast(text, seconds = 1.6) {
    this.el.toast.textContent = text;
    this.el.toast.classList.add('show');
    this.toastTimer = seconds;
  }

  /**
   * A health bar per living enemy, floating above its head.
   *
   * World point (x, height + 0.4, z) is projected through the camera each
   * frame; anything behind the camera (projected z > 1) is hidden rather than
   * drawn mirrored in front of you.
   */
  updateHealthBars(state, camera) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const seen = new Set();

    for (const enemy of state.enemies) {
      if (enemy.dead || !(enemy.isZombie || enemy.isSkeleton)) continue;
      seen.add(enemy);

      let bar = this.healthBars.get(enemy);
      if (!bar) {
        const el = this.barPool.pop() ?? document.createElement('div');
        el.className = `ehp${enemy.isSkeleton ? ' skeleton' : ''}`;
        if (!el.firstChild) el.appendChild(document.createElement('i'));
        this.el.healthbars.appendChild(el);
        bar = { el, fill: el.firstChild };
        this.healthBars.set(enemy, bar);
      }

      this._v.set(enemy.position.x, (enemy.height ?? 2) + 0.4, enemy.position.z).project(camera);
      if (this._v.z > 1) {
        bar.el.style.opacity = '0';
        continue;
      }
      const ratio = Math.max(0, enemy.health / enemy.maxHealth);
      bar.el.style.opacity = '1';
      bar.el.style.transform = `translate(-50%, -50%) translate(${
        (this._v.x * 0.5 + 0.5) * width
      }px, ${(-this._v.y * 0.5 + 0.5) * height}px)`;
      bar.fill.style.width = `${ratio * 100}%`;
      bar.el.classList.toggle('hurt', ratio < 1);
    }

    // Recycle bars whose enemy died or was cleaned up.
    for (const [enemy, bar] of this.healthBars) {
      if (seen.has(enemy)) continue;
      bar.el.remove();
      this.barPool.push(bar.el);
      this.healthBars.delete(enemy);
    }
  }

  drainDamageEvents(state) {
    for (const event of state.damageEvents) {
      const el = document.createElement('div');
      el.className = `floater floater-${event.kind}`;
      el.textContent = event.kind === 'player' ? `-${event.amount}` : String(event.amount);
      this.el.floaters.appendChild(el);
      this.floaters.push({
        el,
        world: new THREE.Vector3(event.position.x, event.position.y, event.position.z),
        age: 0,
        drift: (Math.random() - 0.5) * 30,
      });
    }
    state.damageEvents.length = 0;
  }

  updateFloaters(dt, camera) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.age += dt;
      if (f.age >= DAMAGE_NUMBER_LIFETIME) {
        f.el.remove();
        this.floaters.splice(i, 1);
        continue;
      }
      const t = f.age / DAMAGE_NUMBER_LIFETIME;
      this._v.copy(f.world).project(camera);
      const x = (this._v.x * 0.5 + 0.5) * width + f.drift * t;
      const y = (-this._v.y * 0.5 + 0.5) * height - t * 70;
      f.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${1.15 - t * 0.3})`;
      f.el.style.opacity = String(1 - t * t);
    }
  }
}
