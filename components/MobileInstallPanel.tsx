import React from 'react';

// Panneau d'installation mobile partagé (/tools et /coffre) : les gestes
// iPhone et Android directement dans la page, plus de détour par une page
// externe. Même verre noir chaud et or que le reste du site.
interface Props {
  t: (en: string, fr: string, es: string) => string;
  appUrl: string;
  apkUrl?: string;
}

const STEP = 'flex gap-3 items-start text-sm text-neutral-300 leading-relaxed';
// (voir DownloadPage pour l'emblème doré de l'outil d'appréciation)
const NUM =
  'shrink-0 w-6 h-6 rounded-full border border-[#c5a059]/50 text-[#e8d5a3] text-xs flex items-center justify-center font-semibold mt-0.5';

export const MobileInstallPanel: React.FC<Props> = ({ t, appUrl, apkUrl }) => (
  <div className="mt-6 rounded-[15px] border border-[#c5a059]/20 bg-black/30 backdrop-blur-md p-7 md:p-9 text-left">
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h3 className="font-cinzel text-lg text-[#e8d5a3] mb-4">iPhone · iPad</h3>
        <div className="space-y-3">
          <p className={STEP}>
            <span className={NUM}>1</span>
            <span>{t('Open the app in Safari with the gold button below.', "Ouvrez l'app dans Safari avec le bouton doré ci-dessous.", 'Abra la app en Safari con el botón dorado de abajo.')}</span>
          </p>
          <p className={STEP}>
            <span className={NUM}>2</span>
            <span>{t('Tap Share', 'Touchez Partager', 'Toque Compartir')} <span aria-hidden>(⬆︎)</span>{t(', then "Add to Home Screen".', ', puis « Sur l’écran d’accueil ».', ', luego «Agregar a inicio».')}</span>
          </p>
          <p className={STEP}>
            <span className={NUM}>3</span>
            <span>{t('The Coffre lives on your home screen, even offline.', "Le Coffre vit sur votre écran d'accueil, même hors ligne.", 'Le Coffre vive en su pantalla de inicio, incluso sin conexión.')}</span>
          </p>
        </div>
      </div>
      <div>
        <h3 className="font-cinzel text-lg text-[#e8d5a3] mb-4">Android</h3>
        <div className="space-y-3">
          <p className={STEP}>
            <span className={NUM}>1</span>
            <span>{t('Open the app in Chrome with the gold button below.', "Ouvrez l'app dans Chrome avec le bouton doré ci-dessous.", 'Abra la app en Chrome con el botón dorado de abajo.')}</span>
          </p>
          <p className={STEP}>
            <span className={NUM}>2</span>
            <span>{t('Menu (⋮), then "Install app".', 'Menu (⋮), puis « Installer l’application ».', 'Menú (⋮), luego «Instalar aplicación».')}</span>
          </p>
          <p className={STEP}>
            <span className={NUM}>3</span>
            <span>{t('It installs like a real app, icon and all.', "Elle s'installe comme une vraie app, icône comprise.", 'Se instala como una app de verdad, con su ícono.')}</span>
          </p>
          {apkUrl && (
            <p className="text-xs text-neutral-500 pt-1">
              {t('Prefer a direct package?', 'Vous préférez le paquet direct ?', '¿Prefiere el paquete directo?')}{' '}
              <a href={apkUrl} className="text-[#c5a059] underline decoration-dotted underline-offset-4 hover:text-[#e8d5a3] transition-colors">
                {t('Download the APK', "Télécharger l'APK", 'Descargar el APK')}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
    <div className="mt-8 pt-6 border-t border-[#c5a059]/15 flex flex-wrap items-center gap-4">
      <a
        href={appUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-3 rounded-full bg-gradient-to-r from-[#c5a059] via-[#e8d5a3] to-[#c5a059] text-[#171308] text-sm font-bold hover:shadow-[0_0_30px_rgba(197,160,89,0.35)] transition-shadow"
      >
        {t('Open the app', "Ouvrir l'app", 'Abrir la app')}
      </a>
      <p className="text-xs text-neutral-500 leading-relaxed">
        {t('No store, no account: everything stays on your device.', 'Sans magasin d’applications, sans compte : tout reste sur votre appareil.', 'Sin tienda de aplicaciones, sin cuenta: todo queda en su dispositivo.')}
      </p>
    </div>
  </div>
);
