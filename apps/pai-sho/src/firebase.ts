// ─── Firebase : le compte et la communauté ──────────────────────────
// Le projet Firebase est celui du Salon : un membre connecté sur le site
// l'est aussi dans le jeu servi sous /jeux/pai-sho/ (même origine). Les
// aides de @inconnus/ui appellent getApp() sans nom : l'app par défaut
// doit exister avant elles, d'où l'import de ce module en tête de main.tsx.
// Sans configuration (build sans .env.local), le jeu reste entier, seule
// la communauté en ligne se tait.

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app: FirebaseApp | null = config.projectId
  ? (getApps()[0] ?? initializeApp(config))
  : null;
export const enLigne = app !== null;
