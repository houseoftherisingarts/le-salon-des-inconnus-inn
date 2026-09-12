// Boucle verdict du Creator Studio : captures 1440 et 390 de chaque scénario à trois
// profondeurs, avec connexion d'un compte témoin quand le scénario le demande, clics
// sur des onglets, erreurs console, débordement horizontal, lignes du h1, tirets longs,
// italiques. Le mobile est un VRAI viewport émulé (isMobile, deviceScaleFactor 3).
//
// Usage : node scripts/qa/captures-studio.mjs <baseUrl> <dossierSortie> [scénarios séparés par des virgules]
// Compte témoin : variables TEMOIN_EMAIL et TEMOIN_PW (fichier temoins.env du scratchpad).
// Scénarios : voir SCENARIOS ci-dessous (nom, adresse, connexion, clics à faire avant la capture).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://localhost:4272';
const OUT = process.argv[3] || 'scratch/captures-studio';
const FILTRE = process.argv[4] ? process.argv[4].split(',') : null;
mkdirSync(OUT, { recursive: true });

const EMAIL = process.env.TEMOIN_EMAIL || '';
const PW = process.env.TEMOIN_PW || '';
const SLUG_PEINTRE = process.env.SLUG_PEINTRE || 'temoin-peintre';
const SLUG_MUSICIEN = process.env.SLUG_MUSICIEN || 'temoin-musicien';
const UID_VISITEUR = process.env.UID_VISITEUR || '';

// Un clic se décrit par un texte visible (bouton ou onglet) ou par un sélecteur CSS (préfixe css:).
const SCENARIOS = [
  { nom: 'porte', url: '/createur', connexion: false },
  { nom: 'mur', url: '/createur', connexion: true, clics: ['LE MUR'] },
  { nom: 'profil', url: '/createur', connexion: true, clics: ['PROFIL'] },
  { nom: 'profil-amis', url: '/createur', connexion: true, clics: ['PROFIL', 'Mes amis'] },
  { nom: 'profil-pro-admin', url: '/createur', connexion: true, clics: ['PROFIL', 'Profil Pro'] },
  { nom: 'membre', url: UID_VISITEUR ? `/membre/${UID_VISITEUR}` : '/membre/inconnu', connexion: true },
  { nom: 'peintre', url: `/${SLUG_PEINTRE}`, connexion: false },
  { nom: 'musicien', url: `/${SLUG_MUSICIEN}`, connexion: false },
  { nom: 'introuvable', url: '/slug-qui-n-existe-pas-du-tout', connexion: false },
].filter((s) => !FILTRE || FILTRE.includes(s.nom));

const SCROLLS = [0, 0.5, 1];
const rapport = { base: BASE, erreurs: [], pages: [] };

const defiler = (f) => {
  const cands = [...document.querySelectorAll('*')].filter((e) => {
    const st = getComputedStyle(e);
    return /(auto|scroll)/.test(st.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 200;
  }).sort((a, b) => b.clientHeight - a.clientHeight);
  const el = cands[0];
  if (el) el.scrollTop = (el.scrollHeight - el.clientHeight) * f;
  else window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f);
};

async function mesurer(page, nom, largeur) {
  const m = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    let lignesH1 = 0;
    if (h1) {
      const lh = parseFloat(getComputedStyle(h1).lineHeight) || parseFloat(getComputedStyle(h1).fontSize) * 1.2;
      lignesH1 = Math.round(h1.getBoundingClientRect().height / lh);
    }
    const visibles = [...document.querySelectorAll('body *')].filter((e) => e.getClientRects().length && (e.textContent || '').trim());
    const debordants = visibles.filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed').length;
    const italiques = visibles.filter((e) => getComputedStyle(e).fontStyle === 'italic').length;
    const petits = visibles.filter((e) => e.children.length === 0 && parseFloat(getComputedStyle(e).fontSize) < 11).length;
    return {
      titre: document.title,
      h1: h1 ? h1.innerText.replace(/\n/g, ' / ').slice(0, 120) : null,
      lignesH1,
      debordement: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      debordants,
      tirets: (document.body.innerText.match(/—/g) || []).length,
      italiques,
      petits,
      jaune: document.body.innerHTML.includes('#d4af37') ? 1 : 0,
    };
  });
  rapport.pages.push({ nom, largeur, ...m });
}

