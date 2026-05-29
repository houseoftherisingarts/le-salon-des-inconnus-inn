import React, { useEffect, useState } from 'react';
import { getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { buildPrintHtml, type CallSheetDoc } from './CallSheetTool';

interface CallSheetPublicViewProps {
    /** Owner uid from the /c/{uid}/{slug} path. */
    uid: string;
    /** Call-sheet doc id from the path. */
    slug: string;
    language: 'EN' | 'FR';
}

type Load = 'loading' | 'ready' | 'private' | 'missing';

// Public, read-only render of a shared call sheet. No auth required — the
// Firestore rule grants read when the doc has shareEnabled === true. Renders
// the exact clean print layout in a sandboxed iframe so the page matches the
// in-studio PDF export and the viewer can print / save it as PDF too.
export const CallSheetPublicView: React.FC<CallSheetPublicViewProps> = ({ uid, slug, language }) => {
    const fr = language === 'FR';
    const [state, setState] = useState<Load>('loading');
    const [html, setHtml] = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const db = getFirestore(getApp());
                const snap = await getDoc(doc(db, 'members', uid, 'callsheets', slug));
                if (!alive) return;
                if (!snap.exists()) { setState('missing'); return; }
                const data = snap.data() as Partial<CallSheetDoc>;
                if (!data.shareEnabled) { setState('private'); return; }
                setHtml(buildPrintHtml({ id: slug, ...(data as any) } as CallSheetDoc, language));
                setState('ready');
            } catch {
                // A rules denial (sharing off / not found) surfaces here too.
                if (alive) setState('private');
            }
        })();
        return () => { alive = false; };
    }, [uid, slug, language]);

    if (state === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fbf9f4] text-neutral-500">
                <p className="font-serif">{fr ? 'Chargement de la feuille de service…' : 'Loading call sheet…'}</p>
            </div>
        );
    }

    if (state !== 'ready') {
        const msg = state === 'missing'
            ? (fr ? 'Cette feuille de service n\'existe pas.' : 'This call sheet does not exist.')
            : (fr ? 'Cette feuille de service n\'est pas partagée publiquement.' : 'This call sheet is not shared publicly.');
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#fbf9f4] text-neutral-700 px-6 text-center">
                <p className="font-serif text-lg mb-2">{msg}</p>
                <a href="/" className="text-sm text-neutral-500 underline">{fr ? 'Retour au Salon' : 'Back to the Salon'}</a>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fbf9f4]">
            <div className="sticky top-0 z-10 bg-[#fbf9f4]/95 backdrop-blur border-b border-neutral-300 px-4 py-2 flex items-center justify-between">
                <a href="/" className="text-xs text-neutral-500 hover:text-neutral-800">← {fr ? 'Le Salon des Inconnus' : 'Le Salon des Inconnus'}</a>
                <button
                    onClick={() => {
                        const f = document.getElementById('cs-frame') as HTMLIFrameElement | null;
                        f?.contentWindow?.print();
                    }}
                    className="text-xs uppercase tracking-widest border border-neutral-400 text-neutral-700 hover:bg-neutral-800 hover:text-white px-3 py-1.5">
                    🖨 {fr ? 'Imprimer / PDF' : 'Print / PDF'}
                </button>
            </div>
            <iframe id="cs-frame" title="call-sheet" srcDoc={html} className="w-full" style={{ height: 'calc(100vh - 41px)', border: 'none', background: '#fbf9f4' }} />
        </div>
    );
};
