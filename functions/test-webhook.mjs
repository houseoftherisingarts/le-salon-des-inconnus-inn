// Banc d'essai du webhook du camping, contre l'emulateur Firestore.
// Aucune donnee de production n'est touchee. Lance par npm run test:camping.
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.GCLOUD_PROJECT = 'demo-camping';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_banc_essai';

const mod = await import('./lib/index.js');
const admin = (await import('firebase-admin')).default;
const handler = mod.stripeCampingWebhook;

const PLINK = 'plink_1UDs8bKKPSkaQESfJSFbZnbZ';
const db = admin.firestore();

function signer(corps, secret = process.env.STRIPE_WEBHOOK_SECRET, t = Math.floor(Date.now() / 1000)) {
  const sig = crypto.createHmac('sha256', secret).update(`${t}.${corps}`, 'utf8').digest('hex');
  return `t=${t},v1=${sig}`;
}

function evenement(sessionId, paymentLink = PLINK, extra = {}) {
  return JSON.stringify({
    id: 'evt_' + sessionId, type: 'checkout.session.completed',
    data: { object: {
      id: sessionId, payment_link: paymentLink, payment_status: 'paid',
      amount_total: 11500, currency: 'cad',
      customer_details: { name: 'Banc Essai', email: 'banc@essai.test', phone: '+15145550000' },
      ...extra } },
  });
}

// Le wrapper v2 de firebase-functions attend une vraie reponse Node : il pose un
// écouteur sur « finish ». On sert donc une réponse minimale qui émet cet
// événement au moment du send, sinon l'appel ne se termine jamais.
async function appeler(corps, entete) {
  const req = {
    method: 'POST',
    rawBody: Buffer.from(corps, 'utf8'),
    headers: { 'stripe-signature': entete },
    get: (h) => (h.toLowerCase() === 'stripe-signature' ? entete : undefined),
  };
  let statut = 200, texte = '';
  const ecouteurs = {};
  const res = {
    on(ev, cb) { (ecouteurs[ev] = ecouteurs[ev] || []).push(cb); return this; },
    setHeader() { return this; },
    getHeader() { return undefined; },
    status(c) { statut = c; return this; },
    send(t) { texte = String(t); (ecouteurs.finish || []).forEach((cb) => cb()); return this; },
    end(t) { return this.send(t ?? ''); },
  };
  await handler(req, res);
  return { statut, texte };
}

const vendus = async () => (await db.collection('config').doc('camping').get()).data()?.vendus ?? 0;

// 1. Signature invalide : refusee, rien d'ecrit.
let r = await appeler(evenement('cs_1'), signer(evenement('cs_1'), 'whsec_mauvais'));
assert.equal(r.statut, 400, 'signature invalide doit etre refusee');
assert.equal(await vendus(), 0);
console.log('1 · signature invalide refusee (400)');

// 2. Horodatage vieux de 10 minutes : refuse (fenetre de rejeu).
const vieux = evenement('cs_2');
r = await appeler(vieux, signer(vieux, undefined, Math.floor(Date.now() / 1000) - 600));
assert.equal(r.statut, 400, 'horodatage perime doit etre refuse');
console.log('2 · rejeu vieux de 10 min refuse (400)');

// 3. Paiement d'un AUTRE lien du meme compte (Vexel, Montpellois) : ignore.
const autre = evenement('cs_vexel', 'plink_autre_projet');
r = await appeler(autre, signer(autre));
assert.equal(r.statut, 200);
assert.equal(await vendus(), 0, 'un paiement d un autre lien ne doit rien compter');
console.log('3 · paiement d un autre lien ignore, compteur a 0');

// 4. Vrai paiement : reservation ecrite, compteur a 1.
const vrai = evenement('cs_reel_1');
r = await appeler(vrai, signer(vrai));
assert.equal(r.statut, 200);
assert.equal(await vendus(), 1);
const doc = await db.collection('events').doc('camping-fmm-2026').collection('reservations').doc('cs_reel_1').get();
assert.ok(doc.exists);
assert.equal(doc.data().nom, 'Banc Essai');
assert.equal(doc.data().telephone, '+15145550000');
assert.equal(doc.data().montantCents, 11500);
console.log('4 · paiement encaisse : reservation ecrite, compteur a 1');

// 5. Stripe rejoue le meme evenement : compte une seule fois.
r = await appeler(vrai, signer(vrai));
assert.equal(await vendus(), 1, 'un rejeu ne doit pas doubler le compteur');
console.log('5 · rejeu du meme paiement : compteur reste a 1');

// 6. Le compteur ne depasse jamais quatre.
for (const n of ['cs_reel_2', 'cs_reel_3', 'cs_reel_4', 'cs_reel_5', 'cs_reel_6']) {
  const e = evenement(n);
  await appeler(e, signer(e));
}
assert.equal(await vendus(), 4, 'le compteur est plafonne a 4');
console.log('6 · six paiements, compteur plafonne a 4');

console.log('\nBanc d essai du webhook : 6 sur 6.');
process.exit(0);
