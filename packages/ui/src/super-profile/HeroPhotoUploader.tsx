// HeroPhotoUploader — uploads the artist's centerpiece cutout for the
// Super Profile page. Two modes:
//
//   1. Trust mode (default): the user uploads a PNG they've already removed
//      the background from (Photoshop, Pixelmator, etc.). We verify the
//      image has alpha (any non-opaque pixel) and reject if not.
//
//   2. Auto-remove mode: we run @imgly/background-removal in the browser.
//      Larger bundle (lazy-loaded), 5–15s on a mid-range laptop, but
//      zero-tool for the user. Library is dynamically imported only when
//      this tab is selected.
//
// Output for either mode: a transparent PNG stored at
// members/{uid}/superProfile/hero.png. We track which mode produced the
// file on the config doc (`source: 'manual-png' | 'auto-removed'`) so
// admins can spot-check quality if needed.

import * as React from 'react';
import { getApp } from 'firebase/app';
import {
    getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage';
import type { SuperProfileHeroPhoto } from './types';
import { heroStoragePath } from './types';

type UploadMode = 'manual-png' | 'auto-removed';

interface HeroPhotoUploaderProps {
    uid: string;
    hero?: SuperProfileHeroPhoto;
    onChange: (next: SuperProfileHeroPhoto) => void;
    /** Forwarded so we can clear stale previews on remove. */
    onClear?: () => void;
}

interface AlphaCheckResult {
    hasAlpha: boolean;
    width: number;
    height: number;
}

/**
 * Decode the file and check that at least one pixel has alpha < 255. Reads
 * the full image into a canvas; cheaper alternatives (PNG chunk parsing)
 * exist but adding a dep for that isn't worth it at our scale.
 */
async function checkPngAlpha(file: File): Promise<AlphaCheckResult> {
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error('Image failed to decode'));
            i.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        // Walk every 4th byte (alpha channel). Bail as soon as we see a
        // non-opaque pixel — most cutouts have transparent edges, so the
        // first row often answers the question.
        let hasAlpha = false;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 250) {
                hasAlpha = true;
                break;
            }
        }
        return { hasAlpha, width: canvas.width, height: canvas.height };
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Lazy-loaded: pulls @imgly/background-removal only when the user actually
 * runs auto-removal. Library is ~5MB pre-gzip so we don't ship it on the
 * default Studio bundle.
 */
async function runAutoBackgroundRemoval(file: File): Promise<Blob> {
    const mod = await import('@imgly/background-removal');
    // The package exports both default and named — handle either shape.
    const remove = (mod as any).default ?? (mod as any).removeBackground;
    if (typeof remove !== 'function') {
        throw new Error('Background removal entrypoint not found');
    }
    return await remove(file);
}

