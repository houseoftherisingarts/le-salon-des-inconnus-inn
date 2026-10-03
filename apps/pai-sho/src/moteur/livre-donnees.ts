// ─── Ce que la machine a appris ─────────────────────────────────────
// FICHIER GÉNÉRÉ. Ne pas modifier à la main.
//
// Le livre associe une clé de position (celle de l'adaptateur) au coup
// que les parties gagnées ont retenu, sous le nom « jeu:variante ». Le
// Pai Sho n'a encore joué aucune partie d'entraînement : le livre est vide.

import type { Livre } from './livre';

export const LIVRES_APPRIS: Record<string, Livre> = {};

/** Les coefficients d'évaluation retenus par l'entraînement. */
export const POIDS_APPRIS: Record<string, Record<string, number>> = {};

/** L'heure du dernier entraînement. Vide tant qu'il n'a pas tourné. */
export const APPRIS_LE = '';
