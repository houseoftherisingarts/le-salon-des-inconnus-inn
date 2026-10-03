// ─── Les gestes sur le canevas ──────────────────────────────────────
// Un doigt ou la souris : un clic court choisit, un glisser tourne
// autour de la table. Deux doigts pincent, la molette zoome.

export interface Gestes {
  survol: (x: number, y: number) => void;
  clic: (x: number, y: number) => void;
  tourner: (dx: number, dy: number) => void;
  zoomer: (facteur: number) => void;
}

/** Au-delà de six pixels, le geste est un glisser et non un clic. */
const SEUIL_GLISSER = 6;

export function brancherGestes(c: HTMLElement, g: Gestes): void {
  const pointeurs = new Map<number, { x: number; y: number }>();
  let depart: { x: number; y: number } | null = null;
  let deplace = false;
  let ecart0 = 0;
  const ecart = () => {
    const [a, b] = [...pointeurs.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  c.addEventListener('pointerdown', (e) => {
    c.setPointerCapture(e.pointerId);
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.size === 1) { depart = { x: e.clientX, y: e.clientY }; deplace = false; }
    if (pointeurs.size === 2) ecart0 = ecart();
  });
  c.addEventListener('pointermove', (e) => {
    const avant = pointeurs.get(e.pointerId);
    if (!avant) { g.survol(e.clientX, e.clientY); return; }
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.size === 2) {
      const d = ecart();
      if (ecart0 > 0 && d > 0) g.zoomer(ecart0 / d);
      ecart0 = d;
      deplace = true;
      return;
    }
    if (depart && Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > SEUIL_GLISSER) deplace = true;
    if (deplace) g.tourner(e.clientX - avant.x, e.clientY - avant.y);
  });
  const haut = (e: PointerEvent) => {
    const seul = pointeurs.size === 1;
    pointeurs.delete(e.pointerId);
    if (seul && !deplace && e.type === 'pointerup') g.clic(e.clientX, e.clientY);
    if (pointeurs.size === 0) depart = null;
  };
  c.addEventListener('pointerup', haut);
  c.addEventListener('pointercancel', haut);
  c.addEventListener('wheel', (e) => { e.preventDefault(); g.zoomer(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
  c.style.touchAction = 'none';
}
