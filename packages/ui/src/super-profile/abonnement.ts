// abonnement.ts : le pont client vers les trois fonctions de profilPro.ts,
// et le suivi en direct de l'état d'abonnement du membre. `proEnabled` est
// vrai dès que le webhook Stripe l'a posé ; `maestroEnabled` reste accepté
// comme synonyme pour les profils activés à la main avant la facturation.

import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import * as React from 'react';

export type StatutAbonnementPro = 'actif' | 'suspendu' | 'annule';

export interface AbonnementPro {
    statut: StatutAbonnementPro;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    periodeFin?: any;
    montant?: number;
}

export async function ouvrirCheckoutProfilPro(): Promise<string> {
    const fn = httpsCallable<Record<string, never>, { url: string }>(
        getFunctions(getApp()), 'creerAbonnementProfilPro',
    );
    const { data } = await fn({});
    return data.url;
}

export async function ouvrirPortailProfilPro(): Promise<string> {
    const fn = httpsCallable<Record<string, never>, { url: string }>(
        getFunctions(getApp()), 'portailProfilPro',
    );
    const { data } = await fn({});
    return data.url;
}

/** Hook : l'état d'abonnement du membre connecté, suivi en direct. */
export function useAbonnementPro(uid: string | undefined): AbonnementPro | null {
    const [abonnement, setAbonnement] = React.useState<AbonnementPro | null>(null);
    React.useEffect(() => {
        if (!uid) { setAbonnement(null); return; }
        const db = getFirestore(getApp());
        const unsub = onSnapshot(doc(db, 'abonnementsPro', uid), (snap) => {
            setAbonnement(snap.exists() ? (snap.data() as AbonnementPro) : null);
        });
        return unsub;
    }, [uid]);
    return abonnement;
}

/** Hook : les drapeaux du membre (proEnabled, maestroEnabled, isArtist…). */
export function useMemberFlags(uid: string | undefined): Record<string, unknown> | null {
    const [flags, setFlags] = React.useState<Record<string, unknown> | null>(null);
    React.useEffect(() => {
        if (!uid) { setFlags(null); return; }
        const db = getFirestore(getApp());
        const unsub = onSnapshot(doc(db, 'members', uid, 'admin', 'flags'), (snap) => {
            setFlags(snap.exists() ? (snap.data() as Record<string, unknown>) : {});
        });
        return unsub;
    }, [uid]);
    return flags;
}

/** Vrai si le Profil Pro est débloqué, par la facturation ou à la main. */
export function profilProDebloque(flags: Record<string, unknown> | null): boolean {
    return flags?.proEnabled === true || flags?.maestroEnabled === true;
}
