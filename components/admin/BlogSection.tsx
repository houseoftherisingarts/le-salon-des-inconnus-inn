import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../firebase';
import {
    collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { BLOG_CATEGORIES, BlogCategory, BlogPost, BlogStatus, categoryLabel, formatPostDate } from '../../data/blog';
import { BlogBody } from '../blog/BlogBody';

/**
 * AdminCRM · Blog section — the approval desk for the chronicles.
 * Every morning the writer job drops a bilingual draft with status 'pending';
 * NOTHING reaches /blog until Alex publishes it here. Four sub-tabs
 * (pending / published / hidden / all), inline editor with rendered preview,
 * and the full set of actions: save, publish, hide, delete, create.
 * Pending count bubbles up to the sidebar badge via onPendingCountChange.
 */

interface Props {
    user: User;
    onPendingCountChange?: (n: number) => void;
}

type SubTab = 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'ALL';

interface Draft {
    slug: string;
    category: BlogCategory;
    title_fr: string; title_en: string;
    excerpt_fr: string; excerpt_en: string;
    body_fr: string; body_en: string;
}

const draftOf = (p: BlogPost): Draft => ({
    slug: p.slug ?? '',
    category: p.category ?? 'auberge',
    title_fr: p.title_fr ?? '', title_en: p.title_en ?? '',
    excerpt_fr: p.excerpt_fr ?? '', excerpt_en: p.excerpt_en ?? '',
    body_fr: p.body_fr ?? '', body_en: p.body_en ?? '',
});

const slugify = (s: string): string =>
    s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);

const STATUS_LABEL: Record<BlogStatus, string> = {
    pending: 'En attente',
    published: 'Publié',
    hidden: 'Caché',
};

const STATUS_COLOR: Record<BlogStatus, string> = {
    pending: 'text-amber-300',
    published: 'text-emerald-300',
    hidden: 'text-neutral-500',
};

const inputCls = 'w-full px-3 py-2 bg-black/60 border border-white/10 text-white text-sm font-lato focus:outline-none focus:border-[#c5a059]/60 rounded';
const labelCls = 'block text-[10px] uppercase tracking-widest text-neutral-500 mb-1 font-cinzel';

