// Jetable : rejoue une ligne de leçon et montre ce qui coince.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
const sortie = '/private/tmp/claude-501/-Users-lesalondesinconnus/3bad1bad-cafb-4928-81ac-ff2c7aad2965/scratchpad/lecon-tmp.mjs';
execFileSync('npx', ['esbuild', '--bundle', '--platform=node', '--format=esm', `--outfile=${sortie}`, '--loader:.ts=ts'], {
  cwd: path.resolve(ici, '..'),
  input: "export * from './src/jeu/logic'; export { appliquerCoup, coupLegal } from './src/jeu/arbitre';",
  stdio: ['pipe', 'inherit', 'inherit'],
});
const J = await import(sortie);

const ligne = process.argv.slice(2).join(' ').split(/\s+/).filter(Boolean);
let e = J.etatInitial();
for (const t of ligne) {
  const qui = e.tour;
  const c = J.coupDepuisTexte(t);
  const n = J.appliquerCoup(e, c);
  if (n === e) {
    console.log(`REFUSÉ (${qui}) : ${t}`);
    const prefixe = t.split('>')[0].split('+')[0];
    console.log('  légaux depuis là :', J.coupsLegaux(e).map(J.coupEnTexte).filter((x) => x.startsWith(prefixe) && !x.includes('+')).join(' '));
    break;
  }
  e = n;
  const hs = J.harmonies(e).map((h) => `${h.camp[0]}:${J.coupEnTexte({ type: 'deplacer', de: h.a, a: h.b })}`);
  console.log(`${qui.padEnd(6)} ${t.padEnd(26)} harmonies [${hs.join(' ')}] ${e.verdict ? JSON.stringify(e.verdict) : ''}`);
}
