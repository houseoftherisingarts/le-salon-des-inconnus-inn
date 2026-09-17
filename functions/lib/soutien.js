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
exports.onMessageEntreMembres = exports.onProblemeTechnique = exports.onMessageSoutien = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("firebase-admin/auth");
const courriel_1 = require("./courriel");
// ─── 4.5 à 4.7 Le fil d'aide et les courriels entre membres ──────────────────
// Trois déclencheurs v1, même patron que les avertissements d'index.ts. Aucun ne
// lève d'erreur : un courriel raté ne casse jamais le message qui l'a déclenché.
const db = admin.firestore();
const LIEN_ADMIN = 'https://www.lesalondesinconnus.com/admin';
const LIEN_AIDE = 'https://www.lesalondesinconnus.com/compte?onglet=aide';
const LIEN_MESSAGES = 'https://www.lesalondesinconnus.com/compte?onglet=communaute&sous=messages';
// ─── 4.5 onMessageSoutien · un message dans le fil d'aide ────────────────────
// Le document parent se pose en set/merge, jamais en update : la règle laisse le
// membre créer un message sans que soutien/{uid} existe encore.
exports.onMessageSoutien = functions
    .runWith(courriel_1.RUNTIME_WITH_SMTP)
    .firestore.document('soutien/{uid}/messages/{id}')
    .onCreate(async (snap, context) => {
    const uid = context.params.uid;
    const msg = snap.data() ?? {};
    const auteur = msg.auteur === 'equipe' ? 'equipe' : 'membre';
    const texte = typeof msg.texte === 'string' ? msg.texte : '';
    await db.doc(`soutien/${uid}`).set({
        dernierMessage: texte.slice(0, 300),
        dernierMessageLe: admin.firestore.FieldValue.serverTimestamp(),
        dernierAuteur: auteur,
        ...(auteur === 'membre' ? { statut: 'ouvert' } : {}),
    }, { merge: true });
    // Un message du membre alerte Alex ; une réponse de l'équipe alerte le membre.
    if (auteur === 'membre') {
        const parent = (await db.doc(`soutien/${uid}`).get()).data() ?? {};
        const nom = parent.nom ?? 'Un membre';
        const courriel = parent.courriel ?? '';
        await (0, courriel_1.notifyAlex)(`Espace membre : message de ${nom}`, (0, courriel_1.line)('Nom', nom) +
            (0, courriel_1.line)('Courriel', courriel) +
            `\n${texte.slice(0, 2000)}\n` +
            `\nÀ traiter dans l'admin (section Aide aux membres) : ${LIEN_ADMIN}`);
    }
    else {
        // Réponse de l'équipe : courriel au membre tant que l'option reste cochée.
        try {
            const prefs = (await db.doc(`members/${uid}/prive/preferences`).get()).data();
            if (prefs?.courrielReponseEquipe !== false) {
                const authUser = await (0, auth_1.getAuth)().getUser(uid);
                if (authUser.emailVerified && authUser.email) {
                    const langue = prefs?.langue === 'EN' ? 'EN' : 'FR';
                    const prenom = (authUser.displayName ?? '').split(' ')[0] || authUser.email;
                    const corps = langue === 'EN'
                        ? `Hello ${prenom}, the Salon des Inconnus team has replied to your message. You can read the answer and continue the conversation in your space:`
                        : `Bonjour ${prenom}, l'équipe du Salon des Inconnus a répondu à votre message. Vous pouvez lire la réponse et poursuivre la conversation dans votre espace :`;
                    const bouton = langue === 'EN' ? 'Open my space' : 'Ouvrir mon espace';
                    const pied = langue === 'EN'
                        ? 'To stop these emails, untick the option in your preferences.'
                        : 'Pour ne plus recevoir ces courriels, décochez l\'option dans vos préférences.';
                    await (0, courriel_1.envoyerAuMembre)(authUser.email, langue === 'EN' ? 'The Salon team has replied' : 'L\'équipe du Salon vous a répondu', corps, LIEN_AIDE, bouton, pied);
                }
            }
        }
        catch (e) {
            console.warn('[soutien] courriel de réponse indisponible', e);
        }
    }
});
// ─── 4.6 onProblemeTechnique · signalement de bug ────────────────────────────
// Alerte Alex, puis transmet à l'oreille de Vexel quand la clé est posée. La clé
// n'apparaît jamais dans le navigateur : l'envoi part d'ici, côté serveur. Tant
// que VEXEL_CLE_SALON n'est pas posé dans Secret Manager (et déclaré dans
// `secrets`), le champ vaut `absent` et seul Alex est averti.
exports.onProblemeTechnique = functions
    .runWith(courriel_1.RUNTIME_WITH_SMTP)
    .firestore.document('problemesTechniques/{id}')
    .onCreate(async (snap) => {
    const p = snap.data() ?? {};
    const nom = p.nom ?? 'Un membre';
    const texte = typeof p.texte === 'string' ? p.texte : '';
    await (0, courriel_1.notifyAlex)(`Problème technique signalé par ${nom}`, (0, courriel_1.line)('Nom', p.nom) +
        (0, courriel_1.line)('Courriel', p.courriel) +
        (0, courriel_1.line)('Page', `https://www.lesalondesinconnus.com${p.page ?? ''}`) +
        (0, courriel_1.line)('Agent', p.agent) +
        (0, courriel_1.line)('Écran', p.ecran) +
        (p.capture ? (0, courriel_1.line)('Capture', p.capture) : '') +
        `\n${texte.slice(0, 2000)}\n` +
        `\nÀ traiter dans l'admin (section Aide aux membres).`);
    const cle = process.env.VEXEL_CLE_SALON;
    if (!cle) {
        await snap.ref.update({ vexel: 'absent' }).catch(() => { });
        return;
    }
    try {
        const res = await fetch('https://us-central1-vexel-integrations.cloudfunctions.net/recevoirDemande', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client: 'salon',
                cle,
                type: 'bug',
                auteurNom: p.nom ?? '',
                auteurCourriel: p.courriel ?? '',
                texte,
                page: `https://www.lesalondesinconnus.com${p.page ?? ''}`,
                capture: p.capture ?? '',
                agent: p.agent ?? '',
                ecran: p.ecran ?? '',
            }),
        });
        await snap.ref.update({ vexel: res.ok ? 'transmis' : 'echec' }).catch(() => { });
    }
    catch (e) {
        console.warn('[problemeTechnique] transmission à Vexel échouée', e);
        await snap.ref.update({ vexel: 'echec' }).catch(() => { });
    }
});
// ─── 4.7 onMessageEntreMembres · un message privé entre membres ──────────────
// Prévenir chaque autre membre de la conversation, au plus une fois l'heure par
// conversation, seulement si l'option courrielNouveauMessage est cochée. Le
// texte du message n'est jamais recopié dans le courriel.
const RATELIMIT_MS = 60 * 60 * 1000;
exports.onMessageEntreMembres = functions
    .runWith(courriel_1.RUNTIME_WITH_SMTP)
    .firestore.document('conversations/{convId}/messages/{id}')
    .onCreate(async (snap, context) => {
    const convId = context.params.convId;
    const msg = snap.data() ?? {};
    const auteurUid = typeof msg.uid === 'string' ? msg.uid : '';
    if (!auteurUid)
        return;
    const conv = (await db.doc(`conversations/${convId}`).get()).data() ?? {};
    const membres = Array.isArray(conv.members) ? conv.members : [];
    let auteurNom = 'Un membre';
    try {
        auteurNom = (await (0, auth_1.getAuth)().getUser(auteurUid)).displayName ?? 'Un membre';
    }
    catch { /* nom indisponible */ }
    for (const uid of membres) {
        if (uid === auteurUid)
            continue;
        try {
            const prefs = (await db.doc(`members/${uid}/prive/preferences`).get()).data();
            if (prefs?.courrielNouveauMessage !== true)
                continue;
            // Dernier envoi pour cette conversation, dans prive/envois[convId].
            const envois = (await db.doc(`members/${uid}/prive/envois`).get()).data() ?? {};
            const dernier = envois[convId]?.toMillis?.() ?? 0;
            if (Date.now() - dernier < RATELIMIT_MS)
                continue;
            const authUser = await (0, auth_1.getAuth)().getUser(uid);
            if (!authUser.emailVerified || !authUser.email)
                continue;
            const langue = prefs?.langue === 'EN' ? 'EN' : 'FR';
            const prenom = (authUser.displayName ?? '').split(' ')[0] || authUser.email;
            const corps = langue === 'EN'
                ? `Hello ${prenom}, ${auteurNom} sent you a message. It's waiting in your space:`
                : `Bonjour ${prenom}, ${auteurNom} vous a envoyé un message. Il vous attend dans votre espace :`;
            const bouton = langue === 'EN' ? 'Open my space' : 'Ouvrir mon espace';
            const pied = langue === 'EN'
                ? 'To stop these emails, untick the option in your preferences.'
                : 'Pour ne plus recevoir ces courriels, décochez l\'option dans vos préférences.';
            await (0, courriel_1.envoyerAuMembre)(authUser.email, langue === 'EN' ? `${auteurNom} wrote to you at the Salon` : `${auteurNom} vous a écrit au Salon`, corps, LIEN_MESSAGES, bouton, pied);
            // Marquer l'envoi pour ne pas réécrire avant une heure.
            await db.doc(`members/${uid}/prive/envois`).set({ [convId]: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
        catch (e) {
            console.warn('[messageEntreMembres] courriel indisponible', e);
        }
    }
});
//# sourceMappingURL=soutien.js.map