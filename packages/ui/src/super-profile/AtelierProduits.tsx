// AtelierProduits : la boutique de l'espace, éditée sur place. Ajouter un
// produit l'écrit tout de suite; chaque champ s'écrit à la sortie; la photo
// est réduite en webp dans le navigateur avant d'aller dans Storage. Le lien
// d'achat doit pointer vers Stripe, Square ou Zeffy : tout autre lien reste
// dans le champ, signalé, sans jamais être enregistré.

import * as React from 'react';
import { getApp } from 'firebase/app';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { lienPaiementValide, MAX_PRODUITS, produitStoragePath, type ProduitEspace } from './types';
import { versWebp } from './versWebp';
import { AIDE, BLOC, BOUTON_SECONDAIRE, CHAMP, EtatEcriture, IconRetirer, TITRE_BLOC, newId, useEcritureImmediate } from './atelierCommun';

interface Props {
    uid: string;
    valeur: ProduitEspace[];
    language?: 'EN' | 'FR';
}

function nettoyer(p: ProduitEspace): ProduitEspace {
    const propre: ProduitEspace = { id: p.id, nom: (p.nom ?? '').trim().slice(0, 120), vendu: !!p.vendu };
    const description = p.description?.trim().slice(0, 600);
    if (description) propre.description = description;
    if (typeof p.prix === 'number' && Number.isFinite(p.prix) && p.prix >= 0) propre.prix = Math.min(p.prix, 100000);
    if (p.photo) propre.photo = p.photo;
    if (p.lien && lienPaiementValide(p.lien.trim())) propre.lien = p.lien.trim();
    return propre;
}

export const AtelierProduits: React.FC<Props> = ({ uid, valeur, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const { etat, ecrire } = useEcritureImmediate(uid);
    const [liste, setListe] = React.useState<ProduitEspace[]>(valeur);
    const [envoi, setEnvoi] = React.useState<string | null>(null);
    const listeRef = React.useRef(liste);
    listeRef.current = liste;

    React.useEffect(() => { setListe(valeur); }, [valeur]);

    const enregistrer = (suivante: ProduitEspace[]) => {
        setListe(suivante);
        void ecrire({ produits: suivante.map(nettoyer) });
    };
    const maj = (id: string, patch: Partial<ProduitEspace>) =>
        setListe((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const sortie = () => enregistrer(listeRef.current);

    const ajouter = () => {
        if (liste.length >= MAX_PRODUITS) return;
        enregistrer([...liste, { id: newId(), nom: t('New product', 'Nouveau produit') }]);
    };

    const retirer = async (p: ProduitEspace) => {
        if (p.photo?.storagePath) {
            try { await deleteObject(storageRef(getStorage(getApp()), p.photo.storagePath)); } catch { /* déjà parti */ }
        }
        enregistrer(listeRef.current.filter((x) => x.id !== p.id));
    };

    const deposerPhoto = async (p: ProduitEspace, fichier?: File) => {
        if (!fichier || !fichier.type.startsWith('image/')) return;
        setEnvoi(p.id);
        try {
            const blob = await versWebp(fichier, 1400);
            const chemin = produitStoragePath(uid, p.id);
            const ref = storageRef(getStorage(getApp()), chemin);
            await uploadBytes(ref, blob, { contentType: blob.type, cacheControl: 'public, max-age=31536000' });
            const url = await getDownloadURL(ref);
            enregistrer(listeRef.current.map((x) => (x.id === p.id ? { ...x, photo: { url, storagePath: chemin } } : x)));
        } finally {
            setEnvoi(null);
        }
    };

    return (
        <div className={BLOC}>
            <div className="flex items-center justify-between gap-4">
                <h4 className={TITRE_BLOC}>{t('Shop', 'Boutique')}</h4>
                <div className="flex items-center gap-3">
                    <EtatEcriture etat={etat} language={language} />
                    <button type="button" onClick={ajouter} disabled={liste.length >= MAX_PRODUITS} className={BOUTON_SECONDAIRE}>
                        {t('Add', 'Ajouter')}
                    </button>
                </div>
            </div>
            <p className={`${AIDE} -mt-2`}>
                {t(
                    'Each product opens the payment link you created at Stripe, Square or Zeffy. Up to 30 products.',
                    'Chaque produit ouvre le lien de paiement que vous avez créé chez Stripe, Square ou Zeffy. Jusqu’à 30 produits.',
                )}
            </p>
            <div className="space-y-3">
                {liste.map((p) => {
                    const lienFautif = !!p.lien && !lienPaiementValide(p.lien.trim());
                    return (
                        <div key={p.id} className="grid grid-cols-[88px_1fr_auto] gap-3 items-start p-3 rounded-[12px] border border-white/10">
                            <label className="relative w-[88px] h-[88px] rounded-[10px] overflow-hidden border border-white/15 bg-black/40 cursor-pointer flex items-center justify-center text-neutral-400 hover:border-[#c5a059]">
                                {p.photo?.url
                                    ? <img src={p.photo.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                    : <span className="font-lato text-[13px] text-center px-1">{envoi === p.id ? t('Sending…', 'Envoi…') : t('Photo', 'Photo')}</span>}
                                <input type="file" accept="image/*" className="sr-only" onChange={(e) => void deposerPhoto(p, e.target.files?.[0])} />
                            </label>
                            <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
                                <input className={CHAMP} value={p.nom} placeholder={t('Name', 'Nom')} onChange={(e) => maj(p.id, { nom: e.target.value })} onBlur={sortie} />
                                <input
                                    className={CHAMP}
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    inputMode="decimal"
                                    value={p.prix ?? ''}
                                    placeholder={t('Price $', 'Prix $')}
                                    onChange={(e) => maj(p.id, { prix: e.target.value === '' ? undefined : Number(e.target.value) })}
                                    onBlur={sortie}
                                />
                                <textarea
                                    className={`${CHAMP} sm:col-span-2 min-h-[4.5rem] resize-y`}
                                    value={p.description ?? ''}
                                    placeholder={t('Short description', 'Courte description')}
                                    onChange={(e) => maj(p.id, { description: e.target.value })}
                                    onBlur={sortie}
                                />
                                <input
                                    className={`${CHAMP} sm:col-span-2 ${lienFautif ? 'border-rose-300/70' : ''}`}
                                    value={p.lien ?? ''}
                                    placeholder="https://buy.stripe.com/…"
                                    aria-invalid={lienFautif}
                                    onChange={(e) => maj(p.id, { lien: e.target.value })}
                                    onBlur={sortie}
                                />
                                {lienFautif && (
                                    <p className="sm:col-span-2 text-rose-300 text-[13px] font-lato">
                                        {t('Only Stripe, Square or Zeffy links, starting with https.', 'Seulement un lien Stripe, Square ou Zeffy, qui commence par https.')}
                                    </p>
                                )}
                                <label className="sm:col-span-2 inline-flex items-center gap-2 font-lato text-sm text-neutral-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!!p.vendu}
                                        onChange={(e) => enregistrer(listeRef.current.map((x) => (x.id === p.id ? { ...x, vendu: e.target.checked } : x)))}
                                        className="w-4 h-4 accent-[#c5a059]"
                                    />
                                    {t('Sold', 'Vendu')}
                                </label>
                            </div>
                            <IconRetirer onClick={() => void retirer(p)} label={t('Remove', 'Retirer')} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
