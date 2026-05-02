
import React, { useState, useEffect, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { User } from 'firebase/auth';
import type { MemberProfile } from './AuthModal';

interface ShowTicketModalProps {
  language: 'EN' | 'FR';
  user: User;
  memberProfile: MemberProfile;
  spotsLeft: number;
  onClose: () => void;
  onSuccess: (ticketCode: string) => void;
}

const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APP_ID as string;
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID as string;
const IS_SANDBOX = SQUARE_APP_ID?.startsWith('sandbox-');

const NIGHTS = [
  { id: '2026-05-22', label: 'Vendredi 22 Mai', label_en: 'Friday May 22' },
  { id: '2026-05-23', label: 'Samedi 23 Mai',   label_en: 'Saturday May 23' },
  { id: '2026-05-24', label: 'Dimanche 24 Mai', label_en: 'Sunday May 24' },
];

declare global { interface Window { Square?: any } }

export const ShowTicketModal: React.FC<ShowTicketModalProps> = ({
  language, user, memberProfile, spotsLeft, onClose, onSuccess,
}) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  const [ticketType, setTicketType] = useState<'single' | 'weekend'>('weekend');
  const [selectedNights, setSelectedNights] = useState<string[]>(['2026-05-23']);
  const [squareLoaded, setSquareLoaded] = useState(false);
  const [cardWidget, setCardWidget] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  const amount = ticketType === 'weekend' ? 20 : 10;

  // Load Square.js once
  useEffect(() => {
    if (window.Square) { setSquareLoaded(true); return; }
    const s = document.createElement('script');
    s.src = IS_SANDBOX
      ? 'https://sandbox.web.squarecdn.com/v1/square.js'
      : 'https://web.squarecdn.com/v1/square.js';
    s.onload  = () => setSquareLoaded(true);
    s.onerror = () => setErrorMsg(t('Failed to load payment system.', 'Erreur de chargement du paiement.'));
    document.head.appendChild(s);
  }, []);

  // Init card widget after Square loaded
  useEffect(() => {
    if (!squareLoaded || !cardRef.current || cardWidget) return;
    (async () => {
      try {
        const payments = window.Square!.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
        const card = await payments.card({
          style: {
            '.input-container':          { borderColor: '#333', borderRadius: '0px' },
            '.input-container.is-focus': { borderColor: '#d4af37' },
            '.input-container.is-error': { borderColor: '#ef4444' },
            input:                       { color: '#e5e5e5', fontSize: '14px' },
            'input::placeholder':        { color: '#555' },
          },
        });
        await card.attach(cardRef.current!);
        setCardWidget(card);
      } catch (e: any) {
        setErrorMsg(e.message ?? 'Card widget error');
      }
    })();
  }, [squareLoaded]);

  useEffect(() => { return () => { cardWidget?.destroy?.(); }; }, [cardWidget]);

  const toggleNight = (id: string) =>
    setSelectedNights(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);

  const handlePay = async () => {
    if (!cardWidget) return;
    if (ticketType === 'single' && selectedNights.length === 0) {
      setErrorMsg(t('Please select at least one night.', 'Veuillez choisir au moins une soirée.'));
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await cardWidget.tokenize();
      if (result.status !== 'OK') {
        setErrorMsg(result.errors?.[0]?.message ?? t('Tokenization failed.', 'Échec de tokenisation.'));
        setLoading(false);
        return;
      }
      const fn = httpsCallable(getFunctions(), 'createShowTicketPayment');
      const res: any = await fn({
        nonce: result.token,
        ticketType,
        nights: ticketType === 'weekend' ? NIGHTS.map(n => n.id) : selectedNights,
        displayName: memberProfile.displayName,
        email:       memberProfile.email,
      });
      setSuccessCode(res.data.ticketCode);
      onSuccess(res.data.ticketCode);
    } catch (e: any) {
      setErrorMsg(e.message ?? t('Payment error.', 'Erreur de paiement.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (successCode) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <div className="w-full max-w-md bg-[#0f0f0f] border border-[#d4af37]/30 p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="font-cinzel text-2xl text-[#d4af37] mb-2">
            {t('Ticket Confirmed!', 'Billet Confirmé\u00a0!')}
          </h2>
          <div className="my-6 p-5 border border-[#d4af37]/40 bg-[#d4af37]/5">
            <p className="text-neutral-500 text-[10px] font-cinzel uppercase tracking-[0.3em] mb-2">
              {t('Your Code', 'Votre Code')}
            </p>
            <p className="font-cinzel text-2xl text-[#d4af37] tracking-[0.3em]">{successCode}</p>
            <p className="text-neutral-600 text-xs font-lato mt-2">
              {ticketType === 'weekend' ? t('Weekend Pass · All 3 Shows', 'Passe Weekend · 3 Spectacles') : t('Single Show', '1 Spectacle')}
            </p>
          </div>
          <p className="text-neutral-500 font-lato text-sm mb-6">
            {t(
              'Your ticket is saved in your profile. Show the code at the door!',
              'Votre billet est sauvegardé dans votre profil. Montrez le code à l\'entrée\u00a0!',
            )}
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 border border-[#d4af37] text-[#d4af37] font-cinzel text-sm uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all"
          >
            {t('Close', 'Fermer')}
          </button>
        </div>
      </div>
    );
  }

  // ── Payment form ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0f0f0f] border border-[#d4af37]/30 shadow-2xl my-4">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]/60" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]/60" />

        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[#d4af37] text-xs font-cinzel uppercase tracking-[0.4em]">Ceilidh de Mai 2026</span>
              <h2 className="font-cinzel text-2xl text-white mt-1">{t('Show Tickets', 'Billets Spectacles')}</h2>
              <p className="text-neutral-600 text-xs font-lato mt-1">
                {spotsLeft} {t('spot(s) remaining of 20', 'place(s) restante(s) sur 20')}
              </p>
            </div>
            <button onClick={onClose} className="text-neutral-500 hover:text-white text-xl transition-colors">×</button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 text-red-300 text-sm font-lato">
              {errorMsg}
            </div>
          )}

          {/* Ticket type selector */}
          <div className="mb-6">
            <p className="font-cinzel text-white text-xs uppercase tracking-[0.25em] mb-3">
              {t('Choose your pass', 'Choisissez votre passe')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTicketType('single')}
                className={`p-4 border text-left transition-all ${ticketType === 'single' ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-white/10 hover:border-white/30'}`}
              >
                <div className="font-cinzel text-white text-sm mb-1">{t('1 Show', '1 Spectacle')}</div>
                <div className="font-cinzel text-[#d4af37] text-xl font-bold">10$</div>
                <div className="text-neutral-600 text-[10px] font-lato mt-1">{t('Choose your night', 'Choisissez votre soirée')}</div>
              </button>
              <button
                onClick={() => setTicketType('weekend')}
                className={`p-4 border text-left transition-all ${ticketType === 'weekend' ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-white/10 hover:border-white/30'}`}
              >
                <div className="font-cinzel text-white text-sm mb-1">{t('Weekend Pass', 'Passe Weekend')}</div>
                <div className="font-cinzel text-[#d4af37] text-xl font-bold">20$</div>
                <div className="text-neutral-600 text-[10px] font-lato mt-1">{t('All 3 shows', 'Les 3 spectacles')}</div>
              </button>
            </div>
          </div>

          {/* Night selector for single tickets */}
          {ticketType === 'single' && (
            <div className="mb-6">
              <p className="font-cinzel text-white text-xs uppercase tracking-[0.25em] mb-3">
                {t('Which night(s)?', 'Quelle(s) soirée(s)\u00a0?')}
              </p>
              <div className="space-y-2">
                {NIGHTS.map(night => (
                  <label key={night.id} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleNight(night.id)}>
                    <div className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 transition-colors ${selectedNights.includes(night.id) ? 'border-[#d4af37] bg-[#d4af37]' : 'border-white/20 group-hover:border-[#d4af37]/50'}`}>
                      {selectedNights.includes(night.id) && <span className="text-black text-[9px] font-bold leading-none">✓</span>}
                    </div>
                    <span className="text-neutral-300 text-sm font-lato">
                      {language === 'FR' ? night.label : night.label_en}
                      <span className="text-neutral-600 ml-2 text-xs">18h – 20h</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Square card widget */}
          <div className="mb-6">
            <p className="font-cinzel text-white text-xs uppercase tracking-[0.25em] mb-3">
              {t('Card Details', 'Informations de Carte')}
            </p>
            <div ref={cardRef} className="min-h-[100px]">
              {!squareLoaded && (
                <div className="flex items-center justify-center min-h-[80px]">
                  <div className="w-4 h-4 border-2 border-[#d4af37]/30 border-t-[#d4af37] rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={loading || !cardWidget}
            className="w-full py-4 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-40 transition-all"
          >
            {loading
              ? t('Processing…', 'Traitement…')
              : t(`Pay $${amount} CAD`, `Payer ${amount}\u00a0$ CAD`)}
          </button>

          <p className="text-[10px] text-center text-neutral-700 font-lato mt-3">
            {t('Secure payment via Square. Card info never touches our servers.',
               'Paiement sécurisé via Square. Vos données de carte ne passent jamais par nos serveurs.')}
            {IS_SANDBOX && <span className="ml-1 text-yellow-600">[Sandbox]</span>}
          </p>
        </div>
      </div>
    </div>
  );
};
