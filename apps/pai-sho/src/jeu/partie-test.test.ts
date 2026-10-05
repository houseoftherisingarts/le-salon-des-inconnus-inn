// ─── Banc de parties du Pai Sho : parties complètes + scénarios ─────
// Test indépendant : des parties jouées par l'arbitre (appliquerCoup), avec des invariants
// vérifiés à CHAQUE demi-coup, puis des positions ciblées pour chaque effet de tuile.
// Lancer :  npx esbuild apps/pai-sho/src/jeu/partie-test.test.ts --bundle --platform=node \
//   --format=esm --outfile=$TMPDIR/partie.mjs && node $TMPDIR/partie.mjs   (depuis la racine du dépôt)

import {
  coupDepuisTexte, coupEnTexte, coupsLegaux, conflits, etatDepuis, etatInitial, harmonies, tuileEn,
  tuilesPiegees, verdict, type Camp, type Coup, type EtatPaiSho, type TypeTuile,
} from './logic';
import { appliquerCoup } from './arbitre';
import { choisirCoup } from './cpu';
import { graine, piocher, entier, type Alea } from '../moteur/hasard';
import { POINTS, VOISINS, coordX, coordY, estPorte, indice, zone, type Pt } from './plateau';

const P = indice;
const echecs: string[] = [];
let controles = 0;

// ── Outils ──────────────────────────────────────────────────────────
const dump = (e: EtatPaiSho): string =>
  POINTS.filter((i) => e.cases[i] !== '.').map((i) => `${e.cases[i]}@${coordX(i)},${coordY(i)}`).join(' ') + ` | tour ${e.tour} n°${e.numero}`;

function verifie(cond: unknown, msg: string): void {
  controles++;
  if (!cond) throw new Error(msg);
}

const DIST: Record<string, number> = { R3: 3, R4: 4, R5: 5, W3: 3, W4: 4, W5: 5, LOTUS: 2, ORCHIDEE: 6 };
const BASES = ['R3', 'R4', 'R5', 'W3', 'W4', 'W5'];
const ACC = ['ROCHER', 'ROUE', 'RENOUEE', 'BARQUE'];
const ordre = (t: string) => BASES.indexOf(t);
const harm = (a: string, b: string) => ordre(a) >= 0 && ordre(b) >= 0 && [1, 5].includes((ordre(a) - ordre(b) + 6) % 6);
const lotusEnFleur = (e: EtatPaiSho, camp: Camp) =>
  POINTS.some((i) => { const t = tuileEn(e, i); return t?.type === 'LOTUS' && t.camp === camp && !estPorte(i); });

/** Distance la plus courte par cases vides (la case d'arrivée peut être occupée), ou -1. */
function plusCourt(cases: string, de: Pt, a: Pt): number {
  const d = new Map<Pt, number>([[de, 0]]);
  const f = [de];
  for (let k = 0; k < f.length; k++) {
    for (const j of VOISINS[f[k]]) {
      if (d.has(j)) continue;
      if (j === a) return d.get(f[k])! + 1;
      if (cases[j] === '.') { d.set(j, d.get(f[k])! + 1); f.push(j); }
    }
  }
  return -1;
}

/** Harmonies recalculées à part, sans rien emprunter à logic.ts. */
function harmoniesRef(e: EtatPaiSho): string[] {
  const tuiles = POINTS.map((i) => ({ i, t: tuileEn(e, i)! })).filter((x) => x.t);
  const roches = tuiles.filter((x) => x.t.type === 'ROCHER');
  const renouees = tuiles.filter((x) => x.t.type === 'RENOUEE');
  const sortie: string[] = [];
  const f = tuiles.filter((x) => (ordre(x.t.type) >= 0 || x.t.type === 'LOTUS') && !estPorte(x.i));
  for (const a of f) for (const b of f) {
    if (a.i >= b.i) continue;
    const xa = coordX(a.i), ya = coordY(a.i), xb = coordX(b.i), yb = coordY(b.i);
    const hor = ya === yb, ver = xa === xb;
    if (!hor && !ver) continue;
    const entre = tuiles.some((c) => (hor ? coordY(c.i) === ya && coordX(c.i) > Math.min(xa, xb) && coordX(c.i) < Math.max(xa, xb)
      : coordX(c.i) === xa && coordY(c.i) > Math.min(ya, yb) && coordY(c.i) < Math.max(ya, yb)));
    if (entre) continue;
    let camp: Camp;
    if (a.t.type === 'LOTUS' && b.t.type === 'LOTUS') continue;
    if (a.t.type === 'LOTUS') camp = b.t.camp;
    else if (b.t.type === 'LOTUS') camp = a.t.camp;
    else if (a.t.camp !== b.t.camp || !harm(a.t.type, b.t.type)) continue;
    else camp = a.t.camp;
    if (roches.some((r) => (hor ? coordY(r.i) === ya : coordX(r.i) === xa))) continue;
    if (renouees.some((k) => [a, b].some((x) => Math.max(Math.abs(coordX(x.i) - coordX(k.i)), Math.abs(coordY(x.i) - coordY(k.i))) <= 1))) continue;
    sortie.push(`${Math.min(a.i, b.i)}-${Math.max(a.i, b.i)}:${camp}`);
  }
  return sortie.sort();
}

