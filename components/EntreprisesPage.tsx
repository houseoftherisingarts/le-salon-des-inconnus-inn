import React from 'react';
import { motion } from 'framer-motion';
import { ProposalRequestForm } from './ProposalRequestForm';
import { Atmosphere, TopBar, HeroFramed, SectionLabel, EditorialRow } from './RetreatShared';

// Unlisted page at /entreprises — B2B pitch for exclusive corporate retreats.
// Art-directed (2026-07-21): cinematic framed hero, editorial rows on real
// estate imagery, oversized price treatment, working lead form.

interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
}

const GOLD = '#c5a059';
const CREAM = '#f3e5ab';

export const EntreprisesPage: React.FC<Props> = ({ onNavigate, language }) => {
  const fr = language === 'FR';
  const t = (en: string, frText: string) => (fr ? frText : en);

  const rows = [
    {
      img: '/media/Cuisine/alexis%20chef.jpg',
      kicker: t('The chef', 'La table du chef'),
      title: t('A table that marks the day', "Une table qui marque la journée"),
      body: t(
        'Portuguese bistronomy and molecular cuisine by chef Marc Alexis Pepin. A table d\'hôte built to make a team day memorable, not simply feed it.',
        "Bistronomie portugaise et cuisine moléculaire du chef Marc Alexis Pepin. Une table d'hôte pensée pour marquer une journée d'équipe, pas simplement la nourrir.",
      ),
    },
    {
      img: '/media/Auberge%20photos/biblio.jpg',
      kicker: t('The work room', 'La salle de travail'),
      title: t('Think in a room with soul', 'Réfléchir dans une pièce qui a une âme'),
      body: t(
        'The manor library or dining hall becomes your room for the day: wood, light, and quiet, a world away from the hotel conference floor.',
        "La bibliothèque ou la salle à manger du manoir devient votre pièce pour la journée : le bois, la lumière, le calme, à mille lieues de la salle de conférence d'hôtel.",
      ),
    },
    {
      img: '/media/Auberge%20photos/jacuzzi%20ouvert%20ete.jpg',
      kicker: t('Spa & reiki', 'Spa et reiki'),
      title: t('Clear the shoulders', 'Vider les épaules'),
      body: t(
        'Andrée Dancause receives on site, spa and hot tub at hand. Enough to loosen a team before the evening even begins.',
        "Andrée Dancause reçoit sur place, spa et jacuzzi à disposition. De quoi dénouer une équipe avant même que la soirée commence.",
      ),
    },
    {
      img: '/media/inn/amphiteatre%20banana.jpg',
      kicker: t('Staged evenings', 'Soirées mises en scène'),
      title: t('An evening built for your group', 'Une soirée construite pour votre groupe'),
      body: t(
        'With PPS Canada: beach party, golf tournament, kermesse, live music, comedy. Under the trees, in the outdoor amphitheatre.',
        "En partenariat avec PPS Canada : beach party, tournoi golf, kermesse, musique live, humour. Sous les arbres, dans l'amphithéâtre extérieur.",
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto text-neutral-200" style={{ background: '#0b0908' }}>
      <Atmosphere />
      <TopBar onBack={() => onNavigate('INN')} title={t("CORPORATE RETREATS", "RETRAITES D'ENTREPRISE")} back={t('The Inn', "L'Auberge")} />

      <HeroFramed
        img="/media/Financement%20Artistique/centered%20copy.jpg"
        kicker={t('A private estate · Outaouais', 'Un domaine privé · Outaouais')}
        lead={t('Team building with', 'Le team building qui a du')}
        accent={t('character', 'caractère')}
        sub={t(
          'A classic manor domain less than an hour from Ottawa, for teams who want the alternative to the golf club.',
          "Un domaine classique de moins d'une heure d'Ottawa, pour les équipes qui cherchent l'alternative au club de golf.",
        )}
      />

      <main className="relative">
        {/* I — what the house offers */}
        <section className="px-6 md:px-14 lg:px-24 py-24 md:py-32">
          <SectionLabel numeral="I" label={t('What the house offers', 'Ce que la maison offre')} />
          <div className="space-y-20 md:space-y-32">
            {rows.map((r, i) => (
              <EditorialRow key={r.kicker} {...r} flip={i % 2 === 1} />
            ))}
          </div>
        </section>

        {/* II — two tiers, price as centerpiece */}
        <section className="px-6 md:px-14 lg:px-24 py-24 md:py-32 border-t" style={{ borderColor: 'rgba(197,160,89,0.15)' }}>
          <SectionLabel numeral="II" label={t('Two ways to gather', 'Deux façons de vous réunir')} />
          <div className="grid md:grid-cols-2 gap-16 md:gap-8">
            {[
              {
                name: t('The Manor, to yourselves', 'Le Manoir, à vous seuls'),
                body: t('The 1898 Victorian manor privatized, up to 20 people: a light-filled work room, the spa, the trails, the outdoor amphitheatre.',
                  "Le Manoir victorien de 1898 privatisé, jusqu'à 20 personnes : la salle de travail, le spa, les sentiers, l'amphithéâtre extérieur."),
                num: '1 600', unit: t('/ night', '/ nuit'),
              },
              {
                name: t('The whole estate', 'Le domaine complet'),
                body: t('Up to 35 people housed on site, a full privatized day with the chef, the spa, the staged evening. Built around you.',
                  "Jusqu'à 35 personnes logées sur place, une journée privatisée complète avec le chef, le spa, la soirée mise en scène. Construite autour de vous."),
                num: '2 500', unit: t('and up', 'et plus'),
              },
            ].map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
                className={i === 1 ? 'md:pl-16 md:border-l' : 'md:pr-16'}
                style={i === 1 ? { borderColor: 'rgba(197,160,89,0.15)' } : undefined}
              >
                <h3 className="font-prata mb-5" style={{ color: CREAM, fontSize: 'clamp(1.5rem, 2.6vw, 2.1rem)' }}>{tier.name}</h3>
                <p className="font-cormorant mb-10" style={{ color: 'rgba(255,252,244,0.7)', fontSize: 'clamp(1.08rem, 1.5vw, 1.24rem)', lineHeight: 1.6, maxWidth: '42ch' }}>{tier.body}</p>
                <div className="flex items-baseline gap-3">
                  <span className="font-cinzel" style={{ color: GOLD, fontSize: '1.1rem' }}>{fr ? 'dès' : 'from'}</span>
                  <span className="font-prata leading-none" style={{ color: CREAM, fontSize: 'clamp(3.4rem, 8vw, 6rem)' }}>{tier.num}<span style={{ fontSize: '0.42em', color: GOLD }}> $</span></span>
                  <span className="font-cormorant italic" style={{ color: 'rgba(255,252,244,0.55)', fontSize: '1.15rem' }}>{tier.unit}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* III — inquiry */}
        <section className="px-6 md:px-14 lg:px-24 py-24 md:py-32 border-t" style={{ borderColor: 'rgba(197,160,89,0.15)' }}>
          <SectionLabel numeral="III" label={t('Request a proposal', 'Demander une soumission')} />
          <div className="grid md:grid-cols-12 gap-10 md:gap-16">
            <div className="md:col-span-5">
              <h2 className="font-prata" style={{ color: CREAM, fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1.05 }}>
                {t('Tell us about', 'Parlez-nous de')}<br />
                <span className="font-cormorant italic" style={{ color: GOLD }}>{t('your team.', 'votre équipe.')}</span>
              </h2>
              <p className="font-cormorant italic mt-6" style={{ color: 'rgba(255,252,244,0.62)', fontSize: '1.25rem', lineHeight: 1.5, maxWidth: '34ch' }}>
                {t('One message, and we shape the day with you.', 'Un message, et nous dessinons la journée avec vous.')}
              </p>
              <p className="font-cormorant mt-10" style={{ color: 'rgba(255,252,244,0.5)', fontSize: '1.05rem' }}>
                {t('Prefer to call? ', 'Vous préférez appeler ? ')}
                <a href="tel:+15144183450" className="rs-link" style={{ color: GOLD }}>514 418-3450</a>
              </p>
            </div>
            <div className="md:col-span-7">
              <ProposalRequestForm language={language} subject={t('Corporate retreat', "Retraite d'entreprise")} showCompany />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
