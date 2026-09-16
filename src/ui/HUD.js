import * as THREE from 'three';

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
      dead: root.getElementById('dead'),
      floaters: root.getElementById('floaters'),
    };
    this.floaters = [];
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
      this.el.ammoText.textContent = ranged.reloading
        ? `reloading ${Math.round(ranged.reloadProgress(state.time) * 100)}%`
        : `${ranged.ammo} / ${ranged.ammoCapacity}`;
    } else {
      this.el.ammoRow.hidden = true;
    }

    this.el.meleeChip.classList.toggle('held', player.heldSlot === 'melee');
    this.el.rangedChip.classList.toggle('held', player.heldSlot === 'ranged');
    this.el.meleeChip.textContent = player.equippedMelee ? `1 ${player.equippedMelee.name}` : '1 —';
    this.el.rangedChip.textContent = player.equippedRanged ? `2 ${player.equippedRanged.name}` : '2 —';

    this.el.dead.classList.toggle('show', player.dead);

    const zombies = state.enemies.filter((e) => e.isZombie && !e.dead).length;
    this.el.waveText.textContent = zombies === 0 ? 'Next wave incoming' : `Zombies: ${zombies}`;

    const dummy = state.enemies[0];
    if (dummy) {
      this.el.dummyFill.style.width = `${(dummy.health / dummy.maxHealth) * 100}%`;
      this.el.dummyText.textContent = dummy.dead
        ? 'Test Dummy — down (respawning)'
        : `Test Dummy — ${Math.round(dummy.health)} / ${dummy.maxHealth}`;
    }

    this.drainDamageEvents(state);
    this.updateFloaters(dt, camera);
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
