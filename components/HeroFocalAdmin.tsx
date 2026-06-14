import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// ── Hero photo focal-point editor ────────────────────────────────────────────
// Opened with ?herofocal on the home page. Each hero photo is shown in a phone-
// shaped crop; drag it left/right to frame on the subject, then Save. Values are
// the CSS object-position % (0 = show left … 0.5 = centred … 1 = show right) and
// are stored in Firestore (config/innHeroFocus), which the live hero reads.
// Saving requires being signed in as an admin (Firestore rule).

const LABELS = ['Vue drone', 'La Maison', "L'Écrivaine", 'La Musicienne', 'La Cinéaste', "L'Amphithéâtre", 'La Yourte'];

interface Props {
  images: string[];
  defaults: number[];
  onClose: () => void;
}

export const HeroFocalAdmin: React.FC<Props> = ({ images, defaults, onClose }) => {
  const [focus, setFocus] = useState<number[]>(defaults);
  const [status, setStatus] = useState('');
  const drag = useRef<{ i: number; startX: number; startFx: number; w: number } | null>(null);

  useEffect(() => {
    if (!db) return;
    getDoc(doc(db, 'config', 'innHeroFocus'))
      .then((snap) => {
        const f = snap.exists() ? (snap.data().focus as number[]) : null;
        if (Array.isArray(f) && f.length === images.length) setFocus(f.map((v) => Math.min(1, Math.max(0, Number(v)))));
      })
      .catch(() => {});
  }, [images.length]);

  const onDown = (i: number) => (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
    drag.current = { i, startX: e.clientX, startFx: focus[i], w: (e.currentTarget as HTMLElement).clientWidth || 1 };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const next = Math.min(1, Math.max(0, d.startFx - dx / d.w)); // grab-pan: drag right reveals the left
    setFocus((arr) => arr.map((v, idx) => (idx === d.i ? next : v)));
  };
  const onUp = () => { drag.current = null; };

  const save = async () => {
    if (!db) { setStatus('Firebase non configuré.'); return; }
    setStatus('Enregistrement…');
    try {
      await setDoc(doc(db, 'config', 'innHeroFocus'), { focus, updatedAt: serverTimestamp() }, { merge: true });
      setStatus("Enregistré. Rafraîchissez la page d'accueil pour voir le résultat.");
    } catch (err) {
      setStatus('Échec. Connectez-vous comme admin (Espace Membre) puis réessayez.');
      console.error('hero focal save failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#0a0a0a] text-[#f3e5ab] overflow-y-auto p-4 md:p-8 font-josefin">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-cinzel uppercase tracking-[0.3em] text-xs md:text-sm">Cadrage des photos d'accueil</h2>
          <button onClick={onClose} className="px-4 py-2 border border-white/20 rounded-full text-[10px] uppercase tracking-widest hover:border-[#c5a059]">
            Fermer
          </button>
        </div>
        <p className="text-xs text-neutral-400 mb-5 max-w-2xl">
          Glissez chaque photo vers la gauche ou la droite pour la cadrer sur le sujet. L'aperçu est au format téléphone (le pire recadrage). Cliquez Enregistrer pour appliquer sur le site.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((src, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div
                onPointerDown={onDown(i)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                className="relative w-full rounded-md overflow-hidden border border-[#c5a059]/40 cursor-ew-resize touch-none bg-black"
                style={{ aspectRatio: '9 / 19.5' }}
              >
                <img
                  src={src}
                  alt={LABELS[i]}
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                  style={{ objectPosition: `${(focus[i] * 100).toFixed(1)}% center` }}
                />
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#f3e5ab]/40 pointer-events-none" />
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400">
                <span className="truncate pr-2">{LABELS[i]}</span>
                <span className="shrink-0">{(focus[i] * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-6">
          <button onClick={save} className="px-6 py-3 bg-[#c5a059] text-[#18181b] font-bold text-xs uppercase tracking-widest rounded-sm hover:bg-[#d4b06a]">
            Enregistrer
          </button>
          <button onClick={() => setFocus(defaults)} className="px-5 py-3 border border-white/20 text-xs uppercase tracking-widest rounded-sm hover:border-[#c5a059]">
            Réinitialiser
          </button>
          {status && <span className="text-xs text-neutral-300">{status}</span>}
        </div>
        <p className="text-[10px] text-neutral-500 mt-3 font-mono">focus = [{focus.map((f) => f.toFixed(2)).join(', ')}]</p>
      </div>
    </div>
  );
};

export default HeroFocalAdmin;
