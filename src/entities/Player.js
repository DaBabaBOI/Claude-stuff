import * as THREE from 'three';
import { HumanoidRig } from './HumanoidRig.js';
import { createQuiver, createWeaponModel } from './weaponModels.js';
import {
  clamp,
  closestPointOnSegmentXZ,
  damp,
  dampAngle,
  directionFromYaw,
  yawFromDirection,
} from '../mathUtils.js';

const BASE_MOVE_SPEED = 5.4;   // metres/sec
const SPRINT_MULTIPLIER = 1.55;
const SPRINT_STAMINA_COST = 24; // per second
const STAMINA_REGEN = 16;       // per second
const STAMINA_REGEN_DELAY = 0.5;
const ATTACK_MOVE_PENALTY = 0.35;
const DRAW_MOVE_PENALTY = 0.55;
/**
 * Speed multipliers by how far the movement direction is from where you face.
 * Backpedalling is meant to feel like a retreat, not a second forward gear.
 */
const FORWARD_SPEED = 1;
const STRAFE_SPEED = 0.78;
const BACKWARD_SPEED = 0.55;
const HIT_REACTION_TIME = 0.22;

/**
 * Player — the hero, and the object every later system hangs off.
 *
 * Phase 1 exposes exactly the surface the spec asks for:
 *   health, stamina, position, equippedMelee, equippedRanged, equippedArmor,
 *   abilities[3]
 *
 * equippedArmor is null and abilities are empty slots: those are milestones 3
 * and 4. The getters below (`defense`, `staminaRegen`, `moveSpeedModifier`)
 * already read through armor, so armour becomes a data change, not a rewrite.
 */
export class Player {
  constructor({ scene, projectileSystem, position = new THREE.Vector3(0, 0, 4) }) {
    this.scene = scene;
    this.projectileSystem = projectileSystem;

    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.maxStamina = 100;
    this.stamina = this.maxStamina;

    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.facing = 0;
    this.radius = 0.4;
    this.height = 1.9; // for incoming arrows' height check

    this.equippedMelee = null;
    this.equippedRanged = null;
    this.equippedArmor = null;      // milestone 3
    /** Three independent slots, each with its own cooldown. */
    this.abilities = [null, null, null];

    /** Which weapon is in the hand socket; the other sits on the back. */
    this.heldSlot = 'melee';

    /** Set while a dash is in flight; see startDash(). */
    this.dash = null;
    this.dead = false;
    this.hitTimer = HIT_REACTION_TIME; // >= HIT_REACTION_TIME means "not reacting"
    this.staminaIdleTimer = 0;
    this.sprinting = false;

    this.rig = new HumanoidRig({ cloth: 0x4a7ad4, accent: 0x27344d, skin: 0xe9c6a0 });
    this.rig.root.position.copy(this.position);
    scene.add(this.rig.root);

    this.weaponModels = { melee: null, ranged: null };
    this.quiver = null;
  }

  // --- Stats that armour will modify later -------------------------------
  get defense() {
    return this.equippedArmor ? this.equippedArmor.defense : 0;
  }

  get staminaRegen() {
    return STAMINA_REGEN + (this.equippedArmor?.staminaRegenBonus ?? 0);
  }

  get moveSpeedModifier() {
    return this.equippedArmor?.movementSpeedModifier ?? 1;
  }

  get isAttacking() {
    return Boolean(
      this.equippedMelee?.swinging || this.equippedRanged?.firing || this.equippedRanged?.drawing
    );
  }

  // --- Equipment ----------------------------------------------------------
  equipMelee(weapon) {
    const previous = this.equippedMelee;
    this.equippedMelee = weapon;
    this.weaponModels.melee?.parent?.remove(this.weaponModels.melee);
    this.weaponModels.melee = createWeaponModel(weapon.model);
    this.attachWeapons();
    return previous;
  }

  equipRanged(weapon) {
    const previous = this.equippedRanged;
    // Arrows stay with you, not with the bow — but a smaller quiver cannot hold
    // more than it holds, and swapping is not a way to conjure ammunition.
    if (previous) weapon.ammo = Math.min(previous.ammo, weapon.ammoCapacity);
    this.equippedRanged = weapon;
    this.weaponModels.ranged?.parent?.remove(this.weaponModels.ranged);
    this.weaponModels.ranged = createWeaponModel(weapon.model);

    // Arrows live on your back, visibly: the quiver is the ammo counter.
    if (this.quiver) this.rig.quiverSocket.remove(this.quiver);
    this.quiver = createQuiver(weapon.ammoCapacity);
    this.rig.quiverSocket.add(this.quiver);

    this.attachWeapons();
    return previous;
  }

