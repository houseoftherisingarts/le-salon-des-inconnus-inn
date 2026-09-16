import { getFunctions, httpsCallable } from 'firebase/functions';

export type StatutSejour = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

export interface Sejour {
  id: number;
  chambreFR: string;
  chambreEN: string;
  listingId: number;
  arrivee: string;
  depart: string;
  nuits: number;
  voyageurs: number;
  statut: StatutSejour;
  canal: string;
  total: number | null;
  devise: string;
  code: string | null;
  portail: string | null;
  lie: boolean;
}

export interface ReponseSejours {
  sejours: Sejour[];
  lu: string;
}

export async function lireSejours(): Promise<ReponseSejours> {
  const fn = httpsCallable<Record<string, never>, ReponseSejours>(getFunctions(), 'mesSejours');
  const res = await fn({});
  return res.data;
}

export async function lierReservation(code: string, arrivee: string): Promise<{ lie: boolean }> {
  const fn = httpsCallable<{ code: string; arrivee: string }, { lie: boolean }>(getFunctions(), 'lierSejour');
  const res = await fn({ code, arrivee });
  return res.data;
}
