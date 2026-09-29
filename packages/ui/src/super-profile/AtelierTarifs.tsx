// AtelierTarifs : les forfaits du photographe, édités sur place. Ajouter un
// forfait l'écrit tout de suite; chaque champ s'écrit à la sortie; les
// flèches changent l'ordre. Le lien de réservation ou de paiement doit
// commencer par https : un autre lien reste dans le champ, signalé, sans
// être enregistré. Douze forfaits au plus.

import * as React from 'react';
import { lienHttpsValide, MAX_TARIFS, type TarifEspace } from './types';
import { AIDE, BLOC, BOUTON_SECONDAIRE, BoutonFleche, CHAMP, EtatEcriture, IconRetirer, TITRE_BLOC, newId, useEcritureImmediate } from './atelierCommun';

interface Props {
    uid: string;
    valeur: TarifEspace[];
    language?: 'EN' | 'FR';
}

function nettoyer(x: TarifEspace): TarifEspace {
    const propre: TarifEspace = { id: x.id, nom: (x.nom ?? '').trim().slice(0, 120) };
    if (typeof x.prix === 'number' && Number.isFinite(x.prix) && x.prix >= 0) propre.prix = Math.min(x.prix, 100000);
    const description = x.description?.trim().slice(0, 600);
    if (description) propre.description = description;
    if (x.lien && lienHttpsValide(x.lien.trim())) propre.lien = x.lien.trim();
    return propre;
}

export const AtelierTarifs: React.FC<Props> = ({ uid, valeur, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const { etat, ecrire } = useEcritureImmediate(uid);
    const [liste, setListe] = React.useState<TarifEspace[]>(valeur);
    const listeRef = React.useRef(liste);
    listeRef.current = liste;

    React.useEffect(() => { setListe(valeur); }, [valeur]);

    const enregistrer = (suivante: TarifEspace[]) => {
        setListe(suivante);
        void ecrire({ tarifs: suivante.map(nettoyer) });
    };
    const maj = (id: string, patch: Partial<TarifEspace>) => setListe((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const sortie = () => enregistrer(listeRef.current);
    const deplacer = (i: number, d: -1 | 1) => {
        const l = [...listeRef.current];
        const j = i + d;
        if (j < 0 || j >= l.length) return;
        [l[i], l[j]] = [l[j], l[i]];
        enregistrer(l);
    };

    return (
        <div className={BLOC}>
            <div className="flex items-center justify-between gap-4">
                <h4 className={TITRE_BLOC}>{t('Rates', 'Tarifs')}</h4>
                <div className="flex items-center gap-3">
                    <EtatEcriture etat={etat} language={language} />
                    <button type="button" onClick={() => liste.length < MAX_TARIFS && enregistrer([...liste, { id: newId(), nom: t('New session', 'Nouvelle séance') }])} disabled={liste.length >= MAX_TARIFS} className={BOUTON_SECONDAIRE}>
                        {t('Add', 'Ajouter')}
                    </button>
                </div>
            </div>
            <p className={`${AIDE} -mt-2`}>
                {t('Each rate can open your booking or payment page (https).', 'Chaque forfait peut ouvrir votre page de réservation ou de paiement (https).')}
            </p>
            <div className="space-y-3">
                {liste.map((x, i) => {
                    const lienFautif = !!x.lien && !lienHttpsValide(x.lien.trim());
                    return (
                        <div key={x.id} className="grid grid-cols-[1fr_auto] gap-3 items-start p-3 rounded-[12px] border border-white/10">
                            <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
                                <input className={CHAMP} maxLength={120} placeholder={t('Name', 'Nom')} value={x.nom} onChange={(e) => maj(x.id, { nom: e.target.value })} onBlur={sortie} />
                                <input
                                    className={CHAMP} type="number" min={0} step="1" inputMode="decimal" placeholder={t('Price $', 'Prix $')}
                                    value={x.prix ?? ''}
                                    onChange={(e) => maj(x.id, { prix: e.target.value === '' ? undefined : Number(e.target.value) })}
                                    onBlur={sortie}
                                />
                                <textarea className={`${CHAMP} sm:col-span-2 min-h-[4rem] resize-y`} maxLength={600} placeholder={t('What the session includes', 'Ce que la séance comprend')} value={x.description ?? ''} onChange={(e) => maj(x.id, { description: e.target.value })} onBlur={sortie} />
                                <input
                                    className={`${CHAMP} sm:col-span-2 ${lienFautif ? 'border-rose-300/70' : ''}`}
                                    value={x.lien ?? ''} placeholder="https://…" aria-invalid={lienFautif}
                                    onChange={(e) => maj(x.id, { lien: e.target.value })}
                                    onBlur={sortie}
                                />
                                {lienFautif && <p className="sm:col-span-2 text-rose-300 text-[13px] font-lato">{t('The link must start with https.', 'Le lien doit commencer par https.')}</p>}
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <BoutonFleche sens="haut" onClick={() => deplacer(i, -1)} disabled={i === 0} label={t('Move up', 'Monter')} />
                                <BoutonFleche sens="bas" onClick={() => deplacer(i, 1)} disabled={i === liste.length - 1} label={t('Move down', 'Descendre')} />
                                <IconRetirer onClick={() => enregistrer(listeRef.current.filter((y) => y.id !== x.id))} label={t('Remove', 'Retirer')} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
