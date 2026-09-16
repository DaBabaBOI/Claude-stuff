// Adds the 11 numbered pin badges to the EXISTING "05 · Road to Glory" screen only.
// It finds each target element by the name it was built with and attaches a pin to it —
// it does not rebuild, move, or recolour anything, and does not touch any other screen.
// Each pin number matches the same row number in the "Spec · 05 · Road to Glory" panel
// beneath the screen. Figma > Plugins > Scripter, paste, Run.

await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
const K = { r: 0, g: 0, b: 0 }, W = { r: 1, g: 1, b: 1 };
const S = c => [{ type: 'SOLID', color: c }];

function pin(node, number) {
  if (!node || typeof node.appendChild !== 'function') return null;
  const badge = figma.createFrame();
  badge.name = 'Pin ' + number;
  badge.layoutMode = 'HORIZONTAL'; badge.primaryAxisAlignItems = 'CENTER'; badge.counterAxisAlignItems = 'CENTER';
  badge.fills = S(K); badge.strokes = S(W); badge.strokeWeight = 2; badge.cornerRadius = 99;
  node.appendChild(badge);
  badge.resize(24, 24); badge.primaryAxisSizingMode = 'FIXED'; badge.counterAxisSizingMode = 'FIXED';
  badge.layoutPositioning = 'ABSOLUTE';
  badge.x = 6; badge.y = 6; // fully inside the card, never clipped
  const t = figma.createText(); t.fontName = { family: 'Inter', style: 'Bold' }; t.characters = String(number); t.fontSize = 12; t.fills = S(W);
  badge.appendChild(t);
  return badge;
}

const page = figma.currentPage;
const root = page.children.find(c => c.name === '05 · Road to Glory');
if (!root) { figma.notify('Could not find the "05 · Road to Glory" screen — nothing changed.'); return { found: false }; }

// remove any half-made pins from before, on this screen only, so this is safe to re-run
for (const n of root.findAll(c => /^Pin \d+$/.test(c.name))) n.remove();

const byName = n => root.findOne(c => c.name === n);
const topBar = byName('Top bar');
const statRow = byName('Stat row');
const badgeGrid = byName('Badge grid');
const badgeTiles = root.findAll(c => c.name.startsWith('Badge/'));
const firstPixelIcon = badgeTiles.length ? badgeTiles[0].findOne(c => c.name === 'Pixel icon') : null;
const lockedTile = badgeTiles.find(c => c.name === 'Badge/Class helper') || badgeTiles.find(c => c.name === 'Badge/30-day streak');
const redeemCard = byName('Redeem card');
const activityCard = byName('Activity card');
const classCard = byName('Class leaderboard card');
const classToggle = classCard ? classCard.findOne(c => c.name === 'Toggle') : null;
const schoolCard = byName('School leaderboard card');
const infoCard = byName('Why verified card');

const placed = [];
[[topBar || root, 1], [statRow, 2], [badgeGrid, 3], [firstPixelIcon, 4], [lockedTile, 5],
 [redeemCard, 6], [activityCard, 7], [classCard, 8], [classToggle, 9], [schoolCard, 10], [infoCard, 11]]
  .forEach(([node, num]) => { if (pin(node, num)) placed.push(num); });

figma.notify('Placed pins ' + placed.join(', ') + ' on Road to Glory.');
return { placed };