  /**
   * Swap a weapon in, and hand back the one it replaced so the world can put it
   * on the floor at your feet. A pickup is always a swap, never a loss.
   */
  equipWeapon(weapon) {
    return weapon.type === 'melee' ? this.equipMelee(weapon) : this.equipRanged(weapon);
  }

  get invulnerable() {
    return this.dash !== null;
  }

  /**
   * Begin a dash. Returns false if one is already running, so holding the key
   * cannot chain them.
   * @param {{direction: {x:number,z:number}|null, distance: number,
   *          duration: number, damage: number}} options
   */
  startDash({ direction, distance, duration, damage }) {
    if (this.dash || this.dead) return false;

    const dir = direction ?? directionFromYaw(this.facing);
    const length = Math.hypot(dir.x, dir.z) || 1;
    this.dash = {
      x: dir.x / length,
      z: dir.z / length,
      speed: distance / duration,
      remaining: duration,
      damage,
      hit: new Set(),
    };
    this.facing = yawFromDirection(this.dash.x, this.dash.z);
    this.equippedRanged?.cancelDraw();
    this.rig.setGlow(0.15, 0.35, 0.6);
    return true;
  }

  /**
   * Move the dash and damage whatever it passes through. The hit test is swept,
   * the same as an arrow's: at 20 m/s the roll covers more ground per frame
   * than an enemy is wide, so testing end positions alone would pass straight
   * through people.
   */
  updateDash(dt, state) {
    const dash = this.dash;
    const fromX = this.position.x;
    const fromZ = this.position.z;

    const step = Math.min(dash.remaining, dt);
    this.position.x += dash.x * dash.speed * step;
    this.position.z += dash.z * dash.speed * step;
    this.velocity.set(dash.x * dash.speed, 0, dash.z * dash.speed);

    const { arena } = state;
    this.position.x = clamp(this.position.x, arena.minX + this.radius, arena.maxX - this.radius);
    this.position.z = clamp(this.position.z, arena.minZ + this.radius, arena.maxZ - this.radius);

    for (const enemy of state.enemies) {
      if (enemy.dead || dash.hit.has(enemy)) continue;
      const reach = enemy.radius + this.radius;
      const { distSq } = closestPointOnSegmentXZ(
        enemy.position.x,
        enemy.position.z,
        fromX,
        fromZ,
        this.position.x,
        this.position.z
      );
      if (distSq > reach * reach) continue;

      dash.hit.add(enemy);
      enemy.takeDamage(dash.damage, state, { kind: 'melee', fromX, fromZ });
    }

    dash.remaining -= dt;
    if (dash.remaining <= 0) {
      this.dash = null;
      this.rig.clearGlow();
    }
  }

  /** Fire the ability in a slot. Returns whether it went off. */
  useAbility(index, state) {
    return this.abilities[index]?.trigger(state, this) ?? false;
  }

  /** Collect arrows from a bundle. Returns how many fitted in the quiver. */
  addArrows(count) {
    return this.equippedRanged?.addAmmo(count) ?? 0;
  }

  /**
   * Parent each weapon to where it belongs: the held melee weapon in the main
   * hand, the held bow in the OFF hand (the main hand draws the string), and
   * whatever is not in use on the back.
   */
  attachWeapons() {
    for (const slot of ['melee', 'ranged']) {
      const model = this.weaponModels[slot];
      if (!model) continue;
      const held = slot === this.heldSlot;
      const socket = held
        ? slot === 'ranged'
          ? this.rig.offHandSocket
          : this.rig.handSocket
        : this.rig.backSocket;
      if (model.parent !== socket) socket.add(model);
      model.rotation.set(0, 0, 0);
    }
  }

  setHeld(slot) {
    if (this.heldSlot === slot) return;
    this.heldSlot = slot;
    this.attachWeapons();
  }

  // --- Combat -------------------------------------------------------------
  swingMelee(state) {
    if (this.dead || !this.equippedMelee) return false;
    this.setHeld('melee');
    const swung = this.equippedMelee.use(state.time);
    if (swung) state.pushEvent('swing');
    return swung;
  }

