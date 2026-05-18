// SuperProfileEditor — the panel mounted inside the Creator Studio's
// PROFILE tab for Maestro-tier users. Lets the artist:
//   • toggle their Super Profile on/off
//   • pick (and re-claim) their /{username} slug
//   • upload their hero cutout (transparent PNG or auto-remove)
//   • upload and order portfolio works
//   • edit display name, tagline, bio, social links
//   • preview their /{username} page in a new tab
//
// State flow:
//   • Subscribes to members/{uid}/superProfile/config via onSnapshot — any
//     write from anywhere reflects back here.
//   • Local draft state mirrors the doc; saves are explicit (Save button)
//     for everything except hero/work uploads (those write immediately so
//     the user can iterate without losing intermediate state on a refresh).
//   • Username changes run claimUsername() in a transaction, which also
//     releases the previous slug.

import * as React from 'react';
import { getApp } from 'firebase/app';
import {
    getFirestore, doc, onSnapshot, setDoc, serverTimestamp,
} from 'firebase/firestore';
import {
    getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage';
import {
    validateUsername, slugifyDisplayName, isSlugAvailable,
    claimUsername, releaseUsername,
} from './usernames';
import { HeroPhotoUploader } from './HeroPhotoUploader';
import type {
    SuperProfileConfig, SuperProfileMedium, SuperProfileWork, SuperProfileHeroPhoto,
} from './types';
import { MAX_WORKS, workStoragePath } from './types';

export interface SuperProfileEditorProps {
    uid: string;
    /** Used as the seed for slugifyDisplayName and as a fallback display name. */
    fallbackDisplayName: string | null;
    /**
     * Maestro gating override. When undefined, the editor subscribes to
     * members/{uid}/admin/flags.maestroEnabled itself (firestore.rules
     * already let the owner read their own flags). Pass an explicit
     * boolean only if you've already done that subscription upstream.
     */
    maestroEnabled?: boolean;
    /** Studio language. Phase 1 strings are EN-only inside the panel; the
     *  public page is content-driven so locale's a future concern. */
    language?: 'EN' | 'FR';
}

const MEDIA_OPTIONS: Array<{ id: SuperProfileMedium; label: string; hint: string }> = [
    { id: 'photo',       label: 'Photography', hint: 'Reveal-on-hover layout with your photos as the backdrop.' },
    { id: 'visual-art',  label: 'Visual Art',  hint: 'Interactive stack of cards orbiting your portrait. Painting, illustration, sculpture, mixed media.' },
    { id: 'other',       label: 'Other',       hint: 'Editorial typography + masonry grid. Suits writers, musicians, performers.' },
];

const EMPTY_CONFIG = (uid: string, fallbackName: string | null): SuperProfileConfig => ({
    enabled: false,
    username: slugifyDisplayName(fallbackName) || `artist-${uid.slice(0, 6).toLowerCase()}`,
    medium: 'other',
    works: [],
});

function newWorkId(): string {
    const buf = new Uint8Array(6);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
    else for (let i = 0; i < 6; i++) buf[i] = Math.floor(Math.random() * 256);
    const alpha = 'abcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < buf.length; i++) s += alpha[buf[i] % alpha.length];
    return s + Date.now().toString(36).slice(-4);
}

export const SuperProfileEditor: React.FC<SuperProfileEditorProps> = ({
    uid, fallbackDisplayName, maestroEnabled: maestroEnabledProp,
}) => {
    // When the parent didn't pass an explicit value, subscribe to the flag
    // ourselves. `undefined` means "still loading"; we render a skeleton
    // until the first snapshot arrives so we don't flash the locked notice.
    const [maestroSelfFlag, setMaestroSelfFlag] = React.useState<boolean | undefined>(
        maestroEnabledProp,
    );
    React.useEffect(() => {
        if (typeof maestroEnabledProp === 'boolean') {
            setMaestroSelfFlag(maestroEnabledProp);
            return;
        }
        if (!uid) return;
        const db = getFirestore(getApp());
        const ref = doc(db, 'members', uid, 'admin', 'flags');
        const unsub = onSnapshot(ref, (snap) => {
            const data = snap.data() as { maestroEnabled?: boolean } | undefined;
            setMaestroSelfFlag(data?.maestroEnabled === true);
        }, () => setMaestroSelfFlag(false));
        return unsub;
    }, [uid, maestroEnabledProp]);
    const maestroEnabled = maestroSelfFlag === true;
    const maestroLoading = maestroSelfFlag === undefined;

    // Mirrored from Firestore. `null` while loading.
    const [config, setConfig] = React.useState<SuperProfileConfig | null>(null);
    const [loaded, setLoaded] = React.useState(false);
    // True only when a real config doc exists in Firestore (not the synthesized
    // EMPTY_CONFIG fallback). Used to distinguish "revoked Maestro with prior
    // history" (show paywall) from "never granted Maestro" (show invite).
    const [hasStoredConfig, setHasStoredConfig] = React.useState(false);
    // Local draft for text fields. The hero + works write immediately to
    // Firestore on upload so they're not bound to the draft.
    const [draft, setDraft] = React.useState<SuperProfileConfig | null>(null);
    const [saving, setSaving] = React.useState(false);
    const [savedAt, setSavedAt] = React.useState<number | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    // Username availability state — updated on debounced input.
    const [slugCheck, setSlugCheck] = React.useState<{ slug: string; status: 'idle' | 'checking' | 'ok' | 'taken' | 'invalid' | 'reserved' }>({
        slug: '', status: 'idle',
    });
    // Per-work upload UI
    const [workUploading, setWorkUploading] = React.useState(false);
    const worksInputRef = React.useRef<HTMLInputElement>(null);
    // Bespoke-tier "coming soon" modal — wired but the catalog isn't built
    // yet, so the modal is purely informational for now.
    const [bespokeOpen, setBespokeOpen] = React.useState(false);

    // Subscribe to the config doc. We load it whether Maestro is enabled
    // or not — when it's revoked but the user has a prior config, we need
    // to render the "Resume your subscription" overlay with their previous
    // username so the lockout reads as a paywall, not as "you never had it".
    React.useEffect(() => {
        if (!uid) {
            setConfig(null);
            setLoaded(true);
            return;
        }
        if (maestroLoading) return;
        const db = getFirestore(getApp());
        const ref = doc(db, 'members', uid, 'superProfile', 'config');
        const unsub = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                const data = snap.data() as SuperProfileConfig;
                setConfig({
                    enabled: !!data.enabled,
                    username: data.username || '',
                    medium: (data.medium as SuperProfileMedium) || 'other',
                    hero: data.hero,
                    works: Array.isArray(data.works) ? data.works : [],
                    displayName: data.displayName,
                    tagline: data.tagline,
                    bio: data.bio,
                    links: data.links,
                });
                setHasStoredConfig(true);
            } else {
                setConfig(EMPTY_CONFIG(uid, fallbackDisplayName));
                setHasStoredConfig(false);
            }
            setLoaded(true);
        }, (e) => {
            console.error('SuperProfile config subscribe failed', e);
            setLoaded(true);
        });
        return unsub;
    }, [uid, maestroLoading, fallbackDisplayName]);

    // Reset the local text draft whenever Firestore state changes from
    // outside the panel. The user's in-progress text-field edits live in
    // `draft`; we only seed it from `config` on the first load (or when
    // they cancel an edit).
    React.useEffect(() => {
        if (loaded && config && draft === null) {
            setDraft(config);
        }
    }, [loaded, config, draft]);

    // Debounced username availability check.
    React.useEffect(() => {
        if (!draft) return;
        const slug = (draft.username || '').trim().toLowerCase();
        const v = validateUsername(slug);
        if (v.ok === false) {
            setSlugCheck({
                slug,
                status: v.reason === 'reserved' ? 'reserved' : 'invalid',
            });
            return;
        }
        if (config && slug === config.username) {
            setSlugCheck({ slug, status: 'ok' });
            return;
        }
        setSlugCheck({ slug, status: 'checking' });
        const handle = setTimeout(async () => {
            try {
                const ok = await isSlugAvailable(slug, uid);
                setSlugCheck({ slug, status: ok ? 'ok' : 'taken' });
            } catch (e) {
                console.warn('slug availability check failed', e);
                setSlugCheck({ slug, status: 'idle' });
            }
        }, 400);
        return () => clearTimeout(handle);
    }, [draft?.username, uid, config?.username]);

    // ── Hero photo writes — separate save path so uploads land immediately. ──
    const persistConfigPatch = React.useCallback(
        async (patch: Partial<SuperProfileConfig>) => {
            const db = getFirestore(getApp());
            const ref = doc(db, 'members', uid, 'superProfile', 'config');
            await setDoc(
                ref,
                { ...patch, updatedAt: serverTimestamp() },
                { merge: true },
            );
        },
        [uid],
    );

    const handleHeroChange = async (next: SuperProfileHeroPhoto) => {
        try {
            await persistConfigPatch({ hero: next });
        } catch (e: any) {
            console.error('hero save failed', e);
            setError(e?.message || 'Failed to save hero photo.');
        }
    };

    const handleHeroClear = async () => {
        try {
            await persistConfigPatch({ hero: undefined as any });
        } catch (e: any) {
            console.error('hero clear failed', e);
            setError(e?.message || 'Failed to clear hero.');
        }
    };

    // ── Works upload ───────────────────────────────────────────────────────
    const handleAddWorks = async (files: FileList) => {
        if (!config || !draft) return;
        const remaining = MAX_WORKS - (draft.works?.length ?? 0);
        if (remaining <= 0) {
            setError(`Maximum ${MAX_WORKS} works.`);
            return;
        }
        setWorkUploading(true);
        setError(null);
        try {
            const storage = getStorage(getApp());
            const newWorks: SuperProfileWork[] = [];
            const slice = Array.from(files).slice(0, remaining);
            for (const file of slice) {
                if (!/^image\//.test(file.type)) continue;
                const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
                const id = newWorkId();
                const path = workStoragePath(uid, id, ext);
                const ref = storageRef(storage, path);
                await uploadBytes(ref, file, { contentType: file.type });
                const url = await getDownloadURL(ref);
                newWorks.push({ url, storagePath: path });
            }
            const combined = [...(draft.works ?? []), ...newWorks];
            await persistConfigPatch({ works: combined });
            setDraft(prev => prev ? { ...prev, works: combined } : prev);
        } catch (e: any) {
            console.error('works upload failed', e);
            setError(e?.message || 'Upload failed.');
        } finally {
            setWorkUploading(false);
            if (worksInputRef.current) worksInputRef.current.value = '';
        }
    };

    const handleRemoveWork = async (idx: number) => {
        if (!draft) return;
        const target = draft.works[idx];
        if (!target) return;
        const nextWorks = draft.works.filter((_, i) => i !== idx);
        try {
            await persistConfigPatch({ works: nextWorks });
            setDraft(prev => prev ? { ...prev, works: nextWorks } : prev);
            try {
                const storage = getStorage(getApp());
                await deleteObject(storageRef(storage, target.storagePath));
            } catch { /* idempotent */ }
        } catch (e: any) {
            console.error('work remove failed', e);
            setError(e?.message || 'Failed to remove.');
        }
    };

    const moveWork = async (idx: number, dir: -1 | 1) => {
        if (!draft) return;
        const j = idx + dir;
        if (j < 0 || j >= draft.works.length) return;
        const next = [...draft.works];
        [next[idx], next[j]] = [next[j], next[idx]];
        try {
            await persistConfigPatch({ works: next });
            setDraft(prev => prev ? { ...prev, works: next } : prev);
        } catch (e: any) {
            console.error('reorder failed', e);
        }
    };

    // ── Top-level save (handles username + the rest of the text fields) ──
    const handleSave = async () => {
        if (!draft) return;
        setError(null);
        const slug = (draft.username || '').trim().toLowerCase();
        const v = validateUsername(slug);
        if (v.ok === false) {
            setError(usernameReasonCopy(v.reason));
            return;
        }
        setSaving(true);
        try {
            // Claim slug first — if it fails we don't write the config so
            // the username field reflects whatever's still in Firestore.
            if (!config || slug !== config.username) {
                if (slugCheck.status === 'taken') {
                    throw new Error('Username already taken.');
                }
                await claimUsername(uid, slug, config?.username || null);
            }
            await persistConfigPatch({
                enabled: !!draft.enabled,
                username: slug,
                medium: draft.medium,
                displayName: draft.displayName,
                tagline: draft.tagline,
                bio: draft.bio,
                links: draft.links,
            });
            setSavedAt(Date.now());
            window.setTimeout(() => setSavedAt(null), 2400);
        } catch (e: any) {
            console.error('SuperProfile save failed', e);
            setError(e?.message || 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    const handleDisable = async () => {
        if (!config || !draft) return;
        setSaving(true);
        try {
            await persistConfigPatch({ enabled: false });
            // Release the username slot so it's reusable.
            if (config.username) {
                try { await releaseUsername(uid, config.username); } catch { /* ignore */ }
            }
            setDraft(prev => prev ? { ...prev, enabled: false } : prev);
            setSavedAt(Date.now());
        } catch (e: any) {
            console.error('disable failed', e);
            setError(e?.message || 'Failed to disable.');
        } finally {
            setSaving(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────
    if (maestroLoading || !loaded) {
        return null; // Don't flash either state while flag + config load.
    }

    // Revoked Maestro: the user had a Super Profile but their access was
    // revoked. Show a paywall-style overlay rather than the generic "you
    // never had access" notice. The config doc + username claim stay in
    // Firestore so resuming the subscription restores everything intact.
    if (!maestroEnabled && hasStoredConfig && config) {
        return (
            <section className="relative border border-[#c5a059]/30 bg-gradient-to-br from-[#0a0a0a] via-black/60 to-[#1a1208]/40 p-8 rounded overflow-hidden">
                <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(ellipse at 30% 20%, rgba(197,160,89,0.18), transparent 60%)',
                    }}
                />
                <div className="relative z-10 text-center max-w-md mx-auto py-6">
                    <div className="mx-auto mb-5 w-14 h-14 rounded-full border border-[#c5a059]/40 bg-[#c5a059]/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                            <rect x="5" y="11" width="14" height="9" rx="1.5" />
                            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                    </div>
                    <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] mb-3">
                        Subscription paused
                    </p>
                    <h3 className="font-prata text-[#f3e5ab] text-2xl mb-3">
                        Resume your subscription to unlock
                    </h3>
                    <p className="text-neutral-400 text-sm font-lato leading-relaxed mb-5">
                        Your Mind Palace at{' '}
                        <code className="text-[#c5a059]">/{config.username}</code>{' '}
                        is paused. Your hero photo, works, and writing are kept safely — they'll come right back when you resume.
                    </p>
                    <a
                        href="mailto:alex@lesalondesinconnus.com?subject=Resume%20Maestro%20subscription"
                        className="inline-block px-5 py-2.5 bg-[#c5a059] text-[#18181b] font-cinzel text-[11px] uppercase tracking-[0.35em] hover:bg-[#d4b06a] transition-colors"
                    >
                        Resume access
                    </a>
                </div>

                {/* Frosted, non-interactive preview of the editor underneath
                    so the paywall feels like it's locking something specific
                    rather than rendering a separate page. */}
                <div aria-hidden className="relative z-0 mt-8 grid grid-cols-3 gap-3 opacity-30 blur-[2px] pointer-events-none">
                    {config.hero?.url && (
                        <img src={config.hero.url} alt="" className="col-span-1 rounded aspect-[3/4] object-contain bg-black/30" />
                    )}
                    {(config.works ?? []).slice(0, 6).map((w, i) => (
                        <img key={i} src={w.url} alt="" className="rounded aspect-square object-cover" />
                    ))}
                </div>
            </section>
        );
    }

    // Never granted (or revoked with no prior config) — invite copy.
    if (!maestroEnabled) {
        return (
            <section className="border border-white/10 bg-black/40 p-6 rounded">
                <h3 className="font-cinzel text-[#c5a059] text-xs uppercase tracking-[0.4em] mb-2">
                    Super Profile · Maestro tier
                </h3>
                <p className="text-neutral-400 text-sm font-lato leading-relaxed">
                    Maestro unlocks your <em>Artist Mind Palace</em> at <code>/your-name</code> — a standalone fullscreen portfolio page on our site, designed around your medium. Reach out if you'd like access.
                </p>
            </section>
        );
    }

    if (!loaded || !draft) {
        return (
            <section className="border border-white/10 bg-black/40 p-6 rounded">
                <p className="text-neutral-500 text-sm font-lato">Loading Super Profile…</p>
            </section>
        );
    }

    const slug = (draft.username || '').trim().toLowerCase();
    const slugReady = slugCheck.status === 'ok';
    const slugBlocked = ['invalid', 'reserved', 'taken'].includes(slugCheck.status);
    const previewHref = slugReady && draft.enabled ? `/${slug}` : null;
    const usernameMessage = usernameStatusCopy(slugCheck.status);

    return (
        <section className="border border-[#c5a059]/30 bg-gradient-to-br from-[#0a0a0a] via-black/60 to-[#1a1208]/40 p-6 rounded space-y-6">
            <header className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em]">
                        Maestro · Super Profile
                    </p>
                    <h3 className="font-prata text-[#f3e5ab] text-2xl mt-1">Your /name page</h3>
                    <p className="text-neutral-500 text-xs font-lato mt-2 max-w-xl">
                        A standalone, fullscreen portfolio page at <code className="text-[#c5a059]">/{slug || 'username'}</code>. The layout adapts to your medium.
                    </p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <span className="text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-400">
                        Page {draft.enabled ? 'live' : 'off'}
                    </span>
                    <input
                        type="checkbox"
                        checked={!!draft.enabled}
                        onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                        className="accent-[#c5a059] w-5 h-5"
                    />
                </label>
            </header>

            {/* Username */}
            <div>
                <label className="block text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-400 mb-2">
                    Username
                </label>
                <div className="flex items-center gap-2">
                    <span className="text-neutral-500 font-mono text-sm">/</span>
                    <input
                        type="text"
                        value={draft.username}
                        onChange={(e) => setDraft({
                            ...draft,
                            username: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                        })}
                        placeholder={slugifyDisplayName(fallbackDisplayName) || 'your-name'}
                        className="flex-1 bg-black/50 border border-white/15 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#c5a059] rounded"
                    />
                </div>
                {usernameMessage && (
                    <p className={`text-[11px] mt-1 ${slugBlocked ? 'text-rose-300' : 'text-neutral-400'}`}>
                        {usernameMessage}
                    </p>
                )}
            </div>

            {/* Medium */}
            <div>
                <label className="block text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-400 mb-3">
                    Layout (chosen by medium)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {MEDIA_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setDraft({ ...draft, medium: opt.id })}
                            className={`text-left p-3 border rounded transition-all ${
                                draft.medium === opt.id
                                    ? 'border-[#c5a059] bg-[#c5a059]/10'
                                    : 'border-white/10 hover:border-white/30'
                            }`}
                        >
                            <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-[#f3e5ab] mb-1">
                                {opt.label}
                            </p>
                            <p className="text-[11px] text-neutral-400 font-lato leading-snug">
                                {opt.hint}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Hero photo */}
            <div>
                <label className="block text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-400 mb-3">
                    Hero photo (transparent background)
                </label>
                <HeroPhotoUploader
                    uid={uid}
                    hero={draft.hero}
                    onChange={handleHeroChange}
                    onClear={handleHeroClear}
                />
            </div>

            {/* Works */}
            <div>
                <label className="block text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-400 mb-3">
                    Works ({draft.works.length} / {MAX_WORKS})
                </label>
                <div className="flex flex-wrap gap-3">
                    {draft.works.map((w, i) => (
                        <div key={w.storagePath} className="relative w-24 h-24 border border-white/10 rounded overflow-hidden group">
                            <img src={w.url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => moveWork(i, -1)}
                                        disabled={i === 0}
                                        className="text-[10px] font-cinzel text-white hover:text-[#c5a059] disabled:opacity-30 px-1"
                                    >
                                        ←
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveWork(i, 1)}
                                        disabled={i === draft.works.length - 1}
                                        className="text-[10px] font-cinzel text-white hover:text-[#c5a059] disabled:opacity-30 px-1"
                                    >
                                        →
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveWork(i)}
                                    className="text-[10px] font-cinzel uppercase text-rose-300 hover:text-rose-100"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                    {draft.works.length < MAX_WORKS && (
                        <button
                            type="button"
                            disabled={workUploading}
                            onClick={() => worksInputRef.current?.click()}
                            className="w-24 h-24 border-2 border-dashed border-white/15 rounded text-neutral-500 hover:border-[#c5a059] hover:text-[#c5a059] transition-colors flex items-center justify-center font-cinzel text-[10px] uppercase tracking-widest"
                        >
                            {workUploading ? '…' : '+ Add'}
                        </button>
                    )}
                </div>
                <input
                    ref={worksInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        const fs = e.target.files;
                        if (fs && fs.length > 0) void handleAddWorks(fs);
                    }}
                />
            </div>

            {/* Text fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                    label="Display name"
                    value={draft.displayName ?? ''}
                    placeholder={fallbackDisplayName ?? ''}
                    onChange={(v) => setDraft({ ...draft, displayName: v })}
                />
                <Field
                    label="Tagline"
                    value={draft.tagline ?? ''}
                    placeholder="One short line under your name"
                    maxLength={140}
                    onChange={(v) => setDraft({ ...draft, tagline: v })}
                />
            </div>
            <div>
                <label className="block text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-400 mb-2">
                    Bio
                </label>
                <textarea
                    value={draft.bio ?? ''}
                    onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                    rows={4}
                    maxLength={800}
                    placeholder="A paragraph about your work, your medium, what visitors should know."
                    className="w-full bg-black/50 border border-white/15 px-3 py-2 text-sm text-white font-lato focus:outline-none focus:border-[#c5a059] rounded resize-y"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                    label="Instagram URL"
                    value={draft.links?.instagram ?? ''}
                    placeholder="https://instagram.com/you"
                    onChange={(v) => setDraft({ ...draft, links: { ...draft.links, instagram: v } })}
                />
                <Field
                    label="Website"
                    value={draft.links?.website ?? ''}
                    placeholder="https://yoursite.com"
                    onChange={(v) => setDraft({ ...draft, links: { ...draft.links, website: v } })}
                />
                <Field
                    label="Buy / shop"
                    value={draft.links?.buy ?? ''}
                    placeholder="https://your-store.com"
                    onChange={(v) => setDraft({ ...draft, links: { ...draft.links, buy: v } })}
                />
                <Field
                    label="Booking / contact"
                    value={draft.links?.booking ?? ''}
                    placeholder="https://calendly.com/you"
                    onChange={(v) => setDraft({ ...draft, links: { ...draft.links, booking: v } })}
                />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || slugBlocked}
                    className="px-5 py-2.5 bg-[#c5a059] text-[#18181b] font-cinzel text-[11px] uppercase tracking-[0.35em] hover:bg-[#d4b06a] disabled:opacity-50 transition-colors"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
                {previewHref && (
                    <a
                        href={previewHref}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="px-4 py-2.5 border border-white/15 text-neutral-300 font-cinzel text-[11px] uppercase tracking-[0.35em] hover:border-[#c5a059] hover:text-[#f3e5ab] transition-colors"
                    >
                        View page ↗
                    </a>
                )}
                {draft.enabled && config?.enabled && (
                    <button
                        type="button"
                        onClick={handleDisable}
                        disabled={saving}
                        className="ml-auto px-3 py-2.5 text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-500 hover:text-rose-300 transition-colors"
                    >
                        Disable & release username
                    </button>
                )}
                {savedAt && <span className="text-[11px] text-emerald-400 font-lato">Saved.</span>}
                {error && <span className="text-[11px] text-rose-300 font-lato">{error}</span>}
            </div>

            {/* Bespoke-tier upsell — placeholder for the eventual "Alex
                designs your portfolio from a catalog" upgrade. Wired now
                so the entry point is discoverable; the catalog UI ships in
                a later phase. */}
            <div className="pt-6 border-t border-white/5">
                <button
                    type="button"
                    onClick={() => setBespokeOpen(true)}
                    className="w-full text-left p-5 border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/5 via-transparent to-[#c5a059]/5 rounded hover:border-fuchsia-400/40 transition-colors group"
                >
                    <p className="font-cinzel text-fuchsia-300 text-[10px] uppercase tracking-[0.4em] mb-1">
                        Bespoke · upgrade
                    </p>
                    <p className="font-prata text-[#f3e5ab] text-lg leading-tight mb-1">
                        Want a portfolio designed for you?
                    </p>
                    <p className="text-neutral-500 text-xs font-lato leading-relaxed">
                        Pick from a catalog of components and Alex assembles a bespoke version of your Mind Palace. <span className="text-fuchsia-300 group-hover:underline">Coming soon →</span>
                    </p>
                </button>
            </div>

            {bespokeOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
                    onClick={() => setBespokeOpen(false)}
                >
                    <div
                        className="relative max-w-lg w-full bg-[#0a0a0a] border border-[#c5a059]/40 rounded p-8 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="font-cinzel text-fuchsia-300 text-[10px] uppercase tracking-[0.5em] mb-4">
                            Bespoke · coming soon
                        </p>
                        <h3 className="font-prata text-[#f3e5ab] text-3xl mb-4 leading-tight">
                            A portfolio handcrafted with you
                        </h3>
                        <p className="text-neutral-400 text-sm font-lato leading-relaxed mb-6">
                            Pick from a curated catalog of layouts, animations, and components. Alex assembles a Mind Palace built around your work, the way a tailor builds a suit. The catalog isn't open yet — leave us a note and we'll write back when it is.
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center">
                            <a
                                href="mailto:alex@lesalondesinconnus.com?subject=Bespoke%20Mind%20Palace%20interest"
                                className="px-5 py-2.5 bg-[#c5a059] text-[#18181b] font-cinzel text-[11px] uppercase tracking-[0.35em] hover:bg-[#d4b06a] transition-colors"
                            >
                                Tell Alex you're interested
                            </a>
                            <button
                                type="button"
                                onClick={() => setBespokeOpen(false)}
                                className="px-5 py-2.5 border border-white/15 text-neutral-400 font-cinzel text-[11px] uppercase tracking-[0.35em] hover:border-white/40 hover:text-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

// ── Helpers ──────────────────────────────────────────────────────────────

interface FieldProps {
    label: string;
    value: string;
    placeholder?: string;
    maxLength?: number;
    onChange: (v: string) => void;
}

const Field: React.FC<FieldProps> = ({ label, value, placeholder, maxLength, onChange }) => (
    <div>
        <label className="block text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-400 mb-2">
            {label}
        </label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full bg-black/50 border border-white/15 px-3 py-2 text-sm text-white font-lato focus:outline-none focus:border-[#c5a059] rounded"
        />
    </div>
);

function usernameReasonCopy(reason: string): string {
    switch (reason) {
        case 'too-short':    return 'Username must be at least 3 characters.';
        case 'too-long':     return 'Username must be 32 characters or fewer.';
        case 'bad-chars':    return 'Use lowercase letters, numbers, and hyphens only.';
        case 'edge-hyphen':  return 'Username can\'t start or end with a hyphen.';
        case 'numeric-only': return 'Username can\'t be only numbers.';
        case 'reserved':     return 'This username is reserved.';
        default:             return 'Invalid username.';
    }
}

type SlugStatus = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid' | 'reserved';
function usernameStatusCopy(status: SlugStatus): string {
    switch (status) {
        case 'checking': return 'Checking…';
        case 'ok':       return 'Available.';
        case 'taken':    return 'That username is already taken.';
        case 'invalid':  return 'Use lowercase letters, numbers, and hyphens (3–32 characters).';
        case 'reserved': return 'This username is reserved.';
        default:         return '';
    }
}
