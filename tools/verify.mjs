/**
 * Phase 1 acceptance smoke test.
 *
 * Drives the real game in a headless browser and checks the acceptance
 * criteria from the build spec:
 *   1. you can move the character around the test scene
 *   2. a melee swing damages the dummy and shows a damage number
 *   3. a ranged shot spawns a projectile that travels and hits
 *
 * Waits on game state rather than wall-clock sleeps: headless software
 * rendering runs at ~10 fps, so fixed timeouts are meaningless here.
 *
 * Requires Playwright (`npm i -D playwright`, or a global install).
 * Run with: npm run verify
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = Number(process.env.PORT ?? 8123);
const PAGE_URL = `http://localhost:${PORT}/index.html`;
const TIMEOUT = 20000;

const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

const server = spawn(process.execPath, ['tools/serve.mjs'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 600));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

/** Wait for a predicate evaluated in the page; resolves false on timeout. */
const waitFor = (fn, arg) =>
  page.waitForFunction(fn, arg, { timeout: TIMEOUT }).then(() => true, () => false);

try {
  await page.goto(PAGE_URL, { waitUntil: 'load' });
  check('game boots and renders frames', await waitFor(() => window.__game?.state?.frame > 5));

  // Quiet sandbox: zombie waves would otherwise kill the test hero mid-check.
  const quiet = async () => page.evaluate(() => {
    window.__game.state.wavesEnabled = false;
    window.__game.clearZombies();
    window.__game.player.health = window.__game.player.maxHealth;
    window.__game.player.dead = false;
  });
  await quiet();

  // --- 1. movement ----------------------------------------------------------
  const startZ = await page.evaluate(() => window.__game.player.position.z);
  await page.keyboard.down('w');
  const moved = await waitFor((z0) => window.__game.player.position.z < z0 - 2, startZ);
  await page.keyboard.up('w');
  const endZ = await page.evaluate(() => window.__game.player.position.z);
  check('WASD moves the character', moved, `z ${startZ.toFixed(2)} -> ${endZ.toFixed(2)}`);

  // --- 2. melee (real mouse aim + real left click) --------------------------
  // Park the hero in front of the dummy, point the actual cursor at the dummy,
  // wait for the character to turn, then click. This exercises the whole input
  // path: pointer ray -> aim yaw -> facing -> swing arc -> damage.
  const aimAt = async (worldOf) => {
    const ndc = await page.evaluate(worldOf);
    const box = page.viewportSize();
    await page.mouse.move((ndc.x * 0.5 + 0.5) * box.width, (-ndc.y * 0.5 + 0.5) * box.height);
  };
  const dummyNdc = () => {
    const { state, camera } = window.__game;
    const v = state.enemies[0].rig.root.position.clone();
    v.y = 1;
    v.project(camera);
    return { x: v.x, y: v.y };
  };

  const meleeHpBefore = await page.evaluate(() => {
    const { player, state } = window.__game;
    const dummy = state.enemies[0];
    player.position.set(dummy.position.x, 0, dummy.position.z + 1.6);
    return dummy.health;
  });
  await aimAt(dummyNdc);
  const turned = await waitFor(() => {
    const g = window.__game;
    const d = g.state.enemies[0].position;
    const want = Math.atan2(-(d.x - g.player.position.x), -(d.z - g.player.position.z));
    let delta = (want - g.player.facing) % (Math.PI * 2);
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    return Math.abs(delta) < 0.2;
  });
  check('mouse aim turns the hero toward the cursor', turned);

  await page.mouse.down({ button: 'left' });
  await page.mouse.up({ button: 'left' });
  check('left click starts a swing',
    await waitFor(() => window.__game.player.equippedMelee.swingProgress > 0 ||
      window.__game.state.enemies[0].health < 200));
  const meleeHit = await waitFor((hp) => window.__game.state.enemies[0].health < hp, meleeHpBefore);
  const meleeHp = await page.evaluate(() => window.__game.state.enemies[0].health);
  check('melee swing damages the dummy', meleeHit, `${meleeHpBefore} -> ${meleeHp}`);
  check('damage numbers appear', await waitFor(() => document.querySelectorAll('.floater').length > 0));

  // --- 3. ranged (real right click) -----------------------------------------
  const shot = await page.evaluate(() => {
    const { player, state } = window.__game;
    const dummy = state.enemies[0];
    player.position.set(dummy.position.x, 0, dummy.position.z + 10);
    return { hp: dummy.health, ammoBefore: player.equippedRanged.ammo };
  });
  await aimAt(dummyNdc);
  await waitFor(() => {
    const g = window.__game;
    const d = g.state.enemies[0].position;
    const want = Math.atan2(-(d.x - g.player.position.x), -(d.z - g.player.position.z));
    let delta = (want - g.player.facing) % (Math.PI * 2);
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    return Math.abs(delta) < 0.15;
  });
  await page.mouse.down({ button: 'right' });
  await page.mouse.up({ button: 'right' });

  const spawned = await waitFor(() => window.__game.state.projectiles.length > 0 ||
    window.__game.state.enemies[0].health < 200);
  const fired = await page.evaluate(() => ({
    ammo: window.__game.player.equippedRanged.ammo,
    z: window.__game.state.projectiles[0]?.z ?? null,
  }));
  check('right click fires and spends ammo', spawned && fired.ammo === shot.ammoBefore - 1,
    `ammo ${shot.ammoBefore} -> ${fired.ammo}`);
  check('projectile travels',
    await waitFor((z0) => {
      const p = window.__game.state.projectiles[0];
      return p ? p.z < z0 - 1 : window.__game.state.enemies[0].health < 200;
    }, fired.z ?? 0));
  const hit = await waitFor((hp) => window.__game.state.enemies[0].health < hp, shot.hp);
  const rangedHp = await page.evaluate(() => window.__game.state.enemies[0].health);
  check('projectile hits the dummy', hit, `${shot.hp} -> ${rangedHp}`);

  // --- 4. player damage + hit reaction --------------------------------------
  const health = await page.evaluate(() => {
    const g = window.__game;
    g.player.takeDamage(15, g.state);
    return { health: g.player.health, reacting: g.player.hitTimer < 0.3 };
  });
  check('player takes damage and plays a hit reaction',
    health.health === 85 && health.reacting, `health ${health.health}`);

  // --- 5. quiver, not a magazine --------------------------------------------
  const quiver = await page.evaluate(() => {
    const g = window.__game;
    const bow = g.player.equippedRanged;
    bow.ammo = 0;
    const reloadStarted = g.player.reload(g.state);
    return {
      reloadable: bow.reloadable,
      reloadStarted,
      reloading: bow.reloading,
      capacity: bow.ammoCapacity,
    };
  });
  check('the bow has no reload', quiver.reloadable === false && quiver.reloadStarted === false
    && quiver.reloading === false, `quiver holds ${quiver.capacity}`);

  const visible = await page.evaluate(async () => {
    const g = window.__game;
    const bow = g.player.equippedRanged;
    const countVisible = () =>
      g.player.quiver.children.filter((c) => c.type === 'Group' && c.visible).length;
    bow.ammo = 12;
    await new Promise((r) => requestAnimationFrame(r));
    const full = countVisible();
    bow.ammo = 4;
    await new Promise((r) => requestAnimationFrame(r));
    const low = countVisible();
    return { full, low, capacity: bow.ammoCapacity };
  });
  check('arrows on the back match the arrows you have',
    visible.full === 12 && visible.low === 4,
    `${visible.full} shown at full, ${visible.low} shown at 4`);

  const spent = await page.evaluate(async () => {
    const g = window.__game;
    const bow = g.player.equippedRanged;
    bow.ammo = 1;
    bow.nextReadyAt = 0;
    g.player.position.set(0, 0, 12);
    g.player.facing = 0;
    bow.drawing = true;
    bow.charge = 1;
    const fired = g.player.fireRanged(g.state);
    await new Promise((r) => requestAnimationFrame(r));
    bow.nextReadyAt = 0;
    const secondShot = g.player.fireRanged(g.state);
    return { fired, ammo: bow.ammo, secondShot };
  });
  check('an empty quiver cannot shoot', spent.fired && spent.ammo === 0 && !spent.secondShot);

  const bundle = await page.evaluate(async () => {
    const g = window.__game;
    g.player.equippedRanged.ammo = 2;
    for (const b of g.state.pickups) b.dispose();
    g.state.pickups.length = 0;
    g.spawnArrowBundle();
    const b = g.state.pickups[0];
    const amount = b.amount;
    // Walk the hero onto it.
    g.player.position.set(b.position.x, 0, b.position.z);
    for (let i = 0; i < 20 && g.state.pickups.length > 0; i++) {
      await new Promise((r) => requestAnimationFrame(r));
    }
    return { amount, ammo: g.player.equippedRanged.ammo, remaining: g.state.pickups.length };
  });
  check('walking over a bundle refills the quiver',
    bundle.ammo === 2 + bundle.amount && bundle.remaining === 0,
    `2 -> ${bundle.ammo} arrows`);

  const overfill = await page.evaluate(async () => {
    const g = window.__game;
    const bow = g.player.equippedRanged;
    bow.ammo = bow.ammoCapacity;
    for (const b of g.state.pickups) b.dispose();
    g.state.pickups.length = 0;
    g.spawnArrowBundle();
    const b = g.state.pickups[0];
    g.player.position.set(b.position.x, 0, b.position.z);
    for (let i = 0; i < 12; i++) await new Promise((r) => requestAnimationFrame(r));
    // The spawner keeps topping the field up, so check THIS bundle survived
    // rather than counting them.
    return {
      ammo: bow.ammo,
      capacity: bow.ammoCapacity,
      stillThere: g.state.pickups.includes(b),
    };
  });
  check('a full quiver leaves the bundle on the ground',
    overfill.ammo === overfill.capacity && overfill.stillThere,
    `${overfill.ammo}/${overfill.capacity}, bundle ${overfill.stillThere ? 'still there' : 'eaten'}`);

  await page.evaluate(() => {
    const g = window.__game;
    for (const b of g.state.pickups) b.dispose();
    g.state.pickups.length = 0;
    g.player.equippedRanged.ammo = g.player.equippedRanged.ammoCapacity;
  });

  // --- 6. ballistic arrows ---------------------------------------------------
  const flight = await page.evaluate(async () => {
    const { player, state, projectiles } = window.__game;
    projectiles.clear(state);
    player.position.set(8, 0, 14); // clear lane: the dummy is at x=0
    player.facing = 0;
    player.equippedRanged.nextReadyAt = 0;
    player.equippedRanged.ammo = 5;
    player.fireRanged(state);

    const samples = [];
    for (let i = 0; i < 240; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const p = state.projectiles[0];
      if (!p) break;
      samples.push({ y: p.y, vy: p.vy, stuck: p.stuck, z: p.z });
      if (p.stuck) break;
    }
    return {
      launchY: samples[0]?.y ?? 0,
      peakY: Math.max(...samples.map((s) => s.y)),
      finalY: samples.at(-1)?.y ?? null,
      roseThenFell: samples.some((s) => s.vy > 0) && samples.some((s) => s.vy < 0),
      stuck: samples.at(-1)?.stuck ?? false,
      travelled: samples.length ? 14 - samples.at(-1).z : 0,
      hitSomething: state.enemies.some((e) => e.health < e.maxHealth && e.position.x > 4),
      pitchDeg: (player.equippedRanged.launchPitch * 180) / Math.PI,
    };
  });
  check('arrow arcs: rises, then falls', flight.roseThenFell,
    `peak ${flight.peakY.toFixed(2)} m, launch pitch ${flight.pitchDeg.toFixed(1)} deg`);
  check('arrow arc stays inside a human silhouette', flight.peakY - flight.launchY <= 0.55,
    `+${(flight.peakY - flight.launchY).toFixed(2)} m above the muzzle`);
  check('arrow sticks in the ground where it lands', flight.stuck,
    `after ${flight.travelled.toFixed(1)} m`);

  // --- 7. zombies ------------------------------------------------------------
  // Headless software rendering runs at ~10 fps, so these wait on game state
  // instead of counting frames.
  await page.evaluate(() => {
    const g = window.__game;
    g.clearZombies();
    g.player.position.set(0, 0, 0);
    g.player.health = g.player.maxHealth;
    g.player.facing = 0;
    g.spawnWave();
    const z = g.state.enemies.find((e) => e.isZombie);
    z.position.set(0, 0, -5);
    z.__seen = [];
    const watch = () => {
      if (!z.__seen.includes(z.state)) z.__seen.push(z.state);
      if (!z.dead) requestAnimationFrame(watch);
    };
    watch();
  });

  check('zombie chases the player down', await waitFor(() => {
    const z = window.__game.state.enemies.find((e) => e.isZombie);
    return z && Math.hypot(z.position.x, z.position.z) < 2.2;
  }), 'from 5 m away');

  const struck = await waitFor(() => window.__game.player.health < window.__game.player.maxHealth);
  const zState = await page.evaluate(() => {
    const z = window.__game.state.enemies.find((e) => e.isZombie);
    return { seen: z.__seen, health: window.__game.player.health, windup: z.windupTime };
  });
  check('zombie telegraphs a windup, then strikes',
    zState.seen.includes('windup') && zState.seen.includes('strike'),
    `${zState.seen.join(' -> ')}; windup ${zState.windup}s`);
  check('zombie melee damages the player', struck, `player health ${zState.health}`);

  const swung = await page.evaluate(() => {
    const g = window.__game;
    const z = g.state.enemies.find((e) => e.isZombie && !e.dead);
    z.health = 8;                    // one swing from death
    z.position.set(0, 0, -1.4);
    g.player.position.set(0, 0, 0);
    g.player.facing = 0;
    g.player.equippedMelee.nextReadyAt = 0;
    return g.player.swingMelee(g.state);
  });
  check('zombie dies and falls over', swung && await waitFor(() => {
    const z = window.__game.state.enemies.find((e) => e.isZombie);
    return z && z.dead && z.rig.root.rotation.x > 0.8;
  }));

  // --- 8. first-person mode --------------------------------------------------
  await quiet();
  const fp = await page.evaluate(async () => {
    const g = window.__game;
    g.player.position.set(0, 0, 0);
    g.setView('first-person');
    g.input.lookYaw = Math.PI / 2;   // face world -X
    g.input.lookPitch = -0.2;
    const cam = g.camera;
    return {
      mode: g.cameraController.mode,
      headHidden: g.player.rig.head.visible === false,
      eyeY: cam.position.y,
      camYaw: cam.rotation.y,
      playerFacing: g.player.facing,
      order: cam.rotation.order,
    };
  });
  // The camera only moves on the next frame, so assert the eye height after one.
  const eyeSettled = await waitFor(() => Math.abs(window.__game.camera.position.y - 1.64) < 0.01);
  const eyeY = await page.evaluate(() => window.__game.camera.position.y);
  check('V switches to first person', fp.mode === 'first-person' && fp.headHidden && eyeSettled,
    `eye at y=${eyeY.toFixed(2)}, head hidden`);
  const fpTurned = await waitFor(() => Math.abs(window.__game.player.facing - Math.PI / 2) < 0.05);
  const after = await page.evaluate(() => ({
    facing: window.__game.player.facing,
    camYaw: window.__game.camera.rotation.y,
    camPitch: window.__game.camera.rotation.x,
  }));
  check('mouse-look drives the hero facing and the camera',
    fpTurned && fp.order === 'YXZ' && Math.abs(after.camPitch + 0.2) < 0.01,
    `facing ${after.facing.toFixed(2)} rad, camera pitch ${after.camPitch.toFixed(2)}`);

  const fpMove = await page.evaluate(async () => {
    const g = window.__game;
    // In first person W must go where the camera looks, not world -Z.
    g.player.position.set(0, 0, 0);
    g.input.moveBasisYaw = g.player.facing;
    g.input.down.add('up');
    for (let i = 0; i < 25; i++) await new Promise((r) => requestAnimationFrame(r));
    g.input.down.delete('up');
    const p = { x: g.player.position.x, z: g.player.position.z };
    g.setView('top-down');
    return p;
  });
  check('first-person W walks where you look', fpMove.x < -0.5 && Math.abs(fpMove.z) < 1.2,
    `moved to x=${fpMove.x.toFixed(2)}, z=${fpMove.z.toFixed(2)}`);

  // --- 9. charged bow --------------------------------------------------------
  await quiet();
  const charging = await page.evaluate(async () => {
    const g = window.__game;
    const bow = g.player.equippedRanged;
    bow.nextReadyAt = 0;
    bow.ammo = bow.ammoCapacity;
    const started = g.player.drawRanged(g.state);
    await new Promise((r) => requestAnimationFrame(r));
    const early = g.player.drawStrength;
    return { started, early, chargeTime: bow.chargeTime };
  });
  check('holding the bow starts a draw', charging.started && charging.chargeTime > 0,
    `full draw in ${charging.chargeTime}s`);
  check('draw builds while held',
    await waitFor(() => window.__game.player.drawStrength >= 0.99), 'reached 100%');

  const power = await page.evaluate(() => {
    const bow = window.__game.player.equippedRanged;
    return {
      tapDamage: bow.chargedDamage(0),
      fullDamage: bow.chargedDamage(1),
      tapSpeed: bow.chargedVelocity(0),
      fullSpeed: bow.chargedVelocity(1),
    };
  });
  check('a full draw hits harder than a snap shot', power.fullDamage > power.tapDamage * 2,
    `${power.tapDamage.toFixed(1)} -> ${power.fullDamage.toFixed(1)} damage`);
  check('a full draw flies faster and flatter', power.fullSpeed > power.tapSpeed,
    `${power.tapSpeed.toFixed(0)} -> ${power.fullSpeed.toFixed(0)} m/s`);

  const shots = await page.evaluate(async () => {
    const g = window.__game;
    const dummy = g.state.enemies[0];
    const fire = async (charge) => {
      g.player.position.set(dummy.position.x, 0, dummy.position.z + 6);
      g.player.facing = 0;
      const bow = g.player.equippedRanged;
      bow.nextReadyAt = 0;
      bow.ammo = bow.ammoCapacity;
      bow.drawing = true;
      bow.charge = charge;
      const before = dummy.health;
      g.player.fireRanged(g.state);
      for (let i = 0; i < 90 && dummy.health === before; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
      return before - dummy.health;
    };
    dummy.health = dummy.maxHealth;
    const tap = await fire(0);
    const full = await fire(1);
    return { tap, full };
  });
  check('a charged arrow actually lands harder', shots.full > shots.tap && shots.tap > 0,
    `tap ${shots.tap} vs full draw ${shots.full}`);

  // The draw hand must be ON the string, not near it.
  const grip = await page.evaluate(async () => {
    const g = window.__game;
    const bow = g.player.equippedRanged;
    bow.nextReadyAt = 0;
    bow.ammo = bow.ammoCapacity;
    g.player.drawRanged(g.state);
    for (let i = 0; i < 90 && g.player.drawStrength < 0.99; i++) {
      await new Promise((r) => requestAnimationFrame(r));
    }
    const rig = g.player.rig;
    const model = rig.handSocket.children[0];
    const hand = new (g.state.player.position.constructor)();
    rig.drawHandSocket.getWorldPosition(hand);
    const nock = model.userData.nockWorld;
    const bowHand = new (g.state.player.position.constructor)();
    rig.handSocket.getWorldPosition(bowHand);
    bow.cancelDraw();
    return {
      gap: nock ? hand.distanceTo(nock) : null,
      drawLength: bowHand.distanceTo(hand),
      bowHeight: 0.62 * 2,
    };
  });
  check('the draw hand grips the actual bowstring', grip.gap !== null && grip.gap < 0.02,
    `hand to nocking point: ${grip.gap === null ? 'no string' : (grip.gap * 100).toFixed(1) + ' cm'}`);
  // A real bow is drawn about 0.4 of its own height. Much past that and the
  // hand ends up outside the bow's frame, which reads as holding the limb.
  const ratio = grip.drawLength / grip.bowHeight;
  check('the draw is in proportion to the bow', ratio > 0.3 && ratio < 0.55,
    `${grip.drawLength.toFixed(2)} m draw on a ${grip.bowHeight.toFixed(2)} m bow (${ratio.toFixed(2)})`);

  // --- 10. skeleton archers --------------------------------------------------
  await page.evaluate(() => {
    const g = window.__game;
    g.clearZombies();
    g.projectiles.clear(g.state);
    g.player.position.set(0, 0, 0);
    g.player.health = g.player.maxHealth;
    g.player.dead = false;
  });

  await page.evaluate(() => {
    const g = window.__game;
    g.spawnWave();
    // Keep only the archers, so nothing else can be what hits the player.
    for (let i = g.state.enemies.length - 1; i >= 0; i--) {
      if (g.state.enemies[i].isZombie) {
        g.scene.remove(g.state.enemies[i].rig.root);
        g.state.enemies.splice(i, 1);
      }
    }
    const sk = g.state.enemies.find((e) => e.isSkeleton);
    sk.position.set(0, 0, -9);
    sk.__states = [];
    const watch = () => {
      if (!sk.__states.includes(sk.state)) sk.__states.push(sk.state);
      if (!sk.dead) requestAnimationFrame(watch);
    };
    watch();
  });

  const drew = await waitFor(() => {
    const sk = window.__game.state.enemies.find((e) => e.isSkeleton);
    return sk && sk.__states.includes('draw');
  });
  check('skeleton draws its bow', drew);

  const arrowInAir = await waitFor(() =>
    window.__game.state.projectiles.some((p) => p.team === 'enemy'));
  check('skeleton looses an enemy arrow', arrowInAir);

  const hitByArrow = await waitFor(() => window.__game.player.health < window.__game.player.maxHealth);
  const archerState = await page.evaluate(() => {
    const sk = window.__game.state.enemies.find((e) => e.isSkeleton);
    return {
      health: window.__game.player.health,
      distance: Math.hypot(sk.position.x, sk.position.z),
      minRange: sk.minRange,
      states: sk.__states,
    };
  });
  check('skeleton arrow damages the player', hitByArrow, `player health ${archerState.health}`);
  check('skeleton keeps its distance instead of closing',
    archerState.distance > archerState.minRange * 0.8,
    `held ${archerState.distance.toFixed(1)} m (min range ${archerState.minRange})`);

  const friendly = await page.evaluate(async () => {
    const g = window.__game;
    const sk = g.state.enemies.find((e) => e.isSkeleton && !e.dead);
    const dummy = g.state.enemies[0];
    dummy.health = dummy.maxHealth;
    dummy.position.set(sk.position.x, 0, sk.position.z - 3);
    // An enemy arrow fired straight through the dummy must not hurt it.
    g.projectiles.spawn(g.state, {
      x: sk.position.x, y: 1.3, z: sk.position.z - 1,
      vx: 0, vy: 0, vz: -18, damage: 50, lifetime: 1, team: 'enemy',
    });
    for (let i = 0; i < 40; i++) await new Promise((r) => requestAnimationFrame(r));
    return { dummyHealth: dummy.health, dummyMax: dummy.maxHealth };
  });
  check('enemy arrows do not hit other enemies',
    friendly.dummyHealth === friendly.dummyMax, `dummy ${friendly.dummyHealth}/${friendly.dummyMax}`);

  // --- 11. health bars + directional speed -----------------------------------
  const bars = await page.evaluate(() => ({
    bars: document.querySelectorAll('.ehp').length,
    enemies: window.__game.state.enemies.filter((e) => (e.isZombie || e.isSkeleton) && !e.dead).length,
  }));
  check('every living enemy has a health bar', bars.bars >= bars.enemies && bars.enemies > 0,
    `${bars.bars} bars for ${bars.enemies} enemies`);

  const speeds = await page.evaluate(() => {
    const p = window.__game.player;
    p.facing = 0; // facing -Z
    return {
      forward: p.directionalSpeedFactor({ x: 0, z: -1 }),
      strafe: p.directionalSpeedFactor({ x: 1, z: 0 }),
      backward: p.directionalSpeedFactor({ x: 0, z: 1 }),
    };
  });
  check('forward is faster than strafing, strafing faster than backpedalling',
    speeds.forward > speeds.strafe && speeds.strafe > speeds.backward,
    `${speeds.forward.toFixed(2)} / ${speeds.strafe.toFixed(2)} / ${speeds.backward.toFixed(2)}`);

  // A zombie must close ground DURING its windup, not freeze and swing at
  // where you used to be.
  await page.evaluate(() => {
    const g = window.__game;
    g.clearZombies();
    g.player.position.set(0, 0, 0);
    g.player.health = g.player.maxHealth;
    g.spawnWave();
    for (let i = g.state.enemies.length - 1; i >= 0; i--) {
      if (g.state.enemies[i].isSkeleton) {
        g.scene.remove(g.state.enemies[i].rig.root);
        g.state.enemies.splice(i, 1);
      }
    }
    const z = g.state.enemies.find((e) => e.isZombie);
    z.position.set(0, 0, -3);
    z.__windupTravel = 0;
    let last = null;
    const watch = () => {
      if (z.state === 'windup') {
        if (last) z.__windupTravel += Math.hypot(z.position.x - last.x, z.position.z - last.z);
        last = { x: z.position.x, z: z.position.z };
      } else {
        last = null;
      }
      if (!z.dead) requestAnimationFrame(watch);
    };
    watch();
  });
  await waitFor(() => {
    const z = window.__game.state.enemies.find((e) => e.isZombie);
    return z && z.__windupTravel > 0.15;
  });
  const mobility = await page.evaluate(() => {
    const z = window.__game.state.enemies.find((e) => e.isZombie);
    return { travel: z.__windupTravel, factor: z.windupSpeedFactor };
  });
  check('zombies keep closing in during their windup', mobility.travel > 0.15,
    `moved ${mobility.travel.toFixed(2)} m mid-windup at x${mobility.factor} speed`);

  // --- 12. audio plumbing ----------------------------------------------------
  // Headless has no audio device, so this checks that gameplay actually raises
  // cues and the audio system drains them — not that anything is audible.
  const cues = await page.evaluate(async () => {
    const g = window.__game;
    const heard = [];
    const original = g.audio.play.bind(g.audio);
    g.audio.play = (type, opts) => { heard.push(type); return original(type, opts); };

    g.player.equippedMelee.nextReadyAt = 0;
    g.player.swingMelee(g.state);
    await new Promise((r) => requestAnimationFrame(r));

    g.player.equippedRanged.nextReadyAt = 0;
    g.player.drawRanged(g.state);
    await new Promise((r) => requestAnimationFrame(r));
    g.player.fireRanged(g.state);
    await new Promise((r) => requestAnimationFrame(r));

    g.player.takeDamage(5, g.state);
    await new Promise((r) => requestAnimationFrame(r));

    g.audio.play = original;
    return { heard, queueDrained: g.state.events.length };
  });
  check('gameplay raises audio cues',
    ['swing', 'bow-draw', 'bow-release', 'player-hurt'].every((c) => cues.heard.includes(c)),
    cues.heard.join(', '));
  check('the audio system drains the event queue each frame', cues.queueDrained === 0);

  // --- 13. elbows ------------------------------------------------------------
  await quiet();
  const ik = await page.evaluate(async () => {
    const g = window.__game;
    g.player.position.set(0, 0, 0);
    g.player.facing = 0;
    g.player.equippedRanged.nextReadyAt = 0;
    g.player.equippedRanged.ammo = 12;
    g.player.drawRanged(g.state);
    for (let i = 0; i < 120 && g.player.drawStrength < 0.99; i++) {
      await new Promise((r) => requestAnimationFrame(r));
    }
    const rig = g.player.rig;
    const scratch = g.player.position.clone();
    const toBody = (obj) => rig.body.worldToLocal(obj.getWorldPosition(scratch.clone()));
    const bow = toBody(rig.handSocket);
    const draw = toBody(rig.drawHandSocket);
    const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    // Compare against the targets the rig actually asked for, so moving a pose
    // cannot silently break the check.
    const targets = rig.ikTargets;
    g.player.equippedRanged.cancelDraw();
    return {
      bowGap: gap(bow, targets.bow),
      drawGap: gap(draw, targets.draw),
      bowBend: rig.elbowR.rotation.x,
      drawBend: rig.elbowL.rotation.x,
      hasElbows: Boolean(rig.elbowL && rig.elbowR),
    };
  });
  check('arms have elbows', ik.hasElbows);
  check('IK puts both hands on their targets', ik.bowGap < 0.04 && ik.drawGap < 0.04,
    `bow hand off by ${(ik.bowGap * 100).toFixed(1)} cm, draw hand ${(ik.drawGap * 100).toFixed(1)} cm`);
  check('the draw arm bends and the bow arm stays long',
    ik.drawBend > 0.6 && ik.drawBend > ik.bowBend * 2,
    `draw elbow ${((ik.drawBend * 180) / Math.PI).toFixed(0)}°, bow elbow ${((ik.bowBend * 180) / Math.PI).toFixed(0)}°`);

  // --- 14. zombie ranks ------------------------------------------------------
  const ranks = await page.evaluate(async () => {
    const g = window.__game;
    g.clearZombies();
    const seen = new Set();
    // Roll a lot of late-game spawns: every rank should turn up.
    for (let i = 0; i < 400; i++) seen.add(g.rollRank(1).id);
    const armoured = g.spawnRankedZombie('mailed', { x: 0, z: -3 });
    const armed = g.spawnRankedZombie('armed', { x: 3, z: -3 });
    const plain = g.spawnRankedZombie('risen', { x: -3, z: -3 });
    await new Promise((r) => requestAnimationFrame(r));
    const hit = (z) => {
      const before = z.health;
      z.takeDamage(20, g.state, {});
      return before - z.health;
    };
    return {
      rolled: [...seen],
      armouredTook: hit(armoured),
      plainTook: hit(plain),
      armouredDefense: armoured.defense,
      armedReach: armed.attackRange,
      plainReach: plain.attackRange,
      armedDamage: armed.damage,
      plainDamage: plain.damage,
      armedHasSword: armed.rig.handSocket.children.length > 0,
      armouredHasArmour: armoured.rig.body.children.length > plain.rig.body.children.length,
    };
  });
  check('zombies roll into ranks', ranks.rolled.length === 4, ranks.rolled.join(', '));
  check('armoured zombies wear armour and soak damage',
    ranks.armouredHasArmour && ranks.armouredTook < ranks.plainTook,
    `took ${ranks.armouredTook} vs ${ranks.plainTook} from the same hit (defense ${ranks.armouredDefense})`);
  check('armed zombies carry a sword and outrange the rest',
    ranks.armedHasSword && ranks.armedReach > ranks.plainReach && ranks.armedDamage > ranks.plainDamage,
    `reach ${ranks.armedReach} m vs ${ranks.plainReach} m, damage ${ranks.armedDamage} vs ${ranks.plainDamage}`);

  // --- 15. the heal ----------------------------------------------------------
  await quiet();
  const heal = await page.evaluate(() => {
    const g = window.__game;
    const mend = g.player.abilities[0];
    mend.readyAt = 0;
    g.player.health = 40;
    g.player.stamina = g.player.maxStamina;
    const staminaBefore = g.player.stamina;

    const used = g.player.useAbility(0, g.state);
    const afterHeal = g.player.health;
    const secondTry = g.player.useAbility(0, g.state); // still cooling down
    const remaining = mend.cooldownRemaining(g.state.time); // read BEFORE resetting

    g.player.health = g.player.maxHealth;
    mend.readyAt = 0;
    const atFullHealth = g.player.useAbility(0, g.state);

    return {
      name: mend.name,
      used,
      afterHeal,
      secondTry,
      atFullHealth,
      cooldown: mend.cooldown,
      staminaSpent: staminaBefore - g.player.stamina,
      remaining,
    };
  });
  check('Q heals you', heal.used && heal.afterHeal > 40, `40 -> ${heal.afterHeal} health`);
  check('the heal costs stamina', heal.staminaSpent > 0, `${heal.staminaSpent} stamina`);
  check('the heal goes on cooldown', !heal.secondTry && heal.remaining > 0,
    `${heal.cooldown}s cooldown, ${heal.remaining.toFixed(1)}s left`);
  check('the heal refuses to be wasted at full health', !heal.atFullHealth);

  // --- 16. inventory ---------------------------------------------------------
  const inventory = await page.evaluate(() => {
    const g = window.__game;
    g.toggleInventory();
    const open = document.getElementById('inventory').classList.contains('show');
    const text = document.getElementById('inv-list').textContent;
    const paused = g.state.paused;
    g.toggleInventory();
    return {
      open,
      paused,
      closed: !document.getElementById('inventory').classList.contains('show'),
      running: !g.state.paused,
      mentions: {
        melee: text.includes(g.player.equippedMelee.name),
        ranged: text.includes(g.player.equippedRanged.name),
        damage: text.includes('Damage'),
        speed: text.includes('Speed') || text.includes('Rate'),
        range: text.includes('Range'),
        arrows: text.includes('Arrows'),
        ability: text.includes('Mend'),
      },
    };
  });
  check('I opens the inventory and pauses the game', inventory.open && inventory.paused);
  check('the inventory lists weapons with damage, speed, range and ammo',
    Object.values(inventory.mentions).every(Boolean),
    Object.entries(inventory.mentions).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'all present');
  check('closing the inventory resumes the game', inventory.closed && inventory.running);

  await page.screenshot({ path: process.env.SHOT ?? 'screenshot.png' });
  check('no console or page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  server.kill();
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
