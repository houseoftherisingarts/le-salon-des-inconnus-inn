// ─── Le compte du joueur ────────────────────────────────────────────
// Une seule source pour tout le jeu : l'utilisateur Firebase, suivi une
// fois au chargement. Le nom du compte remplace le nom local partout
// (menu, écran VS, « bonjour » du jeu à distance). Connecté, le joueur
// bat un pouls dans presence/{uid} toutes les trente secondes : ses amis
// le voient en ligne tant que le jeu est ouvert.

import { useSyncExternalStore } from 'react';
import { getAuth, updateProfile, type User } from 'firebase/auth';
import { deleteDoc, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { logout, majMembre, subscribeToAuthState } from '@inconnus/ui/reseau';
import { app } from '../../firebase';
import { joueurLocal } from '../pair';

export interface Compte {
  user: User | null;
  /** Le nom du compte, ou vide tant qu'il n'en a pas. */
  nom: string;
  /** Faux tant que Firebase n'a pas dit qui est là. */
  pret: boolean;
}

export const NOM_MIN = 2;
export const NOM_MAX = 24;
export const POULS_MS = 30_000;
/** En ligne : un pouls vu dans les 75 dernières secondes. */
export const EN_LIGNE_MS = 75_000;

let etat: Compte = { user: null, nom: '', pret: !app };
const abonnes = new Set<() => void>();
const publier = () => {
  etat = { user: etat.user, nom: etat.user?.displayName?.trim() ?? '', pret: etat.pret };
  abonnes.forEach((f) => f());
};

let pouls = 0;
function battre(u: User): void {
  const j = joueurLocal();
  void setDoc(doc(getFirestore(), 'presence', u.uid), {
    vu: serverTimestamp(),
    nom: (u.displayName ?? j.nom).slice(0, NOM_MAX),
    avatar: j.avatar ?? '',
  }).catch(() => { /* hors ligne : le prochain pouls rattrapera */ });
}

if (app) {
  subscribeToAuthState((u) => {
    etat = { ...etat, user: u, pret: true };
    window.clearInterval(pouls);
    if (u) {
      battre(u);
      pouls = window.setInterval(() => battre(u), POULS_MS);
    }
    publier();
  });
}

export function useCompte(): Compte {
  return useSyncExternalStore(
    (f) => { abonnes.add(f); return () => abonnes.delete(f); },
    () => etat,
  );
}

/** Le pouls tout de suite (après un changement de nom ou d'avatar). */
export function rafraichirCompte(): void {
  if (etat.user) battre(etat.user);
  publier();
}

/** Renomme le compte : Firebase Auth, la fiche members/{uid}, puis le pouls. */
export async function renommerCompte(nom: string): Promise<void> {
  const u = getAuth().currentUser;
  const propre = nom.trim().slice(0, NOM_MAX);
  if (!u || propre.length < NOM_MIN) return;
  await updateProfile(u, { displayName: propre });
  await majMembre(u.uid, { displayName: propre });
  rafraichirCompte();
}

/** Se déconnecter : le pouls s'éteint et la présence s'efface d'abord. */
export async function deconnecter(): Promise<void> {
  const u = etat.user;
  window.clearInterval(pouls);
  if (u) await deleteDoc(doc(getFirestore(), 'presence', u.uid)).catch(() => {});
  await logout();
}

export const estElectronUA = (): boolean => navigator.userAgent.includes('Electron');