export const HeroPhotoUploader: React.FC<HeroPhotoUploaderProps> = ({
    uid, hero, onChange, onClear,
}) => {
    const [mode, setMode] = React.useState<UploadMode>('manual-png');
    const [busy, setBusy] = React.useState(false);
    const [status, setStatus] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setError(null);
        setStatus(null);
        if (file.size > 25 * 1024 * 1024) {
            setError('File too large (25 MB max).');
            return;
        }
        setBusy(true);
        try {
            let outputBlob: Blob;
            let width: number | undefined;
            let height: number | undefined;
            if (mode === 'manual-png') {
                if (!/png/i.test(file.type)) {
                    setError('Please upload a PNG. JPG and HEIC don\'t support transparency.');
                    return;
                }
                setStatus('Checking transparency…');
                const check = await checkPngAlpha(file);
                if (!check.hasAlpha) {
                    setError('This PNG looks fully opaque — no background has been removed yet. Either switch to "Remove background for me" or re-export from your editor with transparency.');
                    return;
                }
                outputBlob = file;
                width = check.width;
                height = check.height;
            } else {
                setStatus('Removing background — this can take 5–15 seconds…');
                outputBlob = await runAutoBackgroundRemoval(file);
                // Best-effort: measure the result so templates can size proportionally.
                try {
                    const url = URL.createObjectURL(outputBlob);
                    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                        const i = new Image();
                        i.onload = () => resolve(i);
                        i.onerror = () => reject(new Error('decode'));
                        i.src = url;
                    });
                    width = img.naturalWidth;
                    height = img.naturalHeight;
                    URL.revokeObjectURL(url);
                } catch { /* dimensions are optional */ }
            }

            setStatus('Uploading…');
            const storage = getStorage(getApp());
            const path = heroStoragePath(uid, 'png');
            const ref = storageRef(storage, path);
            // If there was a previous hero, delete it first so storage doesn't
            // accumulate orphaned files. Best-effort.
            if (hero?.storagePath && hero.storagePath !== path) {
                try { await deleteObject(storageRef(storage, hero.storagePath)); } catch { /* ignore */ }
            }
            await uploadBytes(ref, outputBlob, { contentType: 'image/png' });
            const url = await getDownloadURL(ref);
            onChange({
                url,
                storagePath: path,
                source: mode,
                width,
                height,
            });
            setStatus('Saved.');
        } catch (e: any) {
            console.error('hero upload failed', e);
            setError(e?.message || 'Upload failed.');
        } finally {
            setBusy(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = async () => {
        if (!hero?.storagePath) return;
        setBusy(true);
        try {
            const storage = getStorage(getApp());
            try { await deleteObject(storageRef(storage, hero.storagePath)); } catch { /* idempotent */ }
            onClear?.();
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Mode tabs */}
            <div className="flex border border-white/10 rounded overflow-hidden">
                <button
                    type="button"
                    onClick={() => setMode('manual-png')}
                    className={`flex-1 px-3 py-2 text-[10px] font-cinzel uppercase tracking-[0.25em] transition-colors ${
                        mode === 'manual-png'
                            ? 'bg-[#c5a059] text-[#18181b]'
                            : 'bg-transparent text-neutral-400 hover:bg-white/5'
                    }`}
                >
                    Transparent PNG
                </button>
                <button
                    type="button"
                    onClick={() => setMode('auto-removed')}
                    className={`flex-1 px-3 py-2 text-[10px] font-cinzel uppercase tracking-[0.25em] transition-colors ${
                        mode === 'auto-removed'
                            ? 'bg-[#c5a059] text-[#18181b]'
                            : 'bg-transparent text-neutral-400 hover:bg-white/5'
                    }`}
                >
                    Remove BG for me
                </button>
            </div>

            <p className="text-[11px] font-lato text-neutral-500 leading-relaxed">
                {mode === 'manual-png'
                    ? 'Upload a PNG you\'ve already cut out (Photoshop, Pixelmator, online tools, etc.). We\'ll reject opaque PNGs.'
                    : 'Drop any JPG or PNG of yourself and we\'ll cut the background out in your browser. Takes 5–15 seconds per photo (after the model loads).'}
            </p>
            {mode === 'auto-removed' && (
                <p className="text-[10px] font-lato text-amber-200/80 leading-relaxed border border-amber-300/20 bg-amber-300/5 rounded px-3 py-2">
                    First run downloads a ~24 MB AI model. It's cached in your browser after that, so future cutouts are instant.
                </p>
            )}

            {/* Preview */}
            <div className="relative w-full aspect-[3/4] max-w-xs bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMmEyYTJhIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMyYTJhMmEiLz48cmVjdCB4PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMTUxNTE1Ii8+PHJlY3QgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzE1MTUxNSIvPjwvc3ZnPg==')] bg-repeat border border-white/10 rounded overflow-hidden">
                {hero?.url ? (
                    <img
                        src={hero.url}
                        alt="Hero cutout preview"
                        className="absolute inset-0 w-full h-full object-contain"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-neutral-700 font-cinzel text-[10px] uppercase tracking-widest">
                        No photo yet
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#c5a059] text-[#18181b] font-cinzel text-[10px] uppercase tracking-[0.3em] hover:bg-[#d4b06a] disabled:opacity-50 transition-colors"
                >
                    {hero ? 'Replace photo' : 'Upload photo'}
                </button>
                {hero && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={handleRemove}
                        className="px-4 py-2 border border-white/15 text-neutral-400 font-cinzel text-[10px] uppercase tracking-[0.3em] hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50 transition-colors"
                    >
                        Remove
                    </button>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={mode === 'manual-png' ? 'image/png' : 'image/png,image/jpeg,image/webp'}
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleFile(f);
                    }}
                />
            </div>

            {(status || error) && (
                <p className={`text-[11px] font-lato ${error ? 'text-rose-300' : 'text-neutral-400'}`}>
                    {error ?? status}
                </p>
            )}
        </div>
    );
};
