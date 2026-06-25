
import React, { useState, useEffect, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { User } from 'firebase/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContributionPanelProps {
  language: 'EN' | 'FR';
  user: User | null;
  onRequireAuth: () => void;
  title?: string;
  blurb?: string;
  successMsg?: string;
  paymentNote?: string;
}

declare global {
  interface Window {
    Square?: any;
  }
}

const PRESET_AMOUNTS = [10, 20, 50, 100];
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APP_ID as string;
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID as string;
const IS_SANDBOX = SQUARE_APP_ID?.startsWith('sandbox-');

// ─── Component ────────────────────────────────────────────────────────────────

export const ContributionPanel: React.FC<ContributionPanelProps> = ({
  language,
  user,
  onRequireAuth,
  title,
  blurb,
  successMsg,
  paymentNote,
}) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(20);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [note, setNote] = useState('');
  const [squareLoaded, setSquareLoaded] = useState(false);
  const [cardWidget, setCardWidget] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const paymentsRef = useRef<any>(null);

  const finalAmount = useCustom ? Math.max(5, parseInt(customAmount, 10) || 5) : amount;

  // Load Square.js once when the panel opens
  useEffect(() => {
    if (!open) return;
    if (window.Square) { setSquareLoaded(true); return; }
    const script = document.createElement('script');
    script.src = IS_SANDBOX
      ? 'https://sandbox.web.squarecdn.com/v1/square.js'
      : 'https://web.squarecdn.com/v1/square.js';
    script.onload = () => setSquareLoaded(true);
    script.onerror = () => setErrorMsg(t('Failed to load payment system.', 'Erreur de chargement du système de paiement.'));
    document.head.appendChild(script);
  }, [open]);

  // Initialize card widget once Square is loaded and container is visible
  useEffect(() => {
    if (!squareLoaded || !open || !cardContainerRef.current || cardWidget) return;
    if (!SQUARE_APP_ID || SQUARE_APP_ID.includes('REPLACE_ME')) {
      setErrorMsg('Square App ID not configured. Add VITE_SQUARE_APP_ID to .env.local');
      return;
    }
    (async () => {
      try {
        const payments = window.Square!.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
        paymentsRef.current = payments;
        const card = await payments.card({
          style: {
            '.input-container': { borderColor: '#333', borderRadius: '0px' },
            '.input-container.is-focus': { borderColor: '#c5a059' },
            '.input-container.is-error': { borderColor: '#ef4444' },
            input: { color: '#e5e5e5', fontSize: '14px' },
            'input::placeholder': { color: '#555' },
          },
        });
        await card.attach(cardContainerRef.current!);
        setCardWidget(card);
      } catch (e: any) {
        setErrorMsg(e.message ?? 'Card widget error');
      }
    })();
  }, [squareLoaded, open]);

  // Destroy card widget when panel closes
  useEffect(() => {
    if (!open && cardWidget) {
      cardWidget.destroy?.();
      setCardWidget(null);
    }
  }, [open]);

  const handlePay = async () => {
    if (!user) { onRequireAuth(); return; }
    if (!cardWidget) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await cardWidget.tokenize();
      if (result.status !== 'OK') {
        setErrorMsg(result.errors?.[0]?.message ?? t('Tokenization failed.', 'Échec de tokenisation.'));
        setLoading(false);
        return;
      }
      const fn = httpsCallable(getFunctions(), 'createCeilidhPayment');
      await fn({ nonce: result.token, amountCents: finalAmount * 100, note: note.trim() || paymentNote });
      setStatus('success');
    } catch (e: any) {
      setErrorMsg(e.message ?? t('Payment error.', 'Erreur de paiement.'));
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="border border-[#c5a059]/30 bg-[#0a0a0a] p-10 text-center">
        <div className="text-5xl mb-6">🎉</div>
        <h3 className="font-cinzel text-2xl text-[#c5a059] mb-3">
          {t('Thank you!', 'Merci\u00a0!')}
        </h3>
        <p className="font-lato text-neutral-400 text-sm max-w-sm mx-auto">
          {successMsg ?? t(
            `Your contribution of $${finalAmount} helps make this event possible. See you at the Ceilidh!`,
            `Votre contribution de ${finalAmount}\u00a0$ aide à rendre cet événement possible. À bientôt au Ceilidh\u00a0!`,
          )}
        </p>
        <button
          onClick={() => { setStatus('idle'); setOpen(false); }}
          className="mt-8 px-6 py-2 border border-white/20 text-neutral-400 font-cinzel text-xs uppercase tracking-widest hover:text-white transition-colors"
        >
          {t('Close', 'Fermer')}
        </button>
      </div>
    );
  }

  // ── Closed state ───────────────────────────────────────────────────────────
  if (!open) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="text-3xl">💛</div>
          <p className="font-lato text-neutral-500 text-sm max-w-md mx-auto leading-relaxed">
            {blurb ?? t(
              'Can\'t make it as a Woofer? You can still support the event with a monetary contribution.',
              'Vous ne pouvez pas venir en tant que Woofer\u00a0? Vous pouvez quand même soutenir l\'événement par une contribution monétaire.',
            )}
          </p>
          <button
            onClick={() => { if (!user) { onRequireAuth(); return; } setOpen(true); }}
            className="group mt-2 px-10 py-4 border border-[#c5a059]/60 text-[#c5a059] font-cinzel text-sm uppercase tracking-[0.2em] hover:bg-[#c5a059] hover:text-black transition-all duration-300"
          >
            <span className="group-hover:hidden">{t('Contribute', 'Contribuer')}</span>
            <span className="hidden group-hover:inline">{t('I\'ll support the cause', 'Je soutiens la cause')}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Open payment form ──────────────────────────────────────────────────────
  return (
    <div className="border border-[#c5a059]/30 bg-[#0a0a0a] overflow-hidden">
      <div className="border-b border-white/5 p-6 flex items-center justify-between">
        <div>
          <p className="text-[#c5a059] text-xs font-cinzel uppercase tracking-[0.4em]">
            {t('Contribution', 'Contribution')}
          </p>
          <h3 className="font-cinzel text-xl text-white mt-0.5">
            {title ?? t('Support the Ceilidh', 'Soutenir le Ceilidh')}
          </h3>
        </div>
        <button onClick={() => setOpen(false)} className="text-neutral-600 hover:text-white text-xl transition-colors">×</button>
      </div>

      <div className="p-6 space-y-6">
        {/* Amount selector */}
        <div>
          <p className="text-xs font-cinzel text-neutral-500 uppercase tracking-widest mb-3">
            {t('Amount (CAD)', 'Montant (CAD)')}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => { setAmount(a); setUseCustom(false); }}
                className={`px-4 py-2 font-cinzel text-sm border transition-all ${
                  !useCustom && amount === a
                    ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]'
                    : 'border-white/10 text-neutral-400 hover:border-white/30'
                }`}
              >
                ${a}
              </button>
            ))}
            <button
              onClick={() => setUseCustom(true)}
              className={`px-4 py-2 font-cinzel text-sm border transition-all ${
                useCustom
                  ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]'
                  : 'border-white/10 text-neutral-400 hover:border-white/30'
              }`}
            >
              {t('Custom', 'Autre')}
            </button>
          </div>
          {useCustom && (
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-cinzel">$</span>
              <input
                type="number"
                min="5"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                placeholder="5 minimum"
                className="flex-1 bg-[#141414] border border-white/10 text-white px-4 py-2 font-lato text-sm focus:outline-none focus:border-[#c5a059]/60 placeholder:text-neutral-700"
              />
            </div>
          )}
        </div>

        {/* Optional note */}
        <div>
          <p className="text-xs font-cinzel text-neutral-500 uppercase tracking-widest mb-2">
            {t('Note (optional)', 'Note (facultatif)')}
          </p>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t('A kind word...', 'Un mot gentil...')}
            maxLength={100}
            className="w-full bg-[#141414] border border-white/10 text-white px-4 py-2 font-lato text-sm focus:outline-none focus:border-[#c5a059]/60 placeholder:text-neutral-700"
          />
        </div>

        {/* Square card widget */}
        <div>
          <p className="text-xs font-cinzel text-neutral-500 uppercase tracking-widest mb-3">
            {t('Card Details', 'Informations de Carte')}
          </p>
          <div ref={cardContainerRef} id="sq-card-container" className="min-h-[120px]">
            {!squareLoaded && (
              <div className="flex items-center justify-center min-h-[80px]">
                <div className="w-4 h-4 border-2 border-[#c5a059]/30 border-t-[#c5a059] rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-900/30 border border-red-700/50 text-red-300 text-sm font-lato">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading || !cardWidget}
          className="w-full py-4 bg-[#c5a059] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-40 transition-all"
        >
          {loading
            ? t('Processing...', 'Traitement en cours...')
            : t(`Pay $${finalAmount} CAD`, `Payer ${finalAmount}\u00a0$ CAD`)}
        </button>

        <p className="text-[10px] text-center text-neutral-700 font-lato">
          {t('Secure payment via Square. Your card info never touches our servers.',
            'Paiement sécurisé via Square. Vos informations de carte ne touchent jamais nos serveurs.')}
          {IS_SANDBOX && <span className="ml-1 text-yellow-600">[Sandbox Mode]</span>}
        </p>
      </div>
    </div>
  );
};
