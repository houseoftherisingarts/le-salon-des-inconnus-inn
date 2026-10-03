// Copie le build web de Pai Sho (apps/pai-sho/dist, base './') dans
// public/jeux/pai-sho, d'où le Café-jeux l'encadre sur la même origine.
//   npm run jeux:pai-sho   (rebâtit le jeu puis lance cette copie)
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'apps', 'pai-sho', 'dist');
const dest = join(root, 'public', 'jeux', 'pai-sho');

if (!existsSync(join(src, 'index.html'))) {
  console.error('apps/pai-sho/dist/index.html introuvable : bâtir le jeu d\'abord.');
  process.exit(1);
}
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log('Pai Sho copié dans public/jeux/pai-sho');