export const BlogSection: React.FC<Props> = ({ user, onPendingCountChange }) => {
    const [subtab, setSubtab] = useState<SubTab>('PENDING');
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [previewLang, setPreviewLang] = useState<'FR' | 'EN' | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!db) return;
        const unsub = onSnapshot(collection(db, 'blogPosts'), snap => {
            const rows: BlogPost[] = [];
            snap.forEach(d => rows.push({ ...(d.data() as BlogPost), id: d.id }));
            rows.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
            setPosts(rows);
        }, e => setError(String(e?.message ?? e)));
        return unsub;
    }, []);

    const pending = useMemo(() => posts.filter(p => p.status === 'pending'), [posts]);
    useEffect(() => { onPendingCountChange?.(pending.length); }, [pending.length, onPendingCountChange]);

    const visible = useMemo(() => {
        if (subtab === 'PENDING') return pending;
        if (subtab === 'PUBLISHED') return posts.filter(p => p.status === 'published');
        if (subtab === 'HIDDEN') return posts.filter(p => p.status === 'hidden');
        return posts;
    }, [subtab, posts, pending]);

    const openEditor = (p: BlogPost) => {
        setOpenId(p.id);
        setDraft(draftOf(p));
        setPreviewLang(null);
    };

    const closeEditor = () => { setOpenId(null); setDraft(null); setPreviewLang(null); };

    const save = async (p: BlogPost): Promise<boolean> => {
        if (!db || !draft) return false;
        const slug = draft.slug.trim() || slugify(draft.title_fr || draft.title_en);
        if (!slug) { setError('Le billet a besoin d’un slug (ou d’un titre).'); return false; }
        const clash = posts.find(o => o.id !== p.id && o.slug === slug);
        if (clash) { setError(`Le slug « ${slug} » est déjà pris par « ${clash.title_fr || clash.title_en} ».`); return false; }
        setSaving(true);
        try {
            await updateDoc(doc(db, 'blogPosts', p.id), {
                ...draft, slug,
                updatedAt: serverTimestamp(),
            });
            setDraft(d => d ? { ...d, slug } : d);
            setError(null);
            return true;
        } catch (e) {
            setError(String((e as any)?.message ?? e));
            return false;
        } finally {
            setSaving(false);
        }
    };

    const setStatus = async (p: BlogPost, status: BlogStatus) => {
        if (!db) return;
        // Publishing from the open editor saves the current edits first.
        if (openId === p.id && draft) { const ok = await save(p); if (!ok) return; }
        try {
            await updateDoc(doc(db, 'blogPosts', p.id), {
                status,
                updatedAt: serverTimestamp(),
                ...(status === 'published' ? { publishedAt: p.publishedAt ?? serverTimestamp(), publishedBy: user.email ?? user.uid } : {}),
            });
            setError(null);
        } catch (e) {
            setError(String((e as any)?.message ?? e));
        }
    };

    const remove = async (p: BlogPost) => {
        if (!db) return;
        const ok = window.confirm(`Supprimer définitivement « ${p.title_fr || p.title_en || p.slug} » ?`);
        if (!ok) return;
        try {
            await deleteDoc(doc(db, 'blogPosts', p.id));
            if (openId === p.id) closeEditor();
        } catch (e) {
            setError(String((e as any)?.message ?? e));
        }
    };

    const createPost = async () => {
        if (!db) return;
        const ref = doc(collection(db, 'blogPosts'));
        try {
            await setDoc(ref, {
                id: ref.id,
                slug: '',
                category: 'auberge',
                title_fr: '', title_en: '',
                excerpt_fr: '', excerpt_en: '',
                body_fr: '', body_en: '',
                status: 'pending',
                author: 'alex',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                publishedAt: null,
            });
            setSubtab('PENDING');
            setOpenId(ref.id);
            setDraft({ slug: '', category: 'auberge', title_fr: '', title_en: '', excerpt_fr: '', excerpt_en: '', body_fr: '', body_en: '' });
            setPreviewLang(null);
        } catch (e) {
            setError(String((e as any)?.message ?? e));
        }
    };

    const subnav: { id: SubTab; label: string; count: number }[] = [
        { id: 'PENDING',   label: 'En attente', count: pending.length },
        { id: 'PUBLISHED', label: 'Publiés',    count: posts.filter(p => p.status === 'published').length },
        { id: 'HIDDEN',    label: 'Cachés',     count: posts.filter(p => p.status === 'hidden').length },
        { id: 'ALL',       label: 'Tous',       count: posts.length },
    ];

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 mb-5">
                {subnav.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSubtab(s.id)}
                        className={`px-4 py-2 text-[10px] font-cinzel uppercase tracking-[0.3em] rounded-full border transition-colors ${subtab === s.id ? 'border-[#c5a059]/60 text-[#f3e5ab] bg-[#c5a059]/10' : 'border-white/15 text-neutral-400 hover:text-white hover:border-white/40'}`}
                    >
                        {s.label}
                        <span className="ml-2 text-[9px] opacity-70 font-mono tabular-nums">{s.count}</span>
                    </button>
                ))}
                <button
                    onClick={createPost}
                    className="ml-auto px-4 py-2 border border-dashed border-[#c5a059]/40 text-[#c5a059] hover:text-[#f3e5ab] hover:border-[#c5a059]/70 text-[10px] font-cinzel uppercase tracking-[0.3em] rounded transition-colors"
                >
                    + Nouveau billet
                </button>
            </div>

            {error && <p className="text-[10px] text-rose-300 mb-3 font-mono">{error}</p>}

            {visible.length === 0 && (
                <p className="text-sm text-neutral-500 font-lato py-6 text-center">
                    {subtab === 'PENDING'
                        ? 'Aucun billet en attente. Le prochain arrive au matin.'
                        : 'Rien ici pour l’instant.'}
                </p>
            )}

            <div className="space-y-4">
                {visible.map(p => {
                    const isOpen = openId === p.id;
                    return (
                        <div key={p.id} className="border border-white/10 bg-[#0a0a0a] rounded-[15px] overflow-hidden">
                            {/* Row header */}
                            <button
                                onClick={() => (isOpen ? closeEditor() : openEditor(p))}
                                className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-white/[0.02] transition-colors"
                            >
                                <span className={`text-[10px] uppercase font-cinzel tracking-widest ${STATUS_COLOR[p.status]}`}>
                                    {STATUS_LABEL[p.status] ?? p.status}
                                </span>
                                <span className="text-[10px] uppercase tracking-widest text-[#c5a059]/80 font-cinzel">
                                    {categoryLabel(p.category, true)}
                                </span>
                                <span className="font-prata text-white text-base flex-1 min-w-[200px] truncate">
                                    {p.title_fr || p.title_en || 'Billet sans titre'}
                                </span>
                                <span className="text-[10px] text-neutral-600 font-mono">
                                    {formatPostDate(p.status === 'published' ? p.publishedAt : p.createdAt, true)}
                                </span>
                                <span className="text-neutral-600 text-xs">{isOpen ? '▴' : '▾'}</span>
                            </button>

                            {/* Inline editor */}
                            {isOpen && draft && (
                                <div className="border-t border-white/10 px-5 py-5">
                                    {/* Éditer / aperçu toggle */}
                                    <div className="flex flex-wrap gap-2 mb-5">
                                        {([null, 'FR', 'EN'] as const).map(mode => (
                                            <button
                                                key={String(mode)}
                                                onClick={() => setPreviewLang(mode)}
                                                className={`px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-[0.25em] rounded border transition-colors ${previewLang === mode ? 'border-[#c5a059]/60 text-[#f3e5ab] bg-[#c5a059]/10' : 'border-white/15 text-neutral-400 hover:text-white'}`}
                                            >
                                                {mode === null ? 'Éditer' : `Aperçu ${mode}`}
                                            </button>
                                        ))}
                                    </div>

                                    {previewLang ? (
                                        <div className="bg-[#0a0808] border border-white/10 rounded-[15px] px-6 py-8 md:px-10">
                                            <p className="font-cinzel uppercase text-[#c5a059] mb-4" style={{ fontSize: '11px', letterSpacing: '0.35em' }}>
                                                {categoryLabel(draft.category, previewLang === 'FR')}
                                            </p>
                                            <h2 className="font-prata text-[#f3e5ab] mb-4" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1.1 }}>
                                                {previewLang === 'FR' ? draft.title_fr : draft.title_en}
                                            </h2>
                                            <p className="font-lato text-white/70 mb-8" style={{ fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '52ch' }}>
                                                {previewLang === 'FR' ? draft.excerpt_fr : draft.excerpt_en}
                                            </p>
                                            <BlogBody body={previewLang === 'FR' ? draft.body_fr : draft.body_en} />
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 lg:grid-cols-2">
                                            <div className="lg:col-span-2 grid gap-4 md:grid-cols-[1fr_240px]">
                                                <div>
                                                    <label className={labelCls}>Slug (URL : /blog/…)</label>
                                                    <input
                                                        value={draft.slug}
                                                        placeholder={slugify(draft.title_fr || draft.title_en) || 'auto depuis le titre'}
                                                        onChange={e => setDraft(d => d ? { ...d, slug: slugify(e.target.value) || e.target.value.toLowerCase() } : d)}
                                                        className={inputCls}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Catégorie</label>
                                                    <select
                                                        value={draft.category}
                                                        onChange={e => setDraft(d => d ? { ...d, category: e.target.value as BlogCategory } : d)}
                                                        className={inputCls}
                                                    >
                                                        {BLOG_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label_fr}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className={labelCls}>Titre FR</label>
                                                <input value={draft.title_fr} onChange={e => setDraft(d => d ? { ...d, title_fr: e.target.value } : d)} className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Titre EN</label>
                                                <input value={draft.title_en} onChange={e => setDraft(d => d ? { ...d, title_en: e.target.value } : d)} className={inputCls} />
                                            </div>

                                            <div>
                                                <label className={labelCls}>Extrait FR</label>
                                                <textarea value={draft.excerpt_fr} rows={3} onChange={e => setDraft(d => d ? { ...d, excerpt_fr: e.target.value } : d)} className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Extrait EN</label>
                                                <textarea value={draft.excerpt_en} rows={3} onChange={e => setDraft(d => d ? { ...d, excerpt_en: e.target.value } : d)} className={inputCls} />
                                            </div>

                                            <div>
                                                <label className={labelCls}>Texte FR (## titres, - listes, **gras**)</label>
                                                <textarea value={draft.body_fr} rows={18} onChange={e => setDraft(d => d ? { ...d, body_fr: e.target.value } : d)} className={`${inputCls} leading-relaxed`} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Texte EN</label>
                                                <textarea value={draft.body_en} rows={18} onChange={e => setDraft(d => d ? { ...d, body_en: e.target.value } : d)} className={`${inputCls} leading-relaxed`} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2 mt-6">
                                        <button
                                            onClick={() => save(p)}
                                            disabled={saving}
                                            className="px-4 py-2 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-[#d4b06a] rounded transition-colors disabled:opacity-50"
                                        >
                                            Enregistrer
                                        </button>
                                        {p.status !== 'published' && (
                                            <button
                                                onClick={() => setStatus(p, 'published')}
                                                className="px-4 py-2 bg-emerald-700/30 border border-emerald-600/40 text-emerald-200 hover:bg-emerald-700/50 text-[10px] font-cinzel uppercase tracking-widest rounded transition-colors"
                                            >
                                                ✓ Publier
                                            </button>
                                        )}
                                        {p.status === 'published' && (
                                            <button
                                                onClick={() => setStatus(p, 'hidden')}
                                                className="px-4 py-2 border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 text-[10px] font-cinzel uppercase tracking-widest rounded transition-colors"
                                            >
                                                Cacher
                                            </button>
                                        )}
                                        {p.status === 'hidden' && (
                                            <button
                                                onClick={() => setStatus(p, 'pending')}
                                                className="px-4 py-2 border border-white/15 text-neutral-300 hover:bg-white/5 text-[10px] font-cinzel uppercase tracking-widest rounded transition-colors"
                                            >
                                                Renvoyer en attente
                                            </button>
                                        )}
                                        <button
                                            onClick={() => remove(p)}
                                            className="px-4 py-2 border border-rose-500/30 text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200 text-[10px] font-cinzel uppercase tracking-widest rounded transition-colors"
                                        >
                                            Supprimer
                                        </button>
                                        {p.slug && (
                                            <a
                                                href={p.status === 'published' ? `/blog/${p.slug}` : `/blog?preview=${p.slug}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="ml-auto px-4 py-2 border border-white/15 text-neutral-300 hover:text-[#f3e5ab] hover:border-[#c5a059]/40 text-[10px] font-cinzel uppercase tracking-widest rounded transition-colors"
                                            >
                                                {p.status === 'published' ? '↗ Voir sur le site' : '↗ Aperçu sur le site'}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
