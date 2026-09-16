// Moves every pin badge fully inside its own card instead of half-hanging off the corner.
// The earlier fix only un-clipped one level of container, but several pins (especially on
// screens 04 and 05) sit many containers deep, so a higher-level container was still clipping
// them. This avoids that entirely: instead of relying on clipping being off, it repositions
// each badge so it never needs to escape its parent's bounds in the first place.
// Touches only frames named "Pin <number>" (position only) — nothing else on the page changes.
// Figma > Plugins > Scripter, paste, Run.
const page = figma.currentPage;
let moved = 0;
for (const n of page.findAllWithCriteria({ types: ['FRAME'] })) {
  if (/^Pin \d+$/.test(n.name)) {
    n.x = 6;
    n.y = 6;
    moved++;
  }
}
figma.notify('Repositioned ' + moved + ' pin badges fully inside their cards.');
return { moved };