  /** Start pulling the string. Returns false if no shot is available. */
  drawRanged(state) {
    if (this.dead || !this.equippedRanged) return false;
    this.setHeld('ranged');
    const drawing = this.equippedRanged.beginDraw(state.time);
    if (drawing) state.pushEvent('bow-draw');
    return drawing;
  }

  /** How far the string is pulled, 0..1 — the HUD and the rig both read this. */
  get drawStrength() {
    return this.equippedRanged?.drawing ? this.equippedRanged.charge : 0;
  }

  /**
   * Loose the arrow.
   * @param {import('../GameState.js').GameState} state
   * @param {number|null} aimPitch first-person look pitch, in radians. When
   *   null the weapon picks the pitch that carries the shot to its own range.
   */
  fireRanged(state, aimPitch = null) {
    if (this.dead || !this.equippedRanged) return false;
    this.setHeld('ranged');
    const dir = directionFromYaw(this.facing);
    if (aimPitch !== null) dir.pitch = aimPitch;
    const origin = {
      x: this.position.x + dir.x * 0.55,
      y: aimPitch !== null ? 1.5 : 1.25,
      z: this.position.z + dir.z * 0.55,
    };
    const charge = this.drawStrength;
    const shot = this.equippedRanged.use(state.time, origin, dir, { team: 'player' });
    if (!shot) return false;
    shot.attacker = this;
    this.projectileSystem.spawn(state, shot);
    state.pushEvent('bow-release', { power: charge });
    return true;
  }

  reload(state) {
    return this.equippedRanged?.beginReload(state.time) ?? false;
  }

  takeDamage(amount, state) {
    if (this.dead || this.invulnerable) return;
    const applied = Math.max(1, Math.round(amount - this.defense));
    this.health = Math.max(0, this.health - applied);
    this.hitTimer = 0;
    this.rig.triggerFlash(1);
    state.pushDamageEvent({ x: this.position.x, y: 1.9, z: this.position.z }, applied, 'player');
    state.pushEvent('player-hurt', { amount: applied });
    // Taking a hit shakes harder than landing one.
    state.requestImpact(applied * 1.6);
    if (this.health === 0) this.die(state);
  }

  die(state = null) {
    this.dead = true;
    this.deathTimer = 0;
    this.equippedRanged?.cancelDraw();
    state?.pushEvent('player-death');
  }

  respawn() {
    /** Set while a dash is in flight; see startDash(). */
    this.dash = null;
    this.dead = false;
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;
    this.position.set(0, 0, 4);
    this.velocity.set(0, 0, 0);
    this.deathTimer = 0;
    this.hitTimer = HIT_REACTION_TIME;
    this.rig.reset();
    if (this.equippedRanged) {
      this.equippedRanged.ammo = this.equippedRanged.ammoCapacity;
      this.equippedRanged.reloading = false;
      this.equippedRanged.cancelDraw();
    }
  }

