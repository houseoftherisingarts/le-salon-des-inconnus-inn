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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoomSuggestions = exports.getHostawayQuote = exports.getHostawayCalendar = exports.getHostawayAvailability = exports.onNewMember = exports.onShowOffer = exports.onWwooferVisitRequest = exports.onWwooferApplication = exports.onCommunityApplication = exports.createShowTicketPayment = exports.createCeilidhPayment = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v1"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const nodemailer_1 = __importDefault(require("nodemailer"));
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
// ─── Email notifications → Alex ───────────────────────────────────────────────
// Every inbound request or signup on the site emails alex@lesalondesinconnus.com
// so nothing has to be discovered by checking the CRM. Sent through Zoho SMTP
// (smtp.zohocloud.ca:465), the same account used everywhere else. Two secrets:
//   firebase functions:secrets:set ZOHO_USER   (alex@lesalondesinconnus.com)
//   firebase functions:secrets:set ZOHO_PASS   (Zoho app password)
// then: firebase deploy --only functions   (deploys all the triggers below)
const NOTIFY_TO = 'alex@lesalondesinconnus.com';
const RUNTIME_WITH_SMTP = { secrets: ['ZOHO_USER', 'ZOHO_PASS'] };
// Build a one-off Zoho transporter from the runtime secrets. Returns null (and
// logs) if the secrets aren't present, so a misconfig never crashes a write.
function smtpTransport() {
    const user = process.env.ZOHO_USER;
    const pass = process.env.ZOHO_PASS;
    if (!user || !pass) {
        console.error('ZOHO_USER / ZOHO_PASS not set — skipping notification email.');
        return null;
    }
    return nodemailer_1.default.createTransport({
        host: 'smtp.zohocloud.ca',
        port: 465,
        secure: true,
        auth: { user, pass },
    });
}
// Send a plain-text notification to Alex. Never throws — a failed email must not
// fail the Firestore write that triggered it.
async function notifyAlex(subject, body) {
    const transporter = smtpTransport();
    if (!transporter)
        return;
    const from = `"Le Salon des Inconnus" <${process.env.ZOHO_USER}>`;
    try {
        await transporter.sendMail({ from, to: NOTIFY_TO, subject, text: body });
    }
    catch (err) {
        console.error('Notification email failed:', subject, err);
    }
}
// Small helper: "Label: value\n" only when value is non-empty.
function line(label, value) {
    return value !== undefined && value !== null && value !== '' ? `${label}: ${String(value)}\n` : '';
}
// 1. Community membership application — the paid resident place (André's spot).
exports.onCommunityApplication = functions
    .runWith(RUNTIME_WITH_SMTP)
    .firestore.document('communityApplications/{uid}')
    .onCreate(async (snap) => {
    const a = snap.data() ?? {};
    const body = `Nouvelle candidature pour la place de membre de la communauté (la place d'André).\n\n` +
        line('Nom', a.displayName) +
        line('Courriel', a.email) +
        line('Téléphone', a.phone) +
        line('Vient de', a.city) +
        line('Disponibilité', a.availability) +
        `\n--- Présentation ---\n${a.introduction ?? ''}\n` +
        `\n--- Pourquoi la communauté / pourquoi ici ---\n${a.communityMotivation ?? ''}\n` +
        (a.cleaningAttitude ? `\n--- Rapport au ménage ---\n${a.cleaningAttitude}\n` : '') +
        (a.personalProjects ? `\n--- Projets personnels ---\n${a.personalProjects}\n` : '') +
        (a.workspaceNeeds ? `\n--- Espace de travail souhaité ---\n${a.workspaceNeeds}\n` : '') +
        (a.needs ? `\n--- Besoins ---\n${a.needs}\n` : '') +
        `\nÀ traiter dans le CRM admin (onglet Communauté).`;
    await notifyAlex(`Nouvelle candidature communauté — ${a.displayName ?? 'Inconnu'}`, body);
});
// 2. Wwoofer application (the volunteer room-and-board flow).
exports.onWwooferApplication = functions
    .runWith(RUNTIME_WITH_SMTP)
    .firestore.document('wwoofers/{uid}')
    .onCreate(async (snap) => {
    const w = snap.data() ?? {};
    const body = `Nouvelle candidature wwoofer.\n\n` +
        line('Nom', w.displayName) +
        line('Courriel', w.email) +
        line('Téléphone', w.phone) +
        line('Ville', [w.city, w.country].filter(Boolean).join(', ')) +
        line('Âge', w.age) +
        line('Langues', Array.isArray(w.languages) ? w.languages.join(', ') : w.languages) +
        line('Tâches préférées', Array.isArray(w.preferredTasks) ? w.preferredTasks.join(', ') : w.preferredTasks) +
        line('Hébergement', w.accommodationPreference) +
        (w.experience ? `\n--- Expérience ---\n${w.experience}\n` : '') +
        (w.motivations ? `\n--- Motivations ---\n${w.motivations}\n` : '') +
        (w.needs ? `\n--- Besoins ---\n${w.needs}\n` : '') +
        `\nÀ traiter dans le CRM admin (onglet Wwoofing).`;
    await notifyAlex(`Nouvelle candidature wwoofer — ${w.displayName ?? 'Inconnu'}`, body);
});
// 3. Wwoofer date request (a new visit window from an existing wwoofer).
exports.onWwooferVisitRequest = functions
    .runWith(RUNTIME_WITH_SMTP)
    .firestore.document('wwoofers/{uid}/visitRequests/{reqId}')
    .onCreate(async (snap, context) => {
    const r = snap.data() ?? {};
    let who = context.params.uid;
    try {
        const parent = await admin.firestore().doc(`wwoofers/${context.params.uid}`).get();
        const p = parent.data();
        if (p?.displayName)
            who = `${p.displayName}${p.email ? ` (${p.email})` : ''}`;
    }
    catch { /* fall back to uid */ }
    const body = `Nouvelle demande de dates wwoofer.\n\n` +
        line('Wwoofer', who) +
        line('Du', r.startDate) +
        line('Au', r.endDate) +
        line('Durée', r.numberOfDays ? `${r.numberOfDays} jours` : undefined) +
        (r.notes ? `\nNotes: ${r.notes}\n` : '') +
        `\nÀ traiter dans le CRM admin (onglet Wwoofing).`;
    await notifyAlex(`Demande de dates wwoofer — ${r.startDate ?? ''} → ${r.endDate ?? ''}`, body);
});
// 4. Show offer — an artist offering to perform (events/{id}/showOffers).
exports.onShowOffer = functions
    .runWith(RUNTIME_WITH_SMTP)
    .firestore.document('events/{eventId}/showOffers/{offerId}')
    .onCreate(async (snap, context) => {
    const o = snap.data() ?? {};
    const body = `Nouvelle offre de spectacle (événement ${context.params.eventId}).\n\n` +
        line('Artiste', o.artistName) +
        line('Contact', o.contactName) +
        line('Courriel', o.email) +
        line('Téléphone', o.phone) +
        line('Type', o.type) +
        line('Cachet demandé (CAD)', o.requestedFeeCAD) +
        line('Nb interprètes', o.performersCount) +
        line('Durée (min)', o.durationMinutes) +
        line('Genre', o.genre) +
        (o.description ? `\n--- Description ---\n${o.description}\n` : '') +
        (o.technicalNeeds ? `\n--- Besoins techniques ---\n${o.technicalNeeds}\n` : '') +
        (o.notes ? `\nNotes: ${o.notes}\n` : '') +
        `\nÀ traiter dans le CRM admin (onglet Spectacles).`;
    await notifyAlex(`Nouvelle offre de spectacle — ${o.artistName ?? 'Inconnu'}`, body);
});
// 5. New member signup — an adhésion to the Salon.
exports.onNewMember = functions
    .runWith(RUNTIME_WITH_SMTP)
    .firestore.document('members/{uid}')
    .onCreate(async (snap) => {
    const m = snap.data() ?? {};
    const body = `Nouvelle adhésion sur le site.\n\n` +
        line('Nom', m.displayName) +
        line('Courriel', m.email) +
        line('Téléphone', m.phone) +
        line('Type', m.membershipType) +
        `\nVisible dans le CRM admin (onglet Membres).`;
    await notifyAlex(`Nouvelle adhésion — ${m.displayName ?? m.email ?? 'Inconnu'}`, body);
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
    345789, 345790, 345792, 345787, 345786, 345791, 345788, 559483,
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
// Fetch a listing's raw calendar for [startDate, endDate] inclusive. Shared by
// the availability/suggestion endpoints so the calendar logic lives in one place.
async function fetchCalendar(token, listingId, startDate, endDate) {
    const url = `${HOSTAWAY_BASE}/listings/${listingId}/calendar?startDate=${startDate}&endDate=${endDate}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json());
    if (!res.ok || json.status !== 'success' || !Array.isArray(json.result)) {
        console.error('HostAway calendar error:', res.status, JSON.stringify(json).slice(0, 500));
        throw new https_1.HttpsError('internal', 'Could not read HostAway availability.');
    }
    return json.result;
}
// Add `days` calendar-days to a YYYY-MM-DD string (UTC, no DST drift).
function addDays(date, days) {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}
function nightsBetween(checkIn, checkOut) {
    return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000);
}
// Given the occupied nights [checkIn, checkOut) drawn from a calendar map, decide
// whether the stay is fully available AND satisfies the listing's minimum stay.
function windowIsBookable(byDate, checkIn, checkOut) {
    const requestedNights = nightsBetween(checkIn, checkOut);
    if (requestedNights <= 0)
        return false;
    let minStay = 1;
    for (let cursor = checkIn; cursor < checkOut; cursor = addDays(cursor, 1)) {
        const day = byDate.get(cursor);
        if (!day || day.isAvailable !== 1 || day.status !== 'available')
            return false;
        minStay = Math.max(minStay, day.minimumStay ?? 1);
    }
    return requestedNights >= minStay;
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
    const result = await fetchCalendar(token, id, startDate, endDate);
    // The occupied nights are [startDate, endDate). Exclude the checkout day.
    const nights = result.filter((d) => d.date >= startDate && d.date < endDate);
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
// getHostawayCalendar(listingId, startDate, endDate)
//   → { days: [{ date, available, minimumStay, price }] }
// Per-day availability for the booking calendar UI: every day in [startDate,
// endDate] inclusive, so unavailable days can be shown crossed out. Read-only.
exports.getHostawayCalendar = (0, https_1.onCall)({ secrets: [HOSTAWAY_API_KEY, HOSTAWAY_ACCOUNT_ID], cors: true }, async (request) => {
    const { listingId, startDate, endDate } = (request.data ?? {});
    const id = validateListing(listingId);
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
        throw new https_1.HttpsError('invalid-argument', 'Dates must be YYYY-MM-DD.');
    }
    if (startDate >= endDate) {
        throw new https_1.HttpsError('invalid-argument', 'endDate must be after startDate.');
    }
    const token = await getHostawayToken();
    const result = await fetchCalendar(token, id, startDate, endDate);
    const days = result.map((d) => ({
        date: d.date,
        available: d.isAvailable === 1 && d.status === 'available',
        minimumStay: d.minimumStay ?? 1,
        price: d.price ?? null,
    }));
    return { days };
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
// getRoomSuggestions(listingId, checkIn, checkOut, numberOfGuests)
//   → { alternateRooms: [{ listingId, available: true }], closestDates: { checkIn, checkOut } | null }
// Used when the chosen room is NOT free for the chosen dates. Offers two ways
// forward, both computed server-side from the live calendar:
//   1. alternateRooms — the OTHER allow-listed listings that are fully open and
//      meet their minimum stay for the SAME checkIn..checkOut.
//   2. closestDates   — for the GIVEN listing, the nearest window of the same
//      nights count within roughly +/- 45 days of checkIn (soonest on/after the
//      requested date preferred, else the closest earlier window).
// guests is validated for parity with the other endpoints but availability does
// not depend on it; price is intentionally not fetched here to keep latency low.
const SUGGESTION_WINDOW_DAYS = 45;
exports.getRoomSuggestions = (0, https_1.onCall)({ secrets: [HOSTAWAY_API_KEY, HOSTAWAY_ACCOUNT_ID], cors: true }, async (request) => {
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
    const nights = nightsBetween(checkIn, checkOut);
    const token = await getHostawayToken();
    // 1. Other rooms free for the SAME dates. Check all 6 in parallel; if any one
    //    calendar read fails, drop just that room rather than failing the request.
    const others = [...ALLOWED_LISTINGS].filter((other) => other !== id);
    const alternateResults = await Promise.all(others.map(async (other) => {
        try {
            const cal = await fetchCalendar(token, other, checkIn, checkOut);
            const byDate = new Map(cal.map((d) => [d.date, d]));
            return windowIsBookable(byDate, checkIn, checkOut)
                ? { listingId: other, available: true }
                : null;
        }
        catch (err) {
            console.error('Suggestion calendar read failed for', other, err);
            return null;
        }
    }));
    const alternateRooms = alternateResults.filter((r) => r !== null);
    // 2. Closest available window of the same length for the GIVEN room. Pull one
    //    calendar spanning the search window, then slide an N-night window.
    let closestDates = null;
    try {
        const searchStart = addDays(checkIn, -SUGGESTION_WINDOW_DAYS);
        // +nights so a window starting on the last in-window day still has its
        // checkout night present in the fetched calendar.
        const searchEnd = addDays(checkIn, SUGGESTION_WINDOW_DAYS + nights);
        const cal = await fetchCalendar(token, id, searchStart, searchEnd);
        const byDate = new Map(cal.map((d) => [d.date, d]));
        // Candidate check-ins ordered by distance from the requested date, ties
        // broken in favour of the later (on/after) date.
        const candidates = [];
        for (let offset = 0; offset <= SUGGESTION_WINDOW_DAYS; offset++) {
            candidates.push(addDays(checkIn, offset));
            if (offset > 0)
                candidates.push(addDays(checkIn, -offset));
        }
        for (const candIn of candidates) {
            const candOut = addDays(candIn, nights);
            if (windowIsBookable(byDate, candIn, candOut)) {
                closestDates = { checkIn: candIn, checkOut: candOut };
                break;
            }
        }
    }
    catch (err) {
        console.error('Closest-dates search failed:', err);
        closestDates = null;
    }
    return { alternateRooms, closestDates };
});
//# sourceMappingURL=index.js.map