// ── Les genres de coups ─────────────────────────────────────────────
const GENRES = [
  'planter', 'arranger', 'capturer',
  'bonus ROCHER', 'bonus RENOUEE', 'bonus ROUE', 'bonus BARQUE sur fleur', 'bonus BARQUE sur accent',
  'bonus LOTUS', 'bonus ORCHIDEE', 'bonus fleur de base',
  'coup de lotus', "coup d'orchidée", 'capture par orchidée sauvage',
] as const;

function genres(e: EtatPaiSho, c: Coup): string[] {
  if (c.type === 'planter') return ['planter'];
  const g = ['arranger'];
  const t = tuileEn(e, c.de)!.type;
  const prise = e.cases[c.a] !== '.';
  if (prise) g.push('capturer');
  if (t === 'LOTUS') g.push('coup de lotus');
  if (t === 'ORCHIDEE') { g.push("coup d'orchidée"); if (prise && lotusEnFleur(e, e.tour)) g.push('capture par orchidée sauvage'); }
  const b = c.bonus;
  if (b) {
    if (b.type === 'base') g.push('bonus fleur de base');
    else if (b.type === 'special') g.push(`bonus ${b.tuile}`);
    else if (b.tuile === 'BARQUE') g.push(b.vers === undefined ? 'bonus BARQUE sur accent' : 'bonus BARQUE sur fleur');
    else g.push(`bonus ${b.tuile}`);
  }
  return g;
}

// ── Les invariants, à chaque demi-coup ──────────────────────────────
const TOTAL = 18 + 1 + 1 + 8;
type Retires = Record<Camp, number>;

