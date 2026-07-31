import React from 'react';
import { motion } from 'framer-motion';

// Page /download — la petite armurerie publique du Salon : les outils que
// nous offrons aux voyageurs. Même atmosphère que le reste du site : noir
// chaud, or discret, brume et grain. Premier outil : le Coffre des Inconnus.
interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
}

type Lang = 'EN' | 'FR' | 'ES';

const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';
const BANQUE = 'https://petite-banque-inconnus.web.app';

export const DownloadPage: React.FC<Props> = ({ onNavigate, language }) => {
  const [lang, setLang] = React.useState<Lang>(() => {
    try {
      const v = localStorage.getItem('salonToolsLang');
      if (v === 'EN' || v === 'FR' || v === 'ES') return v;
    } catch {}
    return language;
  });
  const pick = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem('salonToolsLang', l); } catch {}
  };
  const t = (en: string, frText: string, es: string) => (lang === 'FR' ? frText : lang === 'ES' ? es : en);

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto text-neutral-200" style={{ background: '#0a0808' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }} aria-hidden>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #14100c 0%, #0a0808 55%, #060505 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(48% 38% at 50% 16%, rgba(201,168,90,0.10), transparent 72%)' }} />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url('${GRAIN}')` }} />
      </div>

      <header className="fixed top-0 w-full z-[100] border-b border-[#c5a059]/15 bg-[#0a0808]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button onClick={() => onNavigate('INN')} className="flex items-center gap-3 group">
            <img src="/media/logo-icon.png" alt="" className="w-9 h-9 opacity-90" />
            <span className="font-cinzel tracking-[0.2em] text-sm text-[#c5a059] group-hover:text-[#e8d5a3] transition-colors">
              LE SALON DES INCONNUS
            </span>
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[11px] tracking-[0.18em]">
              {(['FR', 'EN', 'ES'] as Lang[]).map((l) => (
                <button key={l} onClick={() => pick(l)}
                  className={lang === l ? 'text-[#c5a059] border-b border-[#c5a059] pb-0.5' : 'text-neutral-500 hover:text-[#e8d5a3] transition-colors pb-0.5'}>
                  {l}
                </button>
              ))}
            </div>
            <button
              onClick={() => onNavigate('INN')}
              className="text-xs tracking-[0.18em] uppercase text-neutral-400 hover:text-[#c5a059] transition-colors"
            >
              {t('Back to the inn', "Retour à l'auberge", 'Volver a la posada')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-36 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
          className="text-center"
        >
          <p className="text-[11px] tracking-[0.3em] uppercase text-neutral-500 mb-4">
            {t('The workshop', "L'atelier")}
          </p>
          <h1 className="font-cinzel text-4xl md:text-5xl text-[#e8d5a3] mb-5">
            {t('Tools from the Salon', 'Les outils du Salon')}
          </h1>
          <p className="max-w-2xl mx-auto text-neutral-400 leading-relaxed">
            {t(
              'Tools built by the community, for the community.',
              'Des outils développés par la communauté, pour la communauté.',
            )}
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-16 rounded-2xl border border-[#c5a059]/25 bg-black/40 backdrop-blur-md overflow-hidden"
        >
          <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="p-10 md:p-12 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-[#c5a059]/15"
              style={{ background: 'radial-gradient(80% 80% at 50% 30%, rgba(201,168,90,0.08), transparent 75%)' }}>
              <img src="/media/logo-icon.png" alt="" className="w-28 h-28 mb-6" style={{ filter: 'drop-shadow(0 0 24px rgba(201,168,90,0.45))' }} />
              <h2 className="font-cinzel text-2xl text-[#e8d5a3]">Le Coffre des Inconnus</h2>
              <p className="text-xs text-neutral-400 mt-3 leading-relaxed max-w-[280px]">
                {t(
                  'An app for teaching personal & family economics that evolves with the child, from age 4 to a doctorate',
                  "Une application d'enseignement de l'économie personnelle & familiale qui évolue avec l'enfant, de 4 ans au doctorat",
                )}
              </p>
            </div>
            <div className="p-10 md:p-12">
              <p className="text-neutral-300 leading-relaxed">
                {t(
                  'A complete little bank for your children: jars that split every coin, compound interest paid by the head banker, real assets, goals, taxes and even currencies. Everything stays on your device.',
                  "Une petite banque complète pour vos enfants : des pots qui répartissent chaque sou, l'intérêt composé versé par le banquier en chef, de vrais actifs, des objectifs, les impôts et même les devises. Tout reste sur votre appareil.",
                )}
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <a href={`${BANQUE}/dl/CoffreDesInconnus-mac.dmg`}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#c5a059] via-[#e8d5a3] to-[#c5a059] text-[#171308] text-sm font-bold hover:shadow-[0_0_30px_rgba(197,160,89,0.35)] transition-shadow">
                  {t('Download for macOS', 'Télécharger pour macOS')}
                </a>
                <a href={`${BANQUE}/dl/CoffreDesInconnus-Setup.exe`}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#c5a059] via-[#e8d5a3] to-[#c5a059] text-[#171308] text-sm font-bold hover:shadow-[0_0_30px_rgba(197,160,89,0.35)] transition-shadow">
                  {t('Download for Windows', 'Télécharger pour Windows')}
                </a>
                <button onClick={() => onNavigate('COFFRE')}
                  className="px-6 py-3 rounded-full border border-white/20 text-neutral-200 text-sm hover:border-[#c5a059] hover:text-[#e8d5a3] transition-colors">
                  {t('Try the online demo', 'Essayer la démo en ligne')}
                </button>
                <a href={`${BANQUE}/telecharger.html`} target="_blank" rel="noopener noreferrer"
                  className="px-6 py-3 rounded-full border border-white/20 text-neutral-200 text-sm hover:border-[#c5a059] hover:text-[#e8d5a3] transition-colors">
                  {t('iPhone, iPad and Android', 'iPhone, iPad et Android')}
                </a>
              </div>
              <p className="text-neutral-500 text-xs mt-6 leading-relaxed">
                {t(
                  'Free public beta. On first launch, the bank welcomes you, opens the accounts of your children and walks you through a guided tour.',
                  "Beta publique gratuite. Au premier lancement, la banque vous accueille, ouvre les comptes de vos enfants et vous guide dans une visite.",
                )}
              </p>
            </div>
          </div>
          <div className="px-10 md:px-12 py-5 border-t border-[#c5a059]/15 flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-500">
            <span>{t('An ad-free experience, presented by', 'Une expérience sans publicité, présentée par')}</span>
            <span className="text-[#c5a059] font-semibold">La Petite Monnaie</span>
            <a href="mailto:alex@lesalondesinconnus.com?subject=Commanditer%20les%20outils%20du%20Salon"
              className="underline decoration-dotted underline-offset-4 hover:text-[#e8d5a3] transition-colors">
              {t('Become a sponsor', 'Devenir commanditaire')}
            </a>
            <a href="https://coffre-des-inconnus.web.app/telecharger.html#dons" target="_blank" rel="noopener noreferrer"
              className="underline decoration-dotted underline-offset-4 hover:text-[#e8d5a3] transition-colors">
              {t('Support the project', 'Soutenir le projet')}
            </a>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-10 rounded-2xl border border-[#c5a059]/25 bg-black/40 backdrop-blur-md overflow-hidden"
        >
          <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="p-10 md:p-12 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-[#c5a059]/15"
              style={{ background: 'radial-gradient(80% 80% at 50% 30%, rgba(201,168,90,0.08), transparent 75%)' }}>
              <span className="text-7xl mb-6" style={{ filter: 'drop-shadow(0 0 24px rgba(201,168,90,0.45))' }} aria-hidden>🎨</span>
              <h2 className="font-cinzel text-2xl text-[#e8d5a3]">{t('The Artwork Appraisal Tool', "L'Outil d'appréciation des œuvres")}</h2>
              <p className="text-xs text-neutral-400 mt-3 leading-relaxed max-w-[280px]">
                {t('Artist sheet & fair market value', 'Fiche d’artiste & juste valeur marchande')}
              </p>
            </div>
            <div className="p-10 md:p-12">
              <p className="text-neutral-300 leading-relaxed">
                {t(
                  'Upload a photo of your artwork, answer the dossier questions, and receive an indicative estimate of its fair market value. The tool builds your artist sheet and prepares the acquisition dossier, made also for businesses displaying original artwork in their place of business.',
                  "Téléversez une photo de votre œuvre, répondez aux questions du dossier, et recevez une estimation indicative de sa juste valeur marchande. L'outil monte votre fiche d'artiste et prépare le dossier d'acquisition, pensé aussi pour les entreprises qui exposent des œuvres originales dans leur lieu d'affaires.",
                )}
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <a href="https://appreciationdossier.netlify.app" target="_blank" rel="noopener noreferrer"
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#c5a059] via-[#e8d5a3] to-[#c5a059] text-[#171308] text-sm font-bold hover:shadow-[0_0_30px_rgba(197,160,89,0.35)] transition-shadow">
                  {t('Open the tool', "Ouvrir l'outil")}
                </a>
              </div>
              <p className="text-neutral-500 text-xs mt-6 leading-relaxed">
                {t(
                  'The estimate is indicative; the final amount is confirmed by our financial expert.',
                  "L'estimation est donnée à titre indicatif; le montant final est confirmé par notre expert financier.",
                )}
              </p>
            </div>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.45 }}
          className="mt-10 rounded-2xl border border-white/10 bg-black/25 p-10 text-center"
        >
          <p className="font-cinzel text-lg text-neutral-400">
            {t('Other tools are on their way to this shelf.', "D'autres outils s'en viennent sur cette étagère.")}
          </p>
        </motion.div>
      </main>
    </div>
  );
};
