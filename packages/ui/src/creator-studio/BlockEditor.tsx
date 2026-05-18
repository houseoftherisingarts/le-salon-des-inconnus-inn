import React, { useEffect, useRef, useState } from 'react';
import { getApp } from 'firebase/app';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// ─── Types ───────────────────────────────────────────────────────────────────
type Alignment = 'left' | 'center' | 'right' | 'justify';
type FontFamily = 'sans' | 'serif';
type FontSize = 'p' | 'h2' | 'h1';

export interface BlockColumn {
    id: string;
    type: 'text' | 'image';
    value: string;
    align?: Alignment;
    fontFamily?: FontFamily;
    fontSize?: FontSize;
}
export interface BlockRow {
    id: string;
    columns: BlockColumn[];
}

interface BlockEditorProps {
    /** Serialized rows JSON. The editor parses on mount and emits JSON on change. */
    value: string;
    onChange: (next: string) => void;
    /** Owner uid — drives the Firebase Storage upload path. Falls back to a
     *  shared folder when null (visitor mode shouldn't reach here). */
    uid: string | null;
    /** Pre-uploaded media (the user's gallery) for quick image picking. */
    mediaLibrary?: string[];
    language: 'EN' | 'FR';
}

// Render markdown-like wrapped text. `**bold**` → <strong>; `_italic_` →
// <em>. Cheap regex pass — no need for a full parser inside an inline preview.
const renderInline = (raw: string) => {
    const parts: Array<{ kind: 'text' | 'b' | 'i'; v: string }> = [];
    let buf = '';
    let i = 0;
    while (i < raw.length) {
        if (raw.startsWith('**', i)) {
            const end = raw.indexOf('**', i + 2);
            if (end >= 0) {
                if (buf) { parts.push({ kind: 'text', v: buf }); buf = ''; }
                parts.push({ kind: 'b', v: raw.slice(i + 2, end) });
                i = end + 2;
                continue;
            }
        } else if (raw[i] === '_') {
            const end = raw.indexOf('_', i + 1);
            if (end >= 0) {
                if (buf) { parts.push({ kind: 'text', v: buf }); buf = ''; }
                parts.push({ kind: 'i', v: raw.slice(i + 1, end) });
                i = end + 1;
                continue;
            }
        }
        buf += raw[i];
        i++;
    }
    if (buf) parts.push({ kind: 'text', v: buf });
    return parts;
};

const BtnIcon: React.FC<{ children: React.ReactNode; onClick?: () => void; active?: boolean; title?: string; disabled?: boolean }> = ({ children, onClick, active, title, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`p-1.5 rounded text-xs transition-colors ${active ? 'text-[#c5a059]' : 'text-neutral-400 hover:text-white'} disabled:opacity-30 disabled:cursor-not-allowed`}
    >
        {children}
    </button>
);

