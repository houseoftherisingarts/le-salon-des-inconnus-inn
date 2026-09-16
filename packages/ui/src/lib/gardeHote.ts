// Garde d'hôte « jamais web.app » : aucun visiteur ne reste sur une adresse
// technique de Firebase (*.web.app, *.firebaseapp.com). Importée en tout
// premier dans le point d'entrée de chaque app (monolithe, hub, salon, dôme)
// pour rediriger avant que quoi que ce soit ne se charge. Les pages réservées
// de Firebase Auth (/__/...) restent servies là où elles sont. Sur tout autre
// hôte (domaine officiel, domaine personnel d'un artiste, localhost), la garde
// ne fait rien. Ce fichier n'importe rien, exprès.

const DOMAINES: Record<string, string> = {
  'le-salon-des-inconnus': 'https://www.lesalondesinconnus.com',
  'inconnus-auberge': 'https://aubergedesinconnus.com',
  'inconnus-hub': 'https://lesinconnus.ca',
  'inconnus-dome': 'https://ledomedesinconnus.com',
  'inconnus-salon': 'https://www.lesalondesinconnus.com',
};

// L'ancien centre d'arts (inconnus-salon) vit maintenant sur le monolithe.
// Rend le chemin équivalent, ou null quand le monolithe ne sait pas le rendre
// (dans ce cas, pas de redirection).
export function cheminSalonVersMonolithe(pathname: string, search: string): string | null {
  const chemin = pathname.replace(/\/$/, '') || '/';
  if (chemin === '/' || chemin === '/centre') return '/centre-arts';
  if (chemin === '/createur') return '/creator';
  if (chemin === '/mecene' || chemin === '/cafe') return chemin;
  if (chemin === '/membre') return new URLSearchParams(search).get('uid') ? chemin : null;
  const membre = chemin.match(/^\/membre\/([^/]+)$/);
  if (membre) return `/membre?uid=${membre[1]}`;
  if (/^\/c\/[A-Za-z0-9_-]{6,}\/[A-Za-z0-9_-]{3,}$/.test(chemin)) return chemin;
  // Slug d'un Profil Pro : le monolithe le rend aussi (/alex est une page propre au salon).
  if (chemin !== '/alex' && /^\/[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(chemin)) return chemin;
  return null;
}

export function adresseOfficielle(loc: { hostname: string; pathname: string; search: string; hash: string }): string | null {
  const hote = loc.hostname.toLowerCase();
  const m = hote.match(/^([a-z0-9-]+)\.(web\.app|firebaseapp\.com)$/);
  if (!m || loc.pathname.startsWith('/__/')) return null;
  const domaine = DOMAINES[m[1]];
  if (!domaine) return null;
  if (m[1] !== 'inconnus-salon') return domaine + loc.pathname + loc.search + loc.hash;
  const chemin = cheminSalonVersMonolithe(loc.pathname, loc.search);
  if (chemin === null) return null;
  // Le chemin traduit peut déjà porter sa recherche (/membre?uid=...).
  const recherche = chemin.includes('?') ? '' : loc.search;
  return domaine + chemin + recherche + loc.hash;
}

if (typeof window !== 'undefined') {
  const cible = adresseOfficielle(window.location);
  if (cible) window.location.replace(cible);
}
