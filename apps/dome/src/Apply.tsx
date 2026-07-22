import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import { CHARTE, VERSION_CHARTE } from './charte';
import { EASE, Eyebrow } from './motion';

const ACTIVITES = [
  { id: 'cultiver', label: 'Cultiver la terre' },
  { id: 'boutique', label: 'Vendre à la boutique' },
  { id: 'cafe', label: 'Tenir le café' },
  { id: 'soins', label: 'Offrir des soins' },
] as const;

type Step = 'auth' | 'charte' | 'form' | 'done';

interface Candidature {
  name: string;
  activities: string[];
  council: boolean;
  wantText: string;
  whyText: string;
}

const glass =
  'rounded-[15px] bg-black/40 backdrop-blur-md border border-white/15';

const field =
  'w-full rounded-[15px] bg-black/40 border border-white/15 px-4 py-3 font-lato text-sm text-neutral-100 placeholder-neutral-500 focus:border-[#c5a059]/60 focus:outline-none transition-colors';

const stepMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.8, ease: EASE },
};

export default function Apply() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [step, setStep] = useState<Step>('auth');
  const [charteOk, setCharteOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Formulaire
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupMode, setSignupMode] = useState(true);
  const [activities, setActivities] = useState<string[]>([]);
  const [council, setCouncil] = useState(false);
  const [wantText, setWantText] = useState('');
  const [whyText, setWhyText] = useState('');
  const [existing, setExisting] = useState<Candidature | null>(null);

  useEffect(() => {
    if (!auth) { setAuthReady(true); return; }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && db) {
        const snap = await getDoc(doc(db, 'coopApplications', u.uid));
        if (snap.exists()) {
          const d = snap.data() as Candidature;
          setExisting(d);
          setName(d.name);
          setActivities(d.activities ?? []);
          setCouncil(Boolean(d.council));
          setWantText(d.wantText ?? '');
          setWhyText(d.whyText ?? '');
          setStep('done');
        } else {
          setName(u.displayName ?? '');
          setStep('charte');
        }
      } else {
        setStep('auth');
      }
      setAuthReady(true);
    });
  }, []);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e: unknown) {
      setError(messageErreur(e));
    } finally {
      setBusy(false);
    }
  }

  const google = () =>
    withBusy(async () => {
      if (!auth) throw new Error('offline');
      await signInWithPopup(auth, new GoogleAuthProvider());
    });

  const emailAuth = () =>
    withBusy(async () => {
      if (!auth) throw new Error('offline');
      if (signupMode) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    });

  const submit = () =>
    withBusy(async () => {
      if (!db || !user) throw new Error('offline');
      if (!name.trim()) throw new Error('nom');
      if (activities.length === 0) throw new Error('activites');
      if (!wantText.trim() || !whyText.trim()) throw new Error('textes');
      const payload: Record<string, unknown> = {
        uid: user.uid,
        name: name.trim(),
        email: user.email ?? '',
        activities,
        council,
        category: council ? 'conseil' : 'membre',
        wantText: wantText.trim(),
        whyText: whyText.trim(),
        charteVersion: VERSION_CHARTE,
        status: existing ? 'mise-a-jour' : 'nouvelle',
        updatedAt: serverTimestamp(),
      };
      if (!existing) payload.createdAt = serverTimestamp();
      await setDoc(doc(db, 'coopApplications', user.uid), payload, { merge: true });
      setExisting({ name, activities, council, wantText, whyText });
      setStep('done');
    });

  function toggleActivity(id: string) {
    setActivities((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  if (!isFirebaseConfigured) {
    return (
      <div className={`${glass} p-8 text-center font-lato text-sm text-neutral-400`}>
        Le dépôt de candidature ouvre bientôt. Écris-nous en attendant :
        {' '}
        <a href="mailto:alex@lesalondesinconnus.com" className="text-[#f3e5ab] hover:text-[#c5a059] transition-colors">
          alex@lesalondesinconnus.com
        </a>
      </div>
    );
  }

  if (!authReady) {
    return <div className={`${glass} p-10 text-center font-cinzel text-[11px] uppercase tracking-[0.4em] text-neutral-500`}>Un instant</div>;
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">

        {step === 'auth' && (
          <motion.div key="auth" {...stepMotion} className={`${glass} p-6 md:p-10`}>
            <Eyebrow>Étape 1 · Ton profil</Eyebrow>
            <h3 className="font-prata text-2xl md:text-3xl text-[#f3e5ab] mt-4 mb-2">
              Entre par la grande porte
            </h3>
            <p className="font-lato text-sm text-neutral-400 mb-8 max-w-md">
              Crée ton profil pour déposer ta candidature. Il te suivra du dépôt jusqu'à la vie de membre.
            </p>

            <button
              onClick={google}
              disabled={busy}
              className="w-full py-3.5 rounded-[15px] bg-[#f3e5ab] text-[#0a0808] font-cinzel text-[12px] uppercase tracking-[0.3em] hover:bg-[#c5a059] transition-colors disabled:opacity-50"
            >
              Continuer avec Google
            </button>

            <div className="flex items-center gap-4 my-6">
              <span className="flex-1 h-px bg-white/10" />
              <span className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-neutral-500">ou par courriel</span>
              <span className="flex-1 h-px bg-white/10" />
            </div>

            <div className="space-y-3">
              {signupMode && (
                <input className={field} type="text" placeholder="Ton nom" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              )}
              <input className={field} type="email" placeholder="Courriel" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <input className={field} type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signupMode ? 'new-password' : 'current-password'} />
              <button
                onClick={emailAuth}
                disabled={busy}
                className="w-full py-3.5 rounded-[15px] border border-[#c5a059]/50 text-[#f3e5ab] font-cinzel text-[12px] uppercase tracking-[0.3em] hover:bg-[#c5a059]/10 hover:border-[#c5a059] transition-all disabled:opacity-50"
              >
                {signupMode ? 'Créer mon profil' : 'Me reconnecter'}
              </button>
            </div>

            <button
              onClick={() => { setSignupMode(!signupMode); setError(''); }}
              className="mt-5 font-lato text-xs text-neutral-500 hover:text-[#f3e5ab] transition-colors"
            >
              {signupMode ? 'Déjà un profil ? Me reconnecter' : 'Premier passage ? Créer mon profil'}
            </button>
          </motion.div>
        )}

        {step === 'charte' && (
          <motion.div key="charte" {...stepMotion} className={`${glass} p-6 md:p-10`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <Eyebrow>Étape 2 · La charte</Eyebrow>
                <h3 className="font-prata text-2xl md:text-3xl text-[#f3e5ab] mt-4">
                  Lis avant de signer
                </h3>
              </div>
              <span className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-neutral-500 mt-1">{VERSION_CHARTE}</span>
            </div>
            <p className="font-lato text-sm text-neutral-400 mt-2 mb-6 max-w-md">
              Voici la documentation de la coopérative. Sept articles, deux minutes de lecture.
            </p>

            <div className="max-h-[46vh] overflow-y-auto pr-2 space-y-5 border-y border-white/10 py-6">
              {CHARTE.map((a) => (
                <article key={a.numero} className="grid grid-cols-[auto,1fr] gap-x-4">
                  <span className="font-cinzel text-[#c5a059] text-sm pt-0.5">{a.numero}</span>
                  <div>
                    <h4 className="font-cinzel text-[12px] uppercase tracking-[0.25em] text-[#f3e5ab] mb-1.5">{a.titre}</h4>
                    <p className="font-lato text-sm leading-relaxed text-neutral-300">{a.texte}</p>
                  </div>
                </article>
              ))}
            </div>

            <label className="flex items-start gap-3 mt-6 cursor-pointer group">
              <input
                type="checkbox"
                checked={charteOk}
                onChange={(e) => setCharteOk(e.target.checked)}
                className="mt-1 accent-[#c5a059] w-4 h-4"
              />
              <span className="font-lato text-sm text-neutral-300 group-hover:text-neutral-100 transition-colors">
                J'ai pris connaissance de la charte et je veux faire partie de la coopérative.
              </span>
            </label>

            <div className="flex items-center justify-between mt-8 flex-wrap gap-3">
              <button onClick={() => auth && signOut(auth)} className="font-lato text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
                Changer de profil
              </button>
              <button
                onClick={() => setStep('form')}
                disabled={!charteOk}
                className="px-8 py-3.5 rounded-[15px] bg-[#f3e5ab] text-[#0a0808] font-cinzel text-[12px] uppercase tracking-[0.3em] hover:bg-[#c5a059] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        )}

        {step === 'form' && (
          <motion.div key="form" {...stepMotion} className={`${glass} p-6 md:p-10`}>
            <Eyebrow>Étape 3 · Ta candidature</Eyebrow>
            <h3 className="font-prata text-2xl md:text-3xl text-[#f3e5ab] mt-4 mb-8">
              Ce que tes mains veulent faire
            </h3>

            <div className="space-y-8">
              <div>
                <label className="block font-cinzel text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">Ton nom</label>
                <input className={field} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton nom" />
              </div>

              <div>
                <label className="block font-cinzel text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
                  Tes voies <span className="text-neutral-600 normal-case tracking-normal font-lato">(choisis-en une ou plusieurs)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ACTIVITES.map((a) => {
                    const on = activities.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleActivity(a.id)}
                        aria-pressed={on}
                        className={`px-4 py-3.5 rounded-[15px] border font-lato text-sm text-left transition-all ${
                          on
                            ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#f3e5ab]'
                            : 'border-white/15 bg-black/30 text-neutral-400 hover:border-white/30 hover:text-neutral-200'
                        }`}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2.5 align-middle ${on ? 'bg-[#c5a059]' : 'bg-white/20'}`} />
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className={`flex items-start gap-3 cursor-pointer group p-4 rounded-[15px] border transition-all ${council ? 'border-[#c5a059]/60 bg-[#c5a059]/5' : 'border-white/10'}`}>
                <input type="checkbox" checked={council} onChange={(e) => setCouncil(e.target.checked)} className="mt-1 accent-[#c5a059] w-4 h-4" />
                <span className="font-lato text-sm text-neutral-300 group-hover:text-neutral-100 transition-colors">
                  Je me porte volontaire pour siéger au conseil d'administration.
                </span>
              </label>

              <div>
                <label className="block font-cinzel text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">Ce que tu voudrais vivre ici</label>
                <textarea
                  className={`${field} min-h-[110px] resize-y`}
                  value={wantText}
                  onChange={(e) => setWantText(e.target.value)}
                  placeholder="Ce que tu cultiverais, créerais ou offrirais dans cette collaboration."
                />
              </div>

              <div>
                <label className="block font-cinzel text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">Pourquoi toi</label>
                <textarea
                  className={`${field} min-h-[110px] resize-y`}
                  value={whyText}
                  onChange={(e) => setWhyText(e.target.value)}
                  placeholder="Ce que tu apporterais aux neuf autres."
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-10 flex-wrap gap-3">
              <button onClick={() => setStep('charte')} className="font-lato text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
                Relire la charte
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="px-10 py-4 rounded-[15px] bg-[#f3e5ab] text-[#0a0808] font-cinzel text-[12px] uppercase tracking-[0.3em] hover:bg-[#c5a059] transition-colors disabled:opacity-50"
              >
                {busy ? 'Envoi' : 'Déposer ma candidature'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" {...stepMotion} className={`${glass} p-6 md:p-10 text-center`}>
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-[#c5a059]/60 bg-[#c5a059]/10 mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#f3e5ab" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="font-prata text-2xl md:text-3xl text-[#f3e5ab] mb-3">Candidature reçue</h3>
            <p className="font-lato text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
              Merci {existing?.name?.split(' ')[0] ?? ''}. On lit chaque candidature avec attention et on te revient rapidement.
              {existing?.council && ' Ton intérêt pour le conseil est noté.'}
            </p>
            <div className="flex items-center justify-center gap-6 mt-8">
              <button
                onClick={() => setStep('form')}
                className="font-cinzel text-[11px] uppercase tracking-[0.3em] text-neutral-400 hover:text-[#f3e5ab] transition-colors"
              >
                Modifier
              </button>
              <button
                onClick={() => auth && signOut(auth)}
                className="font-cinzel text-[11px] uppercase tracking-[0.3em] text-neutral-600 hover:text-neutral-400 transition-colors"
              >
                Me déconnecter
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 font-lato text-sm text-[#e08a8a] text-center"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function messageErreur(e: unknown): string {
  const code = (e as { code?: string; message?: string })?.code ?? '';
  const msg = (e as { message?: string })?.message ?? '';
  if (msg === 'nom') return 'Écris ton nom pour continuer.';
  if (msg === 'activites') return 'Choisis au moins une voie.';
  if (msg === 'textes') return 'Les deux réponses nous aident à te choisir : prends le temps de les écrire.';
  if (code.includes('email-already-in-use')) return 'Ce courriel a déjà un profil. Essaie de te reconnecter.';
  if (code.includes('invalid-email')) return 'Ce courriel ne semble pas valide.';
  if (code.includes('weak-password')) return 'Choisis un mot de passe de six caractères ou plus.';
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'Courriel ou mot de passe incorrect.';
  if (code.includes('popup-closed-by-user')) return '';
  return 'Un pépin est survenu. Réessaie dans un instant.';
}
