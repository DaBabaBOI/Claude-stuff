// Fixes EVERY pin badge on EVERY screen in one pass. Three things, each targeting a known
// cause of a "missing" pin seen earlier in this file:
// 1. Position: resets each pin to x=6, y=6 inside its immediate parent (a small positive inset,
//    never a negative/overhanging offset), so it can never overhang an edge.
// 2. Clipping: walks the full ancestor chain of each pin (parent, grandparent, etc., up to the
//    page) and turns off clipsContent, so no ancestor at any depth can crop the pin.
// 3. Z-order: re-appends the pin to its parent, which in Figma moves a node to the front of the
//    stacking order, so nothing added after it can visually sit on top of it.
// It does not create, delete, resize, or restyle anything except the pin badges and the
// clipsContent flag on their ancestors, so no other content on any screen changes.
// Figma > Plugins > Scripter, paste, Run.
const page = figma.currentPage;
let fixed = 0, missingParent = 0, unclipped = 0;
for (const n of page.findAllWithCriteria({ types: ['FRAME'] })) {
  if (!/^Pin \d+$/.test(n.name)) continue;
  const parent = n.parent;
  if (!parent) { missingParent++; continue; }

  let ancestor = parent;
  while (ancestor && ancestor.type !== 'PAGE') {
    if ('clipsContent' in ancestor && ancestor.clipsContent) {
      ancestor.clipsContent = false;
      unclipped++;
    }
    ancestor = ancestor.parent;
  }

  parent.appendChild(n); // re-append: moves this pin to the front of its parent's stacking order
  n.x = 6;
  n.y = 6;
  fixed++;
}
figma.notify('Fixed ' + fixed + ' pin badges, unclipped ' + unclipped + ' ancestor frame(s).' + (missingParent ? ' ' + missingParent + ' had no parent.' : ''));
return { fixed, missingParent, unclipped };