function invariants(avant: EtatPaiSho, c: Coup, apres: EtatPaiSho, retires: Retires, ctx: string): void {
  const mal = (m: string) => echecs.push(`${ctx} : ${m}\n    position avant : ${dump(avant)}\n    position après : ${dump(apres)}`);
  controles += 12;
  const camps: Camp[] = ['hote', 'invite'];
  const moi = avant.tour, lui: Camp = moi === 'hote' ? 'invite' : 'hote';

  // (a) accepté
  if (apres === avant || apres.numero !== avant.numero + 1) { mal('coup refusé par l’arbitre'); return; }
  if (apres.cases.length !== 289 || /[^.ABCDEFLORWKTabcdeflorwkt]/.test(apres.cases)) mal('plateau mal formé');

  // (b) aucun clash, vérifié aussi à la main
  if (conflits(apres).length) mal(`conflits() non vide : ${conflits(apres).map(([a, b]) => `${coordX(a)},${coordY(a)}/${coordX(b)},${coordY(b)}`)}`);
  const fleurs = POINTS.filter((i) => ordre(tuileEn(apres, i)?.type ?? '') >= 0 && !estPorte(i));
  for (const a of fleurs) for (const b of fleurs) {
    if (a >= b) continue;
    const ta = tuileEn(apres, a)!.type, tb = tuileEn(apres, b)!.type;
    if ((ordre(ta) - ordre(tb) + 6) % 6 !== 3) continue;
    const memeLigne = coordY(a) === coordY(b), memeCol = coordX(a) === coordX(b);
    if (!memeLigne && !memeCol) continue;
    const libre = POINTS.every((k) => k === a || k === b || apres.cases[k] === '.' || !(memeLigne
      ? coordY(k) === coordY(a) && coordX(k) > Math.min(coordX(a), coordX(b)) && coordX(k) < Math.max(coordX(a), coordX(b))
      : coordX(k) === coordX(a) && coordY(k) > Math.min(coordY(a), coordY(b)) && coordY(k) < Math.max(coordY(a), coordY(b))));
    if (libre) mal(`clash à la main entre ${coordX(a)},${coordY(a)} et ${coordX(b)},${coordY(b)}`);
  }

  // retirées par la barque sur un accent : la barque et l'accent visé
  if (c.type === 'deplacer' && c.bonus?.type === 'accent' && c.bonus.tuile === 'BARQUE' && c.bonus.vers === undefined) {
    const cible = tuileEn(apres.cases === avant.cases ? avant : { ...avant, cases: avant.cases }, c.bonus.a);
    // la cible se lit sur le plateau d'avant, mais après le déplacement de la fleur (qui ne touche pas l'accent)
    if (!cible || !ACC.includes(cible.type)) mal('barque sur accent : la cible n’est pas un accent');
    else { retires[moi]++; retires[cible.camp]++; }
  }

  // (c) conservation des tuiles
  for (const camp of camps) {
    const surPlateau = POINTS.filter((i) => tuileEn(apres, i)?.camp === camp).length;
    const reserve = Object.values(apres.reserve[camp]).reduce((s, n) => s + n, 0);
    const autre: Camp = camp === 'hote' ? 'invite' : 'hote';
    const somme = surPlateau + reserve + apres.captures[autre];
    if (somme !== TOTAL - retires[camp]) mal(`conservation ${camp} : ${surPlateau} + ${reserve} + ${apres.captures[autre]} = ${somme}, attendu ${TOTAL - retires[camp]}`);
    if (Object.values(apres.reserve[camp]).some((n) => n < 0)) mal(`réserve négative ${camp}`);
  }

  // (d, e, f) harmonies
  const hs = harmonies(apres);
  for (const h of hs) {
    const ta = tuileEn(apres, h.a)!, tb = tuileEn(apres, h.b)!;
    const nom = `${ta.type}${coordX(h.a)},${coordY(h.a)}-${tb.type}${coordX(h.b)},${coordY(h.b)}`;
    if (ta.type === 'LOTUS' && tb.type === 'LOTUS') mal(`harmonie lotus-lotus ${nom}`);
    else if (ta.type === 'LOTUS') { if (h.camp !== tb.camp || ordre(tb.type) < 0) mal(`harmonie ${nom} créditée à ${h.camp}`); }
    else if (tb.type === 'LOTUS') { if (h.camp !== ta.camp || ordre(ta.type) < 0) mal(`harmonie ${nom} créditée à ${h.camp}`); }
    else if (ta.camp !== tb.camp || h.camp !== ta.camp || !harm(ta.type, tb.type)) mal(`harmonie illicite ${nom} (${h.camp})`);
    if (estPorte(h.a) || estPorte(h.b)) mal(`harmonie avec une tuile en porte ${nom}`);
    const xa = coordX(h.a), ya = coordY(h.a), xb = coordX(h.b), yb = coordY(h.b);
    const hor = ya === yb;
    if (!hor && xa !== xb) { mal(`harmonie hors ligne ${nom}`); continue; }
    for (const k of POINTS) {
      if (apres.cases[k] === '.') continue;
      const x = coordX(k), y = coordY(k);
      const entre = hor ? y === ya && x > Math.min(xa, xb) && x < Math.max(xa, xb) : x === xa && y > Math.min(ya, yb) && y < Math.max(ya, yb);
      if (entre) mal(`tuile entre les deux de l'harmonie ${nom}`);
      const t = tuileEn(apres, k)!.type;
      if (t === 'ROCHER' && (hor ? y === ya : x === xa)) mal(`harmonie ${nom} sur la ligne du rocher ${x},${y}`);
      if (t === 'RENOUEE' && [[xa, ya], [xb, yb]].some(([px, py]) => Math.max(Math.abs(px - x), Math.abs(py - y)) <= 1)) mal(`harmonie ${nom} contre la renouée ${x},${y}`);
    }
  }
  const attendu = harmoniesRef(apres), obtenu = hs.map((h) => `${Math.min(h.a, h.b)}-${Math.max(h.a, h.b)}:${h.camp}`).sort();
  if (attendu.join() !== obtenu.join()) mal(`harmonies() diffère du calcul indépendant : attendu [${attendu}] obtenu [${obtenu}]`);

  // (g, h) jardins et portes
  for (const i of POINTS) {
    const t = tuileEn(apres, i);
    if (!t) continue;
    const x = coordX(i), y = coordY(i), z = zone(x, y);
    const o = ordre(t.type);
    if (o >= 0 && o <= 2 && z === 'blanc') mal(`${t.type} en jardin blanc ${x},${y}`);
    if (o >= 3 && z === 'rouge') mal(`${t.type} en jardin rouge ${x},${y}`);
    if (ACC.includes(t.type) && estPorte(i)) mal(`${t.type} en porte`);
    if ((t.type === 'LOTUS' || t.type === 'ORCHIDEE') && estPorte(i)) {
      // ne peut s'y trouver que plantée (en réserve avant) ou déjà là
      const avantT = tuileEn(avant, i);
      const plantee = c.type === 'planter' ? c.tuile === t.type && c.porte === i : c.bonus?.type === 'special' && c.bonus.tuile === t.type && c.bonus.porte === i;
      if (!plantee && avantT?.type !== t.type) mal(`${t.type} est arrivée en porte autrement que plantée`);
    }
  }

  // (i) distance
  if (c.type === 'deplacer') {
    const t = tuileEn(avant, c.de);
    if (!t || t.camp !== moi || !(t.type in DIST)) mal('déplacement d’une tuile qui n’est pas une fleur du joueur');
    else {
      const d = plusCourt(avant.cases, c.de, c.a);
      if (d < 1 || d > DIST[t.type]) mal(`${t.type} ${coordX(c.de)},${coordY(c.de)} > ${coordX(c.a)},${coordY(c.a)} : chemin ${d} pour un maximum de ${DIST[t.type]}`);
      if (estPorte(c.a)) mal('arrivée en porte');
      if (tuilesPiegees(avant).includes(c.de)) mal('une tuile piégée a bougé');
      if (avant.cases[c.a] !== '.') {
        const cible = tuileEn(avant, c.a)!;
        if (cible.camp === moi) mal('prise d’une tuile du même camp');
        if (estPorte(c.a)) mal('prise en porte');
        const ok = t.type === 'ORCHIDEE' ? lotusEnFleur(avant, moi)
          : cible.type === 'ORCHIDEE' ? lotusEnFleur(avant, lui)
            : ordre(t.type) >= 0 && ordre(cible.type) >= 0 && (ordre(t.type) - ordre(cible.type) + 6) % 6 === 3;
        const lotusPrisParLotus = false;
        if (!ok && !lotusPrisParLotus && !(t.type === 'LOTUS' && cible.type === 'ORCHIDEE' && lotusEnFleur(avant, lui))) {
          mal(`prise non permise : ${t.type} sur ${cible.type}`);
        }
        if (cible.type === 'LOTUS' && t.type !== 'ORCHIDEE') mal('lotus pris par autre chose qu’une orchidée sauvage');
        if (apres.captures[moi] !== avant.captures[moi] + 1) mal('compteur de prises');
      }
    }
  }
}

// ── Les parties ─────────────────────────────────────────────────────
const compteLegal: Record<string, number> = {};
const compteJoue: Record<string, number> = {};
for (const g of GENRES) { compteLegal[g] = 0; compteJoue[g] = 0; }
const fins: Record<string, number> = {};
const NB_PARTIES = 12, MAX_PLIES = 400;
let pliesTotal = 0;

