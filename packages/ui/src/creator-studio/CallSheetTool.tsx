import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getApp } from 'firebase/app';
import {
    getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot,
    serverTimestamp, type Firestore,
} from 'firebase/firestore';

// ─── Types ───────────────────────────────────────────────────────────────────
type Skin = 'studio' | 'clean';

interface CastRow  { id: string; character: string; performer: string; callTime: string; status: string; }
interface CrewRow  { id: string; role: string; name: string; contact: string; }
interface PropRow  { id: string; item: string; usage: string; owner: string; status: string; }
interface SceneRow { id: string; time: string; scene: string; location: string; notes: string; }
interface ShotRow  { id: string; code: string; act: string; description: string; setup: string; status: string; }

interface DayForecast { date: string; summary: string; }

interface CallSheetDoc {
    id: string;
    title: string;
    dateStart: string;          // ISO yyyy-mm-dd
    dateEnd: string;            // ISO yyyy-mm-dd
    locationName: string;
    address: string;
    lat: number | null;
    lng: number | null;
    tz: string;
    generalCall: string;
    skin: Skin;
    scenes: SceneRow[];
    cast: CastRow[];
    crew: CrewRow[];
    props: PropRow[];
    shots: ShotRow[];
    notes: string;
    weather: DayForecast[];
    weatherUpdated: number | null;
    isDefault?: boolean;
    createdAt?: any;
    updatedAt?: any;
}

interface CallSheetToolProps {
    onClose?: () => void;
    themeStyles: any;
    uid: string | null;
    language: 'EN' | 'FR';
    membershipTier: string;
    formStyles: {
        container: string; input: string; label: string;
        submitOn: string; submitOff: string;
        chipActive: string; chipInactive: string; accentText: string;
    };
    pageTitleClass: string;
}

// ─── Firebase helper ───────────────────────────────────────────────────────────
function studioDb(): Firestore | null {
    try { return getFirestore(getApp()); } catch { return null; }
}

const rid = () => `${Date.now().toString(36)}-${Math.floor(performance.now() * 1000).toString(36)}`;

// ─── Weather (Open-Meteo — no key, CORS OK, free) ───────────────────────────────
const WMO: Record<number, { en: string; fr: string }> = {
    0:  { en: 'clear sky', fr: 'ciel dégagé' }, 1: { en: 'mostly clear', fr: 'principalement clair' },
    2:  { en: 'partly cloudy', fr: 'partiellement nuageux' }, 3: { en: 'overcast', fr: 'couvert' },
    45: { en: 'fog', fr: 'brouillard' }, 48: { en: 'rime fog', fr: 'brouillard givrant' },
    51: { en: 'light drizzle', fr: 'bruine légère' }, 53: { en: 'drizzle', fr: 'bruine modérée' },
    55: { en: 'dense drizzle', fr: 'bruine dense' },
    61: { en: 'light rain', fr: 'pluie légère' }, 63: { en: 'rain', fr: 'pluie modérée' },
    65: { en: 'heavy rain', fr: 'pluie forte' },
    71: { en: 'light snow', fr: 'neige légère' }, 73: { en: 'snow', fr: 'neige modérée' },
    75: { en: 'heavy snow', fr: 'neige forte' },
    80: { en: 'light showers', fr: 'averses légères' }, 81: { en: 'showers', fr: 'averses modérées' },
    82: { en: 'violent showers', fr: 'averses violentes' },
    95: { en: 'thunderstorm', fr: 'orage' }, 96: { en: 'storm w/ hail', fr: 'orage avec grêle' },
    99: { en: 'severe storm', fr: 'orage violent' },
};

async function geocode(query: string): Promise<{ lat: number; lng: number; tz: string; name: string } | null> {
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=fr&format=json`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = await res.json();
        const hit = json?.results?.[0];
        if (!hit) return null;
        return {
            lat: hit.latitude, lng: hit.longitude,
            tz: hit.timezone || 'auto',
            name: [hit.name, hit.admin1, hit.country_code].filter(Boolean).join(', '),
        };
    } catch { return null; }
}

async function fetchForecast(lat: number, lng: number, tz: string, start: string, end: string, lang: 'EN' | 'FR'): Promise<DayForecast[]> {
    const url = 'https://api.open-meteo.com/v1/forecast'
        + `?latitude=${lat}&longitude=${lng}`
        + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode'
        + `&timezone=${encodeURIComponent(tz || 'auto')}`
        + `&start_date=${start}&end_date=${end}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const d = json?.daily;
    if (!d?.time) return [];
    return d.time.map((iso: string, i: number) => ({
        date: iso,
        summary: `${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°, `
            + `${d.precipitation_probability_max[i] ?? 0}% ${lang === 'FR' ? 'pluie' : 'rain'} · `
            + (WMO[d.weathercode[i]]?.[lang === 'FR' ? 'fr' : 'en'] || 'mixte'),
    }));
}