async function connecter(page) {
  if (!EMAIL || !PW) { rapport.erreurs.push('connexion demandée sans TEMOIN_EMAIL / TEMOIN_PW'); return false; }
  const email = page.locator('input[type="email"]').first();
  if (!(await email.count())) return true; // déjà connecté (aucune porte affichée)
  // La porte peut ouvrir en mode inscription : on bascule vers la connexion si le bouton existe.
  const versConnexion = page.getByRole('button', { name: /^(Se connecter|Connexion|Sign in|J'ai déjà un compte|Already have an account)/i }).first();
  if (await versConnexion.count()) { try { await versConnexion.click({ timeout: 2000 }); } catch {} }
  await email.fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PW);
  const bouton = page.locator('form button[type="submit"]').first();
  if (await bouton.count()) await bouton.click();
  else await page.locator('input[type="password"]').first().press('Enter');
  try { await page.locator('input[type="password"]').first().waitFor({ state: 'detached', timeout: 20000 }); } catch { rapport.erreurs.push(`connexion : la porte est restée affichée sur ${page.url()}`); return false; }
  await page.waitForTimeout(2500);
  return true;
}

async function cliquer(page, cible) {
  if (cible.startsWith('css:')) return page.locator(cible.slice(4)).first().click({ timeout: 8000 });
  const parRole = page.getByRole('button', { name: cible, exact: false }).first();
  if (await parRole.count()) return parRole.click({ timeout: 8000 });
  const parTab = page.getByRole('tab', { name: cible, exact: false }).first();
  if (await parTab.count()) return parTab.click({ timeout: 8000 });
  return page.getByText(cible, { exact: false }).first().click({ timeout: 8000 });
}

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
for (const largeur of [1440, 390]) {
  const ctx = await browser.newContext(largeur > 600
    ? { viewport: { width: 1440, height: 900 } }
    : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') rapport.erreurs.push(`${largeur} ${page.url()}: ${m.text().slice(0, 240)}`); });
  page.on('pageerror', (e) => rapport.erreurs.push(`${largeur} ${page.url()} PAGEERROR: ${e.message.slice(0, 240)}`));
  for (const s of SCENARIOS) {
    try {
      await page.goto(`${BASE}${s.url}`, { waitUntil: 'load', timeout: 60000 });
      await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
      await page.waitForTimeout(4000);
      if (s.connexion) await connecter(page);
      for (const c of s.clics || []) {
        try { await cliquer(page, c); await page.waitForTimeout(1800); }
        catch (e) { rapport.erreurs.push(`${largeur} ${s.nom} : clic « ${c} » impossible (${String(e.message || e).slice(0, 120)})`); }
      }
      await mesurer(page, s.nom, largeur);
      for (const f of SCROLLS) {
        await page.evaluate(defiler, f);
        await page.waitForTimeout(700);
        await page.screenshot({ path: join(OUT, `${s.nom}-${largeur}-${Math.round(f * 100)}.jpg`), type: 'jpeg', quality: 70 });
      }
    } catch (e) {
      rapport.erreurs.push(`${largeur} ${s.nom} : scénario échoué (${String(e.message || e).slice(0, 200)})`);
    }
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, 'rapport.json'), JSON.stringify(rapport, null, 2));
const fautes = rapport.pages.filter((p) => p.lignesH1 > 2 || p.debordement || p.tirets || p.italiques || p.jaune);
console.log(`captures : ${rapport.pages.length} mesures, ${rapport.erreurs.length} erreurs, ${fautes.length} écrans en faute`);
for (const p of fautes) console.log(`  ${p.nom}@${p.largeur} : h1=${p.lignesH1} lignes, débordement=${p.debordement}, tirets=${p.tirets}, italiques=${p.italiques}, jaune=${p.jaune}`);
for (const e of rapport.erreurs.slice(0, 30)) console.log('  ! ' + e);
