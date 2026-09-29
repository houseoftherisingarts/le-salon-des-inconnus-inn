"use strict";
// assistance.ts : la carte « Brancher Stripe avec Alex » du Profil Pro.
// Un paiement unique de 80 $ CAD pour un appel en tête-à-tête où Alex
// branche avec l'artiste ses liens de paiement Stripe.
//
//   • creerPaiementAssistance (onCall) : ouvre la session Checkout, en mode
//     paiement, sans SDK Stripe (même client HTTP que profilPro.ts).
//   • traiterAssistancePayee : appelée par webhookProfilPro quand la session
//     porte metadata.entite = 'salon' et metadata.produit = 'assistance';
//     écrit assistances/{uid} et prévient Alex par le courriel habituel.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.traiterAssistancePayee = exports.creerPaiementAssistance = exports.estAssistance = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const profilPro_1 = require("./profilPro");
const courriel_1 = require("./courriel");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const STRIPE_SECRET_KEY = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const PRIX_ASSISTANCE_CENTS = 8000; // 80,00 $ CAD, une fois
const BASE_URL = 'https://www.lesalondesinconnus.com';
function estAssistance(objet) {
    return objet?.metadata?.entite === 'salon' && objet?.metadata?.produit === 'assistance';
}
exports.estAssistance = estAssistance;
exports.creerPaiementAssistance = (0, https_1.onCall)({ secrets: [STRIPE_SECRET_KEY], invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Il faut être connecté pour réserver l’assistance.');
    }
    const uid = request.auth.uid;
    const deja = await admin.firestore().doc(`assistances/${uid}`).get();
    if (deja.exists && deja.data()?.statut) {
        return { dejaPayee: true };
    }
    const courriel = request.auth.token.email;
    const session = await (0, profilPro_1.stripeFetch)(STRIPE_SECRET_KEY.value(), 'POST', 'checkout/sessions', {
        mode: 'payment',
        client_reference_id: uid,
        customer_email: courriel,
        phone_number_collection: { enabled: true },
        line_items: [{
                quantity: 1,
                price_data: {
                    currency: 'cad',
                    unit_amount: PRIX_ASSISTANCE_CENTS,
                    product_data: { name: 'Brancher Stripe avec Alex (appel en tête-à-tête)' },
                },
            }],
        metadata: { entite: 'salon', produit: 'assistance', uid },
        payment_intent_data: { metadata: { entite: 'salon', produit: 'assistance', uid } },
        success_url: `${BASE_URL}/creator?assistance=merci`,
        cancel_url: `${BASE_URL}/creator?assistance=annule`,
    });
    return { url: session.url };
});
async function traiterAssistancePayee(objet) {
    const uid = objet.metadata?.uid ?? objet.client_reference_id ?? undefined;
    if (!uid) {
        console.error('Assistance payée sans uid, session', objet.id);
        return;
    }
    const details = objet.customer_details ?? {};
    const fiche = {
        statut: 'payee',
        courriel: (details.email ?? objet.customer_email ?? ''),
        telephone: (details.phone ?? ''),
        nom: (details.name ?? ''),
        payeLe: admin.firestore.FieldValue.serverTimestamp(),
        stripeSessionId: objet.id ?? null,
        montant: objet.amount_total ?? PRIX_ASSISTANCE_CENTS,
    };
    await admin.firestore().doc(`assistances/${uid}`).set(fiche, { merge: true });
    let nomArtiste = '';
    try {
        const config = await admin.firestore().doc(`members/${uid}/superProfile/config`).get();
        nomArtiste = config.data()?.displayName ?? config.data()?.username ?? '';
    }
    catch { /* le nom d'artiste aide Alex, il ne bloque rien */ }
    await (0, courriel_1.notifyAlex)(`Assistance Stripe payée : ${fiche.nom || fiche.courriel || uid}`, "Un artiste du Profil Pro a payé l'appel « Brancher Stripe avec Alex » (80 $).\n\n"
        + (0, courriel_1.line)('Nom', fiche.nom)
        + (0, courriel_1.line)('Artiste', nomArtiste)
        + (0, courriel_1.line)('Courriel', fiche.courriel)
        + (0, courriel_1.line)('Téléphone', fiche.telephone)
        + (0, courriel_1.line)('uid', uid)
        + `\nUne fois l'appel fait, poser statut = 'appel-fait' dans assistances/${uid}.`);
}
exports.traiterAssistancePayee = traiterAssistancePayee;
//# sourceMappingURL=assistance.js.map