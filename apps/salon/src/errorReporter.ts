/**
 * Surveillance d'erreurs client, sans fournisseur externe.
 *
 * Un vrai Sentry demande un compte, une cle et un budget. Ce qu'il nous faut
 * pour une beta publique tient en trente lignes : savoir qu'une page a plante,
 * ou, et sur quel navigateur. Les erreurs atterrissent dans la collection
 * Firestore `clientErrors`, en creation seule; l'admin les lit.
 *
 * Deliberement minimal (voir la regle de simplicite) :
 *  - pas de source maps, pas de sessions, pas de breadcrumbs
 *  - au plus 5 rapports par chargement de page, pour ne pas transformer une
 *    boucle de rendu en facture Firestore
 *  - jamais de contenu de formulaire ni de jeton dans le rapport
 *
 * Si un jour le volume justifie mieux, remplacer par Sentry sans rien casser :
 * seul ce fichier connait le transport.
 */
import { getApps } from 'firebase/app';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const MAX_PAR_PAGE = 5;
let envoyes = 0;
let derniereSignature = '';

function signature(message: string, source: string, ligne: number) {
  return `${message}|${source}|${ligne}`;
}

async function rapporter(message: string, source: string, ligne: number, pile?: string) {
  if (envoyes >= MAX_PAR_PAGE) return;
  const sig = signature(message, source, ligne);
  if (sig === derniereSignature) return; // meme erreur en rafale : une seule fois
  derniereSignature = sig;
  envoyes += 1;

  if (getApps().length === 0) return; // Firebase non configure : on se tait

  try {
    await addDoc(collection(getFirestore(), 'clientErrors'), {
      message: String(message).slice(0, 500),
      source: String(source).slice(0, 300),
      ligne,
      pile: pile ? String(pile).slice(0, 2000) : null,
      url: location.pathname + location.search,
      agent: navigator.userAgent.slice(0, 300),
      uid: getAuth().currentUser?.uid ?? null,
      recuLe: serverTimestamp(),
    });
  } catch {
    // Un rapport d'erreur qui echoue ne doit jamais casser la page.
  }
}

export function installerRapportErreurs() {
  window.addEventListener('error', (e) => {
    void rapporter(e.message, e.filename ?? '', e.lineno ?? 0, e.error?.stack);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const raison = e.reason;
    void rapporter(
      raison?.message ?? String(raison),
      'promesse non geree',
      0,
      raison?.stack,
    );
  });
}
