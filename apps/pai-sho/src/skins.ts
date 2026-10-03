// ─── Les skins : le plateau et les tuiles ──────────────────────────
// Le choix du joueur vit dans 'paisho.skin'. Ce qui est débloqué vit
// dans 'paisho.debloques', que la boutique du site du Salon écrit sur la
// même origine : le jeu ne vend rien lui-même, il lit. Un skin choisi
// mais jamais débloqué retombe sur le bois, qui est toujours gratuit.
// Pour les captures et le développement, `?plateau=vexel&tuiles=nacre`
// force le skin sans rien écrire.

export type IdPlateau = 'bois' | 'vexel' | 'salon';
export type IdTuiles = 'bois' | 'nacre' | 'obsidienne' | 'cuivre';
export type IdDecor = 'taverne' | 'the';
export interface Skin { plateau: IdPlateau; tuiles: IdTuiles; decor: IdDecor }

export const PLATEAUX: { id: IdPlateau; nomFR: string; nomEN: string; gratuit: boolean }[] = [
  { id: 'bois', nomFR: 'Érable de taverne', nomEN: 'Tavern maple', gratuit: true },
  { id: 'vexel', nomFR: 'Acier Vexel', nomEN: 'Vexel steel', gratuit: false },
  { id: 'salon', nomFR: 'Salon des Inconnus', nomEN: 'Salon des Inconnus', gratuit: false },
];

export const TUILES: { id: IdTuiles; nomFR: string; nomEN: string; gratuit: boolean }[] = [
  { id: 'bois', nomFR: 'Bois doré', nomEN: 'Gilded wood', gratuit: true },
  { id: 'nacre', nomFR: 'Nacre', nomEN: 'Mother-of-pearl', gratuit: false },
  { id: 'obsidienne', nomFR: 'Obsidienne', nomEN: 'Obsidian', gratuit: false },
  { id: 'cuivre', nomFR: 'Cuivre', nomEN: 'Copper', gratuit: false },
];

/** Les salles, toutes offertes : la taverne et le salon de thé (`scenes/<id>-salle.jpg`). */
export const DECORS: { id: IdDecor; nomFR: string; nomEN: string; gratuit: boolean }[] = [
  { id: 'taverne', nomFR: 'Taverne', nomEN: 'Tavern', gratuit: true },
  { id: 'the', nomFR: 'Salon de thé', nomEN: 'Tea house', gratuit: true },
];

const CLE_SKIN = 'paisho.skin';
const CLE_DEBLOQUES = 'paisho.debloques';
const DEFAUT: Skin = { plateau: 'bois', tuiles: 'bois', decor: 'taverne' };

const estPlateau = (x: unknown): x is IdPlateau => PLATEAUX.some((p) => p.id === x);
const estTuiles = (x: unknown): x is IdTuiles => TUILES.some((t) => t.id === x);
const estDecor = (x: unknown): x is IdDecor => DECORS.some((d) => d.id === x);

/** Les ids débloqués, les gratuits toujours compris. */
export function debloques(): Set<string> {
  const s = new Set<string>(['bois']);
  try {
    const liste: unknown = JSON.parse(localStorage.getItem(CLE_DEBLOQUES) ?? '[]');
    if (Array.isArray(liste)) for (const id of liste) if (typeof id === 'string') s.add(id);
  } catch { /* stockage illisible ou privé : le bois seul */ }
  return s;
}

/** Le skin forcé par l'adresse, pour les captures et le développement
 *  seulement : en production, l'adresse ne déverrouille rien. */
function skinDeLAdresse(): Partial<Skin> {
  try {
    if (!navigator.webdriver && !import.meta.env.DEV) return {};
    const q = new URLSearchParams(window.location.search);
    const p = q.get('plateau'), t = q.get('tuiles'), d = q.get('decor');
    return { ...(estPlateau(p) ? { plateau: p } : {}), ...(estTuiles(t) ? { tuiles: t } : {}), ...(estDecor(d) ? { decor: d } : {}) };
  } catch { return {}; }
}

export function skinChoisi(): Skin {
  let s: Skin = { ...DEFAUT };
  try {
    const lu = JSON.parse(localStorage.getItem(CLE_SKIN) ?? 'null') as Partial<Skin> | null;
    if (lu && estPlateau(lu.plateau)) s.plateau = lu.plateau;
    if (lu && estTuiles(lu.tuiles)) s.tuiles = lu.tuiles;
    if (lu && estDecor(lu.decor)) s.decor = lu.decor;
  } catch { /* rien de sauvé */ }
  const ok = debloques();
  if (!ok.has(s.plateau)) s.plateau = 'bois';
  if (!ok.has(s.tuiles)) s.tuiles = 'bois';
  // L'adresse passe avant le verrou : elle ne sert qu'aux captures.
  s = { ...s, ...skinDeLAdresse() };
  return s;
}

export function choisirSkin(s: Skin): void {
  try { localStorage.setItem(CLE_SKIN, JSON.stringify(s)); } catch { /* navigation privée */ }
}
