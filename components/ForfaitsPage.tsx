import React from 'react';
import { motion } from 'framer-motion';
import { ProposalRequestForm } from './ProposalRequestForm';
import { Atmosphere, TopBar, HeroFramed, SectionLabel, EditorialRow, GoldButton, Glass } from './RetreatShared';

// Unlisted page at /forfaits: B2C packages for inn guests. Art-directed
// (2026-07-21) to the same cinematic language as /entreprises. First package:
// "Nuit & Table" (room + 3-course dinner on arrival + breakfast), sold as a
// Hostaway add-on.

interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
}

const GOLD = '#c5a059';
const CREAM = '#f3e5ab';

export const ForfaitsPage: React.FC<Props> = ({ onNavigate, language }) => {
  const fr = language === 'FR';
  const t = (en: string, frText: string) => (fr ? frText : en);

  const rows = [
    {
      img: '/media/Cuisine/Plating%20alexis%20ai%20(1).jpg',
      kicker: t('The dinner', 'Le souper'),
      title: t('Three courses, the evening you arrive', "Trois services, le soir de votre arrivée"),
      body: t(
        'Prepared on site by chef Marc Alexis Pepin. You settle into your room, and you are received at the table. No going back out.',
        "Préparé sur place par le chef Marc Alexis Pepin. Vous vous installez dans votre chambre, et vous êtes reçus à la table. Sans avoir à ressortir.",
      ),
    },
    {
      img: '/media/Auberge%20photos/machine%20barista%20main.jpg',
      kicker: t('The morning', 'Le matin'),
      title: t('Breakfast when you wake', 'Le déjeuner au réveil'),
      body: t(
        'Served the next morning, espresso from the barista machine. The day starts slow, exactly where you slept.',
        "Servi le lendemain matin, espresso à la machine barista. La journée commence en douceur, là où vous avez dormi.",
      ),
    },
    {
      img: '/media/inn/meditante-1.jpeg',
      kicker: t('The room', 'La chambre'),
      title: t('Any room becomes a table d\'hôte', "N'importe quelle chambre devient une table d'hôte"),
      body: t(
        'You choose the place, from the manor rooms to the yurt. We add the table. The whole stay stays under one roof.',
        "Vous choisissez le lieu, des chambres du manoir à la yourte. Nous ajoutons la table. Tout le séjour reste sous un même toit.",
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto text-neutral-200" style={{ background: '#0b0908' }}>
      <Atmosphere />
      <TopBar onBack={() => onNavigate('INN')} title={t('PACKAGES', 'FORFAITS')} back={t('The Inn', "L'Auberge")} />

      <HeroFramed
        img="/media/Auberge%20photos/salle%20a%20manger.jpg"
        kicker={t('Nuit & Table', 'Nuit & Table')}
        lead={t('Your room, and the', 'Votre chambre, et la')}
        accent={t("chef's table", "table d'hôte")}
        sub={t(
          'Add a three-course dinner the evening you arrive and breakfast the next morning. The inn becomes your table, without ever going out.',
          "Ajoutez un souper trois services le soir de votre arrivée et le déjeuner au réveil. L'auberge devient votre table, sans avoir à ressortir.",
        )}
      />

      <main className="relative">
        {/* I: what the package adds */}
        <section className="px-6 md:px-14 lg:px-24 py-24 md:py-32">
          <SectionLabel numeral="I" label={t('What the package adds', 'Ce que le forfait ajoute')} />
          <div className="space-y-20 md:space-y-32">
            {rows.map((r, i) => (
              <EditorialRow key={r.kicker} {...r} flip={i % 2 === 1} />
            ))}
          </div>
        </section>

        {/* II: price centerpiece */}
        <section className="px-4 md:px-14 lg:px-24 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          >
            <Glass className="px-6 md:px-12 py-16 md:py-20 text-center max-w-4xl mx-auto">
              <span className="font-cinzel uppercase block mb-8" style={{ fontSize: '11px', letterSpacing: '0.34em', color: GOLD }}>{t('The package', 'Le forfait')}</span>
              <div className="flex items-baseline justify-center gap-3 mb-8">
                <span className="font-prata leading-none" style={{ color: GOLD, fontSize: 'clamp(2.4rem, 6vw, 4.4rem)' }}>+</span>
                <span className="font-prata leading-none" style={{ color: CREAM, fontSize: 'clamp(4.4rem, 13vw, 9rem)' }}>120<span style={{ fontSize: '0.4em', color: GOLD }}> $</span></span>
                <span className="font-cormorant" style={{ color: 'rgba(255,250,240,0.55)', fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', fontWeight: 500 }}>{t('/ person', '/ personne')}</span>
              </div>
              <p className="font-cormorant mx-auto mb-12" style={{ color: 'rgba(255,250,240,0.72)', fontSize: 'clamp(1.1rem, 1.6vw, 1.3rem)', lineHeight: 1.6, maxWidth: '42ch', fontWeight: 500 }}>
                {t('Added to your room rate: three-course dinner and breakfast. Choose it when you book your stay.',
                  "En sus du tarif de votre chambre : souper trois services et déjeuner. Choisissez-le au moment de réserver votre séjour.")}
              </p>
              <GoldButton onClick={() => onNavigate('INN')}>{t('Book a room', 'Réserver une chambre')}</GoldButton>
            </Glass>
          </motion.div>
        </section>

        {/* III — special request */}
        <section className="px-6 md:px-14 lg:px-24 py-16 md:py-28">
          <SectionLabel numeral="II" label={t('A special request?', 'Une demande particulière ?')} />
          <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-center">
            <div className="md:col-span-5">
              <h2 className="font-prata" style={{ color: CREAM, fontSize: 'clamp(1.9rem, 3.6vw, 2.8rem)', lineHeight: 1.1 }}>
                {t('We shape it', 'On le prépare')}<br />
                <span style={{ color: GOLD }}>{t('with you.', 'avec vous.')}</span>
              </h2>
              <p className="font-cormorant mt-6" style={{ color: 'rgba(255,250,240,0.66)', fontSize: '1.25rem', lineHeight: 1.5, maxWidth: '34ch', fontWeight: 500 }}>
                {t('A diet, a celebration, a larger group? Write to us.', "Un régime, une célébration, un plus grand groupe ? Écrivez-nous.")}
              </p>
            </div>
            <div className="md:col-span-7">
              <Glass className="p-7 md:p-9">
                <ProposalRequestForm language={language} subject={t('Nuit & Table package', 'Forfait Nuit & Table')} showCompany={false} />
              </Glass>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
