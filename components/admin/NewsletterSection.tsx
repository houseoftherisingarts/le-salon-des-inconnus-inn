import React, { useMemo, useState } from 'react';
import type { WwooferProfile } from '../../types';

// Newsletter audience builder. Pure view over the data already loaded in
// the parent (no extra Firestore subscription). The admin picks which
// member sources to include, and the component dedupes + exposes the
// recipient list as: copy-to-clipboard (BCC paste), CSV download, or a
// mailto link (small audiences only — most clients reject very long
// mailto URLs, so we cap that path).

interface Reg     { uid: string; email?: string; displayName?: string }
interface Ticket  { uid: string; email?: string; displayName?: string }
interface Affiliate {
    uid: string;
    email?: string;
    displayName?: string;
    status: 'waiting' | 'accepted' | 'refused';
}

interface NewsletterSectionProps {
    registrations: Reg[];
    showTickets:   Ticket[];
    wwoofers:      WwooferProfile[];
    affiliates:    Affiliate[];
}

type SourceKey = 'registrations' | 'tickets' | 'wwoofers' | 'affiliates';

interface Recipient {
    email: string;
    name?: string;
    sources: Set<SourceKey>;
}

const MAILTO_HARD_CAP = 60; // most clients accept ~2KB of URL, ~60 emails

