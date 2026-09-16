# Action RPG — Skeleton

A Minecraft Dungeons-flavoured action RPG, built skeleton-first. A humanoid blockout
character moves, aims, swings a sword and fires a ballistic bow, in **top-down or first
person**, against a test dummy and waves of **zombies that fight back**.

Still deliberately unbuilt: upgrades, abilities, armour stats, and the rest of the weapon
roster.

Three.js + vanilla JS modules. No build step, no bundler, no network at runtime
(Three.js is vendored in `vendor/`).

## Run it

```bash
npm start            # serves the folder on http://localhost:8080
```

Then open <http://localhost:8080>. Any static server works; `npm start` is just a
15-line zero-dependency one.

```bash
npm install          # only needed for the test (installs Playwright)
npm run verify       # headless acceptance test, writes screenshot.png
```

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| `Shift` | Sprint (drains stamina) |
| Mouse | Aim — the hero turns to face the cursor |
| Left click | Swing the melee weapon |
| Right click | Fire the ranged weapon |
| `R` | Reload |
| `1` / `2` | Choose which weapon is held (the other goes on the back) |
| `V` | Toggle first person / top-down |
| `H` / `Q` | Debug: hurt yourself / reset the scene |

In first person the mouse is captured (click once to lock it, `Esc` to release), `W` walks
where you look, and the bow fires along your look pitch — so you aim *over* distance
rather than straight at it.

Gamepad: left stick moves, right stick aims, RT swings, RB fires, B reloads.

## What a frame does

One `GameState` object is the whole world. Systems mutate it in a fixed order; the
renderer and HUD only ever read from it.

```mermaid
flowchart LR
    RAF([requestAnimationFrame]) --> IN[InputManager.update<br/>keys + mouse ray → moveVector, aimYaw]
    IN --> ACT[handleActions<br/>click → swing / fire / reload]
    ACT --> PL[Player.update<br/>aim, move, collide, stamina]
    PL --> WP[Weapon.update<br/>swing arc hits / reload timer]
    WP --> EN[Enemy.update<br/>hit reaction, death, respawn]
    EN --> PR[ProjectileSystem.update<br/>swept hit test]
    PR --> CAM[CameraController.update]
    CAM --> HUD[HUD.update<br/>bars, ammo, damage numbers]
    HUD --> R[[renderer.render]]
    R --> RAF
```

Delta time is clamped to 50 ms, so a stalled tab resumes in slow motion instead of
teleporting everything through walls.

## Who owns what

```mermaid
flowchart TD
    M[main.js<br/>scene, arena, loop] --> GS[(GameState<br/>time, player, enemies,<br/>projectiles, damageEvents)]
    M --> P[Player]
    M --> E[Enemy — test dummy]
    M --> PS[ProjectileSystem]
    M --> IM[InputManager]
    M --> CC[CameraController]
    M --> H[HUD]

    P --> RIG[HumanoidRig<br/>primitive blockout body]
    P --> MW[MeleeWeapon]
    P --> RW[RangedWeapon]
    E --> RIG2[HumanoidRig]
    MW -.->|extends| W[Weapon base class]
    RW -.->|extends| W
    RW -->|spawns| PS
    RIG --> HS[handSocket] --> WM[weapon model]
    RIG --> BS[backSocket] --> WM2[stowed weapon model]
```

## The rig

Everything hangs off one root node the movement code owns. Each joint is a `Group`
positioned *at* the joint, with its mesh translated down — so rotating the group swings
the limb from the shoulder/hip, not around its own middle.

```
                    ○  head (sphere)
                  ╭───╮
   shoulderL ●────┤   ├────● shoulderR ──► handSocket  (weapon in hand)
             │    │   │    │
          arm│    │   │    │arm            backSocket  (stowed weapon)
             │    ╰─┬─╯    │
                 ╱     ╲
             hipL       hipR
              │           │
            leg           leg
              ▼           ▼
        ──────────────────────  y = 0, root position
```

Animation states are procedural poses, layered in this order:

