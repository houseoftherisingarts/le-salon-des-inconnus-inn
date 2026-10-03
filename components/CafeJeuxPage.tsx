// CafeJeuxPage : /cafe-jeux. Le Pai Sho hébergé par le Salon (public/jeux/pai-sho,
// même origine) s'encadre avec sa boutique de parures; les jeux du Festival
// médiéval s'encadrent depuis leur site. Les pétales se gagnent en jouant
// (postMessage 'paisho:partie' venu du cadre) et achètent les parures; la carte
// passe par Stripe Checkout (creerPaiementSkin) et exige un compte.
// Patron de page : PetiteMonnaiePage (scroller fixe, SiteFooter, verre chaud).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../firebase';
import { AuthModal, type MemberProfile } from './AuthModal';
import { SiteFooter } from './SiteFooter';
import { BETA_TOUT_OUVERT, SKINS_PAI_SHO, JEUX_FESTIVAL, TEXTES, type Skin } from '../data/cafeJeux';
import { petalesPourPartie, lireSolde, ecrireSolde, lireDebloques, ecrireDebloques, CLE_DEBLOQUES } from '../utils/petales';

const PAD = 'px-4 sm:px-6 md:px-12 lg:px-20';
const VERRE = 'rounded-[15px] bg-black/40 backdrop-blur-md border border-white/15';
const PRATA = { fontFamily: 'Prata, serif' } as const;
const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';
const PAI_SHO_SRC = '/jeux/pai-sho/index.html';

interface Props {
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
  user: User | null;
  onUserChange: (user: User | null, profile: MemberProfile | null) => void;
}

const fmtPrix = (n: number, fr: boolean) => fr ? `${n.toFixed(2).replace('.', ',')} $` : `$${n.toFixed(2)}`;

// Un cadre de jeu avec son bouton plein écran. Sans l'API Fullscreen (iPhone),
// le cadre passe en position fixe par-dessus la page.
const CadreJeu: React.FC<{ src: string; titre: string; fr: boolean; iframeRef?: React.Ref<HTMLIFrameElement>; extra?: React.ReactNode }> = ({ src, titre, fr, iframeRef, extra }) => {
  const t = TEXTES[fr ? 'FR' : 'EN'];
  const boite = useRef<HTMLDivElement>(null);
  const [plein, setPlein] = useState(false);
  useEffect(() => {
    const sortir = () => { if (!document.fullscreenElement) setPlein(false); };
    document.addEventListener('fullscreenchange', sortir);
    return () => document.removeEventListener('fullscreenchange', sortir);
  }, []);
  const basculer = () => {
    if (plein) {
      if (document.fullscreenElement) void document.exitFullscreen();
      setPlein(false);
      return;
    }
    setPlein(true);
    boite.current?.requestFullscreen?.().catch(() => { /* repli : position fixe */ });
  };
  return (
    <div ref={boite} className={plein ? 'fixed inset-0 z-[80] bg-[#0a0808] flex flex-col' : `${VERRE} overflow-hidden flex flex-col`}>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/10 bg-black/30">
        <p className="font-cinzel text-[11px] sm:text-xs uppercase tracking-[0.22em] text-[#f3e5ab] truncate">{titre}</p>
        <div className="flex items-center gap-2 shrink-0">
          {extra}
          <button type="button" onClick={basculer}
            className="px-3.5 py-1.5 rounded-full border border-[#c5a059]/50 font-lato text-[13px] text-[#f3e5ab] hover:bg-[#c5a059]/15 transition-colors">
            {plein ? t.quitter : t.pleinEcran}
          </button>
        </div>
      </div>
      <iframe ref={iframeRef} src={src} title={titre}
        className={plein ? 'flex-1 w-full' : 'w-full h-[78vh] lg:h-[82vh] max-h-[920px]'}
        allow="fullscreen; autoplay" style={{ border: 0, background: '#0a0808' }} />
    </div>
  );
};

