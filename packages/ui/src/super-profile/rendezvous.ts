// rendezvous.ts : les fonctions Calendly du Profil Pro, portées d'un module
// de rendez-vous déjà construit et éprouvé sur un chantier précédent,
// adaptées pour qu'un artiste par uid ait son propre agenda plutôt qu'un
// agenda unique par site. Trois collections top-level plutôt qu'un
// settings/agenda par site :
//
//   • members/{artisteUid}/agenda/config → AgendaConfig de CET artiste
//   • rendezvousPro/{id}                 → { artisteUid, uid, ... }
//   • occupationsPro/{id}                → { artisteUid, debut, fin } (miroir
//     public sans donnée personnelle, pour que le calendrier retire les
//     créneaux déjà pris avant même la connexion)
//
// La rencontre se tient dans une salle vidéo Jitsi Meet nommée d'après le
// rendez-vous : aucune clé d'API, aucun serveur à louer.

import { getApp } from 'firebase/app';
import {
    getFirestore, doc, collection, getDoc, setDoc, onSnapshot, query, where,
    Timestamp, serverTimestamp, writeBatch, updateDoc, deleteDoc,
} from 'firebase/firestore';
import * as React from 'react';

export interface PlageHoraire {
    de: string;   // "09:00"
    a: string;    // "12:00"
}

export interface AgendaConfig {
    duree: number;             // minutes par rencontre
    tampon: number;            // minutes entre deux rencontres
    delaiMinHeures: number;    // délai minimal avant un rendez-vous
    horizonJours: number;      // jusqu'où on peut réserver
    fuseau: string;
    jours: Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', PlageHoraire[]>; // 0 = dimanche
    exceptions?: Record<string, PlageHoraire[]>;
}

export type StatutRendezVousPro = 'demande' | 'confirme' | 'annule' | 'complete';

export interface RendezVousPro {
    id: string;
    artisteUid: string;
    uid: string;
    nom: string;
    courriel: string;
    debut: any;   // Timestamp
    fin: any;     // Timestamp
    duree: number;
    statut: StatutRendezVousPro;
    salle: string;
    note?: string;
    noteAdmin?: string;
    creePar: 'client' | 'admin';
    createdAt?: any;
    updatedAt?: any;
}

export interface OccupationPro {
    id: string;
    artisteUid: string;
    debut: any;
    fin: any;
}

export const AGENDA_PAR_DEFAUT: AgendaConfig = {
    duree: 30,
    tampon: 15,
    delaiMinHeures: 24,
    horizonJours: 45,
    fuseau: 'America/Toronto',
    jours: {
        '0': [],
        '1': [{ de: '09:00', a: '12:00' }, { de: '13:00', a: '17:00' }],
        '2': [{ de: '09:00', a: '12:00' }, { de: '13:00', a: '17:00' }],
        '3': [{ de: '09:00', a: '12:00' }, { de: '13:00', a: '17:00' }],
        '4': [{ de: '09:00', a: '12:00' }, { de: '13:00', a: '17:00' }],
        '5': [{ de: '09:00', a: '12:00' }],
        '6': [],
    },
    exceptions: {},
};

export const cleJour = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const minutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + (m || 0);
};

const versDate = (v: any): Date => (v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(v));

export interface Creneau {
    debut: Date;
    fin: Date;
}

export function plagesDuJour(config: AgendaConfig, jour: Date): PlageHoraire[] {
    const exception = config.exceptions?.[cleJour(jour)];
    if (exception) return exception;
    return config.jours[String(jour.getDay()) as keyof AgendaConfig['jours']] ?? [];
}

export function creneauxLibres(
    config: AgendaConfig,
    jour: Date,
    occupations: Pick<OccupationPro, 'debut' | 'fin'>[],
    maintenant = new Date(),
): Creneau[] {
    const pas = config.duree + config.tampon;
    const limite = new Date(maintenant.getTime() + config.delaiMinHeures * 3600 * 1000);
    const horizon = new Date(maintenant.getTime() + config.horizonJours * 86400 * 1000);
    const pris = occupations.map((o) => ({ debut: versDate(o.debut).getTime(), fin: versDate(o.fin).getTime() }));
    const out: Creneau[] = [];
    for (const plage of plagesDuJour(config, jour)) {
        for (let m = minutes(plage.de); m + config.duree <= minutes(plage.a); m += pas) {
            const debut = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), Math.floor(m / 60), m % 60);
            const fin = new Date(debut.getTime() + config.duree * 60000);
            if (debut < limite || debut > horizon) continue;
            const chevauche = pris.some(
                (p) => debut.getTime() < p.fin + config.tampon * 60000 && fin.getTime() > p.debut - config.tampon * 60000,
            );
            if (!chevauche) out.push({ debut, fin });
        }
    }
    return out;
}