// ─── Image upload sub-component ──────────────────────────────────────────────
const ImageBlock: React.FC<{
    value: string;
    onUpload: (url: string) => void;
    uid: string | null;
    mediaLibrary?: string[];
    language: 'EN' | 'FR';
}> = ({ value, onUpload, uid, mediaLibrary = [], language }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [busy, setBusy] = useState(false);
    const [libraryOpen, setLibraryOpen] = useState(false);

    const handleFile = async (file: File) => {
        if (!file) return;
        setBusy(true);
        try {
            const app = getApp();
            const storage = getStorage(app);
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = uid
                ? `artists/${uid}/articles/${Date.now()}.${ext}`
                : `articles/anonymous/${Date.now()}.${ext}`;
            const r = storageRef(storage, path);
            await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
            const url = await getDownloadURL(r);
            onUpload(url);
        } catch {
            // surface nothing — caller stays in editor
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className="relative min-h-[180px] rounded-lg border-2 border-dashed border-white/10 bg-black/20 flex items-center justify-center overflow-hidden group">
                {value && <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />}
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 p-4 bg-black/70 rounded-lg">
                    <label className="cursor-pointer text-[#c5a059] hover:text-white text-xs uppercase tracking-widest font-cinzel">
                        {busy ? t('Uploading…', 'Téléversement…') : t('Upload image', 'Téléverser')}
                        <input
                            type="file"
                            accept="image/*"
                            disabled={busy}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                            className="hidden"
                        />
                    </label>
                    {mediaLibrary.length > 0 && (
                        <>
                            <span className="text-neutral-600">·</span>
                            <button
                                type="button"
                                onClick={() => setLibraryOpen(true)}
                                className="text-[#c5a059] hover:text-white text-xs uppercase tracking-widest font-cinzel"
                            >
                                {t('From your gallery', 'Depuis ma galerie')}
                            </button>
                        </>
                    )}
                </div>
            </div>
            {libraryOpen && (
                <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-[#0a0a0a] border border-white/15 rounded-2xl w-full max-w-4xl max-h-[80vh] p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-cinzel text-white text-lg">{t('Pick an image', 'Choisir une image')}</h3>
                            <button onClick={() => setLibraryOpen(false)} className="text-neutral-400 hover:text-white">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {mediaLibrary.map((u, i) => (
                                    <button
                                        key={u + i}
                                        onClick={() => { onUpload(u); setLibraryOpen(false); }}
                                        className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-[#c5a059]/60 transition-colors"
                                    >
                                        <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ─── Main editor ─────────────────────────────────────────────────────────────
export const BlockEditor: React.FC<BlockEditorProps> = ({ value, onChange, uid, mediaLibrary = [], language }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [rows, setRows] = useState<BlockRow[]>([]);
    const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const initialMount = useRef(true);

    // Hydrate rows once from the serialized prop. Re-running on `value` would
    // create a write-loop with the parent (rows → onChange → value → rows).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed) && parsed.length > 0) { setRows(parsed); return; }
        } catch { /* fall through to seed */ }
        setRows([{ id: `row-${Date.now()}`, columns: [{ id: `col-${Date.now()}`, type: 'text', value: value || '', align: 'left', fontFamily: 'serif', fontSize: 'p' }] }]);
    }, []);

    // Forward state on every change after first mount.
    useEffect(() => {
        if (initialMount.current) { initialMount.current = false; return; }
        onChangeRef.current(JSON.stringify(rows));
    }, [rows]);

    const addRow = () => setRows(prev => [...prev, { id: `row-${Date.now()}`, columns: [{ id: `col-${Date.now()}`, type: 'text', value: '', align: 'left', fontFamily: 'serif', fontSize: 'p' }] }]);
    const deleteRow = (rowId: string) => setRows(prev => prev.filter(r => r.id !== rowId));
    const moveRow = (idx: number, dir: -1 | 1) => setRows(prev => {
        const next = [...prev];
        const j = idx + dir;
        if (j < 0 || j >= next.length) return prev;
        [next[idx], next[j]] = [next[j], next[idx]];
        return next;
    });
    const addColumn = (rowId: string, type: 'text' | 'image') => setRows(prev => prev.map(r => {
        if (r.id !== rowId || r.columns.length >= 3) return r;
        const c: BlockColumn = type === 'text'
            ? { id: `col-${Date.now()}`, type, value: '', align: 'left', fontFamily: 'serif', fontSize: 'p' }
            : { id: `col-${Date.now()}`, type, value: '' };
        return { ...r, columns: [...r.columns, c] };
    }));
    const deleteColumn = (rowId: string, colId: string) => setRows(prev => prev.map(r => r.id === rowId ? { ...r, columns: r.columns.filter(c => c.id !== colId) } : r));
    const update = (rowId: string, colId: string, patch: Partial<BlockColumn>) => setRows(prev => prev.map(r => r.id === rowId ? { ...r, columns: r.columns.map(c => c.id === colId ? { ...c, ...patch } : c) } : r));
    const cycleFontSize = (rowId: string, colId: string, current: FontSize | undefined) => {
        const order: FontSize[] = ['p', 'h2', 'h1'];
        const next = order[(order.indexOf(current ?? 'p') + 1) % order.length];
        update(rowId, colId, { fontSize: next });
    };
    const wrap = (rowId: string, colId: string, marker: string) => {
        const ta = textareaRefs.current[colId];
        if (!ta) return;
        const { selectionStart, selectionEnd, value: v } = ta;
        const sel = v.slice(selectionStart, selectionEnd);
        const nextV = `${v.slice(0, selectionStart)}${marker}${sel}${marker}${v.slice(selectionEnd)}`;
        update(rowId, colId, { value: nextV });
    };

    const textClass = (col: BlockColumn) => {
        const sz = { p: 'text-base', h2: 'text-2xl', h1: 'text-4xl' }[col.fontSize ?? 'p'];
        const ff = { sans: 'font-sans', serif: 'font-serif' }[col.fontFamily ?? 'serif'];
        const al = `text-${col.align ?? 'left'}`;
        return `${sz} ${ff} ${al}`;
    };

    return (
        <div className="space-y-3">
            {rows.map((row, rowIdx) => (
                <div key={row.id} className="bg-black/20 border border-white/5 rounded-xl p-3 relative group">
                    {/* Row controls (top-right of row) */}
                    <div className="absolute -top-3 right-3 flex items-center gap-1 bg-[#0a0a0a] border border-white/10 rounded-full px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <BtnIcon onClick={() => moveRow(rowIdx, -1)} title={t('Move up', 'Monter')}>↑</BtnIcon>
                        <BtnIcon onClick={() => moveRow(rowIdx, 1)} title={t('Move down', 'Descendre')}>↓</BtnIcon>
                        <BtnIcon onClick={() => deleteRow(row.id)} title={t('Remove row', 'Supprimer la ligne')}>🗑</BtnIcon>
                    </div>

                    <div className={`grid gap-3 ${row.columns.length === 1 ? 'grid-cols-1' : row.columns.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                        {row.columns.map((col) => (
                            <div key={col.id} className="relative group/col">
                                {col.type === 'text' ? (
                                    <>
                                        <div className="flex items-center gap-0.5 p-0.5 bg-black/40 border border-white/10 rounded mb-2 w-fit text-[10px]">
                                            <BtnIcon onClick={() => update(row.id, col.id, { align: 'left' })} active={col.align === 'left'} title={t('Align left', 'Gauche')}>⟸</BtnIcon>
                                            <BtnIcon onClick={() => update(row.id, col.id, { align: 'center' })} active={col.align === 'center'} title={t('Align center', 'Centre')}>≡</BtnIcon>
                                            <BtnIcon onClick={() => update(row.id, col.id, { align: 'right' })} active={col.align === 'right'} title={t('Align right', 'Droite')}>⟹</BtnIcon>
                                            <BtnIcon onClick={() => update(row.id, col.id, { align: 'justify' })} active={col.align === 'justify'} title={t('Justify', 'Justifier')}>☰</BtnIcon>
                                            <span className="w-px h-4 bg-white/10 mx-1" />
                                            <BtnIcon onClick={() => update(row.id, col.id, { fontFamily: col.fontFamily === 'serif' ? 'sans' : 'serif' })} title={t('Toggle serif/sans', 'Serif/Sans')}>{col.fontFamily === 'sans' ? 'Aa' : 'A'}</BtnIcon>
                                            <BtnIcon onClick={() => cycleFontSize(row.id, col.id, col.fontSize)} title={t('Cycle size (p / h2 / h1)', 'Taille (p / h2 / h1)')}>H</BtnIcon>
                                            <span className="w-px h-4 bg-white/10 mx-1" />
                                            <BtnIcon onClick={() => wrap(row.id, col.id, '**')} title={t('Bold (wraps **selection**)', 'Gras')}><strong>B</strong></BtnIcon>
                                            <BtnIcon onClick={() => wrap(row.id, col.id, '_')} title={t('Italic (wraps _selection_)', 'Italique')}><em>I</em></BtnIcon>
                                        </div>
                                        <textarea
                                            ref={(el) => { textareaRefs.current[col.id] = el; }}
                                            placeholder={t('Write here…', 'Écrire ici…')}
                                            value={col.value}
                                            onChange={(e) => update(row.id, col.id, { value: e.target.value })}
                                            className={`w-full min-h-[120px] bg-transparent text-neutral-200 focus:outline-none resize-y leading-relaxed ${textClass(col)}`}
                                        />
                                    </>
                                ) : (
                                    <ImageBlock
                                        value={col.value}
                                        onUpload={(url) => update(row.id, col.id, { value: url })}
                                        uid={uid}
                                        mediaLibrary={mediaLibrary}
                                        language={language}
                                    />
                                )}
                                {row.columns.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => deleteColumn(row.id, col.id)}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-rose-300 hover:bg-rose-600 hover:text-white opacity-0 group-hover/col:opacity-100 transition-all text-xs flex items-center justify-center"
                                        title={t('Remove column', 'Retirer la colonne')}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 pt-3 mt-3 border-t border-white/10 text-[10px] uppercase tracking-widest">
                        <button
                            type="button"
                            onClick={() => addColumn(row.id, 'text')}
                            disabled={row.columns.length >= 3}
                            className="text-neutral-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            + {t('Text', 'Texte')}
                        </button>
                        <button
                            type="button"
                            onClick={() => addColumn(row.id, 'image')}
                            disabled={row.columns.length >= 3}
                            className="text-neutral-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            + {t('Image', 'Image')}
                        </button>
                    </div>
                </div>
            ))}
            <button
                type="button"
                onClick={addRow}
                className="w-full bg-white/[0.03] border border-dashed border-white/10 rounded-lg py-3 text-neutral-400 hover:bg-white/5 hover:border-[#c5a059]/40 transition-colors text-xs uppercase tracking-widest"
            >
                + {t('New row', 'Nouvelle ligne')}
            </button>
        </div>
    );
};

// ─── Read-only renderer ──────────────────────────────────────────────────────
export const BlockRenderer: React.FC<{ value: string }> = ({ value }) => {
    let rows: BlockRow[] = [];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) rows = parsed;
    } catch {
        // Treat raw value as a single text block (back-compat with the old
        // simple textarea articles).
        return <p className="font-serif text-base leading-relaxed whitespace-pre-wrap">{value}</p>;
    }
    return (
        <div className="space-y-4">
            {rows.map((row) => (
                <div key={row.id} className={`grid gap-4 ${row.columns.length === 1 ? 'grid-cols-1' : row.columns.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                    {row.columns.map((col) => {
                        if (col.type === 'image') {
                            return col.value ? (
                                <img key={col.id} src={col.value} alt="" className="w-full rounded-lg object-cover" />
                            ) : null;
                        }
                        const cls = `${col.fontSize === 'h1' ? 'text-4xl' : col.fontSize === 'h2' ? 'text-2xl' : 'text-base'} ${col.fontFamily === 'sans' ? 'font-sans' : 'font-serif'} text-${col.align ?? 'left'} leading-relaxed text-neutral-200`;
                        const Tag: 'h1' | 'h2' | 'p' = col.fontSize === 'h1' ? 'h1' : col.fontSize === 'h2' ? 'h2' : 'p';
                        const inline = renderInline(col.value);
                        return (
                            <Tag key={col.id} className={cls}>
                                {inline.map((p, i) => p.kind === 'b' ? <strong key={i}>{p.v}</strong> : p.kind === 'i' ? <em key={i}>{p.v}</em> : <React.Fragment key={i}>{p.v}</React.Fragment>)}
                            </Tag>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};
