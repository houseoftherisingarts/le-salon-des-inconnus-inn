// ─── Les tests des règles du Pai Sho ────────────────────────────────
// Sans cadre de test : des assertions, un compteur, et un code de sortie
// non nul au premier échec (l'exception remonte jusqu'à node). Lancer avec `npm test` depuis apps/pai-sho.

import {
  ACCENTS, CONFLIT_PAIRE, HARMONIE_PAIRE, anneauHarmonie, conflits, coupDepuisTexte, coupEnTexte,
  coupsIA, coupsLegaux, etatDepuis, etatInitial, harmonies, harmoniesMedianes, jouer, tuileEn,
  tuilesPiegees, verdict, type Camp, type Coup, type EtatPaiSho, type TypeTuile,
} from './logic';
import { appliquerCoup, coupLegal, texteVerdict } from './arbitre';
import { adaptateurPaiSho } from './cpu';
import { POINTS, PORTES, ZONES, PORTE, coordX, coordY, estPorte, indice, zone } from './plateau';
import { choisirAuNiveau, reflechir, type Niveau } from '../moteur/niveaux';
import { graine, piocher } from '../moteur/hasard';

let ok = 0;
function verifie(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`ÉCHEC : ${msg}`);
  ok++;
}
const P = indice;
type T = { x: number; y: number; type: TypeTuile; camp: Camp };
const h = (x: number, y: number, type: TypeTuile): T => ({ x, y, type, camp: 'hote' });
const g = (x: number, y: number, type: TypeTuile): T => ({ x, y, type, camp: 'invite' });
const simples = (e: EtatPaiSho, de: number) =>
  coupsLegaux(e).filter((c): c is Extract<Coup, { type: 'deplacer' }> => c.type === 'deplacer' && c.de === de && !c.bonus);
const vers = (e: EtatPaiSho, de: number) => new Set(simples(e, de).map((c) => c.a));

// ── Le plateau ──────────────────────────────────────────────────────
verifie(POINTS.length === 249, '249 points jouables');
const compte: Record<string, number> = {};
for (const i of POINTS) { const z = zone(coordX(i), coordY(i)); compte[z] = (compte[z] ?? 0) + 1; }
verifie(compte.rouge === 30 && compte.blanc === 30 && compte.porte === 4 && compte.centre === 1 && compte.neutre === 184,
  `comptes de zones ${JSON.stringify(compte)}`);
verifie(POINTS.filter((i) => ZONES[i] === 4).length === 132, '132 points neutres purs');
verifie(PORTES.map((p) => `${coordX(p)},${coordY(p)}`).join(' ') === '0,8 8,0 0,-8 -8,0', 'les quatre portes');
verifie(PORTES.every((p) => ZONES[p] === PORTE) && !estPorte(P(0, 0)), 'pas de porte au centre');

// ── Les paires ──────────────────────────────────────────────────────
verifie(HARMONIE_PAIRE('R3', 'W5') && HARMONIE_PAIRE('R5', 'W3') && !HARMONIE_PAIRE('R3', 'R5'), 'cercle d’harmonie');
verifie(CONFLIT_PAIRE('R3', 'W3') && CONFLIT_PAIRE('W4', 'R4') && !CONFLIT_PAIRE('R3', 'W4'), 'paires en clash');
verifie(HARMONIE_PAIRE('LOTUS', 'W4') && !HARMONIE_PAIRE('LOTUS', 'LOTUS') && !HARMONIE_PAIRE('ORCHIDEE', 'R3'), 'lotus');

