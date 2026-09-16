# Backlog

Things deliberately left undone, with enough detail to pick up cold. Newest
concerns at the top of each section.

---

## Known issues — fix these

### Arms and the bow animation *(raised after play testing)*

The arms are wrong and the bow animation is approximate. Specifics:

- **No elbows.** Each arm is one rigid cylinder from shoulder to hand, so every
  pose is "point the whole arm at a thing". A drawn bow needs a bent draw arm
  with the elbow up and back; right now the forearm and upper arm are the same
  straight line, which is why the draw reads as a stiff reach across the chest.
  Fix: split `shoulderL/R` into `upperArm -> elbow -> forearm` in
  `HumanoidRig.js` and drive them with two-bone IK from a hand target. The hand
  targets are already computed in body space (see the comment above
  `targetArmLX` in the `draw-ranged` branch) so the IK has something to aim at.
- **Bow-arm wrist is locked.** The bow hangs off `handSocket` with a single
  grip tilt, so it cannot roll with the shot. A wrist node under the hand
  socket would let the bow cant independently of the arm.
- **Draw pose is solved for exactly two points** (bow grip at rest, anchor at
  full draw) and linearly interpolated between them. The hand therefore travels
  in a straight line rather than an arc, and the string's V is symmetrical when
  a real draw is not.
- **No release recoil on the bow arm.** The loose only animates the draw hand;
  the bow itself should kick forward and settle.
- **Sword grip tilt** is a single damped number (`GRIP_CARRY` / `GRIP_SLASH`).
  It works, but a real transition would rotate through the wrist rather than
  snapping the whole prop.
- **Shared rig for every character.** A zombie's shamble and a skeleton's stance
  are the same poses in different colours. They need their own idle and walk.

### Smaller

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

- **Enemies drop arrows.** A skeleton should drop part of its quiver on death —
  it is the natural source, and it makes archers worth prioritising.
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

## Milestones not started

From the original build spec, in order:

| Milestone | Plug point that already exists |
| --- | --- |
| 2. Full weapon roster (scythe, daggers, shortbow, crossbow) | `weapons.config.js` — add stat entries; the classes already carry every field, including `chargeTime: 0` for a crossbow's instant trigger |
| 3. Armour + upgrades | `Player.equippedArmor` with `defense` / `staminaRegen` / `moveSpeedModifier` reading through it; `Weapon.level` and the `damage`/`speed` getters are where the curve goes |
| 4. Three abilities | `Player.abilities[3]` — three independent empty slots |
| 5. HUD polish | Cooldown sweeps, hit-stop, screen shake. `CameraController` owns the camera transform |
| 6. More enemies + a real dungeon room | `Zombie.js` and `Skeleton.js` are the templates. The arena in `main.js` is still one flat box |
