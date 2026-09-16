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
  {
    // La page se partage sur Facebook pendant le festival : sans sa propre copie
    // ici, les robots de partage servent les balises de l'accueil.
    path: 'camping',
    title: 'Camping du festival à Namur · Le Salon des Inconnus',
    description:
      'Quatre emplacements de camping sur cinq acres boisés à Namur, pour la fin de semaine du Festival médiéval de Montpellier, du 25 au 27 septembre. 115 $ tout compris, pits à feux et stationnement sur place.',
    image: 'https://www.lesalondesinconnus.com/media/inn/golden%20drone%20copy.jpg',
    url: 'https://www.lesalondesinconnus.com/camping',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Emplacement de camping · fin de semaine du Festival médiéval de Montpellier',
      description:
        'Un emplacement de camping sur le terrain du Salon des Inconnus, à Namur, pour les nuits du vendredi et du samedi de la fin de semaine du festival.',
      image: 'https://www.lesalondesinconnus.com/media/inn/golden%20drone%20copy.jpg',
      url: 'https://www.lesalondesinconnus.com/camping',
      brand: { '@type': 'Organization', name: 'Le Salon des Inconnus', url: 'https://www.lesalondesinconnus.com' },
      offers: {
        '@type': 'Offer',
        price: '115.00',
        priceCurrency: 'CAD',
        availability: 'https://schema.org/LimitedAvailability',
        inventoryLevel: { '@type': 'QuantitativeValue', value: 4 },
        priceValidUntil: '2026-09-27',
        url: 'https://www.lesalondesinconnus.com/camping',
      },
    },
  },
  // Centre d'arts (venu d'apps/salon) : partages et robots lisent ces balises.
  {
    path: "centre-arts",
    title: "Centre d'arts | Le Salon des Inconnus, Namur",
    description: "Le centre d'arts du Salon des Inconnus à Namur, en Outaouais : d'un côté les acheteurs et les mécènes, de l'autre les artistes et leur Creator Studio.",
    image: 'https://www.lesalondesinconnus.com/media/Financement%20Artistique/centered%20copy.jpg',
    url: 'https://www.lesalondesinconnus.com/centre-arts',
  },
  {
    path: "mecene",
    title: "Le Mécène | Le Salon des Inconnus",
    description: "Acheter et soutenir l'art autrement : les artistes que nous représentons, le mécénat et la fiscalité de l'achat d'œuvres au Québec.",
    image: 'https://www.lesalondesinconnus.com/media/Financement%20Artistique/centered%20copy.jpg',
    url: 'https://www.lesalondesinconnus.com/mecene',
  },
  {
    path: "cafe",
    title: "Le Café | Le Salon des Inconnus",
    description: "Les plateformes et les projets numériques du Salon des Inconnus.",
    image: 'https://www.lesalondesinconnus.com/media/Financement%20Artistique/centered%20copy.jpg',
    url: 'https://www.lesalondesinconnus.com/cafe',
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
  if (r.jsonLd) {
    html = html.replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      `<script type="application/ld+json">${JSON.stringify(r.jsonLd)}</script>`,
    );
  }
  const dir = join(root, 'dist', r.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  console.log(`dist/${r.path}/index.html ecrit (${r.title})`);
}
