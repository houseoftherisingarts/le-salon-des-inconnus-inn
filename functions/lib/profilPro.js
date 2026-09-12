"use strict";
// profilPro.ts : l'abonnement Stripe du Profil Pro (100 $ CAD par mois).
//
// Le SDK `stripe` n'est pas installé dans ce paquet de fonctions (voir
// functions/package.json) et stripeCampingWebhook, plus haut dans ce projet,
// montre déjà la voie : parler à l'API Stripe directement, en HTTP, avec une
// authentification Basic sur la clé secrète. Trois fonctions ici suivent le
// même principe :
//
//   • creerAbonnementProfilPro (onCall)  : ouvre la session Checkout.
//   • webhookProfilPro (onRequest)       : encaisse et pose les drapeaux.
//   • portailProfilPro (onCall)          : ouvre le portail client Stripe.
//
// Mise en place, une seule fois, après le premier déploiement :
//   1. firebase functions:secrets:set STRIPE_SECRET_KEY
//   2. Stripe → Developers → Webhooks → nouvel endpoint sur l'URL de
//      webhookProfilPro, événements checkout.session.completed,
//      customer.subscription.updated, customer.subscription.deleted.
//   3. firebase functions:secrets:set STRIPE_WEBHOOK_PRO_SECRET
//   4. firebase deploy --only functions:webhookProfilPro,functions:creerAbonnementProfilPro,functions:portailProfilPro
//
// Le compte Stripe du Salon sert plusieurs projets et Stripe envoie chaque
// événement à TOUS les endpoints du compte : `metadata.projet` sur la
// session, l'abonnement ET le client est le seul discriminant fiable, et
// tout événement qui ne le porte pas repart en succès sans être traité.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.portailProfilPro = exports.webhookProfilPro = exports.creerAbonnementProfilPro = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const crypto = __importStar(require("crypto"));
const params_1 = require("firebase-functions/params");
const nodemailer_1 = __importDefault(require("nodemailer"));
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const STRIPE_SECRET_KEY = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_PRO_SECRET = (0, params_1.defineSecret)('STRIPE_WEBHOOK_PRO_SECRET');
const PROJET = 'creator-studio-pro';
const PRIX_CENTS = 10000; // 100,00 $ CAD par mois
const BASE_URL = 'https://inconnus-salon.web.app';
const NOM_PRODUIT = 'Profil Pro du Salon des Inconnus';
// ─── Petit client Stripe par fetch, sans SDK ──────────────────────────────
/** Aplati un objet en paramètres de formulaire à la façon de Stripe :
 *  { a: { b: 1 } } devient a[b]=1, { a: [1,2] } devient a[0]=1&a[1]=2. */
