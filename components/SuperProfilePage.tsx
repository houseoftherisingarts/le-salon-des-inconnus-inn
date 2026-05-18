// SuperProfilePage — public, fullscreen, borderless artist portfolio at
// /{username}. Resolves the slug to a uid, loads the config doc, dispatches
// to the medium-specific template.
//
// Mounted as a top-level "view" from App.tsx — no SiteHeader, no music
// controls, no cookie chrome below. The page intentionally owns the entire
// viewport: visiting /{name} should feel like walking into the artist's
// room, not the Salon with a banner on top.

import React, { useEffect, useState } from 'react';
import { getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, getDoc } from 'firebase/firestore';
import type {
    SuperProfileConfig,
} from '@inconnus/ui';
import {
    PhotoTemplate, VisualArtTemplate, EditorialTemplate,
    resolveSlugToUid,
} from '@inconnus/ui';

interface SuperProfilePageProps {
    /** The slug from the URL — already normalized to lowercase by App.tsx. */
    slug: string;
    /** Click-to-go-home handler (back to the Inn). */
    onNavigateHome: () => void;
}

type LoadState =
    | { kind: 'loading' }
    | { kind: 'not-found' }
    | { kind: 'disabled' }
    | { kind: 'ready'; uid: string; config: SuperProfileConfig; displayName: string | null };

export const SuperProfilePage: React.FC<SuperProfilePageProps> = ({ slug, onNavigateHome }) => {
    const [state, setState] = useState<LoadState>({ kind: 'loading' });

    useEffect(() => {
        let unsub: (() => void) | null = null;
        let cancelled = false;
        (async () => {
            const uid = await resolveSlugToUid(slug);
            if (cancelled) return;
            if (!uid) {
                setState({ kind: 'not-found' });
                return;
            }
            const db = getFirestore(getApp());
            // Best-effort fetch of the member's displayName (fallback for the
            // template). We don't fail loading the page if this 404s.
            let displayName: string | null = null;
            try {
                const memberSnap = await getDoc(doc(db, 'members', uid));
                if (memberSnap.exists()) {
                    const d = memberSnap.data() as any;
                    displayName = d?.displayName ?? d?.name ?? null;
                }
            } catch { /* ignore */ }
            unsub = onSnapshot(
                doc(db, 'members', uid, 'superProfile', 'config'),
                (snap) => {
                    if (cancelled) return;
                    if (!snap.exists()) {
                        setState({ kind: 'not-found' });
                        return;
                    }
                    const data = snap.data() as SuperProfileConfig;
                    if (!data.enabled) {
                        setState({ kind: 'disabled' });
                        return;
                    }
                    setState({
                        kind: 'ready',
                        uid,
                        config: {
                            enabled: !!data.enabled,
                            username: data.username,
                            medium: data.medium,
                            hero: data.hero,
                            works: Array.isArray(data.works) ? data.works : [],
                            displayName: data.displayName,
                            tagline: data.tagline,
                            bio: data.bio,
                            links: data.links,
                        },
                        displayName,
                    });
                },
                () => {
                    if (!cancelled) setState({ kind: 'not-found' });
                },
            );
        })();
        return () => {
            cancelled = true;
            if (unsub) unsub();
        };
    }, [slug]);

    // Sync document title to the artist's name once we have it.
    useEffect(() => {
        if (state.kind !== 'ready') return;
        const name = state.config.displayName || state.displayName || state.config.username;
        const prev = document.title;
        document.title = `${name} · Le Salon des Inconnus`;
        return () => { document.title = prev; };
    }, [state]);

    if (state.kind === 'loading') {
        return (
            <div className="fixed inset-0 bg-[#050505] z-30 flex items-center justify-center">
                <div className="text-[#d4af37] text-[10px] font-cinzel uppercase tracking-[0.5em] animate-pulse">
                    Le Salon des Inconnus
                </div>
            </div>
        );
    }

    if (state.kind === 'not-found' || state.kind === 'disabled') {
        return (
            <div className="fixed inset-0 bg-[#050505] z-30 flex items-center justify-center px-6 text-center">
                <div>
                    <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] mb-3">
                        Le Salon des Inconnus
                    </p>
                    <h1 className="font-prata text-[#f3e5ab] text-3xl md:text-4xl mb-3">
                        Page not found
                    </h1>
                    <p className="font-lato text-neutral-400 text-sm mb-8 max-w-md mx-auto">
                        We don't have a Super Profile registered at <code className="text-[#c5a059]">/{slug}</code>.
                    </p>
                    <button
                        type="button"
                        onClick={onNavigateHome}
                        className="px-5 py-2.5 border border-white/15 text-neutral-300 font-cinzel text-[11px] uppercase tracking-[0.35em] hover:border-[#c5a059] hover:text-[#f3e5ab] transition-colors"
                    >
                        ← Back to the Inn
                    </button>
                </div>
            </div>
        );
    }

    const { config, displayName } = state;
    switch (config.medium) {
        case 'photo':
            return <PhotoTemplate config={config} fallbackDisplayName={displayName ?? undefined} />;
        case 'visual-art':
            return <VisualArtTemplate config={config} fallbackDisplayName={displayName ?? undefined} />;
        case 'other':
        default:
            return <EditorialTemplate config={config} fallbackDisplayName={displayName ?? undefined} />;
    }
};
