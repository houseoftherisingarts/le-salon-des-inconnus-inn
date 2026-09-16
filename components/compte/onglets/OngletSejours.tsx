import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { sendEmailVerification } from 'firebase/auth';
import type { MemberProfile } from '../../AuthModal';
import { lireSejours, lierReservation, type Sejour, type StatutSejour } from '../donnees/sejours';
import { CouponCommunaute } from '../deplaces/CouponCommunaute';
import { DeHebdomadaire } from '../deplaces/DeHebdomadaire';

interface OngletSejoursProps {
  user: User;
  memberProfile: MemberProfile;
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
}

const LIBELLES_STATUT: Record<StatutSejour, { fr: string; en: string }> = {
  confirmed: { fr: 'Confirmé', en: 'Confirmed' },
  pending: { fr: 'En attente', en: 'Pending' },
  checked_in: { fr: 'Sur place', en: 'Checked in' },
  checked_out: { fr: 'Terminé', en: 'Completed' },
  cancelled: { fr: 'Annulé', en: 'Cancelled' },
};

const formaterDate = (iso: string, language: 'EN' | 'FR') => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(language === 'FR' ? 'fr-CA' : 'en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

const montant = (v: number, devise: string) => `${v.toFixed(2)} ${devise}`;

export const OngletSejours: React.FC<OngletSejoursProps> = ({ user, memberProfile, language, onNavigate }) => {
  const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
  const [sejours, setSejours] = useState<Sejour[] | null>(null);
  const [etat, setEtat] = useState<'chargement' | 'erreur' | 'courriel' | 'pret'>('chargement');

  const courriel = user.email || memberProfile.email || '';

  useEffect(() => {
    let actif = true;
    lireSejours()
      .then((r) => { if (actif) { setSejours(r.sejours); setEtat('pret'); } })
      .catch((e: any) => {
        if (!actif) return;
        const message = String(e?.message ?? '');
        if (message.includes('courriel-non-verifie')) {
          sendEmailVerification(user).catch(() => {});
          setEtat('courriel');
        } else if (message.includes('hostaway-indisponible')) {
          setEtat('erreur');
        } else {
          setEtat('erreur');
        }
      });
    return () => { actif = false; };
  }, [user]);

  // ── Liaison d'une réservation ─────────────────────────────────────────────
  const [code, setCode] = useState('');
  const [arrivee, setArrivee] = useState('');
  const [liaisonEnCours, setLiaisonEnCours] = useState(false);
  const [liaisonEtat, setLiaisonEtat] = useState<'idle' | 'succes' | 'echec' | 'limite' | 'pris'>('idle');

  const rattacher = async () => {
    if (!code.trim() || !arrivee || liaisonEnCours) return;
    setLiaisonEnCours(true);
    setLiaisonEtat('idle');
    try {
      const r = await lierReservation(code.trim(), arrivee);
      if (r.lie) {
        setLiaisonEtat('succes');
        setCode('');
        setArrivee('');
        const relu = await lireSejours();
        setSejours(relu.sejours);
      } else {
        setLiaisonEtat('echec');
      }
    } catch (e: any) {
      const message = String(e?.message ?? '');
      if (message.includes('already-exists')) setLiaisonEtat('pris');
      else if (message.includes('resource-exhausted')) setLiaisonEtat('limite');
      else setLiaisonEtat('echec');
    } finally {
      setLiaisonEnCours(false);
    }
  };

  const carte = 'rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 lg:p-9 transition-colors duration-200 hover:border-[#c5a059]/40';
  const surtitre = 'font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c5a059] mb-4 flex items-center gap-2';

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const aVenir = (sejours ?? [])
    .filter((s) => s.statut !== 'cancelled' && s.depart >= aujourdhui)
    .sort((a, b) => a.arrivee.localeCompare(b.arrivee));
  const passes = (sejours ?? [])
    .filter((s) => s.statut === 'cancelled' || s.depart < aujourdhui)
    .sort((a, b) => b.depart.localeCompare(a.depart));

  const vide = sejours !== null && sejours.length === 0;

  const renderCarte = (s: Sejour) => {
    const statut = LIBELLES_STATUT[s.statut];
    const nuitsLibelle = s.nuits === 1
      ? t('night', 'nuit')
      : t('nights', 'nuits');
    const voyageursLibelle = s.voyageurs === 1
      ? t('guest', 'voyageur')
      : t('guests', 'voyageurs');
    return (
      <div key={s.id} className="p-5 rounded-xl" style={{ background: 'rgba(20,16,10,0.6)', border: '1px solid rgba(197,160,89,0.18)' }}>
        <div className="flex items-start justify-between gap-4 mb-2">
          <p className="font-prata text-[#f3e5ab] text-base">
            {language === 'FR' ? s.chambreFR : s.chambreEN}
          </p>
          <span className="font-cinzel text-[10px] uppercase tracking-[0.35em] text-neutral-400 shrink-0">
            {language === 'FR' ? statut.fr : statut.en}
          </span>
        </div>
        <p className="font-lato text-neutral-300 text-sm">
          {t(
            `{arrivee} to {depart} · {nuits} ${nuitsLibelle}`,
            `Du {arrivee} au {depart} · {nuits} ${nuitsLibelle}`,
          )
            .replace('{arrivee}', formaterDate(s.arrivee, language))
            .replace('{depart}', formaterDate(s.depart, language))
            .replace('{nuits}', String(s.nuits))}
        </p>
        <p className="font-lato text-neutral-400 text-sm">
          {s.voyageurs} {voyageursLibelle}
        </p>
        {s.canal && (
          <p className="font-lato text-neutral-400 text-sm">
            {t('Booked through {channel}', 'Réservé par {canal}').replace('{channel}', s.canal).replace('{canal}', s.canal)}
          </p>
        )}
        {s.total !== null && (
          <p className="font-lato text-neutral-300 text-sm">
            {t('Total: {amount}', 'Total : {montant}').replace('{amount}', montant(s.total, s.devise)).replace('{montant}', montant(s.total, s.devise))}
          </p>
        )}
        {s.code && (
          <p className="font-lato text-neutral-400 text-sm">
            {t('Code: {code}', 'Code : {code}').replace('{code}', s.code)}
          </p>
        )}
        {s.portail && (
          <a
            href={s.portail}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 rounded-full border border-[#c5a059]/55 bg-[#0a0808]/55 text-[#f3e5ab] font-cinzel uppercase text-[11px] tracking-[0.18em] px-5 py-2 hover:bg-white/5 transition-colors"
          >
            {t('Open the guest portal', 'Ouvrir le portail du voyageur')}
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">

      {/* En-tête */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Your stays', 'Vos séjours')}
        </h3>
        <h2 className="font-prata text-[#f3e5ab] text-[clamp(1.6rem,2.4vw,2.25rem)] leading-[1.1] mb-4">
          {t('Your nights with us', 'Vos nuits chez nous')}
        </h2>
        <p className="font-lato text-neutral-200">
          {t(
            'We find your bookings through your account email, {email}. A booking made through Airbnb or Booking often carries a different email, and you can then attach it with its confirmation code.',
            'Nous retrouvons vos réservations grâce au courriel de votre compte, {courriel}. Une réservation faite par Airbnb ou Booking porte souvent un autre courriel : vous pouvez alors la rattacher avec son code de confirmation.',
          ).replace('{email}', courriel).replace('{courriel}', courriel)}
        </p>
      </div>

      {etat === 'chargement' && (
        <div className="flex items-center gap-3 text-neutral-500 text-sm py-10 px-4">
          <div className="w-4 h-4 border-2 border-neutral-700 border-t-[#c5a059] rounded-full animate-spin" />
          {t('Checking the booking register…', 'Nous consultons le registre des réservations…')}
        </div>
      )}

      {etat === 'erreur' && (
        <div className="font-lato text-neutral-400 text-sm">
          {t('The booking register isn\'t answering right now. Come back in a few minutes.', 'Le registre des réservations ne répond pas pour l\'instant. Revenez dans quelques minutes.')}
        </div>
      )}

      {etat === 'courriel' && (
        <div className="font-lato text-neutral-300 text-sm">
          {t('Your email needs to be confirmed before we can look up your stays. We have just sent you the confirmation link again.', 'Votre courriel doit être confirmé avant que nous puissions chercher vos séjours. Nous venons de vous renvoyer le lien de confirmation.')}
        </div>
      )}

      {etat === 'pret' && (
        <>
          {vide && (
            <div className={carte}>
              <p className="font-lato text-neutral-300 mb-6">
                {t('We haven\'t found a stay under your email yet. If you booked elsewhere, attach your booking just below.', 'Nous ne trouvons encore aucun séjour à votre courriel. Si vous avez réservé ailleurs, rattachez votre réservation juste en dessous.')}
              </p>
              <button
                onClick={() => onNavigate('INN')}
                className="rounded-full border border-[#c5a059]/55 bg-[#0a0808]/55 text-[#f3e5ab] font-cinzel uppercase text-[12px] tracking-[0.18em] px-6 min-h-[48px] hover:bg-white/5 transition-colors"
              >
                {t('Book another stay', 'Réserver un autre séjour')}
              </button>
            </div>
          )}

          {aVenir.length > 0 && (
            <div className={carte}>
              <h3 className={surtitre}>
                <div className="h-px w-10 bg-[#c5a059]" />
                {t('Upcoming', 'À venir')}
              </h3>
              <div className="space-y-3">{aVenir.map(renderCarte)}</div>
            </div>
          )}

          {passes.length > 0 && (
            <div className={carte}>
              <h3 className={surtitre}>
                <div className="h-px w-10 bg-[#c5a059]" />
                {t('Past stays', 'Déjà vécus')}
              </h3>
              <div className="space-y-3">{passes.map(renderCarte)}</div>
            </div>
          )}

          {sejours && sejours.length > 0 && (
            <button
              onClick={() => onNavigate('INN')}
              className="self-start rounded-full border border-[#c5a059]/55 bg-[#0a0808]/55 text-[#f3e5ab] font-cinzel uppercase text-[12px] tracking-[0.18em] px-6 min-h-[48px] hover:bg-white/5 transition-colors"
            >
              {t('Book another stay', 'Réserver un autre séjour')}
            </button>
          )}
        </>
      )}

      {/* Rattacher une réservation */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Attach a booking', 'Rattacher une réservation')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-cinzel text-[10px] uppercase tracking-[0.35em] text-neutral-400 block mb-2">
              {t('Confirmation code', 'Code de confirmation')}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-black/40 text-[#f3e5ab] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c5a059] transition-colors"
              style={{ border: '1px solid rgba(197,160,89,0.3)' }}
            />
          </div>
          <div>
            <label className="font-cinzel text-[10px] uppercase tracking-[0.35em] text-neutral-400 block mb-2">
              {t('Arrival date', "Date d'arrivée")}
            </label>
            <input
              type="date"
              value={arrivee}
              onChange={(e) => setArrivee(e.target.value)}
              className="w-full bg-black/40 text-[#f3e5ab] px-4 py-3 rounded-lg font-josefin text-sm focus:outline-none focus:border-[#c5a059] transition-colors"
              style={{ border: '1px solid rgba(197,160,89,0.3)' }}
            />
          </div>
        </div>
        <button
          onClick={rattacher}
          disabled={liaisonEnCours}
          className="mt-4 rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] px-6 min-h-[48px] hover:bg-[#d4b06a] transition-colors disabled:opacity-40"
        >
          {t('Attach', 'Rattacher')}
        </button>

        {liaisonEtat === 'succes' && (
          <p className="mt-3 font-lato text-emerald-400 text-sm">
            {t('Your stay is now attached to your account.', 'Votre séjour est rattaché à votre compte.')}
          </p>
        )}
        {liaisonEtat === 'echec' && (
          <p className="mt-3 font-lato text-neutral-400 text-sm">
            {t('We can\'t find a booking with that code on that date. Check both and try again.', 'Nous ne trouvons aucune réservation avec ce code à cette date. Vérifiez les deux et réessayez.')}
          </p>
        )}
        {liaisonEtat === 'limite' && (
          <p className="mt-3 font-lato text-neutral-400 text-sm">
            {t('You\'ve made several attempts today. Write to us in the Help tab and we\'ll attach it for you.', 'Vous avez fait plusieurs essais aujourd\'hui. Écrivez-nous dans l\'onglet Aide et nous le rattacherons pour vous.')}
          </p>
        )}
        {liaisonEtat === 'pris' && (
          <p className="mt-3 font-lato text-neutral-400 text-sm">
            {t('This booking is already attached to another account. Write to us in the Help tab.', 'Cette réservation est déjà rattachée à un autre compte. Écrivez-nous dans l\'onglet Aide.')}
          </p>
        )}
      </div>

      {/* Avantages communauté : coupon + dé */}
      <div className={carte}>
        <h3 className={surtitre}>
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Community perks', 'Avantages communauté')}
        </h3>
        <div className="flex flex-col gap-6">
          <CouponCommunaute language={language} />
          <DeHebdomadaire language={language} user={user} />
        </div>
      </div>

    </div>
  );
};