```
locomotion (idle / walk)  →  attack overrides the arms  →  hit recoil (additive)  →  death overrides all
```

Swapping in a rigged GLTF model later means rewriting `HumanoidRig.js` and nothing else:
gameplay code never touches a limb.

**Socket orientation rule:** the hand socket sits at the *end* of the arm, and the arm's
local −Y runs down the limb away from the shoulder. A weapon must therefore be modelled
extending along −Y. Building it along +Y sends the blade back up through the character's
own forearm — which is exactly what the first version did.

The sword swing is a **horizontal slash**, matching the shape of the damage cone: the arm
lifts to shoulder height (`rotation.x`), then sweeps through ±50° (`rotation.y`) while the
body twists with it. The shoulder joints use Euler order `YXZ` so the sweep happens about
the body's vertical axis no matter how far the arm is already raised — under the default
`XYZ` order a "horizontal" slash tips over as the arm lifts.

## Combat shapes

Melee is an arc test, run only during the ACTIVE window of the swing, with each target
hit at most once per swing:

```
            ╲   arc = 100°   ╱
             ╲             ╱          hit if:
              ╲           ╱             distance ≤ range + targetRadius
               ╲    ▲    ╱              AND |angle from facing| ≤ arc / 2
                ╲  ／╲  ╱
                 ╲╱   ╲╱
                  ●  hero (facing ▲)
    |--- windup ---|--- active ---|--- recovery ---|
    0             0.35          0.60              1    (swing progress)
```

Arrows are **ballistic**. The launch angle is solved from the projectile-motion equation
so the shot carries to the weapon's own `range`:

```
    sin(2 · pitch) = gravity · range / speed²
```

...then capped so the arc never rises more than 0.5 m above the muzzle. Without that cap
the physically-correct solution lobs the arrow ~0.9 m up and it sails clean over a 2 m
target standing at half range — correct, and horrible to play. With it, the whole flight
stays inside a human silhouette while the drop is still clearly visible:

```
   y (m)
   2.0 ┤
   1.7 ┤      ●━━━●━━━●                      launch pitch 6.3°
   1.4 ┤   ●            ●━━━●
   1.1 ┤ ●                     ●             ← 1.0 m at 20 m (the bow's range)
   0.8 ┤●                          ●
   0.5 ┤                              ●
   0.2 ┤                                 ●▼  sticks in the ground at ~26 m
       └┬────┬────┬────┬────┬────┬────┬───
        0    5    10   15   20   25  metres
```

Collision is a **swept** test, because a 30 m/s arrow moves further in one frame than a
dummy is wide and would otherwise tunnel straight through — plus a height check at the
point of closest approach, so an arrow that has already dropped to ankle height sails
under everything and lands:

```
    prev ●───────────────────● next        ○ target (radius r, height 2 m)
          ╲_____ closest distance to the segment _____╱   hit if ≤ r + arrowRadius
                                                          AND 0.15 m ≤ y ≤ 2 m
```

## Zombies

Waves spawn on a ring around you and close in. Each zombie runs one small state machine
driven only by distance:

```mermaid
flowchart LR
    IDLE -->|player within 16 m| CHASE
    CHASE -->|player lost| IDLE
    CHASE -->|within 1.9 m and off cooldown| WINDUP
    WINDUP -->|0.5 s telegraph| STRIKE
    STRIKE -->|0.12 s damage window| RECOVER
    RECOVER -->|0.55 s, then 1.1 s cooldown| CHASE
```

The important part is that **WINDUP is long and visible** — both arms rear up overhead —
while **STRIKE is a single instant** that only lands if you are still inside the cone at
that moment. Backing off during the telegraph genuinely saves you, which is what makes
the fight readable instead of a coin flip. Zombies also shove each other apart, so a pack
surrounds you instead of stacking into one spot.

Getting hit staggers a character: the torso snaps back and the arms fly out on a sine
curve, so the reaction reads even mid-attack.

## Conventions worth knowing

- **Yaw**: `rotation.y = yaw` points an object's local −Z along `(-sin yaw, -cos yaw)`.
  Use `yawFromDirection(dx, dz)` / `directionFromYaw(yaw)`; never hand-roll the `atan2`.
