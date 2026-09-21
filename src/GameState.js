/**
 * GameState — the single source of truth for a frame.
 *
 * Everything that changes over time lives here. Systems mutate it during
 * update(); renderers and the HUD only ever read from it. Keeping one object
 * means new systems (abilities, upgrades, dungeon rooms) plug in without
 * rewiring how data flows.
 */
export class GameState {
  constructor() {
    /** @type {number} seconds since the game started */
    this.time = 0;
    /** @type {number} seconds elapsed this frame (clamped) */
    this.delta = 0;
    /** @type {number} frames rendered */
    this.frame = 0;

    /** @type {import('./entities/Player.js').Player|null} */
    this.player = null;
    /** @type {import('./entities/Enemy.js').Enemy[]} */
    this.enemies = [];
    /** @type {object[]} live projectiles (see ProjectileSystem) */
    this.projectiles = [];
    /** @type {import('./entities/ArrowBundle.js').ArrowBundle[]} */
    this.pickups = [];
    /** @type {import('./entities/WeaponDrop.js').WeaponDrop[]} weapons on the floor */
    this.drops = [];
    /** The drop you are standing on, if any — the HUD prompts from this. */
    this.nearestDrop = null;

    /**
     * Damage events produced this frame. The HUD drains this every frame to
     * spawn floating numbers; nothing else should hold on to the entries.
     * @type {{position: {x:number,y:number,z:number}, amount:number, kind:string}[]}
     */
    this.damageEvents = [];

    /**
     * Gameplay events for this frame: the audio system drains them, exactly
     * like the HUD drains damageEvents. Entities stay ignorant of sound.
     * @type {{type: string, [key: string]: any}[]}
     */
    this.events = [];

    /** Arena bounds used for the cheap AABB wall collision. */
    this.arena = { minX: -19, maxX: 19, minZ: -19, maxZ: 19 };

    this.paused = false;

    /**
     * Seconds of hit stop still owed. While this is running the simulation
     * holds still but the camera and sound do not — the freeze is what gives a
     * heavy hit its weight, and freezing the feedback too would just feel like
     * a stutter.
     */
    this.hitStop = 0;
    /** Screen shake energy, 0..1, decayed by the camera each frame. */
    this.shake = 0;
    /** Set false for a quiet sandbox: no new zombie waves spawn. */
    this.wavesEnabled = true;
  }

  /**
   * Ask for hit stop and a shake, scaled by how hard the hit landed. Light hits
   * get nothing: if every scratch froze the frame, none of them would read.
   */
  requestImpact(damage) {
    const weight = Math.min(1, Math.max(0, (damage - 8) / 20));
    if (weight <= 0) return;
    this.hitStop = Math.max(this.hitStop, weight * 0.075);
    this.shake = Math.min(1, this.shake + weight * 0.55);
  }

  /** Queue a gameplay event for this frame (sound, and later VFX). */
  pushEvent(type, data = {}) {
    this.events.push({ type, ...data });
  }

  /** Queue a floating damage number at a world position. */
  pushDamageEvent(position, amount, kind = 'melee') {
    this.damageEvents.push({
      position: { x: position.x, y: position.y, z: position.z },
      amount,
      kind,
    });
  }
}
