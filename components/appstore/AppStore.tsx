import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ADHESIONS,
  BOUTIQUE,
  COURRIEL,
  CREATOR_STUDIO,
  PRODUITS,
  RAYONS,
  formatPrix,
  produitsDuRayon,
  type Produit,
  type RayonId,
} from './donnees';
import './appstore.css';

/**
 * L'App Store du studio (13 octobre 2026, ordre d'Alex : « c'est /appstore qu'on veut, un
 * environnement qui ressemble au Play Store, à l'App Store »). Ce fichier et appstore.css sont
 * recopiés tels quels entre vexel-site (src/site/appstore/) et le dépôt du Salon
 * (components/appstore/); seul donnees.ts diffère, parce qu'il pointe vers boutique.ts côté
 * Vexel et en est la copie côté Salon. La marque change l'accent, le logo et le retour au site.
 *
 * Aucune bibliothèque d'icônes : les glyphes sont des tracés de lucide (licence ISC) copiés
 * ici, parce que le Salon ne l'installe pas.
 */

export type AppStoreProps = {
  marque: 'vexel' | 'creator';
  connecte: boolean;
  seConnecter: () => void;
  ouvrirStudio: () => void;
  accueil: { libelle: string; aller: () => void };
};

type Vue = 'decouvrir' | RayonId | 'recherche';
type Mode = 'unique' | 'mensuel';

const NOMS: Record<RayonId, string> = { gratuit: 'Gratuites', abonnement: 'Creator Studio', payant: 'Payantes' };
const ETAGERES: Record<RayonId, string> = {
  gratuit: 'Gratuites avec un compte',
  abonnement: 'Incluses avec le Creator Studio',
  payant: 'À l’achat ou au mois',
};

/* ------------------------------------------------------------ glyphes */

