import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT = 8150, dir = process.env.DIR;
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 500));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
p.on('pageerror', e => console.log('PAGEERROR', String(e)));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.goto(`http://localhost:${PORT}/index.html`);
await p.waitForFunction(() => window.__game?.state?.frame > 3, null, { timeout: 15000 });
await p.evaluate(() => {
  const g = window.__game;
  g.state.wavesEnabled = false; g.clearZombies();
  g.player.position.set(0, 0, 4);
  g.state.enemies[0].position.set(-4, 0, -4);
  ['risen','mailed','armed','revenant'].forEach((id, i) => {
    const z = g.spawnRankedZombie(id, { x: -3 + i * 2.2, z: -2 });
    z.state = 'idle'; z.aggroRange = 0;
  });
});
await p.waitForTimeout(1400);
await p.evaluate(() => { window.__game.state.paused = true; });
await p.screenshot({ path: `${dir}/gfx-play.png` });
await p.evaluate(() => {
  const g = window.__game;
  g.state.paused = false;
  g.cameraController.offset.set(-1.6, 1.75, -2.9);
  g.player.facing = 0.35;
});
await p.waitForTimeout(900);
await p.evaluate(() => { window.__game.state.paused = true; });
await p.screenshot({ path: `${dir}/gfx-close.png` });
await b.close(); server.kill();
