// Removes only the small numbered pin badges added by the last script.
// Leaves every screen, spec panel, and everything else untouched.
// Figma > Plugins > Scripter, paste, Run.
const page = figma.currentPage;
let count = 0;
for (const n of page.findAllWithCriteria({ types: ['FRAME'] })) {
  if (/^Pin \d+$/.test(n.name)) { n.remove(); count++; }
}
figma.notify('Removed ' + count + ' pin badges.');
return { removed: count };
