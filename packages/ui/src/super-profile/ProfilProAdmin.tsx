// ProfilProAdmin : le back-office complet du Profil Pro, monté dans l'onglet
// « Profil Pro » de la coquille de profil (à la place de SuperProfileEditor,
// geste de l'intégration). Deux visages : la page d'offre tant que
// `proEnabled` (ou `maestroEnabled`) est faux, puis les cinq onglets une
// fois l'abonnement actif.

import * as React from 'react';
import { getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { LIBELLES_ARTISTE, ORDRE_TYPES } from './artistes';
import { ouvrirCheckoutProfilPro, profilProDebloque, useAbonnementPro, useMemberFlags } from './abonnement';
import { AgendaAdmin } from './AgendaAdmin';
import { RendezVousAdmin } from './RendezVousAdmin';
import { DomaineAdmin } from './DomaineAdmin';
import { ProfilProAdminSite } from './ProfilProAdminSite';
import { ProfilProAdminContenu } from './ProfilProAdminContenu';
import { ProfilProAdminAbonnement } from './ProfilProAdminAbonnement';
import { UpsellCard } from './UpsellCard';
import type { SuperProfileConfig } from './types';

export interface ProfilProAdminProps {
    uid: string;
    fallbackDisplayName: string | null;
    language?: 'EN' | 'FR';
}

const CONFIG_VIDE = (): SuperProfileConfig => ({ enabled: false, username: '', medium: 'other', works: [] });

type Onglet = 'site' | 'contenu' | 'rendezvous' | 'domaine' | 'abonnement';

const OffrePage: React.FC<{ language: 'EN' | 'FR' }> = ({ language }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [ouverture, setOuverture] = React.useState(false);
    const [erreur, setErreur] = React.useState<string | null>(null);

    const commencer = async () => {
        setOuverture(true);
        setErreur(null);
        try {
            const url = await ouvrirCheckoutProfilPro();
            window.location.href = url;
        } catch {
            setErreur(t('Could not open checkout. Try again in a moment.', 'Impossible d’ouvrir le paiement. Réessayez dans un instant.'));
            setOuverture(false);
        }
    };

    return (
        <div className="max-w-3xl space-y-10">
            <div>
                <p className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-[#c5a059] mb-3">{t('Profil Pro', 'Profil Pro')}</p>
                <h2 className="font-prata text-[#f3e5ab] text-4xl md:text-5xl leading-[1.1] mb-4">
                    {t('A page built for your art, not a template for everyone', 'Une page bâtie pour votre art, pas un gabarit pour tout le monde')}
                </h2>
                <p className="font-lato text-neutral-400 text-base leading-relaxed">
                    {t(
                        'Your artist page, your own address, appointment booking with a video room, and your back office to run it all. 100 dollars a month before tax, no commitment, cancel anytime from the portal.',
                        'Votre page d’artiste, votre propre adresse, la prise de rendez-vous avec salle vidéo, et votre back-office pour tout gérer. 100 $ par mois avant taxes, sans engagement, résiliable en tout temps depuis le portail.',
                    )}
                </p>
            </div>

            <ul className="grid sm:grid-cols-2 gap-4">
                {[
                    t('A page at your own address, and your own domain once connected', 'Une page à votre adresse, et votre propre domaine une fois branché'),
                    t('A template built for your kind of art', 'Un gabarit taillé pour votre type d’art'),
                    t('Built-in appointment booking, with a video room', 'La prise de rendez-vous intégrée, avec salle vidéo'),
                    t('Your own back office to manage everything', 'Votre propre back-office pour tout gérer'),
                    t('The advertising the Salon runs for Profil Pro pages', 'La publicité que le Salon fait pour les pages Profil Pro'),
                ].map((ligne) => (
                    <li key={ligne} className="flex items-start gap-3 p-4 bg-black/30 border border-white/10 rounded-[15px]">
                        <span className="text-[#c5a059] mt-0.5">✓</span>
                        <span className="font-lato text-sm text-neutral-200">{ligne}</span>
                    </li>
                ))}
            </ul>

            <div>
                <button
                    type="button"
                    onClick={commencer}
                    disabled={ouverture}
                    className="min-h-[44px] px-8 py-4 bg-[#c5a059] text-[#050505] font-cinzel text-xs uppercase tracking-[0.35em] hover:bg-[#d4b06a] disabled:opacity-50 transition-colors rounded-[15px]"
                >
                    {ouverture ? t('Opening…', 'Ouverture…') : t('Open my Profil Pro', 'Ouvrir mon Profil Pro')}
                </button>
                {erreur && <p role="alert" className="text-sm text-rose-300 font-lato mt-3">{erreur}</p>}
                <p className="font-lato text-sm text-neutral-500 mt-4 max-w-md">
                    {t(
                        'Prefer an e-transfer? Send 100 dollars to alex@lesalondesinconnus.com with your artist name in the message, and your Profil Pro turns on the same day.',
                        'Vous préférez un virement Interac ? Envoyez 100 $ à alex@lesalondesinconnus.com avec votre nom d’artiste en message, et votre Profil Pro s’allume dans la journée.',
                    )}
                </p>
            </div>

            <div>
                <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-4">{t('A template for your practice', 'Un gabarit pour votre pratique')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ORDRE_TYPES.map((id) => (
                        <div key={id} className="px-4 py-3 rounded-[10px] border border-white/10 text-neutral-300">
                            <span className="font-lato text-sm">{language === 'FR' ? LIBELLES_ARTISTE[id].fr : LIBELLES_ARTISTE[id].en}</span>
                        </div>
                    ))}
                </div>
            </div>

            <UpsellCard language={language} />
        </div>
    );
};

