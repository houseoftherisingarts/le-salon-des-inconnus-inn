import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { ShowOfferType } from '../types';

// Centralised submission form for artists who'd like to perform during the
// Ceilidh weekend. Two flavours sharing one form: donation (no fee) or
// paid (artist requests a fee). Fields written to a single Firestore
// collection so the admin sees everything in one place.

interface ShowOfferModalProps {
    open: boolean;
    type: ShowOfferType;
    language: 'EN' | 'FR';
    user: User | null;
    eventId: string;
    onClose: () => void;
}

const WORK_DAYS = [
    { id: '2026-05-22', labelFr: 'Vendredi 22 mai',  labelEn: 'Friday May 22' },
    { id: '2026-05-23', labelFr: 'Samedi 23 mai',    labelEn: 'Saturday May 23' },
    { id: '2026-05-24', labelFr: 'Dimanche 24 mai',  labelEn: 'Sunday May 24' },
    { id: '2026-05-25', labelFr: 'Lundi 25 mai',     labelEn: 'Monday May 25' },
];

export const ShowOfferModal: React.FC<ShowOfferModalProps> = ({
    open, type, language, user, eventId, onClose,
}) => {
    const t = (en: string, fr: string) => language === 'FR' ? fr : en;

    // Pre-fill from user when available; otherwise empty.
    const [artistName,      setArtistName]      = useState('');
    const [contactName,     setContactName]     = useState(user?.displayName ?? '');
    const [email,           setEmail]           = useState(user?.email ?? '');
    const [phone,           setPhone]           = useState('');
    const [performersCount, setPerformersCount] = useState<number>(1);
    const [canUnplugged,    setCanUnplugged]    = useState<'yes' | 'no' | null>(null);
    const [durationMinutes, setDurationMinutes] = useState<number>(30);
    const [genre,           setGenre]           = useState('');
    const [description,     setDescription]     = useState('');
    const [technicalNeeds,  setTechnicalNeeds]  = useState('');
    const [preferredDays,   setPreferredDays]   = useState<string[]>([]);
    const [requestedFee,    setRequestedFee]    = useState<string>('');
    const [notes,           setNotes]           = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [error,      setError]      = useState<string | null>(null);
    const [success,    setSuccess]    = useState(false);

    // Reset form when reopened (so a previous submission doesn't leak in).
    useEffect(() => {
        if (open) {
            setArtistName(''); setPhone(''); setGenre(''); setDescription('');
            setTechnicalNeeds(''); setPreferredDays([]); setRequestedFee(''); setNotes('');
            setPerformersCount(1); setDurationMinutes(30); setCanUnplugged(null);
            setContactName(user?.displayName ?? '');
            setEmail(user?.email ?? '');
            setError(null);
            setSuccess(false);
        }
    }, [open, user]);

    // ESC closes
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // Body scroll lock
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    const toggleDay = (id: string) =>
        setPreferredDays((prev) => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || submitting) return;
        // Lightweight client validation.
        if (!artistName.trim() || !contactName.trim() || !email.trim() || canUnplugged === null) {
            setError(t('Please fill in the required fields.', 'Veuillez remplir les champs obligatoires.'));
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const payload: any = {
                type,
                status: 'new',
                artistName: artistName.trim(),
                contactName: contactName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim() || null,
                performersCount,
                canUnplugged: canUnplugged === 'yes',
                durationMinutes,
                genre: genre.trim() || null,
                description: description.trim() || null,
                technicalNeeds: technicalNeeds.trim() || null,
                preferredDays: preferredDays.length ? preferredDays : null,
                notes: notes.trim() || null,
                submittedByUid: user?.uid ?? null,
                submittedByEmail: user?.email ?? null,
                createdAt: serverTimestamp(),
            };
            if (type === 'paid') {
                payload.requestedFeeCAD = requestedFee.trim() ? Number(requestedFee) : null;
            }
            await addDoc(collection(db, 'events', eventId, 'showOffers'), payload);
            setSuccess(true);
        } catch (err: any) {
            setError(err?.message ?? String(err));
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    const titleFr = type === 'donation'
        ? 'Contribuer en faisant don d\'un spectacle'
        : 'Offrir un spectacle payant';
    const titleEn = type === 'donation'
        ? 'Contribute by donating a performance'
        : 'Offer a paid performance';

    // Render via portal so the modal escapes any ancestor that creates a
    // stacking context (animated chapter overlay, transformed parents,
    // etc.). Without this, fixed positioning is relative to the closest
    // transformed ancestor, and click events can be intercepted by
    // mid-stack overlays.
    const portalTarget = typeof document !== 'undefined' ? document.body : null;
    if (!portalTarget) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[400] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm py-8 px-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl bg-[#0e0d0a] border border-[#c5a059]/30 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-7 py-5 border-b border-white/5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.45em] mb-1">
                            {type === 'donation'
                                ? t('Donation', 'Don')
                                : t('Paid', 'Payant')}
                            {' · '}{t('Show offer', 'Offre de spectacle')}
                        </p>
                        <h2 className="font-prata text-[#f3e5ab] text-xl md:text-2xl leading-tight">
                            {language === 'FR' ? titleFr : titleEn}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
                    >✕</button>
                </div>

                {success ? (
                    <div className="p-10 text-center space-y-4">
                        <p className="font-prata text-[#f3e5ab] text-2xl">
                            {t('Merci !', 'Merci !')}
                        </p>
                        <p className="font-lato text-neutral-300 max-w-md mx-auto">
                            {t(
                                'Your offer has been received. We\'ll get back to you by email within a few days.',
                                'Votre offre a été reçue. Nous vous reviendrons par courriel d\'ici quelques jours.',
                            )}
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-2 px-6 py-2.5 border border-[#c5a059]/50 text-[#f3e5ab] font-cinzel text-[11px] uppercase tracking-[0.4em] hover:bg-[#c5a059]/10 transition-colors"
                        >
                            {t('Close', 'Fermer')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-7 space-y-5 text-sm font-lato">
                        {/* Artist + contact */}
                        <FieldGroup title={t('Artist & contact', 'Artiste et contact')}>
                            <Input
                                label={t('Artist or group name', 'Nom de l\'artiste ou du groupe')}
                                required value={artistName} onChange={setArtistName}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input
                                    label={t('Contact name', 'Personne contact')}
                                    required value={contactName} onChange={setContactName}
                                />
                                <Input
                                    label="Email" required type="email" value={email} onChange={setEmail}
                                />
                            </div>
                            <Input
                                label={t('Phone (optional)', 'Téléphone (facultatif)')}
                                type="tel" value={phone} onChange={setPhone}
                            />
                        </FieldGroup>

                        {/* Performance */}
                        <FieldGroup title={t('Performance', 'Prestation')}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <NumberInput
                                    label={t('Number of performers', 'Nombre de personnes sur scène')}
                                    min={1} max={30} value={performersCount} onChange={setPerformersCount}
                                />
                                <NumberInput
                                    label={t('Set duration (minutes)', 'Durée du set (minutes)')}
                                    min={5} max={180} step={5} value={durationMinutes} onChange={setDurationMinutes}
                                />
                            </div>
                            <Input
                                label={t('Genre / style', 'Genre / style')}
                                value={genre} onChange={setGenre}
                                placeholder={t('Folk, jazz, electroacoustic…', 'Folk, jazz, électroacoustique…')}
                            />
                            <Textarea
                                label={t('What you\'d play (brief)', 'Ce que vous proposeriez (bref)')}
                                value={description} onChange={setDescription}
                                rows={3}
                            />
                        </FieldGroup>

                        {/* Technical */}
                        <FieldGroup title={t('Technical', 'Technique')}>
                            <div>
                                <p className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-500 mb-2">
                                    {t('Can you perform unplugged?', 'Pouvez-vous jouer acoustique (sans amplification) ?')} *
                                </p>
                                <div className="flex gap-2">
                                    {(['yes', 'no'] as const).map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setCanUnplugged(v)}
                                            className={`flex-1 px-4 py-2.5 border text-[11px] font-cinzel uppercase tracking-[0.35em] transition-colors ${
                                                canUnplugged === v
                                                    ? 'border-[#c5a059] bg-[#c5a059]/15 text-[#f3e5ab]'
                                                    : 'border-white/10 text-neutral-500 hover:border-white/20 hover:text-neutral-300'
                                            }`}
                                        >
                                            {v === 'yes' ? t('Yes', 'Oui') : t('No', 'Non')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Textarea
                                label={t('Technical needs', 'Besoins techniques')}
                                value={technicalNeeds} onChange={setTechnicalNeeds}
                                rows={3}
                                placeholder={t(
                                    'Mics, PA, instruments brought, special setup…',
                                    'Micros, PA, instruments apportés, installation particulière…',
                                )}
                            />
                        </FieldGroup>

                        {/* Schedule */}
                        <FieldGroup title={t('Preferred date(s)', 'Date(s) souhaitée(s)')}>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {WORK_DAYS.map((d) => {
                                    const picked = preferredDays.includes(d.id);
                                    return (
                                        <button
                                            key={d.id}
                                            type="button"
                                            onClick={() => toggleDay(d.id)}
                                            className={`px-3 py-2 border text-[10px] font-cinzel uppercase tracking-[0.3em] transition-colors text-center ${
                                                picked
                                                    ? 'border-[#c5a059] bg-[#c5a059]/15 text-[#f3e5ab]'
                                                    : 'border-white/10 text-neutral-500 hover:border-white/20 hover:text-neutral-300'
                                            }`}
                                        >
                                            {language === 'FR' ? d.labelFr : d.labelEn}
                                        </button>
                                    );
                                })}
                            </div>
                        </FieldGroup>

                        {/* Paid-only fee */}
                        {type === 'paid' && (
                            <FieldGroup title={t('Requested fee', 'Cachet demandé')}>
                                <NumberInput
                                    label={t('Amount (CAD)', 'Montant (CAD)')}
                                    min={0} step={50} value={requestedFee === '' ? 0 : Number(requestedFee)}
                                    onChange={(n) => setRequestedFee(String(n))}
                                />
                                <p className="text-[10px] text-neutral-600 font-josefin">
                                    {t(
                                        'Indicative. We\'ll discuss when we follow up.',
                                        'Indicatif. À discuter lors de notre suivi.',
                                    )}
                                </p>
                            </FieldGroup>
                        )}

                        {/* Notes */}
                        <FieldGroup title={t('Anything else?', 'Autre chose ?')}>
                            <Textarea
                                label={t('Notes', 'Notes')} value={notes} onChange={setNotes} rows={2}
                            />
                        </FieldGroup>

                        {error && (
                            <p className="text-rose-400 text-xs font-lato">{error}</p>
                        )}

                        <div className="flex gap-3 pt-3 border-t border-white/5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 border border-white/10 text-neutral-400 hover:text-white hover:border-white/30 font-cinzel text-[10px] uppercase tracking-[0.4em] transition-colors"
                            >
                                {t('Cancel', 'Annuler')}
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 px-5 py-2.5 bg-[#d4af37] text-black font-cinzel text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-[#f3e5ab] disabled:opacity-40 transition-colors"
                            >
                                {submitting ? t('Sending…', 'Envoi…') : t('Submit', 'Soumettre')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        portalTarget,
    );
};

// ─── Tiny form primitives ──────────────────────────────────────────────
const FieldGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-3">
        <p className="font-cinzel text-[#c5a059] text-[9px] uppercase tracking-[0.45em]">{title}</p>
        {children}
    </div>
);

const Input: React.FC<{
    label: string; value: string; onChange: (v: string) => void;
    type?: string; required?: boolean; placeholder?: string;
}> = ({ label, value, onChange, type = 'text', required, placeholder }) => (
    <label className="block">
        <span className="block font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-500 mb-1">
            {label}{required && <span className="text-rose-400 ml-1">*</span>}
        </span>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            placeholder={placeholder}
            className="w-full bg-[#050505] border border-white/10 text-white px-3 py-2 text-sm font-lato focus:outline-none focus:border-[#d4af37]/50"
        />
    </label>
);

const Textarea: React.FC<{
    label: string; value: string; onChange: (v: string) => void;
    rows?: number; placeholder?: string;
}> = ({ label, value, onChange, rows = 3, placeholder }) => (
    <label className="block">
        <span className="block font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-500 mb-1">
            {label}
        </span>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            className="w-full bg-[#050505] border border-white/10 text-white px-3 py-2 text-sm font-lato resize-none focus:outline-none focus:border-[#d4af37]/50"
        />
    </label>
);

const NumberInput: React.FC<{
    label: string; value: number; onChange: (n: number) => void;
    min?: number; max?: number; step?: number;
}> = ({ label, value, onChange, min, max, step }) => (
    <label className="block">
        <span className="block font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-500 mb-1">
            {label}
        </span>
        <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
                const n = Number(e.target.value);
                onChange(Number.isFinite(n) ? n : 0);
            }}
            className="w-full bg-[#050505] border border-white/10 text-white px-3 py-2 text-sm font-lato focus:outline-none focus:border-[#d4af37]/50"
            style={{ fontVariantNumeric: 'tabular-nums' }}
        />
    </label>
);