// ── L'ouverture ─────────────────────────────────────────────────────
{
  const e0 = etatInitial();
  const c0 = coupsLegaux(e0);
  verifie(c0.length === 6 && c0.every((c) => c.type === 'planter' && c.porte === P(0, -8)), 'l’hôte plante au sud');
  const e1 = jouer(e0, { type: 'planter', tuile: 'W4', porte: P(0, -8) });
  const c1 = coupsLegaux(e1);
  verifie(c1.length === 1 && coupEnTexte(c1[0]) === 'W4@0,8', 'l’invité plante la même fleur en face');
  const e2 = jouer(e1, c1[0]);
  verifie(e2.tour === 'hote' && e2.reserve.hote.W4 === 2, 'puis la main revient à l’hôte');
  verifie(coupsLegaux(e2).filter((c) => c.type === 'planter').length === 5 * 2 + 2, 'plantations : 6 types x 2 portes ouvertes');
  verifie(!coupLegal(e2, { type: 'planter', tuile: 'R3', porte: P(0, 8) }), 'porte occupée');
  verifie(appliquerCoup(e2, { type: 'planter', tuile: 'R3', porte: P(0, 8) }) === e2, 'l’arbitre refuse');
}

// ── Le mouvement ────────────────────────────────────────────────────
{
  const lotus = etatDepuis([h(0, 0, 'LOTUS')]);
  verifie(vers(lotus, P(0, 0)).size === 12, 'lotus : 2 pas');
  const orch = etatDepuis([h(0, 0, 'ORCHIDEE')]);
  verifie(vers(orch, P(0, 0)).size === 84, 'orchidée : 6 pas');
  const r3 = etatDepuis([h(0, 0, 'R3')]);
  const d = vers(r3, P(0, 0));
  verifie(d.size === 18, `rose : 3 pas hors jardins blancs (${d.size})`);
  verifie(!d.has(P(1, -1)) && d.has(P(1, 1)), 'rouge jamais en jardin blanc pur');
  const w3 = etatDepuis([h(0, 0, 'W3')]);
  verifie(!vers(w3, P(0, 0)).has(P(1, 1)) && vers(w3, P(0, 0)).has(P(1, -1)), 'blanc jamais en jardin rouge pur');
  const bloque = etatDepuis([h(0, 0, 'R3'), h(1, 0, 'R3'), h(-1, 0, 'R3'), h(0, 1, 'R3')]);
  verifie(vers(bloque, P(0, 0)).size === 6, 'chemin bloqué : on ne saute pas');
  const porte = etatDepuis([h(1, 7, 'R5')]);
  const dp = vers(porte, P(1, 7));
  verifie(!dp.has(P(0, 8)) && dp.has(P(-1, 8)), 'on traverse une porte vide sans s’y arrêter');
}

// ── Le clash ────────────────────────────────────────────────────────
{
  const e = etatDepuis([g(5, 5, 'W3'), h(2, 4, 'R3')]);
  verifie(!vers(e, P(2, 4)).has(P(2, 5)) && vers(e, P(2, 4)).has(P(1, 4)), 'un coup qui crée un clash est illégal');
  const piege = etatDepuis([h(-6, 5, 'R3'), g(6, 5, 'W3'), h(0, 5, 'R4')]);
  const v = vers(piege, P(0, 5));
  verifie(!v.has(P(0, 4)) && v.has(P(1, 5)), 'quitter une ligne qui découvre un clash est illégal');
}

// ── La prise ────────────────────────────────────────────────────────
{
  const e = etatDepuis([h(4, -5, 'R3'), g(5, -6, 'W3')]);
  const prise = simples(e, P(4, -5)).find((c) => c.a === P(5, -6));
  verifie(prise, 'la rose prend le jasmin en se posant dessus');
  const apres = jouer(e, prise!);
  verifie(tuileEn(apres, P(5, -6))?.type === 'R3' && apres.captures.hote === 1, 'la prise est faite');
  const enPorte = etatDepuis([h(6, 1, 'R3'), g(8, 0, 'W3')]);
  verifie(!vers(enPorte, P(6, 1)).has(P(8, 0)), 'une tuile en porte est imprenable');
  const lotus = etatDepuis([h(4, -5, 'R3'), g(5, -6, 'LOTUS')]);
  verifie(!vers(lotus, P(4, -5)).has(P(5, -6)), 'le lotus est imprenable par une fleur de base');
  const sauvage = etatDepuis([h(4, -5, 'ORCHIDEE'), h(-7, 2, 'LOTUS'), g(5, -6, 'LOTUS')]);
  verifie(vers(sauvage, P(4, -5)).has(P(5, -6)), 'l’orchidée sauvage prend le lotus');
  const sage = etatDepuis([h(4, -5, 'ORCHIDEE'), g(5, -6, 'R4')]);
  verifie(!vers(sage, P(4, -5)).has(P(5, -6)), 'sans lotus, l’orchidée ne prend rien');
}

