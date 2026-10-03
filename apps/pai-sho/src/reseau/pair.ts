// ─── Le jeu à distance, de pair à pair ──────────────────────────────
// PeerJS et son serveur de rencontre public : aucune clé, aucun serveur
// à nous. L'hôte ouvre une table sous son identifiant, l'invité s'y
// connecte. Les messages sont des objets JSON ; chaque coup reçu est
// revérifié par l'arbitre de celui qui le reçoit, et un désaccord se
// règle en renvoyant toute la liste des coups.

import Peer, { type DataConnection } from 'peerjs';

export const VERSION_PROTOCOLE = 1;

export type Message =
  | { type: 'bonjour'; nom: string; version: number }
  | { type: 'pret' }
  | { type: 'coup'; texte: string; n: number }
  | { type: 'resync'; coups: string[] }
  | { type: 'demandeResync' }
  | { type: 'abandon' }
  | { type: 'ping' }
  | { type: 'pong' };

export interface Joueur { id: string; nom: string }

const CLE_JOUEUR = 'paisho.joueur';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function nouvelId(): string {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return 'paisho-' + Array.from(a, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** L'identité du joueur, créée une fois et gardée sur l'appareil. */
export function joueurLocal(): Joueur {
  try {
    const j = JSON.parse(localStorage.getItem(CLE_JOUEUR) ?? 'null') as Joueur | null;
    if (j && /^paisho-[a-z0-9]{6}$/.test(j.id)) return j;
  } catch { /* identité illisible : on en refait une */ }
  const j = { id: nouvelId(), nom: '' };
  sauverJoueur(j);
  return j;
}

export function sauverJoueur(j: Joueur): void {
  try { localStorage.setItem(CLE_JOUEUR, JSON.stringify(j)); } catch { /* navigation privée */ }
}

export const idValide = (s: string): boolean => /^paisho-[a-z0-9]{6}$/.test(s.trim().toLowerCase());

export type EtatLien = 'attente' | 'connexion' | 'connecte' | 'perdu' | 'fini' | 'erreur';

export interface Ecouteurs {
  surEtat: (e: EtatLien, detail?: string) => void;
  surMessage: (m: Message) => void;
}

const DELAI_RECONNEXION = 60_000;
const BATTEMENT = 10_000;

/**
 * Un lien vers l'autre joueur. `ouvrir` côté hôte, `rejoindre` côté
 * invité. Le lien se reconnecte seul pendant soixante secondes, puis
 * annonce `fini`.
 */
export class Lien {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private battement = 0;
  private dernierSigne = 0;
  private perteDepuis = 0;
  private relance = 0;
  private ferme = false;
  private cible: string | null = null;

  constructor(private moi: Joueur, private e: Ecouteurs) {}

  /** Côté hôte : la table s'ouvre sous l'identifiant du joueur. */
  ouvrir(): void {
    this.e.surEtat('attente');
    this.creerPeer(() => { /* l'hôte attend qu'on vienne à lui */ });
  }

  /** Côté invité : se connecter à la table d'un autre. */
  rejoindre(idHote: string): void {
    this.cible = idHote.trim().toLowerCase();
    this.e.surEtat('connexion');
    this.creerPeer(() => this.appeler());
  }

  envoyer(m: Message): void {
    if (this.conn?.open) this.conn.send(m);
  }

  fermer(): void {
    this.ferme = true;
    window.clearInterval(this.battement);
    window.clearTimeout(this.relance);
    this.conn?.close();
    this.peer?.destroy();
    this.peer = null;
    this.conn = null;
  }

  private creerPeer(siOuvert: () => void): void {
    const p = new Peer(this.moi.id);
    this.peer = p;
    p.on('open', siOuvert);
    p.on('connection', (c) => {
      // Une seule table, un seul vis-à-vis : une connexion qui revient
      // remplace l'ancienne.
      this.conn?.close();
      this.brancher(c);
    });
    p.on('disconnected', () => {
      if (this.ferme) return;
      try { p.reconnect(); } catch { /* le pair est détruit, la relance s'en charge */ }
    });
    p.on('error', (err: { type?: string }) => {
      if (this.ferme) return;
      if (err.type === 'peer-unavailable') {
        if (this.perteDepuis) this.planifierRelance();
        else this.e.surEtat('erreur', 'id');
      } else if (err.type === 'unavailable-id') {
        // L'ancien pair de cet appareil n'est pas encore libéré par le
        // serveur : on réessaie dans un instant.
        window.setTimeout(() => { if (!this.ferme) { p.destroy(); this.creerPeer(siOuvert); } }, 3000);
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        if (this.perteDepuis) this.planifierRelance();
        else this.e.surEtat('erreur', 'reseau');
      }
    });
  }

  private appeler(): void {
    if (!this.peer || !this.cible || this.ferme) return;
    this.brancher(this.peer.connect(this.cible, { reliable: true }));
  }

  private brancher(c: DataConnection): void {
    this.conn = c;
    c.on('open', () => {
      this.perteDepuis = 0;
      this.dernierSigne = Date.now();
      this.e.surEtat('connecte');
      c.send({ type: 'bonjour', nom: this.moi.nom, version: VERSION_PROTOCOLE } satisfies Message);
      window.clearInterval(this.battement);
      this.battement = window.setInterval(() => this.verifierPouls(), BATTEMENT);
    });
    c.on('data', (d) => {
      this.dernierSigne = Date.now();
      const m = d as Message;
      if (!m || typeof m !== 'object' || typeof (m as { type?: unknown }).type !== 'string') return;
      if (m.type === 'ping') { c.send({ type: 'pong' } satisfies Message); return; }
      if (m.type === 'pong') return;
      this.e.surMessage(m);
    });
    c.on('close', () => { if (this.conn === c) this.perdre(); });
    c.on('error', () => { if (this.conn === c) this.perdre(); });
  }

  private verifierPouls(): void {
    if (!this.conn?.open) { this.perdre(); return; }
    this.conn.send({ type: 'ping' } satisfies Message);
    if (Date.now() - this.dernierSigne > BATTEMENT * 2.5) this.perdre();
  }

  private perdre(): void {
    if (this.ferme) return;
    if (!this.perteDepuis) {
      this.perteDepuis = Date.now();
      this.e.surEtat('perdu');
    }
    this.planifierRelance();
  }

  /** L'invité rappelle toutes les cinq secondes ; l'hôte, lui, attend. */
  private planifierRelance(): void {
    window.clearTimeout(this.relance);
    if (Date.now() - this.perteDepuis > DELAI_RECONNEXION) {
      window.clearInterval(this.battement);
      this.e.surEtat('fini');
      return;
    }
    this.relance = window.setTimeout(() => {
      if (this.ferme || this.conn?.open) return;
      if (this.cible) this.appeler();
      this.planifierRelance();
    }, 5000);
  }
}
