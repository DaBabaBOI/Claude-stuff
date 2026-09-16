import * as THREE from 'three';
import { HumanoidRig } from './HumanoidRig.js';

const HIT_REACTION_TIME = 0.18;

/**
 * Enemy — for Phase 1 this is just the test dummy: it has health, reacts to
 * hits, dies, and respawns so you can keep testing weapon feel. No AI, no
 * attacks; that is milestone 6.
 */
export class Enemy {
  constructor({ scene, position = new THREE.Vector3(0, 0, -4), maxHealth = 200, respawnDelay = 3 }) {
    this.scene = scene;
    this.position = position.clone();
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.radius = 0.45;
    /** Flat damage reduction from armour. Rank decides it for zombies. */
    this.defense = 0;
    this.height = 2.0; // used by the projectile height check
    this.respawnDelay = respawnDelay;

    this.isZombie = false;
    this.isSkeleton = false;
    this.dead = false;
    this.deathTimer = 0;
    this.hitTimer = HIT_REACTION_TIME;
    this.knockback = new THREE.Vector3();
    this.facing = Math.PI; // faces the player's start position

    this.rig = new HumanoidRig({ cloth: 0xb08040, accent: 0x6d4b22, skin: 0xd8c09a });
    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.y = this.facing;
    scene.add(this.rig.root);
  }

  takeDamage(amount, state, { kind = 'melee', fromX = 0, fromZ = 0 } = {}) {
    if (this.dead) return;
    // Armour never reduces a hit to nothing: a chip of damage always lands, so
    // an armoured enemy is slower to kill, never immune.
    const applied = Math.max(1, Math.round(amount - this.defense));
    this.health = Math.max(0, this.health - applied);
    this.hitTimer = 0;
    this.rig.triggerFlash(1);
    state.pushDamageEvent({ x: this.position.x, y: 2.0, z: this.position.z }, applied, kind);
    state.pushEvent('hit', { amount: applied, kind });

    // A nudge away from the attacker — enough to read as an impact.
    const dx = this.position.x - fromX;
    const dz = this.position.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.knockback.set((dx / len) * 2.2, 0, (dz / len) * 2.2);

    if (this.health === 0) {
      this.dead = true;
      this.deathTimer = 0;
      state.pushEvent('enemy-death');
    }
  }

  respawn() {
    this.dead = false;
    this.health = this.maxHealth;
    this.deathTimer = 0;
    this.hitTimer = HIT_REACTION_TIME;
    this.knockback.set(0, 0, 0);
    this.rig.reset();
  }

  update(dt, state) {
    if (this.dead) {
      this.deathTimer += dt;
      if (this.deathTimer > this.respawnDelay) this.respawn();
    } else {
      if (this.hitTimer < HIT_REACTION_TIME) this.hitTimer += dt;
      this.position.x += this.knockback.x * dt;
      this.position.z += this.knockback.z * dt;
      this.knockback.multiplyScalar(Math.pow(0.02, dt));
    }

    this.rig.root.position.set(this.position.x, 0, this.position.z);
    this.rig.update(dt, {
      time: state.time,
      state: this.dead ? 'death' : 'idle',
      moveSpeed01: 0,
      hitProgress: this.hitTimer / HIT_REACTION_TIME,
      deathProgress: this.deathTimer / 0.8,
    });
  }
}