// ── L'harmonie ──────────────────────────────────────────────────────
{
  const e = etatDepuis([h(-3, 7, 'R3'), h(3, 7, 'R4'), h(7, -3, 'R3'), h(7, 3, 'W5')]);
  verifie(harmonies(e).length === 2 && harmonies(e).every((x) => x.camp === 'hote'), 'harmonies en ligne et en colonne');
  verifie(harmonies(etatDepuis([h(-3, 7, 'R3'), g(0, 7, 'R5'), h(3, 7, 'R4')])).length === 0, 'une tuile entre deux bloque');
  verifie(harmonies(etatDepuis([h(-3, 7, 'R3'), g(3, 7, 'R4')])).length === 0, 'pas d’harmonie entre camps');
  const lot = harmonies(etatDepuis([h(-3, 7, 'R3'), h(0, 7, 'LOTUS'), g(3, 7, 'W3')]));
  verifie(lot.length === 2 && lot.some((x) => x.camp === 'invite') && lot.some((x) => x.camp === 'hote'),
    'le lotus s’harmonise avec tous, l’harmonie va au propriétaire de la fleur');
  verifie(harmonies(etatDepuis([h(-3, 7, 'R3'), h(3, 7, 'R4'), g(-5, 7, 'ROCHER')])).length === 0, 'le rocher annule sa ligne');
  verifie(harmonies(etatDepuis([h(-3, 7, 'R3'), h(3, 7, 'R4'), g(4, 6, 'RENOUEE')])).length === 0, 'la renouée annule autour d’elle');
  verifie(harmonies(etatDepuis([h(-3, 8 - 1, 'R3'), h(0, 8, 'R4')])).length === 0, 'une tuile en porte ne s’harmonise pas');
}

// ── Le bonus d'harmonie ─────────────────────────────────────────────
{
  const e = etatDepuis([h(-3, 7, 'R3'), h(3, 6, 'R4')]);
  const bon = coupsLegaux(e).filter((c) => c.type === 'deplacer' && c.de === P(3, 6) && c.a === P(3, 7) && c.bonus);
  const par = (t: string) => bon.filter((c) => c.type === 'deplacer' && c.bonus!.type === t).length;
  verifie(par('special') === 8 && par('base') === 24, `bonus spéciaux et de base (${par('special')}, ${par('base')})`);
  const vides = POINTS.filter((i) => !estPorte(i)).length - 2;
  verifie(bon.filter((c) => c.type === 'deplacer' && c.bonus!.type === 'accent' && c.bonus!.tuile === 'ROCHER').length === vides,
    'le rocher se pose sur toute case libre');
  verifie(!coupsLegaux(e).some((c) => c.type === 'deplacer' && c.de === P(3, 6) && c.a === P(2, 6) && c.bonus),
    'pas de bonus sans harmonie nouvelle');
  const glisse = etatDepuis([h(-3, 7, 'R3'), h(3, 7, 'R4')]);
  verifie(!coupsLegaux(glisse).some((c) => c.type === 'deplacer' && c.de === P(3, 7) && c.a === P(4, 7) && c.bonus),
    'glisser le long d’une harmonie déjà là ne donne rien');
  const enPorte = etatDepuis([h(-3, 7, 'R3'), h(3, 6, 'R4'), h(8, 0, 'W4')]);
  verifie(!coupsLegaux(enPorte).some((c) => c.type === 'deplacer' && c.bonus?.type === 'base'), 'pas de fleur de base avec une tuile en porte');
  const avec = jouer(e, { type: 'deplacer', de: P(3, 6), a: P(3, 7), bonus: { type: 'base', tuile: 'W5', porte: P(8, 0) } });
  verifie(tuileEn(avec, P(8, 0))?.type === 'W5' && avec.reserve.hote.W5 === 2, 'bonus de base planté');
  const deblocage = etatDepuis([h(-3, 7, 'R3'), h(0, 7, 'W3'), h(3, 7, 'R4')]);
  verifie(coupsLegaux(deblocage).some((c) => c.type === 'deplacer' && c.de === P(0, 7) && c.a === P(0, 6) && c.bonus),
    'libérer une ligne entre deux de ses fleurs crée une harmonie');
}

