// ProfilProAdminSite : l'onglet « Mon site » du back-office. Type d'artiste,
// adresse, nom, sous-ligne, bio, sections allumées ou éteintes, photo
// découpée. Porte le même patron de brouillon local + bouton Enregistrer
// que SuperProfileEditor, pour que rien ne s'écrive à chaque frappe.

import * as React from 'react';
import { getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LIBELLES_ARTISTE, ORDRE_TYPES, sectionsParDefaut } from './artistes';
import { claimUsername, isSlugAvailable, slugifyDisplayName, validateUsername } from './usernames';
import { HeroPhotoUploader } from './HeroPhotoUploader';
import type { ArtistType, SectionId, SuperProfileConfig } from './types';

interface ProfilProAdminSiteProps {
    uid: string;
    config: SuperProfileConfig;
    fallbackDisplayName?: string;
    language?: 'EN' | 'FR';
}

const CHAMP = 'w-full bg-black/40 border border-white/15 rounded-[15px] px-4 py-3 text-[#f3e5ab] placeholder-neutral-500 outline-none transition-colors focus:border-[#c5a059] font-lato';
const LABEL = 'font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-500 mb-2 block';

const SECTIONS_ETIQUETTES: Record<SectionId, { en: string; fr: string }> = {
    oeuvres: { en: 'Works', fr: 'Œuvres' },
    ecoute: { en: 'Listen', fr: 'Écoute' },
    dates: { en: 'Dates', fr: 'Dates' },
    presse: { en: 'Press', fr: 'Presse' },
    expositions: { en: 'Exhibitions', fr: 'Expositions' },
    livres: { en: 'Books', fr: 'Livres' },
    bio: { en: 'About', fr: 'Démarche' },
    atelier: { en: 'Studio', fr: 'Atelier' },
    rendezvous: { en: 'Appointment', fr: 'Rendez-vous' },
    contact: { en: 'Contact', fr: 'Contact' },
    liens: { en: 'Links', fr: 'Liens' },
    pied: { en: 'Footer', fr: 'Pied de page' },
};

let compteurSlugCheck = 0;

