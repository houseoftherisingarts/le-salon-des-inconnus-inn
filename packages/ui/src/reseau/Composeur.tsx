import React, { useRef, useState } from 'react';
import { publierSurLeMur, LONGUEUR_MAX_POST } from './mur';
import { televerserImage } from './images';

interface ComposeurProps {
    uid: string;
    nom: string;
    avatarUrl?: string;
    language: 'EN' | 'FR';
    onPublie?: () => void;
}

export const Composeur: React.FC<ComposeurProps> = ({ uid, nom, avatarUrl, language, onPublie }) => {
    const [texte, setTexte] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoApercu, setPhotoApercu] = useState<string>('');
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState('');
    const fichier = useRef<HTMLInputElement>(null);

    const t = (en: string, fr: string) => (language === 'EN' ? en : fr);

    const choisirPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        setPhotoFile(f);
        setPhotoApercu(URL.createObjectURL(f));
        setErreur('');
    };

    const retirerPhoto = () => {
        if (photoApercu) URL.revokeObjectURL(photoApercu);
        setPhotoFile(null);
        setPhotoApercu('');
    };

    const publier = async () => {
        if ((!texte.trim() && !photoFile) || envoi) return;
        setEnvoi(true);
        setErreur('');
        try {
            let photoURL: string | undefined;
            if (photoFile) photoURL = await televerserImage(photoFile, uid, 'mur');
            await publierSurLeMur({ uid, nom, avatarUrl, texte, photoURL });
            setTexte('');
            retirerPhoto();
            onPublie?.();
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
        } finally { setEnvoi(false); }
    };

    return (
        <section className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-4 md:p-5">
            <textarea
                value={texte}
                onChange={(e) => setTexte(e.target.value.slice(0, LONGUEUR_MAX_POST))}
                rows={3}
                placeholder={t('What’s new in the studio?', 'Quoi de neuf au studio ?')}
                className="w-full px-4 py-3 rounded-[15px] border border-white/15 bg-black/30 text-neutral-100 text-sm font-lato leading-relaxed outline-none focus:border-[#c5a059]/60 transition-colors resize-none"
            />
            {photoApercu && (
                <div className="relative mt-3 inline-block">
                    <img src={photoApercu} alt="" className="max-h-56 rounded-[15px] object-cover" />
                    <button
                        type="button"
                        onClick={retirerPhoto}
                        aria-label={t('Remove photo', 'Retirer la photo')}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/70 text-neutral-200 hover:bg-black/90"
                    >
                        ✕
                    </button>
                </div>
            )}
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <button
                    type="button"
                    onClick={() => fichier.current?.click()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/15 text-[13px] font-cinzel uppercase tracking-[0.18em] text-neutral-400 hover:border-[#c5a059]/60 hover:text-[#c5a059] transition-colors"
                >
                    {t('Photo', 'Photo')}
                </button>
                <input ref={fichier} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={choisirPhoto} />
                <span className="ml-auto text-[13px] text-neutral-600 font-lato">{texte.length}/{LONGUEUR_MAX_POST}</span>
                <button
                    type="button"
                    onClick={publier}
                    disabled={envoi || (!texte.trim() && !photoFile)}
                    className="px-5 py-2.5 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-[13px] uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-all disabled:opacity-50"
                >
                    {envoi ? t('Posting…', 'Publication…') : t('Post', 'Publier')}
                </button>
            </div>
            {erreur && <p className="mt-2 text-xs text-rose-400 font-lato">{erreur}</p>}
        </section>
    );
};
