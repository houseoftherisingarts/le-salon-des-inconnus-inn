import React, { useState } from 'react';
import type { User } from 'firebase/auth';

// Generic admin shell — fixed left sidebar (collapsible on mobile via
// hamburger), brand block at top, vertical nav with icons, user chip +
// logout at bottom. Sticky main header carries the current section title
// + a "Voir le site" link. Modeled on the Krystine + Caroline references,
// re-skinned in the salon's gold/dark editorial palette.

export interface AdminNavItem<TId extends string = string> {
    id: TId;
    label: string;
    /** Right-side count badge (defaults to none). 0 is rendered as a dim "—". */
    badge?: number | string;
    /** Inline SVG path data for a 24×24 viewBox stroke icon. */
    iconPath: string;
    /** When true, draws a subtle divider above this item. */
    dividerBefore?: boolean;
}

interface AdminShellProps<TId extends string> {
    user: User;
    sectionId: TId;
    onSectionChange: (id: TId) => void;
    nav: AdminNavItem<TId>[];
    onBackToSite: () => void;
    onSignOut?: () => void;
    /** Page title fallback if the active nav item isn't found (rare). */
    title?: string;
    /** Replaces the default "Ceilidh · Mai 2026" subtitle in the brand block. */
    subtitle?: string;
    /** When set, renders a "Changer d'espace" button so admins can switch between
     *  Inn CRM and Artistic CRM without leaving the dashboard. */
    onSwitchSpace?: () => void;
    children: React.ReactNode;
}

export function AdminShell<TId extends string>({
    user, sectionId, onSectionChange, nav, onBackToSite, onSignOut, title, subtitle, onSwitchSpace, children,
}: AdminShellProps<TId>) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const current = nav.find((n) => n.id === sectionId);
    const headerTitle = current?.label ?? title ?? 'Admin';

    return (
        <div className="min-h-screen bg-[#050505] text-white font-lato flex">
            {/* ── Sidebar ───────────────────────────────────────────────── */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-white/5
                    flex flex-col transform transition-transform duration-300
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0 lg:static lg:z-0
                `}
            >
                {/* Brand block */}
                <div className="px-6 pt-7 pb-5 border-b border-white/5">
                    <p className="font-cinzel text-[#c5a059] text-[9px] uppercase tracking-[0.5em]">
                        Le Salon des Inconnus
                    </p>
                    <p className="font-prata text-[#f3e5ab] text-lg mt-1.5 leading-tight">
                        Admin CRM
                    </p>
                    <p className="font-josefin text-neutral-500 text-[10px] uppercase tracking-[0.3em] mt-0.5">
                        {subtitle ?? 'Ceilidh · Mai 2026'}
                    </p>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-3">
                    {nav.map((item) => {
                        const active = item.id === sectionId;
                        return (
                            <React.Fragment key={item.id}>
                                {item.dividerBefore && (
                                    <div className="my-2 mx-6 border-t border-white/5" />
                                )}
                                <button
                                    onClick={() => { onSectionChange(item.id); setMobileOpen(false); }}
                                    className={`
                                        w-full flex items-center gap-3 px-6 py-3 text-left transition-all border-l-2
                                        ${active
                                            ? 'bg-[#1a1208]/40 border-[#d4af37] text-[#f3e5ab]'
                                            : 'border-transparent text-neutral-500 hover:text-white hover:bg-white/5'}
                                    `}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.6}
                                        stroke="currentColor"
                                        fill="none"
                                        className="w-4 h-4 shrink-0"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} />
                                    </svg>
                                    <span className="flex-1 font-cinzel text-[10px] uppercase tracking-[0.3em] truncate">
                                        {item.label}
                                    </span>
                                    {item.badge !== undefined && item.badge !== 0 && item.badge !== '0' && (
                                        <span className={`text-[10px] font-josefin ${active ? 'text-[#d4af37]' : 'text-neutral-700'}`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            </React.Fragment>
                        );
                    })}
                </nav>

                {/* User + logout */}
                <div className="px-5 py-4 border-t border-white/5 text-xs">
                    <div className="flex items-center gap-3 mb-3">
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt=""
                                className="w-8 h-8 rounded-full border border-[#c5a059]/30 object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full border border-[#c5a059]/30 flex items-center justify-center bg-[#1a1208] text-[#f3e5ab] font-cinzel text-[11px]">
                                {(user.displayName?.[0] || user.email?.[0] || '?').toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="truncate text-neutral-300 font-josefin">
                                {user.displayName || user.email?.split('@')[0]}
                            </p>
                            <p className="truncate text-neutral-600 text-[10px]">{user.email}</p>
                        </div>
                    </div>
                    {onSwitchSpace && (
                        <button
                            onClick={onSwitchSpace}
                            className="w-full text-left text-[10px] uppercase tracking-[0.35em] font-cinzel text-neutral-500 hover:text-[#c5a059] transition-colors mb-3"
                        >
                            ⇄ Changer d'espace
                        </button>
                    )}
                    {onSignOut && (
                        <button
                            onClick={onSignOut}
                            className="w-full text-left text-[10px] uppercase tracking-[0.35em] font-cinzel text-neutral-600 hover:text-rose-400 transition-colors"
                        >
                            ← Déconnexion
                        </button>
                    )}
                </div>
            </aside>

            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── Main ──────────────────────────────────────────────────── */}
            <main className="flex-1 min-w-0 lg:ml-0">
                {/* Sticky header */}
                <header className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 px-5 lg:px-8 py-4 flex items-center gap-4">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="lg:hidden w-9 h-9 flex items-center justify-center rounded border border-white/10 text-neutral-400 hover:text-white hover:border-white/30 transition-colors"
                        aria-label="Open menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                        </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="font-cinzel text-[#c5a059] text-[9px] uppercase tracking-[0.45em]">Section</p>
                        <h1 className="font-prata text-[#f3e5ab] text-xl md:text-2xl leading-tight truncate">{headerTitle}</h1>
                    </div>
                    <button
                        onClick={onBackToSite}
                        className="hidden md:inline-flex items-center gap-2 px-3 py-2 border border-white/10 text-neutral-400 hover:text-[#f3e5ab] hover:border-[#c5a059]/40 font-cinzel text-[10px] uppercase tracking-[0.35em] transition-colors"
                    >
                        ↗ Voir le site
                    </button>
                </header>

                {/* Content panel */}
                <div className="p-5 lg:p-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