function versParametresFormulaire(entree) {
    const params = new URLSearchParams();
    const marcher = (valeur, cle) => {
        if (valeur === undefined || valeur === null)
            return;
        if (Array.isArray(valeur)) {
            valeur.forEach((v, i) => marcher(v, `${cle}[${i}]`));
        }
        else if (typeof valeur === 'object') {
            Object.entries(valeur).forEach(([k, v]) => marcher(v, `${cle}[${k}]`));
        }
        else {
            params.append(cle, String(valeur));
        }
    };
    Object.entries(entree).forEach(([k, v]) => marcher(v, k));
    return params;
}
async function stripeFetch(secret, methode, chemin, parametres) {
    const autorisation = Buffer.from(`${secret}:`).toString('base64');
    let url = `https://api.stripe.com/v1/${chemin}`;
    const options = { method: methode, headers: { Authorization: `Basic ${autorisation}` } };
    if (parametres && methode === 'GET') {
        url += `?${versParametresFormulaire(parametres).toString()}`;
    }
    else if (parametres) {
        options.headers = { ...options.headers, 'Content-Type': 'application/x-www-form-urlencoded' };
        options.body = versParametresFormulaire(parametres).toString();
    }
    const reponse = await fetch(url, options);
    const corps = await reponse.json();
    if (!reponse.ok) {
        const message = corps?.error?.message ?? `Stripe a répondu ${reponse.status}.`;
        throw new Error(`Stripe ${chemin} : ${message}`);
    }
    return corps;
}
/** Vérifie l'en-tête `stripe-signature`, comme stripeCampingWebhook. */
function verifierSignatureStripe(rawBody, header, secret) {
    const parties = header.split(',').reduce((acc, kv) => {
        const idx = kv.indexOf('=');
        if (idx === -1)
            return acc;
        const k = kv.slice(0, idx).trim();
        const v = kv.slice(idx + 1).trim();
        (acc[k] = acc[k] ?? []).push(v);
        return acc;
    }, {});
    const timestamp = parties.t?.[0];
    const signatures = parties.v1 ?? [];
    if (!timestamp || signatures.length === 0)
        return false;
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(age) || age > 300)
        return false;
    const attendue = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString('utf8')}`, 'utf8').digest('hex');
    const attendueBuf = Buffer.from(attendue, 'utf8');
    return signatures.some((sig) => {
        const sigBuf = Buffer.from(sig, 'utf8');
        return sigBuf.length === attendueBuf.length && crypto.timingSafeEqual(sigBuf, attendueBuf);
    });
}
// ─── Zoho : le courriel de bienvenue ───────────────────────────────────────
function smtpTransport() {
    const user = process.env.ZOHO_USER;
    const pass = process.env.ZOHO_PASS;
    if (!user || !pass) {
        console.error('ZOHO_USER / ZOHO_PASS absents : courriel de bienvenue du Profil Pro non envoyé.');
        return null;
    }
    return nodemailer_1.default.createTransport({ host: 'smtp.zohocloud.ca', port: 465, secure: true, auth: { user, pass } });
}
async function envoyerBienvenueProfilPro(destinataire, prenom) {
    const transporteur = smtpTransport();
    if (!transporteur || !destinataire)
        return;
    const salutation = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
    const texte = [
        salutation,
        '',
        "Votre Profil Pro est maintenant actif sur Le Salon des Inconnus. Votre page vous attend, et vous pouvez dès maintenant choisir votre gabarit, ajouter vos oeuvres et ouvrir votre agenda de rendez-vous depuis votre tableau de bord :",
        '',
        `${BASE_URL}/createur`,
        '',
        'Pour toute question sur votre installation, écrivez-nous à alex@lesalondesinconnus.com.',
        '',
        "L'équipe du Salon des Inconnus",
    ].join('\n');
    try {
        await transporteur.sendMail({
            from: `"Le Salon des Inconnus" <${process.env.ZOHO_USER}>`,
            to: destinataire,
            subject: 'Bienvenue dans votre Profil Pro',
            text: texte,
        });
    }
    catch (err) {
        console.error('Courriel de bienvenue du Profil Pro : échec.', err);
    }
}
// ─── creerAbonnementProfilPro ──────────────────────────────────────────────
exports.creerAbonnementProfilPro = (0, https_1.onCall)({ secrets: [STRIPE_SECRET_KEY], invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Il faut être connecté pour ouvrir un Profil Pro.');
    }
    const uid = request.auth.uid;
    const courriel = request.auth.token.email;
    const nom = request.auth.token.name ?? undefined;
    const secret = STRIPE_SECRET_KEY.value();
    const db = admin.firestore();
    const refAbonnement = db.doc(`abonnementsPro/${uid}`);
    const snapAbonnement = await refAbonnement.get();
    let stripeCustomerId = snapAbonnement.data()?.stripeCustomerId;
    if (!stripeCustomerId) {
        const client = await stripeFetch(secret, 'POST', 'customers', {
            email: courriel,
            name: nom,
            metadata: { uid, projet: PROJET },
        });
        stripeCustomerId = client.id;
        await refAbonnement.set({ stripeCustomerId, uid }, { merge: true });
    }
    const session = await stripeFetch(secret, 'POST', 'checkout/sessions', {
        mode: 'subscription',
        customer: stripeCustomerId,
        client_reference_id: uid,
        line_items: [{
                quantity: 1,
                price_data: {
                    currency: 'cad',
                    unit_amount: PRIX_CENTS,
                    recurring: { interval: 'month' },
                    product_data: { name: NOM_PRODUIT },
                },
            }],
        subscription_data: { metadata: { uid, projet: PROJET } },
        metadata: { uid, projet: PROJET },
        success_url: `${BASE_URL}/createur?pro=merci`,
        cancel_url: `${BASE_URL}/createur?pro=annule`,
    });
    return { url: session.url };
});
function statutDepuisStripe(statutStripe) {
    if (statutStripe === 'active' || statutStripe === 'trialing')
        return 'actif';
    if (statutStripe === 'canceled')
        return 'annule';
    return 'suspendu'; // past_due, unpaid, incomplete, incomplete_expired, paused
}
async function poserFlagProEnabled(uid, active) {
    await admin.firestore().doc(`members/${uid}/admin/flags`).set({ proEnabled: active }, { merge: true });
}
/** Coupe la page publique quand l'abonnement se termine : le webhook est le
 *  seul endroit qui écrit `enabled` sans passer par le propriétaire. */
async function couperSuperProfile(uid) {
    const ref = admin.firestore().doc(`members/${uid}/superProfile/config`);
    const snap = await ref.get();
    if (snap.exists)
        await ref.update({ enabled: false });
}
exports.webhookProfilPro = (0, https_1.onRequest)({ secrets: [STRIPE_WEBHOOK_PRO_SECRET, STRIPE_SECRET_KEY, 'ZOHO_USER', 'ZOHO_PASS'], cors: false }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    const secret = STRIPE_WEBHOOK_PRO_SECRET.value();
    const header = req.get('stripe-signature');
    const rawBody = req.rawBody;
    if (!secret || !header || !rawBody) {
        console.error('webhookProfilPro: signature ou corps brut manquant.');
        res.status(400).send('Bad request');
        return;
    }
    if (!verifierSignatureStripe(rawBody, header, secret)) {
        console.error('webhookProfilPro: signature refusée.');
        res.status(400).send('Invalid signature');
        return;
    }
    let event;
    try {
        event = JSON.parse(rawBody.toString('utf8'));
    }
    catch {
        res.status(400).send('Invalid payload');
        return;
    }
    const objet = event.data?.object ?? {};
    if (event.type === 'checkout.session.completed') {
        if (objet.metadata?.projet !== PROJET) {
            res.status(200).send('Not this project');
            return;
        }
        const uid = objet.metadata?.uid ?? objet.client_reference_id ?? undefined;
        if (!uid) {
            res.status(200).send('No uid');
            return;
        }
        const db = admin.firestore();
        let periodeFin = null;
        let montant = objet.amount_total ?? PRIX_CENTS;
        try {
            const secretStripe = STRIPE_SECRET_KEY.value();
            const abonnement = await stripeFetch(secretStripe, 'GET', `subscriptions/${objet.subscription}`);
            if (abonnement.current_period_end)
                periodeFin = admin.firestore.Timestamp.fromMillis(abonnement.current_period_end * 1000);
            const prixLigne = abonnement.items?.data?.[0]?.price?.unit_amount;
            if (typeof prixLigne === 'number')
                montant = prixLigne;
        }
        catch (err) {
            console.error('webhookProfilPro: lecture de l’abonnement Stripe impossible.', err);
        }
        await db.doc(`abonnementsPro/${uid}`).set({
            uid,
            statut: 'actif',
            stripeCustomerId: objet.customer ?? null,
            stripeSubscriptionId: objet.subscription ?? null,
            periodeFin,
            montant,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        await poserFlagProEnabled(uid, true);
        const destinataire = objet.customer_details?.email ?? objet.customer_email ?? '';
        let prenom = '';
        try {
            const membre = await db.doc(`members/${uid}`).get();
            const displayName = membre.data()?.displayName ?? '';
            prenom = displayName.split(' ')[0] ?? '';
        }
        catch { /* le prénom est un détail de politesse, pas un blocage */ }
        await envoyerBienvenueProfilPro(destinataire, prenom);
        res.status(200).send('OK');
        return;
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
        if (objet.metadata?.projet !== PROJET) {
            res.status(200).send('Not this project');
            return;
        }
        const uid = objet.metadata?.uid;
        if (!uid) {
            res.status(200).send('No uid');
            return;
        }
        const statutStripe = event.type === 'customer.subscription.deleted' ? 'canceled' : (objet.status ?? 'active');
        const statut = statutDepuisStripe(statutStripe);
        const periodeFin = objet.current_period_end
            ? admin.firestore.Timestamp.fromMillis(objet.current_period_end * 1000)
            : null;
        const montant = objet.items?.data?.[0]?.price?.unit_amount ?? PRIX_CENTS;
        await admin.firestore().doc(`abonnementsPro/${uid}`).set({
            uid,
            statut,
            stripeCustomerId: objet.customer ?? null,
            stripeSubscriptionId: objet.id ?? null,
            periodeFin,
            montant,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        const actif = statut === 'actif';
        await poserFlagProEnabled(uid, actif);
        if (!actif && event.type === 'customer.subscription.deleted') {
            await couperSuperProfile(uid);
        }
        res.status(200).send('OK');
        return;
    }
    res.status(200).send('Ignored');
});
// ─── portailProfilPro ──────────────────────────────────────────────────────
exports.portailProfilPro = (0, https_1.onCall)({ secrets: [STRIPE_SECRET_KEY], invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Il faut être connecté pour ouvrir le portail.');
    }
    const uid = request.auth.uid;
    const db = admin.firestore();
    const snap = await db.doc(`abonnementsPro/${uid}`).get();
    const stripeCustomerId = snap.data()?.stripeCustomerId;
    if (!stripeCustomerId) {
        throw new https_1.HttpsError('failed-precondition', 'Aucun abonnement Profil Pro trouvé pour ce compte.');
    }
    const secret = STRIPE_SECRET_KEY.value();
    const portail = await stripeFetch(secret, 'POST', 'billing_portal/sessions', {
        customer: stripeCustomerId,
        return_url: `${BASE_URL}/createur`,
    });
    return { url: portail.url };
});
//# sourceMappingURL=profilPro.js.map