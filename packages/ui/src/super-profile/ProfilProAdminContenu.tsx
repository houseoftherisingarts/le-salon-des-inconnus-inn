// ProfilProAdminContenu : l'onglet « Œuvres et contenu ». Ce qui s'y édite
// dépend du type d'artiste : un peintre gère ses œuvres, ses expositions et
// son atelier ; un musicien, son écoute, ses dates et sa presse ; un
// écrivain, ses livres. Chaque bloc porte son propre brouillon et son
// propre bouton d'enregistrement pour rester lisible malgré le nombre de
// champs.

import * as React from 'react';
import { getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { familleGabarit } from './artistes';
import {
    couvertureLivreStoragePath, oeuvreStoragePath,
    MAX_DATES, MAX_EXPOSITIONS, MAX_LIENS_ECOUTE, MAX_LIVRES, MAX_OEUVRES,
} from './types';
import type {
    AtelierProfilPro, CitationPresse, DateSpectacle, ExpositionProfilPro,
    LienEcoute, LivreProfilPro, OeuvreProfilPro, SuperProfileConfig,
} from './types';

interface ProfilProAdminContenuProps {
    uid: string;
    config: SuperProfileConfig;
    language?: 'EN' | 'FR';
}

const CHAMP = 'w-full bg-black/40 border border-white/15 rounded-[10px] px-3 py-2.5 text-sm text-[#f3e5ab] placeholder-neutral-500 outline-none transition-colors focus:border-[#c5a059] font-lato';
const BLOC = 'bg-black/30 border border-white/10 rounded-[15px] p-5 md:p-6 space-y-4';

function newId(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const BoutonEnregistrer: React.FC<{ onClick: () => void; enCours: boolean; enregistre: boolean; language: 'EN' | 'FR' }> = ({ onClick, enCours, enregistre, language }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    return (
        <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClick} disabled={enCours} className="min-h-[40px] px-5 bg-[#c5a059] text-[#050505] font-cinzel text-[10px] uppercase tracking-[0.25em] hover:bg-[#d4b06a] disabled:opacity-40 transition-colors rounded-[10px]">
                {enCours ? t('Saving…', 'Enregistrement…') : t('Save', 'Enregistrer')}
            </button>
            {enregistre && <span className="text-[#c5a059] text-xs font-lato">{t('Saved', 'Enregistré')}</span>}
        </div>
    );
};

const IconRetirer: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
    <button type="button" onClick={onClick} aria-label={label} className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full text-neutral-500 hover:text-rose-300 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
);

