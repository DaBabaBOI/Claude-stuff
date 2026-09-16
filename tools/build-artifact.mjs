/**
 * Builds the single-page version of the game used for the shared web link.
 *
 * The artifact host wraps whatever you publish in its own <!doctype>/<head>/
 * <body>, so this strips our wrapper and keeps the parts that matter: the
 * title, the styles, the HUD markup, the import map and the module entry.
 * Everything else (src/, vendor/) publishes alongside it unchanged.
 *
 *   node tools/build-artifact.mjs   ->   build/artifact.html
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const GAME_NAME = 'Blockout Dungeon';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1].trim();

const page = `<title>${GAME_NAME}</title>
${style.replace(
  ':root { color-scheme: dark; }',
  // The host pads :root for phone safe areas; a full-bleed canvas game wants
  // the whole viewport instead.
  ':root { color-scheme: dark; padding: 0 !important; }'
)}
${body}
`;

await mkdir(new URL('../build/', import.meta.url), { recursive: true });
await writeFile(new URL('../build/artifact.html', import.meta.url), page);
console.log(`build/artifact.html written (${(page.length / 1024).toFixed(1)} KB)`);
