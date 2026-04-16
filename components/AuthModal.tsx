
import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  deleteUser,
  type ConfirmationResult,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MembershipType =
  | 'voyageur'
  | 'artiste'
  | 'membre-communaute'
  | 'resident'
  | 'woofer';

export interface MemberProfile {
  uid: string;
  email: string;
  phone?: string;
  displayName: string;
  photoURL?: string;
  membershipType: MembershipType;
  isAdmin: boolean;
  createdAt: any;
  consentDate: string;  // ISO date — Law 25 audit trail
  consentVersion: string;
}

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (user: User, profile: MemberProfile) => void;
  language: 'EN' | 'FR';
  onShowPrivacy: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'houseoftherisingarts@gmail.com';
const CONSENT_VERSION = '1';

const MEMBERSHIP_OPTIONS: {
  id: MembershipType; label: string; label_fr: string; desc: string; desc_fr: string; icon: string;
}[] = [
  { id: 'voyageur',         label: 'Voyageur',          label_fr: 'Voyageur',             icon: '🧭', desc: 'Curious traveller, here to discover the place',     desc_fr: 'Passager curieux, venu découvrir le lieu' },
  { id: 'artiste',          label: 'Artiste',            label_fr: 'Artiste',              icon: '🎨', desc: 'Artist in residence or passing through',             desc_fr: 'Artiste en résidence ou de passage' },
  { id: 'membre-communaute', label: 'Community Member',  label_fr: 'Membre Communauté',    icon: '🌿', desc: 'Regular supporter of the collective project',        desc_fr: 'Soutien régulier du projet collectif' },
  { id: 'resident',         label: 'Resident',           label_fr: 'Résident',             icon: '🏡', desc: 'Extended presence in the space',                    desc_fr: 'Présence prolongée dans le lieu' },
  { id: 'woofer',           label: 'Woofer',             label_fr: 'Woofer',               icon: '🪚', desc: 'Active volunteer, sharing skills',                  desc_fr: 'Bénévole actif, partage de compétences' },
];

type AuthMode = 'login' | 'signup' | 'phone' | 'phone-otp' | 'membership' | 'delete-confirm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchMemberProfile(user: User): Promise<MemberProfile | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'members', user.uid));
  return snap.exists() ? (snap.data() as MemberProfile) : null;
}

async function createMemberProfile(
  user: User,
  membershipType: MembershipType,
  displayName: string,
): Promise<MemberProfile> {
  const profile: MemberProfile = {
    uid: user.uid,
    email: user.email || '',
    phone: user.phoneNumber || undefined,
    displayName,
    photoURL: user.photoURL || undefined,
    membershipType,
    isAdmin: user.email === ADMIN_EMAIL,
    createdAt: serverTimestamp(),
    consentDate: new Date().toISOString(),
    consentVersion: CONSENT_VERSION,
  };
  if (db) await setDoc(doc(db, 'members', user.uid), profile);
  return profile;
}

