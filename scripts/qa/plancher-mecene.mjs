// Vague 6 : mesures et captures du plancher noir luisant de /mecene (menu et paliers).
// Usage : node scripts/qa/plancher-mecene.mjs <baseUrl> <dossierSortie>
// Rend mesures.json (les 21 mesures du devis, chacune avec sa réussite) et les captures
// <scénario>-<moteur>-<largeur>-<position>.png.
import { chromium, webkit, devices } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.argv[2] || 'http://localhost:4274').replace(/\/$/, '');
const OUT = process.argv[3] || 'scratch/vague6';
mkdirSync(OUT, { recursive: true });

const M = {}; // numéro -> { ok, detail[] }
const noter = (n, ok, detail) => {
  const m = (M[n] ||= { ok: true, detail: [] });
  m.ok = m.ok && ok;
  m.detail.push(detail);
};
const erreursConsole = [];

const CONSENT = () => {
  try { localStorage.setItem('sdl_privacy_consent', JSON.stringify({ level: 'essential', version: '1', date: '2026-09-16' })); } catch {}
};

const APPAREILS = [
  { moteur: 'chromium', largeur: 1440, lanceur: chromium, ctx: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } },
  { moteur: 'chromium', largeur: 390, lanceur: chromium, ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
  { moteur: 'webkit', largeur: 390, lanceur: webkit, ctx: { ...devices['iPhone 13'] } },
];

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function ouvrirContexte(nav, app, consent = true) {
  const context = await nav.newContext(app.ctx);
  if (consent) await context.addInitScript(CONSENT);
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') erreursConsole.push({ app: `${app.moteur}-${app.largeur}`, texte: m.text().slice(0, 300), url: m.location()?.url || '' }); });
  page.on('pageerror', (e) => erreursConsole.push({ app: `${app.moteur}-${app.largeur}`, texte: String(e.stack || e).slice(0, 400), url: 'pageerror' }));
  return { context, page };
}

