import { getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

function db() {
  return getFirestore(getApp());
}

export interface ProblemeTechnique {
  uid: string;
  nom: string;
  courriel: string;
  texte: string;
  page: string;
  capture?: string;
  capturePath?: string;
  agent: string;
  ecran: string;
  statut: 'nouveau';
}

// 6.11 Signalement d'un problème technique. La capture (image ≤ 10 Mo) est
// déposée dans Storage sous problemes/{uid}/, puis le document est créé : la
// Cloud Function alerte Alex et transmet à Vexel quand la clé est posée.
export async function envoyerProbleme(uid: string, champs: Omit<ProblemeTechnique, 'uid' | 'statut'>, fichier?: File | null): Promise<void> {
  let capture: string | undefined;
  let capturePath: string | undefined;

  if (fichier) {
    const storage = getStorage(getApp());
    const chemin = `problemes/${uid}/${Date.now()}-${fichier.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const ref = storageRef(storage, chemin);
    await uploadBytes(ref, fichier);
    capture = await getDownloadURL(ref);
    capturePath = chemin;
  }

  await addDoc(collection(db(), 'problemesTechniques'), {
    uid,
    nom: champs.nom.slice(0, 120),
    courriel: champs.courriel.slice(0, 200),
    texte: champs.texte.slice(0, 4000),
    page: (champs.page || '').slice(0, 300),
    ...(capture ? { capture: capture.slice(0, 500) } : {}),
    ...(capturePath ? { capturePath } : {}),
    agent: (champs.agent || '').slice(0, 300),
    ecran: (champs.ecran || '').slice(0, 20),
    statut: 'nouveau',
    cree: serverTimestamp(),
  });
}
