// Assemble captures/rapport.json : le résultat des parties jouées et
// la grille que le vérificateur doit appliquer à chaque capture.
import { readFileSync, writeFileSync } from 'node:fs';
const d = JSON.parse(readFileSync(new URL('../captures/parties-1234.json', import.meta.url)));
const rapport = {
  ...d,
  grille: [
    'Plein écran : la scène 3D occupe toute la fenêtre, aucun bloc centré dans le vide',
    "Aucun élément d'interface n'en cache un autre ni ne couvre le plateau jouable",
    'Titres en police display sur deux lignes au plus',
    'Texte lisible sur chaque fond, aucun texte visible sous 13 px',
    'Aucun italique, aucun tiret cadratin',
    'Panneaux de verre : coins de 15 px, fond noir translucide, bord blanc léger, or #d4af37',
    'Les tuiles sont les modèles GLB sculptés, jamais des formes procédurales visibles',
    "Mobile 390 : feuille du bas, pas de débordement horizontal, plateau entier visible",
    'Verdict et règles lisibles et centrés devant les yeux',
  ],
  verifications: {
    debordementMenu390: d.mesures.debordementMenu,
    erreursConsole: d.erreurs.length,
  },
};
delete rapport.mesures;
writeFileSync(new URL('../captures/rapport.json', import.meta.url), JSON.stringify(rapport, null, 2));
console.log('rapport.json écrit');
