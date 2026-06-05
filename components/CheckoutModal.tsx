import React, { useState, useEffect, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Native on-site room checkout (HostAway Phase 2). Reuses the exact Square
// card-widget → tokenize → callable pattern from ShowTicketModal: the card data
// is tokenized in the browser by Square.js and never touches our servers, then
// the single `createRoomReservation` callable re-validates availability,
// re-computes the price, charges the card, and creates the HostAway reservation
// server-side. The guest never sees HostAway's UI.

const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APP_ID as string;
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID as string;
const IS_SANDBOX = SQUARE_APP_ID?.startsWith('sandbox-');

declare global { interface Window { Square?: any } }

export interface CheckoutModalProps {
  language: 'EN' | 'FR';
  roomTitle: string;
  listingId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  /** Authoritative total from the Phase 1 quote, for display only. The server
   *  re-computes and is the source of truth for the actual charge. */
  total: number;
  currency: string;
  onClose: () => void;
}

type Confirmation = {
  reservationId: number | string;
  total: number;
  currency: string;
  nights: number;
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  language, roomTitle, listingId, checkIn, checkOut, guests, nights, total, currency, onClose,
}) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [squareLoaded, setSquareLoaded] = useState(false);
  const [cardWidget, setCardWidget] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  // Load Square.js once (same source switch as ShowTicketModal).
  useEffect(() => {
    if (window.Square) { setSquareLoaded(true); return; }
    const s = document.createElement('script');
    s.src = IS_SANDBOX
      ? 'https://sandbox.web.squarecdn.com/v1/square.js'
      : 'https://web.squarecdn.com/v1/square.js';
    s.onload = () => setSquareLoaded(true);
    s.onerror = () => setErrorMsg(t('Failed to load payment system.', 'Erreur de chargement du paiement.'));
    document.head.appendChild(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Init the card widget once Square is loaded.
  useEffect(() => {
    if (!squareLoaded || !cardRef.current || cardWidget) return;
    (async () => {
      try {
        const payments = window.Square!.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
        const card = await payments.card({
          style: {
            '.input-container':          { borderColor: '#333', borderRadius: '0px' },
            '.input-container.is-focus': { borderColor: '#c5a059' },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squareLoaded]);

  useEffect(() => () => { cardWidget?.destroy?.(); }, [cardWidget]);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const priceLabel = new Intl.NumberFormat(language === 'FR' ? 'fr-CA' : 'en-CA', {
    style: 'currency',
    currency: currency || 'CAD',
  }).format(total);

  const handlePay = async () => {
    if (!cardWidget) return;
    if (name.trim().length < 2) {
      setErrorMsg(t('Please enter your name.', 'Veuillez entrer votre nom.'));
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErrorMsg(t('Please enter a valid email.', 'Veuillez entrer un courriel valide.'));
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const tok = await cardWidget.tokenize();
      if (tok.status !== 'OK') {
        setErrorMsg(tok.errors?.[0]?.message ?? t('Card could not be read.', 'Carte illisible.'));
        setLoading(false);
        return;
      }
      const fn = httpsCallable(getFunctions(), 'createRoomReservation');
      const res: any = await fn({
        listingId,
        checkIn,
        checkOut,
        numberOfGuests: guests,
        guestName: name.trim(),
        guestEmail: email.trim(),
        guestPhone: phone.trim(),
        nonce: tok.token,
      });
      const data = res.data;
      if (data?.dryRun) {
        // Dark-mode deploy: the server validated everything but did not charge
        // or book. Surface this clearly rather than faking a confirmation.
        setErrorMsg(t(
          'Booking is not live yet. Please contact us to confirm your stay.',
          "La réservation n'est pas encore active. Contactez-nous pour confirmer votre séjour.",
        ));
        setLoading(false);
        return;
      }
      setConfirmation({
        reservationId: data.reservationId,
        total: data.total,
        currency: data.currency,
        nights: data.nights,
      });
    } catch (e: any) {
      setErrorMsg(e.message ?? t('Payment error.', 'Erreur de paiement.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Confirmation screen ─────────────────────────────────────────────────────
  if (confirmation) {
    const confPrice = new Intl.NumberFormat(language === 'FR' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: confirmation.currency || 'CAD',
    }).format(confirmation.total);
    return (
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-md bg-[#0f0f0f] border border-[#c5a059]/30 p-8 text-center">
          <div className="text-5xl mb-4">✦</div>
          <h2 className="font-cinzel text-2xl text-[#f3e5ab] mb-2">
            {t('Reservation Confirmed', 'Réservation Confirmée')}
          </h2>
          <div className="my-6 p-5 border border-[#c5a059]/40 bg-[#c5a059]/5 text-left space-y-2">
            <p className="font-cinzel text-[#f3e5ab] text-sm uppercase tracking-[0.2em]">{roomTitle}</p>
            <p className="text-neutral-300 text-sm font-lato">
              {t('Check-in', 'Arrivée')}: {checkIn}
            </p>
            <p className="text-neutral-300 text-sm font-lato">
              {t('Check-out', 'Départ')}: {checkOut}
            </p>
            <p className="text-neutral-300 text-sm font-lato">
              {confirmation.nights} {t('nights', 'nuits')} · {confPrice} {t('total', 'total')}
            </p>
            <p className="text-neutral-500 text-xs font-lato pt-2">
              {t('Confirmation', 'Confirmation')} #{confirmation.reservationId}
            </p>
          </div>
          <p className="text-neutral-500 font-lato text-sm mb-6">
            {t(
              'A confirmation has been sent to your email. We look forward to welcoming you.',
              'Une confirmation a été envoyée à votre courriel. Au plaisir de vous accueillir.',
            )}
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 border border-[#c5a059] text-[#f3e5ab] font-cinzel text-sm uppercase tracking-widest hover:bg-[#c5a059] hover:text-black transition-all"
          >
            {t('Close', 'Fermer')}
          </button>
        </div>
      </div>
    );
  }

  // ── Checkout form ───────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative w-full max-w-lg bg-[#0f0f0f] border border-[#c5a059]/30 shadow-2xl my-4">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#c5a059]/60" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#c5a059]/60" />

        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[#c5a059] text-xs font-cinzel uppercase tracking-[0.4em]">
                {t('Reservation', 'Réservation')}
              </span>
              <h2 className="font-cinzel text-2xl text-white mt-1">{roomTitle}</h2>
            </div>
            <button onClick={onClose} className="text-neutral-500 hover:text-white text-xl transition-colors">×</button>
          </div>

          {/* Price summary */}
          <div className="mb-6 p-4 border border-[#c5a059]/25 bg-[#c5a059]/5">
            <div className="flex justify-between text-sm font-lato text-neutral-300">
              <span>{t('Check-in', 'Arrivée')}</span><span>{checkIn}</span>
            </div>
            <div className="flex justify-between text-sm font-lato text-neutral-300 mt-1">
              <span>{t('Check-out', 'Départ')}</span><span>{checkOut}</span>
            </div>
            <div className="flex justify-between text-sm font-lato text-neutral-300 mt-1">
              <span>{t('Guests', 'Personnes')}</span><span>{guests}</span>
            </div>
            <div className="flex justify-between items-baseline mt-3 pt-3 border-t border-[#c5a059]/20">
              <span className="font-cinzel text-xs uppercase tracking-[0.2em] text-neutral-400">
                {nights} {t('nights · taxes included', 'nuits · taxes incluses')}
              </span>
              <span className="font-cinzel text-xl text-[#f3e5ab]">{priceLabel}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 text-red-300 text-sm font-lato">
              {errorMsg}
            </div>
          )}

          {/* Guest details */}
          <div className="space-y-3 mb-6">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Full name', 'Nom complet')}
              className="w-full bg-black/40 border border-white/20 px-3 py-3 text-sm text-neutral-100 font-lato focus:border-[#c5a059] focus:outline-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('Email', 'Courriel')}
              className="w-full bg-black/40 border border-white/20 px-3 py-3 text-sm text-neutral-100 font-lato focus:border-[#c5a059] focus:outline-none"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('Phone (optional)', 'Téléphone (facultatif)')}
              className="w-full bg-black/40 border border-white/20 px-3 py-3 text-sm text-neutral-100 font-lato focus:border-[#c5a059] focus:outline-none"
            />
          </div>

          {/* Square card widget */}
          <div className="mb-6">
            <p className="font-cinzel text-white text-xs uppercase tracking-[0.25em] mb-3">
              {t('Card Details', 'Informations de Carte')}
            </p>
            <div ref={cardRef} className="min-h-[100px]">
              {!squareLoaded && (
                <div className="flex items-center justify-center min-h-[80px]">
                  <div className="w-4 h-4 border-2 border-[#c5a059]/30 border-t-[#c5a059] rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={loading || !cardWidget}
            className="w-full py-4 bg-[#c5a059] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#d4b06a] disabled:opacity-40 transition-all"
          >
            {loading
              ? t('Processing…', 'Traitement…')
              : t(`Pay & Book · ${priceLabel}`, `Payer et réserver · ${priceLabel}`)}
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

export default CheckoutModal;
