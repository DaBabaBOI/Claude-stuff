// The previous fix (fix-all-pins.js) moved every pin to the same fixed spot (x=6, y=6) inside
// its parent. That solved clipping and z-order, but any pins that share a parent (annotating
// different parts of the same card) now sit exactly on top of each other.
// This script fixes that by grouping pins by their parent, then laying out each group in a row
// along the parent's top-left corner instead of stacking them at one point. A parent with only
// one pin keeps the safe (6,6) inset. A parent with several pins gets them spaced left to right,
// wrapping to a new row if the row would run past the parent's right edge, using each pin's own
// live width/height so the spacing always matches however big the pin badges actually are.
// It also keeps the earlier fixes: clipsContent is turned off on the full ancestor chain, and
// each pin is re-appended to the front of its parent's stacking order.
// Figma > Plugins > Scripter, paste, Run.
const page = figma.currentPage;
const groups = new Map(); // parent -> [pin nodes]

for (const n of page.findAllWithCriteria({ types: ['FRAME'] })) {
  if (!/^Pin \d+$/.test(n.name)) continue;
  const parent = n.parent;
  if (!parent) continue;
  if (!groups.has(parent)) groups.set(parent, []);
  groups.get(parent).push(n);
}

let moved = 0, unclipped = 0, parentsFixed = 0;
const inset = 6;
const gap = 6;

for (const [parent, pins] of groups) {
  let ancestor = parent;
  while (ancestor && ancestor.type !== 'PAGE') {
    if ('clipsContent' in ancestor && ancestor.clipsContent) {
      ancestor.clipsContent = false;
      unclipped++;
    }
    ancestor = ancestor.parent;
  }

  pins.sort((a, b) => {
    const na = parseInt(a.name.replace('Pin ', ''), 10);
    const nb = parseInt(b.name.replace('Pin ', ''), 10);
    return na - nb;
  });

  let x = inset, y = inset, rowHeight = 0;
  const maxX = Math.max(parent.width - inset, inset);

  for (const pin of pins) {
    parent.appendChild(pin); // re-append: brings this pin to the front of the stacking order
    if (x > inset && x + pin.width > maxX) {
      x = inset;
      y += rowHeight + gap;
      rowHeight = 0;
    }
    pin.x = x;
    pin.y = y;
    x += pin.width + gap;
    rowHeight = Math.max(rowHeight, pin.height);
    moved++;
  }
  parentsFixed++;
}

figma.notify('Repositioned ' + moved + ' pins across ' + parentsFixed + ' parent frame(s), unclipped ' + unclipped + ' ancestor frame(s).');
return { moved, parentsFixed, unclipped };
