// DomaineAdmin : l'onglet Domaine du back-office du Profil Pro. Explique la
// procédure en trois gestes, honnêtement : le Salon (Alex) branche le
// domaine dans la console Firebase, et c'est CETTE console qui produit les
// enregistrements DNS exacts. Personne n'invente ces valeurs à l'avance :
// les inventer serait donner un numéro d'enregistrement qui ne fonctionnera
// jamais.

import * as React from 'react';
import {
    domaineDe, normaliserHostname, reserverDomaine, retirerDomaine, validerHostname,
    type DomaineClaim,
} from './domaines';

interface DomaineAdminProps {
    uid: string;
    slug: string;
    language?: 'EN' | 'FR';
}

const CHAMP = 'w-full bg-black/40 border border-white/15 rounded-[15px] px-4 py-3 text-[#f3e5ab] placeholder-neutral-500 outline-none transition-colors focus:border-[#c5a059] font-lato';

const Etape: React.FC<{ numero: number; titre: string; children: React.ReactNode }> = ({ numero, titre, children }) => (
    <div className="flex gap-4">
        <div className="shrink-0 w-9 h-9 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/40 text-[#c5a059] font-cinzel text-sm flex items-center justify-center">
            {numero}
        </div>
        <div>
            <p className="font-prata text-[#f3e5ab] text-lg mb-1">{titre}</p>
            <div className="font-lato text-sm text-neutral-400 leading-relaxed">{children}</div>
        </div>
    </div>
);

export const DomaineAdmin: React.FC<DomaineAdminProps> = ({ uid, slug, language = 'FR' }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [chargement, setChargement] = React.useState(true);
    const [domaine, setDomaine] = React.useState<{ hostname: string; claim: DomaineClaim } | null>(null);
    const [saisie, setSaisie] = React.useState('');
    const [enregistrement, setEnregistrement] = React.useState(false);
    const [erreur, setErreur] = React.useState<string | null>(null);

    const charger = React.useCallback(async () => {
        setChargement(true);
        try {
            const d = await domaineDe(uid);
            setDomaine(d);
            setSaisie(d?.hostname ?? '');
        } finally {
            setChargement(false);
        }
    }, [uid]);

    React.useEffect(() => { void charger(); }, [charger]);

    const enregistrer = async () => {
        setErreur(null);
        const v = validerHostname(saisie);
        if (!v.ok) {
            setErreur({
                vide: t('Enter a domain.', 'Entrez un domaine.'),
                invalide: t('This does not look like a domain (example: your-name.com).', 'Ceci ne ressemble pas à un domaine (exemple : votre-nom.com).'),
                reserve: t('This domain belongs to the Salon and cannot be claimed.', 'Ce domaine appartient au Salon et ne peut pas être réservé.'),
            }[v.reason]);
            return;
        }
        setEnregistrement(true);
        try {
            await reserverDomaine(uid, slug, saisie);
            await charger();
        } catch (e: any) {
            setErreur(e?.message || t('Could not save this domain.', 'Impossible d’enregistrer ce domaine.'));
        } finally {
            setEnregistrement(false);
        }
    };

    const retirer = async () => {
        if (!domaine) return;
        setEnregistrement(true);
        try {
            await retirerDomaine(uid, domaine.hostname);
            await charger();
        } finally {
            setEnregistrement(false);
        }
    };

    if (chargement) {
        return <p className="font-lato text-neutral-500 text-sm">{t('Loading…', 'Chargement…')}</p>;
    }

    return (
        <div className="space-y-10 max-w-2xl">
            <div>
                <h3 className="font-prata text-[#f3e5ab] text-2xl mb-2">{t('Your own domain', 'Votre propre nom de domaine')}</h3>
                <p className="font-lato text-neutral-400 text-sm leading-relaxed">
                    {t(
                        'Point a domain you already own at your Profil Pro page. The Salon handles the technical connection on its side.',
                        'Faites pointer un domaine que vous possédez déjà vers votre page Profil Pro. Le Salon s’occupe du branchement technique de son côté.',
                    )}
                </p>
            </div>

            <div className="space-y-4">
                <label htmlFor="domaine-input" className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-500">
                    {t('Your domain', 'Votre domaine')}
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        id="domaine-input"
                        type="text"
                        value={saisie}
                        onChange={(e) => setSaisie(e.target.value)}
                        placeholder="votre-nom.com"
                        className={CHAMP}
                    />
                    <button
                        type="button"
                        onClick={enregistrer}
                        disabled={enregistrement}
                        className="shrink-0 min-h-[44px] px-6 bg-[#c5a059] text-[#050505] font-cinzel text-xs uppercase tracking-[0.3em] hover:bg-[#d4b06a] disabled:opacity-50 transition-colors rounded-[15px]"
                    >
                        {domaine ? t('Update', 'Mettre à jour') : t('Reserve', 'Réserver')}
                    </button>
                </div>
                {erreur && <p role="alert" className="text-sm text-rose-300 font-lato">{erreur}</p>}
            </div>

            {domaine && (
                <div className="p-5 bg-black/40 border border-white/15 rounded-[15px] flex items-center justify-between gap-4">
                    <div>
                        <p className="font-lato text-[#f3e5ab]">{domaine.hostname}</p>
                        <p className="font-cinzel text-[13px] uppercase tracking-[0.3em] mt-1 text-neutral-500">
                            {domaine.claim.verifie
                                ? t('Connected', 'Branché')
                                : t('Waiting for the Salon to connect it', 'En attente du branchement par le Salon')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={retirer}
                        disabled={enregistrement}
                        className="text-neutral-500 hover:text-rose-300 font-cinzel text-[13px] uppercase tracking-[0.3em] transition-colors"
                    >
                        {t('Remove', 'Retirer')}
                    </button>
                </div>
            )}

            <div className="space-y-6 pt-4 border-t border-white/10">
                <Etape numero={1} titre={t('Reserve it here', 'Réservez-le ici')}>
                    {t(
                        'Type the domain above and save it. This tells the Salon which domain to connect for your profile.',
                        'Entrez le domaine ci-dessus et enregistrez-le. Ceci indique au Salon quel domaine brancher pour votre profil.',
                    )}
                </Etape>
                <Etape numero={2} titre={t('The Salon connects it', 'Le Salon le branche')}>
                    {t(
                        'Alex adds your domain to the Salon’s Firebase console. That console then produces the exact DNS records for your registrar, records that only exist once the domain has been added there: nobody can hand them to you in advance. Alex relays them to you as soon as they exist, and the connection is live 24 to 48 hours after your registrar picks them up.',
                        'Alex ajoute votre domaine dans la console Firebase du Salon. C’est cette console qui produit ensuite les enregistrements DNS exacts pour votre registraire, des enregistrements qui n’existent qu’une fois le domaine ajouté là : personne ne peut vous les remettre à l’avance. Alex vous les relaie dès qu’ils existent, et le branchement est actif de 24 à 48 heures après que votre registraire les ait pris en compte.',
                    )}
                </Etape>
                <Etape numero={3} titre={t('It goes live', 'Il s’allume')}>
                    {t(
                        'Once the records have propagated, your domain shows your Profil Pro page directly, with no extra step on your side.',
                        'Une fois les enregistrements propagés, votre domaine affiche directement votre page Profil Pro, sans autre geste de votre part.',
                    )}
                </Etape>
            </div>
        </div>
    );
};
