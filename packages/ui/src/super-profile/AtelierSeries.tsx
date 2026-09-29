// AtelierSeries : les séries du photographe, éditées sur place. Ajouter une
// série l'écrit tout de suite; le titre et la description s'écrivent à la
// sortie du champ; les flèches changent l'ordre des séries comme celui des
// photos. Les photos sont réduites en webp dans le navigateur (2000 px au
// plus long côté) avant d'aller dans Storage, et leur largeur et hauteur
// sont notées pour que la mosaïque réserve leur place. Douze séries au plus,
// trente photos par série. Retirer une série retire aussi ses photos.

import * as React from 'react';
import { getApp } from 'firebase/app';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { MAX_PHOTOS_SERIE, MAX_SERIES, photoSerieStoragePath, type PhotoSerie, type SeriePhoto } from './types';
import { versWebp } from './versWebp';
import { AIDE, BLOC, BOUTON_SECONDAIRE, BoutonFleche, CHAMP, EtatEcriture, IconRetirer, TITRE_BLOC, newId, useEcritureImmediate } from './atelierCommun';

interface Props {
    uid: string;
    valeur: SeriePhoto[];
    language?: 'EN' | 'FR';
}

function nettoyer(s: SeriePhoto): SeriePhoto {
    const propre: SeriePhoto = { id: s.id, titre: (s.titre ?? '').trim().slice(0, 120), photos: s.photos.slice(0, MAX_PHOTOS_SERIE) };
    const description = s.description?.trim().slice(0, 600);
    if (description) propre.description = description;
    return propre;
}

function echanger<T>(l: T[], i: number, d: -1 | 1): T[] {
    const j = i + d;
    if (j < 0 || j >= l.length) return l;
    const c = [...l];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
}

async function effacer(chemin?: string) {
    if (!chemin) return;
    try { await deleteObject(storageRef(getStorage(getApp()), chemin)); } catch { /* déjà partie */ }
}

