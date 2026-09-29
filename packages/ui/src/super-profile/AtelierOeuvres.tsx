// AtelierOeuvres : les œuvres du mur, éditées sur place. Déposer une image
// l'écrit tout de suite (réduite en webp dans le navigateur); chaque champ
// s'écrit à la sortie; les flèches changent l'ordre, et la première œuvre
// ouvre l'espace du peintre. La largeur et la hauteur en centimètres, quand
// elles sont données, proposent la vue « à l'échelle dans une pièce ». Le
// lien de vente doit pointer vers Stripe, Square ou Zeffy : tout autre lien
// reste dans le champ, signalé, sans jamais être enregistré.

import * as React from 'react';
import { getApp } from 'firebase/app';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { lienPaiementValide, MAX_OEUVRES, oeuvreStoragePath, type OeuvreProfilPro } from './types';
import { versWebp } from './versWebp';
import { AIDE, BLOC, BOUTON_SECONDAIRE, BoutonFleche, CHAMP, EtatEcriture, IconRetirer, TITRE_BLOC, newId, useEcritureImmediate } from './atelierCommun';

interface Props {
    uid: string;
    valeur: OeuvreProfilPro[];
    language?: 'EN' | 'FR';
}

const cm = (v?: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 2000 ? Math.round(v * 10) / 10 : undefined);

function nettoyer(o: OeuvreProfilPro): OeuvreProfilPro {
    const propre: OeuvreProfilPro = { url: o.url, storagePath: o.storagePath, statutVente: o.statutVente ?? 'a-vendre' };
    const texte = (v: string | undefined, max: number) => v?.trim().slice(0, max) || undefined;
    const champs = { titre: texte(o.titre, 150), technique: texte(o.technique, 120), dimensions: texte(o.dimensions, 60), annee: texte(o.annee, 20), caption: texte(o.caption, 300) };
    for (const [k, v] of Object.entries(champs)) if (v) (propre as unknown as Record<string, string>)[k] = v;
    const l = cm(o.largeurCm);
    const h = cm(o.hauteurCm);
    if (l && h) { propre.largeurCm = l; propre.hauteurCm = h; }
    if (propre.statutVente === 'a-vendre') {
        if (typeof o.prixCents === 'number' && o.prixCents > 0) propre.prixCents = Math.min(Math.round(o.prixCents), 100_000_000);
        if (o.lienVente && lienPaiementValide(o.lienVente.trim())) propre.lienVente = o.lienVente.trim();
    }
    return propre;
}

