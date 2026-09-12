import React, { useEffect, useState } from 'react';
import { suivreMembre, type MembreDoc } from './membres';
import { suivreMesAmities, accepterAmitie, retirerAmitie, type Amitie } from './amities';
import { Avatar } from './Avatar';
import { VitrineBadges, SelecteurBadges } from './Badges';
import { MurSocial } from './MurSocial';

const BANNIERE_DEFAUT = '/media/Artistes/magnetosphere.jpg';

type OngletProfil = 'mur' | 'amis' | 'profil' | 'pro';

interface ProfilSocialProps {
    uid: string;
    currentUser: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null };
    isAdmin: boolean;
    language: 'EN' | 'FR';
    /** L'éditeur existant du studio (formulaire + SuperProfileEditor), tel quel. */
    editeurProfil?: React.ReactNode;
    /** Monté plus tard par l'intégration (back-office du Profil Pro). */
    profilPro?: React.ReactNode;
    onOuvrirMembre?: (uid: string) => void;
}

export const ProfilSocial: React.FC<ProfilSocialProps> = ({
    uid, currentUser, isAdmin, language, editeurProfil, profilPro, onOuvrirMembre,
}) => {
    const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
    const [membre, setMembre] = useState<MembreDoc | null>(null);
    const [amities, setAmities] = useState<Amitie[]>([]);
    const [onglet, setOnglet] = useState<OngletProfil>('mur');

    useEffect(() => suivreMembre(uid, setMembre), [uid]);
    useEffect(() => suivreMesAmities(uid, setAmities), [uid]);

    const nom = membre?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || t('Member', 'Membre');
    const sousLigne = [membre?.discipline, membre?.ville].filter(Boolean).join(' · ');
    const monAvatar = membre?.photoURL || currentUser.photoURL || undefined;

    const recues = amities.filter((a) => a.status === 'pending' && a.requestedBy !== uid);
    const envoyees = amities.filter((a) => a.status === 'pending' && a.requestedBy === uid);
    const acceptees = amities.filter((a) => a.status === 'accepted');

    const onglets: { id: OngletProfil; label: string }[] = [
        { id: 'mur', label: t('My wall', 'Mon mur') },
        { id: 'amis', label: t('My friends', 'Mes amis') },
        { id: 'profil', label: t('My profile', 'Mon profil') },
        { id: 'pro', label: t('Pro Profile', 'Profil Pro') },
    ];

    return (
        <div className="w-full">
            {/* Bannière pleine largeur, portée par une vraie photo — jamais un
                panneau vide. 2:1 sur mobile, 3:1 à partir de md. */}
            <div className="relative w-full aspect-[2/1] md:aspect-[3/1] overflow-hidden rounded-[15px] bg-black/40">
                <img src={membre?.banniereURL || BANNIERE_DEFAUT} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-24 md:h-32 bg-gradient-to-t from-black/80 to-transparent" aria-hidden="true" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-end gap-4 px-1 pt-3 pb-6 border-b border-white/10">
                <div className="-mt-14 md:-mt-16 flex-shrink-0">
                    <Avatar nom={nom} url={monAvatar} taille={128} className="border-2 shadow-xl" />
                </div>
                <div className="flex-1 min-w-0 pb-1">
                    <h1 className="font-prata text-2xl md:text-3xl text-[#f3e5ab] truncate">{nom}</h1>
                    {sousLigne && <p className="text-neutral-400 text-sm font-lato mt-1">{sousLigne}</p>}
                    <div className="mt-3"><VitrineBadges uid={uid} language={language} /></div>
                </div>
            </div>

            {/* Onglets soulignés — deux rangées sur mobile, jamais de défilement horizontal. */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 my-6" role="tablist">
                {onglets.map((o) => (
                    <button
                        key={o.id}
                        type="button"
                        role="tab"
                        aria-selected={onglet === o.id}
                        onClick={() => setOnglet(o.id)}
                        className={`relative min-h-[44px] pb-2 font-cinzel text-[11px] uppercase tracking-[0.2em] transition-colors ${
                            onglet === o.id ? 'text-[#c5a059]' : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                    >
                        {o.label}
                        {onglet === o.id && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#c5a059]" />}
                    </button>
                ))}
            </div>

            <div className="min-h-[40vh]">
                {onglet === 'mur' && (
                    <MurSocial
                        currentUser={currentUser}
                        monNom={nom}
                        monAvatar={monAvatar}
                        isAdmin={isAdmin}
                        language={language}
                        seulementDe={uid}
                        onOuvrirMembre={onOuvrirMembre}
                    />
                )}

                {onglet === 'amis' && (
                    <div className="space-y-8 max-w-2xl">
                        {recues.length > 0 && (
                            <div>
                                <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-3">{t('Requests received', 'Demandes reçues')}</p>
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
                                                    <button type="button" onClick={() => accepterAmitie(uid, autreUid)} className="px-3 py-1.5 rounded-full bg-[#c5a059] text-[#18181b] text-[10px] font-cinzel uppercase tracking-widest">{t('Accept', 'Accepter')}</button>
                                                    <button type="button" onClick={() => retirerAmitie(uid, autreUid)} className="px-3 py-1.5 rounded-full border border-white/15 text-neutral-400 text-[10px] font-cinzel uppercase tracking-widest">{t('Decline', 'Refuser')}</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div>
                            <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-3">
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
                                <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-3">{t('Requests sent', 'Demandes envoyées')}</p>
                                <div className="space-y-2">
                                    {envoyees.map((a) => {
                                        const autreUid = a.uids.find((x) => x !== uid) || '';
                                        const autreNom = a.profiles?.[autreUid]?.displayName || t('A member', 'Un membre');
                                        return (
                                            <div key={a.id} className="flex items-center gap-2 rounded-[15px] border border-white/10 bg-black/20 px-4 py-3">
                                                <Avatar nom={autreNom} url={a.profiles?.[autreUid]?.photoURL ?? undefined} taille={32} />
                                                <span className="font-lato text-sm text-neutral-500 truncate">{autreNom}</span>
                                                <span className="ml-auto text-[10px] font-cinzel uppercase tracking-widest text-neutral-600">{t('Pending', 'En attente')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {onglet === 'profil' && (
                    <div>
                        <SelecteurBadges uid={uid} language={language} />
                        <div className="mt-6">{editeurProfil}</div>
                    </div>
                )}

                {onglet === 'pro' && (
                    profilPro ?? (
                        <div className="rounded-[15px] border border-[#c5a059]/30 bg-black/40 backdrop-blur-md p-8 text-center max-w-xl mx-auto">
                            <p className="font-prata text-xl text-[#f3e5ab] mb-2">{t('Pro Profile', 'Profil Pro')}</p>
                            <p className="text-sm text-neutral-400 font-lato">
                                {t('Coming soon.', 'Bientôt disponible.')}
                            </p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
