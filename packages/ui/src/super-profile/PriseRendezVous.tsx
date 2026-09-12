// PriseRendezVous : le widget public de réservation, monté dans la section
// du même nom de chaque gabarit du Profil Pro. Porté d'un widget déjà construit
// pour un chantier précédent, avec un ajout : la personne qui
// réserve n'a pas besoin d'avoir déjà un compte. Si elle n'en a pas, le
// widget lui en ouvre un à la volée (mot de passe aléatoire, courriel de
// réinitialisation), ce qui en fait au passage un membre du Creator Studio.

import * as React from 'react';
import { getApp } from 'firebase/app';
import {
    getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail, type User,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
    cleJour, creneauxLibres, demanderRendezVous, formatDate, formatHeure,
    icsRendezVous, joursDisponibles, rencontreOuverte,
    telechargerIcs, useAgendaConfig, useMesRendezVousPro, useOccupationsPro,
    annulerRendezVousPro,
    type Creneau,
} from './rendezvous';
import { Rencontre } from './Rencontre';

interface PriseRendezVousProps {
    artisteUid: string;
    artisteNom: string;
    language?: 'EN' | 'FR';
}

function motDePasseAleatoire(): string {
    const buf = new Uint8Array(36);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
    else for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
    return Array.from(buf, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 48);
}

async function ensureMemberDoc(user: User): Promise<void> {
    const db = getFirestore(getApp());
    await setDoc(
        doc(db, 'members', user.uid),
        {
            uid: user.uid,
            displayName: user.displayName ?? '',
            email: user.email ?? '',
            photoURL: user.photoURL ?? null,
            provider: 'email',
            lastSeenAt: serverTimestamp(),
        },
        { merge: true },
    );
    // joinedAt seulement s'il n'existe pas déjà : create-merge ne l'écraserait
    // pas, mais on évite quand même l'écriture inutile côté commentaire.
}

const IconChevronGauche = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
);
const IconChevronDroite = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 18l6-6-6-6" /></svg>
);
const IconTelecharger = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" /></svg>
);
const IconVideo = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="6" width="14" height="12" rx="2" /><path d="M22 8l-6 4 6 4V8z" /></svg>
);

const CHAMP = 'w-full bg-black/40 border border-white/15 rounded-[15px] px-4 py-3 text-[#f3e5ab] placeholder-neutral-500 outline-none transition-colors focus:border-[#c5a059] font-lato';

