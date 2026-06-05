"use strict";
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
exports.getHostawayQuote = exports.getHostawayAvailability = exports.createShowTicketPayment = exports.createCeilidhPayment = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v1"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
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
    const { SquareClient, SquareEnvironment } = await Promise.resolve().then(() => __importStar(require('square')));
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
exports.createCeilidhPayment = functions.https.onCall(async (data, context) => {
    const { nonce, amountCents, note } = data;
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
        if (!payment)
            throw new Error('No payment in response');
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
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Square payment error:', msg);
        throw new functions.https.HttpsError('internal', `Payment failed: ${msg}`);
    }
});
// ─── createShowTicketPayment ──────────────────────────────────────────────────
// Callable function: accepts { nonce, ticketType, nights, displayName, email }
// Returns { ticketCode, paymentId }
const SHOW_CAPACITY = 20;
exports.createShowTicketPayment = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { nonce, ticketType, nights, displayName, email } = data;
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
        if (!payment)
            throw new Error('No payment in response');
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
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Show ticket payment error:', msg);
        throw new functions.https.HttpsError('internal', `Payment failed: ${msg}`);
    }
});
// ─── HostAway integration (Phase 1) ───────────────────────────────────────────
// Read-only: real availability + an authoritative live price quote. These are
// 2nd-gen callable functions so they can pull HOSTAWAY_API_KEY / ACCOUNT_ID from
// Firebase Secret Manager. The Square functions above stay 1st gen and untouched.
//
// Deploy: set the two secrets first, then deploy only these two functions:
//   firebase functions:secrets:set HOSTAWAY_API_KEY
//   firebase functions:secrets:set HOSTAWAY_ACCOUNT_ID
//   firebase deploy --only functions:getHostawayAvailability,functions:getHostawayQuote
//
// The key is never sent to the client; the price is always computed server-side.
const HOSTAWAY_API_KEY = (0, params_1.defineSecret)('HOSTAWAY_API_KEY');
const HOSTAWAY_ACCOUNT_ID = (0, params_1.defineSecret)('HOSTAWAY_ACCOUNT_ID');
const HOSTAWAY_BASE = 'https://api.hostaway.com/v1';
// The 7 confirmed live listing ids. Requests for anything else are rejected so
// this endpoint can't be turned into an open proxy against the HostAway account.
const ALLOWED_LISTINGS = new Set([
    345789, 345790, 345792, 345787, 345786, 345791, 345788,
]);
// Token cache shared across warm invocations of a single instance. HostAway
// access tokens are long-lived (≈ 24 months); we refresh well before expiry.
let cachedToken = null;
async function getHostawayToken() {
    const now = Date.now();
    if (cachedToken && cachedToken.expiresAt > now + 60000) {
        return cachedToken.value;
    }
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: HOSTAWAY_ACCOUNT_ID.value(),
        client_secret: HOSTAWAY_API_KEY.value(),
        scope: 'general',
    });
    const res = await fetch(`${HOSTAWAY_BASE}/accessTokens`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-control': 'no-cache',
        },
        body,
    });
    const json = (await res.json());
    if (!res.ok || !json.access_token) {
        console.error('HostAway token error:', res.status, JSON.stringify(json));
        throw new https_1.HttpsError('internal', 'Could not authenticate with HostAway.');
    }
    const ttlMs = (json.expires_in ?? 3600) * 1000;
    cachedToken = { value: json.access_token, expiresAt: now + ttlMs };
    return json.access_token;
}
// Accept only YYYY-MM-DD to keep the calendar / quote queries well-formed.
function isValidDate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}
function validateListing(listingId) {
    const id = Number(listingId);
    if (!Number.isInteger(id) || !ALLOWED_LISTINGS.has(id)) {
        throw new https_1.HttpsError('invalid-argument', 'Unknown listing.');
    }
    return id;
}
// getHostawayAvailability(listingId, startDate, endDate)
//   → { days: [{ date, available, minimumStay, price }], allAvailable, minStay }
// Reads GET /listings/{id}/calendar. `endDate` is the checkout day; the
// checkout night itself isn't required to be open, so it's excluded from the
// availability verdict (a 3-night stay only needs the 3 occupied nights free).
exports.getHostawayAvailability = (0, https_1.onCall)({ secrets: [HOSTAWAY_API_KEY, HOSTAWAY_ACCOUNT_ID], cors: true }, async (request) => {
    const { listingId, startDate, endDate } = (request.data ?? {});
    const id = validateListing(listingId);
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
        throw new https_1.HttpsError('invalid-argument', 'Dates must be YYYY-MM-DD.');
    }
    if (startDate >= endDate) {
        throw new https_1.HttpsError('invalid-argument', 'Check-out must be after check-in.');
    }
    const token = await getHostawayToken();
    const url = `${HOSTAWAY_BASE}/listings/${id}/calendar?startDate=${startDate}&endDate=${endDate}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json());
    if (!res.ok || json.status !== 'success' || !Array.isArray(json.result)) {
        console.error('HostAway calendar error:', res.status, JSON.stringify(json).slice(0, 500));
        throw new https_1.HttpsError('internal', 'Could not read HostAway availability.');
    }
    // The occupied nights are [startDate, endDate). Exclude the checkout day.
    const nights = json.result.filter((d) => d.date >= startDate && d.date < endDate);
    const days = nights.map((d) => ({
        date: d.date,
        available: d.isAvailable === 1 && d.status === 'available',
        minimumStay: d.minimumStay ?? 1,
        price: d.price ?? null,
    }));
    const allAvailable = days.length > 0 && days.every((d) => d.available);
    const minStay = days.reduce((m, d) => Math.max(m, d.minimumStay), 1);
    const requestedNights = days.length;
    const meetsMinStay = requestedNights >= minStay;
    return { days, allAvailable, minStay, requestedNights, meetsMinStay };
});
// getHostawayQuote(listingId, checkIn, checkOut, numberOfGuests)
//   → { total, currency, components, nights }
// POSTs /listings/{id}/calendar/priceDetails. The total is taken verbatim from
// HostAway (authoritative); the client never computes or is trusted for price.
exports.getHostawayQuote = (0, https_1.onCall)({ secrets: [HOSTAWAY_API_KEY, HOSTAWAY_ACCOUNT_ID], cors: true }, async (request) => {
    const { listingId, checkIn, checkOut, numberOfGuests } = (request.data ?? {});
    const id = validateListing(listingId);
    if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
        throw new https_1.HttpsError('invalid-argument', 'Dates must be YYYY-MM-DD.');
    }
    if (checkIn >= checkOut) {
        throw new https_1.HttpsError('invalid-argument', 'Check-out must be after check-in.');
    }
    const guests = Number(numberOfGuests);
    if (!Number.isInteger(guests) || guests < 1 || guests > 50) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid guest count.');
    }
    const token = await getHostawayToken();
    const res = await fetch(`${HOSTAWAY_BASE}/listings/${id}/calendar/priceDetails`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-control': 'no-cache',
        },
        body: JSON.stringify({
            startingDate: checkIn,
            endingDate: checkOut,
            numberOfGuests: guests,
        }),
    });
    const json = (await res.json());
    if (!res.ok || json.status !== 'success' || !json.result) {
        console.error('HostAway quote error:', res.status, JSON.stringify(json).slice(0, 500));
        throw new https_1.HttpsError('internal', 'Could not get a HostAway price quote.');
    }
    const result = json.result;
    const components = (result.components ?? [])
        .filter((c) => c.isIncludedInTotalPrice === 1)
        .map((c) => ({ type: c.type, name: c.name, title: c.title, total: c.total }));
    const msPerNight = 86400000;
    const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / msPerNight);
    return {
        total: result.totalPrice ?? null,
        currency: 'CAD',
        components,
        nights,
    };
});
//# sourceMappingURL=index.js.map