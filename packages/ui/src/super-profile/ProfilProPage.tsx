// ProfilProPage : la page publique d'un Profil Pro. Résout un slug ou un
// hostname, écoute la configuration en direct, pose les balises de
// référencement, et rend le gabarit du type d'artiste. Porte le même esprit
// que components/SuperProfilePage.tsx (application racine) : la page
// possède tout l'écran, sans l'habillage du Salon autour.
//
// La garde de publication tient à `config.enabled` seul : la règle de
// superProfile/config laisse ce champ lisible publiquement, alors que
// members/{uid}/admin/flags ne l'est pas. C'est le webhook Stripe qui coupe
// `enabled` à la fin d'un abonnement (functions/src/profilPro.ts), donc
// cette seule lecture suffit à savoir si la page doit s'afficher.

import * as React from 'react';
import { motion } from 'framer-motion';
import { getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { resolveSlugToUid } from './usernames';
import { resoudreHostname } from './domaines';
import { deduireType, LIBELLES_ARTISTE } from './artistes';
import { gabaritPour } from './templates';
import type { SuperProfileConfig } from './types';
import { PageIntrouvable } from './PageIntrouvable';

export interface ProfilProPageProps {
    /** Le slug d'URL, déjà normalisé en minuscules par l'appelant. */
    slug?: string;
    /** Le nom d'hôte de la requête, quand la page est servie par un domaine
     *  personnel plutôt que par /{slug}. */
    hostname?: string;
    language?: 'EN' | 'FR';
    onNavigateHome: () => void;
    /** Quel univers habille la page « introuvable » / « en pause » : l'auberge
     *  (lesalondesinconnus.com) ou l'atelier du Creator Studio
     *  (inconnus-salon.web.app). Par défaut 'atelier', le terrain natif de ce
     *  paquet ; components/SuperProfilePage.tsx (racine) passe 'auberge'. */
    site?: 'auberge' | 'atelier';
}

type EtatChargement =
    | { etape: 'chargement' }
    | { etape: 'pas-trouve' }
    | { etape: 'en-pause' }
    | { etape: 'pret'; uid: string; config: SuperProfileConfig; displayName: string | null };

const SALON_URL = 'https://inconnus-salon.web.app';

function poserBalise(rel: 'og' | 'meta', nom: string, contenu: string): HTMLMetaElement {
    const selecteur = rel === 'og' ? `meta[property="${nom}"]` : `meta[name="${nom}"]`;
    let el = document.head.querySelector<HTMLMetaElement>(selecteur);
    if (!el) {
        el = document.createElement('meta');
        if (rel === 'og') el.setAttribute('property', nom); else el.setAttribute('name', nom);
        document.head.appendChild(el);
    }
    el.setAttribute('content', contenu);
    return el;
}

export const ProfilProPage: React.FC<ProfilProPageProps> = ({ slug, hostname, language = 'FR', onNavigateHome, site = 'atelier' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [etat, setEtat] = React.useState<EtatChargement>({ etape: 'chargement' });

    React.useEffect(() => {
        let unsub: (() => void) | null = null;
        let annule = false;
        (async () => {
            let slugResolu = slug ?? null;
            if (!slugResolu && hostname) {
                slugResolu = await resoudreHostname(hostname);
            }
            if (annule) return;
            if (!slugResolu) { setEtat({ etape: 'pas-trouve' }); return; }

            const uid = await resolveSlugToUid(slugResolu);
            if (annule) return;
            if (!uid) { setEtat({ etape: 'pas-trouve' }); return; }

            const db = getFirestore(getApp());
            let displayName: string | null = null;
            try {
                const membreSnap = await getDoc(doc(db, 'members', uid));
                if (membreSnap.exists()) {
                    const d = membreSnap.data() as any;
                    displayName = d?.displayName ?? d?.name ?? null;
                }
            } catch { /* détail de confort, pas bloquant */ }

            unsub = onSnapshot(
                doc(db, 'members', uid, 'superProfile', 'config'),
                (snap) => {
                    if (annule) return;
                    if (!snap.exists()) { setEtat({ etape: 'pas-trouve' }); return; }
                    const data = snap.data() as SuperProfileConfig;
                    if (!data.enabled) { setEtat({ etape: 'en-pause' }); return; }
                    setEtat({
                        etape: 'pret',
                        uid,
                        config: {
                            enabled: true,
                            username: data.username,
                            medium: data.medium ?? 'other',
                            type: data.type,
                            sections: data.sections,
                            hero: data.hero,
                            works: Array.isArray(data.works) ? data.works : [],
                            displayName: data.displayName,
                            tagline: data.tagline,
                            bio: data.bio,
                            links: data.links,
                            oeuvres: data.oeuvres,
                            ecoute: data.ecoute,
                            dates: data.dates,
                            presse: data.presse,
                            lienEPK: data.lienEPK,
                            expositions: data.expositions,
                            livres: data.livres,
                            atelier: data.atelier,
                        },
                        displayName,
                    });
                },
                () => { if (!annule) setEtat({ etape: 'pas-trouve' }); },
            );
        })();
        return () => { annule = true; if (unsub) unsub(); };
    }, [slug, hostname]);

    // Balises de référencement : posées au montage, retirées au démontage
    // pour ne jamais laisser le titre ou l'Open Graph d'un artiste s'accrocher
    // à la page suivante.
    React.useEffect(() => {
        if (etat.etape !== 'pret') return;
        const { config, displayName, uid } = etat;
        const type = deduireType(config);
        const nom = config.displayName || displayName || config.username;
        const metierLabel = language === 'FR' ? LIBELLES_ARTISTE[type].fr : LIBELLES_ARTISTE[type].en;
        const titre = `${nom} · ${metierLabel} · Profil Pro du Salon des Inconnus`;
        const description = (config.tagline || config.bio || `${nom}, ${metierLabel.toLowerCase()}, sur Le Salon des Inconnus.`).slice(0, 200);
        const image = config.hero?.url || config.oeuvres?.[0]?.url || config.works?.[0]?.url || '';
        const url = `${SALON_URL}/${config.username}`;

        const titrePrecedent = document.title;
        document.title = titre;
        const balisesPosees = [
            poserBalise('meta', 'description', description),
            poserBalise('og', 'og:title', titre),
            poserBalise('og', 'og:description', description),
            poserBalise('og', 'og:url', url),
            ...(image ? [poserBalise('og', 'og:image', image)] : []),
        ];

        const scriptLd = document.createElement('script');
        scriptLd.type = 'application/ld+json';
        const sameAs = [config.links?.instagram, config.links?.website, config.links?.buy, config.links?.booking].filter(Boolean);
        scriptLd.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: nom,
            jobTitle: metierLabel,
            url,
            ...(image ? { image } : {}),
            ...(sameAs.length ? { sameAs } : {}),
        });
        document.head.appendChild(scriptLd);

        return () => {
            document.title = titrePrecedent;
            balisesPosees.forEach((el) => { if (el.parentElement) el.remove(); });
            if (scriptLd.parentElement) scriptLd.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [etat, language]);

    if (etat.etape === 'chargement') {
        return (
            <div className="fixed inset-0 bg-[#050505] z-30 flex items-center justify-center">
                <div className="text-[#c5a059] text-[13px] font-cinzel uppercase tracking-[0.5em] animate-pulse">
                    Le Salon des Inconnus
                </div>
            </div>
        );
    }

    if (etat.etape === 'pas-trouve' || etat.etape === 'en-pause') {
        return (
            <div className="fixed inset-0 bg-[#050505] z-30 flex items-center justify-center px-6 text-center">
                <div>
                    <p className="font-cinzel text-[#c5a059] text-[13px] uppercase tracking-[0.5em] mb-3">
                        Le Salon des Inconnus
                    </p>
                    <h1 className="font-prata text-[#f3e5ab] text-3xl md:text-4xl mb-3">
                        {etat.etape === 'en-pause' ? t('This page is paused', 'Cette page est en pause') : t('Page not found', 'Page introuvable')}
                    </h1>
                    <p className="font-lato text-neutral-400 text-sm mb-8 max-w-md mx-auto">
                        {etat.etape === 'en-pause'
                            ? t('This artist has stepped away for now.', 'Cet artiste s’est retiré pour le moment.')
                            : t('There is no Profil Pro at this address.', 'Il n’y a pas de Profil Pro à cette adresse.')}
                    </p>
                    <button
                        type="button"
                        onClick={onNavigateHome}
                        className="px-5 py-2.5 border border-white/15 text-neutral-300 font-cinzel text-[13px] uppercase tracking-[0.35em] hover:border-[#c5a059] hover:text-[#f3e5ab] transition-colors"
                    >
                        {t('Back to the Salon', 'Retour au Salon')}
                    </button>
                </div>
            </div>
        );
    }

    const { config, uid, displayName } = etat;
    const Gabarit = gabaritPour(deduireType(config));
    return <Gabarit config={config} uid={uid} fallbackDisplayName={displayName ?? undefined} language={language} />;
};
