import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ── Airbnb-style availability calendar ───────────────────────────────────────
// A self-contained range picker: tap a check-in day, then a check-out day. Days
// HostAway has blocked (or in the past) are disabled and crossed out, and a range
// that would span a blocked night snaps the selection to a fresh check-in. Live
// per-day availability comes from the getHostawayCalendar Cloud Function.
//
// One month on mobile, two side-by-side on desktop. No external date library.

type CalDay = { date: string; available: boolean; minimumStay: number; price: number | null };

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const monthStartUTC = (y: number, m: number) => new Date(Date.UTC(y, m, 1));
const addMonths = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
const addDaysISO = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
};
const todayISO = () => toISO(new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z'));

const MONTHS: Record<'EN' | 'FR', string[]> = {
  EN: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  FR: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
};
const WEEKDAYS: Record<'EN' | 'FR', string[]> = {
  EN: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  FR: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
};

interface Props {
  listingId: number;
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  language: 'EN' | 'FR';
}

export const AvailabilityCalendar: React.FC<Props> = ({ listingId, checkIn, checkOut, onChange, language }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const today = useMemo(() => todayISO(), []);
  const [view, setView] = useState<Date>(() => {
    const d = new Date();
    return monthStartUTC(d.getUTCFullYear(), d.getUTCMonth());
  });
  const [cal, setCal] = useState<Map<string, CalDay>>(new Map());
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState<string>('');

  // Fetch availability for the visible window (this month + next two) whenever the
  // view or listing changes; merge into the running map so navigation is instant
  // for months already seen.
  useEffect(() => {
    if (!listingId) return;
    const startDate = toISO(view);
    const endDate = toISO(addMonths(view, 3));
    let active = true;
    setLoading(true);
    try {
      const fn = httpsCallable(getFunctions(), 'getHostawayCalendar');
      fn({ listingId, startDate, endDate })
        .then((res) => {
          if (!active) return;
          const days = (res as { data: { days: CalDay[] } }).data.days || [];
          setCal((prev) => {
            const next = new Map(prev);
            days.forEach((d) => next.set(d.date, d));
            return next;
          });
        })
        .catch((err: unknown) => console.error('getHostawayCalendar failed:', err))
        .finally(() => { if (active) setLoading(false); });
    } catch (err) {
      console.error('getHostawayCalendar init failed:', err);
      setLoading(false);
    }
    return () => { active = false; };
  }, [listingId, view]);

  const dayState = useCallback(
    (iso: string) => {
      const past = iso < today;
      const entry = cal.get(iso);
      const known = entry !== undefined;
      const blocked = known ? !entry!.available : false;
      const disabled = past || (known && blocked);
      return { past, known, blocked, disabled, price: entry?.price ?? null };
    },
    [cal, today],
  );

  // Every night in [from, to) must be available for the range to be selectable.
  const rangeOpen = useCallback(
    (from: string, to: string) => {
      for (let c = from; c < to; c = addDaysISO(c, 1)) {
        const e = cal.get(c);
        if (!e || !e.available) return false;
      }
      return true;
    },
    [cal],
  );

  const onDay = useCallback(
    (iso: string) => {
      const { disabled } = dayState(iso);
      if (disabled) return;
      // Start a new range, or extend to a valid check-out.
      if (!checkIn || (checkIn && checkOut) || iso <= checkIn) {
        onChange(iso, '');
        return;
      }
      if (rangeOpen(checkIn, iso)) {
        onChange(checkIn, iso);
      } else {
        onChange(iso, ''); // range crosses a blocked night → restart from here
      }
    },
    [checkIn, checkOut, dayState, rangeOpen, onChange],
  );

  const inRange = (iso: string) => {
    const end = checkOut || (checkIn && hover > checkIn ? hover : '');
    return checkIn && end && iso > checkIn && iso < end;
  };

  const renderMonth = (base: Date) => {
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth();
    const first = monthStartUTC(y, m);
    const leading = first.getUTCDay(); // 0=Sun
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(Date.UTC(y, m, d))));
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div className="w-full">
        <div className="text-center font-cinzel text-[#f3e5ab] text-xs uppercase tracking-[0.3em] mb-3">
          {MONTHS[language][m]} {y}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {WEEKDAYS[language].map((w, i) => (
            <div key={`wd-${i}`} className="text-center text-[9px] font-cinzel uppercase tracking-widest text-neutral-500 pb-1">
              {w}
            </div>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <div key={`e-${i}`} />;
            const { disabled, blocked } = dayState(iso);
            const isCI = iso === checkIn;
            const isCO = iso === checkOut;
            const isEdge = isCI || isCO;
            const ranged = inRange(iso);
            const dayNum = Number(iso.slice(8, 10));
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => onDay(iso)}
                onMouseEnter={() => setHover(iso)}
                aria-label={iso}
                className={[
                  'relative h-9 text-[13px] font-lato flex items-center justify-center transition-colors',
                  ranged ? 'bg-[#c5a059]/18' : '',
                  isEdge ? 'bg-[#c5a059] text-[#18181b] font-semibold rounded-full' : '',
                  !isEdge && !disabled ? 'text-neutral-100 hover:bg-[#c5a059]/25 rounded-full' : '',
                  disabled && blocked ? 'text-neutral-600 line-through decoration-[#c5a059]/40' : '',
                  disabled && !blocked ? 'text-neutral-700' : '',
                  disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const canGoPrev = toISO(view) > monthStartUTC(new Date().getUTCFullYear(), new Date().getUTCMonth()).toISOString().slice(0, 10);

  return (
    <div className="w-full select-none" onMouseLeave={() => setHover('')}>
      {/* Nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => canGoPrev && setView(addMonths(view, -1))}
          disabled={!canGoPrev}
          aria-label={t('Previous month', 'Mois précédent')}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-white/15 text-neutral-300 hover:border-[#c5a059] hover:text-[#f3e5ab] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ‹
        </button>
        <span className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-[#c5a059]">
          {loading ? t('Loading…', 'Chargement…') : t('Select your dates', 'Choisissez vos dates')}
        </span>
        <button
          type="button"
          onClick={() => setView(addMonths(view, 1))}
          aria-label={t('Next month', 'Mois suivant')}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-white/15 text-neutral-300 hover:border-[#c5a059] hover:text-[#f3e5ab] transition-colors"
        >
          ›
        </button>
      </div>

      {/* One month on mobile, two on desktop */}
      <div className="flex gap-8">
        {renderMonth(view)}
        <div className="hidden md:block w-full">{renderMonth(addMonths(view, 1))}</div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[9px] font-cinzel uppercase tracking-widest text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-[#c5a059]" /> {t('Selected', 'Choisi')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="line-through decoration-[#c5a059]/50 text-neutral-600">15</span> {t('Unavailable', 'Indisponible')}
        </span>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
