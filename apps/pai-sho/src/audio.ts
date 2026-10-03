// ─── La musique de fond ─────────────────────────────────────────────
// « Tea with Uncle Iroh », coupée à trois minutes et demie et jouée en
// boucle dès l'intro de marque (Alex, 3 octobre 2026). Le programme
// Mac l'autorise sans geste; sur le web, le navigateur peut refuser
// l'autoplay, alors la lecture repart au premier geste de la personne.

const BASE = import.meta.env.BASE_URL;
const CLE_SON = 'paisho.son';

let element: HTMLAudioElement | null = null;
let voulue = false;
let coupee = false;

function creer(): HTMLAudioElement {
  const a = new Audio();
  const opus = a.canPlayType('audio/ogg; codecs=opus') !== '';
  a.src = `${BASE}musique/${opus ? 'iroh.opus' : 'iroh.m4a'}`;
  a.loop = true;
  a.preload = 'auto';
  a.volume = 0.55;
  return a;
}

function essayer(): void {
  if (!element || !voulue || coupee) return;
  element.play().catch(() => {
    // Autoplay refusé : on attend le premier geste, une seule fois.
    const relancer = () => { essayer(); };
    window.addEventListener('pointerdown', relancer, { once: true });
    window.addEventListener('keydown', relancer, { once: true });
  });
}

/** Lance la musique (ou la relance quand elle a été coupée). */
export function jouerMusique(): void {
  element ??= creer();
  voulue = true;
  essayer();
}

/** Le bouton « Son » coupe tout, musique comprise. */
export function couperMusique(oui: boolean): void {
  coupee = oui;
  if (!element) return;
  if (oui) element.pause();
  else essayer();
}

export const sonSauve = (): boolean => { try { return localStorage.getItem(CLE_SON) !== '0'; } catch { return true; } };
export const sauverSon = (oui: boolean): void => { try { localStorage.setItem(CLE_SON, oui ? '1' : '0'); } catch { /* privé */ } };

/** Le programme Mac se reconnaît à son agent utilisateur. */
export const estElectron = (): boolean => /Electron/i.test(navigator.userAgent);