export const AtelierOeuvres: React.FC<Props> = ({ uid, valeur, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const { etat, ecrire } = useEcritureImmediate(uid);
    const [liste, setListe] = React.useState<OeuvreProfilPro[]>(valeur);
    const [envoi, setEnvoi] = React.useState(false);
    const listeRef = React.useRef(liste);
    listeRef.current = liste;
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => { setListe(valeur); }, [valeur]);

    const enregistrer = (suivante: OeuvreProfilPro[]) => {
        setListe(suivante);
        void ecrire({ oeuvres: suivante.map(nettoyer) });
    };
    const maj = (i: number, patch: Partial<OeuvreProfilPro>) => setListe((l) => l.map((o, k) => (k === i ? { ...o, ...patch } : o)));
    const sortie = () => enregistrer(listeRef.current);
    const deplacer = (i: number, d: -1 | 1) => {
        const l = [...listeRef.current];
        const j = i + d;
        if (j < 0 || j >= l.length) return;
        [l[i], l[j]] = [l[j], l[i]];
        enregistrer(l);
    };

    const deposer = async (fichiers: FileList | null) => {
        const images = Array.from(fichiers ?? []).filter((f) => f.type.startsWith('image/'));
        if (!images.length) return;
        setEnvoi(true);
        try {
            for (const f of images) {
                if (listeRef.current.length >= MAX_OEUVRES) break;
                const blob = await versWebp(f, 2000);
                const chemin = oeuvreStoragePath(uid, newId(), blob.type === 'image/webp' ? 'webp' : 'jpg');
                const ref = storageRef(getStorage(getApp()), chemin);
                await uploadBytes(ref, blob, { contentType: blob.type, cacheControl: 'public, max-age=31536000' });
                const url = await getDownloadURL(ref);
                enregistrer([...listeRef.current, { url, storagePath: chemin, statutVente: 'a-vendre' }]);
            }
        } finally {
            setEnvoi(false);
        }
    };

    const retirer = async (i: number) => {
        const o = listeRef.current[i];
        enregistrer(listeRef.current.filter((_, k) => k !== i));
        if (o?.storagePath) {
            try { await deleteObject(storageRef(getStorage(getApp()), o.storagePath)); } catch { /* déjà partie */ }
        }
    };

    return (
        <div className={BLOC}>
            <div className="flex items-center justify-between gap-4">
                <h4 className={TITRE_BLOC}>{t('Works', 'Œuvres')}</h4>
                <div className="flex items-center gap-3">
                    <EtatEcriture etat={etat} language={language} />
                    <button type="button" onClick={() => inputRef.current?.click()} disabled={envoi || liste.length >= MAX_OEUVRES} className={BOUTON_SECONDAIRE}>
                        {envoi ? t('Sending…', 'Envoi…') : t('Add', 'Ajouter')}
                    </button>
                    <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void deposer(e.target.files); e.target.value = ''; }} />
                </div>
            </div>
            <p className={`${AIDE} -mt-2`}>
                {t(
                    'The first work opens your space. Width and height in centimetres show the work to scale in a room.',
                    'La première œuvre ouvre votre espace. La largeur et la hauteur en centimètres permettent de la montrer à l’échelle, dans une pièce.',
                )}
            </p>
            <div className="space-y-3">
                {liste.map((o, i) => {
                    const lienFautif = !!o.lienVente && !lienPaiementValide(o.lienVente.trim());
                    const aVendre = (o.statutVente ?? 'a-vendre') === 'a-vendre';
                    return (
                        <div key={`${o.storagePath}-${i}`} className="grid grid-cols-[88px_1fr_auto] gap-3 items-start p-3 rounded-[12px] border border-white/10">
                            <img src={o.url} alt="" className="w-[88px] h-[88px] object-cover rounded-[10px] border border-white/15" />
                            <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                                <input className={`${CHAMP} col-span-2`} maxLength={150} placeholder={t('Title', 'Titre')} value={o.titre ?? ''} onChange={(e) => maj(i, { titre: e.target.value })} onBlur={sortie} />
                                <input className={CHAMP} maxLength={120} placeholder={t('Technique', 'Technique')} value={o.technique ?? ''} onChange={(e) => maj(i, { technique: e.target.value })} onBlur={sortie} />
                                <input className={CHAMP} maxLength={20} placeholder={t('Year', 'Année')} value={o.annee ?? ''} onChange={(e) => maj(i, { annee: e.target.value })} onBlur={sortie} />
                                <input className={CHAMP} type="number" min={1} max={2000} inputMode="decimal" placeholder={t('Width cm', 'Largeur cm')} value={o.largeurCm ?? ''} onChange={(e) => maj(i, { largeurCm: e.target.value === '' ? undefined : Number(e.target.value) })} onBlur={sortie} />
                                <input className={CHAMP} type="number" min={1} max={2000} inputMode="decimal" placeholder={t('Height cm', 'Hauteur cm')} value={o.hauteurCm ?? ''} onChange={(e) => maj(i, { hauteurCm: e.target.value === '' ? undefined : Number(e.target.value) })} onBlur={sortie} />
                                <select className={CHAMP} value={o.statutVente ?? 'a-vendre'} onChange={(e) => enregistrer(listeRef.current.map((x, k) => (k === i ? { ...x, statutVente: e.target.value as OeuvreProfilPro['statutVente'] } : x)))}>
                                    <option value="a-vendre">{t('For sale', 'À vendre')}</option>
                                    <option value="vendu">{t('Sold', 'Vendu')}</option>
                                    <option value="sur-demande">{t('On request', 'Sur demande')}</option>
                                </select>
                                {aVendre && (
                                    <input
                                        className={CHAMP} type="number" min={0} step="1" inputMode="decimal" placeholder={t('Price $', 'Prix $')}
                                        value={o.prixCents ? o.prixCents / 100 : ''}
                                        onChange={(e) => maj(i, { prixCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100) })}
                                        onBlur={sortie}
                                    />
                                )}
                                {aVendre && (
                                    <input
                                        className={`${CHAMP} col-span-2 sm:col-span-4 ${lienFautif ? 'border-rose-300/70' : ''}`}
                                        value={o.lienVente ?? ''} placeholder={t('Sale link https://buy.stripe.com/…', 'Lien de vente https://buy.stripe.com/…')}
                                        aria-invalid={lienFautif}
                                        onChange={(e) => maj(i, { lienVente: e.target.value })}
                                        onBlur={sortie}
                                    />
                                )}
                                {aVendre && lienFautif && (
                                    <p className="col-span-2 sm:col-span-4 text-rose-300 text-[13px] font-lato">
                                        {t('Only Stripe, Square or Zeffy links, starting with https.', 'Seulement un lien Stripe, Square ou Zeffy, qui commence par https.')}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <BoutonFleche sens="haut" onClick={() => deplacer(i, -1)} disabled={i === 0} label={t('Move up', 'Monter')} />
                                <BoutonFleche sens="bas" onClick={() => deplacer(i, 1)} disabled={i === liste.length - 1} label={t('Move down', 'Descendre')} />
                                <IconRetirer onClick={() => void retirer(i)} label={t('Remove', 'Retirer')} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