// ─── Templates ──────────────────────────────────────────────────────────────────
type TemplateKey = 'BLANK' | 'FILM' | 'PHOTO';

function seedFromTemplate(key: TemplateKey, language: 'EN' | 'FR'): Partial<CallSheetDoc> {
    const fr = language === 'FR';
    if (key === 'FILM') {
        return {
            scenes: [{ id: rid(), time: '08:00', scene: fr ? 'Scène 1 — INT. Jour' : 'Scene 1 — INT. Day', location: '', notes: '' }],
            cast:   [{ id: rid(), character: fr ? 'Rôle principal' : 'Lead', performer: '', callTime: '07:30', status: fr ? 'confirmé' : 'confirmed' }],
            crew:   [
                { id: rid(), role: fr ? 'Réalisateur·rice' : 'Director', name: '', contact: '' },
                { id: rid(), role: fr ? 'Directeur·rice photo' : 'DoP', name: '', contact: '' },
                { id: rid(), role: fr ? 'Son' : 'Sound', name: '', contact: '' },
            ],
            props:  [{ id: rid(), item: '', usage: '', owner: '', status: fr ? 'à trouver' : 'to source' }],
            shots:  [{ id: rid(), code: '1.1', act: fr ? 'Acte 1' : 'Act 1', description: '', setup: '', status: '' }],
        };
    }
    if (key === 'PHOTO') {
        return {
            scenes: [{ id: rid(), time: '09:00', scene: fr ? 'Look 1' : 'Look 1', location: '', notes: '' }],
            cast:   [{ id: rid(), character: fr ? 'Modèle' : 'Model', performer: '', callTime: '08:30', status: '' }],
            crew:   [
                { id: rid(), role: fr ? 'Photographe' : 'Photographer', name: '', contact: '' },
                { id: rid(), role: fr ? 'Styliste' : 'Stylist', name: '', contact: '' },
            ],
            props:  [{ id: rid(), item: '', usage: '', owner: '', status: '' }],
            shots:  [{ id: rid(), code: 'A', act: fr ? 'Série 1' : 'Set 1', description: '', setup: '', status: '' }],
        };
    }
    return { scenes: [], cast: [], crew: [], props: [], shots: [] };
}

function blankDoc(id: string, title: string, language: 'EN' | 'FR', tpl: TemplateKey, isDefault = false): CallSheetDoc {
    const today = new Date().toISOString().slice(0, 10);
    return {
        id, title, dateStart: today, dateEnd: today,
        locationName: '', address: '', lat: null, lng: null, tz: 'auto',
        generalCall: '', skin: 'studio',
        scenes: [], cast: [], crew: [], props: [], shots: [], notes: '',
        weather: [], weatherUpdated: null, isDefault,
        ...seedFromTemplate(tpl, language),
    };
}