async function sauverConfig(uid: string, patch: Record<string, unknown>): Promise<void> {
    const db = getFirestore(getApp());
    await setDoc(doc(db, 'members', uid, 'superProfile', 'config'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

// ── Œuvres ───────────────────────────────────────────────────────────────

const BlocOeuvres: React.FC<{ uid: string; valeur: OeuvreProfilPro[]; language: 'EN' | 'FR' }> = ({ uid, valeur, language }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [liste, setListe] = React.useState(valeur);
    const [enCours, setEnCours] = React.useState(false);
    const [enregistre, setEnregistre] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const televerser = async (file: File) => {
        const id = newId();
        const storage = getStorage(getApp());
        const chemin = oeuvreStoragePath(uid, id, 'jpg');
        const ref = storageRef(storage, chemin);
        await uploadBytes(ref, file, { contentType: file.type || 'image/jpeg' });
        const url = await getDownloadURL(ref);
        setListe((l) => [...l, { url, storagePath: chemin, statutVente: 'a-vendre' }].slice(0, MAX_OEUVRES));
    };

    const maj = (i: number, patch: Partial<OeuvreProfilPro>) => setListe((l) => l.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
    const retirer = async (i: number) => {
        const o = liste[i];
        setListe((l) => l.filter((_, idx) => idx !== i));
        try { await deleteObject(storageRef(getStorage(getApp()), o.storagePath)); } catch { /* déjà partie */ }
    };
    const enregistrer = async () => { setEnCours(true); try { await sauverConfig(uid, { oeuvres: liste }); setEnregistre(true); window.setTimeout(() => setEnregistre(false), 2000); } finally { setEnCours(false); } };

    return (
        <div className={BLOC}>
            <div className="flex items-center justify-between">
                <h4 className="font-prata text-[#f3e5ab] text-lg">{t('Works', 'Œuvres')}</h4>
                <button type="button" onClick={() => inputRef.current?.click()} className="px-4 py-2 border border-white/15 text-neutral-200 hover:border-[#c5a059] font-cinzel text-[10px] uppercase tracking-[0.25em] transition-colors rounded-[10px]">
                    {t('Add', 'Ajouter')}
                </button>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void televerser(f); e.target.value = ''; }} />
            </div>
            <div className="space-y-3">
                {liste.map((o, i) => (
                    <div key={`${o.storagePath}-${i}`} className="flex gap-3 items-start">
                        <img src={o.url} alt="" className="w-20 h-20 object-cover rounded-[8px] border border-white/10 shrink-0" />
                        <div className="flex-1 grid grid-cols-2 gap-2">
                            <input className={CHAMP} placeholder={t('Title', 'Titre')} value={o.titre ?? ''} onChange={(e) => maj(i, { titre: e.target.value })} />
                            <input className={CHAMP} placeholder={t('Technique', 'Technique')} value={o.technique ?? ''} onChange={(e) => maj(i, { technique: e.target.value })} />
                            <input className={CHAMP} placeholder={t('Dimensions', 'Dimensions')} value={o.dimensions ?? ''} onChange={(e) => maj(i, { dimensions: e.target.value })} />
                            <input className={CHAMP} placeholder={t('Year', 'Année')} value={o.annee ?? ''} onChange={(e) => maj(i, { annee: e.target.value })} />
                            <select className={CHAMP} value={o.statutVente ?? 'a-vendre'} onChange={(e) => maj(i, { statutVente: e.target.value as OeuvreProfilPro['statutVente'] })}>
                                <option value="a-vendre">{t('For sale', 'À vendre')}</option>
                                <option value="vendu">{t('Sold', 'Vendu')}</option>
                                <option value="sur-demande">{t('On request', 'Sur demande')}</option>
                            </select>
                            {o.statutVente === 'a-vendre' && (
                                <input
                                    type="number" min={0} className={CHAMP} placeholder={t('Price ($)', 'Prix ($)')}
                                    value={o.prixCents ? o.prixCents / 100 : ''}
                                    onChange={(e) => maj(i, { prixCents: Math.round(Number(e.target.value) * 100) })}
                                />
                            )}
                        </div>
                        <IconRetirer onClick={() => retirer(i)} label={t('Remove', 'Retirer')} />
                    </div>
                ))}
            </div>
            <BoutonEnregistrer onClick={enregistrer} enCours={enCours} enregistre={enregistre} language={language} />
        </div>
    );
};

// ── Écoute ───────────────────────────────────────────────────────────────

const BlocEcoute: React.FC<{ uid: string; valeur: LienEcoute[]; language: 'EN' | 'FR' }> = ({ uid, valeur, language }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [liste, setListe] = React.useState(valeur);
    const [enCours, setEnCours] = React.useState(false);
    const [enregistre, setEnregistre] = React.useState(false);
    const maj = (i: number, patch: Partial<LienEcoute>) => setListe((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    const enregistrer = async () => { setEnCours(true); try { await sauverConfig(uid, { ecoute: liste }); setEnregistre(true); window.setTimeout(() => setEnregistre(false), 2000); } finally { setEnCours(false); } };
    return (
        <div className={BLOC}>
            <div className="flex items-center justify-between">
                <h4 className="font-prata text-[#f3e5ab] text-lg">{t('Listen', 'Écoute')}</h4>
                <button type="button" onClick={() => setListe((l) => l.length < MAX_LIENS_ECOUTE ? [...l, { url: '', titre: '' }] : l)} className="px-4 py-2 border border-white/15 text-neutral-200 hover:border-[#c5a059] font-cinzel text-[10px] uppercase tracking-[0.25em] transition-colors rounded-[10px]">
                    {t('Add', 'Ajouter')}
                </button>
            </div>
            <p className="font-lato text-xs text-neutral-500 -mt-2">{t('Paste a Spotify, YouTube, Bandcamp or SoundCloud link.', 'Collez un lien Spotify, YouTube, Bandcamp ou SoundCloud.')}</p>
            <div className="space-y-2">
                {liste.map((l, i) => (
                    <div key={i} className="flex gap-2 items-center">
                        <input className={CHAMP} placeholder={t('Title (optional)', 'Titre (facultatif)')} value={l.titre ?? ''} onChange={(e) => maj(i, { titre: e.target.value })} />
                        <input className={CHAMP} placeholder="https://…" value={l.url} onChange={(e) => maj(i, { url: e.target.value })} />
                        <IconRetirer onClick={() => setListe((ll) => ll.filter((_, idx) => idx !== i))} label={t('Remove', 'Retirer')} />
                    </div>
                ))}
            </div>
            <BoutonEnregistrer onClick={enregistrer} enCours={enCours} enregistre={enregistre} language={language} />
        </div>
    );
};

// ── Dates ────────────────────────────────────────────────────────────────

const BlocDates: React.FC<{ uid: string; valeur: DateSpectacle[]; language: 'EN' | 'FR' }> = ({ uid, valeur, language }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [liste, setListe] = React.useState(valeur);
    const [enCours, setEnCours] = React.useState(false);
    const [enregistre, setEnregistre] = React.useState(false);
    const maj = (i: number, patch: Partial<DateSpectacle>) => setListe((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    const enregistrer = async () => { setEnCours(true); try { await sauverConfig(uid, { dates: liste }); setEnregistre(true); window.setTimeout(() => setEnregistre(false), 2000); } finally { setEnCours(false); } };
    return (
        <div className={BLOC}>
            <div className="flex items-center justify-between">
                <h4 className="font-prata text-[#f3e5ab] text-lg">{t('Upcoming dates', 'Dates à venir')}</h4>
                <button type="button" onClick={() => setListe((l) => l.length < MAX_DATES ? [...l, { lieu: '', ville: '', date: '' }] : l)} className="px-4 py-2 border border-white/15 text-neutral-200 hover:border-[#c5a059] font-cinzel text-[10px] uppercase tracking-[0.25em] transition-colors rounded-[10px]">
                    {t('Add', 'Ajouter')}
                </button>
            </div>
            <div className="space-y-2">
                {liste.map((d, i) => (
                    <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 items-center">
                        <input className={CHAMP} placeholder={t('Venue', 'Lieu')} value={d.lieu} onChange={(e) => maj(i, { lieu: e.target.value })} />
                        <input className={CHAMP} placeholder={t('City', 'Ville')} value={d.ville} onChange={(e) => maj(i, { ville: e.target.value })} />
                        <input type="date" className={CHAMP} value={d.date} onChange={(e) => maj(i, { date: e.target.value })} />
                        <div className="flex gap-2 items-center">
                            <input className={CHAMP} placeholder={t('Tickets link', 'Lien billets')} value={d.lienBillets ?? ''} onChange={(e) => maj(i, { lienBillets: e.target.value })} />
                            <IconRetirer onClick={() => setListe((ll) => ll.filter((_, idx) => idx !== i))} label={t('Remove', 'Retirer')} />
                        </div>
                    </div>
                ))}
            </div>
            <BoutonEnregistrer onClick={enregistrer} enCours={enCours} enregistre={enregistre} language={language} />
        </div>
    );
};

// ── Presse ───────────────────────────────────────────────────────────────

const BlocPresse: React.FC<{ uid: string; valeur: CitationPresse[]; lienEPK?: string; language: 'EN' | 'FR' }> = ({ uid, valeur, lienEPK, language }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [liste, setListe] = React.useState(valeur);
    const [epk, setEpk] = React.useState(lienEPK ?? '');
    const [enCours, setEnCours] = React.useState(false);
    const [enregistre, setEnregistre] = React.useState(false);
    const maj = (i: number, patch: Partial<CitationPresse>) => setListe((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    const enregistrer = async () => { setEnCours(true); try { await sauverConfig(uid, { presse: liste, lienEPK: epk }); setEnregistre(true); window.setTimeout(() => setEnregistre(false), 2000); } finally { setEnCours(false); } };
    return (
        <div className={BLOC}>
            <div className="flex items-center justify-between">
                <h4 className="font-prata text-[#f3e5ab] text-lg">{t('Press', 'Presse')}</h4>
                <button type="button" onClick={() => setListe((l) => [...l, { citation: '' }])} className="px-4 py-2 border border-white/15 text-neutral-200 hover:border-[#c5a059] font-cinzel text-[10px] uppercase tracking-[0.25em] transition-colors rounded-[10px]">
                    {t('Add', 'Ajouter')}
                </button>
            </div>
            <label className="block">
                <span className="font-cinzel text-[9px] uppercase tracking-[0.25em] text-neutral-500 mb-1.5 block">{t('Press kit link', 'Lien du dossier de presse')}</span>
                <input className={CHAMP} placeholder="https://…" value={epk} onChange={(e) => setEpk(e.target.value)} />
            </label>
            <div className="space-y-2">
                {liste.map((c, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                        <textarea className={`${CHAMP} md:col-span-1`} placeholder={t('Quote', 'Citation')} value={c.citation} onChange={(e) => maj(i, { citation: e.target.value })} />
                        <input className={CHAMP} placeholder={t('Source', 'Source')} value={c.source ?? ''} onChange={(e) => maj(i, { source: e.target.value })} />
                        <div className="flex gap-2">
                            <input className={CHAMP} placeholder={t('Article link', 'Lien de l’article')} value={c.lienArticle ?? ''} onChange={(e) => maj(i, { lienArticle: e.target.value })} />
                            <IconRetirer onClick={() => setListe((ll) => ll.filter((_, idx) => idx !== i))} label={t('Remove', 'Retirer')} />
                        </div>
                    </div>
                ))}
            </div>
            <BoutonEnregistrer onClick={enregistrer} enCours={enCours} enregistre={enregistre} language={language} />
        </div>
    );
};

// ── Expositions ──────────────────────────────────────────────────────────

const BlocExpositions: React.FC<{ uid: string; valeur: ExpositionProfilPro[]; language: 'EN' | 'FR' }> = ({ uid, valeur, language }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [liste, setListe] = React.useState(valeur);
    const [enCours, setEnCours] = React.useState(false);
    const [enregistre, setEnregistre] = React.useState(false);
    const maj = (i: number, patch: Partial<ExpositionProfilPro>) => setListe((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    const enregistrer = async () => { setEnCours(true); try { await sauverConfig(uid, { expositions: liste }); setEnregistre(true); window.setTimeout(() => setEnregistre(false), 2000); } finally { setEnCours(false); } };
    return (
        <div className={BLOC}>
            <div className="flex items-center justify-between">
                <h4 className="font-prata text-[#f3e5ab] text-lg">{t('Exhibitions', 'Expositions')}</h4>
                <button type="button" onClick={() => setListe((l) => l.length < MAX_EXPOSITIONS ? [...l, { titre: '', lieu: '', dates: '', aVenir: true }] : l)} className="px-4 py-2 border border-white/15 text-neutral-200 hover:border-[#c5a059] font-cinzel text-[10px] uppercase tracking-[0.25em] transition-colors rounded-[10px]">
                    {t('Add', 'Ajouter')}
                </button>
            </div>
            <div className="space-y-2">
                {liste.map((e, i) => (
                    <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-center">
                        <input className={CHAMP} placeholder={t('Title', 'Titre')} value={e.titre} onChange={(ev) => maj(i, { titre: ev.target.value })} />
                        <input className={CHAMP} placeholder={t('Venue', 'Lieu')} value={e.lieu} onChange={(ev) => maj(i, { lieu: ev.target.value })} />
                        <input className={CHAMP} placeholder={t('Dates (free text)', 'Dates (texte libre)')} value={e.dates} onChange={(ev) => maj(i, { dates: ev.target.value })} />
                        <label className="flex items-center gap-2 font-lato text-sm text-neutral-300">
                            <input type="checkbox" checked={e.aVenir} onChange={(ev) => maj(i, { aVenir: ev.target.checked })} /> {t('Upcoming', 'À venir')}
                        </label>
                        <IconRetirer onClick={() => setListe((ll) => ll.filter((_, idx) => idx !== i))} label={t('Remove', 'Retirer')} />
                    </div>
                ))}
            </div>
            <BoutonEnregistrer onClick={enregistrer} enCours={enCours} enregistre={enregistre} language={language} />
        </div>
    );
};

// ── Livres ───────────────────────────────────────────────────────────────

const BlocLivres: React.FC<{ uid: string; valeur: LivreProfilPro[]; language: 'EN' | 'FR' }> = ({ uid, valeur, language }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [liste, setListe] = React.useState(valeur);
    const [enCours, setEnCours] = React.useState(false);
    const [enregistre, setEnregistre] = React.useState(false);
    const inputRefs = React.useRef<Record<number, HTMLInputElement | null>>({});

    const televerserCouverture = async (i: number, file: File) => {
        const id = newId();
        const storage = getStorage(getApp());
        const chemin = couvertureLivreStoragePath(uid, id, 'jpg');
        const ref = storageRef(storage, chemin);
        await uploadBytes(ref, file, { contentType: file.type || 'image/jpeg' });
        const url = await getDownloadURL(ref);
        setListe((l) => l.map((x, idx) => (idx === i ? { ...x, couvertureUrl: url, couverturePath: chemin } : x)));
    };
    const maj = (i: number, patch: Partial<LivreProfilPro>) => setListe((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    const enregistrer = async () => { setEnCours(true); try { await sauverConfig(uid, { livres: liste }); setEnregistre(true); window.setTimeout(() => setEnregistre(false), 2000); } finally { setEnCours(false); } };

    return (
        <div className={BLOC}>
            <div className="flex items-center justify-between">
                <h4 className="font-prata text-[#f3e5ab] text-lg">{t('Books', 'Livres')}</h4>
                <button type="button" onClick={() => setListe((l) => l.length < MAX_LIVRES ? [...l, { titre: '' }] : l)} className="px-4 py-2 border border-white/15 text-neutral-200 hover:border-[#c5a059] font-cinzel text-[10px] uppercase tracking-[0.25em] transition-colors rounded-[10px]">
                    {t('Add', 'Ajouter')}
                </button>
            </div>
            <div className="space-y-3">
                {liste.map((l, i) => (
                    <div key={i} className="flex gap-3 items-center">
                        <button type="button" onClick={() => inputRefs.current[i]?.click()} className="w-16 h-20 shrink-0 rounded-[8px] border border-white/15 overflow-hidden bg-black/40 flex items-center justify-center">
                            {l.couvertureUrl ? <img src={l.couvertureUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-neutral-600 text-[9px]">{t('Cover', 'Couverture')}</span>}
                        </button>
                        <input ref={(el) => { inputRefs.current[i] = el; }} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void televerserCouverture(i, f); e.target.value = ''; }} />
                        <div className="flex-1 grid grid-cols-2 gap-2">
                            <input className={CHAMP} placeholder={t('Title', 'Titre')} value={l.titre} onChange={(e) => maj(i, { titre: e.target.value })} />
                            <input className={CHAMP} placeholder={t('Buy link', 'Lien d’achat')} value={l.lienAchat ?? ''} onChange={(e) => maj(i, { lienAchat: e.target.value })} />
                        </div>
                        <IconRetirer onClick={() => setListe((ll) => ll.filter((_, idx) => idx !== i))} label={t('Remove', 'Retirer')} />
                    </div>
                ))}
            </div>
            <BoutonEnregistrer onClick={enregistrer} enCours={enCours} enregistre={enregistre} language={language} />
        </div>
    );
};

// ── Atelier ──────────────────────────────────────────────────────────────

const BlocAtelier: React.FC<{ uid: string; valeur?: AtelierProfilPro; language: 'EN' | 'FR' }> = ({ uid, valeur, language }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [ville, setVille] = React.useState(valeur?.ville ?? '');
    const [note, setNote] = React.useState(valeur?.note ?? '');
    const [visites, setVisites] = React.useState(valeur?.visitesSurRendezVous ?? false);
    const [enCours, setEnCours] = React.useState(false);
    const [enregistre, setEnregistre] = React.useState(false);
    const enregistrer = async () => { setEnCours(true); try { await sauverConfig(uid, { atelier: { ville, note, visitesSurRendezVous: visites } }); setEnregistre(true); window.setTimeout(() => setEnregistre(false), 2000); } finally { setEnCours(false); } };
    return (
        <div className={BLOC}>
            <h4 className="font-prata text-[#f3e5ab] text-lg">{t('Studio', 'Atelier')}</h4>
            <div className="grid gap-2 sm:grid-cols-2">
                <input className={CHAMP} placeholder={t('City', 'Ville')} value={ville} onChange={(e) => setVille(e.target.value)} />
                <label className="flex items-center gap-2 font-lato text-sm text-neutral-300">
                    <input type="checkbox" checked={visites} onChange={(e) => setVisites(e.target.checked)} /> {t('Open by appointment', 'Ouvert sur rendez-vous')}
                </label>
            </div>
            <textarea className={`${CHAMP} min-h-[5rem]`} placeholder={t('A note about visiting', 'Une note sur les visites')} value={note} onChange={(e) => setNote(e.target.value)} />
            <BoutonEnregistrer onClick={enregistrer} enCours={enCours} enregistre={enregistre} language={language} />
        </div>
    );
};

// ── Assemblage ───────────────────────────────────────────────────────────

export const ProfilProAdminContenu: React.FC<ProfilProAdminContenuProps> = ({ uid, config, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const famille = familleGabarit(config.type ?? 'autre');
    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h3 className="font-prata text-[#f3e5ab] text-2xl mb-2">{t('Works and content', 'Œuvres et contenu')}</h3>
                <p className="font-lato text-neutral-400 text-sm">
                    {t('What you add here appears on your public page as soon as you save it.', 'Ce que vous ajoutez ici apparaît sur votre page publique dès que vous l’enregistrez.')}
                </p>
            </div>
            {(famille === 'peintre' || famille === 'photographe' || famille === 'ecrivain') && (
                <BlocOeuvres uid={uid} valeur={config.oeuvres ?? []} language={language} />
            )}
            {famille === 'peintre' && <BlocExpositions uid={uid} valeur={config.expositions ?? []} language={language} />}
            {famille === 'peintre' && <BlocAtelier uid={uid} valeur={config.atelier} language={language} />}
            {famille === 'musicien' && <BlocEcoute uid={uid} valeur={config.ecoute ?? []} language={language} />}
            {famille === 'musicien' && <BlocDates uid={uid} valeur={config.dates ?? []} language={language} />}
            {famille === 'musicien' && <BlocPresse uid={uid} valeur={config.presse ?? []} lienEPK={config.lienEPK} language={language} />}
            {famille === 'ecrivain' && <BlocLivres uid={uid} valeur={config.livres ?? []} language={language} />}
        </div>
    );
};