export const PriseRendezVous: React.FC<PriseRendezVousProps> = ({ artisteUid, artisteNom, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [user, setUser] = React.useState<User | null | undefined>(undefined);
    React.useEffect(() => {
        let auth; try { auth = getAuth(getApp()); } catch { setUser(null); return; }
        return onAuthStateChanged(auth, (u) => setUser(u));
    }, []);

    const config = useAgendaConfig(artisteUid);
    const occupations = useOccupationsPro(artisteUid);
    const mesRendezVous = useMesRendezVousPro(artisteUid, user?.uid);

    const [maintenant, setMaintenant] = React.useState(() => new Date());
    React.useEffect(() => {
        const id = window.setInterval(() => setMaintenant(new Date()), 60000);
        return () => window.clearInterval(id);
    }, []);

    const [moisAffiche, setMoisAffiche] = React.useState(() => {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), 1);
    });
    const [jourChoisi, setJourChoisi] = React.useState<Date | null>(null);
    const [creneauChoisi, setCreneauChoisi] = React.useState<Creneau | null>(null);
    const [nom, setNom] = React.useState(user?.displayName ?? '');
    const [courriel, setCourriel] = React.useState(user?.email ?? '');
    const [motDePasseConnexion, setMotDePasseConnexion] = React.useState('');
    const [demandeConnexion, setDemandeConnexion] = React.useState(false);
    const [note, setNote] = React.useState('');
    const [envoiEnCours, setEnvoiEnCours] = React.useState(false);
    const [erreur, setErreur] = React.useState<string | null>(null);
    const [salleActive, setSalleActive] = React.useState<{ salle: string; nom: string } | null>(null);

    React.useEffect(() => {
        if (user) { setNom(user.displayName ?? ''); setCourriel(user.email ?? ''); }
    }, [user]);

    const joursLibres = React.useMemo(() => new Set(joursDisponibles(config, occupations, maintenant)), [config, occupations, maintenant]);
    const semaine = React.useMemo(() => {
        const premier = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), 1);
        const dernier = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 0);
        const decalage = (premier.getDay() + 6) % 7;
        const cellules: (Date | null)[] = [];
        for (let i = 0; i < decalage; i++) cellules.push(null);
        for (let jour = 1; jour <= dernier.getDate(); jour++) cellules.push(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), jour));
        return cellules;
    }, [moisAffiche]);
    const creneauxDuJour = React.useMemo(
        () => (jourChoisi ? creneauxLibres(config, jourChoisi, occupations, maintenant) : []),
        [config, jourChoisi, occupations, maintenant],
    );
    const clePassee = cleJour(maintenant);
    const nomMois = moisAffiche.toLocaleDateString(language === 'FR' ? 'fr-CA' : 'en-CA', { month: 'long', year: 'numeric' });
    const premierMoisPossible = maintenant.getFullYear() === moisAffiche.getFullYear() && maintenant.getMonth() === moisAffiche.getMonth();
    const auMoinsUnJour = semaine.some((j) => j && joursLibres.has(cleJour(j)));

    const confirmer = async () => {
        if (!creneauChoisi || envoiEnCours) return;
        if (!nom.trim() || !courriel.trim()) { setErreur(t('Enter your name and email.', 'Entrez votre nom et votre courriel.')); return; }
        setEnvoiEnCours(true);
        setErreur(null);
        try {
            let uid = user?.uid;
            const auth = getAuth(getApp());
            if (!uid) {
                if (demandeConnexion) {
                    const cred = await signInWithEmailAndPassword(auth, courriel.trim(), motDePasseConnexion);
                    uid = cred.user.uid;
                } else {
                    try {
                        const cred = await createUserWithEmailAndPassword(auth, courriel.trim(), motDePasseAleatoire());
                        if (nom.trim()) await updateProfile(cred.user, { displayName: nom.trim() });
                        await ensureMemberDoc(cred.user);
                        sendPasswordResetEmail(auth, courriel.trim(), { url: `${window.location.origin}/createur` }).catch(() => { /* non bloquant */ });
                        uid = cred.user.uid;
                    } catch (e: any) {
                        if (e?.code === 'auth/email-already-in-use') {
                            setDemandeConnexion(true);
                            setErreur(t(
                                'An account already exists with this email. Enter its password to sign in.',
                                'Un compte existe déjà avec ce courriel. Entrez son mot de passe pour vous connecter.',
                            ));
                            return;
                        }
                        throw e;
                    }
                }
            }
            if (!uid) throw new Error('no-uid');
            await demanderRendezVous(artisteUid, uid, nom.trim(), courriel.trim(), creneauChoisi, config.duree, note);
            setJourChoisi(null);
            setCreneauChoisi(null);
            setNote('');
            setDemandeConnexion(false);
        } catch (e: any) {
            console.error('demande de rendez-vous', e);
            setErreur(t('The request failed. Try again in a moment.', 'La demande a échoué. Réessayez dans un instant.'));
        } finally {
            setEnvoiEnCours(false);
        }
    };

    if (salleActive) {
        return <Rencontre salle={salleActive.salle} nom={salleActive.nom} language={language} onQuitter={() => setSalleActive(null)} />;
    }

    return (
        <div className="space-y-10">
            {/* Calendrier */}
            <div className="bg-black/40 backdrop-blur-md border border-white/15 rounded-[15px] p-5 md:p-7">
                <div className="flex items-center justify-between mb-5">
                    <button
                        type="button"
                        onClick={() => setMoisAffiche(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() - 1, 1))}
                        disabled={premierMoisPossible}
                        aria-label={t('Previous month', 'Mois précédent')}
                        className="w-11 h-11 flex items-center justify-center rounded-full text-neutral-400 hover:text-[#c5a059] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <IconChevronGauche />
                    </button>
                    <p className="font-cinzel text-xs uppercase tracking-[0.3em] text-[#f3e5ab] capitalize">{nomMois}</p>
                    <button
                        type="button"
                        onClick={() => setMoisAffiche(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 1))}
                        aria-label={t('Next month', 'Mois suivant')}
                        className="w-11 h-11 flex items-center justify-center rounded-full text-neutral-400 hover:text-[#c5a059] transition-colors"
                    >
                        <IconChevronDroite />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                    {(language === 'FR' ? 'L,M,M,J,V,S,D' : 'M,T,W,T,F,S,S').split(',').map((j, i) => (
                        <p key={`${j}-${i}`} className="text-center text-[10px] font-cinzel uppercase tracking-widest text-neutral-500 py-1">{j}</p>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {semaine.map((jour, i) => {
                        if (!jour) return <div key={`vide-${i}`} />;
                        const cle = cleJour(jour);
                        const passe = cle < clePassee;
                        const dispo = joursLibres.has(cle);
                        const choisi = jourChoisi ? cleJour(jourChoisi) === cle : false;
                        return (
                            <button
                                key={cle}
                                type="button"
                                disabled={passe || !dispo}
                                aria-pressed={choisi}
                                onClick={() => { setJourChoisi(jour); setCreneauChoisi(null); }}
                                className={`min-h-[44px] rounded-[10px] text-sm font-lato transition-colors ${
                                    passe || !dispo
                                        ? 'text-neutral-700 cursor-default'
                                        : choisi
                                            ? 'bg-[#c5a059] text-[#050505] font-semibold'
                                            : 'bg-white/5 text-neutral-200 hover:bg-white/10'
                                }`}
                            >
                                {jour.getDate()}
                            </button>
                        );
                    })}
                </div>
                {!auMoinsUnJour && <p className="text-neutral-500 text-sm mt-4 font-lato">{t('No slots this month.', 'Aucun créneau ce mois-ci.')}</p>}

                {jourChoisi && creneauxDuJour.length > 0 && (
                    <div className="mt-6">
                        <p className="font-cinzel text-[9px] uppercase tracking-[0.3em] text-neutral-500 mb-3">{t('Available times', 'Créneaux disponibles')}</p>
                        <div className="flex flex-wrap gap-2">
                            {creneauxDuJour.map((c) => {
                                const choisi = creneauChoisi && creneauChoisi.debut.getTime() === c.debut.getTime();
                                return (
                                    <button
                                        key={c.debut.toISOString()}
                                        type="button"
                                        onClick={() => setCreneauChoisi(c)}
                                        aria-pressed={!!choisi}
                                        className={`min-h-[44px] px-4 rounded-full text-sm font-lato border transition-colors ${
                                            choisi ? 'bg-[#c5a059] text-[#050505] border-[#c5a059] font-semibold' : 'border-white/15 text-neutral-200 hover:border-[#c5a059]'
                                        }`}
                                    >
                                        {formatHeure(c.debut, language)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {creneauChoisi && (
                    <div className="mt-6 border-t border-white/10 pt-6 space-y-4">
                        <div>
                            <p className="font-prata text-[#f3e5ab] text-lg">{formatDate(creneauChoisi.debut, language)}</p>
                            <p className="text-neutral-400 text-sm mt-1 font-lato">{formatHeure(creneauChoisi.debut, language)} · {config.duree} {t('minutes', 'minutes')}</p>
                        </div>
                        {!user && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input type="text" value={nom} onChange={(e) => setNom(e.target.value.slice(0, 120))} placeholder={t('Your name', 'Votre nom')} className={CHAMP} />
                                <input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value.slice(0, 200))} placeholder={t('Your email', 'Votre courriel')} className={CHAMP} />
                            </div>
                        )}
                        {demandeConnexion && (
                            <input
                                type="password"
                                value={motDePasseConnexion}
                                onChange={(e) => setMotDePasseConnexion(e.target.value)}
                                placeholder={t('Password', 'Mot de passe')}
                                className={CHAMP}
                            />
                        )}
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                            placeholder={t('What would you like to talk about?', 'Ce que vous voulez aborder')}
                            className={`${CHAMP} min-h-[6rem] resize-y`}
                        />
                        {erreur && <p role="alert" className="text-sm text-rose-300 font-lato">{erreur}</p>}
                        <button
                            type="button"
                            onClick={confirmer}
                            disabled={envoiEnCours}
                            className="min-h-[44px] px-6 py-3 bg-[#c5a059] text-[#050505] font-cinzel text-xs uppercase tracking-[0.3em] hover:bg-[#d4b06a] disabled:opacity-50 transition-colors rounded-[15px]"
                        >
                            {envoiEnCours ? t('Sending…', 'Envoi…') : t('Request this time', 'Demander ce moment')}
                        </button>
                    </div>
                )}
            </div>

            {/* Mes rendez-vous */}
            {user && mesRendezVous.length > 0 && (
                <div>
                    <p className="font-cinzel text-[9px] uppercase tracking-[0.3em] text-neutral-500 mb-4">{t('Your appointments', 'Vos rendez-vous')}</p>
                    <ul className="space-y-3">
                        {mesRendezVous.map((rdv) => {
                            const rejoindre = rencontreOuverte(rdv, maintenant);
                            const libelle = {
                                demande: t('Awaiting confirmation', 'En attente de confirmation'),
                                confirme: t('Confirmed', 'Confirmé'),
                                annule: t('Cancelled', 'Annulé'),
                                complete: t('Completed', 'Terminé'),
                            }[rdv.statut];
                            return (
                                <li key={rdv.id} className="border border-white/15 rounded-[15px] p-4 md:p-5 bg-black/30">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-prata text-[#f3e5ab]">{formatDate(rdv.debut, language)}</p>
                                            <p className="text-neutral-400 text-sm mt-0.5 font-lato">{formatHeure(rdv.debut, language)}</p>
                                        </div>
                                        <span className={`text-xs font-cinzel uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${rdv.statut === 'confirme' ? 'bg-[#c5a059]/15 text-[#c5a059]' : 'border border-white/15 text-neutral-400'}`}>
                                            {libelle}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-4">
                                        {rejoindre && (
                                            <button
                                                type="button"
                                                onClick={() => setSalleActive({ salle: rdv.salle, nom: nom || user.displayName || '' })}
                                                className="min-h-[44px] inline-flex items-center gap-2 px-5 rounded-[15px] bg-[#c5a059] text-[#050505] hover:bg-[#d4b06a] text-xs font-cinzel uppercase tracking-[0.25em] transition-colors"
                                            >
                                                <IconVideo /> {t('Join the meeting', 'Rejoindre la rencontre')}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => telechargerIcs('rendez-vous.ics', icsRendezVous(rdv, t(`Meeting with ${artisteNom}`, `Rencontre avec ${artisteNom}`)))}
                                            className="min-h-[44px] inline-flex items-center gap-2 px-5 rounded-[15px] border border-white/15 text-neutral-200 hover:border-[#c5a059] text-xs font-cinzel uppercase tracking-[0.25em] transition-colors"
                                        >
                                            <IconTelecharger /> {t('Add to calendar', 'Ajouter au calendrier')}
                                        </button>
                                        {(rdv.statut === 'demande' || rdv.statut === 'confirme') && (
                                            <button
                                                type="button"
                                                onClick={() => annulerRendezVousPro(rdv.id)}
                                                className="min-h-[44px] px-5 text-neutral-500 hover:text-rose-300 text-xs font-cinzel uppercase tracking-[0.25em] transition-colors"
                                            >
                                                {t('Cancel', 'Annuler')}
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};