  // --- Frame update -------------------------------------------------------
  /**
   * @param {number} dt
   * @param {import('../GameState.js').GameState} state
   * @param {import('../systems/InputManager.js').InputManager} input
   */
  update(dt, state, input) {
    if (this.dead) {
      this.deathTimer = (this.deathTimer ?? 0) + dt;
      this.velocity.multiplyScalar(0.1);
      this.updateRig(dt, state, 0);
      return;
    }

    // A dash owns the character for its duration: no steering, no attacks.
    if (this.dash) {
      this.updateDash(dt, state);
      this.resolveCollisions(state);
      this.equippedMelee?.update(dt, { owner: this, state });
      this.updateRig(dt, state, 1);
      return;
    }

    // --- Move -------------------------------------------------------------
    const move = input.moveVector;

    // --- Aim: cursor/right stick when there is one, otherwise face the way
    //     we are running. Never leave facing to camera lag.
    if (input.hasAim) {
      this.facing = dampAngle(this.facing, input.aimYaw, 0.0001, dt);
    } else if (move.x !== 0 || move.z !== 0) {
      this.facing = dampAngle(this.facing, yawFromDirection(move.x, move.z), 0.0005, dt);
    }
    const wantsSprint = input.isDown('sprint') && (move.x !== 0 || move.z !== 0);
    this.sprinting = wantsSprint && this.stamina > 1;

    let speed = BASE_MOVE_SPEED * this.moveSpeedModifier;
    if (this.sprinting) speed *= SPRINT_MULTIPLIER;
    if (this.equippedMelee?.swinging) speed *= ATTACK_MOVE_PENALTY;
    else if (this.equippedRanged?.drawing) speed *= DRAW_MOVE_PENALTY;
    speed *= this.directionalSpeedFactor(move);

    const targetVx = move.x * speed;
    const targetVz = move.z * speed;
    this.velocity.x = damp(this.velocity.x, targetVx, 0.0001, dt);
    this.velocity.z = damp(this.velocity.z, targetVz, 0.0001, dt);

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.resolveCollisions(state);

    // --- Stamina ----------------------------------------------------------
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - SPRINT_STAMINA_COST * dt);
      this.staminaIdleTimer = 0;
    } else {
      this.staminaIdleTimer += dt;
      if (this.staminaIdleTimer >= STAMINA_REGEN_DELAY) {
        this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * dt);
      }
    }

    // --- Weapons ----------------------------------------------------------
    this.equippedMelee?.update(dt, { owner: this, state });
    this.equippedRanged?.update(dt, { owner: this, state });
    for (const ability of this.abilities) ability?.update(dt, state, this);

    if (this.hitTimer < HIT_REACTION_TIME) this.hitTimer += dt;

    const speed01 = clamp(Math.hypot(this.velocity.x, this.velocity.z) / BASE_MOVE_SPEED, 0, 1);
    this.updateRig(dt, state, speed01);
  }

  /**
   * How fast we may travel in the requested direction. Dot product against the
   * facing direction gives +1 straight ahead, 0 sideways, -1 straight back:
   *
   *        forward 1.00
   *             ▲
   *   0.78 ◀────●────▶ 0.78     (strafe)
   *             ▼
   *        backward 0.55
   */
  directionalSpeedFactor(move) {
    if (move.x === 0 && move.z === 0) return 1;
    const forward = directionFromYaw(this.facing);
    const length = Math.hypot(move.x, move.z) || 1;
    const alignment = (move.x * forward.x + move.z * forward.z) / length;
    return alignment >= 0
      ? STRAFE_SPEED + (FORWARD_SPEED - STRAFE_SPEED) * alignment
      : STRAFE_SPEED + (STRAFE_SPEED - BACKWARD_SPEED) * alignment;
  }

  /** Push out of the arena walls and out of any enemy we are overlapping. */
  resolveCollisions(state) {
    const { arena } = state;
    this.position.x = clamp(this.position.x, arena.minX + this.radius, arena.maxX - this.radius);
    this.position.z = clamp(this.position.z, arena.minZ + this.radius, arena.maxZ - this.radius);

    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const dx = this.position.x - enemy.position.x;
      const dz = this.position.z - enemy.position.z;
      const dist = Math.hypot(dx, dz);
      const minDist = this.radius + enemy.radius;
      if (dist > 0 && dist < minDist) {
        const push = (minDist - dist) / dist;
        this.position.x += dx * push;
        this.position.z += dz * push;
      }
    }
  }

  updateRig(dt, state, speed01) {
    let rigState = 'idle';
    let attackProgress = 0;
    let attackKind = 'sword';

    if (this.dead) {
      rigState = 'death';
    } else if (this.equippedMelee?.swinging) {
      rigState = 'attack-melee';
      attackProgress = this.equippedMelee.swingProgress;
    } else if (this.equippedRanged?.drawing) {
      rigState = 'draw-ranged';
      attackKind = 'bow';
    } else if (this.equippedRanged?.firing) {
      rigState = 'attack-ranged';
      attackProgress = this.equippedRanged.fireProgress;
      attackKind = 'bow';
    } else if (speed01 > 0.03) {
      rigState = 'walk';
    }

    // The quiver empties as you shoot — one fewer arrow on your back per shot.
    this.quiver?.setCount(this.equippedRanged?.ammo ?? 0);

    this.rig.root.position.set(this.position.x, this.position.y, this.position.z);
    this.rig.root.rotation.y = this.facing;
    this.rig.update(dt, {
      time: state.time,
      state: rigState,
      moveSpeed01: speed01,
      attackProgress,
      attackKind,
      drawAmount: this.drawStrength,
      hitProgress: this.hitTimer / HIT_REACTION_TIME,
      deathProgress: (this.deathTimer ?? 0) / 0.8,
    });
  }
}
