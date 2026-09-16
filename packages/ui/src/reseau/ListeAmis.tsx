import React from 'react';
import { accepterAmitie, retirerAmitie, type Amitie } from './amities';
import { Avatar } from './Avatar';

interface ListeAmisProps {
    uid: string;
    amities: Amitie[];
    language: 'EN' | 'FR';
    onOuvrirMembre?: (uid: string) => void;
}

export const ListeAmis: React.FC<ListeAmisProps> = ({ uid, amities, language, onOuvrirMembre }) => {
    const t = (en: string, fr: string) => (language === 'EN' ? en : fr);

    const acceptees = amities.filter((a) => a.status === 'accepted');
    const recues = amities.filter((a) => a.status === 'pending' && a.requestedBy !== uid);
    const envoyees = amities.filter((a) => a.status === 'pending' && a.requestedBy === uid);

    return (
        <div className="space-y-8 max-w-2xl">
            {recues.length > 0 && (
                <div>
                    <p className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-500 mb-3">{t('Requests received', 'Demandes reçues')}</p>
                    <div className="space-y-2">
                        {recues.map((a) => {
                            const autreUid = a.uids.find((x) => x !== uid) || '';
                            const autreNom = a.profiles?.[autreUid]?.displayName || t('A member', 'Un membre');
                            return (
                                <div key={a.id} className="flex items-center justify-between gap-3 rounded-[15px] border border-white/15 bg-black/40 px-4 py-3">
                                    <button type="button" onClick={() => onOuvrirMembre?.(autreUid)} className="flex items-center gap-2 min-w-0">
                                        <Avatar nom={autreNom} url={a.profiles?.[autreUid]?.photoURL ?? undefined} taille={32} />
                                        <span className="font-lato text-sm text-neutral-200 truncate">{autreNom}</span>
                                    </button>
                                    <div className="flex gap-2 shrink-0">
                                        <button type="button" onClick={() => accepterAmitie(uid, autreUid)} className="px-3 py-1.5 rounded-full bg-[#c5a059] text-[#18181b] text-[13px] font-cinzel uppercase tracking-widest">{t('Accept', 'Accepter')}</button>
                                        <button type="button" onClick={() => retirerAmitie(uid, autreUid)} className="px-3 py-1.5 rounded-full border border-white/15 text-neutral-400 text-[13px] font-cinzel uppercase tracking-widest">{t('Decline', 'Refuser')}</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <div>
                <p className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-500 mb-3">
                    {t('Friends', 'Amis')} ({acceptees.length})
                </p>
                {acceptees.length === 0 ? (
                    <p className="text-sm text-neutral-500 font-lato">{t('No friends yet.', 'Aucun ami pour le moment.')}</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {acceptees.map((a) => {
                            const autreUid = a.uids.find((x) => x !== uid) || '';
                            const autreNom = a.profiles?.[autreUid]?.displayName || t('A member', 'Un membre');
                            return (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => onOuvrirMembre?.(autreUid)}
                                    className="flex items-center gap-2 rounded-[15px] border border-white/15 bg-black/40 px-4 py-3 text-left hover:border-[#c5a059]/50 transition-colors"
                                >
                                    <Avatar nom={autreNom} url={a.profiles?.[autreUid]?.photoURL ?? undefined} taille={32} />
                                    <span className="font-lato text-sm text-neutral-200 truncate">{autreNom}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            {envoyees.length > 0 && (
                <div>
                    <p className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-500 mb-3">{t('Requests sent', 'Demandes envoyées')}</p>
                    <div className="space-y-2">
                        {envoyees.map((a) => {
                            const autreUid = a.uids.find((x) => x !== uid) || '';
                            const autreNom = a.profiles?.[autreUid]?.displayName || t('A member', 'Un membre');
                            return (
                                <div key={a.id} className="flex items-center gap-2 rounded-[15px] border border-white/10 bg-black/20 px-4 py-3">
                                    <Avatar nom={autreNom} url={a.profiles?.[autreUid]?.photoURL ?? undefined} taille={32} />
                                    <span className="font-lato text-sm text-neutral-500 truncate">{autreNom}</span>
                                    <span className="ml-auto text-[13px] font-cinzel uppercase tracking-widest text-neutral-600">{t('Pending', 'En attente')}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
