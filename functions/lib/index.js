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
exports.createRoomReservation = exports.getHostawayQuote = exports.getHostawayAvailability = exports.createShowTicketPayment = exports.createCeilidhPayment = void 0;
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
// Shared availability check used by both getHostawayAvailability (read-only,
// Phase 1) and createRoomReservation (Phase 2, re-validated server-side). The
// occupied nights are [startDate, endDate); the checkout day is excluded from
// the verdict (a 3-night stay only needs its 3 occupied nights free).
async function fetchAvailability(id, startDate, endDate) {
    const token = await getHostawayToken();
    const url = `${HOSTAWAY_BASE}/listings/${id}/calendar?startDate=${startDate}&endDate=${endDate}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json());
    if (!res.ok || json.status !== 'success' || !Array.isArray(json.result)) {
        console.error('HostAway calendar error:', res.status, JSON.stringify(json).slice(0, 500));
        throw new https_1.HttpsError('internal', 'Could not read HostAway availability.');
    }
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
    return fetchAvailability(id, startDate, endDate);
});
// Shared price quote used by both getHostawayQuote (Phase 1) and
// createRoomReservation (Phase 2, re-computed server-side). POSTs
// /listings/{id}/calendar/priceDetails. The total is taken verbatim from
// HostAway (authoritative); the client never computes or is trusted for price.
async function fetchQuote(id, checkIn, checkOut, guests) {
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
    return { total: result.totalPrice ?? null, currency: 'CAD', components, nights };
}
// getHostawayQuote(listingId, checkIn, checkOut, numberOfGuests)
//   → { total, currency, components, nights }
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
    return fetchQuote(id, checkIn, checkOut, guests);
});
// ─── createRoomReservation (Phase 2 — native on-site checkout) ────────────────
// Single callable that owns the whole native booking flow so the guest never
// leaves lesalondesinconnus.com and never sees HostAway's UI:
//   1. Re-validate availability for the dates server-side (never trust client).
//   2. Re-compute the authoritative quote server-side (never trust client price).
//   3. Charge the card via Square for the quoted total in CAD (idempotency key).
//   4. Create the reservation in HostAway (POST /v1/reservations).
//   5. Atomicity: if the charge succeeds but the HostAway create fails, refund
//      the Square charge automatically (or flag for manual refund) and error.
//
// LIVE_BOOKING_ENABLED gates steps 3+4 so the function can be deployed dark and
// flipped on only after a supervised test. Default OFF. When OFF, steps 1+2 run
// (they're the same safe read endpoints Phase 1 already uses) and the function
// returns { dryRun: true, quote, hostawayBody } so the exact request shapes can
// be inspected without moving any money or creating any reservation.
//
// HostAway reservation field names below are verified against the live HostAway
// Public API reference (api.hostaway.com/documentation, "Reservation object" /
// "Create a reservation"): listingMapId, channelId (2000 = "direct"),
// arrivalDate, departureDate, guestName/guestFirstName/guestLastName,
// guestEmail, phone, numberOfGuests, totalPrice, currency, status ("new"),
// isPaid (1). forceOverbooking is a query param (we send 0).
// Flip to 'true' in the deployed env (or here, supervised) to arm real charges
// + real reservation creation. Read from env so it can be toggled without code.
const LIVE_BOOKING_ENABLED = (process.env.LIVE_BOOKING_ENABLED ?? 'false').toLowerCase() === 'true';
// HostAway channel id for direct / website bookings (verified from the channel
// table in the API docs: 2000 = "direct").
const HOSTAWAY_DIRECT_CHANNEL_ID = 2000;
function splitName(full) {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1)
        return { first: parts[0], last: '' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
}
async function createHostawayReservation(token, body) {
    // forceOverbooking=0 — never silently double-book; if HostAway says the dates
    // are taken (race with another channel), let it fail so we refund.
    const res = await fetch(`${HOSTAWAY_BASE}/reservations?forceOverbooking=0`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-control': 'no-cache',
        },
        body: JSON.stringify(body),
    });
    const json = (await res.json());
    if (!res.ok || json.status !== 'success' || !json.result?.id) {
        console.error('HostAway reservation create error:', res.status, JSON.stringify(json).slice(0, 800));
        throw new Error(json.message || `HostAway create failed (HTTP ${res.status})`);
    }
    return { id: json.result.id, raw: json.result };
}
exports.createRoomReservation = (0, https_1.onCall)({
    secrets: [HOSTAWAY_API_KEY, HOSTAWAY_ACCOUNT_ID],
    cors: true,
    // The Square SDK is heavy; give the cold start room and the network calls
    // (HostAway availability + quote + create, Square charge) headroom.
    timeoutSeconds: 60,
    memory: '512MiB',
}, async (request) => {
    const { listingId, checkIn, checkOut, numberOfGuests, guestName, guestEmail, guestPhone, nonce, } = (request.data ?? {});
    // ── Validate inputs ───────────────────────────────────────────────────────
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
    const name = (guestName ?? '').trim();
    const email = (guestEmail ?? '').trim();
    const phone = (guestPhone ?? '').trim();
    if (name.length < 2) {
        throw new https_1.HttpsError('invalid-argument', 'Guest name is required.');
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new https_1.HttpsError('invalid-argument', 'A valid email is required.');
    }
    // ── 1. Re-validate availability server-side ───────────────────────────────
    const availability = await fetchAvailability(id, checkIn, checkOut);
    if (!availability.allAvailable) {
        throw new https_1.HttpsError('failed-precondition', 'These dates are no longer available.');
    }
    if (!availability.meetsMinStay) {
        throw new https_1.HttpsError('failed-precondition', `Minimum stay is ${availability.minStay} nights for these dates.`);
    }
    // ── 2. Re-compute the authoritative quote server-side ─────────────────────
    const quote = await fetchQuote(id, checkIn, checkOut, guests);
    if (quote.total == null || !(quote.total > 0)) {
        throw new https_1.HttpsError('internal', 'Could not compute an authoritative price.');
    }
    const totalCad = quote.total;
    // Square charges in the smallest unit (CAD cents).
    const amountCents = Math.round(totalCad * 100);
    const { first, last } = splitName(name);
    // The exact HostAway create-reservation body. Built here (not on the client)
    // so the listing, dates, guest count, price, and paid status are all
    // server-authoritative.
    const hostawayBody = {
        listingMapId: id,
        channelId: HOSTAWAY_DIRECT_CHANNEL_ID, // 2000 = direct / website
        channelName: 'direct',
        arrivalDate: checkIn,
        departureDate: checkOut,
        numberOfGuests: guests,
        guestName: name,
        guestFirstName: first,
        guestLastName: last,
        guestEmail: email,
        phone,
        totalPrice: totalCad,
        currency: 'CAD',
        status: 'new', // confirmed reservation
        isPaid: 1, // paid up-front via Square
        isManuallyChecked: 1,
    };
    // ── Dark mode: validate the shapes, move no money, create nothing ─────────
    if (!LIVE_BOOKING_ENABLED) {
        console.log('createRoomReservation DRY RUN — LIVE_BOOKING_ENABLED is off.', {
            amountCents,
            hostawayBody,
        });
        return {
            dryRun: true,
            liveBookingEnabled: false,
            quote: { total: totalCad, currency: 'CAD', nights: quote.nights, components: quote.components },
            amountCents,
            hostawayBody,
            message: 'Validated availability + quote and built the charge and reservation request bodies. ' +
                'No card was charged and no reservation was created (LIVE_BOOKING_ENABLED is off).',
        };
    }
    // ── 3. Charge the card via Square (live) ──────────────────────────────────
    if (!nonce) {
        throw new https_1.HttpsError('invalid-argument', 'Missing card token.');
    }
    if (amountCents < 100) {
        throw new https_1.HttpsError('failed-precondition', 'Computed amount is below the minimum charge.');
    }
    const square = await getSquareClient();
    const idempotencyKey = `room-${id}-${checkIn}-${checkOut}-${Date.now()}`;
    let paymentId;
    try {
        const payRes = await square.payments.create({
            sourceId: nonce,
            idempotencyKey,
            amountMoney: { amount: BigInt(amountCents), currency: 'CAD' },
            note: `Room booking — ${name} — ${checkIn} to ${checkOut} (listing ${id})`,
            locationId: process.env.SQUARE_LOCATION_ID,
        });
        paymentId = payRes.payment?.id;
        if (!paymentId)
            throw new Error('No payment id in Square response.');
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Square room charge failed:', msg);
        throw new https_1.HttpsError('internal', `Payment failed: ${msg}`);
    }
    // ── 4. Create the reservation in HostAway ─────────────────────────────────
    //    + 5. Atomicity: refund the charge if the create fails.
    let reservation;
    try {
        const token = await getHostawayToken();
        reservation = await createHostawayReservation(token, {
            ...hostawayBody,
            // Cross-reference the Square charge on the reservation for reconciliation.
            guestNote: `Square paymentId: ${paymentId}`,
        });
    }
    catch (createErr) {
        const createMsg = createErr instanceof Error ? createErr.message : String(createErr);
        console.error('Reservation create failed after charge — refunding.', createMsg);
        // Automatic refund of the Square charge.
        let refunded = false;
        try {
            await square.refunds.refundPayment({
                idempotencyKey: `refund-${idempotencyKey}`,
                paymentId,
                amountMoney: { amount: BigInt(amountCents), currency: 'CAD' },
                reason: 'Reservation could not be created in HostAway.',
            });
            refunded = true;
        }
        catch (refundErr) {
            const refundMsg = refundErr instanceof Error ? refundErr.message : String(refundErr);
            // The charge is stranded — record it loudly for manual refund.
            console.error('AUTO-REFUND FAILED — MANUAL REFUND REQUIRED.', {
                paymentId,
                amountCents,
                refundMsg,
            });
            try {
                await admin.firestore().collection('roomBookingRefundFailures').add({
                    paymentId,
                    amountCents,
                    listingId: id,
                    checkIn,
                    checkOut,
                    guestName: name,
                    guestEmail: email,
                    reason: createMsg,
                    refundError: refundMsg,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            catch {
                /* best-effort flag; the console.error above is the source of truth */
            }
        }
        throw new https_1.HttpsError('internal', refunded
            ? 'We could not confirm your reservation, so your payment was refunded. Please try again.'
            : 'We could not confirm your reservation and the automatic refund did not go through. ' +
                'Our team has been alerted and will refund you manually.');
    }
    // ── Confirmation ──────────────────────────────────────────────────────────
    // Best-effort record for our own books; never block the confirmation on it.
    try {
        await admin.firestore().collection('roomBookings').add({
            hostawayReservationId: reservation.id,
            squarePaymentId: paymentId,
            listingId: id,
            checkIn,
            checkOut,
            numberOfGuests: guests,
            guestName: name,
            guestEmail: email,
            guestPhone: phone,
            totalCad,
            currency: 'CAD',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (logErr) {
        console.error('roomBookings log write failed (non-fatal):', logErr);
    }
    return {
        success: true,
        reservationId: reservation.id,
        paymentId,
        checkIn,
        checkOut,
        nights: quote.nights,
        total: totalCad,
        currency: 'CAD',
        guestName: name,
    };
});
//# sourceMappingURL=index.js.map