// Builds the app as a Claude Artifact page: `npm run build:artifact`.
// Writes dist-artifact/artifact.html, the page fragment the Artifact tool
// publishes (it adds the <html>/<head>/<body> skeleton itself). Everything is
// inlined except the exercise photos, which are published beside the page
// from public/exercise-media and loaded by relative URL.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
execFileSync('npx', ['vite', 'build'], { cwd: root, stdio: 'inherit', env: { ...process.env, VITE_ARTIFACT: '1' } });

const assets = join(root, 'dist-artifact', 'assets');
const read = (ext) => {
  const names = readdirSync(assets).filter((f) => f.endsWith(ext));
  if (names.length !== 1) throw new Error(`expected one ${ext} file in ${assets}, found ${names.length}`);
  return readFileSync(join(assets, names[0]), 'utf8');
};
const css = read('.css').replace(/<\/style/gi, '<\\/style');
// A literal U+FFFD (the replacement character, used by the markdown parser inside string literals) is
// refused by the publisher as a sign of lost text; the escape is the same character to the engine.
const js = read('.js').replace(/<\/script/gi, '<\\/script').replaceAll('\uFFFD', '\\uFFFD');

const page = `<title>Fasting Tracker</title>
<style>${css}</style>
<style>
/* The Artifact skeleton already pads the page by the phone's safe-area insets */
body { padding-top: 0; }
@supports (height: 100dvh) { html { height: 100%; } }
</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
writeFileSync(join(root, 'dist-artifact', 'artifact.html'), page);
console.log(`dist-artifact/artifact.html: ${(page.length / 1024).toFixed(0)} KiB`);
