// AgendaAdmin : « Mes disponibilités », l'onglet Rendez-vous du Profil Pro.
// Porté d'un panneau de disponibilités déjà construit pour un chantier précédent,
// adapté pour écrire sous members/{uid}/agenda/config plutôt que sous un
// document unique par site.

import * as React from 'react';
import { AGENDA_PAR_DEFAUT, enregistrerAgendaConfig, useAgendaConfig, type AgendaConfig, type PlageHoraire } from './rendezvous';

interface AgendaAdminProps {
    uid: string;
    language?: 'EN' | 'FR';
}

type JourKey = keyof AgendaConfig['jours'];
const JOURS_ORDRE: JourKey[] = ['1', '2', '3', '4', '5', '6', '0'];

const CHAMP = 'flex-1 min-w-0 bg-black/40 border border-white/15 rounded-[10px] px-2 py-2 text-sm text-[#f3e5ab] outline-none transition-colors focus:border-[#c5a059] font-lato';
const CHAMP_NOMBRE = 'w-full bg-black/40 border border-white/15 rounded-[10px] px-3 py-2.5 text-sm text-[#f3e5ab] outline-none transition-colors focus:border-[#c5a059] font-lato';

export const AgendaAdmin: React.FC<AgendaAdminProps> = ({ uid, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const config = useAgendaConfig(uid);

    const [jours, setJours] = React.useState<AgendaConfig['jours']>(config.jours);
    const [duree, setDuree] = React.useState(config.duree);
    const [tampon, setTampon] = React.useState(config.tampon);
    const [delaiMinHeures, setDelaiMinHeures] = React.useState(config.delaiMinHeures);
    const [horizonJours, setHorizonJours] = React.useState(config.horizonJours);
    const [exceptions, setExceptions] = React.useState<Record<string, PlageHoraire[]>>(config.exceptions ?? {});
    const [dateException, setDateException] = React.useState('');
    const [modifie, setModifie] = React.useState(false);
    const [enregistrement, setEnregistrement] = React.useState(false);
    const [enregistre, setEnregistre] = React.useState(false);

    React.useEffect(() => {
        if (modifie) return;
        setJours(config.jours);
        setDuree(config.duree);
        setTampon(config.tampon);
        setDelaiMinHeures(config.delaiMinHeures);
        setHorizonJours(config.horizonJours);
        setExceptions(config.exceptions ?? {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config, modifie]);

    const JOURS_LABEL: Record<JourKey, string> = {
        '0': t('Sunday', 'Dimanche'), '1': t('Monday', 'Lundi'), '2': t('Tuesday', 'Mardi'),
        '3': t('Wednesday', 'Mercredi'), '4': t('Thursday', 'Jeudi'), '5': t('Friday', 'Vendredi'), '6': t('Saturday', 'Samedi'),
    };

    const majPlage = (jour: JourKey, i: number, champ: keyof PlageHoraire, valeur: string) => {
        setJours((j) => ({ ...j, [jour]: j[jour].map((p, idx) => (idx === i ? { ...p, [champ]: valeur } : p)) }));
        setModifie(true);
    };
    const ajouterPlage = (jour: JourKey) => {
        setJours((j) => ({ ...j, [jour]: [...j[jour], { de: '09:00', a: '17:00' }] }));
        setModifie(true);
    };
    const retirerPlage = (jour: JourKey, i: number) => {
        setJours((j) => ({ ...j, [jour]: j[jour].filter((_, idx) => idx !== i) }));
        setModifie(true);
    };
    const ajouterException = () => {
        if (!dateException || exceptions[dateException]) return;
        setExceptions((ex) => ({ ...ex, [dateException]: [] }));
        setDateException('');
        setModifie(true);
    };
    const retirerException = (cle: string) => {
        setExceptions((ex) => { const s = { ...ex }; delete s[cle]; return s; });
        setModifie(true);
    };
    const majPlageException = (cle: string, i: number, champ: keyof PlageHoraire, valeur: string) => {
        setExceptions((ex) => ({ ...ex, [cle]: ex[cle].map((p, idx) => (idx === i ? { ...p, [champ]: valeur } : p)) }));
        setModifie(true);
    };
    const ajouterPlageException = (cle: string) => {
        setExceptions((ex) => ({ ...ex, [cle]: [...ex[cle], { de: '09:00', a: '17:00' }] }));
        setModifie(true);
    };
    const retirerPlageException = (cle: string, i: number) => {
        setExceptions((ex) => ({ ...ex, [cle]: ex[cle].filter((_, idx) => idx !== i) }));
        setModifie(true);
    };

    const enregistrer = async () => {
        if (enregistrement) return;
        setEnregistrement(true);
        try {
            await enregistrerAgendaConfig(uid, { duree, tampon, delaiMinHeures, horizonJours, fuseau: config.fuseau ?? AGENDA_PAR_DEFAUT.fuseau, jours, exceptions });
            setModifie(false);
            setEnregistre(true);
            window.setTimeout(() => setEnregistre(false), 2500);
        } finally {
            setEnregistrement(false);
        }
    };

    const rangeePlage = (p: PlageHoraire, onDe: (v: string) => void, onA: (v: string) => void, onRetirer: () => void, cle: string) => (
        <div key={cle} className="flex items-center gap-2 min-w-0">
            <input type="time" value={p.de} onChange={(e) => onDe(e.target.value)} aria-label={t('From', 'De')} className={CHAMP} />
            <span className="text-neutral-500 text-sm">{t('to', 'à')}</span>
            <input type="time" value={p.a} onChange={(e) => onA(e.target.value)} aria-label={t('To', 'À')} className={CHAMP} />
            <button type="button" onClick={onRetirer} aria-label={t('Remove the slot', 'Retirer la plage')} className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-neutral-500 hover:text-rose-300 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>
    );

    return (
        <div className="space-y-8 max-w-3xl">
            <div>
                <h3 className="font-prata text-[#f3e5ab] text-2xl mb-2">{t('My availability', 'Mes disponibilités')}</h3>
                <p className="font-lato text-neutral-400 text-sm">
                    {t('The time slots your visitors can book, and the exceptions to your usual schedule.', 'Les plages où vos visiteurs peuvent réserver, et les exceptions à votre horaire habituel.')}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {JOURS_ORDRE.map((jour) => (
                    <div key={jour} className="min-w-0 bg-black/30 border border-white/10 rounded-[15px] p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-cinzel text-xs uppercase tracking-[0.2em] text-[#f3e5ab]">{JOURS_LABEL[jour]}</p>
                            <button type="button" onClick={() => ajouterPlage(jour)} aria-label={t('Add a slot', 'Ajouter une plage')} className="w-11 h-11 flex items-center justify-center rounded-full text-neutral-500 hover:text-[#c5a059] transition-colors">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 5v14M5 12h14" /></svg>
                            </button>
                        </div>
                        {jours[jour].length === 0 ? (
                            <p className="text-neutral-500 text-sm font-lato">{t('Closed', 'Fermé')}</p>
                        ) : (
                            <div className="space-y-2">
                                {jours[jour].map((p, i) => rangeePlage(p, (v) => majPlage(jour, i, 'de', v), (v) => majPlage(jour, i, 'a', v), () => retirerPlage(jour, i), `${jour}-${i}`))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: t('Meeting length (minutes)', 'Durée d’une rencontre (minutes)'), value: duree, set: setDuree, min: 5, step: 5 },
                    { label: t('Buffer between meetings (minutes)', 'Tampon entre deux rencontres (minutes)'), value: tampon, set: setTampon, min: 0, step: 5 },
                    { label: t('Minimum notice (hours)', 'Délai minimal (heures)'), value: delaiMinHeures, set: setDelaiMinHeures, min: 0, step: 1 },
                    { label: t('Booking horizon (days)', 'Horizon de réservation (jours)'), value: horizonJours, set: setHorizonJours, min: 1, step: 1 },
                ].map((champ) => (
                    <label key={champ.label} className="block">
                        <span className="font-cinzel text-[13px] uppercase tracking-[0.25em] text-neutral-500 mb-1.5 block">{champ.label}</span>
                        <input
                            type="number"
                            min={champ.min}
                            step={champ.step}
                            value={champ.value}
                            onChange={(e) => { champ.set(Number(e.target.value)); setModifie(true); }}
                            className={CHAMP_NOMBRE}
                        />
                    </label>
                ))}
            </div>

            <div className="bg-black/30 border border-white/10 rounded-[15px] p-4 space-y-4">
                <p className="font-cinzel text-xs uppercase tracking-[0.2em] text-[#f3e5ab]">{t('Exceptions', 'Exceptions')}</p>
                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex-1 min-w-[10rem]">
                        <span className="font-cinzel text-[13px] uppercase tracking-[0.25em] text-neutral-500 mb-1.5 block">{t('Exception date', 'Date de l’exception')}</span>
                        <input type="date" value={dateException} onChange={(e) => setDateException(e.target.value)} className={CHAMP_NOMBRE} />
                    </label>
                    <button type="button" onClick={ajouterException} disabled={!dateException} className="min-h-[44px] px-5 border border-white/15 text-neutral-200 hover:border-[#c5a059] font-cinzel text-[13px] uppercase tracking-[0.25em] disabled:opacity-40 transition-colors rounded-[10px]">
                        {t('Add the exception', 'Ajouter l’exception')}
                    </button>
                </div>
                {Object.keys(exceptions).length === 0 ? (
                    <p className="text-neutral-500 text-sm font-lato">{t('No exceptions yet.', 'Aucune exception pour le moment.')}</p>
                ) : (
                    <div className="space-y-3">
                        {Object.entries(exceptions).sort(([a], [b]) => a.localeCompare(b)).map(([cle, plages]) => (
                            <div key={cle} className="border border-white/10 rounded-[10px] p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-lato text-[#f3e5ab]">{cle}</p>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => ajouterPlageException(cle)} aria-label={t('Add a slot', 'Ajouter une plage')} className="w-11 h-11 flex items-center justify-center rounded-full text-neutral-500 hover:text-[#c5a059] transition-colors">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 5v14M5 12h14" /></svg>
                                        </button>
                                        <button type="button" onClick={() => retirerException(cle)} aria-label={t('Remove the exception', 'Retirer l’exception')} className="w-11 h-11 flex items-center justify-center rounded-full text-neutral-500 hover:text-rose-300 transition-colors">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M6 6l12 12M18 6L6 18" /></svg>
                                        </button>
                                    </div>
                                </div>
                                {plages.length === 0 ? (
                                    <p className="text-neutral-500 text-sm font-lato">{t('Closed', 'Fermé')}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {plages.map((p, i) => rangeePlage(p, (v) => majPlageException(cle, i, 'de', v), (v) => majPlageException(cle, i, 'a', v), () => retirerPlageException(cle, i), `${cle}-${i}`))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={enregistrer}
                    disabled={!modifie || enregistrement}
                    className="min-h-[44px] px-6 bg-[#c5a059] text-[#050505] font-cinzel text-xs uppercase tracking-[0.3em] hover:bg-[#d4b06a] disabled:opacity-40 transition-colors rounded-[15px]"
                >
                    {enregistrement ? t('Saving…', 'Enregistrement…') : t('Save', 'Enregistrer')}
                </button>
                {enregistre && <span className="text-[#c5a059] text-sm font-lato">{t('Saved', 'Enregistré')}</span>}
            </div>
        </div>
    );
};
