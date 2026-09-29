// assistance.ts : la carte « Brancher Stripe avec Alex » du Profil Pro.
// Un paiement unique de 80 $ CAD pour un appel en tête-à-tête où Alex
// branche avec l'artiste ses liens de paiement Stripe.
//
//   • creerPaiementAssistance (onCall) : ouvre la session Checkout, en mode
//     paiement, sans SDK Stripe (même client HTTP que profilPro.ts).
//   • traiterAssistancePayee : appelée par webhookProfilPro quand la session
//     porte metadata.entite = 'salon' et metadata.produit = 'assistance';
//     écrit assistances/{uid} et prévient Alex par le courriel habituel.

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { PROJET, stripeFetch } from './profilPro';
import { line, notifyAlex } from './courriel';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const PRIX_ASSISTANCE_CENTS = 8000; // 80,00 $ CAD, une fois
const BASE_URL = 'https://www.lesalondesinconnus.com';

// La même porte que l'abonnement (metadata.projet) : le compte Stripe est partagé
// avec d'autres projets, et rien d'autre que ce projet ne doit entrer ici.
export function estAssistance(objet: Record<string, any>): boolean {
  return objet?.metadata?.projet === PROJET
    && objet?.metadata?.entite === 'salon'
    && objet?.metadata?.produit === 'assistance';
}

export const creerPaiementAssistance = onCall(
  { secrets: [STRIPE_SECRET_KEY], invoker: 'public' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Il faut être connecté pour réserver l’assistance.');
    }
    const uid = request.auth.uid;
    const deja = await admin.firestore().doc(`assistances/${uid}`).get();
    if (deja.exists && deja.data()?.statut) {
      return { dejaPayee: true };
    }
    const courriel = request.auth.token.email as string | undefined;
    const session = await stripeFetch(STRIPE_SECRET_KEY.value(), 'POST', 'checkout/sessions', {
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
      metadata: { projet: PROJET, entite: 'salon', produit: 'assistance', uid },
      payment_intent_data: { metadata: { projet: PROJET, entite: 'salon', produit: 'assistance', uid } },
      success_url: `${BASE_URL}/creator?assistance=merci`,
      cancel_url: `${BASE_URL}/creator?assistance=annule`,
    });
    return { url: session.url as string };
  },
);

export async function traiterAssistancePayee(objet: Record<string, any>): Promise<void> {
  const uid: string | undefined = objet.metadata?.uid ?? objet.client_reference_id ?? undefined;
  if (!uid) {
    console.error('Assistance payée sans uid, session', objet.id);
    return;
  }
  // checkout.session.completed arrive aussi pour une session non réglée
  // (paiement différé) : seule une session payée, du bon montant en CAD, compte.
  if (objet.payment_status !== 'paid') {
    console.warn('Assistance : session non payée ignorée', objet.id, objet.payment_status);
    return;
  }
  if ((objet.amount_total ?? 0) < PRIX_ASSISTANCE_CENTS || objet.currency !== 'cad') {
    console.error('Assistance : montant ou devise inattendus', objet.id, objet.amount_total, objet.currency);
    return;
  }
  // Stripe relivre parfois un événement : la même session ne s'écrit qu'une fois,
  // et un appel déjà fait (statut posé par Alex) ne redescend jamais à « payee ».
  const ficheRef = admin.firestore().doc(`assistances/${uid}`);
  const existante = (await ficheRef.get()).data();
  if (existante?.stripeSessionId === objet.id || existante?.statut === 'appel-fait') {
    return;
  }
  const details = objet.customer_details ?? {};
  const fiche = {
    statut: 'payee',
    courriel: (details.email ?? objet.customer_email ?? '') as string,
    telephone: (details.phone ?? '') as string,
    nom: (details.name ?? '') as string,
    payeLe: admin.firestore.FieldValue.serverTimestamp(),
    stripeSessionId: objet.id ?? null,
    montant: objet.amount_total ?? PRIX_ASSISTANCE_CENTS,
  };
  await ficheRef.set(fiche, { merge: true });

  let nomArtiste = '';
  try {
    const config = await admin.firestore().doc(`members/${uid}/superProfile/config`).get();
    nomArtiste = (config.data()?.displayName as string | undefined) ?? (config.data()?.username as string | undefined) ?? '';
  } catch { /* le nom d'artiste aide Alex, il ne bloque rien */ }

  await notifyAlex(
    `Assistance Stripe payée : ${fiche.nom || fiche.courriel || uid}`,
    "Un artiste du Profil Pro a payé l'appel « Brancher Stripe avec Alex » (80 $).\n\n"
      + line('Nom', fiche.nom)
      + line('Artiste', nomArtiste)
      + line('Courriel', fiche.courriel)
      + line('Téléphone', fiche.telephone)
      + line('uid', uid)
      + `\nUne fois l'appel fait, poser statut = 'appel-fait' dans assistances/${uid}.`,
  );
}
