// Boutique : les produits de l'artiste (disques, affiches, billets de
// soutien) en cartes de verre. Le Salon ne tient aucun panier : chaque
// carte mène au lien de paiement que l'artiste a créé chez Stripe, Square
// ou Zeffy, et un produit vendu garde sa place avec un ruban « Vendu ».

import * as React from 'react';
import { lienPaiementValide, type ProduitEspace } from '../../types';
import { useTexte } from '../shared';
import { sectionVisible, SectionShell, SectionTitle, type SectionProps } from './common';

function prixTexte(prix?: number): string | null {
    if (prix === undefined || prix === null || !Number.isFinite(prix)) return null;
    const arrondi = Math.round(prix * 100) / 100;
    return `${Number.isInteger(arrondi) ? arrondi : arrondi.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`;
}

const CarteProduit: React.FC<{ produit: ProduitEspace; language: 'EN' | 'FR'; rang: number }> = ({ produit, language, rang }) => {
    const t = useTexte(language);
    const prix = prixTexte(produit.prix);
    const achetable = !produit.vendu && lienPaiementValide(produit.lien);
    return (
        <article
            className="es-verre group relative overflow-hidden flex flex-col es-monte"
            style={{ animationDelay: `${Math.min(rang, 6) * 90}ms` }}
        >
            <div className="relative aspect-square overflow-hidden bg-[color:var(--es-bg-2)]">
                {produit.photo?.url ? (
                    <img
                        src={produit.photo.url}
                        alt={produit.nom}
                        loading="lazy"
                        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${produit.vendu ? 'grayscale opacity-70' : ''}`}
                    />
                ) : (
                    <div aria-hidden className="absolute inset-0 flex items-center justify-center bg-[color:var(--es-tint)]">
                        <span className="es-display text-7xl text-[color:var(--es-accent)]">{produit.nom.slice(0, 1)}</span>
                    </div>
                )}
                {produit.vendu && (
                    <div className="absolute top-6 -right-12 rotate-45 w-48 py-1.5 text-center bg-[color:var(--es-accent)] text-[color:var(--es-accent-ink)] es-label text-[13px] uppercase tracking-[0.3em] shadow-lg">
                        {t('Sold', 'Vendu')}
                    </div>
                )}
            </div>
            <div className="flex-1 flex flex-col p-5 md:p-6">
                <h3 className="es-display text-xl md:text-2xl leading-tight text-[color:var(--es-ink)] line-clamp-2">{produit.nom}</h3>
                {produit.description && (
                    <p className="es-body text-[15px] leading-relaxed text-[color:var(--es-ink-2)] mt-2 line-clamp-3">{produit.description}</p>
                )}
                <div className="mt-auto pt-5 flex items-center justify-between gap-4">
                    {achetable ? (
                        <a
                            href={produit.lien}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label={t(`Order ${produit.nom}`, `Commander ${produit.nom}`)}
                            className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-[color:var(--es-accent)] text-[color:var(--es-accent-ink)] es-label text-[13px] uppercase tracking-[0.2em] hover:brightness-110 transition"
                        >
                            {prix ?? t('Buy', 'Acheter')}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                                <path d="M7 17 17 7" />
                                <path d="M7 7h10v10" />
                            </svg>
                        </a>
                    ) : (
                        prix && <span className={`es-label text-[15px] tracking-[0.15em] text-[color:var(--es-ink-2)] ${produit.vendu ? 'line-through' : ''}`}>{prix}</span>
                    )}
                </div>
            </div>
        </article>
    );
};

export const BoutiqueSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const produits = config.produits ?? [];
    if (!sectionVisible(config, 'boutique') || produits.length === 0) return null;
    return (
        <SectionShell eyebrowEn="Shop" eyebrowFr="Boutique" language={language} id="boutique" tone="graphite">
            <SectionTitle>{t('Take the music home', 'La musique chez vous')}</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {produits.map((p, i) => <CarteProduit key={p.id} produit={p} language={language} rang={i} />)}
            </div>
        </SectionShell>
    );
};
