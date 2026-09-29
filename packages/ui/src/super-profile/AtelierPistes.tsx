// AtelierPistes : les pistes audio de l'espace, déposées dans Storage sous
// superProfiles/{uid}/pistes/. Formats mp3, m4a, wav, ogg et flac, 30 Mo au
// plus, douze pistes au plus. La durée se lit dans le navigateur avant
// l'envoi; le titre se renomme à la sortie du champ; les flèches changent
// l'ordre d'écoute. Tout s'écrit sans bouton Enregistrer.

import * as React from 'react';
import { getApp } from 'firebase/app';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { MAX_AUDIO_OCTETS, MAX_PISTES, pisteStoragePath, type PisteEspace } from './types';
import { formatDuree } from './templates/lecteur/LecteurContexte';
import { deplacer } from './ordre';
import { AIDE, BLOC, BOUTON_SECONDAIRE, BoutonFleche, CHAMP, EtatEcriture, IconRetirer, TITRE_BLOC, newId, useEcritureImmediate } from './atelierCommun';

const TYPES_PAR_EXTENSION: Record<string, string> = {
    mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
};

function dureeAudio(fichier: File): Promise<number | undefined> {
    return new Promise((ok) => {
        const url = URL.createObjectURL(fichier);
        const a = new Audio();
        const fin = (d?: number) => { URL.revokeObjectURL(url); ok(d && Number.isFinite(d) ? Math.round(d) : undefined); };
        a.preload = 'metadata';
        a.onloadedmetadata = () => fin(a.duration);
        a.onerror = () => fin();
        a.src = url;
    });
}

interface Props {
    uid: string;
    valeur: PisteEspace[];
    language?: 'EN' | 'FR';
}

export const AtelierPistes: React.FC<Props> = ({ uid, valeur, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const { etat, ecrire } = useEcritureImmediate(uid);
    const [liste, setListe] = React.useState<PisteEspace[]>(valeur);
    const [envoi, setEnvoi] = React.useState<string | null>(null);
    const [refus, setRefus] = React.useState<string | null>(null);
    const listeRef = React.useRef(liste);
    listeRef.current = liste;

    React.useEffect(() => { setListe(valeur); }, [valeur]);

    const enregistrer = (suivante: PisteEspace[]) => {
        setListe(suivante);
        void ecrire({ pistes: suivante.map((p) => ({ ...p, titre: p.titre.trim().slice(0, 120) || 'Piste' })) });
    };

    const deposer = async (fichiers: FileList | null) => {
        if (!fichiers) return;
        setRefus(null);
        for (const fichier of Array.from(fichiers)) {
            if (listeRef.current.length >= MAX_PISTES) { setRefus(t('Twelve tracks at most.', 'Douze pistes au plus.')); break; }
            const ext = (fichier.name.split('.').pop() ?? '').toLowerCase();
            const type = TYPES_PAR_EXTENSION[ext];
            if (!type) { setRefus(t(`${fichier.name}: use mp3, m4a, wav, ogg or flac.`, `${fichier.name} : utilisez mp3, m4a, wav, ogg ou flac.`)); continue; }
            if (fichier.size > MAX_AUDIO_OCTETS) { setRefus(t(`${fichier.name} is over 30 MB.`, `${fichier.name} dépasse 30 Mo.`)); continue; }
            const id = newId();
            setEnvoi(fichier.name);
            try {
                const duree = await dureeAudio(fichier);
                const chemin = pisteStoragePath(uid, id, ext);
                const ref = storageRef(getStorage(getApp()), chemin);
                await uploadBytes(ref, fichier, { contentType: fichier.type.startsWith('audio/') ? fichier.type : type, cacheControl: 'public, max-age=31536000' });
                const url = await getDownloadURL(ref);
                const titre = fichier.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 120) || 'Piste';
                const piste: PisteEspace = { id, titre, url, storagePath: chemin };
                if (duree) piste.duree = duree;
                enregistrer([...listeRef.current, piste]);
            } catch {
                setRefus(t(`${fichier.name} could not be sent.`, `${fichier.name} n’a pas pu partir.`));
            } finally {
                setEnvoi(null);
            }
        }
    };

    const retirer = async (p: PisteEspace) => {
        try { await deleteObject(storageRef(getStorage(getApp()), p.storagePath)); } catch { /* déjà parti */ }
        enregistrer(listeRef.current.filter((x) => x.id !== p.id));
    };

    const bouger = (p: PisteEspace, sens: -1 | 1) => {
        const ids = deplacer(liste.map((x) => x.id), p.id, sens);
        enregistrer(ids.map((id) => liste.find((x) => x.id === id)!));
    };

    return (
        <div className={BLOC}>
            <div className="flex items-center justify-between gap-4">
                <h4 className={TITRE_BLOC}>{t('Tracks', 'Pistes')}</h4>
                <div className="flex items-center gap-3">
                    <EtatEcriture etat={etat} language={language} />
                    <label className={`${BOUTON_SECONDAIRE} inline-flex items-center cursor-pointer ${liste.length >= MAX_PISTES || envoi ? 'opacity-40 pointer-events-none' : ''}`}>
                        {envoi ? t('Sending…', 'Envoi…') : t('Add', 'Ajouter')}
                        <input type="file" multiple accept=".mp3,.m4a,.wav,.ogg,.flac,audio/*" className="sr-only" onChange={(e) => { void deposer(e.target.files); e.target.value = ''; }} />
                    </label>
                </div>
            </div>
            <p className={`${AIDE} -mt-2`}>
                {t(
                    'Your own recordings, played on your page with the sticky player. mp3, m4a, wav, ogg or flac, 30 MB each, twelve at most.',
                    'Vos propres enregistrements, joués sur votre page avec le lecteur collant. mp3, m4a, wav, ogg ou flac, 30 Mo chacun, douze au plus.',
                )}
            </p>
            {refus && <p className="text-rose-300 text-[13px] font-lato" role="alert">{refus}</p>}
            <ol className="space-y-2">
                {liste.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-2">
                        <span className="font-cinzel text-[13px] text-neutral-500 w-6 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                        <input
                            className={CHAMP}
                            value={p.titre}
                            aria-label={t('Track title', 'Titre de la piste')}
                            onChange={(e) => setListe((l) => l.map((x) => (x.id === p.id ? { ...x, titre: e.target.value } : x)))}
                            onBlur={() => enregistrer(listeRef.current)}
                        />
                        <span className="font-lato text-[13px] text-neutral-400 tabular-nums w-12 text-right">{formatDuree(p.duree)}</span>
                        <BoutonFleche sens="haut" disabled={i === 0} onClick={() => bouger(p, -1)} label={t('Move up', 'Monter')} />
                        <BoutonFleche sens="bas" disabled={i === liste.length - 1} onClick={() => bouger(p, 1)} label={t('Move down', 'Descendre')} />
                        <IconRetirer onClick={() => void retirer(p)} label={t('Remove', 'Retirer')} />
                    </li>
                ))}
            </ol>
        </div>
    );
};
