// Pieces shared across all three Super Profile templates.

import * as React from 'react';
import type { SuperProfileConfig, SuperProfileLinks } from '../types';

interface BackLinkProps {
    href?: string;
}

/** Subtle "← Le Salon des Inconnus" anchor pinned to the corner of the page. */
export const BackToSalonLink: React.FC<BackLinkProps> = ({ href = '/centre' }) => (
    <a
        href={href}
        className="fixed top-4 left-4 z-50 inline-flex items-center min-h-[44px] px-4 rounded-full bg-black/45 backdrop-blur-md border border-white/10 font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-300 hover:text-[#c5a059] hover:border-[#c5a059]/50 transition-colors"
    >
        ← Le Salon des Inconnus
    </a>
);

interface SocialLinksProps {
    links?: SuperProfileLinks;
    accent?: string;
    className?: string;
}

const ICONS = {
    instagram: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
    ),
    website: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3a14 14 0 0 1 0 18" />
            <path d="M12 3a14 14 0 0 0 0 18" />
        </svg>
    ),
    buy: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M6 7h12l-1.5 12.5a2 2 0 0 1-2 1.5h-5a2 2 0 0 1-2-1.5L6 7z" />
            <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </svg>
    ),
    booking: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
    ),
};

export const SocialLinks: React.FC<SocialLinksProps> = ({ links, accent = '#c5a059', className }) => {
    if (!links) return null;
    const entries: Array<[keyof SuperProfileLinks, string]> = [];
    if (links.instagram) entries.push(['instagram', links.instagram]);
    if (links.website) entries.push(['website', links.website]);
    if (links.buy) entries.push(['buy', links.buy]);
    if (links.booking) entries.push(['booking', links.booking]);
    if (entries.length === 0) return null;
    return (
        <div className={`flex items-center gap-4 ${className ?? ''}`}>
            {entries.map(([kind, url]) => (
                <a
                    key={kind}
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={kind}
                    className="text-neutral-400 hover:text-[var(--accent)] transition-colors"
                    style={{ ['--accent' as any]: accent }}
                >
                    {ICONS[kind]}
                </a>
            ))}
        </div>
    );
};

export interface TemplateProps {
    config: SuperProfileConfig;
    /** uid du membre : les sections Profil Pro (rendez-vous, contact) en ont
     *  besoin pour lire son agenda et écrire dans ses collections. Optionnel
     *  pour ne rien casser sur un ancien appel de PhotoTemplate/etc sans uid. */
    uid?: string;
    /** Auth-display fallback when config.displayName is missing. */
    fallbackDisplayName?: string;
    /** Langue de la page publique. Le français d'abord : FR par défaut. */
    language?: 'EN' | 'FR';
}

/** Le patron bilingue du studio : `t('anglais', 'français')`. */
export function useTexte(language: 'EN' | 'FR' = 'FR') {
    return (en: string, fr: string) => (language === 'FR' ? fr : en);
}

/**
 * The artist's cutout, sized + positioned to behave like a foreground bust.
 * Templates pass a `className` for sizing; we keep the styling minimal so it
 * composes well.
 */
export const ArtistCutout: React.FC<{
    src?: string;
    alt: string;
    className?: string;
}> = ({ src, alt, className }) => {
    if (!src) {
        return (
            <div className={`flex items-center justify-center text-neutral-700 font-cinzel text-[13px] uppercase tracking-[0.3em] ${className ?? ''}`}>
                {alt}
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            className={`object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.7)] pointer-events-none ${className ?? ''}`}
            style={{ imageRendering: 'auto' }}
            draggable={false}
        />
    );
};