- **Weapon `speed`** is uses-per-second for *both* types (attacks/sec, shots/sec).
  Ranged keeps arrow velocity separately in `projectileSpeed`, so an upgrade can make you
  shoot faster without making arrows fly faster.
- **Aim** comes from a ray onto the ground plane. A cursor sitting on top of the hero
  (within 0.9 m) counts as *no* aim, and the hero faces their movement direction instead.
- The camera is **locked**: fixed offset `(0, 11.5, 9)`, ~52° down, no rotation, no zoom.
  It eases toward the hero and leans up to 1.5 m toward the cursor.

## Layout

```
index.html                  canvas + HUD markup + import map
vendor/three.module.js      Three.js r169, vendored (runs offline)
src/
  main.js                   scene, arena, lights, the frame loop
  GameState.js              the single per-frame state object
  mathUtils.js              yaw/damping/segment helpers
  entities/
    Player.js               health, stamina, equipment, movement, attacks
    Enemy.js                base enemy / the test dummy: health, hit reaction, death
    Zombie.js               chase + telegraphed melee attack state machine
    HumanoidRig.js          primitive humanoid + hand/back sockets + poses
    weaponModels.js         blockout sword and bow props
  combat/
    Weapon.js               base class: name, type, damage, speed, range, cooldown
    MeleeWeapon.js          swing state machine + arc hit detection
    RangedWeapon.js         ammo, reload, projectile spawning
    ProjectileSystem.js     ballistic arrows, gravity, swept collision, ground stick
    weapons.config.js       stat table (Phase 1: sword + bow only)
  systems/
    InputManager.js         keyboard/mouse/gamepad → moveVector + aimYaw
    CameraController.js     locked top-down follow camera + first person
  ui/
    HUD.js                  bars, ammo, weapon chips, damage numbers, crosshair
tools/
  serve.mjs                 zero-dependency static server
  verify.mjs                headless Phase 1 acceptance test
```

## Acceptance — passing

`npm run verify` drives the real game in headless Chromium with real key presses and
mouse clicks, and waits on game state rather than wall-clock sleeps (headless software
rendering runs at ~10 fps, so fixed sleeps mean nothing):

```
PASS  game boots and renders frames
PASS  WASD moves the character
PASS  mouse aim turns the hero toward the cursor
PASS  left click starts a swing
PASS  melee swing damages the dummy
PASS  damage numbers appear
PASS  right click fires and spends ammo
PASS  projectile travels
PASS  projectile hits the dummy
PASS  player takes damage and plays a hit reaction
PASS  reload starts when the magazine is empty
PASS  reload refills the magazine
PASS  arrow arcs: rises, then falls
PASS  arrow arc stays inside a human silhouette
PASS  arrow sticks in the ground where it lands
PASS  zombie chases the player down
PASS  zombie telegraphs a windup, then strikes
PASS  zombie melee damages the player
PASS  zombie dies and falls over
PASS  V switches to first person
PASS  mouse-look drives the hero facing and the camera
PASS  first-person W walks where you look
PASS  no console or page errors

23/23 checks passed
```

## Deliberately not built yet

Each of these has a plug point already in place, and nothing else has to change shape:

| Milestone | Plug point that already exists |
| --- | --- |
| 2. Full weapon roster (scythe, daggers, shortbow, crossbow) | `weapons.config.js` — add stat entries; the classes already carry every field |
| 3. Armour + upgrades | `Player.equippedArmor` and the `defense` / `staminaRegen` / `moveSpeedModifier` getters read through it; `Weapon.level` + the `damage`/`speed` getters are where the curve goes |
| 4. Three abilities | `Player.abilities[3]` — three independent empty slots |
| 5. HUD polish (cooldown sweeps, hit-stop, screen shake) | `HUD.js`, and `CameraController` owns the camera transform |
| 6. More enemy types + a real dungeon room | `Zombie.js` is the template: subclass `Enemy`, add a state machine. The arena in `main.js` is still one flat box |
