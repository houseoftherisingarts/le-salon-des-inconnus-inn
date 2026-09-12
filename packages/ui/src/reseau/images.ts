// Les images du réseau social : redimensionnées côté client (canvas) avant
// l'envoi, puis rangées dans Storage. Contrairement à Terre Sauvage (pas de
// bucket), le Salon a Storage d'ouvert : les images voyagent en JPEG, pas en
// data URL logée dans Firestore.
import { getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, type StorageReference } from 'firebase/storage';

export type SorteImage = 'avatar' | 'banniere' | 'mur';

const DIMENSIONS: Record<SorteImage, number> = {
    avatar: 512,
    banniere: 1920,
    mur: 1600,
};

export const QUALITE_JPEG = 0.85;
export const TAILLE_MAX_OCTETS = 5 * 1024 * 1024;

/** Ramène le plus grand côté à `maxDim`, encode en JPEG à `qualite`. */
export async function redimensionnerImage(file: File, sorte: SorteImage, qualite = QUALITE_JPEG): Promise<Blob> {
    const maxDim = DIMENSIONS[sorte];
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const largeur = Math.round(bitmap.width * ratio);
    const hauteur = Math.round(bitmap.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = largeur;
    canvas.height = hauteur;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponible sur ce navigateur.');
    ctx.drawImage(bitmap, 0, 0, largeur, hauteur);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', qualite),
    );
    if (!blob) throw new Error('Le redimensionnement de l’image a échoué.');
    if (blob.size > TAILLE_MAX_OCTETS) {
        throw new Error('Cette image reste trop lourde même compressée. Choisissez-en une plus petite.');
    }
    return blob;
}

function chemin(uid: string, sorte: SorteImage, postId?: string): string {
    if (sorte === 'avatar') return `members/${uid}/profil/avatar.jpg`;
    if (sorte === 'banniere') return `members/${uid}/profil/banniere.jpg`;
    return `members/${uid}/mur/${postId || Date.now()}.jpg`;
}

/** Redimensionne puis téléverse; rend l'URL publique de téléchargement. */
export async function televerserImage(file: File, uid: string, sorte: SorteImage, postId?: string): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Choisissez une image (JPG, PNG ou WebP).');
    const blob = await redimensionnerImage(file, sorte);
    const storage = getStorage(getApp());
    const dest: StorageReference = ref(storage, chemin(uid, sorte, postId));
    await uploadBytes(dest, blob, { contentType: 'image/jpeg' });
    return getDownloadURL(dest);
}
