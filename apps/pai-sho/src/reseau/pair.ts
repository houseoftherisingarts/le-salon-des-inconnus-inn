// ─── Le jeu à distance, de pair à pair ──────────────────────────────
// PeerJS et son serveur de rencontre public : aucune clé, aucun serveur
// à nous. L'hôte ouvre une table sous son identifiant, l'invité s'y
// connecte. Les messages sont des objets JSON ; chaque coup reçu est
// revérifié par l'arbitre de celui qui le reçoit, et un désaccord se
// règle en renvoyant toute la liste des coups.

import Peer, { type DataConnection } from 'peerjs';

export const VERSION_PROTOCOLE = 1;

export type Message =
  | { type: 'bonjour'; nom: string; version: number; avatar?: string }
  | { type: 'pret' }
  | { type: 'coup'; texte: string; n: number }
  | { type: 'resync'; coups: string[] }
  | { type: 'demandeResync' }
  | { type: 'abandon' }
  | { type: 'ping' }
  | { type: 'pong' };

/** `avatar` : l'identifiant du personnage que ce joueur incarne (src/jeu/adversaires.ts), ou rien. */
export interface Joueur { id: string; nom: string; avatar?: string }

const CLE_JOUEUR = 'paisho.joueur';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function nouvelId(): string {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return 'paisho-' + Array.from(a, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** L'identité du joueur, créée une fois et gardée sur l'appareil. */
export function joueurLocal(): Joueur {
  try {
    const j = JSON.parse(localStorage.getItem(CLE_JOUEUR) ?? 'null') as Joueur | null;
    if (j && /^paisho-[a-z0-9]{8}$/.test(j.id)) return j;
  } catch { /* identité illisible : on en refait une */ }
  const j = { id: nouvelId(), nom: '' };
  sauverJoueur(j);
  return j;
}

export function sauverJoueur(j: Joueur): void {
  try { localStorage.setItem(CLE_JOUEUR, JSON.stringify(j)); } catch { /* navigation privée */ }
}

export const idValide = (s: string): boolean => /^paisho-[a-z0-9]{8}$/.test(s.trim().toLowerCase());

// ─── Le carnet d'amis ───────────────────────────────────────────────
// Aucun serveur à nous : un ami, c'est une personne déjà rencontrée à
// une table, gardée sur l'appareil avec son identifiant et le nom
// qu'elle a donné. Le carnet sert à la rejoindre d'un geste.

export interface Ami { id: string; nom: string; vu: number }

const CLE_AMIS = 'paisho.amis';
const MAX_AMIS = 24;

export function amis(): Ami[] {
  try {
    const liste: unknown = JSON.parse(localStorage.getItem(CLE_AMIS) ?? '[]');
    if (!Array.isArray(liste)) return [];
    return liste.filter((a): a is Ami => !!a && typeof a === 'object' && idValide(String((a as Ami).id)));
  } catch { return []; }
}

/** Garde (ou met à jour) un ami; le plus récent en tête, jamais soi-même. */
export function garderAmi(id: string, nom: string, moi: string = joueurLocal().id): Ami[] {
  const propre = id.trim().toLowerCase();
  if (!idValide(propre) || propre === moi) return amis();
  const liste = [{ id: propre, nom: nom.trim().slice(0, 24), vu: Date.now() }, ...amis().filter((a) => a.id !== propre)].slice(0, MAX_AMIS);
  try { localStorage.setItem(CLE_AMIS, JSON.stringify(liste)); } catch { /* navigation privée */ }
  return liste;
}

export function oublierAmi(id: string): Ami[] {
  const liste = amis().filter((a) => a.id !== id);
  try { localStorage.setItem(CLE_AMIS, JSON.stringify(liste)); } catch { /* navigation privée */ }
  return liste;
}

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
  /** L'identifiant de la personne assise en face, côté hôte. */
  private vis: string | null = null;

  constructor(private moi: Joueur, public e: Ecouteurs) {}

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

  /** L'identifiant de la personne en face, dès qu'on le connaît. */
  idEnFace(): string | null { return this.vis ?? this.cible; }

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
    // Deux STUN de Google en plus de celui de PeerJS. Un routeur strict ou
    // le cellulaire demande un relais TURN, qui exige un compte (metered.ca
    // ou Cloudflare) : le relais public Open Relay ne répond plus (vérifié
    // le 4 octobre 2026), il ne sert à rien de le lister.
    const p = new Peer(this.moi.id, {
      config: { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] },
    });
    this.peer = p;
    p.on('open', siOuvert);
    p.on('connection', (c) => {
      // Une seule table, un seul vis-à-vis : la table accepte la
      // première personne qui s'assoit, puis ne reprend que cette
      // même personne quand elle revient après une coupure.
      if (this.vis && c.peer !== this.vis) { c.on('open', () => c.close()); return; }
      this.vis = c.peer;
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
      c.send({ type: 'bonjour', nom: this.moi.nom, version: VERSION_PROTOCOLE, avatar: this.moi.avatar } satisfies Message);
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
