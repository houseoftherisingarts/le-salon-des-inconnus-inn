// Lance les tests des règles : esbuild assemble logic.test.ts, node l'exécute.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sortie = '/private/tmp/claude-501/-Users-lesalondesinconnus/ed9b08ee-2d01-4c73-bfb9-3374ff8b487a/scratchpad/paisho-test.mjs';
const lancer = (cmd, args) => execFileSync(cmd, args, { cwd: racine, stdio: 'inherit' });
try {
  lancer('npx', ['esbuild', 'apps/pai-sho/src/jeu/logic.test.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${sortie}`]);
  lancer('node', [sortie]);
} catch (e) {
  process.exit(e.status ?? 1);
}
