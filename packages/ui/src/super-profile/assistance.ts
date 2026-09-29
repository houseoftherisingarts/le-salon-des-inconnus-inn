// assistance.ts : le pont client vers creerPaiementAssistance et le suivi en
// direct de assistances/{uid}, que seul le webhook Stripe (payée) et l'admin
// (appel fait) écrivent.

import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import * as React from 'react';

export type StatutAssistance = 'a-payer' | 'payee' | 'appel-fait';

export async function ouvrirPaiementAssistance(): Promise<{ url?: string; dejaPayee?: boolean }> {
    const fn = httpsCallable<Record<string, never>, { url?: string; dejaPayee?: boolean }>(
        getFunctions(getApp()), 'creerPaiementAssistance',
    );
    const { data } = await fn({});
    return data;
}

/** Hook : l'état de l'assistance du membre, suivi en direct. */
export function useAssistance(uid: string | undefined): StatutAssistance | null {
    const [statut, setStatut] = React.useState<StatutAssistance | null>(null);
    React.useEffect(() => {
        if (!uid) { setStatut(null); return; }
        const db = getFirestore(getApp());
        return onSnapshot(
            doc(db, 'assistances', uid),
            (snap) => {
                const s = snap.exists() ? snap.data()?.statut : undefined;
                setStatut(s === 'payee' || s === 'appel-fait' ? s : 'a-payer');
            },
            () => setStatut('a-payer'),
        );
    }, [uid]);
    return statut;
}
