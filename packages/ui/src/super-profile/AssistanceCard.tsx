// AssistanceCard : « Brancher Stripe avec Alex », sous chaque onglet du
// back-office, à côté de la carte Vexel. Trois états : à payer (bouton vers
// Checkout, 80 $ une fois), payée (Alex a reçu l'avis et fixe l'appel),
// appel fait.

import * as React from 'react';
import { ouvrirPaiementAssistance, useAssistance } from './assistance';

export const AssistanceCard: React.FC<{ uid: string; language?: 'EN' | 'FR' }> = ({ uid, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const statut = useAssistance(uid);
    const [ouverture, setOuverture] = React.useState(false);
    const [erreur, setErreur] = React.useState<string | null>(null);

    if (statut === null) return null;

    const payer = async () => {
        setOuverture(true);
        setErreur(null);
        try {
            const r = await ouvrirPaiementAssistance();
            if (r.url) window.location.assign(r.url);
        } catch {
            setErreur(t('Stripe did not open. Try again in a moment.', 'Stripe ne s’est pas ouvert. Réessayez dans un instant.'));
        } finally {
            setOuverture(false);
        }
    };

    const ETIQUETTE: Record<typeof statut, { en: string; fr: string }> = {
        'a-payer': { en: 'To book', fr: 'À payer' },
        payee: { en: 'Paid', fr: 'Payée' },
        'appel-fait': { en: 'Call done', fr: 'Appel fait' },
    };

    return (
        <div className="mt-6 p-6 md:p-8 bg-black/30 border border-white/10 rounded-[15px]" data-assistance={statut}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="font-prata text-[#f3e5ab] text-xl md:text-2xl">{t('Set up Stripe with Alex', 'Brancher Stripe avec Alex')}</h3>
                <span className={`px-3 py-1 rounded-full font-cinzel text-[13px] uppercase tracking-[0.2em] border ${
                    statut === 'a-payer' ? 'border-white/15 text-neutral-300' : 'border-[#c5a059]/60 text-[#c5a059]'
                }`}>
                    {language === 'FR' ? ETIQUETTE[statut].fr : ETIQUETTE[statut].en}
                </span>
            </div>
            {statut === 'a-payer' && (
                <>
                    <p className="font-lato text-neutral-300 text-sm md:text-base leading-relaxed max-w-2xl">
                        {t(
                            'Your shop sells through Stripe payment links. Alex sets them up with you on a one-on-one call, your account open in front of you, and you leave with a shop that takes payments. 80 dollars, once.',
                            'Votre boutique vend par des liens de paiement Stripe. Alex les branche avec vous lors d’un appel en tête-à-tête, votre compte ouvert devant vous, et vous repartez avec une boutique qui encaisse. 80 $, une seule fois.',
                        )}
                    </p>
                    <button
                        type="button"
                        onClick={payer}
                        disabled={ouverture}
                        className="mt-5 min-h-[44px] px-6 py-3 bg-[#c5a059] text-[#050505] font-cinzel text-[13px] uppercase tracking-[0.3em] hover:bg-[#d4b06a] disabled:opacity-50 transition-colors rounded-[15px]"
                    >
                        {ouverture ? t('Opening…', 'Ouverture…') : t('Book the call · 80 $', 'Réserver l’appel · 80 $')}
                    </button>
                    {erreur && <p role="alert" className="text-sm text-rose-300 font-lato mt-3">{erreur}</p>}
                </>
            )}
            {statut === 'payee' && (
                <p className="font-lato text-neutral-300 text-sm md:text-base leading-relaxed max-w-2xl">
                    {t(
                        'Your call is paid. Alex has the notice and will reach out to set the time that suits you.',
                        'Votre appel est payé. Alex en a reçu l’avis et vous contactera pour fixer le moment qui vous convient.',
                    )}
                </p>
            )}
            {statut === 'appel-fait' && (
                <p className="font-lato text-neutral-300 text-sm md:text-base leading-relaxed max-w-2xl">
                    {t(
                        'The call is done and your payment links are set up. For any touch-up, write to alex@lesalondesinconnus.com.',
                        'L’appel est fait et vos liens de paiement sont branchés. Pour toute retouche, écrivez à alex@lesalondesinconnus.com.',
                    )}
                </p>
            )}
        </div>
    );
};
