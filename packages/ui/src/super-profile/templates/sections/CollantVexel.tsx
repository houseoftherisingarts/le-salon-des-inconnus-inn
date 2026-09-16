// CollantVexel : le collant Vexel en foil holographique, source canonique
// (règle d'Alex du 11 septembre : toujours en foil, sur tout site). Un clic
// ouvre la carte qui dit qui a bâti le site, avec « un projet créatif du Salon
// des Inconnus » et le sigle doré du Salon. Sorti de PiedDePage.tsx le
// 16 septembre 2026 pour que le pied de page du Salon le réemploie tel quel
// (import '@inconnus/ui/collant'). Le CSS du foil voyage avec le composant.

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useTexte } from '../shared';

const VEXEL_URL = 'https://vexelwebstudio.com/';
const SALON_URL = 'https://www.lesalondesinconnus.com/';

const FOIL_CSS = `
.spf-foil {
  --mx: 30%; --my: 30%; --rx: 0deg; --ry: 0deg;
  color: #fff;
  background:
    radial-gradient(120% 120% at var(--mx) var(--my), rgb(255 255 255 / 0.18), transparent 55%),
    linear-gradient(135deg, #1b1b22 0%, #050505 60%, #14141a 100%);
  overflow: hidden;
  isolation: isolate;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35), 0 10px 24px -10px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.25);
  transform: perspective(600px) rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms cubic-bezier(0.22,1,0.36,1);
  will-change: transform;
}
.spf-foil:hover { box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35), 0 18px 34px -12px rgb(0 0 0 / 0.65), inset 0 1px 0 rgb(255 255 255 / 0.35); }
.spf-foil-sheen {
  position: absolute; inset: -40%; pointer-events: none;
  background: repeating-conic-gradient(from 200deg at var(--mx) var(--my), #ff9ecb 0deg, #ffe08a 24deg, #9bffcf 48deg, #8ad4ff 72deg, #c9a4ff 96deg, #ff9ecb 120deg);
  opacity: 0.16; mix-blend-mode: color-dodge; filter: saturate(1.2) blur(2px);
  transition: opacity 260ms cubic-bezier(0.22,1,0.36,1); z-index: 0;
}
.spf-foil:hover .spf-foil-sheen { opacity: 0.32; }
.spf-foil-grain {
  position: absolute; inset: 0; pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>");
  mix-blend-mode: soft-light; opacity: 0.35; z-index: 0;
}
.spf-foil > *:not(.spf-foil-sheen):not(.spf-foil-grain) { position: relative; z-index: 1; }
`;

/** Le reflet suit le pointeur (--mx, --my) et incline légèrement le sticker (--rx, --ry). */
function useFoil() {
    const ref = React.useRef<HTMLButtonElement>(null);
    const suivre = React.useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        el.style.setProperty('--rx', `${((0.5 - y) * 10).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${((x - 0.5) * 12).toFixed(2)}deg`);
    }, []);
    const relacher = React.useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty('--mx', '30%');
        el.style.setProperty('--my', '30%');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
    }, []);
    return { ref, suivre, relacher };
}

/** Le collant, désormais un bouton : il ouvre la carte au lieu de quitter le site directement. */
export const CollantVexel: React.FC<{ language: 'EN' | 'FR' }> = ({ language }) => {
    const t = useTexte(language);
    const { ref, suivre, relacher } = useFoil();
    const [ouvert, setOuvert] = React.useState(false);

    React.useEffect(() => {
        if (!ouvert) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [ouvert]);

    return (
        <>
            <style>{FOIL_CSS}</style>
            <button
                ref={ref}
                type="button"
                onClick={() => setOuvert(true)}
                onPointerMove={suivre}
                onPointerLeave={relacher}
                aria-label={t('Site by Vexel Webstudio: learn more', 'Site créé par Vexel Webstudio : en savoir plus')}
                className="spf-foil inline-flex items-center gap-3 rounded-[15px] px-4 py-3 select-none"
            >
                <span aria-hidden className="spf-foil-sheen" />
                <span aria-hidden className="spf-foil-grain" />
                <img src="/vexel-logo.png" alt="" width={329} height={320} className="relative h-10 w-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                <span className="relative flex flex-col leading-none">
                    <span className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-white/70">{t('Site by', 'Site créé par')}</span>
                    <span className="mt-1 font-prata text-[1.05rem] text-white">Vexel Webstudio</span>
                </span>
            </button>

            {ouvert && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setOuvert(false); }}
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('A site built to last', 'Un site bâti pour durer')}
                >
                    <div className="w-full max-w-[880px] sm:aspect-[16/9] bg-[#0a0908] border border-white/10 rounded-[20px] overflow-hidden shadow-2xl flex flex-col sm:flex-row">
                        <div className="sm:w-[42%] bg-black flex items-center justify-center p-8">
                            <img src="/vexel-logo.png" alt="Vexel Webstudio" width={329} height={320} className="w-40 h-40 object-contain drop-shadow-[0_20px_40px_rgba(197,160,89,0.35)]" />
                        </div>
                        <div className="flex-1 p-6 md:p-10 flex flex-col relative">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-cinzel text-[13px] font-bold uppercase tracking-[0.22em] text-[#c5a059]">Vexel Webstudio</p>
                                    <p className="text-[13px] text-neutral-400 mt-1">{t('a creative project of Le Salon des Inconnus', 'un projet créatif du Salon des Inconnus')}</p>
                                    <h3 className="font-prata text-2xl md:text-3xl text-[#f3e5ab] mt-2 leading-tight">{t('A site built to last', 'Un site bâti pour durer')}</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOuvert(false)}
                                    aria-label={t('Close', 'Fermer')}
                                    className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>
                            <p className="text-[15px] text-neutral-300 leading-relaxed mt-5 max-w-prose">
                                {t(
                                    'This site was designed and built by Vexel Webstudio, a Quebec studio that makes tailored websites: the design, the code, the member area and the administration you see here. If you carry a project that deserves the same care, the studio is one click away.',
                                    "Ce site a été conçu et bâti par Vexel Webstudio, un studio du Québec qui fait des sites sur mesure : le design, le code, l'espace membre et l'administration que vous voyez ici. Si vous portez un projet qui mérite le même soin, le studio se visite d'un clic."
                                )}
                            </p>
                            <div className="mt-auto pt-8 flex flex-wrap gap-3 pr-20 sm:pr-24">
                                <a
                                    href={VEXEL_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#c5a059] text-black font-semibold text-sm min-h-[44px] px-6 hover:bg-[#d4af37] transition-colors"
                                >
                                    {t('Visit Vexel Webstudio', 'Visiter Vexel Webstudio')}
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setOuvert(false)}
                                    className="inline-flex items-center justify-center rounded-full border border-white/15 text-neutral-300 text-sm min-h-[44px] px-5 hover:border-white/40 hover:text-white transition-colors"
                                >
                                    {t('Not now', 'Pas maintenant')}
                                </button>
                            </div>
                            {/* Le Salon des Inconnus, en bas à droite de la carte : le studio est un projet du Salon (Alex, 14 septembre 2026). */}
                            <a
                                href={SALON_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t('Le Salon des Inconnus', 'Le Salon des Inconnus')}
                                className="absolute bottom-5 right-5 md:bottom-7 md:right-7"
                            >
                                <img
                                    src="/salon-logo-or.png"
                                    alt={t('Le Salon des Inconnus', 'Le Salon des Inconnus')}
                                    className="h-16 md:h-20 w-auto object-contain drop-shadow-[0_2px_6px_rgba(197,160,89,0.35)]"
                                />
                            </a>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
