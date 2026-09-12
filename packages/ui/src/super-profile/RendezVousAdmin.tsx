// RendezVousAdmin : la liste des rendez-vous de l'artiste, avec les gestes
// qui lui appartiennent (confirmer, annuler, terminer, noter en privé).

import * as React from 'react';
import {
    formatDate, formatHeure, majRendezVousProParArtiste, rencontreOuverte,
    useRendezVousProArtiste, type RendezVousPro,
} from './rendezvous';
import { Rencontre } from './Rencontre';

interface RendezVousAdminProps {
    uid: string;
    language?: 'EN' | 'FR';
}

const LIBELLES = {
    demande: { en: 'Requested', fr: 'Demandé' },
    confirme: { en: 'Confirmed', fr: 'Confirmé' },
    annule: { en: 'Cancelled', fr: 'Annulé' },
    complete: { en: 'Completed', fr: 'Terminé' },
};

export const RendezVousAdmin: React.FC<RendezVousAdminProps> = ({ uid, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const rdvs = useRendezVousProArtiste(uid);
    const [noteBrouillon, setNoteBrouillon] = React.useState<Record<string, string>>({});
    const [enCours, setEnCours] = React.useState<string | null>(null);
    const [salleActive, setSalleActive] = React.useState<{ salle: string; nom: string } | null>(null);
    const [maintenant] = React.useState(() => new Date());

    const agir = async (id: string, patch: Parameters<typeof majRendezVousProParArtiste>[1]) => {
        setEnCours(id);
        try { await majRendezVousProParArtiste(id, patch); } finally { setEnCours(null); }
    };

    if (salleActive) {
        return <Rencontre salle={salleActive.salle} nom={salleActive.nom} language={language} onQuitter={() => setSalleActive(null)} />;
    }

    if (rdvs.length === 0) {
        return <p className="font-lato text-neutral-500 text-sm">{t('No appointments yet.', 'Aucun rendez-vous pour le moment.')}</p>;
    }

    return (
        <div className="space-y-4 max-w-3xl">
            {rdvs.map((rdv) => {
                const rejoindre = rencontreOuverte(rdv, maintenant);
                const note = noteBrouillon[rdv.id] ?? rdv.noteAdmin ?? '';
                return (
                    <div key={rdv.id} className="bg-black/30 border border-white/10 rounded-[15px] p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="font-prata text-[#f3e5ab] text-lg">{rdv.nom}</p>
                                <p className="font-lato text-sm text-neutral-400 mt-0.5">{rdv.courriel}</p>
                                <p className="font-lato text-sm text-neutral-400 mt-1">{formatDate(rdv.debut, language)} · {formatHeure(rdv.debut, language)}</p>
                                {rdv.note && <p className="font-lato text-sm text-neutral-300 mt-3 whitespace-pre-line">{rdv.note}</p>}
                            </div>
                            <span className={`text-[13px] font-cinzel uppercase tracking-[0.2em] px-2.5 py-1 rounded-full shrink-0 ${
                                rdv.statut === 'confirme' ? 'bg-[#c5a059]/15 text-[#c5a059]' : 'border border-white/15 text-neutral-400'
                            }`}>
                                {LIBELLES[rdv.statut][language === 'FR' ? 'fr' : 'en']}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-4">
                            {rdv.statut === 'demande' && (
                                <button
                                    type="button"
                                    disabled={enCours === rdv.id}
                                    onClick={() => agir(rdv.id, { statut: 'confirme' })}
                                    className="min-h-[44px] px-5 bg-[#c5a059] text-[#050505] font-cinzel text-[13px] uppercase tracking-[0.25em] hover:bg-[#d4b06a] disabled:opacity-40 transition-colors rounded-[10px]"
                                >
                                    {t('Confirm', 'Confirmer')}
                                </button>
                            )}
                            {rejoindre && (
                                <button
                                    type="button"
                                    onClick={() => setSalleActive({ salle: rdv.salle, nom: t('You', 'Vous') })}
                                    className="min-h-[44px] px-5 border border-white/15 text-neutral-200 hover:border-[#c5a059] font-cinzel text-[13px] uppercase tracking-[0.25em] transition-colors rounded-[10px]"
                                >
                                    {t('Join', 'Rejoindre')}
                                </button>
                            )}
                            {(rdv.statut === 'demande' || rdv.statut === 'confirme') && (
                                <button
                                    type="button"
                                    disabled={enCours === rdv.id}
                                    onClick={() => agir(rdv.id, { statut: 'annule' })}
                                    className="min-h-[44px] px-5 text-neutral-500 hover:text-rose-300 font-cinzel text-[13px] uppercase tracking-[0.25em] disabled:opacity-40 transition-colors"
                                >
                                    {t('Cancel', 'Annuler')}
                                </button>
                            )}
                            {rdv.statut === 'confirme' && (
                                <button
                                    type="button"
                                    disabled={enCours === rdv.id}
                                    onClick={() => agir(rdv.id, { statut: 'complete' })}
                                    className="min-h-[44px] px-5 text-neutral-500 hover:text-[#c5a059] font-cinzel text-[13px] uppercase tracking-[0.25em] disabled:opacity-40 transition-colors"
                                >
                                    {t('Mark completed', 'Marquer terminé')}
                                </button>
                            )}
                        </div>

                        <div className="mt-4 flex gap-2">
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNoteBrouillon((s) => ({ ...s, [rdv.id]: e.target.value }))}
                                placeholder={t('Private note', 'Note privée')}
                                className="flex-1 bg-black/40 border border-white/15 rounded-[10px] px-3 py-2 text-sm text-[#f3e5ab] placeholder-neutral-500 outline-none focus:border-[#c5a059] font-lato"
                            />
                            <button
                                type="button"
                                disabled={enCours === rdv.id || note === (rdv.noteAdmin ?? '')}
                                onClick={() => agir(rdv.id, { noteAdmin: note })}
                                className="px-4 border border-white/15 text-neutral-300 hover:border-[#c5a059] font-cinzel text-[13px] uppercase tracking-[0.2em] disabled:opacity-30 transition-colors rounded-[10px]"
                            >
                                {t('Save', 'Enregistrer')}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
