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

    /**
     * Damage events produced this frame. The HUD drains this every frame to
     * spawn floating numbers; nothing else should hold on to the entries.
     * @type {{position: {x:number,y:number,z:number}, amount:number, kind:string}[]}
     */
    this.damageEvents = [];

    /** Arena bounds used for the cheap AABB wall collision. */
    this.arena = { minX: -19, maxX: 19, minZ: -19, maxZ: 19 };

    this.paused = false;
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
