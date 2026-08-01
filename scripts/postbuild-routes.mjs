// Les robots de partage (Facebook, iMessage, LinkedIn) n'executent pas le JS :
// ils lisent les balises du HTML servi. Ce script ecrit, apres chaque build,
// une copie de dist/index.html par route avec ses propres balises og/twitter.
// Firebase sert le fichier reel avant la rewrite **, donc /coffre recoit sa version.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROUTES = [
  {
    path: 'coffre',
    title: 'Le Coffre des Inconnus · La petite banque de votre famille',
    description:
      "Une application gratuite d'économie personnelle et familiale, de 4 ans au doctorat : pots, intérêt composé, objectifs, impôts et devises. Le parent est le banquier en chef. Sans compte, sans publicité : tout reste sur votre appareil.",
    image: 'https://www.lesalondesinconnus.com/media/coffre/og-coffre.jpg',
    url: 'https://www.lesalondesinconnus.com/coffre',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Le Coffre des Inconnus',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web, macOS, Windows, Android, iOS',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD' },
      description:
        "Application d'enseignement de l'économie personnelle et familiale qui évolue avec l'enfant, de 4 ans au doctorat.",
      image: 'https://www.lesalondesinconnus.com/media/coffre/og-coffre.jpg',
      url: 'https://www.lesalondesinconnus.com/coffre',
      author: { '@type': 'Organization', name: 'Le Salon des Inconnus', url: 'https://www.lesalondesinconnus.com' },
    },
  },
];

const src = readFileSync(join(root, 'dist/index.html'), 'utf8');
for (const r of ROUTES) {
  let html = src
    .replace(/<title>[^<]*<\/title>/, `<title>${r.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${r.description}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${r.title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${r.description}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${r.image}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${r.url}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${r.title}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${r.description}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${r.image}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${r.url}$2`);
  const dir = join(root, 'dist', r.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  console.log(`dist/${r.path}/index.html ecrit (${r.title})`);
}
