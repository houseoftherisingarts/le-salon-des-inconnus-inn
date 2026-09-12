import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    suivreNotifications, marquerNotificationLue,
    suivreMessagesNonLus, suivreDemandesAmitieEnAttente,
    type ItemNotification, type ConversationNonLue, type DemandeAmitie,
} from './notifications';

type Cible = 'WALL' | 'COLLABORATE' | 'ROSTER';

interface Item {
    id: string;
    titre: string;
    cible: Cible;
    quand: number;
    lu: boolean;
}

const Pastille: React.FC<{ n: number }> = ({ n }) => n > 0 ? (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold bg-[#c5a059] text-[#18181b]">
        {n > 9 ? '9+' : n}
    </span>
) : null;

interface ClocheProps {
    uid: string;
    language: 'EN' | 'FR';
    onOuvrirOnglet: (tab: Cible) => void;
}

export const Cloche: React.FC<ClocheProps> = ({ uid, language, onOuvrirOnglet }) => {
    const t = (en: string, fr: string) => (language === 'EN' ? en : fr);

    const [notifs, setNotifs] = useState<ItemNotification[]>([]);
    const [messages, setMessages] = useState<ConversationNonLue[]>([]);
    const [demandes, setDemandes] = useState<DemandeAmitie[]>([]);
    const [ouverte, setOuverte] = useState(false);
    const boite = useRef<HTMLDivElement>(null);

    useEffect(() => suivreNotifications(uid, setNotifs), [uid]);
    useEffect(() => suivreMessagesNonLus(uid, setMessages), [uid]);
    useEffect(() => suivreDemandesAmitieEnAttente(uid, setDemandes), [uid]);

    useEffect(() => {
        if (!ouverte) return;
        const fermer = (e: MouseEvent) => { if (!boite.current?.contains(e.target as Node)) setOuverte(false); };
        document.addEventListener('mousedown', fermer);
        return () => document.removeEventListener('mousedown', fermer);
    }, [ouverte]);

    const items = useMemo<Item[]>(() => {
        const nItems: Item[] = notifs.map((n) => ({
            id: `n-${n.id}`,
            titre: n.type === 'commentaire'
                ? `${n.deNom} ${t('commented on your post', 'a commenté votre billet')}`
                : n.type === 'vote'
                    ? `${n.deNom} ${n.texte}`
                    : `${t('New badge', 'Nouveau badge')} : ${n.texte}`,
            cible: 'WALL' as Cible,
            quand: n.creeLe?.toMillis?.() ?? 0,
            lu: n.lu,
        }));
        const mItems: Item[] = messages.map((m) => ({
            id: `m-${m.id}`,
            titre: `${t('Message from', 'Message de')} ${m.autreNom}`,
            cible: 'COLLABORATE' as Cible,
            quand: m.quand,
            lu: false,
        }));
        const aItems: Item[] = demandes.map((d) => ({
            id: `a-${d.id}`,
            titre: `${d.deNom} ${t('sent you a friend request', 'vous demande en ami')}`,
            cible: 'COLLABORATE' as Cible,
            quand: 0,
            lu: false,
        }));
        return [...nItems, ...mItems, ...aItems].sort((a, b) => b.quand - a.quand).slice(0, 10);
    }, [notifs, messages, demandes, language]);

    const total = items.filter((i) => !i.lu).length || items.length;
    const bouton = 'relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/15 bg-black/40 backdrop-blur-md text-neutral-300 hover:border-[#c5a059]/50 hover:text-[#c5a059] transition-colors';

    return (
        <div ref={boite} className="relative">
            <button
                type="button"
                onClick={() => setOuverte((v) => !v)}
                className={bouton}
                aria-haspopup="true"
                aria-expanded={ouverte}
                aria-label={t('Notifications', 'Notifications') + (total ? `, ${total}` : '')}
                title={t('Notifications', 'Notifications')}
            >
                <motion.span animate={total ? { rotate: [0, -12, 10, -6, 0] } : { rotate: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} className="inline-flex">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                </motion.span>
                <Pastille n={total} />
            </button>

            <AnimatePresence>
                {ouverte && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[15px] overflow-hidden bg-black/80 backdrop-blur-xl border border-white/15 shadow-2xl"
                        role="menu"
                    >
                        <p className="px-4 pt-3.5 pb-2 text-[10px] font-cinzel uppercase tracking-[0.18em] text-neutral-500 border-b border-white/10">
                            {t('What’s waiting for you', 'Ce qui vous attend')}
                        </p>
                        {items.length === 0 ? (
                            <p className="px-4 py-5 text-sm text-neutral-500 font-lato">{t('Nothing new. All caught up.', 'Rien de neuf. Tout est à jour.')}</p>
                        ) : (
                            <ul className="max-h-[60vh] overflow-y-auto py-1">
                                {items.map((item) => (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (item.id.startsWith('n-')) void marquerNotificationLue(uid, item.id.slice(2));
                                                onOuvrirOnglet(item.cible);
                                                setOuverte(false);
                                            }}
                                            className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                                        >
                                            <span className="text-sm text-neutral-200 font-lato">{item.titre}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
