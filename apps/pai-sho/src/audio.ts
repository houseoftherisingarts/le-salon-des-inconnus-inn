// ─── La musique de fond ─────────────────────────────────────────────
// « Tea with Uncle Iroh », coupée à trois minutes et demie et jouée en
// boucle dès l'intro de marque (Alex, 3 octobre 2026). Le programme
// Mac l'autorise sans geste; sur le web, le navigateur peut refuser
// l'autoplay, alors la lecture repart au premier geste de la personne.

const BASE = import.meta.env.BASE_URL;
const CLE_SON = 'paisho.son';
const CLE_VOLUME = 'paisho.volume';

let element: HTMLAudioElement | null = null;
let voulue = false;
let coupee = false;

function creer(): HTMLAudioElement {
  const a = new Audio();
  const opus = a.canPlayType('audio/ogg; codecs=opus') !== '';
  a.src = `${BASE}musique/${opus ? 'iroh.opus' : 'iroh.m4a'}`;
  a.loop = true;
  a.preload = 'auto';
  a.volume = volumeSauve();
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

/** Le volume de la musique, de 0 à 1, gardé d'une visite à l'autre. */
export function volumeSauve(): number {
  try {
    const brut = localStorage.getItem(CLE_VOLUME);
    const v = Number(brut);
    return brut !== null && v >= 0 && v <= 1 ? v : 0.55;
  } catch { return 0.55; }
}
export function reglerVolume(v: number): void {
  if (element) element.volume = v;
  try { localStorage.setItem(CLE_VOLUME, String(v)); } catch { /* privé */ }
}

export const sonSauve = (): boolean => { try { return localStorage.getItem(CLE_SON) !== '0'; } catch { return true; } };
export const sauverSon = (oui: boolean): void => { try { localStorage.setItem(CLE_SON, oui ? '1' : '0'); } catch { /* privé */ } };

/** Le programme Mac se reconnaît à son agent utilisateur. */
// Le programme Mac sert le jeu sous app:// ; l'agent utilisateur ne porte
// pas toujours « Electron » une fois le paquet signé par electron-builder.
export const estElectron = (): boolean => /Electron/i.test(navigator.userAgent) || location.protocol === 'app:';
