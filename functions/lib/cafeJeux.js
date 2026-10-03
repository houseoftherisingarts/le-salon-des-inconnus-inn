"use strict";
// cafeJeux.ts : les skins du Café-jeux (www.lesalondesinconnus.com/cafe-jeux)
// achetés en vrai argent.
//
//   • creerPaiementSkin (onCall) : ouvre une session Stripe Checkout pour un
//     skin, au prix codé ici (jamais celui du client). Exige un compte.
//   • traiterSkinPaye : appelée par webhookProfilPro (le même endpoint Stripe
//     que l'abonnement et l'assistance, donc aucun nouveau webhook ni secret
//     à créer) quand la session porte metadata.produit = 'skin'. Ajoute l'id
//     dans members/{uid}/prive/cafeJeux, champ skins.paiSho.
//
// Le compte Stripe est partagé avec d'autres projets : la porte est
// metadata.projet + entite + produit, comme pour l'assistance.
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
exports.traiterSkinPaye = exports.creerPaiementSkin = exports.estSkin = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const profilPro_1 = require("./profilPro");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const STRIPE_SECRET_KEY = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const BASE_URL = 'https://www.lesalondesinconnus.com';
// Catalogue serveur : la seule source des prix. Le même tableau vit côté page
// dans data/cafeJeux.ts pour l'affichage.
const SKINS_PAI_SHO = {
    vexel: { nom: 'Pai Sho · Plateau Vexel, fini métal', cents: 499 },
    salon: { nom: 'Pai Sho · Plateau du Salon, érable pâle', cents: 499 },
    nacre: { nom: 'Pai Sho · Tuiles de nacre', cents: 299 },
    obsidienne: { nom: 'Pai Sho · Tuiles d’obsidienne', cents: 299 },
    cuivre: { nom: 'Pai Sho · Tuiles de cuivre', cents: 299 },
};
function estSkin(objet) {
    return objet?.metadata?.projet === profilPro_1.PROJET
        && objet?.metadata?.entite === 'salon'
        && objet?.metadata?.produit === 'skin';
}
exports.estSkin = estSkin;
exports.creerPaiementSkin = (0, https_1.onCall)({ secrets: [STRIPE_SECRET_KEY], invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Il faut être connecté pour acheter un skin.');
    }
    const { jeu, skin } = (request.data ?? {});
    const article = jeu === 'pai-sho' && typeof skin === 'string' ? SKINS_PAI_SHO[skin] : undefined;
    if (!article) {
        throw new https_1.HttpsError('invalid-argument', 'Skin inconnu.');
    }
    const uid = request.auth.uid;
    const meta = { projet: profilPro_1.PROJET, entite: 'salon', produit: 'skin', jeu: 'pai-sho', skin: skin, uid };
    const session = await (0, profilPro_1.stripeFetch)(STRIPE_SECRET_KEY.value(), 'POST', 'checkout/sessions', {
        mode: 'payment',
        client_reference_id: uid,
        customer_email: request.auth.token.email,
        line_items: [{
                quantity: 1,
                price_data: { currency: 'cad', unit_amount: article.cents, product_data: { name: article.nom } },
            }],
        metadata: meta,
        payment_intent_data: { metadata: meta },
        success_url: `${BASE_URL}/cafe-jeux?achat=ok&skin=${encodeURIComponent(skin)}`,
        cancel_url: `${BASE_URL}/cafe-jeux`,
    });
    return { url: session.url };
});
async function traiterSkinPaye(objet) {
    const uid = objet.metadata?.uid ?? objet.client_reference_id ?? undefined;
    const skin = objet.metadata?.skin;
    const article = skin ? SKINS_PAI_SHO[skin] : undefined;
    if (!uid || !skin || !article) {
        console.error('Skin payé sans uid ou skin connu, session', objet.id);
        return;
    }
    if (objet.payment_status !== 'paid') {
        console.warn('Skin : session non payée ignorée', objet.id, objet.payment_status);
        return;
    }
    if ((objet.amount_total ?? 0) < article.cents || objet.currency !== 'cad') {
        console.error('Skin : montant ou devise inattendus', objet.id, objet.amount_total, objet.currency);
        return;
    }
    // arrayUnion rend la relivraison d'un même événement sans effet.
    await admin.firestore().doc(`members/${uid}/prive/cafeJeux`).set({
        skins: { paiSho: admin.firestore.FieldValue.arrayUnion(skin) },
        majLe: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
exports.traiterSkinPaye = traiterSkinPaye;
//# sourceMappingURL=cafeJeux.js.map