function choisir(e: EtatPaiSho, legaux: Coup[], a: Alea, pCpu: number, equilibre: boolean, ctx: string): Coup {
  if (a() < pCpu) {
    const c = choisirCoup(e, 2);
    if (c) {
      if (!legaux.some((x) => coupEnTexte(x) === coupEnTexte(c))) echecs.push(`${ctx} : choisirCoup a rendu un coup illégal ${coupEnTexte(c)}\n    ${dump(e)}`);
      else return c;
    }
  }
  if (equilibre && e.numero > 1) {
    // un genre au hasard, puis un coup de ce genre : les genres rares sortent
    const parGenre = new Map<string, Coup[]>();
    for (const c of legaux) for (const g of genres(e, c)) { if (!parGenre.has(g)) parGenre.set(g, []); parGenre.get(g)!.push(c); }
    const cles = [...parGenre.keys()].filter((g) => g !== 'arranger' || a() < 0.3);
    return piocher(a, parGenre.get(piocher(a, cles.length ? cles : [...parGenre.keys()]))!);
  }
  return legaux[entier(a, legaux.length)];
}

const t0 = Date.now();
for (let n = 1; n <= NB_PARTIES; n++) {
  const a = graine(7000 + n * 31);
  const pCpu = [0, 0.15, 0.3, 0, 0.5, 0.15, 0, 0.3, 0.15, 0, 0.3, 0][n - 1];
  const equilibre = n % 3 !== 0; // un tiers des parties en tirage uniforme pur
  let e = etatInitial();
  const retires: Retires = { hote: 0, invite: 0 };
  let plies = 0;
  while (!e.verdict && plies < MAX_PLIES) {
    const legaux = coupsLegaux(e);
    if (legaux.length === 0) { echecs.push(`partie ${n} ply ${plies} : aucun coup légal mais pas de verdict\n    ${dump(e)}`); break; }
    const vus = new Set<string>();
    for (const c of legaux) for (const g of genres(e, c)) vus.add(g);
    for (const g of vus) compteLegal[g]++;
    const ctx = `partie ${n} ply ${plies}`;
    const c = choisir(e, legaux, a, pCpu, equilibre, ctx);
    const apres = appliquerCoup(e, c);
    const gc = genres(e, c);
    invariants(e, c, apres, retires, `${ctx} ${coupEnTexte(c)}`);
    if (apres === e) break;
    for (const g of gc) compteJoue[g]++;
    e = apres;
    plies++;
  }
  pliesTotal += plies;
  const v = e.verdict ?? verdict(e);
  const fin = v ? (v.type === 'victoire' ? `victoire ${v.raison}` : `nulle ${v.raison}`) : `inachevée (${MAX_PLIES} demi-coups)`;
  fins[fin] = (fins[fin] ?? 0) + 1;
  console.log(`partie ${n}: ${plies} demi-coups, ${fin}, prises ${e.captures.hote}/${e.captures.invite}`);
}
console.log(`\n${NB_PARTIES} parties, ${pliesTotal} demi-coups, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log('fins :', JSON.stringify(fins));
console.log('\ngenre de coup'.padEnd(36) + 'légal (demi-coups)'.padEnd(20) + 'joué');
for (const g of GENRES) console.log(g.padEnd(35) + String(compteLegal[g]).padEnd(20) + compteJoue[g]);

// ── Les scénarios ciblés ────────────────────────────────────────────
type T = { x: number; y: number; type: TypeTuile; camp: Camp };
const h = (x: number, y: number, type: TypeTuile): T => ({ x, y, type, camp: 'hote' });
const g = (x: number, y: number, type: TypeTuile): T => ({ x, y, type, camp: 'invite' });
const textes = (e: EtatPaiSho) => new Set(coupsLegaux(e).map(coupEnTexte));
/** Cases d'arrivée des coups sans bonus d'une tuile. */
const arrivees = (e: EtatPaiSho, x: number, y: number) =>
  new Set(coupsLegaux(e).filter((c) => c.type === 'deplacer' && c.de === P(x, y) && !c.bonus).map((c) => (c as { a: Pt }).a));
const joue = (e: EtatPaiSho, t: string): EtatPaiSho => {
  const n = appliquerCoup(e, coupDepuisTexte(t));
  verifie(n !== e, `coup refusé : ${t}`);
  return n;
};
const a = (x: number, y: number) => P(x, y);

const scenarios: [string, () => void][] = [];
const scenario = (nom: string, f: () => void) => scenarios.push([nom, f]);

scenario('lotus : jardin rouge, jardin blanc, neutre, jamais une porte', () => {
  const c = arrivees(etatDepuis([h(0, 0, 'LOTUS')]), 0, 0);
  verifie(c.has(a(1, 1)), 'lotus vers jardin rouge (1,1)');
  verifie(c.has(a(-1, 1)) && c.has(a(1, -1)), 'lotus vers jardin blanc (-1,1) et (1,-1)');
  verifie(c.size === 12, `lotus au centre : 12 arrivées, trouvé ${c.size}`);
  const n = arrivees(etatDepuis([h(3, 3, 'LOTUS')]), 3, 3);
  verifie(n.has(a(4, 4)), 'lotus vers un point neutre pur (4,4)');
  verifie(n.has(a(2, 2)) && n.has(a(3, 4)) && n.has(a(0, 3)) === false, 'distance 2 seulement');
  const p = arrivees(etatDepuis([h(7, 1, 'LOTUS')]), 7, 1);
  verifie(!p.has(a(8, 0)), 'pas de lotus sur la porte (8,0)');
  verifie(p.has(a(7, 0)) && p.has(a(8, 1)), 'cases voisines de la porte permises');
  const ps = arrivees(etatDepuis([h(0, 6, 'LOTUS')]), 0, 6);
  verifie(!ps.has(a(0, 8)), 'pas de lotus sur la porte nord');
  verifie([...textes(etatDepuis([h(7, 1, 'LOTUS')]))].every((t) => !t.startsWith('7,1>8,0')), 'aucun coup, bonus compris, ne finit en porte');
  const n2 = joue(etatDepuis([h(3, 3, 'LOTUS')]), '3,3>4,4');
  verifie(tuileEn(n2, a(4, 4))?.type === 'LOTUS' && tuileEn(n2, a(3, 3)) === null, 'lotus déplacé');
});

scenario('lotus : harmonie avec la fleur adverse, créditée à l’adversaire', () => {
  const e = etatDepuis([h(0, 4, 'LOTUS'), g(5, 6, 'W4')]);
  const n = joue(e, '0,4>0,6');
  const hs = harmonies(n);
  verifie(hs.length === 1 && hs[0].camp === 'invite', 'harmonie lotus hôte + W4 invité : à l’invité');
  verifie(![...textes(e)].some((t) => t.startsWith('0,4>0,6+')), 'pas de bonus pour celui qui ne gagne pas l’harmonie');
  const propre = etatDepuis([h(0, 4, 'LOTUS'), h(5, 6, 'W4')]);
  verifie([...textes(propre)].some((t) => t.startsWith('0,4>0,6+')), 'bonus quand la fleur est la sienne');
  const duo = harmonies(etatDepuis([h(0, 6, 'LOTUS'), g(5, 6, 'W4'), h(-5, 6, 'R3')]));
  verifie(duo.length === 2 && duo.some((x) => x.camp === 'invite') && duo.some((x) => x.camp === 'hote'), 'un lotus, deux camps');
  verifie(harmonies(etatDepuis([h(0, 6, 'LOTUS'), g(5, 6, 'LOTUS')])).length === 0, 'deux lotus ne s’harmonisent pas');
  verifie(harmonies(etatDepuis([h(0, 6, 'ORCHIDEE'), h(5, 6, 'W4')])).length === 0, 'l’orchidée ne forme aucune harmonie');
});

scenario('ce qui bloque l’harmonie : rocher, roue, renouée, fleur adverse', () => {
  const ligne = [h(-3, 7, 'R3'), h(3, 7, 'R4')];
  verifie(harmonies(etatDepuis(ligne)).length === 1, 'témoin : une harmonie');
  for (const t of ['ROCHER', 'ROUE', 'RENOUEE'] as TypeTuile[]) {
    for (const camp of ['hote', 'invite'] as Camp[]) {
      verifie(harmonies(etatDepuis([...ligne, { x: 0, y: 7, type: t, camp }])).length === 0, `${t} (${camp}) entre les deux bloque`);
    }
  }
  verifie(harmonies(etatDepuis([...ligne, g(0, 7, 'R5')])).length === 0, 'une fleur adverse entre les deux bloque');
  verifie(harmonies(etatDepuis([...ligne, h(0, 7, 'R5')])).every((x) => x.camp === 'hote') && harmonies(etatDepuis([...ligne, h(0, 7, 'R5')])).length === 1,
    'une fleur à soi entre les deux bloque aussi (R4-R5 seulement)');
  verifie(harmonies(etatDepuis([...ligne, g(0, 7, 'LOTUS')])).length === 2, 'un lotus entre les deux : deux harmonies avec lui, aucune entre R3 et R4');
});

scenario('rocher : annule le long de sa rangée et de sa colonne', () => {
  const ligne = [h(-3, 7, 'R3'), h(3, 7, 'R4')];
  verifie(harmonies(etatDepuis([...ligne, g(-5, 7, 'ROCHER')])).length === 0, 'rocher sur la même rangée, hors segment');
  verifie(harmonies(etatDepuis([...ligne, h(5, 7, 'ROCHER')])).length === 0, 'rocher du même camp sur la rangée');
  verifie(harmonies(etatDepuis([...ligne, g(-5, 6, 'ROCHER')])).length === 1, 'rocher sur une autre rangée : sans effet');
  const col = [h(7, -3, 'R3'), h(7, 3, 'R4')];
  verifie(harmonies(etatDepuis(col)).length === 1, 'témoin colonne');
  verifie(harmonies(etatDepuis([...col, g(7, -5, 'ROCHER')])).length === 0, 'rocher sur la même colonne');
  verifie(harmonies(etatDepuis([...col, g(6, -5, 'ROCHER')])).length === 1, 'rocher sur une autre colonne : sans effet');
  verifie(conflits(etatDepuis([g(0, 3, 'ROCHER'), h(-3, 3, 'R3'), g(3, 3, 'W3')])).length === 0, 'le rocher entre bloque aussi le clash (ligne coupée)');
  const clash = conflits(etatDepuis([g(0, 5, 'ROCHER'), h(-3, 4, 'R3'), g(3, 4, 'W3')]));
  verifie(clash.length === 1, 'le rocher n’annule pas un clash (autre rangée)');
});

scenario('renouée : annule les harmonies de ses huit voisines', () => {
  const ligne = [h(-3, 7, 'R3'), h(3, 7, 'R4')];
  for (const [x, y] of [[4, 6], [4, 7], [2, 8], [-2, 6], [-4, 8]]) {
    verifie(harmonies(etatDepuis([...ligne, g(x, y, 'RENOUEE')])).length === 0, `renouée en ${x},${y} annule`);
  }
  verifie(harmonies(etatDepuis([...ligne, g(5, 5, 'RENOUEE')])).length === 1, 'renouée à deux cases : sans effet');
  verifie(harmonies(etatDepuis([...ligne, g(0, 6, 'RENOUEE')])).length === 1, 'renouée loin des deux tuiles, entre elles mais pas sur la ligne : sans effet');
});

scenario('roue : tourne les huit voisines en sens horaire, refusée près d’un rocher', () => {
  const base = [h(-3, 7, 'R3'), h(3, 6, 'R4'), g(-2, -2, 'R5'), h(-3, -1, 'R3')];
  const e = etatDepuis(base);
  const mv = '3,6>3,7';
  verifie(textes(e).has(`${mv}+ROUE@-2,-1`), 'roue légale en (-2,-1)');
  const n = joue(e, `${mv}+ROUE@-2,-1`);
  verifie(tuileEn(n, a(-3, -2))?.type === 'R5' && tuileEn(n, a(-2, -2)) === null, 'sud (-2,-2) passe au sud-ouest (-3,-2)');
  verifie(tuileEn(n, a(-3, 0))?.type === 'R3' && tuileEn(n, a(-3, -1)) === null, 'ouest (-3,-1) passe au nord-ouest (-3,0)');
  verifie(tuileEn(n, a(-2, -1))?.type === 'ROUE', 'la roue reste');
  verifie(n.reserve.hote.ROUE === 1, 'une roue de moins en réserve');
  const r = etatDepuis([...base, g(-1, 0, 'ROCHER')]);
  verifie(!textes(r).has(`${mv}+ROUE@-2,-1`), 'roue refusée à côté d’un rocher');
  verifie(textes(r).has(`${mv}+ROUE@-5,-1`) || [...textes(r)].some((t) => t.startsWith(`${mv}+ROUE@`)), 'ailleurs elle reste permise');
  const rr = etatDepuis([h(-3, 7, 'R3'), h(3, 6, 'R4'), g(-2, 0, 'R3')]);
  verifie(!textes(rr).has(`${mv}+ROUE@-1,0`), 'rotation qui pousse un rouge en jardin blanc : refusée');
  const porte = etatDepuis([h(-3, 7, 'R3'), h(3, 6, 'R4'), g(-1, 8, 'W3')]);
  verifie(!textes(porte).has(`${mv}+ROUE@0,7`), 'rotation qui pousse une tuile sur la porte : refusée');
  verifie(textes(etatDepuis([h(-3, 7, 'R3'), h(3, 6, 'R4')])).has(`${mv}+ROUE@0,6`), 'roue sans voisine : légale');
  const clashRot = etatDepuis([h(-3, 7, 'R3'), h(3, 6, 'R4'), g(-2, 3, 'W3'), h(-2, 1, 'R4')]);
  const t = [...textes(clashRot)].filter((x) => x.startsWith(`${mv}+ROUE@`));
  for (const x of t) verifie(conflits(joue(clashRot, x)).length === 0, `aucune roue ne crée de clash : ${x}`);
});

scenario('barque : pousse une fleur d’une case, retire l’accent visé avec elle-même', () => {
  const base = [h(-3, 7, 'R3'), h(3, 6, 'R4'), g(1, 0, 'W3')];
  const e = etatDepuis(base);
  const mv = '3,6>3,7';
  verifie(textes(e).has(`${mv}+BARQUE@1,0>1,-1`), 'barque sur W3 poussée en (1,-1) (jardin blanc)');
  verifie(!textes(e).has(`${mv}+BARQUE@1,0>1,1`), 'jamais vers un jardin rouge pour une fleur blanche');
  verifie(!textes(e).has(`${mv}+BARQUE@1,0>2,1`), 'jamais vers un jardin rouge (diagonale)');
  verifie(![...textes(e)].some((t) => t.startsWith(`${mv}+BARQUE@1,0>`) && /> ?-?\d+,-?\d+$/.test(t) && [...t.matchAll(/>(-?\d+),(-?\d+)/g)].some((m) => estPorte(a(+m[1], +m[2])))), 'jamais sur une porte');
  const n = joue(e, `${mv}+BARQUE@1,0>1,-1`);
  verifie(tuileEn(n, a(1, -1))?.type === 'W3' && tuileEn(n, a(1, -1))?.camp === 'invite', 'la fleur adverse est poussée');
  verifie(tuileEn(n, a(1, 0))?.type === 'BARQUE' && tuileEn(n, a(1, 0))?.camp === 'hote', 'la barque prend sa place');
  verifie(n.captures.hote === 0, 'la barque ne prend pas');
  // sur un accent : les deux quittent la partie
  const acc = etatDepuis([h(-3, 7, 'R3'), h(3, 6, 'R4'), g(0, 5, 'ROCHER')]);
  verifie(textes(acc).has(`${mv}+BARQUE@0,5`), 'barque sur un rocher légale');
  const m = joue(acc, `${mv}+BARQUE@0,5`);
  verifie(tuileEn(m, a(0, 5)) === null, 'la case est libre');
  verifie(!POINTS.some((i) => tuileEn(m, i)?.type === 'BARQUE' || tuileEn(m, i)?.type === 'ROCHER'), 'ni barque ni rocher sur le plateau');
  verifie(m.reserve.hote.BARQUE === 1 && m.reserve.invite.ROCHER === 1, 'les deux ont quitté la réserve pour de bon');
  // jamais un clash par la barque
  const clash = etatDepuis([h(-3, 7, 'R3'), h(3, 6, 'R4'), g(0, 3, 'R3'), g(-5, 2, 'W3')]);
  verifie(!textes(clash).has(`${mv}+BARQUE@0,3>0,2`), 'barque : pousser R3 en (0,2) créerait un clash avec W3 (-5,2)');
  verifie([...textes(clash)].some((t) => t.includes('+BARQUE@')), 'des barques restent possibles');
  for (const x of [...textes(clash)].filter((t) => t.includes('+BARQUE@'))) verifie(conflits(joue(clash, x)).length === 0, `barque sans clash : ${x}`);
});

scenario('orchidée sauvage : prend et se fait prendre; sans lotus en fleur, ni l’un ni l’autre', () => {
  const sauvage = etatDepuis([h(4, -5, 'ORCHIDEE'), h(-7, 2, 'LOTUS'), g(5, -6, 'R4'), g(4, -2, 'R3')]);
  verifie(arrivees(sauvage, 4, -5).has(a(5, -6)), 'orchidée sauvage prend une fleur');
  const prise = joue(sauvage, '4,-5>5,-6');
  verifie(tuileEn(prise, a(5, -6))?.type === 'ORCHIDEE' && prise.captures.hote === 1, 'prise faite');
  const contre = { ...sauvage, tour: 'invite' as Camp };
  verifie(arrivees(contre, 4, -2).has(a(4, -5)), 'fleur adverse prend l’orchidée sauvage');
  const lotusPrend = etatDepuis([h(4, -5, 'ORCHIDEE'), h(-7, 2, 'LOTUS'), g(4, -3, 'LOTUS')], 'invite');
  verifie(arrivees(lotusPrend, 4, -3).has(a(4, -5)), 'le lotus adverse peut prendre l’orchidée sauvage (choix du README)');
  const lotusProt = etatDepuis([h(4, -5, 'LOTUS'), g(5, -6, 'ORCHIDEE'), g(-7, 2, 'LOTUS')], 'invite');
  verifie(arrivees(lotusProt, 5, -6).has(a(4, -5)), 'orchidée sauvage prend le lotus');
  const calme = etatDepuis([h(4, -5, 'ORCHIDEE'), g(5, -6, 'R4'), g(4, -2, 'R3')]);
  verifie(!arrivees(calme, 4, -5).has(a(5, -6)), 'orchidée non sauvage : ne prend pas');
  verifie(!arrivees({ ...calme, tour: 'invite' }, 4, -2).has(a(4, -5)), 'orchidée non sauvage : ne se fait pas prendre par une fleur');
  const enPorte = etatDepuis([h(4, -5, 'ORCHIDEE'), h(8, 0, 'LOTUS'), g(5, -6, 'R4')]);
  verifie(!arrivees(enPorte, 4, -5).has(a(5, -6)), 'lotus en porte (en croissance) : l’orchidée n’est pas sauvage');
  const duel = etatDepuis([h(4, -5, 'ORCHIDEE'), g(4, -2, 'ORCHIDEE'), g(-7, 2, 'LOTUS')], 'invite');
  verifie(arrivees(duel, 4, -2).has(a(4, -5)), 'orchidée sauvage adverse prend une orchidée non sauvage');
});

// Référence §8 : « sans lotus en fleur, l'orchidée ne peut pas prendre ». Le moteur laisse pourtant une orchidée non sauvage prendre une orchidée sauvage.
scenario('orchidée non sauvage ne prend pas une orchidée sauvage (écart possible du moteur)', () => {
  const duel = etatDepuis([h(4, -5, 'ORCHIDEE'), g(4, -2, 'ORCHIDEE'), g(-7, 2, 'LOTUS')], 'hote');
  verifie(!arrivees(duel, 4, -5).has(a(4, -2)), 'l’orchidée non sauvage ne prend pas l’orchidée sauvage');
});

scenario('orchidée : piège les voisines, mais pas depuis une porte', () => {
  const e = etatDepuis([g(2, -6, 'ORCHIDEE'), h(3, -6, 'R5')]);
  verifie(tuilesPiegees(e).includes(a(3, -6)) && arrivees(e, 3, -6).size === 0, 'tuile piégée immobile');
  verifie(tuilesPiegees(etatDepuis([g(0, -8, 'ORCHIDEE'), h(1, -7, 'R5')])).length === 0, 'orchidée en porte : ne piège pas');
});

scenario('les deux accents d’un même type se jouent dans une même partie (deux rochers)', () => {
  const dep = [h(-3, 7, 'R3'), h(3, 6, 'R4'), h(7, -3, 'R3'), h(6, 3, 'R4'), g(-2, -2, 'R5')];
  let e = etatDepuis(dep);
  e = joue(e, '3,6>3,7+ROCHER@-6,-6');
  verifie(e.reserve.hote.ROCHER === 1, 'un rocher posé, un en réserve');
  e = joue(e, '-2,-2>-2,-3');
  verifie([...textes(e)].some((t) => t.startsWith('6,3>7,3+ROCHER@')), 'le second rocher est offert');
  e = joue(e, '6,3>7,3+ROCHER@-6,-4');
  verifie(e.reserve.hote.ROCHER === 0 && POINTS.filter((i) => tuileEn(e, i)?.type === 'ROCHER').length === 2, 'deux rochers sur le plateau');
  e = joue(e, '-2,-3>-2,-2');
  verifie(![...textes(e)].some((t) => t.includes('+ROCHER@')), 'plus de troisième rocher');
});

scenario('bonus d’harmonie : offert quand le coup libère deux fleurs; pas pour une glissade', () => {
  const e = etatDepuis([h(-3, 7, 'R3'), h(0, 7, 'R5'), h(3, 7, 'R4'), g(0, 0, 'ROCHER')]);
  verifie([...textes(e)].some((t) => t.startsWith('0,7>0,6+')), 'R5 qui s’écarte libère R3-R4 : bonus offert');
  verifie(![...textes(e)].some((t) => t.startsWith('0,7>1,7+')), 'R5 qui glisse sur la même ligne : pas de bonus');
  const n = joue(e, '0,7>0,6+RENOUEE@6,-6');
  verifie(tuileEn(n, a(6, -6))?.type === 'RENOUEE', 'bonus joué');
});

scenario('prise : atterrir sur la fleur qui ferait clash', () => {
  const e = etatDepuis([h(4, -5, 'R3'), g(5, -6, 'W3'), g(5, -3, 'R4'), g(3, -4, 'W3')]);
  verifie(arrivees(e, 4, -5).has(a(5, -6)), 'R3 prend W3');
  verifie(!arrivees(e, 4, -5).has(a(5, -3)), 'R3 ne prend pas R4 (pas de clash entre elles)');
  const n = joue(e, '4,-5>5,-6');
  verifie(tuileEn(n, a(5, -6))?.type === 'R3' && tuileEn(n, a(5, -6))?.camp === 'hote' && n.captures.hote === 1, 'prise, compteur à 1');
  verifie(n.reserve.invite.W3 === 1, 'la tuile prise ne retourne pas en réserve');
  const ma = etatDepuis([h(4, -5, 'R3'), g(5, -6, 'W3'), g(5, 2, 'W3')]);
  verifie(!arrivees(ma, 4, -5).has(a(5, -6)), 'une prise qui laisserait un autre clash est illégale (W3 (5,2) sur la colonne)');
  const porte = etatDepuis([h(6, 1, 'R3'), g(8, 0, 'W3')]);
  verifie(!arrivees(porte, 6, 1).has(a(8, 0)), 'tuile en porte imprenable');
});

scenario('chaque bonus se joue au moins une fois : lotus, orchidée, fleur de base, rocher, renouée, roue, barque', () => {
  const dep = [h(-3, 7, 'R3'), h(3, 6, 'R4'), g(1, 0, 'W3'), g(0, 5, 'ROCHER')];
  const e = etatDepuis(dep);
  const mv = '3,6>3,7';
  const essais: [string, (n: EtatPaiSho) => boolean][] = [
    ['+LOTUS@8,0', (n) => tuileEn(n, a(8, 0))?.type === 'LOTUS'],
    ['+ORCHIDEE@0,-8', (n) => tuileEn(n, a(0, -8))?.type === 'ORCHIDEE'],
    ['+W5@-8,0', (n) => tuileEn(n, a(-8, 0))?.type === 'W5' && n.reserve.hote.W5 === 2],
    ['+ROCHER@5,5', (n) => tuileEn(n, a(5, 5))?.type === 'ROCHER'],
    ['+RENOUEE@5,5', (n) => tuileEn(n, a(5, 5))?.type === 'RENOUEE'],
    ['+ROUE@5,5', (n) => tuileEn(n, a(5, 5))?.type === 'ROUE'],
    ['+BARQUE@1,0>1,-1', (n) => tuileEn(n, a(1, 0))?.type === 'BARQUE'],
    ['+BARQUE@0,5', (n) => tuileEn(n, a(0, 5)) === null],
  ];
  for (const [b, ok] of essais) { const n = joue(e, mv + b); verifie(ok(n), `effet de ${b}`); verifie(n.tour === 'invite', `${b} passe la main`); }
  for (const p of ['8,0', '-8,0', '0,8', '0,-8']) verifie(textes(e).has(`${mv}+LOTUS@${p}`), `lotus plantable en porte ouverte ${p}`);
  const pleine = etatDepuis([...dep, g(8, 0, 'R3')]);
  verifie(!textes(pleine).has(`${mv}+LOTUS@8,0`) && textes(pleine).has(`${mv}+LOTUS@-8,0`), 'porte occupée : refusée, les autres restent');
});

for (const [nom, f] of scenarios) {
  try { f(); console.log(`ok   ${nom}`); } catch (err) { echecs.push(`scénario « ${nom} » : ${(err as Error).message}`); console.log(`ÉCHEC ${nom} : ${(err as Error).message}`); }
}

console.log(`\n${controles} contrôles, ${echecs.length} échec(s)`);
for (const m of echecs.slice(0, 40)) console.log('  - ' + m);
// Pas de types Node dans ce tsconfig : la sortie se fait par une exception, comme logic.test.ts.
if (echecs.length) throw new Error(`${echecs.length} échec(s)`);
