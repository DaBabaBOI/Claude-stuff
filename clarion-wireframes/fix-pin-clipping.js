// Fixes pin badges that appear cut off / half-hidden at a card's edge.
// Root cause: each pin badge sits partly outside its parent card (so it reads as a corner
// marker), but the card clips its own content by default, cutting off that overhanging part.
// This script only turns off clipping on the specific cards that have a pin attached to them.
// It touches nothing else, no positions, no content, no other frames.
// Figma > Plugins > Scripter, paste, Run.
const page = figma.currentPage;
let fixed = 0;
for (const n of page.findAllWithCriteria({ types: ['FRAME'] })) {
  if (/^Pin \d+$/.test(n.name)) {
    const parent = n.parent;
    if (parent && 'clipsContent' in parent && parent.clipsContent) {
      parent.clipsContent = false;
      fixed++;
    }
  }
}
figma.notify('Un-clipped ' + fixed + ' cards so their pin badges show fully.');
return { fixed };
