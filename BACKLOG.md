# Backlog

Things deliberately left undone, with enough detail to pick up cold. Newest
concerns at the top of each section.

---

## Known issues — fix these

### Arms and the bow animation

**Elbows are in.** Each arm is now shoulder → upper arm (0.37 m) → elbow →
forearm (0.33 m) → hand, and the bow poses place both hands by two-bone IK
instead of hand-solved angles. Measured in the acceptance suite: hands land
within 2 cm of their targets, draw elbow bends to 78°, bow elbow stays at 19°.

**The bow moved to the off hand.** It used to be held in the main hand and drawn
with the off hand, so the draw arm crossed the chest to reach the string. The
main hand now draws, and nothing crosses.

**The draw reads correctly now.** The bow was 0.84 m tall with a 0.77 m draw —
a ratio of 0.9, where a real bow is drawn about 0.4 of its height — so the
string came back further than the bow was tall and the draw hand sat outside
the bow's frame, which looked like gripping the limb. The bow is now 1.24 m
with a 0.55 m draw, and the nocking point sits exactly on the hand rather than
being flattened onto the bow's plane. Both are asserted in the suite.

Still wrong or missing:

- **The bow-arm wrist is still locked.** The bow is oriented outright each
  frame (upright, square to the arrow) rather than following the hand, which
  fixes the lean but means the wrist has no articulation of its own — the bow
  cannot roll with the shot or settle after a loose.
- **The draw path is a straight line.** The IK targets lerp between two points
  (hand beside the bow, hand at the anchor), so the hand travels straight
  instead of arcing the way a real draw does.
- **No release recoil.** The loose only animates the draw hand; the bow itself
  should kick forward and settle.
- **Melee is still FK.** The slash sets shoulder and elbow angles directly. It
  reads fine, but a hand target through the cut would let the blade follow a
  proper arc and make weapon length matter to the animation.
- **Sword grip tilt** is a single damped number (`GRIP_CARRY` / `GRIP_SLASH`).
  A real transition would rotate through the wrist rather than the whole prop.
- **Shared rig for every character.** A zombie's shamble and a skeleton's stance
  are the same poses in different colours. They need their own idle and walk —
  ranks now differ in kit, but they all still move identically.

### Smaller

- The dash has no pose of its own — it reuses the walk cycle with a glow. It
  wants a roll, or at least a lean into the direction of travel.

- Hit flash tints the whole body uniformly; a hit from behind looks the same as
  one from the front.
- Enemy health bars have no distance fade, so a far-off skeleton's bar is the
  same size as one in your face.
- `Zombie.js` and `Skeleton.js` both carry their own copy of `separate()`.
  Pull it into `Enemy.js` when a third enemy type needs it.

---

## Arrow economy

The reload is gone: the quiver holds 12 arrows and refills only from bundles
that spawn on the ground. Built so far: bundles spawn on a timer, up to a few on
the field at once, and are collected by walking over them.

Still to do:

- **Recover spent arrows.** Arrows already stick in the ground for 3 seconds
  (`STUCK_LIFETIME` in `ProjectileSystem.js`). Letting you walk over one to get
  it back would reward accuracy and punish spraying, and the state is already
  there.
- **Bundle sizes and rarity.** Everything is a flat +5 right now. Small/large
  bundles, or a rare full refill, would give the spawns some texture.
- **Quiver capacity as an upgrade.** `ammoCapacity` is already per weapon, so
  this drops into the upgrade system (milestone 3) without new plumbing.
- **Pickup feedback.** Currently a sound and the counter moving. Wants a pop, a
  brief arrow-count flash, and the bundle shrinking as it is absorbed.
- **Spawn placement is naive** — uniform random inside the arena, only rejecting
  points too close to the player. Should avoid spawning inside a crowd, and
  should prefer the far side of the room so collecting costs you position.

---

## Inventory and loot

The panel is read-only: it shows the two weapons you hold and the numbers
behind them. With 54 weapons in the world it now wants to be a real inventory —
carrying more than two, comparing side by side, and showing the upgrade level
once milestone 3 exists.

Loot itself still wants: a drop cap so the floor does not fill up over a long
run, despawn timers on commons, and a filter so a Rusted anything stops
dropping once you are deep enough in.

## Milestones not started

From the original build spec, in order:

| Milestone | Plug point that already exists |
| --- | --- |
| 2. Full weapon roster | **Done, and then some**: 54 weapons from 6 archetypes x 9 families, dropped by zombies. Wants: dual-wielding for daggers (the off hand is free when melee is held), and per-archetype attack animations — a scythe still swings like a sword |
| 3. Armour + upgrades | `Player.equippedArmor` with `defense` / `staminaRegen` / `moveSpeedModifier` reading through it; `Weapon.level` and the `damage`/`speed` getters are where the curve goes |
| 4. Three abilities | **Slot 1 is Mend (heal, `Q`), slot 2 is Dash Strike (`E`)**, both on `Ability` in `src/abilities/`. Slot 3 is empty — volley from the spec is the natural fit, and `RangedWeapon.use()` already takes a charge and a direction, so a spread is a loop over it |
| 5. HUD polish | Cooldown sweeps, hit stop and screen shake are **in**. Still wanted: damage numbers that scale with the hit, a kill flourish, and a directional indicator for damage taken off-screen |
| 6. More enemies + a real dungeon room | `Zombie.js` and `Skeleton.js` are the templates, and `ZOMBIE_RANKS` is the pattern for kitted variants. The arena in `main.js` is still one flat box |
