// Ecoute : les liens d'écoute (Spotify, YouTube, Bandcamp, SoundCloud) en
// lecteur embarqué. La sécurité tient dans l'allowlist stricte des domaines
// qui peuvent finir dans un <iframe> : tout ce qui ne correspond à aucun des
// quatre devient un simple lien, jamais un cadre ouvert sur n'importe quoi.

import * as React from 'react';
import type { LienEcoute } from '../../types';
import { useTexte } from '../shared';
import { CARD_GLASS, sectionVisible, SectionShell, SectionTitle, type SectionProps } from './common';

type Embed = { kind: 'iframe'; src: string; titre: string } | { kind: 'lien' };

const HOTES_AUTORISES = ['open.spotify.com', 'www.youtube.com', 'www.youtube-nocookie.com', 'bandcamp.com', 'w.soundcloud.com'];

function idYoutube(u: URL): string | null {
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (u.hostname.endsWith('youtube.com')) {
        if (u.pathname === '/watch') return u.searchParams.get('v');
        if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] ?? null;
        if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] ?? null;
    }
    return null;
}

/** Traduit un lien d'écoute en source d'iframe, uniquement pour les quatre
 *  plateformes reconnues. N'importe quel autre domaine redevient un lien. */
function resolveEmbed(raw: string): Embed {
    let u: URL;
    try {
        u = new URL(raw);
    } catch {
        return { kind: 'lien' };
    }
    if (u.protocol !== 'https:') return { kind: 'lien' };

    if (u.hostname === 'open.spotify.com') {
        const parts = u.pathname.split('/').filter(Boolean);
        // /track/ID, /album/ID, /playlist/ID, /artist/ID ou déjà /embed/track/ID
        const i = parts[0] === 'embed' ? 1 : 0;
        const type = parts[i];
        const id = parts[i + 1];
        if (type && id) return { kind: 'iframe', src: `https://open.spotify.com/embed/${type}/${id}`, titre: 'Spotify' };
        return { kind: 'lien' };
    }

    if (u.hostname.endsWith('youtube.com') || u.hostname === 'youtu.be') {
        const id = idYoutube(u);
        if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}`, titre: 'YouTube' };
        return { kind: 'lien' };
    }

    if (u.hostname.endsWith('soundcloud.com')) {
        const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(raw)}&color=%23c5a059&auto_play=false&show_teaser=false&visual=false`;
        return { kind: 'iframe', src, titre: 'SoundCloud' };
    }

    if (u.hostname === 'bandcamp.com' && u.pathname.startsWith('/EmbeddedPlayer/')) {
        return { kind: 'iframe', src: raw, titre: 'Bandcamp' };
    }

    return { kind: 'lien' };
}

const Lecteur: React.FC<{ lien: LienEcoute }> = ({ lien }) => {
    const embed = resolveEmbed(lien.url);
    if (embed.kind === 'iframe') {
        let hoteValide = false;
        try { hoteValide = HOTES_AUTORISES.includes(new URL(embed.src).hostname); } catch { hoteValide = false; }
        if (hoteValide) {
            return (
                <div className={`overflow-hidden ${CARD_GLASS}`}>
                    {lien.titre && (
                        <p className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-neutral-400 px-4 pt-3">
                            {lien.titre}
                        </p>
                    )}
                    <iframe
                        src={embed.src}
                        title={lien.titre || embed.titre}
                        className="w-full border-0"
                        style={{ height: embed.titre === 'YouTube' ? 200 : 152 }}
                        loading="lazy"
                        allow="autoplay; encrypted-media; picture-in-picture"
                    />
                </div>
            );
        }
    }
    return (
        <a
            href={lien.url}
            target="_blank"
            rel="noreferrer noopener"
            className={`flex items-center justify-between px-5 py-4 ${CARD_GLASS} hover:border-[#c5a059]/50 transition-colors`}
        >
            <span className="font-lato text-sm text-neutral-200">{lien.titre || lien.url}</span>
            <span className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-[#c5a059]">↗</span>
        </a>
    );
};

export const EcouteSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const liens = config.ecoute ?? [];
    if (!sectionVisible(config, 'ecoute') || liens.length === 0) return null;
    return (
        <SectionShell eyebrowEn="Listen" eyebrowFr="Écoute" language={language} id="ecoute">
            <SectionTitle>{t('Listen now', 'Écouter maintenant')}</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liens.map((l, i) => <Lecteur key={`${l.url}-${i}`} lien={l} />)}
            </div>
        </SectionShell>
    );
};
