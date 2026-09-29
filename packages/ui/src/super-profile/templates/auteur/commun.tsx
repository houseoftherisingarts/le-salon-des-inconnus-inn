// commun.tsx : l'ossature des sections du gabarit Auteur, portée de Vexel
// Space (src/gabarits/boutique/commun.tsx) avec les classes utilitaires que
// ce gabarit emploie en plus de celles d'EspaceRacine. Aucune couleur ici :
// tout passe par les jetons --es-* que pose EspaceRacine.

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { SuperProfileConfig } from '../../types';

export interface SectionProps {
  config: SuperProfileConfig;
  fallbackDisplayName?: string;
}

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Le nom affiché de l'espace, avec les mêmes replis que les autres gabarits. */
export function nomDe(config: SuperProfileConfig, repli?: string): string {
  return config.displayName?.trim() || repli?.trim() || config.username || 'Votre nom';
}

/**
 * Les classes du gabarit Auteur que la racine commune ne porte pas. Portées
 * par .es-auteur; :where() garde la spécificité d'une seule classe pour que
 * les utilitaires Tailwind d'une section continuent de primer.
 */
export const STYLE_AUTEUR = `
.es-auteur{min-height:100dvh;}
.es-auteur ::selection{background:var(--es-accent);color:var(--es-accent-ink);}
:where(.es-auteur) .es-display{letter-spacing:-0.015em;}
:where(.es-auteur) .es-label{text-transform:uppercase;letter-spacing:0.22em;font-size:0.8125rem;}
.es-auteur .es-num{font-variant-numeric:tabular-nums;white-space:nowrap;}
.es-auteur .es-bouton{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:48px;padding:.75rem 1.5rem;border-radius:999px;background:var(--es-accent);color:var(--es-accent-ink);font-family:var(--es-font-label);font-weight:var(--es-weight-label);font-size:.875rem;letter-spacing:.08em;transition:transform .2s ease,box-shadow .2s ease;}
.es-auteur .es-bouton:hover{transform:translateY(-1px);box-shadow:0 12px 30px -12px var(--es-glow);}
.es-auteur .es-bouton-ligne{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:48px;padding:.75rem 1.5rem;border-radius:999px;border:1px solid var(--es-line-fort);color:var(--es-ink);font-family:var(--es-font-label);font-weight:var(--es-weight-label);font-size:.875rem;letter-spacing:.08em;transition:border-color .2s ease;}
.es-auteur .es-bouton-ligne:hover{border-color:var(--es-ink);}
.es-auteur .es-lien{text-decoration:underline;text-decoration-color:var(--es-line-fort);text-underline-offset:4px;transition:text-decoration-color .2s ease;}
.es-auteur .es-lien:hover{text-decoration-color:var(--es-ink);}
`;

interface ShellProps {
  id: string;
  label: string;
  titre?: ReactNode;
  ton?: 'fond' | 'fond-2';
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Le fond va d'un bord à l'autre; seul le contenu se tient dans la grille
 * de 1320 px. L'étiquette et le titre se partagent la ligne du haut sur grand
 * écran, pour qu'aucun titre ne flotte seul au centre d'un vide.
 */
export function Section({ id, label, titre, ton = 'fond', aside, children, className }: ShellProps) {
  return (
    <section
      id={id}
      data-section={id}
      className={`relative w-full scroll-mt-[68px] border-t border-[color:var(--es-line)] px-5 py-20 md:px-10 md:py-28 ${
        ton === 'fond-2' ? 'bg-[color:var(--es-bg-2)]' : 'bg-[color:var(--es-bg)]'
      } ${className ?? ''}`}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-10 grid gap-5 md:mb-14 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="es-label text-[color:var(--es-accent-texte)]">{label}</p>
            {titre && (
              <Apparait>
                <h2 className="es-display mt-4 max-w-[18ch] text-[clamp(2.1rem,1.4rem+3vw,4.25rem)] leading-[1.02]">{titre}</h2>
              </Apparait>
            )}
          </div>
          {aside}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Monte doucement à l'entrée dans l'écran; immobile en mouvement réduit. */
export function Apparait({ children, delai = 0, className }: { children: ReactNode; delai?: number; className?: string }) {
  const sans = useReducedMotion();
  if (sans) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, delay: delai, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function Fleche({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'h-4 w-4'} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Externe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'h-4 w-4'} aria-hidden>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}