export const AtelierSeries: React.FC<Props> = ({ uid, valeur, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const { etat, ecrire } = useEcritureImmediate(uid);
    const [liste, setListe] = React.useState<SeriePhoto[]>(valeur);
    const [envoi, setEnvoi] = React.useState<{ serie: string; reste: number } | null>(null);
    const listeRef = React.useRef(liste);
    listeRef.current = liste;

    React.useEffect(() => { setListe(valeur); }, [valeur]);

    const enregistrer = (suivante: SeriePhoto[]) => {
        setListe(suivante);
        void ecrire({ series: suivante.map(nettoyer) });
    };
    const maj = (id: string, patch: Partial<SeriePhoto>) => setListe((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const majPhotos = (id: string, f: (p: PhotoSerie[]) => PhotoSerie[]) =>
        enregistrer(listeRef.current.map((s) => (s.id === id ? { ...s, photos: f(s.photos) } : s)));
    const sortie = () => enregistrer(listeRef.current);

    const ajouter = () => {
        if (liste.length >= MAX_SERIES) return;
        enregistrer([...liste, { id: newId(), titre: t('New series', 'Nouvelle série'), photos: [] }]);
    };

    const retirerSerie = async (s: SeriePhoto) => {
        enregistrer(listeRef.current.filter((x) => x.id !== s.id));
        for (const p of s.photos) await effacer(p.storagePath);
    };

    const deposer = async (serieId: string, fichiers: FileList | null) => {
        const serie = listeRef.current.find((s) => s.id === serieId);
        if (!serie) return;
        const images = Array.from(fichiers ?? []).filter((f) => f.type.startsWith('image/')).slice(0, MAX_PHOTOS_SERIE - serie.photos.length);
        if (!images.length) return;
        try {
            for (let k = 0; k < images.length; k++) {
                setEnvoi({ serie: serieId, reste: images.length - k });
                const blob = await versWebp(images[k], 2000);
                const bitmap = await createImageBitmap(blob);
                const photo: PhotoSerie = { id: newId(), url: '', storagePath: '', largeur: bitmap.width, hauteur: bitmap.height };
                bitmap.close?.();
                photo.storagePath = photoSerieStoragePath(uid, serieId, photo.id);
                const ref = storageRef(getStorage(getApp()), photo.storagePath);
                await uploadBytes(ref, blob, { contentType: blob.type, cacheControl: 'public, max-age=31536000' });
                photo.url = await getDownloadURL(ref);
                majPhotos(serieId, (p) => [...p, photo].slice(0, MAX_PHOTOS_SERIE));
            }
        } finally {
            setEnvoi(null);
        }
    };

    return (
        <div className={BLOC}>
            <div className="flex items-center justify-between gap-4">
                <h4 className={TITRE_BLOC}>{t('Series', 'Séries')}</h4>
                <div className="flex items-center gap-3">
                    <EtatEcriture etat={etat} language={language} />
                    <button type="button" onClick={ajouter} disabled={liste.length >= MAX_SERIES} className={BOUTON_SECONDAIRE}>
                        {t('Add a series', 'Ajouter une série')}
                    </button>
                </div>
            </div>
            <p className={`${AIDE} -mt-2`}>
                {t(
                    'Up to 12 series of 30 photos. The first photo of the first series opens your space.',
                    'Jusqu’à 12 séries de 30 photos. La première photo de la première série ouvre votre espace.',
                )}
            </p>
            <div className="space-y-4">
                {liste.map((s, i) => {
                    const pleine = s.photos.length >= MAX_PHOTOS_SERIE;
                    const enEnvoi = envoi?.serie === s.id;
                    return (
                        <div key={s.id} className="p-4 rounded-[12px] border border-white/10 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="flex-1 grid gap-2">
                                    <input className={CHAMP} maxLength={120} placeholder={t('Series title', 'Titre de la série')} value={s.titre} onChange={(e) => maj(s.id, { titre: e.target.value })} onBlur={sortie} />
                                    <textarea className={`${CHAMP} min-h-[4rem] resize-y`} maxLength={600} placeholder={t('A few words about the series', 'Quelques mots sur la série')} value={s.description ?? ''} onChange={(e) => maj(s.id, { description: e.target.value })} onBlur={sortie} />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <BoutonFleche sens="haut" onClick={() => enregistrer(echanger(listeRef.current, i, -1))} disabled={i === 0} label={t('Move series up', 'Monter la série')} />
                                    <BoutonFleche sens="bas" onClick={() => enregistrer(echanger(listeRef.current, i, 1))} disabled={i === liste.length - 1} label={t('Move series down', 'Descendre la série')} />
                                    <IconRetirer onClick={() => void retirerSerie(s)} label={t('Remove series', 'Retirer la série')} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {s.photos.map((p, k) => (
                                    <div key={p.id} className="relative aspect-square rounded-[8px] overflow-hidden border border-white/10 group">
                                        <img src={p.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                        <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 opacity-100 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                            <button type="button" aria-label={t('Earlier', 'Plus tôt')} disabled={k === 0} onClick={() => majPhotos(s.id, (l) => echanger(l, k, -1))} className="w-9 h-9 flex items-center justify-center text-neutral-200 disabled:opacity-25">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={t('Remove photo', 'Retirer la photo')}
                                                onClick={() => { majPhotos(s.id, (l) => l.filter((x) => x.id !== p.id)); void effacer(p.storagePath); }}
                                                className="w-9 h-9 flex items-center justify-center text-neutral-200 hover:text-rose-300"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                                            </button>
                                            <button type="button" aria-label={t('Later', 'Plus tard')} disabled={k === s.photos.length - 1} onClick={() => majPhotos(s.id, (l) => echanger(l, k, 1))} className="w-9 h-9 flex items-center justify-center text-neutral-200 disabled:opacity-25">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {!pleine && (
                                    <label className="aspect-square rounded-[8px] border border-dashed border-white/20 hover:border-[#c5a059] cursor-pointer flex flex-col items-center justify-center gap-1 text-neutral-400 font-lato text-[13px] text-center px-2">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
                                        {enEnvoi ? t(`Sending, ${envoi.reste} left`, `Envoi, encore ${envoi.reste}`) : t('Photos', 'Photos')}
                                        <input type="file" accept="image/*" multiple className="sr-only" disabled={!!envoi} onChange={(e) => { void deposer(s.id, e.target.files); e.target.value = ''; }} />
                                    </label>
                                )}
                            </div>
                            <p className={AIDE}>{s.photos.length} / {MAX_PHOTOS_SERIE}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