export const ProfilProAdminSite: React.FC<ProfilProAdminSiteProps> = ({ uid, config, fallbackDisplayName, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

    const [type, setType] = React.useState<ArtistType>(config.type ?? 'autre');
    const [slug, setSlug] = React.useState(config.username);
    const [slugStatut, setSlugStatut] = React.useState<'ok' | 'pris' | 'invalide' | null>(null);
    const [displayName, setDisplayName] = React.useState(config.displayName ?? fallbackDisplayName ?? '');
    const [tagline, setTagline] = React.useState(config.tagline ?? '');
    const [bio, setBio] = React.useState(config.bio ?? '');
    const [sections, setSections] = React.useState(config.sections ?? sectionsParDefaut(config.type ?? 'autre'));
    const [modifie, setModifie] = React.useState(false);
    const [enregistrement, setEnregistrement] = React.useState(false);
    const [enregistre, setEnregistre] = React.useState(false);

    React.useEffect(() => {
        if (modifie) return;
        setType(config.type ?? 'autre');
        setSlug(config.username);
        setDisplayName(config.displayName ?? fallbackDisplayName ?? '');
        setTagline(config.tagline ?? '');
        setBio(config.bio ?? '');
        setSections(config.sections ?? sectionsParDefaut(config.type ?? 'autre'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config, modifie]);

    React.useEffect(() => {
        const valeur = slug.trim().toLowerCase();
        if (valeur === config.username) { setSlugStatut('ok'); return; }
        const v = validateUsername(valeur);
        if (!v.ok) { setSlugStatut('invalide'); return; }
        const jeton = ++compteurSlugCheck;
        const minuterie = window.setTimeout(async () => {
            const disponible = await isSlugAvailable(valeur, uid);
            if (jeton === compteurSlugCheck) setSlugStatut(disponible ? 'ok' : 'pris');
        }, 400);
        return () => window.clearTimeout(minuterie);
    }, [slug, uid, config.username]);

    const changerType = (nouveauType: ArtistType) => {
        setType(nouveauType);
        // Un profil qui n'a jamais eu de sections choisies reprend les
        // défauts du nouveau type ; un profil déjà configuré garde ses choix.
        if (!config.sections) setSections(sectionsParDefaut(nouveauType));
        setModifie(true);
    };

    const basculerSection = (id: SectionId) => {
        setSections((s) => ({ ...s, [id]: s[id] === false ? true : false }));
        setModifie(true);
    };

    const enregistrer = async () => {
        const valeur = slug.trim().toLowerCase();
        const v = validateUsername(valeur);
        if (!v.ok) return;
        setEnregistrement(true);
        try {
            if (valeur !== config.username) {
                await claimUsername(uid, valeur, config.username || null);
            }
            const db = getFirestore(getApp());
            await setDoc(doc(db, 'members', uid, 'superProfile', 'config'), {
                enabled: true,
                username: valeur,
                medium: config.medium ?? 'other',
                type,
                displayName: displayName.trim().slice(0, 120),
                tagline: tagline.trim().slice(0, 200),
                bio: bio.trim().slice(0, 4000),
                sections,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            setModifie(false);
            setEnregistre(true);
            window.setTimeout(() => setEnregistre(false), 2500);
        } finally {
            setEnregistrement(false);
        }
    };

    return (
        <div className="space-y-10 max-w-3xl">
            <div>
                <h3 className="font-prata text-[#f3e5ab] text-2xl mb-2">{t('My site', 'Mon site')}</h3>
                <p className="font-lato text-neutral-400 text-sm">
                    {t('Your type, your address, and the words at the top of your page.', 'Votre type, votre adresse, et les mots en haut de votre page.')}
                </p>
            </div>

            <div>
                <span className={LABEL}>{t('Artist type', "Type d'artiste")}</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ORDRE_TYPES.map((id) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => changerType(id)}
                            className={`text-left px-4 py-3 rounded-[10px] border transition-colors ${
                                type === id ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#f3e5ab]' : 'border-white/10 text-neutral-300 hover:border-white/25'
                            }`}
                        >
                            <span className="font-lato text-sm block">{language === 'FR' ? LIBELLES_ARTISTE[id].fr : LIBELLES_ARTISTE[id].en}</span>
                        </button>
                    ))}
                </div>
                <p className="font-lato text-[13px] text-neutral-500 mt-2">
                    {language === 'FR' ? LIBELLES_ARTISTE[type].aideFr : LIBELLES_ARTISTE[type].aideEn}
                </p>
            </div>

            <div>
                <label htmlFor="pp-slug" className={LABEL}>{t('Address', 'Adresse')}</label>
                <div className="flex items-center gap-2">
                    <span className="font-lato text-neutral-500 text-sm shrink-0">www.lesalondesinconnus.com/</span>
                    <input
                        id="pp-slug"
                        type="text"
                        value={slug}
                        onChange={(e) => { setSlug(e.target.value.toLowerCase()); setModifie(true); }}
                        className={CHAMP}
                    />
                </div>
                {slugStatut === 'pris' && <p className="text-rose-300 text-[13px] mt-2 font-lato">{t('This address is already taken.', 'Cette adresse est déjà prise.')}</p>}
                {slugStatut === 'invalide' && <p className="text-rose-300 text-[13px] mt-2 font-lato">{t('Use only letters, digits and hyphens, 3 to 32 characters.', 'Seulement lettres, chiffres et traits d’union, de 3 à 32 caractères.')}</p>}
                {slugStatut === 'ok' && <p className="text-[#c5a059] text-[13px] mt-2 font-lato">{t('Available.', 'Disponible.')}</p>}
                {!slug && displayName && (
                    <button type="button" onClick={() => setSlug(slugifyDisplayName(displayName))} className="text-[13px] text-neutral-500 hover:text-[#c5a059] mt-2 font-lato underline">
                        {t('Suggest from my name', 'Suggérer à partir de mon nom')}
                    </button>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className={LABEL}>{t('Display name', 'Nom affiché')}</span>
                    <input type="text" value={displayName} onChange={(e) => { setDisplayName(e.target.value.slice(0, 120)); setModifie(true); }} className={CHAMP} />
                </label>
                <label className="block">
                    <span className={LABEL}>{t('Tagline', 'Sous-ligne')}</span>
                    <input type="text" value={tagline} onChange={(e) => { setTagline(e.target.value.slice(0, 200)); setModifie(true); }} className={CHAMP} />
                </label>
            </div>

            <label className="block">
                <span className={LABEL}>{t('Practice statement', 'Démarche (bio)')}</span>
                <textarea value={bio} onChange={(e) => { setBio(e.target.value.slice(0, 4000)); setModifie(true); }} className={`${CHAMP} min-h-[10rem] resize-y`} />
            </label>

            <div>
                <span className={LABEL}>{t('Hero photo', 'Photo de couverture')}</span>
                <HeroPhotoUploader
                    uid={uid}
                    hero={config.hero}
                    onChange={async (hero) => {
                        const db = getFirestore(getApp());
                        await setDoc(doc(db, 'members', uid, 'superProfile', 'config'), { hero, updatedAt: serverTimestamp() }, { merge: true });
                    }}
                    onClear={async () => {
                        const db = getFirestore(getApp());
                        await setDoc(doc(db, 'members', uid, 'superProfile', 'config'), { hero: null, updatedAt: serverTimestamp() }, { merge: true });
                    }}
                />
            </div>

            <div>
                <span className={LABEL}>{t('Sections shown on the page', 'Sections affichées sur la page')}</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.keys(SECTIONS_ETIQUETTES) as SectionId[]).map((id) => {
                        const allumee = sections[id] !== false;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => basculerSection(id)}
                                className={`flex items-center justify-between px-4 py-2.5 rounded-[10px] border transition-colors ${
                                    allumee ? 'border-[#c5a059]/50 bg-[#c5a059]/10 text-[#f3e5ab]' : 'border-white/10 text-neutral-500'
                                }`}
                            >
                                <span className="font-lato text-sm">{language === 'FR' ? SECTIONS_ETIQUETTES[id].fr : SECTIONS_ETIQUETTES[id].en}</span>
                                <span className="font-cinzel text-[13px] uppercase tracking-[0.2em]">{allumee ? t('On', 'On') : t('Off', 'Off')}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={enregistrer}
                    disabled={!modifie || enregistrement || slugStatut === 'pris' || slugStatut === 'invalide'}
                    className="min-h-[44px] px-6 bg-[#c5a059] text-[#050505] font-cinzel text-[13px] uppercase tracking-[0.3em] hover:bg-[#d4b06a] disabled:opacity-40 transition-colors rounded-[15px]"
                >
                    {enregistrement ? t('Saving…', 'Enregistrement…') : t('Save', 'Enregistrer')}
                </button>
                {enregistre && <span className="text-[#c5a059] text-sm font-lato">{t('Saved', 'Enregistré')}</span>}
                {config.enabled && (
                    <a
                        href={`/${config.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-neutral-400 hover:text-[#c5a059] text-sm font-lato underline"
                    >
                        {t('View my page', 'Voir ma page')}
                    </a>
                )}
            </div>
        </div>
    );
};
