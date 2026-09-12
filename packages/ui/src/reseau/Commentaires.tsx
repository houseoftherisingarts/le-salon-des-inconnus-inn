import React, { useEffect, useState } from 'react';
import {
    suivreCommentaires, publierCommentaire, retirerCommentaire,
    LONGUEUR_MAX_COMMENTAIRE, type CommentaireMur,
} from './mur';
import { envoyerNotification } from './notifications';
import { Avatar } from './Avatar';

const quandTexte = (ms: number, language: 'EN' | 'FR'): string => {
    const ecart = Date.now() - ms;
    if (ecart < 60_000) return language === 'EN' ? 'just now' : 'à l’instant';
    if (ecart < 3_600_000) return `${Math.floor(ecart / 60_000)} min`;
    if (ecart < 86_400_000) return `${Math.floor(ecart / 3_600_000)} h`;
    return new Date(ms).toLocaleDateString(language === 'EN' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'long' });
};

interface CommentairesProps {
    postId: string;
    postAuteurUid: string;
    currentUser: { uid: string; displayName?: string | null; photoURL?: string | null } | null;
    monNom: string;
    monAvatar?: string;
    isAdmin: boolean;
    language: 'EN' | 'FR';
    onOuvrirMembre?: (uid: string) => void;
}

export const Commentaires: React.FC<CommentairesProps> = ({
    postId, postAuteurUid, currentUser, monNom, monAvatar, isAdmin, language, onOuvrirMembre,
}) => {
    const [commentaires, setCommentaires] = useState<CommentaireMur[]>([]);
    const [texte, setTexte] = useState('');
    const [envoi, setEnvoi] = useState(false);

    useEffect(() => suivreCommentaires(postId, setCommentaires), [postId]);

    const t = (en: string, fr: string) => (language === 'EN' ? en : fr);

    const publier = async () => {
        if (!currentUser || !texte.trim() || envoi) return;
        setEnvoi(true);
        try {
            await publierCommentaire(postId, {
                uid: currentUser.uid, nom: monNom,
                avatarUrl: monAvatar || currentUser.photoURL || undefined,
                texte,
            });
            if (postAuteurUid !== currentUser.uid) {
                await envoyerNotification(postAuteurUid, {
                    deUid: currentUser.uid, deNom: monNom, type: 'commentaire',
                    texte: texte.trim().slice(0, 140), postId,
                });
            }
            setTexte('');
        } finally { setEnvoi(false); }
    };

    return (
        <div className="mt-3 pt-3 border-t border-white/10">
            {currentUser && (
                <div className="flex items-start gap-2 mb-2">
                    <textarea
                        value={texte}
                        onChange={(e) => setTexte(e.target.value.slice(0, LONGUEUR_MAX_COMMENTAIRE))}
                        rows={1}
                        placeholder={t('Write a comment…', 'Écrivez un commentaire…')}
                        className="flex-1 px-3 py-2 rounded-[15px] border border-white/15 bg-black/40 text-neutral-100 text-[13px] font-lato outline-none focus:border-[#c5a059]/60 transition-colors resize-none"
                    />
                    <button
                        type="button"
                        onClick={publier}
                        disabled={envoi || !texte.trim()}
                        aria-label={t('Send', 'Envoyer')}
                        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[#c5a059] text-[#18181b] disabled:opacity-40 transition-opacity"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.77 59.77 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                    </button>
                </div>
            )}
            {commentaires.length === 0 ? (
                <p className="text-[12px] text-neutral-500 font-lato">{t('No comments yet.', 'Aucun commentaire pour le moment.')}</p>
            ) : (
                <div className="divide-y divide-white/5">
                    {commentaires.map((c) => {
                        const peutSupprimer = !!currentUser && (isAdmin || currentUser.uid === c.uid || currentUser.uid === postAuteurUid);
                        return (
                            <div key={c.id} className="flex gap-2.5 py-2.5 first:pt-0">
                                <Avatar nom={c.nom} url={c.avatarUrl} taille={28} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => onOuvrirMembre?.(c.uid)}
                                            className="font-cinzel text-[12px] text-neutral-200 hover:text-[#c5a059] transition-colors"
                                        >
                                            {c.nom}
                                        </button>
                                        <span className="text-[10px] text-neutral-500 font-lato">{quandTexte(c.creeLe?.toMillis?.() ?? Date.now(), language)}</span>
                                    </div>
                                    <p className="text-[13px] text-neutral-300 font-lato leading-relaxed mt-0.5 whitespace-pre-line">{c.texte}</p>
                                    {peutSupprimer && (
                                        <button
                                            type="button"
                                            onClick={() => { void retirerCommentaire(postId, c.id); }}
                                            className="mt-1 text-[10px] text-neutral-600 hover:text-rose-400 font-cinzel uppercase tracking-wider transition-colors"
                                        >
                                            {t('Remove', 'Retirer')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