export const ProfilProAdmin: React.FC<ProfilProAdminProps> = ({ uid, fallbackDisplayName, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [config, setConfig] = React.useState<SuperProfileConfig | null>(null);
    const flags = useMemberFlags(uid);
    const abonnement = useAbonnementPro(uid);
    const [onglet, setOnglet] = React.useState<Onglet>('site');

    React.useEffect(() => {
        if (!uid) return;
        const db = getFirestore(getApp());
        const unsub = onSnapshot(doc(db, 'members', uid, 'superProfile', 'config'), (snap) => {
            setConfig(snap.exists() ? (snap.data() as SuperProfileConfig) : CONFIG_VIDE());
        });
        return unsub;
    }, [uid]);

    if (config === null || flags === null) {
        return <p className="font-lato text-neutral-500 text-sm">{t('Loading…', 'Chargement…')}</p>;
    }

    const debloque = profilProDebloque(flags);

    if (!debloque) {
        return <OffrePage language={language} />;
    }

    const ONGLETS: Array<{ id: Onglet; en: string; fr: string }> = [
        { id: 'site', en: 'My site', fr: 'Mon site' },
        { id: 'contenu', en: 'Works and content', fr: 'Œuvres et contenu' },
        { id: 'rendezvous', en: 'Appointments', fr: 'Rendez-vous' },
        { id: 'domaine', en: 'Domain', fr: 'Domaine' },
        { id: 'abonnement', en: 'Subscription', fr: 'Abonnement' },
    ];

    return (
        <div>
            <div className="flex flex-wrap gap-1 border-b border-white/10 mb-8 -mx-1">
                {ONGLETS.map((o) => (
                    <button
                        key={o.id}
                        type="button"
                        onClick={() => setOnglet(o.id)}
                        className={`min-h-[44px] px-4 font-cinzel text-[10px] uppercase tracking-[0.25em] border-b-2 -mb-px transition-colors ${
                            onglet === o.id ? 'border-[#c5a059] text-[#f3e5ab]' : 'border-transparent text-neutral-500 hover:text-neutral-300'
                        }`}
                    >
                        {language === 'FR' ? o.fr : o.en}
                    </button>
                ))}
            </div>

            {onglet === 'site' && <ProfilProAdminSite uid={uid} config={config} fallbackDisplayName={fallbackDisplayName ?? undefined} language={language} />}
            {onglet === 'contenu' && <ProfilProAdminContenu uid={uid} config={config} language={language} />}
            {onglet === 'rendezvous' && (
                <div className="space-y-12 max-w-3xl">
                    <AgendaAdmin uid={uid} language={language} />
                    <div className="border-t border-white/10 pt-8">
                        <h3 className="font-prata text-[#f3e5ab] text-2xl mb-4">{t('Your appointments', 'Vos rendez-vous')}</h3>
                        <RendezVousAdmin uid={uid} language={language} />
                    </div>
                </div>
            )}
            {onglet === 'domaine' && <DomaineAdmin uid={uid} slug={config.username} language={language} />}
            {onglet === 'abonnement' && <ProfilProAdminAbonnement abonnement={abonnement} language={language} />}

            <div className="max-w-3xl">
                <UpsellCard language={language} />
            </div>
        </div>
    );
};