// ── L'orchidée ──────────────────────────────────────────────────────
{
  const e = etatDepuis([g(2, -6, 'ORCHIDEE'), h(3, -6, 'R5')]);
  verifie(tuilesPiegees(e).includes(P(3, -6)) && simples(e, P(3, -6)).length === 0, 'l’orchidée piège ses voisines');
  const enPorte = etatDepuis([g(0, -8, 'ORCHIDEE'), h(1, -7, 'R5')]);
  verifie(tuilesPiegees(enPorte).length === 0, 'une orchidée en porte ne piège pas');
}

// ── Les accents ─────────────────────────────────────────────────────
{
  const base = etatDepuis([h(-3, 7, 'R3'), h(3, 6, 'R4'), g(-2, -2, 'R5'), g(5, -3, 'W4'), g(1, 0, 'R5')]);
  const mv = { type: 'deplacer' as const, de: P(3, 6), a: P(3, 7) };
  const legaux = coupsLegaux(base).map(coupEnTexte);
  const roc = jouer(base, { ...mv, bonus: { type: 'accent', tuile: 'ROCHER', a: P(0, 5) } });
  verifie(tuileEn(roc, P(0, 5))?.type === 'ROCHER' && roc.reserve.hote.ROCHER === 0, 'le rocher est posé');
  verifie(harmonies(jouer(base, { ...mv, bonus: { type: 'accent', tuile: 'ROCHER', a: P(6, 7) } })).length === 0, 'le rocher posé annule');
  verifie(harmonies(jouer(base, { ...mv, bonus: { type: 'accent', tuile: 'RENOUEE', a: P(-4, 6) } })).length === 0, 'la renouée posée annule');
  // La roue en (-2,-1) : la rose d'en face en (-2,-2), au sud, passe au sud-ouest (-3,-2).
  verifie(legaux.includes('3,6>3,7+ROUE@-2,-1'), 'roue légale');
  const roue = jouer(base, { ...mv, bonus: { type: 'accent', tuile: 'ROUE', a: P(-2, -1) } });
  verifie(tuileEn(roue, P(-3, -2))?.type === 'R5' && tuileEn(roue, P(-2, -2)) === null, 'la roue tourne dans le sens horaire');
  // Une roue au centre pousserait la fleur rouge de (1,0) en (1,-1), jardin blanc pur.
  verifie(!legaux.includes('3,6>3,7+ROUE@0,0'), 'la roue ne pousse pas une rouge en jardin blanc');
  const avecRocher = etatDepuis([h(-3, 7, 'R3'), h(3, 6, 'R4'), g(-2, -2, 'R5'), g(0, 0, 'ROCHER')]);
  verifie(!coupsLegaux(avecRocher).map(coupEnTexte).includes('3,6>3,7+ROUE@-1,-1'), 'pas de roue à côté d’un rocher');
  const barque = jouer(base, { ...mv, bonus: { type: 'accent', tuile: 'BARQUE', a: P(5, -3), vers: P(6, -3) } });
  verifie(tuileEn(barque, P(5, -3))?.type === 'BARQUE' && tuileEn(barque, P(6, -3))?.type === 'W4', 'la barque pousse une fleur');
  verifie(legaux.includes('3,6>3,7+BARQUE@5,-3>6,-3'), 'barque légale');
  const surAccent = etatDepuis([h(-3, 7, 'R3'), h(3, 6, 'R4'), g(0, -5, 'RENOUEE')]);
  verifie(coupsLegaux(surAccent).map(coupEnTexte).includes('3,6>3,7+BARQUE@0,-5'), 'barque sur un accent');
  const retire = jouer(surAccent, { ...mv, bonus: { type: 'accent', tuile: 'BARQUE', a: P(0, -5) } });
  verifie(tuileEn(retire, P(0, -5)) === null && retire.reserve.hote.BARQUE === 0, 'barque et accent quittent la partie');
}

