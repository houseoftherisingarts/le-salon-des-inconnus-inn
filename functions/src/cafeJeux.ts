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

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { PROJET, stripeFetch } from './profilPro';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const BASE_URL = 'https://www.lesalondesinconnus.com';

// Catalogue serveur : la seule source des prix. Le même tableau vit côté page
// dans data/cafeJeux.ts pour l'affichage.
const SKINS_PAI_SHO: Record<string, { nom: string; cents: number }> = {
  vexel:      { nom: 'Pai Sho · Plateau Vexel, fini métal', cents: 499 },
  salon:      { nom: 'Pai Sho · Plateau du Salon, érable pâle', cents: 499 },
  nacre:      { nom: 'Pai Sho · Tuiles de nacre', cents: 299 },
  obsidienne: { nom: 'Pai Sho · Tuiles d’obsidienne', cents: 299 },
  cuivre:     { nom: 'Pai Sho · Tuiles de cuivre', cents: 299 },
};

export function estSkin(objet: Record<string, any>): boolean {
  return objet?.metadata?.projet === PROJET
    && objet?.metadata?.entite === 'salon'
    && objet?.metadata?.produit === 'skin';
}

export const creerPaiementSkin = onCall(
  { secrets: [STRIPE_SECRET_KEY], invoker: 'public' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Il faut être connecté pour acheter un skin.');
    }
    const { jeu, skin } = (request.data ?? {}) as { jeu?: string; skin?: string };
    const article = jeu === 'pai-sho' && typeof skin === 'string' ? SKINS_PAI_SHO[skin] : undefined;
    if (!article) {
      throw new HttpsError('invalid-argument', 'Skin inconnu.');
    }
    const uid = request.auth.uid;
    const meta = { projet: PROJET, entite: 'salon', produit: 'skin', jeu: 'pai-sho', skin: skin as string, uid };
    const session = await stripeFetch(STRIPE_SECRET_KEY.value(), 'POST', 'checkout/sessions', {
      mode: 'payment',
      client_reference_id: uid,
      customer_email: request.auth.token.email as string | undefined,
      line_items: [{
        quantity: 1,
        price_data: { currency: 'cad', unit_amount: article.cents, product_data: { name: article.nom } },
      }],
      metadata: meta,
      payment_intent_data: { metadata: meta },
      success_url: `${BASE_URL}/cafe-jeux?achat=ok&skin=${encodeURIComponent(skin as string)}`,
      cancel_url: `${BASE_URL}/cafe-jeux`,
    });
    return { url: session.url as string };
  },
);

export async function traiterSkinPaye(objet: Record<string, any>): Promise<void> {
  const uid: string | undefined = objet.metadata?.uid ?? objet.client_reference_id ?? undefined;
  const skin: string | undefined = objet.metadata?.skin;
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
