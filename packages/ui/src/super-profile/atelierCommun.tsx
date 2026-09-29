// atelierCommun : les petites pièces partagées par les blocs de l'atelier
// qui écrivent tout de suite (sections, thème, boutique, pistes). Aucun de
// ces blocs n'a de bouton Enregistrer : un clic ou la sortie d'un champ
// suffit, et un court « Enregistré » le confirme.

import * as React from 'react';
import { getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const CHAMP = 'w-full bg-black/40 border border-white/15 rounded-[10px] px-3 py-2.5 text-sm text-[#f3e5ab] placeholder-neutral-500 outline-none transition-colors focus:border-[#c5a059] font-lato';
export const BLOC = 'bg-black/30 border border-white/10 rounded-[15px] p-5 md:p-6 space-y-4';
export const TITRE_BLOC = 'font-prata text-[#f3e5ab] text-lg';
export const AIDE = 'font-lato text-[13px] text-neutral-400';
export const BOUTON_SECONDAIRE = 'min-h-[40px] px-4 py-2 border border-white/15 text-neutral-200 hover:border-[#c5a059] font-cinzel text-[13px] uppercase tracking-[0.25em] transition-colors rounded-[10px] disabled:opacity-40';

export function newId(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function sauverConfig(uid: string, patch: Record<string, unknown>): Promise<void> {
    const db = getFirestore(getApp());
    await setDoc(doc(db, 'members', uid, 'superProfile', 'config'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

/** Écrit tout de suite et expose un état court pour le « Enregistré ». */
export function useEcritureImmediate(uid: string) {
    const [etat, setEtat] = React.useState<'repos' | 'ecrit' | 'erreur'>('repos');
    const minuterie = React.useRef<number | undefined>(undefined);
    const ecrire = React.useCallback(async (patch: Record<string, unknown>) => {
        try {
            await sauverConfig(uid, patch);
            setEtat('ecrit');
        } catch {
            setEtat('erreur');
        }
        window.clearTimeout(minuterie.current);
        minuterie.current = window.setTimeout(() => setEtat('repos'), 2200);
    }, [uid]);
    return { etat, ecrire };
}

export const EtatEcriture: React.FC<{ etat: 'repos' | 'ecrit' | 'erreur'; language: 'EN' | 'FR' }> = ({ etat, language }) => {
    if (etat === 'repos') return null;
    const fr = language === 'FR';
    return etat === 'ecrit'
        ? <span className="text-[#c5a059] text-[13px] font-lato" role="status">{fr ? 'Enregistré' : 'Saved'}</span>
        : <span className="text-rose-300 text-[13px] font-lato" role="alert">{fr ? 'Écriture refusée, réessayez.' : 'Write refused, try again.'}</span>;
};

export const IconRetirer: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
    <button type="button" onClick={onClick} aria-label={label} className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full text-neutral-400 hover:text-rose-300 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
);

export const BoutonFleche: React.FC<{ sens: 'haut' | 'bas'; onClick: () => void; disabled?: boolean; label: string }> = ({ sens, onClick, disabled, label }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full border border-white/10 text-neutral-300 hover:border-[#c5a059] hover:text-[#c5a059] disabled:opacity-25 disabled:hover:border-white/10 disabled:hover:text-neutral-300 transition-colors"
    >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
            {sens === 'haut' ? <path d="m18 15-6-6-6 6" /> : <path d="m6 9 6 6 6-6" />}
        </svg>
    </button>
);
