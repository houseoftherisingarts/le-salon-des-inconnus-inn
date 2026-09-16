import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { db } from '../../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { D20Roller, type D20Outcome } from '../../D20Roller';

// Dé hebdomadaire, déplacé depuis ProfilePage.tsx:848-998. Le lancer se fait
// dans la fonction rollWeeklyD20 : elle tire le nombre, applique le délai de
// sept jours et réclame un code du pool Firestore. Cette page ne lit jamais le
// pool (lecture admin dans firestore.rules) ; le compte à rebours est calculé
// ici uniquement pour l'affichage.
interface DeHebdomadaireProps {
  language: 'EN' | 'FR';
  user: User;
}

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

type D20Entry = {
  roll: number;
  rebatePct: number;
  tier: D20Outcome['tier'];
  code?: string;
  rolledAt: any;
};

export const DeHebdomadaire: React.FC<DeHebdomadaireProps> = ({ language, user }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

  const [couponCopied, setCouponCopied] = useState(false);
  const copyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCouponCopied(true);
      setTimeout(() => setCouponCopied(false), 1800);
    });
  };

  const [d20Doc, setD20Doc] = useState<{
    lastRollAt?: any;
    history?: D20Entry[];
    sandwichesOwed?: number;
  } | null>(null);
  const [d20Error, setD20Error] = useState<string | null>(null);
  const [d20Outcome, setD20Outcome] = useState<D20Outcome | null>(null);
  const [d20OutcomeNonce, setD20OutcomeNonce] = useState(0);
  const [d20ErrorNonce, setD20ErrorNonce] = useState(0);

  useEffect(() => {
    if (!db) return;
    const ref = doc(db, 'd20Rolls', user.uid);
    return onSnapshot(ref, (snap) => {
      setD20Doc(snap.exists() ? (snap.data() as any) : {});
    });
  }, [user.uid]);

  const requestD20Roll = async () => {
    setD20Error(null);
    try {
      const fn = httpsCallable(getFunctions(), 'rollWeeklyD20');
      const res = await fn({});
      setD20Outcome(res.data as D20Outcome);
      setD20OutcomeNonce((n) => n + 1);
    } catch (e: any) {
      const code = String(e?.message ?? e);
      setD20Error(
        code.includes('ALREADY_ROLLED')
          ? t('You\'ve already rolled this week.', 'Vous avez déjà lancé cette semaine.')
          : code.includes('POOL_EMPTY')
          ? t('The rebate pool is empty right now. Write to your host and the code is yours.',
              'La réserve de codes est vide en ce moment. Écrivez à votre hôte et le code vous revient.')
          : t('The roll could not be recorded. Try again in a moment.',
              'Le lancer n\'a pas pu être enregistré. Réessayez dans un instant.'),
      );
      setD20ErrorNonce((n) => n + 1);
    }
  };

  const [nowMs, setNowMs] = useState(() => Date.now());
  const lastRollMs: number | null = d20Doc?.lastRollAt?.toMillis?.() ?? null;
  const msUntilNext = lastRollMs ? Math.max(0, (lastRollMs + COOLDOWN_MS) - nowMs) : 0;
  const onCooldown = msUntilNext > 0;
  useEffect(() => {
    if (!onCooldown) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [onCooldown]);

  const cooldownParts = (() => {
    const days = Math.floor(msUntilNext / 86_400_000);
    const hours = Math.floor((msUntilNext % 86_400_000) / 3_600_000);
    const mins = Math.floor((msUntilNext % 3_600_000) / 60_000);
    const secs = Math.floor((msUntilNext % 60_000) / 1_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return { days, hours, mins, secs, padded: { hours: pad(hours), mins: pad(mins), secs: pad(secs) } };
  })();

  // Réinitialisation « voyage temporel » : la phrase passe désormais par
  // resetD20Cooldown, réservé à l'admin. Pour tout autre membre elle reste
  // inerte, et le champ clignote en rouge.
  const TIME_TRAVEL_PASSWORD = 'meditate';
  const [travelInput, setTravelInput] = useState('');
  const [travelStatus, setTravelStatus] = useState<'idle' | 'wrong'>('idle');
  const handleTimeTravel = async (e: React.FormEvent) => {
    e.preventDefault();
    const refuse = () => {
      setTravelStatus('wrong');
      setTimeout(() => setTravelStatus('idle'), 1200);
    };
    if (travelInput.trim().toLowerCase() !== TIME_TRAVEL_PASSWORD) return refuse();
    try {
      await httpsCallable(getFunctions(), 'resetD20Cooldown')({});
      setTravelInput('');
      setTravelStatus('idle');
    } catch {
      refuse();
    }
  };

  const lastEntry: D20Entry | null = (d20Doc?.history && d20Doc.history.length)
    ? d20Doc.history[d20Doc.history.length - 1] as D20Entry
    : null;

  return (
    <section className="py-2">
      <div>
        <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
          <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] block">
            {t('Weekly roll', 'Lancer hebdomadaire')}
          </span>
          {d20Doc?.sandwichesOwed ? (
            <span className="font-cinzel text-[#c5a059]/80 text-[10px] uppercase tracking-[0.4em]">
              {d20Doc.sandwichesOwed === 1
                ? t('You owe 1 chicken sandwich', 'Vous devez 1 sandwich au poulet')
                : t(`You owe ${d20Doc.sandwichesOwed} chicken sandwiches`,
                    `Vous devez ${d20Doc.sandwichesOwed} sandwichs au poulet`)}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
          <div
            className="p-5 md:p-6 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(28,22,14,0.6) 0%, rgba(15,12,8,0.85) 100%)',
              border: '1px solid rgba(197,160,89,0.22)',
            }}
          >
            <D20Roller
              language={language}
              disabled={onCooldown}
              outcome={d20Outcome}
              outcomeNonce={d20OutcomeNonce}
              errorNonce={d20ErrorNonce}
              onRequestRoll={requestD20Roll}
            />
            {d20Error && (
              <p className="mt-3 text-center font-josefin text-rose-400 text-xs">
                {d20Error}
              </p>
            )}

            {onCooldown && (
              <div className="mt-5 text-center">
                <p className="font-cinzel text-[#c5a059]/80 text-[9px] uppercase tracking-[0.45em] mb-2">
                  {t('Next roll in', 'Prochain lancer dans')}
                </p>
                <div className="inline-flex items-baseline gap-2 font-prata text-[#f3e5ab]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <span className="text-2xl">{cooldownParts.days}</span>
                  <span className="text-[10px] font-cinzel text-neutral-500 uppercase tracking-[0.3em]">
                    {t('d', 'j')}
                  </span>
                  <span className="text-2xl">{cooldownParts.padded.hours}</span>
                  <span className="text-[10px] font-cinzel text-neutral-500 uppercase tracking-[0.3em]">h</span>
                  <span className="text-2xl">{cooldownParts.padded.mins}</span>
                  <span className="text-[10px] font-cinzel text-neutral-500 uppercase tracking-[0.3em]">m</span>
                  <span className="text-2xl">{cooldownParts.padded.secs}</span>
                  <span className="text-[10px] font-cinzel text-neutral-500 uppercase tracking-[0.3em]">s</span>
                </div>

                <form onSubmit={handleTimeTravel} className="mt-5 flex justify-center">
                  <input
                    type="password"
                    value={travelInput}
                    onChange={(e) => { setTravelInput(e.target.value); setTravelStatus('idle'); }}
                    placeholder={t('time travel…', 'voyage temporel…')}
                    className={`bg-transparent border-b text-center font-josefin text-[11px] tracking-[0.25em] w-44 py-1 focus:outline-none transition-colors ${
                      travelStatus === 'wrong'
                        ? 'border-rose-500 text-rose-400 placeholder:text-rose-500/40'
                        : 'border-white/10 text-neutral-400 hover:border-white/20 focus:border-[#c5a059]/60 focus:text-[#f3e5ab] placeholder:text-neutral-700'
                    }`}
                  />
                </form>
              </div>
            )}
          </div>

          <div
            className="p-6 md:p-8 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(50,40,22,0.4) 0%, rgba(20,16,10,0.85) 100%)',
              border: '1px solid rgba(243,229,171,0.2)',
            }}
          >
            <h4
              className="font-prata uppercase text-[#f3e5ab] leading-tight mb-4"
              style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.35rem)' }}
            >
              {t('What the dice decides', 'Ce que les dés décident')}
            </h4>

            <ul className="space-y-2.5 font-josefin text-sm mb-6">
              <li className="flex items-baseline justify-between gap-3">
                <span className="font-cinzel text-rose-400 text-[10px] uppercase tracking-[0.4em]">1 · {t('Crit fail', 'Échec critique')}</span>
                <span className="text-rose-300/80 text-xs">{t('You owe your host a chicken sandwich', 'Un sandwich au poulet à votre hôte')}</span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span className="font-cinzel text-neutral-500 text-[10px] uppercase tracking-[0.4em]">2 – 10</span>
                <span className="text-neutral-500 text-xs">{t('Nothing', 'Rien')}</span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span className="font-cinzel text-amber-300 text-[10px] uppercase tracking-[0.4em]">11 – 15</span>
                <span className="text-amber-200 text-xs">5% {t('rebate code', 'code de rabais')}</span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em]">16 – 19</span>
                <span className="text-[#c5a059] text-xs">10% {t('rebate code', 'code de rabais')}</span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span className="font-cinzel text-[#f3e5ab] text-[10px] uppercase tracking-[0.4em]">20 · Nat 20</span>
                <span className="text-[#f3e5ab] text-xs font-bold">20% {t('rebate code', 'code de rabais')}</span>
              </li>
            </ul>

            <p className="font-josefin text-neutral-500 text-[11px] leading-relaxed mb-5">
              {t(
                'One roll per week. Each rebate code is one-time and drawn from a finite pool: first to roll, first served. Codes apply to stays booked directly with us, here on the site.',
                'Un lancer par semaine. Chaque code de rabais est unique et tiré d\'un nombre limité : premier arrivé, premier servi. Les codes s\'appliquent aux séjours réservés directement avec nous, ici sur le site.',
              )}
            </p>

            {lastEntry?.code && (
              <div className="mt-2">
                <p className="font-cinzel text-emerald-400 text-[10px] uppercase tracking-[0.4em] mb-2">
                  ✓ {t('Your latest code', 'Votre dernier code')} · {lastEntry.rebatePct}%
                </p>
                <button
                  type="button"
                  onClick={() => copyCoupon(lastEntry.code!)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-lg transition-all hover:bg-black/20"
                  style={{ background: 'rgba(8,6,4,0.6)', border: '1px dashed rgba(243,229,171,0.5)' }}
                >
                  <span className="font-prata text-[#c5a059] text-xl tracking-[0.3em]">{lastEntry.code}</span>
                  <span className="font-cinzel text-[#f3e5ab] text-[10px] uppercase tracking-[0.45em]">
                    {couponCopied ? t('Copied ✓', 'Copié ✓') : t('Tap to copy', 'Toucher pour copier')}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
