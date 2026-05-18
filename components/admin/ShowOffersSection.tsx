import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import {
    collection, onSnapshot, orderBy, query, doc, updateDoc, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import type { ShowOffer, ShowOfferStatus } from '../../types';

// Admin view of submitted show offers. Each row is expandable and has a
// status workflow: new → contacted → accepted | refused.

interface ShowOffersSectionProps {
    eventId: string;
}

const STATUS_LABEL: Record<ShowOfferStatus, string> = {
    new:       'Nouveau',
    contacted: 'Contacté',
    accepted:  'Accepté',
    refused:   'Refusé',
};

const STATUS_TONE: Record<ShowOfferStatus, string> = {
    new:       'border-rose-700/50 bg-rose-950/30 text-rose-300',
    contacted: 'border-sky-700/50  bg-sky-950/30  text-sky-300',
    accepted:  'border-emerald-700/50 bg-emerald-950/30 text-emerald-300',
    refused:   'border-neutral-700/50 bg-neutral-900/40 text-neutral-500',
};

const formatDate = (ts: any): string => {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' });
};

const dayShort = (id: string): string => {
    // 2026-05-22 → "22/05"
    const m = id.match(/^\d{4}-(\d{2})-(\d{2})$/);
    return m ? `${m[2]}/${m[1]}` : id;
};

export const ShowOffersSection: React.FC<ShowOffersSectionProps> = ({ eventId }) => {
    const [offers, setOffers] = useState<ShowOffer[]>([]);
    const [filter, setFilter] = useState<ShowOfferStatus | 'all'>('new');
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        if (!db) return;
        const unsub = onSnapshot(
            query(collection(db, 'events', eventId, 'showOffers'), orderBy('createdAt', 'desc')),
            (snap) => setOffers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as ShowOffer)),
            () => {},
        );
        return unsub;
    }, [eventId]);

    const setStatus = async (id: string, status: ShowOfferStatus) => {
        if (!db) return;
        await updateDoc(doc(db, 'events', eventId, 'showOffers', id), {
            status,
            decidedAt: status === 'new' ? null : serverTimestamp(),
        });
    };

    const handleDelete = async (id: string) => {
        if (!db) return;
        if (!confirm('Supprimer cette offre ?')) return;
        await deleteDoc(doc(db, 'events', eventId, 'showOffers', id));
        if (expanded === id) setExpanded(null);
    };

    const filtered = filter === 'all' ? offers : offers.filter(o => o.status === filter);

    const counts = {
        all:       offers.length,
        new:       offers.filter(o => o.status === 'new').length,
        contacted: offers.filter(o => o.status === 'contacted').length,
        accepted:  offers.filter(o => o.status === 'accepted').length,
        refused:   offers.filter(o => o.status === 'refused').length,
    };

    return (
        <div className="space-y-5">
            <p className="text-neutral-500 text-sm font-lato max-w-2xl">
                Offres de spectacle soumises par les artistes via la page Ceilidh. Le workflow va de
                « Nouveau » à « Contacté » puis « Accepté » ou « Refusé ».
            </p>

            {/* Status filter */}
            <div className="flex flex-wrap gap-2">
                {([
                    { k: 'new',       label: 'Nouveaux' },
                    { k: 'contacted', label: 'Contactés' },
                    { k: 'accepted',  label: 'Acceptés' },
                    { k: 'refused',   label: 'Refusés' },
                    { k: 'all',       label: 'Tous' },
                ] as { k: ShowOfferStatus | 'all'; label: string }[]).map(({ k, label }) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setFilter(k)}
                        className={`px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-[0.35em] border transition-colors ${
                            filter === k
                                ? 'border-[#c5a059]/60 bg-[#1a1208]/50 text-[#f3e5ab]'
                                : 'border-white/10 text-neutral-500 hover:text-neutral-300'
                        }`}
                    >
                        {label} ({counts[k]})
                    </button>
                ))}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <p className="py-12 text-center text-neutral-700 italic font-lato text-xs">
                    Aucune offre dans ce filtre.
                </p>
            ) : (
                <div className="border border-white/10 bg-[#0a0a0a] divide-y divide-white/5">
                    {filtered.map((o) => {
                        const isOpen = expanded === o.id;
                        return (
                            <div key={o.id}>
                                {/* Row header */}
                                <button
                                    type="button"
                                    onClick={() => setExpanded(isOpen ? null : o.id)}
                                    className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                                >
                                    <span className={`text-[9px] font-cinzel uppercase tracking-[0.35em] px-2 py-1 border ${STATUS_TONE[o.status]}`}>
                                        {STATUS_LABEL[o.status]}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="font-prata text-[#f3e5ab] text-base truncate">
                                                {o.artistName}
                                            </span>
                                            <span className={`text-[10px] font-cinzel uppercase tracking-[0.35em] ${
                                                o.type === 'paid' ? 'text-[#d4af37]' : 'text-emerald-400/80'
                                            }`}>
                                                {o.type === 'paid' ? 'Payant' : 'Don'}
                                                {o.type === 'paid' && o.requestedFeeCAD != null && ` · ${o.requestedFeeCAD} $`}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-neutral-500 truncate font-lato mt-0.5">
                                            {o.contactName} · {o.email}{o.phone ? ` · ${o.phone}` : ''}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-neutral-600 hidden md:inline tabular-nums">
                                        {formatDate(o.createdAt)}
                                    </span>
                                    <span className="text-neutral-600 text-xs">{isOpen ? '▾' : '▸'}</span>
                                </button>

                                {/* Expanded body */}
                                {isOpen && (
                                    <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-lato bg-black/30">
                                        <Detail label="Personnes" value={String(o.performersCount)} />
                                        <Detail label="Durée" value={`${o.durationMinutes} min`} />
                                        <Detail label="Acoustique" value={o.canUnplugged ? 'Oui' : 'Non'} />
                                        {o.genre && <Detail label="Genre" value={o.genre} />}
                                        {o.preferredDays?.length ? (
                                            <Detail label="Jours souhaités" value={o.preferredDays.map(dayShort).join(' · ')} />
                                        ) : null}
                                        {o.description && <Detail label="Description" value={o.description} full />}
                                        {o.technicalNeeds && <Detail label="Besoins techniques" value={o.technicalNeeds} full />}
                                        {o.notes && <Detail label="Notes" value={o.notes} full />}

                                        {/* Action row */}
                                        <div className="md:col-span-2 flex flex-wrap gap-2 pt-3 border-t border-white/5 mt-2">
                                            {(['new', 'contacted', 'accepted', 'refused'] as ShowOfferStatus[]).map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setStatus(o.id, s)}
                                                    className={`px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-[0.35em] border transition-colors ${
                                                        o.status === s
                                                            ? STATUS_TONE[s]
                                                            : 'border-white/10 text-neutral-500 hover:border-white/30 hover:text-neutral-200'
                                                    }`}
                                                >
                                                    → {STATUS_LABEL[s]}
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(o.id)}
                                                className="ml-auto px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-[0.35em] border border-red-900/40 text-red-400/80 hover:bg-red-950/30 transition-colors"
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const Detail: React.FC<{ label: string; value: string; full?: boolean }> = ({ label, value, full }) => (
    <div className={full ? 'md:col-span-2' : ''}>
        <p className="font-cinzel text-[9px] uppercase tracking-[0.4em] text-neutral-600 mb-1">{label}</p>
        <p className="text-neutral-300 whitespace-pre-wrap break-words">{value}</p>
    </div>
);
