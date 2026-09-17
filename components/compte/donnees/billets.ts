import { getFunctions, httpsCallable } from 'firebase/functions';

export interface BilletSpectacle {
  evenement: 'ceilidh-mai-2026';
  type: 'single' | 'weekend';
  soirs: string[];
  code: string;
  montant: number;
  le: string;
}

export interface BilletInscription {
  evenement: 'ceilidh-mai-2026';
  equipes: string[];
  le: string | null;
}

export interface BilletContribution {
  evenement: 'ceilidh-mai-2026';
  montant: number;
  le: string;
}

export interface BilletCamping {
  evenement: 'camping-fmm-2026';
  montant: number;
  le: string;
}

export interface Billets {
  spectacles: BilletSpectacle[];
  inscriptions: BilletInscription[];
  contributions: BilletContribution[];
  camping: BilletCamping[];
}

export async function lireBillets(uidCible?: string): Promise<Billets> {
  const fn = httpsCallable<{ uidCible?: string }, Billets>(getFunctions(), 'mesBillets');
  const res = await fn(uidCible ? { uidCible } : {});
  return res.data;
}
