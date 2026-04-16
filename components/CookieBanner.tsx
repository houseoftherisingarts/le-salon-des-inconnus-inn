
import React, { useState, useEffect } from 'react';

// ─── Storage key ─────────────────────────────────────────────────────────────

const CONSENT_KEY = 'sdl_privacy_consent';
const CONSENT_VERSION = '1'; // bump when policy changes to re-prompt

export type ConsentLevel = 'all' | 'essential';

export function getStoredConsent(): ConsentLevel | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return null; // policy changed
    return parsed.level as ConsentLevel;
  } catch {
    return null;
  }
}

function storeConsent(level: ConsentLevel) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ level, version: CONSENT_VERSION, date: new Date().toISOString() }));
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CookieBannerProps {
  language: 'EN' | 'FR';
  onShowPrivacy: () => void;
  onConsentChange: (level: ConsentLevel) => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ language, onShowPrivacy, onConsentChange }) => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const existing = getStoredConsent();
    if (existing) {
      onConsentChange(existing);
    } else {
      // Small delay so it doesn't flash before the loading screen clears
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  const t = (en: string, fr: string) => language === 'FR' ? fr : en;

  const accept = (level: ConsentLevel) => {
    storeConsent(level);
    onConsentChange(level);
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[250] animate-slideUp"
      role="dialog"
      aria-modal="false"
      aria-label={t('Privacy consent', 'Consentement à la vie privée')}
    >
      {/* Backdrop gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 to-transparent pointer-events-none" style={{ top: '-60px' }}></div>

      <div className="relative bg-[#0d0d0d] border-t border-[#d4af37]/20">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex flex-col md:flex-row gap-4 md:items-start">

            {/* Icon + text */}
            <div className="flex gap-3 flex-1">
              <span className="text-[#d4af37] text-lg shrink-0 mt-0.5">🔐</span>
              <div>
                <p className="text-white font-cinzel text-sm mb-1">
                  {t('Your Privacy', 'Votre Vie Privée')}
                </p>
                <p className="text-neutral-400 text-xs font-lato leading-relaxed">
                  {t(
                    'This site uses Firebase Authentication to manage your Member Space. If you sign in with Google or by phone, Google may set cookies. We do not use advertising trackers.',
                    'Ce site utilise Firebase Authentication pour gérer votre Espace Membre. Si vous vous connectez via Google ou par téléphone, Google peut déposer des témoins. Nous n\'utilisons pas de traceurs publicitaires.',
                  )}
                  {' '}
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-[#d4af37] hover:underline"
                  >
                    {showDetails ? t('Less', 'Moins') : t('Learn more', 'En savoir plus')}
                  </button>
                  {' · '}
                  <button onClick={onShowPrivacy} className="text-[#d4af37] hover:underline">
                    {t('Privacy Policy', 'Politique de confidentialité')}
                  </button>
                </p>

                {showDetails && (
                  <div className="mt-3 space-y-2 text-xs font-lato text-neutral-500 border-l border-[#d4af37]/20 pl-3">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5 shrink-0">●</span>
                      <div>
                        <span className="text-neutral-300">
                          {t('Strictly necessary', 'Strictement nécessaire')}
                        </span>{' '}
                        — {t(
                          'Firebase Auth session (localStorage). Active only if you create an account. Always on.',
                          'Session Firebase Auth (localStorage). Actif uniquement si vous créez un compte. Toujours actif.',
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5 shrink-0">●</span>
                      <div>
                        <span className="text-neutral-300">
                          {t('Third-party (Google)', 'Tiers (Google)')}
                        </span>{' '}
                        — {t(
                          'Google OAuth cookies (Sign in with Google) and reCAPTCHA (phone sign-in). Governed by Google\'s Privacy Policy.',
                          'Cookies OAuth de Google (connexion via Google) et reCAPTCHA (connexion téléphonique). Régis par la politique de confidentialité de Google.',
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-neutral-600 mt-0.5 shrink-0">●</span>
                      <div>
                        <span className="text-neutral-300">
                          {t('Analytics', 'Analytique')}
                        </span>{' '}
                        — {t('Currently disabled. Not collected.', 'Désactivé actuellement. Non collecté.')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => accept('essential')}
                className="px-5 py-2.5 border border-white/15 text-neutral-400 hover:border-white/40 hover:text-white font-cinzel text-xs uppercase tracking-wider transition-all duration-200 whitespace-nowrap"
              >
                {t('Essential Only', 'Essentiel Seulement')}
              </button>
              <button
                onClick={() => accept('all')}
                className="px-5 py-2.5 bg-[#d4af37] text-black font-cinzel text-xs font-bold uppercase tracking-wider hover:bg-[#f3e5ab] transition-all duration-200 whitespace-nowrap"
              >
                {t('Accept & Continue', 'Accepter & Continuer')}
              </button>
            </div>

          </div>

          {/* Law reference */}
          <p className="text-neutral-700 text-[10px] font-lato mt-3 text-right">
            {t(
              'Compliant with Quebec Law 25 (L.Q. 2021, c. 25) and PIPEDA.',
              'Conforme à la Loi 25 du Québec (L.Q. 2021, c. 25) et à la LPRPDE.',
            )}
          </p>
        </div>
      </div>

      <style>{`
        .animate-slideUp {
          animation: slideUpBanner 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideUpBanner {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
