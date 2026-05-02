import React, { useEffect, useRef, useState } from 'react';
import { storage } from '../../firebase';
import {
    ref as storageRef, uploadBytes, getDownloadURL,
    listAll, deleteObject, getMetadata,
} from 'firebase/storage';

// Storage-backed media library. Files live under admin/media/* in Firebase
// Storage. v1: image-first grid, click-to-copy URL, upload, delete. No
// folders, no rename — those are easy to add later if needed.

interface MediaItem {
    fullPath: string;
    name:     string;
    url:      string;
    size?:    number;
    contentType?: string;
    timeCreated?: string;
}

const FOLDER = 'admin/media';

const formatBytes = (n: number | undefined): string => {
    if (n == null) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const isImage = (mt: string | undefined): boolean =>
    !!mt && mt.startsWith('image/');

export const MediaSection: React.FC = () => {
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [copiedPath, setCopiedPath] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refresh = async () => {
        if (!storage) return;
        setLoading(true);
        setError(null);
        try {
            const folderRef = storageRef(storage, FOLDER);
            const list = await listAll(folderRef);
            const enriched = await Promise.all(list.items.map(async (ref) => {
                const [url, meta] = await Promise.all([
                    getDownloadURL(ref),
                    getMetadata(ref).catch(() => null),
                ]);
                return {
                    fullPath: ref.fullPath,
                    name:     ref.name,
                    url,
                    size:        meta?.size,
                    contentType: meta?.contentType,
                    timeCreated: meta?.timeCreated,
                };
            }));
            // Most recent first
            enriched.sort((a, b) => (b.timeCreated ?? '').localeCompare(a.timeCreated ?? ''));
            setItems(enriched);
        } catch (e: any) {
            setError(e?.message ?? String(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

    const handleUpload = async (files: FileList | null) => {
        if (!files || !storage) return;
        setBusy(true);
        setError(null);
        try {
            for (const file of Array.from(files)) {
                // Sanitize filename: strip dangerous chars, preserve extension.
                const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const path = `${FOLDER}/${Date.now()}_${safe}`;
                await uploadBytes(storageRef(storage, path), file, { contentType: file.type });
            }
            await refresh();
        } catch (e: any) {
            setError(e?.message ?? String(e));
        } finally {
            setBusy(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const copyUrl = async (item: MediaItem) => {
        try {
            await navigator.clipboard.writeText(item.url);
            setCopiedPath(item.fullPath);
            setTimeout(() => setCopiedPath(p => (p === item.fullPath ? null : p)), 1500);
        } catch { /* noop */ }
    };

    const handleDelete = async (item: MediaItem) => {
        if (!storage) return;
        if (!confirm(`Supprimer ${item.name} ?`)) return;
        try {
            await deleteObject(storageRef(storage, item.fullPath));
            setItems(prev => prev.filter(i => i.fullPath !== item.fullPath));
        } catch (e: any) {
            setError(e?.message ?? String(e));
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
    };

    return (
        <div className="space-y-5">
            <p className="text-neutral-500 text-sm font-lato max-w-2xl">
                Bibliothèque liée à Firebase Storage (<code className="text-[#c5a059]">{FOLDER}/</code>). Cliquez
                une vignette pour copier son URL publique, ou déposez des fichiers ci-dessous pour téléverser.
            </p>

            {/* Upload zone */}
            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="border-2 border-dashed border-white/15 hover:border-[#c5a059]/40 transition-colors p-6 text-center"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleUpload(e.target.files)}
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="px-5 py-2.5 bg-[#d4af37] text-black text-[10px] font-cinzel font-bold uppercase tracking-[0.4em] hover:bg-[#f3e5ab] disabled:opacity-40 transition-colors"
                >
                    {busy ? 'Téléversement…' : 'Choisir des fichiers'}
                </button>
                <p className="font-josefin text-neutral-600 text-[10px] uppercase tracking-[0.3em] mt-3">
                    ou glissez-déposez ici
                </p>
            </div>

            {error && (
                <div className="border border-rose-900/40 bg-rose-950/20 px-4 py-3 text-rose-300 text-xs font-lato">
                    {error}
                </div>
            )}

            {/* Grid */}
            {loading ? (
                <p className="py-12 text-center text-neutral-700 italic">Chargement…</p>
            ) : items.length === 0 ? (
                <p className="py-12 text-center text-neutral-700 italic">Aucun fichier dans la médiathèque.</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {items.map((item) => (
                        <div
                            key={item.fullPath}
                            className="group relative border border-white/10 bg-[#0a0a0a] overflow-hidden hover:border-[#c5a059]/40 transition-colors"
                        >
                            <button
                                type="button"
                                onClick={() => copyUrl(item)}
                                className="block w-full aspect-square bg-black"
                                title="Cliquer pour copier l'URL"
                            >
                                {isImage(item.contentType) ? (
                                    <img
                                        src={item.url}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-600 text-[10px] font-cinzel uppercase tracking-[0.3em]">
                                        {(item.contentType ?? 'fichier').split('/')[1] ?? 'fichier'}
                                    </div>
                                )}
                                {copiedPath === item.fullPath && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 font-cinzel text-[#f3e5ab] text-[11px] uppercase tracking-[0.4em]">
                                        ✓ URL copiée
                                    </div>
                                )}
                            </button>
                            <div className="p-2 border-t border-white/5">
                                <p className="text-[10px] text-neutral-400 truncate font-mono" title={item.name}>{item.name}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[9px] text-neutral-700">{formatBytes(item.size)}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(item)}
                                        className="text-[9px] text-red-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