// ── L'anneau ────────────────────────────────────────────────────────
{
  const carre = [h(-3, 3, 'R3'), h(3, 3, 'R4'), h(3, -3, 'R3'), h(-3, -3, 'R4')];
  verifie(anneauHarmonie(etatDepuis(carre), 'hote') && !anneauHarmonie(etatDepuis(carre), 'invite'), 'anneau autour du centre');
  verifie(!anneauHarmonie(etatDepuis([h(-3, 0, 'R3'), h(3, 0, 'R4'), h(3, 4, 'R3'), h(-3, 4, 'R4')]), 'hote'), 'un côté qui passe sur le centre');
  verifie(!anneauHarmonie(etatDepuis([h(0, 0, 'R3'), h(4, 0, 'R4'), h(4, 4, 'R3'), h(0, 4, 'R4')]), 'hote'), 'une tuile sur le centre');
  verifie(!anneauHarmonie(etatDepuis([h(1, 1, 'R3'), h(5, 1, 'R4'), h(5, 5, 'R3'), h(1, 5, 'R4')]), 'hote'), 'un anneau à côté du centre');
  const six = [h(-3, 3, 'R3'), h(0, 3, 'R4'), h(0, 5, 'R3'), h(4, 5, 'R4'), h(4, -2, 'R3'), h(-3, -2, 'R4')];
  verifie(anneauHarmonie(etatDepuis(six), 'hote'), 'anneau de six tuiles, non rectangulaire');
  const ouverte = [...six.slice(0, 5), h(-3, -2, 'R3')];
  verifie(!anneauHarmonie(etatDepuis(ouverte), 'hote'), 'chaîne ouverte : pas d’anneau');
  const presque = etatDepuis([h(-3, 3, 'R3'), h(3, 3, 'R4'), h(3, -3, 'R3'), h(-4, -3, 'R4')]);
  const fin = simples(presque, P(-4, -3)).find((c) => c.a === P(-3, -3));
  verifie(fin, 'le coup qui ferme l’anneau existe');
  const gagne = jouer(presque, fin!);
  verifie(gagne.verdict?.type === 'victoire' && gagne.verdict.camp === 'hote' && gagne.verdict.raison === 'anneau', 'l’anneau gagne');
  verifie(texteVerdict(gagne.verdict, true)!.includes('anneau'), 'phrase du verdict');
  verifie(coupsLegaux(gagne).length === 0, 'plus aucun coup après la victoire');
}

// ── La fin par la dernière fleur ────────────────────────────────────
{
  const e = etatDepuis([h(-3, 7, 'R3'), h(3, 7, 'R4'), g(-5, -5, 'W3')]);
  const r = { ...e.reserve.hote, R3: 1, R4: 0, R5: 0, W3: 0, W4: 0, W5: 0 };
  const dernier = { ...e, reserve: { ...e.reserve, hote: r } };
  verifie(harmoniesMedianes(dernier, 'hote') === 1 && harmoniesMedianes(dernier, 'invite') === 0, 'médianes comptées');
  const fin = jouer(dernier, { type: 'planter', tuile: 'R3', porte: P(8, 0) });
  verifie(fin.verdict?.type === 'victoire' && fin.verdict.camp === 'hote' && fin.verdict.raison === 'medianes', 'la dernière fleur départage');
  const egal = jouer({ ...dernier, cases: etatDepuis([g(-5, -5, 'W3')]).cases }, { type: 'planter', tuile: 'R3', porte: P(8, 0) });
  verifie(egal.verdict?.type === 'nulle' && egal.verdict.raison === 'medianes', 'égalité aux médianes : nulle');
}

