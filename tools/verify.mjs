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

  // --- 5. reload ------------------------------------------------------------
  const reload = await page.evaluate(() => {
    const g = window.__game;
    g.player.equippedRanged.ammo = 0;
    const started = g.player.reload(g.state);
    return { started, reloading: g.player.equippedRanged.reloading };
  });
  check('reload starts when the magazine is empty', reload.started && reload.reloading);
  check('reload refills the magazine',
    await waitFor(() => window.__game.player.equippedRanged.ammo ===
      window.__game.player.equippedRanged.ammoCapacity));

  await page.screenshot({ path: process.env.SHOT ?? 'screenshot.png' });
  check('no console or page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  server.kill();
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
