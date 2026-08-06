import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProposalRequestForm } from './ProposalRequestForm';
import { Atmosphere, TopBar, HeroFramed, SectionLabel, EditorialRow, GoldButton, Glass } from './RetreatShared';
import { getOptimizedUrl } from '../utils/imageOptimizer';
import { CATALOGUE, CATALOGUE_BATCH, type Artwork } from '../data/catalogue';

// Page non listée à /catalogue : catalogue de prévente des œuvres accrochées
// dans la maison, envoyé aux invités avant leur arrivée. Même langage cinéma
// que /entreprises et /forfaits (RetreatShared). CACHÉE tant que les photos
// des œuvres ne sont pas prises : aucun lien de nav, noindex.
//
// Poids-réseau : vignettes à 640 dans la grille, 1920 seulement au clic.

interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
}

const GOLD = '#d9b45c';
const CREAM = '#f6ead0';

const formatPrice = (price: number | null, fr: boolean): string => {
  if (price === null) return fr ? 'Sur demande' : 'On request';
  return fr
    ? `${price.toLocaleString('fr-CA')} $`
    : `$${price.toLocaleString('en-CA')}`;
};

/** Cadre d'attente affiché tant que l'œuvre n'a pas de photo. */
const AwaitingFrame: React.FC<{ label: string }> = ({ label }) => (
  <div
    className="w-full h-full grid place-items-center"
    style={{
      background: 'linear-gradient(150deg, rgba(40,31,22,0.75) 0%, rgba(20,15,11,0.9) 100%)',
    }}
  >
    <div className="text-center px-6">
      <span
        className="block mx-auto mb-4 rounded-full"
        style={{ width: '34px', height: '34px', border: `1px solid rgba(217,180,92,0.35)` }}
      />
      <span
        className="font-cinzel uppercase"
        style={{ fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(217,180,92,0.6)' }}
      >
        {label}
      </span>
    </div>
  </div>
);

const ArtworkCard: React.FC<{
  work: Artwork;
  fr: boolean;
  onOpen: (w: Artwork) => void;
}> = ({ work, fr, onOpen }) => {
  const sold = work.status === 'sold';
  const reserved = work.status === 'reserved';
  const clickable = Boolean(work.img);

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        type="button"
        onClick={() => clickable && onOpen(work)}
        disabled={!clickable}
        className="rs-imgwrap relative block w-full overflow-hidden rounded-[18px] disabled:cursor-default"
        style={{
          aspectRatio: '4 / 5',
          boxShadow: '0 30px 70px -34px rgba(0,0,0,0.85)',
          border: '1px solid rgba(217,180,92,0.14)',
        }}
        aria-label={clickable ? `${work.title}, ${work.artist}` : undefined}
      >
        {work.img ? (
          <img
            src={getOptimizedUrl(work.img, 640)}
            alt={`${work.title}, ${work.artist}`}
            loading="lazy"
            className="rs-img w-full h-full object-cover"
          />
        ) : (
          <AwaitingFrame label={fr ? 'Photo à venir' : 'Photo to come'} />
        )}

        {(sold || reserved) && (
          <span
            className="absolute top-3 right-3 rs-pill font-cinzel uppercase px-3 py-1.5 rounded-full"
            style={{ fontSize: '9px', letterSpacing: '0.22em', color: CREAM }}
          >
            {sold ? (fr ? 'Vendue' : 'Sold') : fr ? 'Réservée' : 'Reserved'}
          </span>
        )}
      </button>

      <div className="pt-5">
        <h3 className="font-prata" style={{ color: CREAM, fontSize: 'clamp(1.15rem, 1.7vw, 1.4rem)', lineHeight: 1.2 }}>
          {work.title}
        </h3>
        <span
          className="font-cinzel uppercase block mt-2"
          style={{ fontSize: '10px', letterSpacing: '0.26em', color: GOLD }}
        >
          {work.artist}
        </span>
        <p
          className="font-cormorant mt-3"
          style={{ color: 'rgba(255,250,240,0.62)', fontSize: '1.02rem', lineHeight: 1.45, fontWeight: 500 }}
        >
          {work.medium} · {work.dimensions}
          <br />
          {work.location}
        </p>
        <span
          className="font-prata block mt-3"
          style={{ color: sold ? 'rgba(255,250,240,0.35)' : GOLD, fontSize: '1.1rem' }}
        >
          {sold ? (fr ? 'Vendue' : 'Sold') : formatPrice(work.price, fr)}
        </span>
      </div>
    </motion.article>
  );
};

/** Vue plein écran : la seule fois où l'image 1920 est chargée. */
const Lightbox: React.FC<{ work: Artwork; fr: boolean; onClose: () => void }> = ({ work, fr, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.35 }}
    className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10"
    style={{ background: 'rgba(6,4,3,0.94)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-label={work.title}
  >
    <button
      onClick={onClose}
      className="rs-pill fixed top-5 right-5 font-cinzel uppercase text-[11px] tracking-[0.26em] px-5 py-2.5 rounded-full z-10"
      style={{ color: CREAM }}
    >
      {fr ? 'Fermer' : 'Close'}
    </button>

    <div className="max-w-6xl w-full grid md:grid-cols-12 gap-8 md:gap-12 items-center" onClick={(e) => e.stopPropagation()}>
      <div className="md:col-span-8">
        {work.img && (
          <img
            src={getOptimizedUrl(work.img, 1920)}
            alt={`${work.title}, ${work.artist}`}
            className="w-full max-h-[78vh] object-contain rounded-[18px]"
            style={{ boxShadow: '0 40px 100px -30px rgba(0,0,0,0.9)' }}
          />
        )}
      </div>
      <div className="md:col-span-4">
        <span className="font-cinzel uppercase block mb-4" style={{ fontSize: '10px', letterSpacing: '0.3em', color: GOLD }}>
          {work.artist}
        </span>
        <h2 className="font-prata mb-5" style={{ color: CREAM, fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', lineHeight: 1.12 }}>
          {work.title}
        </h2>
        <p className="font-cormorant mb-6" style={{ color: 'rgba(255,250,240,0.74)', fontSize: '1.15rem', lineHeight: 1.6, fontWeight: 500 }}>
          {work.note}
        </p>
        <p className="font-cormorant" style={{ color: 'rgba(255,250,240,0.55)', fontSize: '1.02rem', lineHeight: 1.5, fontWeight: 500 }}>
          {work.medium} · {work.dimensions}
          <br />
          {work.location}
        </p>
        <span className="font-prata block mt-5" style={{ color: GOLD, fontSize: '1.5rem' }}>
          {formatPrice(work.price, fr)}
        </span>
      </div>
    </div>
  </motion.div>
);

export const CataloguePage: React.FC<Props> = ({ onNavigate, language }) => {
  const fr = language === 'FR';
  const t = (en: string, frText: string) => (fr ? frText : en);

  const [shown, setShown] = useState(CATALOGUE_BATCH);
  const [open, setOpen] = useState<Artwork | null>(null);

  const closeLightbox = useCallback(() => setOpen(null), []);

  const rows = [
    {
      img: '/media/Auberge%20photos/biblio.jpg',
      kicker: t('The house', 'La maison'),
      title: t('Everything on these walls is someone', "Tout ce qui est accroché ici est de quelqu'un"),
      body: t(
        'The manor is not decorated with prints bought by the metre. Every canvas, every photograph, every piece of pottery came from an artist we know, and most of them can leave with you.',
        "Le manoir n'est pas décoré d'affiches achetées au mètre. Chaque toile, chaque photographie, chaque pièce de grès vient d'un artiste que nous connaissons, et la plupart peuvent repartir avec vous.",
      ),
    },
    {
      img: '/media/inn/bureau-shire.jpg',
      kicker: t('The artists', 'Les artistes'),
      title: t('We represent them, we do not resell them', 'Nous les représentons, nous ne les revendons pas'),
      body: t(
        'The artists shown here are part of the house. They come, they work, they hang what they make. Buying a piece supports the person who made it, and it keeps the walls alive for the next guest.',
        "Les artistes présentés ici font partie de la maison. Ils viennent, ils travaillent, ils accrochent ce qu'ils font. Acheter une pièce soutient la personne qui l'a faite, et garde les murs vivants pour le prochain invité.",
      ),
    },
    {
      img: '/media/Financement%20Artistique/centered%20copy.jpg',
      kicker: t('Your stay', 'Votre séjour'),
      title: t('Look first, in the room where it hangs', "Regardez d'abord, dans la pièce où elle est accrochée"),
      body: t(
        'A screen tells you very little about a painting. Read the catalogue before you come, then find the piece during your stay, in the light it was hung in. Decide after that.',
        "Un écran dit très peu d'une toile. Parcourez le catalogue avant de venir, puis retrouvez la pièce pendant votre séjour, dans la lumière où elle a été accrochée. Décidez ensuite.",
      ),
    },
  ];

  const steps = [
    {
      numeral: 'I',
      title: t('You receive the catalogue', 'Vous recevez le catalogue'),
      body: t(
        'A few days before you arrive, with what is currently hanging and what has just come in.',
        "Quelques jours avant votre arrivée, avec ce qui est accroché en ce moment et ce qui vient d'entrer.",
      ),
    },
    {
      numeral: 'II',
      title: t('You see the work in person', "Vous voyez l'œuvre en vrai"),
      body: t(
        'Each entry says which room it hangs in. Take the time during your stay, nobody will follow you around.',
        "Chaque fiche indique dans quelle pièce elle est accrochée. Prenez le temps pendant votre séjour, personne ne vous suivra.",
      ),
    },
    {
      numeral: 'III',
      title: t('You take it home, or we ship it', "Vous la rapportez, ou nous l'expédions"),
      body: t(
        'Paid on site or before you leave. Small pieces travel with you. Larger ones are packed and shipped at cost.',
        "Réglée sur place ou avant votre départ. Les petites pièces voyagent avec vous. Les grandes sont emballées et expédiées au coût.",
      ),
    },
  ];

  const visible = CATALOGUE.slice(0, shown);
  const hasMore = shown < CATALOGUE.length;

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto text-neutral-200" style={{ background: '#0b0908' }}>
      <Atmosphere />
      <TopBar onBack={() => onNavigate('INN')} title={t('CATALOGUE', 'CATALOGUE')} back={t('The Inn', "L'Auberge")} />

      <HeroFramed
        img="/media/inn/bureau-shire.jpg"
        kicker={t('The collection', 'La collection')}
        lead={t('The works that', 'Les œuvres qui vous')}
        accent={t('await you', 'attendent')}
        sub={t(
          'Le Salon des Inconnus is an artistic centre before it is an inn. The pieces hanging in the rooms belong to artists we represent, and they are for sale. Here is what is on the walls right now.',
          "Le Salon des Inconnus est un centre artistique avant d'être une auberge. Les pièces accrochées dans les chambres appartiennent à des artistes que nous représentons, et elles sont à vendre. Voici ce qui est aux murs en ce moment.",
        )}
      />

      <main className="relative">
        {/* I : pourquoi un catalogue */}
        <section className="px-6 md:px-14 lg:px-24 py-24 md:py-32">
          <SectionLabel numeral="I" label={t('An inn that represents its artists', 'Une auberge qui représente ses artistes')} />
          <div className="space-y-20 md:space-y-32">
            {rows.map((r, i) => (
              <EditorialRow key={r.kicker} {...r} flip={i % 2 === 1} />
            ))}
          </div>
        </section>

        {/* II : la grille */}
        <section className="px-6 md:px-14 lg:px-24 py-16 md:py-24">
          <SectionLabel numeral="II" label={t('The works', 'Les œuvres')} />
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10 lg:gap-12">
            {visible.map((w) => (
              <ArtworkCard key={w.id} work={w} fr={fr} onOpen={setOpen} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-16">
              <GoldButton onClick={() => setShown((n) => n + CATALOGUE_BATCH)}>
                {t('See more works', "Voir d'autres œuvres")}
              </GoldButton>
            </div>
          )}
        </section>

        {/* III — comment ça se passe */}
        <section className="px-6 md:px-14 lg:px-24 py-16 md:py-24">
          <SectionLabel numeral="III" label={t('How it works', 'Comment cela se passe')} />
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((s) => (
              <motion.div
                key={s.numeral}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              >
                <Glass className="p-8 md:p-10 h-full">
                  <span
                    className="rs-pill grid place-items-center font-prata rounded-full mb-7"
                    style={{ color: GOLD, width: '46px', height: '46px', fontSize: '1.1rem' }}
                  >
                    {s.numeral}
                  </span>
                  <h3 className="font-prata mb-4" style={{ color: CREAM, fontSize: 'clamp(1.3rem, 2vw, 1.65rem)', lineHeight: 1.16 }}>
                    {s.title}
                  </h3>
                  <p className="font-cormorant" style={{ color: 'rgba(255,250,240,0.7)', fontSize: '1.12rem', lineHeight: 1.6, fontWeight: 500 }}>
                    {s.body}
                  </p>
                </Glass>
              </motion.div>
            ))}
          </div>
        </section>

        {/* IV — demande */}
        <section className="px-6 md:px-14 lg:px-24 py-16 md:py-28">
          <SectionLabel numeral="IV" label={t('A question about a piece?', 'Une question sur une pièce ?')} />
          <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-center">
            <div className="md:col-span-5">
              <h2 className="font-prata" style={{ color: CREAM, fontSize: 'clamp(1.9rem, 3.6vw, 2.8rem)', lineHeight: 1.1 }}>
                {t('Write to us', 'Écrivez-nous')}
                <br />
                <span style={{ color: GOLD }}>{t('before you arrive.', "avant d'arriver.")}</span>
              </h2>
              <p
                className="font-cormorant mt-6"
                style={{ color: 'rgba(255,250,240,0.66)', fontSize: '1.25rem', lineHeight: 1.5, maxWidth: '34ch', fontWeight: 500 }}
              >
                {t(
                  'A commission, a piece by an artist not shown here, a work in a size that would fit your wall. Ask.',
                  "Une commande, une pièce d'un artiste absent du catalogue, une œuvre au format qui irait à votre mur. Demandez.",
                )}
              </p>
            </div>
            <div className="md:col-span-7">
              <Glass className="p-7 md:p-9">
                <ProposalRequestForm
                  language={language}
                  subject={t('Artwork catalogue', "Catalogue d'œuvres")}
                  showCompany={false}
                />
              </Glass>
            </div>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {open && <Lightbox work={open} fr={fr} onClose={closeLightbox} />}
      </AnimatePresence>
    </div>
  );
};
