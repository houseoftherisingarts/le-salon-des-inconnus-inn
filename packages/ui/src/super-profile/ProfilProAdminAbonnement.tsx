// ProfilProAdminAbonnement : l'onglet Abonnement. État, prochaine échéance,
// bouton vers le portail client Stripe. Un Profil Pro allumé à la main par
// l'admin (virement Interac, ou geste ponctuel) n'a pas de client Stripe :
// le portail se cache alors plutôt que d'échouer silencieusement.

import * as React from 'react';
import type { AbonnementPro } from './abonnement';
import { ouvrirPortailProfilPro } from './abonnement';

interface ProfilProAdminAbonnementProps {
    abonnement: AbonnementPro | null;
    language?: 'EN' | 'FR';
}

function formaterEcheance(periodeFin: any, language: 'EN' | 'FR'): string | null {
    if (!periodeFin) return null;
    const date = periodeFin.toDate ? periodeFin.toDate() : new Date(periodeFin);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString(language === 'FR' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const ProfilProAdminAbonnement: React.FC<ProfilProAdminAbonnementProps> = ({ abonnement, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [ouverture, setOuverture] = React.useState(false);
    const [erreur, setErreur] = React.useState<string | null>(null);

    const ouvrirPortail = async () => {
        setOuverture(true);
        setErreur(null);
        try {
            const url = await ouvrirPortailProfilPro();
            window.location.href = url;
        } catch {
            setErreur(t('Could not open the billing portal.', 'Impossible d’ouvrir le portail de facturation.'));
        } finally {
            setOuverture(false);
        }
    };

    const libelleStatut = abonnement
        ? { actif: t('Active', 'Actif'), suspendu: t('Suspended', 'Suspendu'), annule: t('Cancelled', 'Annulé') }[abonnement.statut]
        : t('Enabled without billing', 'Activé sans facturation');
    const echeance = formaterEcheance(abonnement?.periodeFin, language);

    return (
        <div className="space-y-8 max-w-xl">
            <div>
                <h3 className="font-prata text-[#f3e5ab] text-2xl mb-2">{t('Subscription', 'Abonnement')}</h3>
                <p className="font-lato text-neutral-400 text-sm">
                    {t('Your Profil Pro plan, 100 dollars a month before tax, cancel anytime from the portal.', 'Votre Profil Pro, 100 $ par mois avant taxes, résiliable en tout temps depuis le portail.')}
                </p>
            </div>

            <div className="p-6 bg-black/30 border border-white/10 rounded-[15px] space-y-3">
                <div className="flex items-center justify-between">
                    <span className="font-cinzel text-[13px] uppercase tracking-[0.25em] text-neutral-500">{t('Status', 'État')}</span>
                    <span className={`font-lato text-sm ${abonnement?.statut === 'actif' || !abonnement ? 'text-[#c5a059]' : 'text-rose-300'}`}>{libelleStatut}</span>
                </div>
                {echeance && (
                    <div className="flex items-center justify-between">
                        <span className="font-cinzel text-[13px] uppercase tracking-[0.25em] text-neutral-500">{t('Next billing', 'Prochaine échéance')}</span>
                        <span className="font-lato text-sm text-[#f3e5ab]">{echeance}</span>
                    </div>
                )}
                {typeof abonnement?.montant === 'number' && (
                    <div className="flex items-center justify-between">
                        <span className="font-cinzel text-[13px] uppercase tracking-[0.25em] text-neutral-500">{t('Amount', 'Montant')}</span>
                        <span className="font-lato text-sm text-[#f3e5ab]">{(abonnement.montant / 100).toLocaleString('fr-CA')} $ / {t('month', 'mois')}</span>
                    </div>
                )}
            </div>

            {abonnement?.stripeCustomerId ? (
                <button
                    type="button"
                    onClick={ouvrirPortail}
                    disabled={ouverture}
                    className="min-h-[44px] px-6 bg-[#c5a059] text-[#050505] font-cinzel text-xs uppercase tracking-[0.3em] hover:bg-[#d4b06a] disabled:opacity-50 transition-colors rounded-[15px]"
                >
                    {ouverture ? t('Opening…', 'Ouverture…') : t('Manage my subscription', 'Gérer mon abonnement')}
                </button>
            ) : (
                <p className="font-lato text-sm text-neutral-500">
                    {t('This Profil Pro was enabled directly, without a card subscription.', 'Ce Profil Pro a été activé directement, sans abonnement par carte.')}
                </p>
            )}
            {erreur && <p role="alert" className="text-sm text-rose-300 font-lato">{erreur}</p>}
        </div>
    );
};