export const NewsletterSection: React.FC<NewsletterSectionProps> = ({
    registrations, showTickets, wwoofers, affiliates,
}) => {
    const [enabled, setEnabled] = useState<Record<SourceKey, boolean>>({
        registrations: true,
        tickets:       true,
        wwoofers:      false,
        affiliates:    false,
    });
    const [copied, setCopied] = useState(false);

    // Build a deduped recipient list, tracking which sources contributed
    // each address so the admin can see why someone is on the list.
    const recipients = useMemo<Recipient[]>(() => {
        const map = new Map<string, Recipient>();
        const add = (email: string | undefined, name: string | undefined, source: SourceKey) => {
            if (!email) return;
            const key = email.trim().toLowerCase();
            if (!key) return;
            const existing = map.get(key);
            if (existing) {
                existing.sources.add(source);
                if (!existing.name && name) existing.name = name;
            } else {
                map.set(key, { email: key, name, sources: new Set([source]) });
            }
        };
        if (enabled.registrations) registrations.forEach(r => add(r.email, r.displayName, 'registrations'));
        if (enabled.tickets)       showTickets.forEach(t => add(t.email, t.displayName, 'tickets'));
        if (enabled.wwoofers)      wwoofers.forEach(w => add(w.email, w.displayName, 'wwoofers'));
        if (enabled.affiliates)    affiliates
            .filter(a => a.status === 'accepted')
            .forEach(a => add(a.email, a.displayName, 'affiliates'));
        return Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
    }, [enabled, registrations, showTickets, wwoofers, affiliates]);

    const emailLine = recipients.map(r => r.email).join(', ');

    const copyEmails = async () => {
        try {
            await navigator.clipboard.writeText(emailLine);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* clipboard rejected — silent */ }
    };

    const downloadCsv = () => {
        const header = ['Email', 'Nom', 'Sources'];
        const rows = recipients.map(r => [r.email, r.name ?? '', Array.from(r.sources).join(' + ')]);
        const csv = [header, ...rows]
            .map(line => line.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const mailtoHref = recipients.length === 0 || recipients.length > MAILTO_HARD_CAP
        ? null
        : `mailto:?bcc=${encodeURIComponent(emailLine)}`;

    const toggleSource = (k: SourceKey) =>
        setEnabled(prev => ({ ...prev, [k]: !prev[k] }));

    const sourceCounts: Record<SourceKey, number> = {
        registrations: registrations.filter(r => r.email).length,
        tickets:       showTickets.filter(t => t.email).length,
        wwoofers:      wwoofers.filter(w => w.email).length,
        affiliates:    affiliates.filter(a => a.email && a.status === 'accepted').length,
    };

    return (
        <div className="space-y-6">
            <p className="text-neutral-500 text-sm font-lato max-w-2xl">
                Composez une audience à partir des sources existantes. Aucune intégration externe — utilisez
                « Copier » pour coller dans le BCC d'un courriel, ou exportez en CSV pour Mailchimp/SendGrid.
            </p>

            {/* Source toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {([
                    { k: 'registrations', label: 'Inscriptions' },
                    { k: 'tickets',       label: 'Billets' },
                    { k: 'wwoofers',      label: 'Wwoofers' },
                    { k: 'affiliates',    label: 'Affiliés acceptés' },
                ] as { k: SourceKey; label: string }[]).map(({ k, label }) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => toggleSource(k)}
                        className={`text-left p-4 border transition-all ${
                            enabled[k]
                                ? 'border-[#c5a059]/60 bg-[#1a1208]/50'
                                : 'border-white/10 bg-[#0a0a0a] hover:border-white/20'
                        }`}
                    >
                        <p className="font-cinzel text-[9px] uppercase tracking-[0.4em] mb-1.5 text-neutral-500">
                            {label}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className={`font-prata text-2xl ${enabled[k] ? 'text-[#f3e5ab]' : 'text-neutral-600'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {sourceCounts[k]}
                            </span>
                            <span className={`text-[10px] font-josefin uppercase tracking-[0.3em] ${enabled[k] ? 'text-[#c5a059]' : 'text-neutral-700'}`}>
                                {enabled[k] ? '✓ inclus' : 'exclus'}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Audience summary + actions */}
            <div className="border border-[#c5a059]/30 bg-[#1a1208]/30 p-5">
                <div className="flex items-baseline justify-between gap-4 flex-wrap mb-4">
                    <div>
                        <p className="font-cinzel text-[#c5a059] text-[9px] uppercase tracking-[0.45em] mb-1">
                            Audience
                        </p>
                        <p className="font-prata text-[#f3e5ab] text-3xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {recipients.length}
                        </p>
                        <p className="text-neutral-500 text-xs font-lato mt-1">
                            destinataires uniques après dédoublonnage
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={copyEmails}
                            disabled={recipients.length === 0}
                            className="px-4 py-2 bg-[#d4af37] text-black text-[10px] font-cinzel font-bold uppercase tracking-[0.4em] hover:bg-[#f3e5ab] disabled:opacity-30 transition-colors"
                        >
                            {copied ? '✓ Copié' : 'Copier (BCC)'}
                        </button>
                        <button
                            type="button"
                            onClick={downloadCsv}
                            disabled={recipients.length === 0}
                            className="px-4 py-2 border border-[#c5a059]/50 text-[#f3e5ab] text-[10px] font-cinzel uppercase tracking-[0.4em] hover:bg-[#c5a059]/10 disabled:opacity-30 transition-colors"
                        >
                            Export CSV
                        </button>
                        {mailtoHref ? (
                            <a
                                href={mailtoHref}
                                className="px-4 py-2 border border-white/15 text-neutral-300 text-[10px] font-cinzel uppercase tracking-[0.4em] hover:border-white/30 hover:text-white transition-colors"
                            >
                                Ouvrir mailto
                            </a>
                        ) : recipients.length > MAILTO_HARD_CAP && (
                            <span className="px-4 py-2 text-neutral-700 text-[10px] font-cinzel uppercase tracking-[0.4em]">
                                Mailto désactivé · trop de destinataires
                            </span>
                        )}
                    </div>
                </div>

                {/* Preview list */}
                {recipients.length === 0 ? (
                    <p className="py-8 text-center text-neutral-700 italic font-lato text-xs">
                        Aucun destinataire. Activez au moins une source ci-dessus.
                    </p>
                ) : (
                    <div className="max-h-72 overflow-y-auto border-t border-white/5 pt-3">
                        <table className="w-full text-xs font-lato">
                            <thead className="text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-600">
                                <tr>
                                    <th className="text-left pb-2">Email</th>
                                    <th className="text-left pb-2">Nom</th>
                                    <th className="text-left pb-2">Sources</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recipients.map(r => (
                                    <tr key={r.email} className="border-t border-white/5">
                                        <td className="py-1.5 text-neutral-300 font-mono text-[11px]">{r.email}</td>
                                        <td className="py-1.5 text-neutral-500">{r.name ?? '—'}</td>
                                        <td className="py-1.5 text-neutral-600 text-[10px] uppercase tracking-wider">
                                            {Array.from(r.sources).join(' + ')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
