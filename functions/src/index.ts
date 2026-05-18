import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';

admin.initializeApp();

// ─── Square client ────────────────────────────────────────────────────────────
// IMPORTANT: the `square` SDK is heavy and eager-imports thousands of API
// definitions at module load (~9s on cold start). Importing it at the top
// of this file caused `firebase deploy` to hit the 10s "User code failed
// to load" timeout. Load it lazily inside the handler so module init stays
// fast and the SDK is only paid for when a payment actually happens.
//
// Set credentials via either functions config or env vars on the deploy:
//   firebase functions:config:set square.access_token="..." square.location_id="..." square.environment="production"
// (Functions in 1st gen read process.env.* in addition to functions.config().)
async function getSquareClient() {
  const { SquareClient, SquareEnvironment } = await import('square');
  const accessToken = process.env.SQUARE_ACCESS_TOKEN ?? '';
  const env = (process.env.SQUARE_ENVIRONMENT ?? 'sandbox').toLowerCase();
  return new SquareClient({
    token: accessToken,
    environment: env === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });
}

// ─── createCeilidhPayment ─────────────────────────────────────────────────────
// Callable function: accepts { nonce, amountCents (CAD cents), note }
// Returns { paymentId }

export const createCeilidhPayment = functions.https.onCall(async (data, context) => {
  const { nonce, amountCents, note } = data as {
    nonce: string;
    amountCents: number;
    note?: string;
  };

  if (!nonce || !amountCents || amountCents < 100) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid payment data.');
  }

  const client = await getSquareClient();

  try {
    const response = await client.payments.create({
      sourceId: nonce,
      idempotencyKey: `ceilidh-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'CAD',
      },
      note: note ?? 'Contribution — Grand Ceilidh de Mai 2026',
      locationId: process.env.SQUARE_LOCATION_ID,
    });

    const payment = response.payment;
    if (!payment) throw new Error('No payment in response');

    // Persist the contribution in Firestore for records
    await admin.firestore()
      .collection('events')
      .doc('ceilidh-mai-2026')
      .collection('contributions')
      .add({
        paymentId: payment.id,
        amountCents,
        note: note ?? '',
        uid: context.auth?.uid ?? null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return { success: true, paymentId: payment.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Square payment error:', msg);
    throw new functions.https.HttpsError('internal', `Payment failed: ${msg}`);
  }
});

// ─── createShowTicketPayment ──────────────────────────────────────────────────
// Callable function: accepts { nonce, ticketType, nights, displayName, email }
// Returns { ticketCode, paymentId }

const SHOW_CAPACITY = 20;

export const createShowTicketPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { nonce, ticketType, nights, displayName, email } = data as {
    nonce: string;
    ticketType: 'single' | 'weekend';
    nights: string[];
    displayName: string;
    email: string;
  };

  if (!nonce || !ticketType) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid ticket data.');
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const ticketsRef = db.collection('events').doc('ceilidh-mai-2026').collection('showTickets');

  // Check if user already has a ticket
  const existing = await ticketsRef.doc(uid).get();
  if (existing.exists) {
    throw new functions.https.HttpsError('already-exists', 'You already have a show ticket.');
  }

  // Check capacity
  const countSnap = await ticketsRef.get();
  if (countSnap.size >= SHOW_CAPACITY) {
    throw new functions.https.HttpsError('resource-exhausted', 'Show is sold out.');
  }

  const amountCents = ticketType === 'weekend' ? 2000 : 1000;
  const client = await getSquareClient();

  try {
    const response = await client.payments.create({
      sourceId: nonce,
      idempotencyKey: `show-${uid}-${Date.now()}`,
      amountMoney: { amount: BigInt(amountCents), currency: 'CAD' },
      note: ticketType === 'weekend'
        ? 'Passe Weekend — Grand Ceilidh de Mai 2026'
        : 'Billet Spectacle — Grand Ceilidh de Mai 2026',
      locationId: process.env.SQUARE_LOCATION_ID,
    });

    const payment = response.payment;
    if (!payment) throw new Error('No payment in response');

    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const ticketCode = `CEIL26-${uid.slice(0, 4).replace(/[^A-Za-z0-9]/g, 'X').toUpperCase()}-${suffix}`;

    await ticketsRef.doc(uid).set({
      uid,
      displayName,
      email,
      ticketType,
      nights,
      amountCents,
      squarePaymentId: payment.id,
      ticketCode,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, ticketCode, paymentId: payment.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Show ticket payment error:', msg);
    throw new functions.https.HttpsError('internal', `Payment failed: ${msg}`);
  }
});