async function pret(page) {
  await page.locator('.pl-scene').first().waitFor({ state: 'attached', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await attendre(1800);
}

const defilerMain = (page, f) => page.evaluate((f) => {
  const main = document.querySelector('.pl-scene').closest('main');
  main.scrollTop = typeof f === 'number' ? (main.scrollHeight - main.clientHeight) * f : f.px;
}, f);

async function captures(page, nom, app, positions = [['haut', 0], ['milieu', 0.5], ['bas', 1]]) {
  for (const [pos, f] of positions) {
    await defilerMain(page, f);
    await attendre(900);
    await page.screenshot({ path: join(OUT, `${nom}-${app.moteur}-${app.largeur}-${pos}.png`) });
  }
}

// Mesures géométriques et de style prises sur la page courante (animations en pause à t=0).
async function mesuresDom(page, etiquette, langue) {
  const r = await page.evaluate((langue) => {
    const main = document.querySelector('.pl-scene').closest('main');
    const out = {};
    out.debord = [main.scrollWidth - main.clientWidth, document.documentElement.scrollWidth - innerWidth];
    out.largeurs = [...document.querySelectorAll('.pl-scene')].map((s) => Math.abs(s.getBoundingClientRect().width - main.clientWidth));
    document.getAnimations().forEach((a) => { try { a.currentTime = 0; a.pause(); } catch {} });
    const objets = [...document.querySelectorAll('.pl-objet')].map((o) => {
      const c = o.querySelector(':scope > .pl-carte').getBoundingClientRect();
      const rf = o.querySelector(':scope > .pl-reflet').getBoundingClientRect();
      const om = o.querySelector(':scope > .pl-ombre').getBoundingClientRect();
      const ob = o.getBoundingClientRect();
      return { haut: o.hasAttribute('data-haut'), ecart: rf.top - c.bottom, ombreY: (om.top + om.bottom) / 2, top: ob.top, bottom: ob.bottom, refletBas: rf.bottom };
    });
    out.objets = objets;
    // rangées : objets dont les boîtes se chevauchent verticalement
    const rangees = [];
    for (const o of [...objets].sort((a, b) => a.top - b.top)) {
      const r = rangees.find((g) => g.some((x) => o.top < x.bottom && x.top < o.bottom));
      r ? r.push(o) : rangees.push([o]);
    }
    out.ombres = rangees.map((g) => Math.max(...g.map((x) => x.ombreY)) - Math.min(...g.map((x) => x.ombreY)));
    out.solNu = main.getBoundingClientRect().bottom - Math.max(...objets.map((o) => o.refletBas));
    const lignes = (el) => { const lh = parseFloat(getComputedStyle(el).lineHeight); return Math.round(el.getBoundingClientRect().height / lh); };
    const h1 = document.querySelector('.pl-scene h1');
    out.h1 = h1 ? lignes(h1) : null;
    const titres = [...document.querySelectorAll('.pl-carte .font-prata.leading-\\[1\\.1\\], .pl-carte h3')];
    out.titres = titres.map((t) => [t.textContent, lignes(t)]);
    out.blocsDansBouton = document.querySelectorAll('.pl-scene button :is(h1,h2,h3,h4,p,div)').length;
    const textes = [...document.querySelectorAll('.pl-scene *')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    out.italiques = textes.filter((e) => getComputedStyle(e).fontStyle !== 'normal').length;
    const zone = [...document.querySelectorAll('.pl-scene, .pl-scene *')];
    const banniere = [...document.querySelectorAll('h3')].find((h) => /Choix Équitable|Fair Choice/.test(h.textContent));
    if (banniere) { const b = banniere.parentElement; zone.push(b, ...b.querySelectorAll('*')); }
    out.jaune = zone.filter((e) => { const s = getComputedStyle(e); return [s.color, s.backgroundColor, s.borderTopColor, s.backgroundImage, s.boxShadow].join(' ').includes('212, 175, 55'); }).length;
    const ff = (el) => el && getComputedStyle(el).fontFamily;
    out.polices = {
      h1: ff(h1),
      titres: [...new Set(titres.map((t) => ff(t)))],
      surtitres: [...new Set([...document.querySelectorAll('.pl-carte .font-cinzel')].map((t) => ff(t)))],
    };
    const texte = [...document.querySelectorAll('.pl-scene')].map((s) => s.innerText).join('\n');
    out.cadratins = (texte.match(/—/g) || []).length;
    const anglais = /\b(Join|month|Coming soon|Most Popular|perk|See our|Support projects|Invest|The roster)\b/;
    out.anglaisEnFR = langue === 'FR' ? (texte.match(anglais) || [null])[0] : null;
    out.webkitMask = getComputedStyle(document.querySelector('.pl-reflet')).webkitMaskImage || getComputedStyle(document.querySelector('.pl-reflet')).maskImage;
    out.inert = document.querySelector('.pl-reflet').hasAttribute('inert');
    document.getAnimations().forEach((a) => { try { a.play(); } catch {} });
    return out;
  }, langue);

  noter(1, r.debord.every((d) => d <= 0), `${etiquette} débord main/doc ${r.debord.join('/')}`);
  noter(2, r.largeurs.every((d) => d <= 1), `${etiquette} écart largeur ${r.largeurs.map((d) => d.toFixed(1)).join(',')}`);
  noter(3, r.objets.every((o) => Math.abs(o.ecart - (o.haut ? 67.2 : 28)) <= 1), `${etiquette} écarts ${r.objets.map((o) => o.ecart.toFixed(1)).join(',')}`);
  noter(4, r.ombres.every((d) => d <= 1), `${etiquette} ombres par rangée ${r.ombres.map((d) => d.toFixed(1)).join(',')}`);
  if (r.h1 !== null || r.titres.length) noter(6, (r.h1 === null || r.h1 <= 2) && r.titres.every(([, l]) => l <= 2), `${etiquette} h1 ${r.h1} lignes, titres ${r.titres.map(([t, l]) => `${t}:${l}`).join(' | ')}`);
  noter(8, r.blocsDansBouton === 0, `${etiquette} blocs dans bouton ${r.blocsDansBouton}`);
  noter(17, r.italiques === 0, `${etiquette} italiques ${r.italiques}`);
  noter(18, r.jaune === 0, `${etiquette} éléments #d4af37 ${r.jaune}`);
  const prata = [r.polices.h1, ...r.polices.titres].filter(Boolean).every((f) => /Prata/.test(f));
  const cinzel = r.polices.surtitres.every((f) => /Cinzel/.test(f));
  noter(19, prata && cinzel, `${etiquette} ${JSON.stringify(r.polices)}`);
  noter(20, r.cadratins === 0 && !r.anglaisEnFR, `${etiquette} cadratins ${r.cadratins}, anglais en FR ${r.anglaisEnFR}`);
  noter(15, r.webkitMask && r.webkitMask !== 'none', `${etiquette} masque ${String(r.webkitMask).slice(0, 60)} inert=${r.inert}`);
  return r;
}

async function reflets(page, etiquette) {
  const n = await page.locator('.pl-reflet').count();
  const res = [];
  for (let i = 0; i < n; i++) {
    await page.evaluate((i) => {
      const r = document.querySelectorAll('.pl-reflet')[i];
      const main = r.closest('main');
      main.scrollTop += r.getBoundingClientRect().top - main.getBoundingClientRect().top - 200;
    }, i);
    await attendre(150);
    res.push(await page.evaluate((i) => {
      const b = document.querySelectorAll('.pl-reflet')[i].getBoundingClientRect();
      const el = document.elementFromPoint(b.left + b.width / 2, b.top + Math.min(b.height / 2, 30));
      return el ? `${el.tagName.toLowerCase()}${el.closest('.pl-reflet') ? '(reflet)' : ''}${el.closest('button') ? '(bouton)' : ''}` : 'null';
    }, i));
  }
  noter(9, res.every((t) => !/reflet|bouton/.test(t)), `${etiquette} ${res.join(',')}`);
}

async function images(page, etiquette, dpr) {
  // charger les images paresseuses en parcourant <main>
  for (const f of [0.25, 0.5, 0.75, 1, 0]) { await defilerMain(page, f); await attendre(600); }
  await page.waitForFunction(() => [...document.querySelectorAll('.pl-carte img')].every((i) => i.complete && i.naturalWidth), null, { timeout: 30000 }).catch(() => {});
  const r = await page.evaluate((dpr) => [...document.querySelectorAll('.pl-carte img')].map((i) => {
    const b = i.getBoundingClientRect();
    return { ratio: Math.max((b.width * dpr) / i.naturalWidth, (b.height * dpr) / i.naturalHeight), src: i.currentSrc };
  }), dpr);
  const ok = r.every((x) => x.ratio <= 1.05 && (/\.webp$/.test(x.src) || /unsplash/.test(x.src)));
  noter(16, ok, `${etiquette} ${r.map((x) => `${x.ratio.toFixed(2)} ${x.src.split('/').pop().slice(0, 40)}`).join(' | ')}`);
}

async function allerPaliers(page) {
  await page.getByRole('button', { name: /Soutenir des projets|Support projects/ }).click();
  await page.locator('.pl-scene').first().waitFor({ state: 'attached', timeout: 30000 });
  await attendre(1500);
}

async function langueEN(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const bascule = page.locator('button:has(> span:text-is("EN")):has(> span:text-is("FR"))').first();
  await bascule.waitFor({ state: 'attached', timeout: 60000 });
  await attendre(3500);
  await bascule.click({ force: true, timeout: 20000 }).catch(async () => { await bascule.evaluate((b) => b.click()); });
  await attendre(500);
  await page.evaluate(() => { history.pushState({}, '', '/mecene'); dispatchEvent(new PopStateEvent('popstate')); });
  await pret(page);
  const h1 = await page.locator('.pl-scene h1').innerText();
  return /Support the artists/.test(h1);
}

for (const app of APPAREILS) {
  const nav = await app.lanceur.launch();
  const et = `${app.moteur}-${app.largeur}`;
  const dpr = app.ctx.deviceScaleFactor;
  try {
    // 1. menu FR
    {
      const { context, page } = await ouvrirContexte(nav, app);
      await page.goto(`${BASE}/mecene`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await pret(page);
      const r = await mesuresDom(page, `menu-fr ${et}`, 'FR');
      if (app.largeur === 1440) noter(5, r.solNu >= 40, `menu-fr ${et} sol nu ${r.solNu.toFixed(0)} px`);
      await captures(page, 'menu-fr', app);
      await reflets(page, `menu-fr ${et}`);
      await images(page, `menu-fr ${et}`, dpr);
      // 7. clavier
      await defilerMain(page, 0);
      const focus = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        focus.push(await page.evaluate(() => { const a = document.activeElement; return a ? (a.closest('.pl-reflet') ? 'REFLET' : `${a.tagName.toLowerCase()}:${(a.textContent || '').trim().slice(0, 18)}`) : 'null'; }));
      }
      noter(7, !focus.includes('REFLET'), `${et} ${focus.join(' > ')}`);
      // 8. arbre d'accessibilité
      const aria = await page.locator('.pl-scene').ariaSnapshot();
      writeFileSync(join(OUT, `aria-menu-${et}.txt`), aria);
      const doublons = ['Nos artistes', 'Investir et économiser', 'Soutenir des projets', 'Café'].filter((t) => aria.split(t).length - 1 !== 1);
      noter(8, doublons.length === 0, `${et} titres en double dans l'arbre : ${doublons.join(',') || 'aucun'}`);
      if (app.largeur === 1440) {
        await defilerMain(page, 0);
        await page.locator('.pl-carte button').nth(1).hover();
        await attendre(900);
        await page.screenshot({ path: join(OUT, 'menu-1440-survol.png') });
        await page.mouse.move(5, 895);
        await page.evaluate(() => document.activeElement?.blur());
        await page.locator('.pl-carte button').nth(0).focus();
        await page.keyboard.press('Tab');
        await attendre(900);
        await page.screenshot({ path: join(OUT, 'menu-1440-focus.png') });
      }
      if (app.moteur === 'chromium') {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Performance.enable');
        await page.mouse.move(2, 2);
        const avant = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
        await attendre(3000);
        const apres = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
        noter(10, apres.LayoutCount === avant.LayoutCount, `${et} LayoutCount ${avant.LayoutCount}->${apres.LayoutCount}, RecalcStyleCount ${avant.RecalcStyleCount}->${apres.RecalcStyleCount}`);
        if (app.largeur === 390) {
          await defilerMain(page, 0);
          await cdp.send('LayerTree.enable');
          const couches = await new Promise((res) => {
            cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) res(e.layers.length); });
            setTimeout(() => res(null), 5000);
          });
          noter(12, couches !== null && couches <= 24, `${et} couches ${couches}`);
        }
        if (app.largeur === 390) {
          await page.setViewportSize({ width: 360, height: 780 });
          await attendre(800);
          const l = await page.evaluate(() => { const h = document.querySelector('.pl-scene h1'); return Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)); });
          noter(6, l <= 2, `menu-fr chromium-360 h1 ${l} lignes`);
          await page.setViewportSize({ width: 390, height: 844 });
        }
      }
      if (app.moteur === 'webkit') {
        await defilerMain(page, 0);
        const d = await page.evaluate(() => new Promise((res) => {
          const t = []; let p = performance.now(); const fin = p + 5000;
          const f = (n) => { t.push(n - p); p = n; n < fin ? requestAnimationFrame(f) : res(t); };
          requestAnimationFrame(f);
        }));
        const s = [...d].sort((a, b) => a - b);
        const med = s[Math.floor(s.length / 2)], p95 = s[Math.floor(s.length * 0.95)];
        noter(11, med <= 17 && p95 <= 25, `${et} médiane ${med.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms sur ${s.length} images`);
      }
      await context.close();
    }
    // 2. menu EN
    {
      const { context, page } = await ouvrirContexte(nav, app);
      const ok = await langueEN(page).catch((e) => { erreursConsole.push({ app: et, texte: `bascule EN : ${e.message.slice(0, 200)}`, url: 'qa' }); return false; });
      if (ok) {
        await mesuresDom(page, `menu-en ${et}`, 'EN');
        await captures(page, 'menu-en', app);
      } else noter(6, true, `menu-en ${et} non mesuré (bascule EN introuvable)`);
      await context.close();
    }
    // 3. paliers FR
    {
      const { context, page } = await ouvrirContexte(nav, app);
      await page.goto(`${BASE}/mecene`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await pret(page);
      await allerPaliers(page);
      if (app.largeur === 390 || app.largeur === 1440) {
        const etat = await page.evaluate(() => {
          const s = document.querySelector('.pl-scene'); const main = s.closest('main'); main.scrollTop = 0;
          return new Promise((res) => setTimeout(() => res({ anime: s.dataset.anime, top: s.getBoundingClientRect().top, ih: innerHeight }), 700));
        });
        const concl = etat.top > etat.ih;
        await page.evaluate(() => { const s = document.querySelector('.pl-scene'); const main = s.closest('main'); main.scrollTop += s.getBoundingClientRect().top - main.getBoundingClientRect().top; });
        await attendre(700);
        const apres = await page.evaluate(() => document.querySelector('.pl-scene').dataset.anime);
        noter(14, (concl ? etat.anime === 'non' : true) && apres === 'oui', `${et} hors écran: ${concl ? etat.anime : 'non concluant (scène visible en haut)'} ; à l'écran: ${apres}`);
      }
      const scene = await page.evaluate(() => { const s = document.querySelector('.pl-scene'); const main = s.closest('main'); return main.scrollTop + s.getBoundingClientRect().top - main.getBoundingClientRect().top; });
      await mesuresDom(page, `paliers-fr ${et}`, 'FR');
      await captures(page, 'paliers-fr', app, [['haut', { px: scene }], ['milieu', 0.5], ['bas', 1]]);
      await reflets(page, `paliers-fr ${et}`);
      await context.close();
    }
    // bandeau de témoins ouvert, et mouvement réduit
    if (app.moteur === 'chromium' && app.largeur === 390) {
      const { context, page } = await ouvrirContexte(nav, app, false);
      await page.goto(`${BASE}/mecene`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await pret(page);
      await page.screenshot({ path: join(OUT, 'menu-fr-chromium-390-temoins.png') });
      await context.close();
    }
    if (app.moteur === 'chromium') {
      const { context, page } = await ouvrirContexte(nav, app);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${BASE}/mecene`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await pret(page);
      await images(page, `reduit ${et}`, dpr).catch(() => {});
      M[16].detail.pop();
      await defilerMain(page, 0);
      await page.mouse.move(2, 2);
      await attendre(1000);
      const nom = await page.evaluate(() => getComputedStyle(document.querySelector('.pl-carte')).animationName);
      const a = join(OUT, `reduit-${et}-a.png`), b = join(OUT, `reduit-${et}-b.png`);
      await page.screenshot({ path: a }); await attendre(1000); await page.screenshot({ path: b });
      const pareil = Buffer.compare(readFileSync(a), readFileSync(b)) === 0;
      noter(13, nom === 'none' && pareil, `${et} animationName ${nom}, captures identiques ${pareil}`);
      await context.close();
    }
  } catch (e) {
    erreursConsole.push({ app: et, texte: `échec du script : ${e.message.slice(0, 300)}`, url: 'qa' });
  }
  await nav.close();
}

const nos = erreursConsole.filter((e) => /PlancherLuisant|MeceneScenes|pl-|échec du script|bascule EN/.test(e.texte) || (e.url === 'pageerror'));
noter(21, nos.length === 0, `${nos.length} erreur(s) liée(s) : ${nos.map((e) => `${e.app} ${e.texte.slice(0, 120)}`).join(' || ') || 'aucune'} ; ${erreursConsole.length} erreur(s) console au total`);
for (let n = 1; n <= 21; n++) if (!M[n]) M[n] = { ok: null, detail: ['non mesuré'] };
writeFileSync(join(OUT, 'mesures.json'), JSON.stringify({ base: BASE, mesures: M, erreursConsole }, null, 2));
for (let n = 1; n <= 21; n++) console.log(`${String(n).padStart(2)} ${M[n].ok === null ? 'N/A ' : M[n].ok ? 'OK  ' : 'ÉCHEC'} ${M[n].detail.join(' ; ').slice(0, 400)}`);
