// ─── Ce que le menu sait du cercle du joueur ────────────────────────
// Un seul abonnement par session de menu : amitiés, blocages, présence et
// tables ouvertes des amis (un document chacun, la règle ne laisse lire
// que les amis), messages non lus, défis reçus et salons. La carte
// Communauté du menu et la section entière lisent la même chose.

import { useEffect, useState } from 'react';
import { doc, getFirestore, onSnapshot, type Timestamp } from 'firebase/firestore';
import {
  suivreBlocages, suivreMesAmities, suivreMessagesNonLus,
  type Amitie, type ConversationNonLue,
} from '@inconnus/ui/reseau';
import { EN_LIGNE_MS } from './compte';
import { suivreDefisRecus, type Defi } from './defis';
import { suivreMesSalons, type Salon } from './discussions';

export interface Presence { vu?: Timestamp | null; nom?: string; avatar?: string }
export interface TableOuverte { uid: string; peerId: string; nom: string }

export interface Ami {
  uid: string;
  nom: string;
  avatar?: string;
  enLigne: boolean;
}

export interface Social {
  liens: Amitie[];
  amis: Ami[];
  /** Demandes reçues, en attente de ma réponse. */
  recues: { uid: string; nom: string }[];
  /** Demandes envoyées, encore sans réponse. */
  envoyees: { uid: string; nom: string }[];
  bloques: string[];
  tables: TableOuverte[];
  nonLus: ConversationNonLue[];
  defis: Defi[];
  salons: Salon[];
}

const VIDE: Social = { liens: [], amis: [], recues: [], envoyees: [], bloques: [], tables: [], nonLus: [], defis: [], salons: [] };

const autreDe = (l: Amitie, moi: string) => l.uids.find((u) => u !== moi) ?? '';
const nomDans = (l: Amitie, uid: string) => l.profiles?.[uid]?.displayName || '…';

export function useSocial(uid: string | undefined): Social {
  const [liens, setLiens] = useState<Amitie[]>([]);
  const [bloques, setBloques] = useState<string[]>([]);
  const [presences, setPresences] = useState<Record<string, Presence>>({});
  const [tables, setTables] = useState<Record<string, TableOuverte | null>>({});
  const [nonLus, setNonLus] = useState<ConversationNonLue[]>([]);
  const [defis, setDefis] = useState<Defi[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [, setHorloge] = useState(0);

  useEffect(() => {
    if (!uid) { setLiens([]); setBloques([]); setNonLus([]); setDefis([]); setSalons([]); return; }
    const fins = [
      suivreMesAmities(uid, setLiens),
      suivreBlocages(uid, setBloques),
      suivreMessagesNonLus(uid, setNonLus),
      suivreDefisRecus(uid, setDefis),
      suivreMesSalons(uid, setSalons),
    ];
    // « En ligne » vieillit tout seul : on relit l'heure toutes les 20 s.
    const id = window.setInterval(() => setHorloge((n) => n + 1), 20_000);
    return () => { fins.forEach((f) => f()); window.clearInterval(id); };
  }, [uid]);

  const acceptes = uid ? liens.filter((l) => l.status === 'accepted').map((l) => autreDe(l, uid)).filter((u) => !bloques.includes(u)) : [];
  const cle = acceptes.slice().sort().join(',');

  useEffect(() => {
    if (!uid || !cle) { setPresences({}); setTables({}); return; }
    const db = getFirestore();
    const fins = cle.split(',').flatMap((a) => [
      onSnapshot(doc(db, 'presence', a), (s) => setPresences((p) => ({ ...p, [a]: (s.data() as Presence) ?? {} })), () => {}),
      onSnapshot(doc(db, 'salles-ouvertes', a), (s) => setTables((t) => ({
        ...t, [a]: s.exists() ? { uid: a, peerId: String(s.data().peerId), nom: String(s.data().nom ?? '') } : null,
      })), () => {}),
    ]);
    return () => fins.forEach((f) => f());
  }, [uid, cle]);

  if (!uid) return VIDE;
  const maintenant = Date.now();
  const amis: Ami[] = liens
    .filter((l) => l.status === 'accepted')
    .map((l) => {
      const a = autreDe(l, uid);
      const p = presences[a];
      const vu = p?.vu?.toMillis?.() ?? 0;
      return { uid: a, nom: p?.nom || nomDans(l, a), avatar: p?.avatar || undefined, enLigne: maintenant - vu < EN_LIGNE_MS };
    })
    .filter((a) => !bloques.includes(a.uid))
    .sort((x, y) => Number(y.enLigne) - Number(x.enLigne) || x.nom.localeCompare(y.nom));
  const enAttente = liens.filter((l) => l.status === 'pending');
  return {
    liens,
    amis,
    recues: enAttente.filter((l) => l.requestedBy !== uid).map((l) => ({ uid: l.requestedBy, nom: nomDans(l, l.requestedBy) })).filter((r) => !bloques.includes(r.uid)),
    envoyees: enAttente.filter((l) => l.requestedBy === uid).map((l) => { const a = autreDe(l, uid); return { uid: a, nom: nomDans(l, a) }; }),
    bloques,
    tables: Object.values(tables).filter((t): t is TableOuverte => !!t && acceptes.includes(t.uid)),
    nonLus,
    defis: defis.filter((d) => !bloques.includes(d.from)),
    salons,
  };
}
