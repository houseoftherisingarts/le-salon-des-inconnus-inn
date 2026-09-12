import React, { useEffect, useState } from 'react';
import { getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { suivreMembre, type MembreDoc } from './membres';
import {
    suivreMesAmities, demanderAmitie, accepterAmitie, retirerAmitie,
    estAmi, amitieEnAttente, type Amitie,
} from './amities';
import { suivreBlocages, bloquer, debloquer, signaler } from './moderation';
import { Avatar } from './Avatar';
import { VitrineBadges } from './Badges';
import { MurSocial } from './MurSocial';

const BANNIERE_DEFAUT = '/media/Artistes/magnetosphere.jpg';

interface PageMembreProps {
    uid: string;
    language: 'EN' | 'FR';
    isAdmin?: boolean;
}

/** La fiche publique d'un membre : bannière, avatar, badges, liens, ses
 *  billets. Demander en ami / Écrire / Bloquer / Signaler pour tout autre
 *  membre connecté; un visiteur anonyme voit une invitation à se connecter. */
export const PageMembre: React.FC<PageMembreProps> = ({ uid, language, isAdmin = false }) => {
    const t = (en: string, fr: string) => (language === 'EN' ? en : fr);

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    useEffect(() => {
        let a; try { a = getAuth(getApp()); } catch { return; }
        return onAuthStateChanged(a, setCurrentUser);
    }, []);

    const [membre, setMembre] = useState<MembreDoc | null>(null);
    const [chargement, setChargement] = useState(true);
    const [amities, setAmities] = useState<Amitie[]>([]);
    const [bloques, setBloques] = useState<string[]>([]);
    const [envoi, setEnvoi] = useState(false);
    const [signale, setSignale] = useState(false);

    useEffect(() => {
        setChargement(true);
        return suivreMembre(uid, (m) => { setMembre(m); setChargement(false); });
    }, [uid]);
    useEffect(() => (currentUser ? suivreMesAmities(currentUser.uid, setAmities) : undefined), [currentUser?.uid]);
    useEffect(() => (currentUser ? suivreBlocages(currentUser.uid, setBloques) : undefined), [currentUser?.uid]);

    useEffect(() => {
        const nom = membre?.displayName || t('Member', 'Membre');
        document.title = `${nom} · Creator Studio`;
    }, [membre?.displayName, language]);

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-[#050505] text-neutral-100 flex flex-col items-center justify-center gap-6 px-6 text-center">
                <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em]">Le Salon des Inconnus</p>
                <h1 className="font-prata text-2xl md:text-3xl text-[#f3e5ab]">{t('Sign in to see this profile', 'Connectez-vous pour voir ce profil')}</h1>
                <a
                    href="/createur"
                    className="px-8 py-3.5 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-xs uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-colors"
                >
                    {t('Open the Creator Studio', 'Ouvrir le Creator Studio')}
                </a>
            </div>
        );
    }

    if (chargement) return <div className="min-h-screen bg-[#050505]" />;

    if (!membre) {
        return (
            <div className="min-h-screen bg-[#050505] text-neutral-100 flex items-center justify-center px-6">
                <p className="font-lato text-neutral-500">{t('This member could not be found.', 'Ce membre est introuvable.')}</p>
            </div>
        );
    }

    const nom = membre.displayName || t('A member', 'Un membre');
    const soi = currentUser.uid === uid;
    const amis = estAmi(amities, currentUser.uid, uid);
    const enAttente = amitieEnAttente(amities, currentUser.uid, uid);
    const jeLaiEnvoyee = enAttente?.requestedBy === currentUser.uid;
    const jeLaiRecue = !!enAttente && enAttente.requestedBy === uid;
    const jeLaiBloque = bloques.includes(uid);
    const sousLigne = [membre.discipline, membre.ville].filter(Boolean).join(' · ');

    const demander = async () => {
        setEnvoi(true);
        try { await demanderAmitie(currentUser.uid, currentUser.displayName || 'Un membre', currentUser.photoURL ?? undefined, uid, nom, membre.photoURL); }
        finally { setEnvoi(false); }
    };
    const accepter = async () => { setEnvoi(true); try { await accepterAmitie(currentUser.uid, uid); } finally { setEnvoi(false); } };
    const signalerCeMembre = async () => {
        if (signale) return;
        try {
            await signaler({ parUid: currentUser.uid, parNom: currentUser.displayName || 'Un membre', cible: 'membre', cibleId: uid, raison: nom });
            setSignale(true);
        } catch { /* silencieux */ }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-neutral-100 font-lato pb-20">
            <div className="relative w-full aspect-[2/1] md:aspect-[3/1] overflow-hidden bg-black/40">
                <img src={membre.banniereURL || BANNIERE_DEFAUT} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-24 md:h-32 bg-gradient-to-t from-black/80 to-transparent" />
                <a href="/createur" className="absolute top-4 left-4 md:top-6 md:left-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-black/40 backdrop-blur-md text-[10px] font-cinzel uppercase tracking-[0.2em] text-neutral-200 hover:border-[#c5a059]/60 hover:text-[#c5a059] transition-colors">
                    ← {t('Creator Studio', 'Creator Studio')}
                </a>
            </div>

            <div className="max-w-3xl mx-auto px-6">
                <div className="relative flex flex-col md:flex-row md:items-end gap-4 -mt-14 md:-mt-16 pb-6">
                    <Avatar nom={nom} url={membre.photoURL} taille={128} className="border-2 shadow-xl" />
                    <div className="flex-1 min-w-0 pb-1">
                        <h1 className="font-prata text-2xl md:text-3xl text-[#f3e5ab] truncate">{nom}</h1>
                        {sousLigne && <p className="text-neutral-400 text-sm mt-1">{sousLigne}</p>}
                    </div>
                </div>

                {membre.bio && <p className="text-neutral-300 leading-relaxed mb-6 whitespace-pre-line">{membre.bio}</p>}

                {(membre.liens?.site || membre.liens?.instagram || membre.liens?.facebook || membre.liens?.autre) && (
                    <div className="flex flex-wrap gap-3 mb-6">
                        {membre.liens?.site && <a href={membre.liens.site} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c5a059] hover:text-[#d4b06a] underline underline-offset-2">{t('Website', 'Site web')}</a>}
                        {membre.liens?.instagram && <a href={membre.liens.instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c5a059] hover:text-[#d4b06a] underline underline-offset-2">Instagram</a>}
                        {membre.liens?.facebook && <a href={membre.liens.facebook} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c5a059] hover:text-[#d4b06a] underline underline-offset-2">Facebook</a>}
                        {membre.liens?.autre && <a href={membre.liens.autre} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c5a059] hover:text-[#d4b06a] underline underline-offset-2">{t('Other link', 'Autre lien')}</a>}
                    </div>
                )}

                <div className="mb-6"><VitrineBadges uid={uid} language={language} /></div>

                {!soi && (
                    <div className="flex flex-wrap items-center gap-3 mb-10 pb-6 border-b border-white/10">
                        {amis ? (
                            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#c5a059]/40 text-xs font-cinzel uppercase tracking-widest text-[#c5a059]">
                                ✓ {t('Friends', 'Amis')}
                            </span>
                        ) : jeLaiRecue ? (
                            <button type="button" onClick={accepter} disabled={envoi} className="px-5 py-2.5 rounded-full bg-[#c5a059] text-[#18181b] text-xs font-cinzel font-bold uppercase tracking-widest disabled:opacity-50">
                                {t('Accept request', 'Accepter la demande')}
                            </button>
                        ) : jeLaiEnvoyee ? (
                            <span className="inline-flex items-center px-5 py-2.5 rounded-full border border-white/15 text-xs font-cinzel uppercase tracking-widest text-neutral-500">
                                {t('Request sent', 'Demande envoyée')}
                            </span>
                        ) : (
                            <button type="button" onClick={demander} disabled={envoi} className="px-5 py-2.5 rounded-full bg-[#c5a059] text-[#18181b] text-xs font-cinzel font-bold uppercase tracking-widest disabled:opacity-50">
                                {t('Add friend', 'Demander l’amitié')}
                            </button>
                        )}
                        <a
                            href={`/createur?dm=${uid}`}
                            className="px-5 py-2.5 rounded-full border border-white/15 text-xs font-cinzel uppercase tracking-widest text-neutral-300 hover:border-[#c5a059]/60 hover:text-[#c5a059] transition-colors"
                        >
                            {t('Write', 'Écrire')}
                        </a>
                        <button
                            type="button"
                            onClick={() => (jeLaiBloque ? debloquer(currentUser.uid, uid) : bloquer(currentUser.uid, uid))}
                            className="px-4 py-2.5 rounded-full border border-white/10 text-xs text-neutral-500 hover:text-rose-300 hover:border-rose-400/40 transition-colors"
                        >
                            {jeLaiBloque ? t('Unblock', 'Débloquer') : t('Block', 'Bloquer')}
                        </button>
                        <button
                            type="button"
                            onClick={signalerCeMembre}
                            className={`px-4 py-2.5 rounded-full border text-xs transition-colors ${signale ? 'border-[#c5a059]/40 text-[#c5a059]' : 'border-white/10 text-neutral-500 hover:text-[#c5a059]'}`}
                        >
                            {signale ? t('Reported', 'Signalé') : t('Report', 'Signaler')}
                        </button>
                    </div>
                )}

                <div>
                    <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-4">
                        {t('The wall of', 'Le mur de')} {nom}
                    </p>
                    <MurSocial
                        currentUser={{ uid: currentUser.uid, displayName: currentUser.displayName, photoURL: currentUser.photoURL }}
                        monNom={currentUser.displayName || 'Un membre'}
                        monAvatar={currentUser.photoURL ?? undefined}
                        isAdmin={isAdmin}
                        language={language}
                        seulementDe={uid}
                    />
                </div>
            </div>
        </div>
    );
};