export function joursDisponibles(
    config: AgendaConfig,
    occupations: Pick<OccupationPro, 'debut' | 'fin'>[],
    maintenant = new Date(),
): string[] {
    const jours: string[] = [];
    for (let i = 0; i <= config.horizonJours; i++) {
        const j = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + i);
        if (creneauxLibres(config, j, occupations, maintenant).length > 0) jours.push(cleJour(j));
    }
    return jours;
}

export const nomSalle = (rdvId: string): string => `salon-${rdvId}`;
export const salleUrl = (salle: string): string => `https://meet.jit.si/${salle}`;

/** Ouverte 10 minutes avant l'heure et jusqu'à 30 minutes après la fin. */
export function rencontreOuverte(rdv: Pick<RendezVousPro, 'debut' | 'fin' | 'statut'>, maintenant = new Date()): boolean {
    if (rdv.statut !== 'confirme' && rdv.statut !== 'demande') return false;
    const debut = versDate(rdv.debut).getTime() - 10 * 60000;
    const fin = versDate(rdv.fin).getTime() + 30 * 60000;
    const t = maintenant.getTime();
    return t >= debut && t <= fin;
}

export const formatDate = (d: any, lang: 'FR' | 'EN' = 'FR'): string =>
    versDate(d).toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const formatHeure = (d: any, lang: 'FR' | 'EN' = 'FR'): string =>
    versDate(d).toLocaleTimeString(lang === 'FR' ? 'fr-CA' : 'en-CA', { hour: '2-digit', minute: '2-digit' });

const deuxChiffres = (n: number) => String(n).padStart(2, '0');
const icsDate = (d: Date): string =>
    `${d.getUTCFullYear()}${deuxChiffres(d.getUTCMonth() + 1)}${deuxChiffres(d.getUTCDate())}T${deuxChiffres(d.getUTCHours())}${deuxChiffres(d.getUTCMinutes())}00Z`;