export const CafeJeuxPage: React.FC<Props> = ({ language, onNavigate, user, onUserChange }) => {
  const fr = language === 'FR';
  const L = fr ? 'FR' : 'EN';
  const t = TEXTES[L];
  const scroller = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const paiSho = useRef<HTMLIFrameElement>(null);
  const [solde, setSolde] = useState(lireSolde);
  const [debloques, setDebloques] = useState(lireDebloques);
  const [toast, setToast] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState<string | null>(null);
  const [authOuverte, setAuthOuverte] = useState(false);
  const [paiement, setPaiement] = useState<string | null>(null);
  const [jeuFmm, setJeuFmm] = useState<string | null>(null);
  // Skin payé par carte en attente de la confirmation du webhook.
  const [aVerifier, setAVerifier] = useState<Skin | null>(null);

  // Synchronise état, localStorage et (si connecté) members/{uid}/prive/cafeJeux.
  const pousser = useCallback((petales: number, ids: string[]) => {
    if (!user || !db) return;
    void setDoc(doc(db, 'members', user.uid, 'prive', 'cafeJeux'), {
      // skins.paiSho appartient au webhook seul; le client garde ses parures en pétales à part.
      petales, skinsPetales: arrayUnion(...ids), majLe: serverTimestamp(),
    }, { merge: true }).catch(() => { /* le local fait foi jusqu'au prochain passage */ });
  }, [user]);

  const appliquer = useCallback((petales: number, ids: string[]) => {
    const uniques = [...new Set(ids)];
    ecrireSolde(petales); ecrireDebloques(uniques);
    setSolde(petales); setDebloques(uniques);
    pousser(petales, uniques);
  }, [pousser]);

  // Connexion : le plus grand des deux soldes fait foi, les parures s'additionnent.
  useEffect(() => {
    if (!user || !db) return;
    getDoc(doc(db, 'members', user.uid, 'prive', 'cafeJeux')).then((snap) => {
      const d = snap.data() ?? {};
      const distant = Number.isInteger(d.petales) ? d.petales as number : 0;
      const liste = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
      const ids = [...liste(d.skins?.paiSho), ...liste(d.skinsPetales)];
      appliquer(Math.max(lireSolde(), distant), [...lireDebloques(), ...ids]);
    }).catch(() => { /* hors ligne : le local reste */ });
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Retour de Stripe : ?achat=ok&skin=x ne débloque rien. Seul le webhook écrit
  // skins.paiSho; la page relit ce champ et débloque quand l'id y paraît.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const skin = SKINS_PAI_SHO.find((s) => s.id === q.get('skin'));
    if (q.get('achat') === 'ok' && skin) {
      setAVerifier(skin);
      history.replaceState(history.state, '', '/cafe-jeux');
      window.setTimeout(() => document.getElementById('pai-sho')?.scrollIntoView({ behavior: 'smooth' }), 400);
    }
  }, []);

  useEffect(() => {
    if (!aVerifier) return;
    if (!user || !db) { setAnnonce(t.verifConnexion); return; }
    setAnnonce(t.verifEnCours);
    const ref = doc(db, 'members', user.uid, 'prive', 'cafeJeux');
    let essais = 0;
    let fini = false;
    const verifier = async () => {
      essais += 1;
      try {
        const paye = (await getDoc(ref)).data()?.skins?.paiSho;
        if (!fini && Array.isArray(paye) && paye.includes(aVerifier.id)) {
          fini = true; window.clearInterval(minuterie);
          appliquer(lireSolde(), [...lireDebloques(), aVerifier.id]);
          setAnnonce(t.merci(aVerifier.nom[L])); setAVerifier(null);
          return;
        }
      } catch { /* réseau : on retente au prochain tour */ }
      if (!fini && essais >= 15) {
        fini = true; window.clearInterval(minuterie);
        setAnnonce(t.verifPlusTard); setAVerifier(null);
      }
    };
    const minuterie = window.setInterval(verifier, 2000);
    void verifier();
    return () => { fini = true; window.clearInterval(minuterie); };
  }, [aVerifier, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fin de partie annoncée par le cadre Pai Sho.
  useEffect(() => {
    const ecouter = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== paiSho.current?.contentWindow) return;
      const gain = petalesPourPartie(e.data);
      if (!gain) return;
      appliquer(lireSolde() + gain, lireDebloques());
      setToast(t.gagne(gain));
      window.setTimeout(() => setToast(null), 2600);
    };
    window.addEventListener('message', ecouter);
    return () => window.removeEventListener('message', ecouter);
  }, [appliquer, t]);

  // Le jeu peut aussi écrire paisho.debloques : la page relit à chaque changement.
  useEffect(() => {
    const relire = (e: StorageEvent) => { if (e.key === CLE_DEBLOQUES) setDebloques(lireDebloques()); };
    window.addEventListener('storage', relire);
    return () => window.removeEventListener('storage', relire);
  }, []);

  // Premier défilement : la taverne s'allume (variable CSS, sans rendu React).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const maj = () => hero.current?.style.setProperty('--p', String(Math.min(1, el.scrollTop / 420)));
    el.addEventListener('scroll', maj, { passive: true });
    return () => el.removeEventListener('scroll', maj);
  }, []);

  const acheterPetales = (s: Skin) => {
    if (solde < s.petales || debloques.includes(s.id)) return;
    appliquer(solde - s.petales, [...debloques, s.id]);
    setAnnonce(t.merci(s.nom[L]));
  };

  const acheterCarte = async (s: Skin) => {
    if (!user) { setAuthOuverte(true); return; }
    if (!app) return;
    setPaiement(s.id);
    try {
      const fn = httpsCallable<{ jeu: string; skin: string }, { url: string }>(getFunctions(app), 'creerPaiementSkin');
      const { data } = await fn({ jeu: 'pai-sho', skin: s.id });
      window.location.assign(data.url);
    } catch {
      setAnnonce(t.erreur);
      setPaiement(null);
    }
  };

  const fmm = JEUX_FESTIVAL.find((j) => j.id === jeuFmm);

  return (
    <div ref={scroller} className="fixed inset-0 z-40 overflow-y-auto overflow-x-hidden text-white" style={{ background: '#0a0808' }}>
      <style>{`
        @keyframes cjBurns { from { transform: scale(1.06) translate3d(0,0,0); } to { transform: scale(1.14) translate3d(-1.5%,-1%,0); } }
        @keyframes cjMonte { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        .cj-monte { animation: cjMonte 1.1s cubic-bezier(0.16,1,0.3,1) both; }
        @media (prefers-reduced-motion: reduce) { .cj-burns, .cj-monte { animation: none !important; } }
      `}</style>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -1 }} aria-hidden>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 50% 0%, #1d1510 0%, #0a0808 62%)' }} />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `url('${GRAIN}')` }} />
      </div>

      {/* ── Hero : la taverne plein écran, qui s'allume au premier défilement ── */}
      <header ref={hero} className="relative h-[100svh] min-h-[560px] overflow-hidden flex items-end" style={{ ['--p' as string]: 0 }}>
        <div className="absolute inset-0" style={{ filter: 'brightness(calc(0.85 + var(--p) * 0.5)) saturate(calc(0.95 + var(--p) * 0.3))' }}>
          <img src="/media/cafe-jeux/taverne-hero.webp" alt="" className="cj-burns absolute inset-0 w-full h-full object-cover"
            style={{ animation: 'cjBurns 22s ease-in-out infinite alternate', objectPosition: '50% 20%' }} />
        </div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,8,8,0.45) 0%, rgba(10,8,8,0) 30%, rgba(10,8,8,0.35) 62%, rgba(10,8,8,0.92) 88%, #0a0808 100%)' }} />
        {/* Mobile : le texte descend sur le plateau, un voile plus dense le garde lisible. */}
        <div className="absolute inset-0 sm:hidden" style={{ background: 'linear-gradient(180deg, transparent 18%, rgba(10,8,8,0.82) 46%, rgba(10,8,8,0.9) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 45%, rgba(220,150,70, calc(var(--p) * 0.22)), transparent 70%)' }} />

        <div className={`relative w-full ${PAD} pb-12 md:pb-20 grid lg:grid-cols-[1.3fr_1fr] gap-8 items-end`}>
          <div className="cj-monte">
            <p className="font-cinzel text-[#c5a059] text-[11px] md:text-xs uppercase tracking-[0.42em]">{t.eyebrow}</p>
            <h1 className="mt-4 text-[#f3e5ab] leading-[0.95] text-[14vw] sm:text-7xl lg:text-[6rem] xl:text-[7rem]" style={{ ...PRATA, letterSpacing: '-0.015em' }}>{t.titre}</h1>
          </div>
          <div className="cj-monte" style={{ animationDelay: '0.15s' }}>
            <p className="font-lato text-base md:text-lg leading-relaxed text-white/80">{t.lede}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#pai-sho" onClick={(e) => { e.preventDefault(); document.getElementById('pai-sho')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="px-7 py-3 rounded-full bg-[#c5a059] text-[#1a120a] font-cinzel text-xs font-bold uppercase tracking-[0.22em] hover:bg-[#d4b273] transition-colors">
                {t.cta}
              </a>
              <span className={`${VERRE} px-4 py-2.5 font-lato text-sm text-white/80`}>
                {t.vosPetales} <strong className="text-[#f3e5ab] font-bold ml-1">{solde}</strong>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Fiche Pai Sho : le jeu encadré et sa boutique ── */}
      <section id="pai-sho" className={`relative ${PAD} pt-16 md:pt-24 pb-16 scroll-mt-20`}>
        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-16 items-end mb-8 md:mb-10">
          <div>
            <p className="font-cinzel text-[#c5a059] text-[11px] md:text-xs uppercase tracking-[0.42em]">{t.paiEyebrow}</p>
            <h2 className="mt-3 text-[#f3e5ab] text-4xl md:text-[3.4rem] leading-[1.04]" style={PRATA}>{t.paiTitre}</h2>
          </div>
          <p className="font-lato text-base md:text-lg leading-relaxed text-white/75">{t.paiTexte}</p>
        </div>

        {annonce && (
          <div role="status" className={`${VERRE} mb-6 px-5 py-4 flex items-center justify-between gap-4 border-[#c5a059]/45`}>
            <p className="font-lato text-[15px] text-[#f3e5ab]">{annonce}</p>
            <button type="button" onClick={() => setAnnonce(null)} className="font-lato text-[13px] text-white/60 hover:text-white shrink-0">{t.fermer}</button>
          </div>
        )}

        <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <CadreJeu src={PAI_SHO_SRC} titre={t.cadreTitre} fr={fr} iframeRef={paiSho} />

          <aside className={`${VERRE} p-5 md:p-6`}>
            <h3 className="text-[#f3e5ab] text-2xl" style={PRATA}>{t.boutique}</h3>
            <p className="mt-2 inline-flex items-baseline gap-1.5 rounded-full border border-[#c5a059]/40 bg-[#c5a059]/10 px-3.5 py-1 font-lato text-sm text-white/75">
              <strong className="text-[#f3e5ab] text-lg font-bold">{solde}</strong>{t.petales}
            </p>
            <p className="mt-3 font-lato text-[14px] leading-relaxed text-white/65">{t.gain}</p>
            {BETA_TOUT_OUVERT && <p className="mt-3 rounded-[12px] border border-[#c5a059]/40 bg-[#c5a059]/10 px-3.5 py-2.5 font-lato text-[14px] leading-snug text-[#f3e5ab]">{t.betaOuvert}</p>}

            {(['plateau', 'tuiles'] as const).map((type) => (
              <div key={type} className="mt-5">
                <p className="font-cinzel text-[11px] uppercase tracking-[0.3em] text-[#c5a059] mb-2">{type === 'plateau' ? t.plateaux : t.tuiles}</p>
                <ul className="flex flex-col gap-2.5">
                  {SKINS_PAI_SHO.filter((s) => s.type === type).map((s) => {
                    const a = BETA_TOUT_OUVERT || debloques.includes(s.id);
                    const manque = s.petales - solde;
                    return (
                      <li key={s.id} className="rounded-[12px] border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex gap-3">
                          <span className="w-11 h-11 rounded-full shrink-0 border border-white/20 shadow-[0_0_18px_rgba(197,160,89,0.18)]" style={{ background: s.teinte }} aria-hidden />
                          <div className="min-w-0">
                            <p className="font-lato text-[15px] font-bold text-white/90">{s.nom[L]}</p>
                            <p className="font-lato text-[13px] leading-snug text-white/55">{s.texte[L]}</p>
                          </div>
                        </div>
                        {a ? (
                          <p className="mt-2.5 font-cinzel text-[11px] uppercase tracking-[0.2em] text-[#8fcfa0]">{t.possede}</p>
                        ) : (
                          <div className="mt-2.5 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => acheterPetales(s)} disabled={manque > 0}
                              title={manque > 0 ? t.manque(manque) : undefined}
                              className="px-3 py-2 rounded-full border border-[#c5a059]/55 font-lato text-[13px] text-[#f3e5ab] enabled:hover:bg-[#c5a059]/15 disabled:opacity-45 disabled:cursor-not-allowed transition-colors">
                              {manque > 0 ? t.manque(manque) : `${s.petales} ${t.petales}`}
                            </button>
                            <button type="button" onClick={() => acheterCarte(s)} disabled={paiement !== null}
                              className="px-3 py-2 rounded-full bg-[#c5a059] text-[#1a120a] font-lato text-[13px] font-bold hover:bg-[#d4b273] disabled:opacity-60 transition-colors">
                              {paiement === s.id ? '…' : fmtPrix(s.prix, fr)}
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {!user && <p className="mt-4 font-lato text-[13px] leading-snug text-white/50">{t.carteCompte}</p>}
          </aside>
        </div>
      </section>

      {/* ── Les jeux du festival ── */}
      <section className={`relative ${PAD} pt-12 md:pt-20 pb-20`}>
        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-16 items-end mb-8 md:mb-10">
          <div>
            <p className="font-cinzel text-[#c5a059] text-[11px] md:text-xs uppercase tracking-[0.42em]">{t.fmmEyebrow}</p>
            <h2 className="mt-3 text-[#f3e5ab] text-4xl md:text-[3.4rem] leading-[1.04]" style={PRATA}>{t.fmmTitre}</h2>
          </div>
          <p className="font-lato text-base md:text-lg leading-relaxed text-white/75">{t.fmmTexte}</p>
        </div>

        {fmm && (
          <div id="table-festival" className="mb-8 scroll-mt-20">
            <CadreJeu key={fmm.id} src={fmm.url[L]} titre={fmm.nom[L]} fr={fr}
              extra={<a href={fmm.url[L]} target="_blank" rel="noopener" className="hidden sm:inline font-lato text-[13px] text-white/55 hover:text-white underline-offset-4 hover:underline">{t.surLeSite}</a>} />
          </div>
        )}

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {JEUX_FESTIVAL.map((j) => {
            const actif = j.id === jeuFmm;
            return (
              <button key={j.id} type="button"
                onClick={() => { setJeuFmm(j.id); window.setTimeout(() => document.getElementById('table-festival')?.scrollIntoView({ behavior: 'smooth' }), 60); }}
                className={`group ${VERRE} overflow-hidden text-left transition-colors ${actif ? 'border-[#c5a059]/70' : 'hover:border-[#c5a059]/45'}`}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={j.image} alt={j.nom[L]} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(10,8,8,0.92) 100%)' }} />
                  <p className="absolute left-4 bottom-3 right-4 text-[#f3e5ab] text-2xl" style={PRATA}>{j.nom[L]}</p>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <p className="font-lato text-[14px] leading-relaxed text-white/65">{j.texte[L]}</p>
                  <span className={`self-start px-4 py-1.5 rounded-full font-lato text-[13px] ${actif ? 'bg-[#c5a059] text-[#1a120a] font-bold' : 'border border-[#c5a059]/55 text-[#f3e5ab]'}`}>
                    {actif ? t.enCours : t.jouer}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <SiteFooter language={language} onNavigate={onNavigate} />

      {toast && (
        <div role="status" className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] ${VERRE} px-5 py-3 font-cinzel text-sm tracking-[0.15em] text-[#f3e5ab] shadow-[0_0_30px_rgba(197,160,89,0.35)]`}>
          {toast}
        </div>
      )}

      {authOuverte && (
        <AuthModal
          language={language}
          onClose={() => setAuthOuverte(false)}
          onAuthSuccess={(u, p) => { onUserChange(u, p); setAuthOuverte(false); }}
          onShowPrivacy={() => window.dispatchEvent(new Event('salon:privacy'))}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};