// ── Parties au hasard : aller-retour du texte et contrôles croisés ──
let milieu: EtatPaiSho | null = null;
{
  const alea = graine(7);
  for (let partie = 0; partie < 4; partie++) {
    let e = etatInitial();
    for (let k = 0; k < 70 && !e.verdict; k++) {
      const tous = coupsLegaux(e);
      if (tous.length === 0) break;
      for (const c of tous) verifie(coupEnTexte(coupDepuisTexte(coupEnTexte(c))) === coupEnTexte(c), `aller-retour ${coupEnTexte(c)}`);
      // L'IA voit tous les coups sans bonus, et seulement des coups légaux.
      const noms = new Set(tous.map(coupEnTexte));
      const ia = coupsIA(e);
      verifie(ia.every((c) => noms.has(coupEnTexte(c))), 'les coups de l’IA sont légaux');
      verifie(tous.filter((c) => c.type === 'planter' || !c.bonus).length === ia.filter((c) => c.type === 'planter' || !c.bonus).length,
        'l’IA voit chaque coup sans bonus');
      // Le bonus est offert exactement quand le calcul complet voit une harmonie nouvelle.
      const avant = harmonies(e);
      for (const c of tous) {
        if (c.type !== 'deplacer' || c.bonus) continue;
        const apres = harmonies(jouer(e, c));
        const cle = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
        const anciennes = new Set(avant.filter((x) => x.camp === e.tour).map((x) => cle(x.a === c.de ? c.a : x.a, x.b === c.de ? c.a : x.b)));
        const neuve = apres.some((x) => x.camp === e.tour && !anciennes.has(cle(x.a, x.b)));
        const offert = tous.some((d) => d.type === 'deplacer' && d.de === c.de && d.a === c.a && d.bonus);
        // Rocher et renouée se posent toujours quelque part : tant que l'un
        // des deux reste en main, une harmonie nouvelle offre un bonus.
        const toujours = e.reserve[e.tour].ROCHER > 0 || e.reserve[e.tour].RENOUEE > 0;
        verifie(offert ? neuve : !(neuve && toujours), `bonus cohérent pour ${coupEnTexte(c)}`);
      }
      const c = piocher(alea, tous);
      e = appliquerCoup(e, c);
      verifie(conflits(e).length === 0, 'jamais de clash sur le plateau');
      if (partie === 0 && k === 40) milieu = e;
    }
  }
}

// ── La machine ──────────────────────────────────────────────────────
{
  const a = adaptateurPaiSho();
  const m = milieu!;
  const n = 2000;
  const t0 = performance.now();
  let total = 0;
  for (let i = 0; i < n; i++) total += a.coups(m).length;
  const msCoups = (performance.now() - t0) / n;
  console.log(`coups() milieu de partie : ${(total / n).toFixed(0)} coups en ${msCoups.toFixed(3)} ms`);
  const t1 = performance.now();
  const r = reflechir(a, m, 10, { noeudsMax: 60_000 });
  const ms = performance.now() - t1;
  console.log(`recherche : ${r.noeuds} nœuds, profondeur ${r.profondeur}, ${Math.round(r.noeuds / (ms / 1000))} nœuds/s`);
  const t2 = performance.now();
  const r10 = reflechir(a, m, 10);
  console.log(`niveau 10 : ${Math.round(performance.now() - t2)} ms, profondeur ${r10.profondeur}`);
  verifie(performance.now() - t2 < 2600 + 400, 'le niveau 10 tient son horloge');
  const t3 = performance.now();
  choisirAuNiveau(a, m, 1, { alea: graine(1) });
  console.log(`niveau 1 : ${Math.round(performance.now() - t3)} ms`);

  for (const niveau of [3, 8] as Niveau[]) {
    let e = etatInitial();
    const alea = graine(niveau);
    const debut = performance.now();
    while (!e.verdict) {
      const c = choisirAuNiveau(a, e, niveau, { alea });
      if (!c) break;
      const suivant = appliquerCoup(e, c);
      verifie(suivant !== e, `coup de la machine légal : ${coupEnTexte(c)}`);
      e = suivant;
    }
    const v = verdict(e);
    verifie(v !== null, `partie niveau ${niveau} terminée`);
    console.log(`niveau ${niveau} contre lui-même : ${e.numero} demi-coups, ${Math.round((performance.now() - debut) / 1000)} s, ${texteVerdict(v, true)}`);
  }
}

verifie(ACCENTS.length === 4, 'quatre accents');
console.log(`Toutes les assertions passent : ${ok}.`);