export function icsRendezVous(rdv: Pick<RendezVousPro, 'id' | 'debut' | 'fin' | 'salle'>, titre: string): string {
    const debut = versDate(rdv.debut);
    const fin = versDate(rdv.fin);
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Le Salon des Inconnus//Profil Pro//FR',
        'BEGIN:VEVENT',
        `UID:${rdv.id}@lesalondesinconnus.com`,
        `DTSTAMP:${icsDate(new Date())}`,
        `DTSTART:${icsDate(debut)}`,
        `DTEND:${icsDate(fin)}`,
        `SUMMARY:${titre}`,
        `DESCRIPTION:Rencontre video : ${salleUrl(rdv.salle)}`,
        `URL:${salleUrl(rdv.salle)}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}

export function telechargerIcs(nomFichier: string, contenu: string): void {
    const blob = new Blob([contenu], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function newId(): string {
    const buf = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
    else for (let i = 0; i < 8; i++) buf[i] = Math.floor(Math.random() * 256);
    const alpha = 'abcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < buf.length; i++) s += alpha[buf[i] % alpha.length];
    return s;
}

/** Lit l'agenda d'un artiste une fois (pas d'abonnement), avec ses défauts
 *  quand rien n'a encore été configuré. */
export async function lireAgendaConfig(artisteUid: string): Promise<AgendaConfig> {
    const db = getFirestore(getApp());
    const snap = await getDoc(doc(db, 'members', artisteUid, 'agenda', 'config'));
    const data = (snap.exists() ? snap.data() : {}) as Partial<AgendaConfig>;
    return { ...AGENDA_PAR_DEFAUT, ...data, jours: { ...AGENDA_PAR_DEFAUT.jours, ...(data.jours ?? {}) } };
}

/** Hook : agenda d'un artiste, suivi en direct. */
export function useAgendaConfig(artisteUid: string | undefined): AgendaConfig {
    const [config, setConfig] = React.useState<AgendaConfig>(AGENDA_PAR_DEFAUT);
    React.useEffect(() => {
        if (!artisteUid) return;
        const db = getFirestore(getApp());
        const unsub = onSnapshot(doc(db, 'members', artisteUid, 'agenda', 'config'), (snap) => {
            const data = (snap.exists() ? snap.data() : {}) as Partial<AgendaConfig>;
            setConfig({ ...AGENDA_PAR_DEFAUT, ...data, jours: { ...AGENDA_PAR_DEFAUT.jours, ...(data.jours ?? {}) } });
        });
        return unsub;
    }, [artisteUid]);
    return config;
}

/** Hook : les occupations publiques d'un artiste (sans donnée personnelle). */
export function useOccupationsPro(artisteUid: string | undefined): OccupationPro[] {
    const [occ, setOcc] = React.useState<OccupationPro[]>([]);
    React.useEffect(() => {
        if (!artisteUid) return;
        const db = getFirestore(getApp());
        const q = query(collection(db, 'occupationsPro'), where('artisteUid', '==', artisteUid));
        const unsub = onSnapshot(q, (snap) => {
            setOcc(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });
        return unsub;
    }, [artisteUid]);
    return occ;
}

/** Hook : les rendez-vous de la personne connectée avec CET artiste. */
export function useMesRendezVousPro(artisteUid: string | undefined, uid: string | undefined): RendezVousPro[] {
    const [rdvs, setRdvs] = React.useState<RendezVousPro[]>([]);
    React.useEffect(() => {
        if (!artisteUid || !uid) { setRdvs([]); return; }
        const db = getFirestore(getApp());
        const q = query(collection(db, 'rendezvousPro'), where('artisteUid', '==', artisteUid), where('uid', '==', uid));
        const unsub = onSnapshot(q, (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as RendezVousPro[];
            rows.sort((a, b) => versDate(a.debut).getTime() - versDate(b.debut).getTime());
            setRdvs(rows);
        });
        return unsub;
    }, [artisteUid, uid]);
    return rdvs;
}

/** Hook : tous les rendez-vous d'un artiste (son propre back-office). */
export function useRendezVousProArtiste(artisteUid: string | undefined): RendezVousPro[] {
    const [rdvs, setRdvs] = React.useState<RendezVousPro[]>([]);
    React.useEffect(() => {
        if (!artisteUid) return;
        const db = getFirestore(getApp());
        const q = query(collection(db, 'rendezvousPro'), where('artisteUid', '==', artisteUid));
        const unsub = onSnapshot(q, (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as RendezVousPro[];
            rows.sort((a, b) => versDate(b.debut).getTime() - versDate(a.debut).getTime());
            setRdvs(rows);
        });
        return unsub;
    }, [artisteUid]);
    return rdvs;
}

/**
 * Écrit un rendez-vous neuf et son miroir dans le même lot : la règle
 * `occupationsPro` exige (getAfter) que le rendez-vous du même id existe déjà
 * avec les mêmes heures, donc les deux documents doivent s'écrire ensemble.
 */
export async function demanderRendezVous(
    artisteUid: string, uid: string, nom: string, courriel: string, creneau: Creneau, duree: number, note = '',
): Promise<string> {
    const db = getFirestore(getApp());
    const id = newId();
    const debut = Timestamp.fromDate(creneau.debut);
    const fin = Timestamp.fromDate(creneau.fin);
    const batch = writeBatch(db);
    batch.set(doc(db, 'rendezvousPro', id), {
        artisteUid, uid, nom: nom.slice(0, 120), courriel: courriel.slice(0, 200),
        debut, fin, duree, statut: 'demande', salle: nomSalle(id),
        note: note.slice(0, 1000), creePar: 'client',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'occupationsPro', id), { artisteUid, debut, fin });
    await batch.commit();
    return id;
}

export async function annulerRendezVousPro(id: string): Promise<void> {
    const db = getFirestore(getApp());
    await updateDoc(doc(db, 'rendezvousPro', id), { statut: 'annule', updatedAt: serverTimestamp() });
    try { await deleteDoc(doc(db, 'occupationsPro', id)); } catch { /* déjà retirée */ }
}

/** Actions de l'artiste sur son propre rendez-vous : confirmer, terminer,
 *  annuler, ou déposer une note privée. */
export async function majRendezVousProParArtiste(
    id: string, patch: Partial<Pick<RendezVousPro, 'statut' | 'noteAdmin'>>,
): Promise<void> {
    const db = getFirestore(getApp());
    await updateDoc(doc(db, 'rendezvousPro', id), { ...patch, updatedAt: serverTimestamp() });
    if (patch.statut === 'annule') {
        try { await deleteDoc(doc(db, 'occupationsPro', id)); } catch { /* déjà retirée */ }
    }
}

/** Enregistre les disponibilités de l'artiste, en fusion. */
export async function enregistrerAgendaConfig(artisteUid: string, patch: Partial<AgendaConfig>): Promise<void> {
    const db = getFirestore(getApp());
    await setDoc(doc(db, 'members', artisteUid, 'agenda', 'config'), patch, { merge: true });
}