const TRACES: Record<string, ReactNode> = {
  coffre: (<><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" /></>),
  'pai-sho': (<><circle cx="12" cy="12" r="3" /><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5" /><path d="M12 7.5V9" /><path d="M7.5 12H9" /><path d="M16.5 12H15" /><path d="M12 16.5V15" /><path d="m8 8 1.88 1.88" /><path d="M14.12 9.88 16 8" /><path d="m8 16 1.88-1.88" /><path d="M14.12 14.12 16 16" /></>),
  cv: (<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></>),
  'influencer-studio': (<><path d="m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.87a.5.5 0 0 0-.75-.43L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" /></>),
  'feuille-de-service': (<><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" /><path d="m6.2 5.3 3.1 3.9" /><path d="m12.4 3.4 3.1 4" /><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></>),
  trame: (<><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M8 7h7" /><path d="M11 12h6" /><path d="M7 17h6" /></>),
  guilde: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  guichet: (<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />),
  sillage: (<><path d="M14 4.1 12 6" /><path d="m5.1 8-2.9-.8" /><path d="m6 12-1.9 2" /><path d="M7.2 2.2 8 5.1" /><path d="M9.04 9.69a.5.5 0 0 1 .65-.65l11 4.5a.5.5 0 0 1-.07.95l-4.35 1.04a1 1 0 0 0-.74.74l-1.04 4.35a.5.5 0 0 1-.95.07z" /></>),
  grimoire: (<><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></>),
  decouvrir: (<><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z" /></>),
  gratuit: (<><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 11 5 12 8c1-3 2.5-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>),
  abonnement: (<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z" />),
  payant: (<><path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r="1" /></>),
  recherche: (<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>),
  fermer: (<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>),
  retour: (<><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>),
  suite: <path d="m9 18 6-6-6-6" />,
  sortie: (<><path d="M7 7h10v10" /><path d="M7 17 17 7" /></>),
};

function Glyphe({ nom, taille = 20 }: { nom: string; taille?: number }) {
  return (
    <svg aria-hidden width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      {TRACES[nom]}
    </svg>
  );
}

function Icone({ p, taille }: { p: Produit; taille: number }) {
  const style = { '--t1': p.teinte[0], '--t2': p.teinte[1], width: taille, height: taille } as CSSProperties;
  return (
    <span className="as-icone" style={style} aria-hidden>
      {p.icone ? <img src={p.icone} alt="" /> : TRACES[p.id] ? <Glyphe nom={p.id} taille={Math.round(taille * 0.5)} /> : <b>{p.nom.replace(/^L[ae’'] ?/, '').charAt(0)}</b>}
    </span>
  );
}

/* ------------------------------------------------------------ l'achat */

const prevenir = (p: Produit, quoi: string) =>
  `mailto:${COURRIEL}?subject=${encodeURIComponent(`App Store : ${p.nom}${quoi ? ` (${quoi})` : ''}`)}`;

const JEUX = PRODUITS.filter((p) => p.categorie === 'Jeux');

function libellePilule(p: Produit, connecte: boolean) {
  if (p.rayon === 'gratuit') return p.lien ? (connecte && !p.sansCompte ? 'Ouvrir' : 'Obtenir') : 'Bientôt';
  if (p.rayon === 'abonnement') return 'Inclus';
  return p.prix?.unique ? formatPrix(p.prix.unique) : 'Bientôt';
}

/* ------------------------------------------------------------ la page */

export function AppStore({ marque, connecte, seConnecter, ouvrirStudio, accueil }: AppStoreProps) {
  const [vue, setVue] = useState<Vue>('decouvrir');
  const [requete, setRequete] = useState('');
  const [ouverte, setOuverte] = useState<Produit | null>(() => {
    if (typeof window === 'undefined') return null;
    const id = new URLSearchParams(window.location.search).get('app');
    return PRODUITS.find((p) => p.id === id) ?? null;
  });
  const scene = useRef<HTMLElement>(null);

  /* les bandes fixes du site (le consentement de Vexel) se lèvent au-dessus des onglets du téléphone */
  useEffect(() => {
    document.documentElement.dataset.appstore = '';
    return () => {
      delete document.documentElement.dataset.appstore;
    };
  }, []);

  /* la fiche ouverte vit dans l'adresse (?app=pai-sho), pour qu'un lien mène droit à elle */
  useEffect(() => {
    const url = new URL(window.location.href);
    if (ouverte) url.searchParams.set('app', ouverte.id);
    else url.searchParams.delete('app');
    window.history.replaceState(window.history.state, '', url);
  }, [ouverte]);

  const aller = (v: Vue) => {
    setVue(v);
    scene.current?.scrollTo({ top: 0 });
  };

  /* Obtenir agit tout de suite sur une app gratuite; ailleurs, la pilule ouvre la fiche */
  const agir = (p: Produit) => {
    if (p.rayon === 'gratuit' && p.lien) {
      if (connecte || p.sansCompte) window.open(p.lien, '_blank', 'noopener');
      else seConnecter();
      return;
    }
    setOuverte(p);
  };

  const trouvees = useMemo(() => {
    const q = requete.trim().toLocaleLowerCase('fr');
    if (!q) return PRODUITS;
    return PRODUITS.filter((p) => [p.nom, p.ligne, p.texte, p.categorie].join(' ').toLocaleLowerCase('fr').includes(q));
  }, [requete]);

  const onglets: { id: Vue; nom: string; glyphe: string }[] = [
    { id: 'decouvrir', nom: 'Découvrir', glyphe: 'decouvrir' },
    { id: 'gratuit', nom: NOMS.gratuit, glyphe: 'gratuit' },
    { id: 'abonnement', nom: NOMS.abonnement, glyphe: 'abonnement' },
    { id: 'payant', nom: NOMS.payant, glyphe: 'payant' },
  ];

  return (
    <div className="as-racine" data-marque={marque}>
      <aside className="as-cote">
        <div className="as-marque">
          <Marque marque={marque} />
          <span className="as-sous-marque">App Store</span>
        </div>
        <label className="as-chercher">
          <Glyphe nom="recherche" taille={15} />
          <input
            type="search"
            placeholder="Rechercher"
            value={requete}
            onChange={(e) => {
              setRequete(e.target.value);
              setVue('recherche');
            }}
            aria-label="Rechercher une app"
          />
        </label>
        <nav aria-label="Rayons de l’App Store">
          {onglets.map((o) => (
            <button key={o.id} className="as-lien" aria-current={vue === o.id ? 'page' : undefined} onClick={() => aller(o.id)}>
              <Glyphe nom={o.glyphe} taille={18} />
              {o.nom}
            </button>
          ))}
        </nav>
        <button className="as-lien as-accueil" onClick={accueil.aller}>
          <Glyphe nom="retour" taille={16} />
          {accueil.libelle}
        </button>
      </aside>

      <main className="as-scene" ref={scene}>
        <header className="as-barre">
          <button className="as-barre-retour" onClick={accueil.aller} aria-label={`Retour à ${accueil.libelle}`}>
            <Glyphe nom="retour" taille={18} />
          </button>
          <Marque marque={marque} />
          <span className="as-sous-marque">App Store</span>
        </header>

        {vue === 'decouvrir' && (
          <>
            <h1 className="as-grand-titre">Découvrir</h1>
            <p className="as-chapeau">{BOUTIQUE.sous}</p>
            <ALaUne produits={PRODUITS.filter((p) => p.alaune && p.image)} ouvrir={setOuverte} />
            {/* les jeux ont leur étagère à eux sur Découvrir, comme au Play Store; le rayon Gratuites les garde tous */}
            <section className="as-etagere">
              <div className="as-etagere-tete">
                <h2>Jeux de table, gratuits et hors ligne</h2>
              </div>
              <Liste produits={JEUX} connecte={connecte} ouvrir={setOuverte} agir={agir} />
            </section>
            {RAYONS.map((r) => (
              <section key={r.id} className="as-etagere">
                <div className="as-etagere-tete">
                  <h2>{ETAGERES[r.id]}</h2>
                  <button className="as-tout-voir" onClick={() => aller(r.id)}>
                    Tout voir
                  </button>
                </div>
                <Liste produits={produitsDuRayon(r.id).filter((p) => p.categorie !== 'Jeux')} connecte={connecte} ouvrir={setOuverte} agir={agir} />
              </section>
            ))}
          </>
        )}

        {(vue === 'gratuit' || vue === 'abonnement' || vue === 'payant') && (
          <>
            <h1 className="as-grand-titre">{NOMS[vue]}</h1>
            <p className="as-chapeau">{RAYONS.find((r) => r.id === vue)?.intro}</p>
            <ALaUne produits={produitsDuRayon(vue).filter((p) => p.image)} ouvrir={setOuverte} />
            {vue === 'abonnement' && <Adhesions ouvrirStudio={ouvrirStudio} />}
            <Liste produits={produitsDuRayon(vue)} connecte={connecte} ouvrir={setOuverte} agir={agir} />
          </>
        )}

        {vue === 'recherche' && (
          <>
            <h1 className="as-grand-titre">Recherche</h1>
            <label className="as-chercher as-chercher-large">
              <Glyphe nom="recherche" taille={17} />
              <input
                type="search"
                placeholder="Jeux, cinéma, entreprise…"
                value={requete}
                onChange={(e) => setRequete(e.target.value)}
                aria-label="Rechercher une app"
                autoFocus
              />
            </label>
            {trouvees.length ? (
              <Liste produits={trouvees} connecte={connecte} ouvrir={setOuverte} agir={agir} />
            ) : (
              <p className="as-vide">Aucune app ne répond à « {requete.trim()} » pour le moment.</p>
            )}
          </>
        )}
      </main>

      <nav className="as-onglets" aria-label="Rayons de l’App Store">
        {[...onglets, { id: 'recherche' as Vue, nom: 'Recherche', glyphe: 'recherche' }].map((o) => (
          <button key={o.id} aria-current={vue === o.id ? 'page' : undefined} onClick={() => aller(o.id)}>
            <Glyphe nom={o.glyphe} taille={22} />
            <span>{o.id === 'abonnement' ? 'Studio' : o.nom}</span>
          </button>
        ))}
      </nav>

      {ouverte && (
        <Fiche p={ouverte} connecte={connecte} fermer={() => setOuverte(null)} seConnecter={seConnecter} ouvrirStudio={ouvrirStudio} />
      )}
    </div>
  );
}

/* le logo complet de Vexel avec son nom, ou le mot-symbole du Creator Studio */
function Marque({ marque }: { marque: AppStoreProps['marque'] }) {
  return marque === 'vexel' ? (
    <span className="as-logo-ligne">
      <img src="/vexel-logo.png" alt="" className="as-logo" />
      <span className="as-mot">Vexel</span>
    </span>
  ) : (
    <span className="as-mot">Creator Studio</span>
  );
}

/* ------------------------------------------------------------ les cartes à la une */

function ALaUne({ produits, ouvrir }: { produits: Produit[]; ouvrir: (p: Produit) => void }) {
  if (!produits.length) return null;
  return (
    <div className="as-une" role="list" aria-label="À la une" data-seule={produits.length === 1 ? '' : undefined}>
      {produits.map((p) => (
        <button key={p.id} role="listitem" className="as-carte-une" onClick={() => ouvrir(p)}>
          <img src={p.image} alt={p.alt ?? ''} loading="lazy" />
          <span className="as-une-texte">
            <span className="as-surtitre">{p.categorie} · {p.etat}</span>
            <span className="as-une-nom">{p.nom}</span>
            <span className="as-une-ligne">{p.ligne}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ les rangées */

function Liste({ produits, connecte, ouvrir, agir }: {
  produits: Produit[];
  connecte: boolean;
  ouvrir: (p: Produit) => void;
  agir: (p: Produit) => void;
}) {
  return (
    <ul className="as-liste" style={{ '--as-cols': produits.length % 3 === 1 || produits.length === 2 ? 2 : 3 } as CSSProperties}>
      {produits.map((p) => (
        <li key={p.id} className="as-rangee">
          <button className="as-rangee-corps" onClick={() => ouvrir(p)}>
            <Icone p={p} taille={64} />
            <span className="as-rangee-texte">
              <span className="as-rangee-nom">{p.nom}</span>
              <span className="as-rangee-ligne">{p.ligne}</span>
              <span className="as-rangee-cat">{p.categorie}</span>
            </span>
          </button>
          <span className="as-rangee-action">
            <button className="as-pilule" onClick={() => agir(p)} aria-label={`${libellePilule(p, connecte)} : ${p.nom}`}>
              {libellePilule(p, connecte)}
            </button>
            {p.rayon === 'payant' && p.prix?.mensuel ? <span className="as-pilule-note">ou au mois</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Adhesions({ ouvrirStudio }: { ouvrirStudio: () => void }) {
  return (
    <div className="as-adhesions">
      <div>
        <p className="as-surtitre">Abonnements de membre</p>
        <p className="as-adhesions-texte">Le palier gratuit ouvre le réseau, et chacun des trois paliers payants ouvre aussi toutes les apps de ce rayon.</p>
      </div>
      <ul>
        {ADHESIONS.map((a) => (
          <li key={a.id}>
            <span className="as-palier-nom">{a.nom}</span>
            <span className="as-palier-prix">{a.prix ? `${formatPrix(a.prix)} / mois` : 'le réseau'}</span>
          </li>
        ))}
      </ul>
      <button className="as-bouton" onClick={ouvrirStudio}>
        Voir les abonnements
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ la fiche d'une app */

function Fiche({ p, connecte, fermer, seConnecter, ouvrirStudio }: {
  p: Produit;
  connecte: boolean;
  fermer: () => void;
  seConnecter: () => void;
  ouvrirStudio: () => void;
}) {
  const [mode, setMode] = useState<Mode>('unique');
  const panneau = useRef<HTMLDivElement>(null);
  const fermerRef = useRef(fermer);
  fermerRef.current = fermer;

  useEffect(() => {
    panneau.current?.focus();
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && fermerRef.current();
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [p.id]);

  const prix = p.prix?.[mode];
  let action: ReactNode;
  if (p.rayon === 'gratuit' && p.lien && p.sansCompte) {
    action = (
      <>
        <a className="as-bouton" href={p.lien} target="_blank" rel="noreferrer noopener">
          Obtenir <Glyphe nom="sortie" taille={15} />
        </a>
        <span className="as-action-note">Sans compte. Le jeu s’installe depuis sa page et se joue ensuite hors ligne.</span>
      </>
    );
  } else if (p.rayon === 'gratuit' && p.lien) {
    action = connecte ? (
      <a className="as-bouton" href={p.lien} target="_blank" rel="noreferrer noopener">
        Ouvrir <Glyphe nom="sortie" taille={15} />
      </a>
    ) : (
      <>
        <button className="as-bouton" onClick={seConnecter}>
          Obtenir
        </button>
        <span className="as-action-note">Un compte gratuit suffit.</span>
      </>
    );
  } else if (p.lien === CREATOR_STUDIO) {
    action = (
      <button className="as-bouton" onClick={ouvrirStudio}>
        Ouvrir le Creator Studio
      </button>
    );
  } else if (p.rayon === 'payant' && prix) {
    action = (
      <a className="as-bouton" href={prevenir(p, mode === 'unique' ? 'achat unique' : 'au mois')}>
        Commander · {formatPrix(prix)}{mode === 'mensuel' ? ' / mois' : ''}
      </a>
    );
  } else {
    action = (
      <a className="as-bouton as-bouton-creux" href={prevenir(p, 'me prévenir')}>
        Me prévenir à la sortie
      </a>
    );
  }

  const prixAffiche =
    p.rayon === 'gratuit' ? 'Gratuit' : p.rayon === 'abonnement' ? 'Inclus' : p.prix?.unique ? formatPrix(p.prix.unique) : 'À venir';
  const infos: [string, string][] = [
    ['Prix', prixAffiche],
    ['Catégorie', p.categorie],
    ...(p.plateformes ? ([['Plateformes', p.plateformes]] as [string, string][]) : []),
    ['État', p.etat],
    ['Langue', 'Français'],
  ];

  return (
    <div className="as-voile" onClick={fermer}>
      <div
        className="as-fiche"
        role="dialog"
        aria-modal="true"
        aria-label={p.nom}
        tabIndex={-1}
        ref={panneau}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="as-fermer" onClick={fermer} aria-label="Fermer la fiche">
          <Glyphe nom="fermer" taille={18} />
        </button>
        <div className="as-fiche-tete">
          <Icone p={p} taille={112} />
          <div className="as-fiche-titres">
            <h2>{p.nom}</h2>
            <p className="as-fiche-ligne">{p.ligne}</p>
            {p.rayon === 'payant' && p.prix?.unique && p.prix?.mensuel ? (
              <div className="as-bascule" role="group" aria-label="Façon de payer">
                <button aria-pressed={mode === 'unique'} onClick={() => setMode('unique')}>Une fois</button>
                <button aria-pressed={mode === 'mensuel'} onClick={() => setMode('mensuel')}>Au mois</button>
              </div>
            ) : null}
            <div className="as-fiche-action">{action}</div>
          </div>
        </div>

        <dl className="as-infos">
          {infos.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        {p.image ? (
          <img className="as-capture" src={p.image} alt={p.alt ?? ''} />
        ) : (
          <div className="as-capture as-capture-vide" style={{ '--t1': p.teinte[0], '--t2': p.teinte[1] } as CSSProperties}>
            <Icone p={p} taille={88} />
            <span>Les captures arrivent avec la sortie.</span>
          </div>
        )}

        <p className="as-fiche-texte">{p.texte}</p>
        {p.rayon === 'abonnement' && <Adhesions ouvrirStudio={ouvrirStudio} />}
        {p.rayon === 'payant' && (
          <p className="as-fiche-note">Les prix sont en dollars canadiens, taxes en sus.</p>
        )}
      </div>
    </div>
  );
}
