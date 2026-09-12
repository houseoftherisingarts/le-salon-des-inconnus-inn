import React, { useRef, useState } from 'react';
import { getApp } from 'firebase/app';
import { getAuth, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { televerserImage } from './images';
import { majMembre, BIO_MAX, DISCIPLINE_MAX, VILLE_MAX, type MembreDoc } from './membres';

const CHAMP = 'w-full bg-black/30 border border-white/15 rounded-[15px] px-4 py-3 text-neutral-100 font-lato text-sm placeholder:text-neutral-600 outline-none focus:border-[#c5a059]/60 transition-colors';

interface MonProfilFormProps {
    uid: string;
    membre: MembreDoc | null;
    language: 'EN' | 'FR';
}

/** L'avatar écrit aussi photoURL sur le compte Auth et sur
 *  artistProfile/profile.avatarUrl, pour que le reste du studio (qui lit
 *  ce second champ) suive sans devoir se réabonner à members/{uid}. */
async function propagerAvatar(uid: string, url: string) {
    try { await updateProfile(getAuth(getApp()).currentUser!, { photoURL: url }); } catch { /* non fatal */ }
    try {
        await setDoc(
            doc(getFirestore(getApp()), 'members', uid, 'artistProfile', 'profile'),
            { avatarUrl: url, updatedAt: serverTimestamp() },
            { merge: true },
        );
    } catch { /* non fatal */ }
}

export const MonProfilForm: React.FC<MonProfilFormProps> = ({ uid, membre, language }) => {
    const t = (en: string, fr: string) => (language === 'EN' ? en : fr);

    const [nom, setNom] = useState(membre?.displayName ?? '');
    const [bio, setBio] = useState(membre?.bio ?? '');
    const [discipline, setDiscipline] = useState(membre?.discipline ?? '');
    const [ville, setVille] = useState(membre?.ville ?? '');
    const [site, setSite] = useState(membre?.liens?.site ?? '');
    const [instagram, setInstagram] = useState(membre?.liens?.instagram ?? '');
    const [facebook, setFacebook] = useState(membre?.liens?.facebook ?? '');
    const [autre, setAutre] = useState(membre?.liens?.autre ?? '');

    const [avatarApercu, setAvatarApercu] = useState('');
    const [banniereApercu, setBanniereApercu] = useState('');
    const [televersement, setTeleversement] = useState<'avatar' | 'banniere' | null>(null);
    const [enregistrement, setEnregistrement] = useState(false);
    const [statut, setStatut] = useState<'idle' | 'ok' | 'erreur'>('idle');
    const [erreur, setErreur] = useState('');
    const avatarInput = useRef<HTMLInputElement>(null);
    const banniereInput = useRef<HTMLInputElement>(null);

    const choisirImage = async (file: File, sorte: 'avatar' | 'banniere') => {
        setTeleversement(sorte);
        setErreur('');
        const apercu = URL.createObjectURL(file);
        if (sorte === 'avatar') setAvatarApercu(apercu); else setBanniereApercu(apercu);
        try {
            const url = await televerserImage(file, uid, sorte);
            if (sorte === 'avatar') {
                await majMembre(uid, { photoURL: url });
                await propagerAvatar(uid, url);
            } else {
                await majMembre(uid, { banniereURL: url });
            }
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
        } finally { setTeleversement(null); }
    };

    const enregistrer = async () => {
        setEnregistrement(true);
        setStatut('idle');
        setErreur('');
        try {
            await majMembre(uid, {
                displayName: nom, bio, discipline, ville,
                liens: { site, instagram, facebook, autre },
            });
            setStatut('ok');
            setTimeout(() => setStatut('idle'), 3000);
        } catch (e) {
            setErreur(e instanceof Error ? e.message : String(e));
            setStatut('erreur');
        } finally { setEnregistrement(false); }
    };

    return (
        <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 md:p-6 space-y-6 mb-8">
            <div>
                <p className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-500 mb-3">
                    {t('Photo and banner', 'Photo et bannière')}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        type="button"
                        onClick={() => avatarInput.current?.click()}
                        className="relative w-20 h-20 rounded-full overflow-hidden border border-[#c5a059]/40 bg-black/30 shrink-0"
                    >
                        {(avatarApercu || membre?.photoURL) ? (
                            <img src={avatarApercu || membre?.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="w-full h-full flex items-center justify-center text-neutral-600 text-[13px] font-lato">{t('Photo', 'Photo')}</span>
                        )}
                        {televersement === 'avatar' && <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-[13px] text-neutral-200">…</span>}
                    </button>
                    <button
                        type="button"
                        onClick={() => banniereInput.current?.click()}
                        className="relative flex-1 min-w-[180px] h-20 rounded-[15px] overflow-hidden border border-white/15 bg-black/30"
                    >
                        {(banniereApercu || membre?.banniereURL) ? (
                            <img src={banniereApercu || membre?.banniereURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="w-full h-full flex items-center justify-center text-neutral-600 text-[13px] font-lato">{t('Banner', 'Bannière')}</span>
                        )}
                        {televersement === 'banniere' && <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-[13px] text-neutral-200">…</span>}
                    </button>
                    <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void choisirImage(f, 'avatar'); }} />
                    <input ref={banniereInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void choisirImage(f, 'banniere'); }} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t('Full name', 'Nom complet')} className={CHAMP} />
                <input value={discipline} onChange={(e) => setDiscipline(e.target.value.slice(0, DISCIPLINE_MAX))} placeholder={t('Discipline (painting, music…)', 'Discipline (peinture, musique…)')} className={CHAMP} />
                <input value={ville} onChange={(e) => setVille(e.target.value.slice(0, VILLE_MAX))} placeholder={t('City', 'Ville')} className={CHAMP} />
            </div>

            <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                rows={3}
                placeholder={t('A short bio…', 'Une courte présentation…')}
                className={`${CHAMP} resize-none`}
            />
            <p className="text-[13px] text-neutral-600 font-lato -mt-4">{bio.length}/{BIO_MAX}</p>

            <div>
                <p className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-500 mb-3">{t('Links (https only)', 'Liens (https seulement)')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://votresite.com" className={CHAMP} />
                    <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/…" className={CHAMP} />
                    <input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/…" className={CHAMP} />
                    <input value={autre} onChange={(e) => setAutre(e.target.value)} placeholder={t('Another link', 'Un autre lien')} className={CHAMP} />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={enregistrer}
                    disabled={enregistrement}
                    className="px-5 py-2.5 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-[13px] uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-all disabled:opacity-50"
                >
                    {enregistrement ? t('Saving…', 'Sauvegarde…') : t('Save', 'Sauvegarder')}
                </button>
                {statut === 'ok' && <span className="text-[13px] font-cinzel uppercase tracking-widest text-emerald-400">✓ {t('Saved', 'Sauvegardé')}</span>}
                {erreur && <span className="text-[13px] text-rose-400 font-lato">{erreur}</span>}
            </div>
        </div>
    );
};