// ─── Print / PDF export (always clean layout) ──────────────────────────────────
function buildPrintHtml(cs: CallSheetDoc, language: 'EN' | 'FR'): string {
    const fr = language === 'FR';
    const esc = (s: string) => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
    const dates = cs.dateStart === cs.dateEnd ? cs.dateStart : `${cs.dateStart} → ${cs.dateEnd}`;
    const mapLink = cs.address
        ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cs.address)}">${esc(cs.locationName || cs.address)} ↗</a>`
        : esc(cs.locationName);
    const weather = cs.weather.length
        ? cs.weather.map(w => {
            const wd = new Date(w.date + 'T12:00:00').toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { weekday: 'short' });
            return `<strong>${wd}</strong> ${esc(w.summary)}`;
        }).join('<br>')
        : '—';

    const table = (title: string, cols: string[], rows: string[][]) => rows.length === 0 ? '' : `
        <h2>${esc(title)}</h2>
        <table><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

    return `<!doctype html><html lang="${fr ? 'fr' : 'en'}"><head><meta charset="utf-8">
    <title>${esc(cs.title)} — Call Sheet</title>
    <style>
      @page { margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; margin: 0; padding: 24px; max-width: 900px; }
      h1 { font-size: 26px; margin: 0 0 4px; letter-spacing: .5px; }
      h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1.5px solid #1a1a1a; padding-bottom: 4px; margin: 26px 0 10px; }
      .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 24px; font-size: 13px; margin: 14px 0; }
      .meta b { display: inline-block; min-width: 120px; text-transform: uppercase; font-size: 10px; letter-spacing: 1.5px; color: #555; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
      th { text-align: left; background: #f0ede6; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #d8d2c4; }
      td { padding: 6px 8px; border: 1px solid #e2ddd0; vertical-align: top; }
      .notes { white-space: pre-wrap; font-size: 13px; }
      a { color: #1a1a1a; }
      @media print { body { padding: 0; } }
    </style></head><body>
      <h1>${esc(cs.title || (fr ? 'Feuille de service' : 'Call Sheet'))}</h1>
      <div class="meta">
        <div><b>Date</b> ${esc(dates)}</div>
        <div><b>${fr ? 'Appel général' : 'General call'}</b> ${esc(cs.generalCall || '—')}</div>
        <div><b>${fr ? 'Lieu' : 'Location'}</b> ${mapLink || '—'}</div>
        <div><b>${fr ? 'Météo' : 'Weather'}</b> ${weather}</div>
      </div>
      ${table(fr ? 'Scènes du jour' : 'Scenes', [fr ? 'Heure' : 'Time', fr ? 'Scène' : 'Scene', fr ? 'Lieu' : 'Location', 'Notes'],
        cs.scenes.map(r => [r.time, r.scene, r.location, r.notes]))}
      ${table('Cast', [fr ? 'Personnage' : 'Character', fr ? 'Interprète' : 'Performer', fr ? 'Appel' : 'Call', fr ? 'Statut' : 'Status'],
        cs.cast.map(r => [r.character, r.performer, r.callTime, r.status]))}
      ${table(fr ? 'Équipe' : 'Crew', [fr ? 'Poste' : 'Role', fr ? 'Nom' : 'Name', 'Contact'],
        cs.crew.map(r => [r.role, r.name, r.contact]))}
      ${table('Props', [fr ? 'Objet' : 'Item', fr ? 'Usage' : 'Usage', fr ? 'Responsable' : 'Owner', fr ? 'Statut' : 'Status'],
        cs.props.map(r => [r.item, r.usage, r.owner, r.status]))}
      ${table(fr ? 'Shot list' : 'Shot list', [fr ? 'Plan' : 'Shot', 'Acte', 'Description', fr ? 'Setup' : 'Setup', fr ? 'Statut' : 'Status'],
        cs.shots.map(r => [r.code, r.act, r.description, r.setup, r.status]))}
      ${cs.notes ? `<h2>${fr ? 'Notes de production' : 'Production notes'}</h2><div class="notes">${esc(cs.notes)}</div>` : ''}
    </body></html>`;
}

// ─── Component ──────────────────────────────────────────────────────────────────
export const CallSheetTool: React.FC<CallSheetToolProps> = ({
    onClose, themeStyles, uid, language, formStyles, pageTitleClass,
}) => {
    const t = useCallback((en: string, fr: string) => (language === 'FR' ? fr : en), [language]);

    const [sheets, setSheets] = useState<CallSheetDoc[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [view, setView] = useState<'LIST' | 'EDIT'>('LIST');
    const [showNew, setShowNew] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newTpl, setNewTpl] = useState<TemplateKey>('FILM');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('');
    const [geoBusy, setGeoBusy] = useState(false);

    const flash = useCallback((msg: string) => {
        setStatus(msg);
        window.setTimeout(() => setStatus(''), 2600);
    }, []);

    // ─── Live subscription to the user's call sheets ─────────────────────────────
    useEffect(() => {
        if (!uid) {
            // Ephemeral demo sheet for not-logged-in visitors.
            setSheets([blankDoc('local', t('Demo shoot', 'Tournage démo'), language, 'FILM', true)]);
            setActiveId('local');
            return;
        }
        const db = studioDb(); if (!db) return;
        const unsub = onSnapshot(
            collection(db, 'members', uid, 'callsheets'),
            (snap) => {
                const list: CallSheetDoc[] = [];
                snap.forEach(d => {
                    const data = d.data() as any;
                    list.push({
                        ...blankDoc(d.id, data.title ?? t('Untitled', 'Sans titre'), language, 'BLANK'),
                        ...data, id: d.id,
                    });
                });
                list.sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0));
                setSheets(list);
            },
            () => { /* swallow */ },
        );
        return () => unsub();
    }, [uid, language, t]);

    const active = useMemo(() => sheets.find(s => s.id === activeId) ?? null, [sheets, activeId]);

    // ─── Persistence ─────────────────────────────────────────────────────────────
    const writeSheet = useCallback(async (id: string, patch: Partial<CallSheetDoc>) => {
        if (!uid || id === 'local') return;
        const db = studioDb(); if (!db) return;
        try {
            await setDoc(doc(db, 'members', uid, 'callsheets', id),
                { ...patch, updatedAt: serverTimestamp() }, { merge: true });
        } catch { /* swallow — local state is source of truth */ }
    }, [uid]);

    // Debounced patch of the active sheet (local optimistic + Firestore).
    const patchActive = useCallback((patch: Partial<CallSheetDoc>) => {
        if (!active) return;
        const id = active.id;
        setSheets(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
        void writeSheet(id, patch);
    }, [active, writeSheet]);

    // ─── CRUD ────────────────────────────────────────────────────────────────────
    const createSheet = useCallback(async () => {
        const title = newTitle.trim() || t('New call sheet', 'Nouvelle feuille');
        const id = `cs-${rid()}`;
        const seed = blankDoc(id, title, language, newTpl);
        setShowNew(false); setNewTitle('');
        if (!uid) {
            setSheets(prev => [seed, ...prev]); setActiveId(id); setView('EDIT'); return;
        }
        const db = studioDb(); if (!db) return;
        setBusy(true);
        try {
            const { id: _omit, ...payload } = seed;
            await setDoc(doc(db, 'members', uid, 'callsheets', id),
                { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            setActiveId(id); setView('EDIT');
        } finally { setBusy(false); }
    }, [newTitle, newTpl, uid, language, t]);

    const duplicateSheet = useCallback(async (src: CallSheetDoc) => {
        const id = `cs-${rid()}`;
        const copy: CallSheetDoc = { ...src, id, title: `${src.title} (${t('copy', 'copie')})`, isDefault: false };
        if (!uid) { setSheets(prev => [copy, ...prev]); return; }
        const db = studioDb(); if (!db) return;
        const { id: _o, createdAt: _c, updatedAt: _u, ...payload } = copy as any;
        await setDoc(doc(db, 'members', uid, 'callsheets', id),
            { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        flash(t('Duplicated', 'Dupliquée'));
    }, [uid, t, flash]);

    const deleteSheet = useCallback(async (id: string) => {
        const target = sheets.find(s => s.id === id);
        if (!target) return;
        if (!confirm(t(`Delete "${target.title}"? This cannot be undone.`,
            `Supprimer « ${target.title} » ? Action irréversible.`))) return;
        if (!uid) { setSheets(prev => prev.filter(s => s.id !== id)); return; }
        const db = studioDb(); if (!db) return;
        await deleteDoc(doc(db, 'members', uid, 'callsheets', id));
        if (activeId === id) { setActiveId(null); setView('LIST'); }
    }, [sheets, uid, activeId, t]);

    // ─── Geocode + weather ─────────────────────────────────────────────────────────
    const locateAndForecast = useCallback(async () => {
        if (!active) return;
        const query = active.address.trim() || active.locationName.trim();
        if (!query) { flash(t('Enter an address first', 'Entre une adresse d\'abord')); return; }
        setGeoBusy(true);
        try {
            const g = await geocode(query);
            if (!g) { flash(t('Location not found', 'Lieu introuvable')); return; }
            let weather: DayForecast[] = [];
            try { weather = await fetchForecast(g.lat, g.lng, g.tz, active.dateStart, active.dateEnd, language); } catch { /* forecast may be out of range */ }
            patchActive({
                lat: g.lat, lng: g.lng, tz: g.tz,
                locationName: active.locationName || g.name,
                weather, weatherUpdated: weather.length ? Date.now() : active.weatherUpdated,
            });
            flash(weather.length
                ? t('Located + weather updated', 'Localisé + météo à jour')
                : t('Located (weather only ~16 days ahead)', 'Localisé (météo dispo ~16j avant)'));
        } finally { setGeoBusy(false); }
    }, [active, language, patchActive, flash, t]);

    const exportPdf = useCallback(() => {
        if (!active) return;
        const w = window.open('', '_blank');
        if (!w) { flash(t('Allow pop-ups to export', 'Autorise les pop-ups pour exporter')); return; }
        w.document.write(buildPrintHtml(active, language));
        w.document.close();
        w.focus();
        window.setTimeout(() => w.print(), 350);
    }, [active, language, flash, t]);

    // ─── Skin-aware document styles ─────────────────────────────────────────────────
    const clean = active?.skin === 'clean';
    const pageCls = clean
        ? 'bg-[#fbf9f4] text-neutral-900 border border-neutral-300'
        : `bg-black/40 text-neutral-200 border ${themeStyles?.border ?? 'border-white/10'}`;
    const sectionTitleCls = clean
        ? 'text-neutral-900 font-serif text-lg uppercase tracking-[0.2em] border-b-2 border-neutral-800 pb-1.5'
        : 'font-cinzel text-[#d4af37] text-lg uppercase tracking-[0.2em] border-b border-white/10 pb-1.5';
    const cellInputCls = clean
        ? 'w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white px-2 py-1.5 outline-none'
        : 'w-full bg-transparent text-sm text-neutral-200 placeholder-neutral-600 focus:bg-white/5 px-2 py-1.5 outline-none';
    const thCls = clean
        ? 'text-left text-[10px] uppercase tracking-widest text-neutral-500 font-bold bg-[#f0ede6] px-2 py-2 border border-neutral-300'
        : 'text-left text-[10px] uppercase tracking-widest text-neutral-400 font-bold bg-white/5 px-2 py-2 border border-white/10';
    const tdCls = clean ? 'border border-neutral-200 align-top' : 'border border-white/5 align-top';

    // ─── Generic editable table ──────────────────────────────────────────────────
    function EditableTable<T extends { id: string }>(props: {
        title: string;
        rows: T[];
        cols: { key: keyof T; label: string; w?: string }[];
        field: keyof CallSheetDoc;
        make: () => T;
    }) {
        const { title, rows, cols, field, make } = props;
        const update = (rowId: string, key: keyof T, value: string) =>
            patchActive({ [field]: rows.map(r => r.id === rowId ? { ...r, [key]: value } : r) } as any);
        const add = () => patchActive({ [field]: [...rows, make()] } as any);
        const del = (rowId: string) => patchActive({ [field]: rows.filter(r => r.id !== rowId) } as any);
        const move = (rowId: string, dir: -1 | 1) => {
            const i = rows.findIndex(r => r.id === rowId);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= rows.length) return;
            const next = [...rows];
            [next[i], next[j]] = [next[j], next[i]];
            patchActive({ [field]: next } as any);
        };
        return (
            <section className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <h3 className={sectionTitleCls + ' flex-1'}>{title}</h3>
                    <button onClick={add}
                        className="ml-3 shrink-0 text-[11px] uppercase tracking-widest px-3 py-1.5 border border-current opacity-70 hover:opacity-100 transition-opacity">
                        + {t('Row', 'Ligne')}
                    </button>
                </div>
                <div className="overflow-x-auto -mx-1 px-1">
                    <table className="w-full border-collapse min-w-[560px]">
                        <thead>
                            <tr>
                                {cols.map(c => <th key={String(c.key)} className={thCls} style={c.w ? { width: c.w } : undefined}>{c.label}</th>)}
                                <th className={thCls} style={{ width: '92px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr><td colSpan={cols.length + 1} className={tdCls + ' text-center text-xs opacity-50 py-4'}>
                                    {t('Empty — add a row', 'Vide — ajoute une ligne')}
                                </td></tr>
                            )}
                            {rows.map(r => (
                                <tr key={r.id}>
                                    {cols.map(c => (
                                        <td key={String(c.key)} className={tdCls}>
                                            <input
                                                className={cellInputCls}
                                                value={String(r[c.key] ?? '')}
                                                placeholder={c.label}
                                                onChange={e => update(r.id, c.key, e.target.value)}
                                            />
                                        </td>
                                    ))}
                                    <td className={tdCls}>
                                        <div className="flex items-center justify-center gap-1 px-1">
                                            <button onClick={() => move(r.id, -1)} className="opacity-40 hover:opacity-100 px-1" title={t('Up', 'Monter')}>↑</button>
                                            <button onClick={() => move(r.id, 1)}  className="opacity-40 hover:opacity-100 px-1" title={t('Down', 'Descendre')}>↓</button>
                                            <button onClick={() => del(r.id)} className="opacity-40 hover:opacity-100 hover:text-rose-400 px-1" title={t('Delete', 'Supprimer')}>✕</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        );
    }

    // ─── Render: listing view ─────────────────────────────────────────────────────
    const renderList = () => (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className={`text-3xl md:text-4xl ${pageTitleClass}`}>{t('Call Sheets', 'Feuilles de service')}</h2>
                <button onClick={() => setShowNew(true)}
                    className="px-5 py-2.5 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-all">
                    + {t('New', 'Nouvelle')}
                </button>
            </div>

            {sheets.length === 0 ? (
                <div className="border border-white/10 bg-black/30 p-12 text-center">
                    <p className="text-neutral-400 mb-1">{t('No call sheets yet.', 'Aucune feuille de service.')}</p>
                    <p className="text-neutral-600 text-sm">{t('Create one to plan a shoot, share it with your team.', 'Crées-en une pour planifier un tournage et la partager à ton équipe.')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sheets.map(s => (
                        <div key={s.id} className="group bg-black/40 border border-white/10 hover:border-[#c5a059]/50 transition-all p-5 flex flex-col">
                            <button onClick={() => { setActiveId(s.id); setView('EDIT'); }} className="text-left flex-1">
                                <h3 className="font-cinzel text-white text-lg leading-snug mb-1 line-clamp-2">{s.title}</h3>
                                <p className="text-neutral-500 text-xs">
                                    {s.dateStart === s.dateEnd ? s.dateStart : `${s.dateStart} → ${s.dateEnd}`}
                                </p>
                                <p className="text-neutral-600 text-xs mt-1">{s.locationName || t('No location', 'Sans lieu')}</p>
                                <div className="flex gap-3 mt-3 text-[10px] uppercase tracking-widest text-neutral-500">
                                    <span>{s.cast.length} cast</span>
                                    <span>{s.shots.length} {t('shots', 'plans')}</span>
                                    <span className={s.skin === 'clean' ? 'text-neutral-400' : 'text-[#c5a059]'}>{s.skin === 'clean' ? t('clean', 'épuré') : t('studio', 'studio')}</span>
                                </div>
                            </button>
                            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5 text-[10px] uppercase tracking-widest">
                                <button onClick={() => { setActiveId(s.id); setView('EDIT'); }} className="text-[#c5a059] hover:text-[#d4b06a]">{t('Open', 'Ouvrir')}</button>
                                <button onClick={() => duplicateSheet(s)} className="text-neutral-400 hover:text-white">{t('Duplicate', 'Dupliquer')}</button>
                                <button onClick={() => deleteSheet(s.id)} className="text-neutral-500 hover:text-rose-400 ml-auto">{t('Delete', 'Suppr.')}</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ─── Render: editor view ──────────────────────────────────────────────────────
    const renderEditor = () => {
        if (!active) return null;
        const labelCls = clean ? 'text-[10px] uppercase tracking-widest text-neutral-500' : 'text-[10px] uppercase tracking-widest text-neutral-400';
        const fieldCls = clean
            ? 'bg-white border border-neutral-300 text-neutral-900 px-3 py-2 text-sm w-full outline-none focus:border-neutral-500'
            : 'bg-black/40 border border-white/10 text-neutral-200 px-3 py-2 text-sm w-full outline-none focus:border-[#c5a059]/50';
        return (
            <div className="max-w-4xl mx-auto p-3 md:p-6">
                <div className={`p-5 md:p-8 ${pageCls}`}>
                    {/* Title */}
                    <input
                        className={(clean ? 'text-neutral-900' : 'text-white') + ' w-full bg-transparent font-cinzel text-2xl md:text-4xl outline-none mb-5'}
                        value={active.title}
                        placeholder={t('Project title', 'Titre du projet')}
                        onChange={e => patchActive({ title: e.target.value })}
                    />

                    {/* Header meta */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <label className="block"><span className={labelCls}>{t('Start date', 'Date début')}</span>
                            <input type="date" className={fieldCls} value={active.dateStart} onChange={e => patchActive({ dateStart: e.target.value })} /></label>
                        <label className="block"><span className={labelCls}>{t('End date', 'Date fin')}</span>
                            <input type="date" className={fieldCls} value={active.dateEnd} onChange={e => patchActive({ dateEnd: e.target.value })} /></label>
                        <label className="block"><span className={labelCls}>{t('General call', 'Appel général')}</span>
                            <input className={fieldCls} value={active.generalCall} placeholder="08:00" onChange={e => patchActive({ generalCall: e.target.value })} /></label>
                        <label className="block"><span className={labelCls}>{t('Location name', 'Nom du lieu')}</span>
                            <input className={fieldCls} value={active.locationName} placeholder={t('e.g. Old Mill', 'ex. Vieux Moulin')} onChange={e => patchActive({ locationName: e.target.value })} /></label>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-end mb-4">
                        <label className="block flex-1 w-full"><span className={labelCls}>{t('Address (for map + weather)', 'Adresse (carte + météo)')}</span>
                            <input className={fieldCls} value={active.address} placeholder={t('Street, city', 'Rue, ville')} onChange={e => patchActive({ address: e.target.value })} /></label>
                        <button onClick={locateAndForecast} disabled={geoBusy}
                            className="shrink-0 px-4 py-2 border border-[#c5a059]/60 text-[#c5a059] text-[11px] uppercase tracking-widest hover:bg-[#c5a059]/10 disabled:opacity-40">
                            {geoBusy ? '…' : `📍 ${t('Locate + weather', 'Localiser + météo')}`}
                        </button>
                    </div>

                    {/* Weather strip */}
                    {active.weather.length > 0 && (
                        <div className={(clean ? 'bg-[#f0ede6] border-neutral-300 text-neutral-700' : 'bg-white/5 border-white/10 text-neutral-300') + ' border px-4 py-3 mb-6 text-xs space-y-1'}>
                            {active.weather.map(w => {
                                const wd = new Date(w.date + 'T12:00:00').toLocaleDateString(language === 'FR' ? 'fr-CA' : 'en-CA', { weekday: 'long' });
                                return <div key={w.date}>🌤 <strong className="capitalize">{wd}</strong> — {w.summary}</div>;
                            })}
                        </div>
                    )}

                    {/* Tables */}
                    <EditableTable title={t('Scenes', 'Scènes du jour')} rows={active.scenes} field="scenes"
                        make={() => ({ id: rid(), time: '', scene: '', location: '', notes: '' })}
                        cols={[
                            { key: 'time', label: t('Time', 'Heure'), w: '90px' },
                            { key: 'scene', label: t('Scene', 'Scène') },
                            { key: 'location', label: t('Location', 'Lieu') },
                            { key: 'notes', label: 'Notes' },
                        ]} />
                    <EditableTable title="Cast" rows={active.cast} field="cast"
                        make={() => ({ id: rid(), character: '', performer: '', callTime: '', status: '' })}
                        cols={[
                            { key: 'character', label: t('Character', 'Personnage') },
                            { key: 'performer', label: t('Performer', 'Interprète') },
                            { key: 'callTime', label: t('Call', 'Appel'), w: '90px' },
                            { key: 'status', label: t('Status', 'Statut'), w: '120px' },
                        ]} />
                    <EditableTable title={t('Crew', 'Équipe')} rows={active.crew} field="crew"
                        make={() => ({ id: rid(), role: '', name: '', contact: '' })}
                        cols={[
                            { key: 'role', label: t('Role', 'Poste') },
                            { key: 'name', label: t('Name', 'Nom') },
                            { key: 'contact', label: 'Contact' },
                        ]} />
                    <EditableTable title="Props" rows={active.props} field="props"
                        make={() => ({ id: rid(), item: '', usage: '', owner: '', status: '' })}
                        cols={[
                            { key: 'item', label: t('Item', 'Objet') },
                            { key: 'usage', label: t('Usage', 'Usage') },
                            { key: 'owner', label: t('Owner', 'Responsable'), w: '130px' },
                            { key: 'status', label: t('Status', 'Statut'), w: '120px' },
                        ]} />
                    <EditableTable title={t('Shot list', 'Shot list')} rows={active.shots} field="shots"
                        make={() => ({ id: rid(), code: '', act: '', description: '', setup: '', status: '' })}
                        cols={[
                            { key: 'code', label: t('Shot', 'Plan'), w: '70px' },
                            { key: 'act', label: 'Acte', w: '90px' },
                            { key: 'description', label: 'Description' },
                            { key: 'setup', label: 'Setup' },
                            { key: 'status', label: t('Status', 'Statut'), w: '110px' },
                        ]} />

                    {/* Production notes */}
                    <section>
                        <h3 className={sectionTitleCls + ' mb-2'}>{t('Production notes', 'Notes de production')}</h3>
                        <textarea
                            className={fieldCls + ' min-h-[120px] resize-y'}
                            value={active.notes}
                            placeholder={t('Logistics, parking, catering, safety…', 'Logistique, stationnement, bouffe, sécurité…')}
                            onChange={e => patchActive({ notes: e.target.value })}
                        />
                    </section>
                </div>
            </div>
        );
    };

    // ─── Shell ────────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[80] bg-[#050505] overflow-y-auto">
            {/* Top bar */}
            <div className="sticky top-0 z-10 bg-[#050505]/95 backdrop-blur-md border-b border-white/10">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
                    {view === 'EDIT' ? (
                        <button onClick={() => setView('LIST')} className="text-neutral-400 hover:text-white text-sm">← {t('All sheets', 'Mes feuilles')}</button>
                    ) : (
                        <span className="font-cinzel text-white uppercase tracking-widest text-sm">{t('Call Sheets', 'Feuilles de service')}</span>
                    )}

                    {view === 'EDIT' && active && (
                        <div className="flex items-center gap-2 ml-auto">
                            {/* Skin toggle */}
                            <div className="flex border border-white/15 rounded overflow-hidden text-[10px] uppercase tracking-widest">
                                <button onClick={() => patchActive({ skin: 'studio' })}
                                    className={`px-3 py-1.5 ${active.skin !== 'clean' ? 'bg-[#c5a059] text-black' : 'text-neutral-400 hover:text-white'}`}>{t('Studio', 'Studio')}</button>
                                <button onClick={() => patchActive({ skin: 'clean' })}
                                    className={`px-3 py-1.5 ${active.skin === 'clean' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}>{t('Clean', 'Épuré')}</button>
                            </div>
                            <button onClick={exportPdf}
                                className="px-3 py-1.5 border border-white/15 text-neutral-300 hover:text-white text-[10px] uppercase tracking-widest">🖨 PDF</button>
                        </div>
                    )}

                    <button onClick={onClose} aria-label={t('Close', 'Fermer')}
                        className={(view === 'EDIT' ? '' : 'ml-auto ') + 'w-9 h-9 flex items-center justify-center border border-white/15 text-neutral-400 hover:text-white hover:border-white/40'}>✕</button>
                </div>
            </div>

            {status && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-[#c5a059] text-black text-xs font-bold uppercase tracking-widest rounded shadow-lg">
                    {status}
                </div>
            )}

            {view === 'LIST' ? renderList() : renderEditor()}

            {/* New-sheet modal */}
            {showNew && (
                <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
                    <div className={`w-full max-w-md p-6 ${formStyles.container}`} onClick={e => e.stopPropagation()}>
                        <h3 className={`text-2xl mb-4 ${pageTitleClass}`}>{t('New call sheet', 'Nouvelle feuille')}</h3>
                        <label className="block mb-4">
                            <span className="text-[10px] uppercase tracking-widest text-neutral-400">{t('Project title', 'Titre du projet')}</span>
                            <input autoFocus className={formStyles.input} value={newTitle}
                                placeholder={t('e.g. Spring music video', 'ex. Clip du printemps')}
                                onChange={e => setNewTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') createSheet(); }} />
                        </label>
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400">{t('Start from', 'Partir de')}</span>
                        <div className="grid grid-cols-3 gap-2 mt-2 mb-6">
                            {([['FILM', t('Film / Video', 'Film / Vidéo')], ['PHOTO', t('Photo', 'Photo')], ['BLANK', t('Blank', 'Vide')]] as [TemplateKey, string][]).map(([k, lbl]) => (
                                <button key={k} onClick={() => setNewTpl(k)}
                                    className={`py-3 text-[11px] uppercase tracking-widest border transition-all ${newTpl === k ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]' : 'border-white/10 text-neutral-400 hover:border-white/30'}`}>
                                    {lbl}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowNew(false)} className="flex-1 py-3 border border-white/15 text-neutral-400 hover:text-white text-[11px] uppercase tracking-widest">{t('Cancel', 'Annuler')}</button>
                            <button onClick={createSheet} disabled={busy}
                                className="flex-1 py-3 bg-[#c5a059] text-black font-bold text-[11px] uppercase tracking-widest hover:bg-[#d4b06a] disabled:opacity-50">
                                {busy ? '…' : t('Create', 'Créer')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
