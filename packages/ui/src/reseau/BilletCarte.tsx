import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    retirerDuMur, voter, suivreVotes, type PostMur, type Decompte,
} from './mur';
import { signaler } from './moderation';
import { envoyerNotification } from './notifications';
import { Avatar } from './Avatar';
import { VoteBar } from './VoteBar';
import { Commentaires } from './Commentaires';

const quandTexte = (ms: number, language: 'EN' | 'FR'): string => {
    const ecart = Date.now() - ms;
    if (ecart < 60_000) return language === 'EN' ? 'just now' : 'à l’instant';
    if (ecart < 3_600_000) return `${Math.floor(ecart / 60_000)} min`;
    if (ecart < 86_400_000) return `${Math.floor(ecart / 3_600_000)} h`;
    return new Date(ms).toLocaleDateString(language === 'EN' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
};

interface BilletCarteProps {
    post: PostMur;
    currentUser: { uid: string; displayName?: string | null; photoURL?: string | null } | null;
    monNom: string;
    monAvatar?: string;
    isAdmin: boolean;
    language: 'EN' | 'FR';
    delaiIndex?: number;
    onOuvrirMembre?: (uid: string) => void;
}

export const BilletCarte: React.FC<BilletCarteProps> = ({
    post, currentUser, monNom, monAvatar, isAdmin, language, delaiIndex = 0, onOuvrirMembre,
}) => {
    const t = (en: string, fr: string) => (language === 'EN' ? en : fr);

    const [decompte, setDecompte] = useState<Decompte>({ pour: 0, contre: 0, score: 0 });
    const [monVote, setMonVote] = useState<1 | -1 | 0>(0);
    useEffect(() => suivreVotes(post.id, currentUser?.uid ?? null, (d, mien) => { setDecompte(d); setMonVote(mien); }), [post.id, currentUser?.uid]);

    const [commentairesOuverts, setCommentairesOuverts] = useState(false);
    const [signale, setSignale] = useState(false);

    const voterIci = async (valeur: 1 | -1 | 0) => {
        if (!currentUser) return;
        await voter(post.id, currentUser.uid, monNom, valeur);
        if (valeur !== 0 && post.uid !== currentUser.uid) {
            await envoyerNotification(post.uid, {
                deUid: currentUser.uid, deNom: monNom, type: 'vote',
                texte: valeur === 1 ? t('voted for your post', 'a voté pour votre billet') : t('voted against your post', 'a voté contre votre billet'),
                postId: post.id,
            });
        }
    };

    const signalerIci = async () => {
        if (!currentUser || signale) return;
        try {
            await signaler({
                parUid: currentUser.uid, parNom: monNom,
                cible: 'post', cibleId: post.id,
                raison: post.texte || '(photo seulement)',
            });
            setSignale(true);
        } catch { /* silencieux */ }
    };

    return (
        <motion.article
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(delaiIndex, 8) * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 md:p-6"
        >
            <div className="flex items-center gap-3 mb-3">
                <button type="button" onClick={() => onOuvrirMembre?.(post.uid)}>
                    <Avatar nom={post.nom} url={post.avatarUrl} />
                </button>
                <div className="min-w-0 flex-1">
                    <button
                        type="button"
                        onClick={() => onOuvrirMembre?.(post.uid)}
                        className="font-cinzel text-sm text-[#f3e5ab] hover:text-[#c5a059] transition-colors truncate block"
                    >
                        {post.nom}
                    </button>
                    <p className="text-[11px] text-neutral-500 font-lato">{quandTexte(post.creeLe?.toMillis?.() ?? Date.now(), language)}</p>
                </div>
                {currentUser && currentUser.uid !== post.uid && (
                    <button
                        type="button"
                        onClick={signalerIci}
                        title={signale ? t('Reported', 'Signalé') : t('Report to the team', 'Signaler à l’équipe')}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${signale ? 'text-[#c5a059]' : 'text-neutral-600 hover:text-[#c5a059]'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18M3 4.5h13.5l-2 3.5 2 3.5H3" />
                        </svg>
                    </button>
                )}
                {currentUser && (currentUser.uid === post.uid || isAdmin) && (
                    <button
                        type="button"
                        onClick={() => { void retirerDuMur(post.id); }}
                        title={t('Remove', 'Retirer')}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-600 hover:text-rose-400 transition-colors shrink-0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                    </button>
                )}
            </div>

            {post.texte && <p className="text-[15px] text-neutral-200 font-lato leading-relaxed whitespace-pre-line">{post.texte}</p>}
            {post.photoURL && (
                <img
                    src={post.photoURL} alt="" loading="lazy"
                    className="mt-4 w-full max-h-[32rem] object-cover rounded-[15px] border border-white/10"
                />
            )}

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-4">
                <VoteBar score={decompte.score} monVote={monVote} onVoter={voterIci} disabled={!currentUser} />
                <button
                    type="button"
                    onClick={() => setCommentairesOuverts((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-cinzel uppercase tracking-[0.14em] text-neutral-500 hover:text-[#c5a059] transition-colors"
                >
                    {t('Comment', 'Commenter')}
                </button>
            </div>

            {commentairesOuverts && (
                <Commentaires
                    postId={post.id}
                    postAuteurUid={post.uid}
                    currentUser={currentUser}
                    monNom={monNom}
                    monAvatar={monAvatar}
                    isAdmin={isAdmin}
                    language={language}
                    onOuvrirMembre={onOuvrirMembre}
                />
            )}
        </motion.article>
    );
};