async function deleteMemberData(user: User): Promise<void> {
  if (db) await deleteDoc(doc(db, 'members', user.uid));
  await deleteUser(user);
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuthSuccess, language, onShowPrivacy }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Email/password fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);

  // Phone auth fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Membership step
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [pendingName, setPendingName] = useState('');
  const [selectedMembership, setSelectedMembership] = useState<MembershipType | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  // ── reCAPTCHA lifecycle ──────────────────────────────────────────────────────

  useEffect(() => {
    if (mode !== 'phone' || !auth) return;
    // Create invisible reCAPTCHA verifier
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-anchor', {
      size: 'invisible',
      callback: () => { /* solved */ },
      'expired-callback': () => setError(t('reCAPTCHA expired. Please try again.', 'reCAPTCHA expiré. Veuillez réessayer.')),
    });
    recaptchaVerifierRef.current = verifier;
    return () => {
      verifier.clear();
      recaptchaVerifierRef.current = null;
    };
  }, [mode]);

  // ── Auth handlers ────────────────────────────────────────────────────────────

  const afterAuth = async (user: User, forcedName?: string) => {
    const existing = await fetchMemberProfile(user);
    if (existing) {
      onAuthSuccess(user, existing);
    } else {
      setPendingUser(user);
      setPendingName(forcedName || user.displayName || '');
      setMode('membership');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) { setError('Firebase non configuré'); return; }
    setLoading(true); setError('');
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await afterAuth(result.user);
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') setError(e.message || t('Sign-in error', 'Erreur de connexion'));
    } finally { setLoading(false); }
  };

  const handleEmailAuth = async () => {
    if (!auth) { setError('Firebase non configuré'); return; }
    if (mode === 'signup' && !consentChecked) {
      setError(t('You must accept the Privacy Policy to create an account.', 'Vous devez accepter la Politique de Confidentialité pour créer un compte.'));
      return;
    }
    setLoading(true); setError('');
    try {
      let user: User;
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        user = result.user;
        if (name) await updateProfile(user, { displayName: name });
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        user = result.user;
      }
      await afterAuth(user, name);
    } catch (e: any) {
      const msgs: Record<string, string> = {
        'auth/email-already-in-use':  t('Email already in use.', 'Courriel déjà utilisé.'),
        'auth/invalid-credential':    t('Wrong email or password.', 'Courriel ou mot de passe incorrect.'),
        'auth/wrong-password':        t('Wrong password.', 'Mot de passe incorrect.'),
        'auth/user-not-found':        t('No account with this email.', 'Aucun compte avec ce courriel.'),
        'auth/weak-password':         t('Password must be at least 6 characters.', 'Mot de passe trop court (min. 6 caractères).'),
        'auth/invalid-email':         t('Invalid email address.', 'Adresse courriel invalide.'),
      };
      setError(msgs[e.code] || e.message);
    } finally { setLoading(false); }
  };

  const handlePhoneSend = async () => {
    if (!auth || !recaptchaVerifierRef.current) { setError('Firebase non configuré'); return; }
    if (!consentChecked) {
      setError(t('You must accept the Privacy Policy to continue.', 'Vous devez accepter la Politique de Confidentialité pour continuer.'));
      return;
    }
    // Normalize phone to E.164
    let normalized = phone.trim().replace(/\s+/g, '').replace(/-/g, '');
    if (!normalized.startsWith('+')) normalized = '+1' + normalized.replace(/\D/g, '');
    if (normalized.replace(/\D/g, '').length < 11) {
      setError(t('Please enter a valid phone number (e.g. +1 514 555 1234).', 'Veuillez entrer un numéro de téléphone valide (ex. +1 514 555 1234).'));
      return;
    }
    setLoading(true); setError('');
    try {
      const result = await signInWithPhoneNumber(auth, normalized, recaptchaVerifierRef.current);
      setConfirmationResult(result);
      setMode('phone-otp');
    } catch (e: any) {
      const msgs: Record<string, string> = {
        'auth/invalid-phone-number':   t('Invalid phone number.', 'Numéro de téléphone invalide.'),
        'auth/too-many-requests':      t('Too many requests. Please wait.', 'Trop de tentatives. Veuillez patienter.'),
        'auth/captcha-check-failed':   t('reCAPTCHA failed. Please try again.', 'reCAPTCHA échoué. Veuillez réessayer.'),
      };
      setError(msgs[e.code] || e.message);
    } finally { setLoading(false); }
  };

  const handlePhoneConfirm = async () => {
    if (!confirmationResult) return;
    setLoading(true); setError('');
    try {
      const result = await confirmationResult.confirm(otp.trim());
      await afterAuth(result.user);
    } catch (e: any) {
      const msgs: Record<string, string> = {
        'auth/invalid-verification-code': t('Incorrect code.', 'Code incorrect.'),
        'auth/code-expired':              t('Code expired. Please request a new one.', 'Code expiré. Veuillez en demander un nouveau.'),
      };
      setError(msgs[e.code] || e.message);
    } finally { setLoading(false); }
  };

  const handleMembershipSubmit = async () => {
    if (!pendingUser || !selectedMembership) return;
    setLoading(true);
    try {
      const profile = await createMemberProfile(pendingUser, selectedMembership, pendingName);
      onAuthSuccess(pendingUser, profile);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!pendingUser) return;
    setLoading(true);
    try {
      await deleteMemberData(pendingUser);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const switchMethod = (m: AuthMode) => { setMode(m); setError(''); setConsentChecked(false); };

  // ── Render helpers ───────────────────────────────────────────────────────────

  const ConsentCheckbox = () => (
    <label className="flex items-start gap-3 cursor-pointer group mt-1">
      <button
        type="button"
        onClick={() => setConsentChecked(!consentChecked)}
        className={`w-5 h-5 shrink-0 border-2 flex items-center justify-center mt-0.5 transition-colors
          ${consentChecked ? 'border-[#d4af37] bg-[#d4af37]' : 'border-white/20 group-hover:border-[#d4af37]/50'}`}
        aria-checked={consentChecked}
        role="checkbox"
      >
        {consentChecked && <span className="text-black text-xs font-bold">✓</span>}
      </button>
      <span className="text-neutral-500 text-xs font-lato leading-relaxed">
        {language === 'FR' ? (
          <>J'ai lu et j'accepte la{' '}<button type="button" onClick={onShowPrivacy} className="text-[#d4af37] hover:underline">Politique de Confidentialité</button>{' '}et je consens à la collecte de mes renseignements personnels (Loi 25 / LPRPDE).</>
        ) : (
          <>I have read and accept the{' '}<button type="button" onClick={onShowPrivacy} className="text-[#d4af37] hover:underline">Privacy Policy</button>{' '}and consent to the collection of my personal information (Law 25 / PIPEDA).</>
        )}
      </span>
    </label>
  );

  const MethodTabs = () => (
    <div className="flex border border-white/10 mb-5">
      {(['login', 'signup', 'phone'] as const).map((m) => (
        <button
          key={m}
          onClick={() => switchMethod(m)}
          className={`flex-1 py-2 text-xs font-cinzel uppercase tracking-wider transition-colors
            ${mode === m ? 'bg-[#d4af37] text-black' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
        >
          {m === 'login'  ? t('Email', 'Courriel')
           : m === 'signup' ? t('Sign Up', 'Inscription')
           : t('Phone', 'Téléphone')}
        </button>
      ))}
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      {/* Invisible reCAPTCHA anchor — must be in DOM when phone mode active */}
      <div id="recaptcha-anchor" className="absolute -top-96 -left-96 opacity-0 pointer-events-none" aria-hidden="true"></div>

      <div className="relative w-full max-w-md bg-[#0f0f0f] border border-[#d4af37]/30 shadow-2xl max-h-[92vh] overflow-y-auto animate-fadeInModal">
        {/* Corner decorations */}
        {(['tl','tr','bl','br'] as const).map(c => (
          <div key={c} className={`absolute w-4 h-4 ${c.includes('t') ? 'top-0' : 'bottom-0'} ${c.includes('l') ? 'left-0' : 'right-0'} border-${c.includes('t') ? 't' : 'b'}-2 border-${c.includes('l') ? 'l' : 'r'}-2 border-[#d4af37]/60`}></div>
        ))}

        <div className="p-7">

          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[#d4af37] text-[10px] font-cinzel uppercase tracking-[0.5em]">
                Le Salon des Inconnus
              </span>
              <h2 className="font-cinzel text-xl text-white mt-1">
                {mode === 'membership'     ? t('Your Membership',  'Votre Appartenance')
                 : mode === 'phone-otp'   ? t('Verify Phone',     'Vérifier le Téléphone')
                 : mode === 'delete-confirm' ? t('Delete Account', 'Supprimer le Compte')
                 : t('Member Space', 'Espace Membre')}
              </h2>
            </div>
            <button onClick={onClose} className="text-neutral-500 hover:text-white text-2xl leading-none mt-1">×</button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/25 border border-red-700/40 text-red-300 text-xs font-lato rounded">
              {error}
            </div>
          )}

          {/* ── LOGIN / SIGNUP / PHONE tabs ── */}
          {(mode === 'login' || mode === 'signup' || mode === 'phone') && (
            <>
              {/* Google sign-in */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 bg-white text-black font-semibold text-sm hover:bg-neutral-100 disabled:opacity-50 transition-all mb-4"
              >
                <GoogleIcon />
                {t('Continue with Google', 'Continuer avec Google')}
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/8"></div>
                <span className="text-neutral-700 text-xs font-lato">{t('or', 'ou')}</span>
                <div className="flex-1 h-px bg-white/8"></div>
              </div>

              <MethodTabs />

              {/* ── Email login ── */}
              {mode === 'login' && (
                <div className="space-y-3">
                  <input type="email" placeholder={t('Email', 'Courriel')} value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 text-white px-4 py-3 text-sm font-lato focus:outline-none focus:border-[#d4af37]/60 placeholder:text-neutral-600" />
                  <input type="password" placeholder={t('Password', 'Mot de passe')} value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
                    className="w-full bg-[#1a1a1a] border border-white/10 text-white px-4 py-3 text-sm font-lato focus:outline-none focus:border-[#d4af37]/60 placeholder:text-neutral-600" />
                  <button onClick={handleEmailAuth} disabled={loading || !email || !password}
                    className="w-full py-3 border border-[#d4af37] text-[#d4af37] font-cinzel text-sm uppercase tracking-widest hover:bg-[#d4af37] hover:text-black disabled:opacity-40 transition-all">
                    {loading ? '...' : t('Sign In', 'Se connecter')}
                  </button>
                </div>
              )}

              {/* ── Email signup ── */}
              {mode === 'signup' && (
                <div className="space-y-3">
                  <input type="text" placeholder={t('Your name', 'Votre nom')} value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 text-white px-4 py-3 text-sm font-lato focus:outline-none focus:border-[#d4af37]/60 placeholder:text-neutral-600" />
                  <input type="email" placeholder={t('Email', 'Courriel')} value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 text-white px-4 py-3 text-sm font-lato focus:outline-none focus:border-[#d4af37]/60 placeholder:text-neutral-600" />
                  <input type="password" placeholder={t('Password (min. 6 chars)', 'Mot de passe (min. 6 caractères)')} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 text-white px-4 py-3 text-sm font-lato focus:outline-none focus:border-[#d4af37]/60 placeholder:text-neutral-600" />
                  <ConsentCheckbox />
                  <button onClick={handleEmailAuth} disabled={loading || !email || !password || !consentChecked}
                    className="w-full py-3 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-40 transition-all">
                    {loading ? t('Creating...', 'Création...') : t('Create Account', 'Créer un Compte')}
                  </button>
                </div>
              )}

              {/* ── Phone ── */}
              {mode === 'phone' && (
                <div className="space-y-3">
                  <p className="text-neutral-500 text-xs font-lato">
                    {t('Enter your phone number. You will receive a verification code by SMS.', 'Entrez votre numéro de téléphone. Vous recevrez un code de vérification par SMS.')}
                  </p>
                  <input
                    type="tel"
                    placeholder={t('+1 514 555 1234', '+1 514 555 1234')}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePhoneSend()}
                    className="w-full bg-[#1a1a1a] border border-white/10 text-white px-4 py-3 text-sm font-lato focus:outline-none focus:border-[#d4af37]/60 placeholder:text-neutral-600"
                  />
                  <ConsentCheckbox />
                  <p className="text-neutral-600 text-[10px] font-lato">
                    {t(
                      'Phone sign-in uses Google reCAPTCHA for security. Standard SMS rates may apply.',
                      'La connexion par téléphone utilise Google reCAPTCHA. Des frais SMS standard peuvent s\'appliquer.',
                    )}
                  </p>
                  <button onClick={handlePhoneSend} disabled={loading || !phone || !consentChecked}
                    className="w-full py-3 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-40 transition-all">
                    {loading ? t('Sending...', 'Envoi...') : t('Send Code', 'Envoyer le Code')}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── OTP confirmation ── */}
          {mode === 'phone-otp' && (
            <div className="space-y-4">
              <p className="text-neutral-400 text-sm font-lato">
                {language === 'FR' ? (
                  <>Un code à 6 chiffres a été envoyé au <strong className="text-white">{phone}</strong>.</>
                ) : (
                  <>A 6-digit code has been sent to <strong className="text-white">{phone}</strong>.</>
                )}
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder={t('6-digit code', 'Code à 6 chiffres')}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handlePhoneConfirm()}
                className="w-full bg-[#1a1a1a] border border-white/10 text-white px-4 py-3 text-sm font-lato text-center tracking-[0.5em] focus:outline-none focus:border-[#d4af37]/60 placeholder:text-neutral-600 placeholder:tracking-normal"
              />
              <button onClick={handlePhoneConfirm} disabled={loading || otp.length < 6}
                className="w-full py-3 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-40 transition-all">
                {loading ? t('Verifying...', 'Vérification...') : t('Confirm', 'Confirmer')}
              </button>
              <button onClick={() => { setMode('phone'); setOtp(''); setConfirmationResult(null); }}
                className="w-full text-neutral-600 text-xs font-lato hover:text-white transition-colors py-1">
                {t('← Change number', '← Changer de numéro')}
              </button>
            </div>
          )}

          {/* ── Membership selection ── */}
          {mode === 'membership' && (
            <div className="space-y-3">
              <p className="text-neutral-400 text-sm font-lato">
                {t('Welcome, ', 'Bienvenue, ')}<span className="text-[#d4af37]">{pendingName}</span>.{' '}
                {t('How do you identify with the Salon?', 'Comment vous identifiez-vous au Salon\u00a0?')}
              </p>
              {MEMBERSHIP_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setSelectedMembership(opt.id)}
                  className={`w-full flex items-start gap-3 p-3 border transition-all text-left
                    ${selectedMembership === opt.id ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-white/10 hover:border-[#d4af37]/40'}`}
                >
                  <span className="text-2xl mt-0.5">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="font-cinzel text-white text-sm">{language === 'FR' ? opt.label_fr : opt.label}</div>
                    <div className="text-neutral-500 text-xs font-lato mt-0.5">{language === 'FR' ? opt.desc_fr : opt.desc}</div>
                  </div>
                  {selectedMembership === opt.id && <span className="text-[#d4af37] mt-1 shrink-0">✓</span>}
                </button>
              ))}
              <button onClick={handleMembershipSubmit} disabled={!selectedMembership || loading}
                className="w-full py-3 bg-[#d4af37] text-black font-cinzel font-bold text-sm uppercase tracking-widest hover:bg-[#f3e5ab] disabled:opacity-40 transition-all">
                {loading ? t('Creating...', 'Création...') : t('Create My Space', 'Créer Mon Espace')}
              </button>

              {/* Right to withdraw / delete account (Law 25) */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <button
                  onClick={() => setMode('delete-confirm')}
                  className="text-neutral-700 text-xs font-lato hover:text-red-400 transition-colors"
                >
                  {t('→ I changed my mind — delete my account', '→ J\'ai changé d\'avis — supprimer mon compte')}
                </button>
              </div>
            </div>
          )}

          {/* ── Delete confirm ── */}
          {mode === 'delete-confirm' && (
            <div className="space-y-4">
              <p className="text-neutral-400 text-sm font-lato">
                {t(
                  'This will permanently delete your account and all associated data from our servers. This action cannot be undone.',
                  'Cela supprimera définitivement votre compte et toutes les données associées de nos serveurs. Cette action est irréversible.',
                )}
              </p>
              <div className="p-3 border border-red-900/40 bg-red-900/10 text-red-400 text-xs font-lato">
                {t(
                  'As required by Law 25, your personal information will be destroyed within 30 days.',
                  'Conformément à la Loi 25, vos renseignements personnels seront détruits dans les 30 jours.',
                )}
              </div>
              <button onClick={handleDeleteAccount} disabled={loading}
                className="w-full py-3 border-2 border-red-700 text-red-400 font-cinzel text-sm uppercase tracking-widest hover:bg-red-900/30 disabled:opacity-40 transition-all">
                {loading ? t('Deleting...', 'Suppression...') : t('Yes, Delete My Account', 'Oui, Supprimer Mon Compte')}
              </button>
              <button onClick={() => setMode('membership')} className="w-full text-neutral-600 text-xs font-lato hover:text-white transition-colors py-1">
                {t('← Go back', '← Retour')}
              </button>
            </div>
          )}

          {/* Footer — privacy link */}
          {(mode === 'login' || mode === 'signup' || mode === 'phone') && (
            <p className="mt-5 text-center text-neutral-700 text-[10px] font-lato">
              <button onClick={onShowPrivacy} className="hover:text-[#d4af37] transition-colors">
                {t('Privacy Policy', 'Politique de Confidentialité')}
              </button>
              {' · '}
              {t('Compliant with Law 25 / PIPEDA', 'Conforme à la Loi 25 / LPRPDE')}
            </p>
          )}
        </div>
      </div>

      <style>{`
        .animate-fadeInModal { animation: fadeInModal 0.2s ease-out forwards; }
        @keyframes fadeInModal { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};
