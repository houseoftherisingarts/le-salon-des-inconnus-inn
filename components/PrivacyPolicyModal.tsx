
import React, { useState } from 'react';

interface PrivacyPolicyModalProps {
  language: 'EN' | 'FR';
  onClose: () => void;
}

const LAST_UPDATED = 'Avril 2026 / April 2026';
const PRIVACY_OFFICER = 'Alex T. St-Laurent';
const CONTACT_EMAIL = 'Alex@lesalondesinconnus.com';
const CONTACT_PHONE = '514 418-3450';
const ADDRESS = '321 Chemin de la Montagne, Namur (QC) J0V 1N0';

// ─── Section Component ───────────────────────────────────────────────────────

const Section: React.FC<{ num: string; title: string; children: React.ReactNode }> = ({ num, title, children }) => (
  <div className="mb-8">
    <h3 className="font-cinzel text-[#d4af37] text-sm uppercase tracking-widest mb-3">
      {num}. {title}
    </h3>
    <div className="text-neutral-400 text-sm font-lato leading-relaxed space-y-2">
      {children}
    </div>
  </div>
);

const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex gap-2"><span className="text-[#d4af37] mt-0.5 shrink-0">·</span><span>{children}</span></li>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ language, onClose }) => {
  const [lang, setLang] = useState<'EN' | 'FR'>(language);

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/90 backdrop-blur-md overflow-y-auto py-8 px-4">
      <div className="relative w-full max-w-2xl bg-[#0c0c0c] border border-[#d4af37]/25 shadow-2xl">

        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#d4af37]/50"></div>
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#d4af37]/50"></div>
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#d4af37]/50"></div>
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#d4af37]/50"></div>

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-[#0c0c0c]/95 backdrop-blur-sm border-b border-white/5 px-8 py-5 flex justify-between items-center">
          <div>
            <span className="text-[#d4af37] text-[10px] font-cinzel uppercase tracking-[0.5em]">
              Le Salon des Inconnus
            </span>
            <h2 className="font-cinzel text-white text-lg mt-0.5">
              {lang === 'FR' ? 'Politique de Confidentialité' : 'Privacy Policy'}
            </h2>
            <p className="text-neutral-600 text-[11px] font-lato mt-0.5">{LAST_UPDATED}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-[#1a1a1a] rounded border border-white/10">
              <button
                onClick={() => setLang('FR')}
                className={`px-3 py-1.5 text-[11px] font-cinzel transition-colors ${lang === 'FR' ? 'bg-[#d4af37] text-black' : 'text-neutral-500 hover:text-white'}`}
              >FR</button>
              <button
                onClick={() => setLang('EN')}
                className={`px-3 py-1.5 text-[11px] font-cinzel transition-colors ${lang === 'EN' ? 'bg-[#d4af37] text-black' : 'text-neutral-500 hover:text-white'}`}
              >EN</button>
            </div>
            <button onClick={onClose} className="text-neutral-500 hover:text-white text-2xl leading-none">×</button>
          </div>
        </div>

        <div className="px-8 py-8">
          {/* ── FRENCH ── */}
          {lang === 'FR' && (
            <>
              <p className="text-neutral-500 text-sm font-lato mb-8 italic">
                La présente politique de confidentialité est conforme à la Loi 25 (Loi modernisant des dispositions législatives en matière de protection des renseignements personnels, L.Q. 2021, c. 25), à la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) ainsi qu'aux obligations applicables aux entreprises québécoises.
              </p>

              <Section num="1" title="Responsable de la protection des renseignements personnels">
                <p>Le responsable de la protection des renseignements personnels est :</p>
                <div className="mt-2 pl-4 border-l border-[#d4af37]/30">
                  <p className="text-white">{PRIVACY_OFFICER}</p>
                  <p>Le Salon des Inconnus — Maison Favier</p>
                  <p>{ADDRESS}</p>
                  <p>{CONTACT_EMAIL} · {CONTACT_PHONE}</p>
                  <p className="text-neutral-600 text-xs mt-1">Disponible entre 10h et 19h</p>
                </div>
                <p className="mt-3">Toute demande relative à vos droits sur vos renseignements personnels doit être adressée à ce responsable.</p>
              </Section>

              <Section num="2" title="Renseignements collectés">
                <p>Nous collectons uniquement les renseignements nécessaires aux finalités décrites ci-dessous :</p>
                <ul className="mt-2 space-y-1.5">
                  <Li><strong className="text-neutral-300">Identité :</strong> nom, adresse courriel, numéro de téléphone (si vous utilisez la connexion par téléphone)</Li>
                  <Li><strong className="text-neutral-300">Profil :</strong> photo de profil (si connexion via Google), type d'appartenance choisi</Li>
                  <Li><strong className="text-neutral-300">Événements :</strong> équipe de woofing, choix d'hébergement, date d'arrivée lors de l'inscription à un événement</Li>
                  <Li><strong className="text-neutral-300">Données techniques :</strong> horodatage de création du compte (via Firebase)</Li>
                </ul>
                <p className="mt-3">Nous ne collectons pas de données de navigation, de cookies publicitaires ou de profilage comportemental.</p>
              </Section>

              <Section num="3" title="Finalités de la collecte">
                <ul className="space-y-1.5">
                  <Li>Créer et gérer votre Espace Membre</Li>
                  <Li>Vous inscrire à des événements communautaires (ex. Ceilidh de Mai)</Li>
                  <Li>Coordonner les équipes de woofing et les hébergements</Li>
                  <Li>Vous contacter au sujet des événements auxquels vous êtes inscrit(e)</Li>
                </ul>
                <p className="mt-3">Vos renseignements ne seront pas utilisés à des fins commerciales, de marketing ou de prospection sans consentement distinct.</p>
              </Section>

              <Section num="4" title="Base juridique du traitement">
                <p>Le traitement de vos renseignements personnels repose sur votre <strong className="text-neutral-300">consentement libre, éclairé, préalable et exprès</strong>, donné lors de la création de votre compte.</p>
                <p className="mt-2">Vous pouvez retirer votre consentement en tout temps en demandant la suppression de votre compte (voir section 7).</p>
              </Section>

              <Section num="5" title="Conservation des données">
                <p>Vos renseignements sont conservés pendant la durée active de votre appartenance et <strong className="text-neutral-300">12 mois après votre dernière activité</strong>, à moins que vous ne demandiez leur suppression avant ce délai.</p>
                <p className="mt-2">Les données d'inscription aux événements peuvent être conservées jusqu'à 24 mois après l'événement à des fins de coordination et de comptabilité.</p>
              </Section>

              <Section num="6" title="Accès et communication des renseignements">
                <p><strong className="text-neutral-300">Personnes ayant accès à vos données :</strong></p>
                <ul className="mt-2 space-y-1.5">
                  <Li>Vous-même</Li>
                  <Li>L'administrateur du site ({PRIVACY_OFFICER}), uniquement pour la coordination des événements</Li>
                  <Li><strong className="text-neutral-300">Google LLC / Firebase</strong> : fournisseur de services technologiques agissant à titre de sous-traitant. Firebase héberge votre compte et vos données sur des serveurs situés aux États-Unis.</Li>
                </ul>
                <p className="mt-3">
                  <strong className="text-neutral-300">Transferts hors Québec (art. 17 Loi 25) :</strong> vos renseignements sont traités par Firebase (Google LLC), dont les serveurs sont situés aux États-Unis. Google applique des clauses contractuelles types (Standard Contractual Clauses) conformes au Règlement général sur la protection des données (RGPD) de l'Union européenne, ce qui constitue un niveau de protection adéquat au sens de la Loi 25. Une évaluation des facteurs relatifs à la vie privée (EFVP) a été réalisée et est disponible sur demande.
                </p>
                <p className="mt-2">Vos renseignements ne sont jamais vendus à des tiers.</p>
              </Section>

              <Section num="7" title="Vos droits">
                <p>Conformément à la Loi 25 et à la LPRPDE, vous disposez des droits suivants :</p>
                <ul className="mt-2 space-y-1.5">
                  <Li><strong className="text-neutral-300">Accès :</strong> obtenir une copie de vos renseignements personnels</Li>
                  <Li><strong className="text-neutral-300">Rectification :</strong> corriger des renseignements inexacts ou incomplets</Li>
                  <Li><strong className="text-neutral-300">Suppression :</strong> demander la destruction de vos renseignements (droit à l'effacement)</Li>
                  <Li><strong className="text-neutral-300">Portabilité :</strong> recevoir vos données dans un format structuré et lisible</Li>
                  <Li><strong className="text-neutral-300">Retrait du consentement :</strong> retirer votre consentement en tout temps, sans préjudice</Li>
                  <Li><strong className="text-neutral-300">Opposition :</strong> vous opposer à certains traitements</Li>
                </ul>
                <p className="mt-3">
                  Pour exercer ces droits, contactez-nous à <strong className="text-[#d4af37]">{CONTACT_EMAIL}</strong>. Nous répondrons dans un délai de 30 jours.
                </p>
                <p className="mt-2">
                  Vous pouvez également déposer une plainte auprès de la <strong className="text-neutral-300">Commission d'accès à l'information du Québec (CAI)</strong> à <a href="https://www.cai.gouv.qc.ca" target="_blank" rel="noopener noreferrer" className="text-[#d4af37] hover:underline">cai.gouv.qc.ca</a> ou par téléphone au 1 888 528-7741.
                </p>
              </Section>

              <Section num="8" title="Témoins (cookies) et stockage local">
                <p><strong className="text-neutral-300">Stockage local (localStorage) :</strong> Firebase Authentication stocke un jeton de session dans le stockage local de votre navigateur pour maintenir votre connexion. Ce stockage est strictement nécessaire au fonctionnement de l'Espace Membre et n'est activé que si vous créez un compte.</p>
                <p className="mt-2"><strong className="text-neutral-300">Connexion via Google :</strong> si vous utilisez « Continuer avec Google », Google peut déposer des témoins soumis à la <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#d4af37] hover:underline">politique de confidentialité de Google</a>.</p>
                <p className="mt-2"><strong className="text-neutral-300">reCAPTCHA (connexion par téléphone) :</strong> si vous utilisez la connexion par numéro de téléphone, Google reCAPTCHA vérifie que vous n'êtes pas un robot. Ce service utilise des témoins de Google.</p>
                <p className="mt-2">Nous n'utilisons ni cookies publicitaires, ni traceurs tiers de marketing, ni réseaux sociaux intégrés.</p>
              </Section>

              <Section num="9" title="Incidents de confidentialité">
                <p>En cas d'incident de confidentialité affectant vos renseignements personnels, nous vous notifierons ainsi que la Commission d'accès à l'information du Québec dans les délais prévus par la Loi 25, si l'incident présente un risque de préjudice sérieux.</p>
              </Section>

              <Section num="10" title="Modifications de la politique">
                <p>Cette politique peut être modifiée. La date de la dernière mise à jour est indiquée en haut du document. En cas de modification substantielle, nous vous informerons lors de votre prochaine connexion.</p>
              </Section>
            </>
          )}

          {/* ── ENGLISH ── */}
          {lang === 'EN' && (
            <>
              <p className="text-neutral-500 text-sm font-lato mb-8 italic">
                This privacy policy complies with Quebec's Law 25 (An Act to modernize legislative provisions as regards the protection of personal information, S.Q. 2021, c. 25), the Personal Information Protection and Electronic Documents Act (PIPEDA), and applicable obligations for Quebec businesses.
              </p>

              <Section num="1" title="Privacy Officer">
                <p>Our privacy officer is:</p>
                <div className="mt-2 pl-4 border-l border-[#d4af37]/30">
                  <p className="text-white">{PRIVACY_OFFICER}</p>
                  <p>Le Salon des Inconnus — Maison Favier</p>
                  <p>{ADDRESS}</p>
                  <p>{CONTACT_EMAIL} · {CONTACT_PHONE}</p>
                  <p className="text-neutral-600 text-xs mt-1">Available between 10 AM and 7 PM</p>
                </div>
                <p className="mt-3">All requests regarding your rights over your personal information should be directed to the privacy officer.</p>
              </Section>

              <Section num="2" title="Information We Collect">
                <p>We collect only the information necessary for the purposes described below:</p>
                <ul className="mt-2 space-y-1.5">
                  <Li><strong className="text-neutral-300">Identity:</strong> name, email address, phone number (if you use phone sign-in)</Li>
                  <Li><strong className="text-neutral-300">Profile:</strong> profile photo (if signing in with Google), chosen membership type</Li>
                  <Li><strong className="text-neutral-300">Events:</strong> woofing team, accommodation choice, arrival date when registering for an event</Li>
                  <Li><strong className="text-neutral-300">Technical:</strong> account creation timestamp (via Firebase)</Li>
                </ul>
                <p className="mt-3">We do not collect browsing data, advertising cookies, or behavioral profiling data.</p>
              </Section>

              <Section num="3" title="Purposes of Collection">
                <ul className="space-y-1.5">
                  <Li>Creating and managing your Member Space</Li>
                  <Li>Registering you for community events (e.g. Grand Ceilidh de Mai)</Li>
                  <Li>Coordinating woofing teams and lodging assignments</Li>
                  <Li>Contacting you about events you are registered for</Li>
                </ul>
                <p className="mt-3">Your information will not be used for commercial, marketing, or prospecting purposes without a separate consent.</p>
              </Section>

              <Section num="4" title="Legal Basis for Processing">
                <p>Processing of your personal information is based on your <strong className="text-neutral-300">free, informed, prior, and explicit consent</strong>, given when you create your account.</p>
                <p className="mt-2">You may withdraw your consent at any time by requesting account deletion (see section 7).</p>
              </Section>

              <Section num="5" title="Data Retention">
                <p>Your information is retained for the duration of your active membership and <strong className="text-neutral-300">12 months after your last activity</strong>, unless you request deletion earlier.</p>
                <p className="mt-2">Event registration data may be retained for up to 24 months after the event for coordination and accounting purposes.</p>
              </Section>

              <Section num="6" title="Access and Disclosure">
                <p><strong className="text-neutral-300">Who has access to your data:</strong></p>
                <ul className="mt-2 space-y-1.5">
                  <Li>You</Li>
                  <Li>The site administrator ({PRIVACY_OFFICER}), solely for event coordination</Li>
                  <Li><strong className="text-neutral-300">Google LLC / Firebase:</strong> technology service provider acting as a data processor. Firebase hosts your account and data on servers located in the United States.</Li>
                </ul>
                <p className="mt-3">
                  <strong className="text-neutral-300">Cross-border transfers (Law 25, s. 17):</strong> your information is processed by Firebase (Google LLC), whose servers are located in the United States. Google applies Standard Contractual Clauses compliant with the EU General Data Protection Regulation (GDPR), which constitutes adequate protection under Law 25. A Privacy Impact Assessment (PIA) has been conducted and is available on request.
                </p>
                <p className="mt-2">Your information is never sold to third parties.</p>
              </Section>

              <Section num="7" title="Your Rights">
                <p>Under Law 25 and PIPEDA, you have the following rights:</p>
                <ul className="mt-2 space-y-1.5">
                  <Li><strong className="text-neutral-300">Access:</strong> obtain a copy of your personal information</Li>
                  <Li><strong className="text-neutral-300">Correction:</strong> correct inaccurate or incomplete information</Li>
                  <Li><strong className="text-neutral-300">Deletion:</strong> request the destruction of your information (right to erasure)</Li>
                  <Li><strong className="text-neutral-300">Portability:</strong> receive your data in a structured, machine-readable format</Li>
                  <Li><strong className="text-neutral-300">Withdrawal of consent:</strong> withdraw consent at any time without prejudice</Li>
                  <Li><strong className="text-neutral-300">Objection:</strong> object to certain types of processing</Li>
                </ul>
                <p className="mt-3">
                  To exercise these rights, contact us at <strong className="text-[#d4af37]">{CONTACT_EMAIL}</strong>. We will respond within 30 days.
                </p>
                <p className="mt-2">
                  You may also file a complaint with the <strong className="text-neutral-300">Commission d'accès à l'information du Québec (CAI)</strong> at <a href="https://www.cai.gouv.qc.ca" target="_blank" rel="noopener noreferrer" className="text-[#d4af37] hover:underline">cai.gouv.qc.ca</a> or by phone at 1 888 528-7741.
                </p>
              </Section>

              <Section num="8" title="Cookies and Local Storage">
                <p><strong className="text-neutral-300">Local storage:</strong> Firebase Authentication stores a session token in your browser's local storage to keep you signed in. This is strictly necessary for the Member Space to function and is only activated if you create an account.</p>
                <p className="mt-2"><strong className="text-neutral-300">Sign in with Google:</strong> if you use "Continue with Google," Google may set cookies governed by <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#d4af37] hover:underline">Google's Privacy Policy</a>.</p>
                <p className="mt-2"><strong className="text-neutral-300">reCAPTCHA (phone sign-in):</strong> if you use phone number sign-in, Google reCAPTCHA verifies that you are not a robot. This service uses Google cookies.</p>
                <p className="mt-2">We do not use advertising cookies, third-party marketing trackers, or embedded social media widgets.</p>
              </Section>

              <Section num="9" title="Privacy Incidents">
                <p>In the event of a privacy incident affecting your personal information, we will notify you and the Commission d'accès à l'information du Québec within the timelines required by Law 25, if the incident presents a risk of serious harm.</p>
              </Section>

              <Section num="10" title="Changes to This Policy">
                <p>This policy may be updated. The date of the last update is shown at the top of the document. In the event of a material change, we will inform you at your next sign-in.</p>
              </Section>
            </>
          )}

          {/* Close button */}
          <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center">
            <p className="text-neutral-700 text-xs font-lato">
              © 2026 Le Salon des Inconnus — Maison Favier, Namur QC
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-[#d4af37]/40 text-[#d4af37] font-cinzel text-xs uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all duration-300"
            >
              {lang === 'FR' ? 'Fermer' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
