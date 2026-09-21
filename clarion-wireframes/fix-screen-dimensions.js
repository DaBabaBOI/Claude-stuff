// Every screen frame ("01 ·" through "25 ·") is meant to be a fixed 1440x1024 desktop mockup.
// A live check found that all of them except the two most recently added (24, 25) have been
// resized to 1080x1227, most likely from an accidental multi-selection drag-resize on the canvas
// rather than anything a build script did. This resets every top-level screen frame back to
// 1440x1024. Since the content inside each screen already fills its frame edge to edge (the
// established FILL sizing pattern used throughout), resizing the frame back is enough on its own,
// nothing inside needs to be rebuilt.
// Figma > Plugins > Scripter, paste, Run.
const page = figma.currentPage;
let fixed = 0, alreadyOk = 0;
for (const n of page.children) {
  if (n.type !== 'FRAME') continue;
  if (!/^\d\d ·/.test(n.name)) continue;
  if (n.width === 1440 && n.height === 1024) { alreadyOk++; continue; }
  n.resize(1440, 1024);
  fixed++;
}
figma.notify('Resized ' + fixed + ' screen(s) back to 1440x1024. ' + alreadyOk + ' were already correct.');
return { fixed, alreadyOk };
