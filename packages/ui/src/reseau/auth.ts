// La porte du Creator Studio — même patron que chez Krystine, Laurie et le
// festival médiéval : Google en premier avec un repli sur la redirection
// quand le fureteur refuse la popup, puis courriel et mot de passe avec
// trois modes (connexion, inscription, mot de passe oublié). Chaque
// connexion réussie écrit la fiche du membre par ensureMember.
import { getApp } from 'firebase/app';
import {
    getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
    updateProfile, signOut, onAuthStateChanged, type User, type UserCredential,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

function auth() {
    return getAuth(getApp());
}

// Un appel Firestore qui traîne ne doit jamais geler la porte : la fiche
// se rattrape au prochain onAuthStateChanged si ce délai est dépassé.
function avecPlafond<T>(p: Promise<T>, ms = 4000): Promise<T | void> {
    return Promise.race([p, new Promise<void>((resolve) => setTimeout(resolve, ms))]);
}

/** members/{uid} en fusion : joinedAt posé une seule fois, lastSeenAt à
 *  chaque passage. Les champs sociaux (bio, discipline, ville, liens)
 *  restent intouchés : ils vivent dans ./membres.ts. */
export async function ensureMember(user: User, provider: 'google' | 'email'): Promise<void> {
    const db = getFirestore(getApp());
    const ref = doc(db, 'members', user.uid);
    const champs = {
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        provider,
        lastSeenAt: serverTimestamp(),
    };
    try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, { ...champs, joinedAt: serverTimestamp() });
        } else {
            await setDoc(ref, champs, { merge: true });
        }
    } catch (e) {
        console.warn('[reseau/auth] ensureMember a échoué', e);
    }
}

const CODES_REPLI_POPUP = new Set([
    'auth/popup-blocked',
    'auth/operation-not-supported-in-this-environment',
    'auth/web-storage-unsupported',
    'auth/internal-error',
]);

/** Popup d'abord; repli automatique sur signInWithRedirect quand le
 *  fureteur bloque la popup (Safari ITP, popups bloquées, webview). Rend
 *  null quand la redirection a été lancée (la page va se recharger). */
export async function loginWithGoogle(): Promise<UserCredential | null> {
    const provider = new GoogleAuthProvider();
    try {
        const cred = await signInWithPopup(auth(), provider);
        await avecPlafond(ensureMember(cred.user, 'google'));
        return cred;
    } catch (e: any) {
        const code = String(e?.code || '');
        if (code.includes('popup-closed')) return null;
        if (CODES_REPLI_POPUP.has(code)) {
            await signInWithRedirect(auth(), provider);
            return null;
        }
        throw e;
    }
}

/** À appeler une fois au montage de la porte : récupère le résultat d'une
 *  redirection Google lancée par le repli ci-dessus. */
export async function handleRedirectResult(): Promise<UserCredential | null> {
    try {
        const cred = await getRedirectResult(auth());
        if (cred?.user) await avecPlafond(ensureMember(cred.user, 'google'));
        return cred;
    } catch (e) {
        console.warn('[reseau/auth] handleRedirectResult', e);
        return null;
    }
}

export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
    const cred = await signInWithEmailAndPassword(auth(), email.trim(), password);
    await avecPlafond(ensureMember(cred.user, 'email'));
    return cred;
}

export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<UserCredential> {
    const cred = await createUserWithEmailAndPassword(auth(), email.trim(), password);
    if (displayName?.trim()) {
        try { await updateProfile(cred.user, { displayName: displayName.trim() }); } catch { /* non fatal */ }
    }
    await avecPlafond(ensureMember(cred.user, 'email'));
    return cred;
}

export async function sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth(), email.trim());
}

export async function logout(): Promise<void> {
    await signOut(auth());
}

export function subscribeToAuthState(cb: (user: User | null) => void) {
    return onAuthStateChanged(auth(), cb);
}

/** Messages d'erreur lisibles, FR et EN, pour les trois modes de la porte. */
export function messageErreur(code: string, language: 'EN' | 'FR'): string {
    const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
    const c = code || '';
    if (c.includes('email-already-in-use')) return t('This email already has an account. Sign in instead.', 'Ce courriel a déjà un compte. Connectez-vous plutôt.');
    if (c.includes('invalid-email')) return t('That email looks invalid.', 'Ce courriel semble invalide.');
    if (c.includes('weak-password')) return t('Use a password of 6 characters or more.', 'Choisissez un mot de passe de 6 caractères ou plus.');
    if (c.includes('wrong-password') || c.includes('invalid-credential') || c.includes('user-not-found')) return t('Wrong email or password.', 'Courriel ou mot de passe incorrect.');
    if (c.includes('too-many-requests')) return t('Too many attempts. Wait a moment and try again.', 'Trop d’essais. Attendez un instant et réessayez.');
    if (c.includes('user-disabled')) return t('This account has been disabled.', 'Ce compte a été désactivé.');
    if (c.includes('missing-email')) return t('Enter your email first.', 'Entrez d’abord votre courriel.');
    if (c.includes('popup-blocked')) return t('Your browser blocked the popup. Trying another way…', 'Votre navigateur a bloqué la fenêtre. On essaie autrement…');
    return t('Something went wrong. Try again.', 'Un pépin est survenu. Réessayez.');
}
