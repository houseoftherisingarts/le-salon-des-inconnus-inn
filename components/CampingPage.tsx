import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { Atmosphere, TopBar, HeroFramed, SectionLabel, EditorialRow, GoldButton, Glass } from './RetreatShared';
import { db } from '../firebase';

// Page /camping : les quatre emplacements de camping que le Salon ouvre sur son
// terrain pour la fin de semaine du Festival médiéval de Montpellier. Même
// langage cinéma que /entreprises, /forfaits et /catalogue (RetreatShared).
//
// Trois choses vivent en dehors du code :
//   1. Le lien de paiement Stripe (compte du Salon des Inconnus). Il est lu dans
//      Firestore → config/camping.lienStripe, donc Alex peut le coller sans
//      redéploiement. LIEN_STRIPE_SECOURS sert de valeur de repli au build.
//   2. Le compte des emplacements vendus → config/camping.vendus, incrémenté par
//      la fonction stripeCampingWebhook à chaque paiement encaissé.
//   3. La limite de paiements du lien Stripe lui-même, réglée à 4 dans le tableau
//      de bord. C'est le vrai garde-fou : même si le webhook tombe, Stripe refuse
//      la cinquième vente.

/** Un seul endroit à toucher pour la prochaine édition. */
const CAMPING = {
  /** Document Firestore et clé du webhook Stripe. */
  id: 'camping-fmm-2026',
  places: 4,
  prixAvantTaxes: 100,
  prixToutCompris: 115,
  /** Le séjour couvre les nuits du vendredi et du samedi du festival. */
  arriveeFR: 'vendredi 25 septembre',
  departFR: 'dimanche 27 septembre',
  arriveeEN: 'Friday, September 25',
  departEN: 'Sunday, September 27',
  /** La billetterie se ferme au dernier instant du festival (heure de l'Est). */
  fermeture: '2026-09-27T23:59:59-04:00',
};

/** Repli si le document Firestore n'a pas encore reçu le lien. */
const LIEN_STRIPE_SECOURS = '';

const GOLD = '#d9b45c';
const CREAM = '#f6ead0';

const HERO = '/media/inn/golden%20drone%20copy.jpg';
const PHOTO_FEU = '/wwoof/fire-bw.jpg';
const PHOTO_FORET = '/media/Auberge%20photos/nature%20coco%20upscale.jpg';

interface Props {
  onNavigate: (view: any) => void;
  language: 'EN' | 'FR';
}

type Etat = 'chargement' | 'ouvert' | 'complet' | 'ferme';

/** Les quatre emplacements, en clair : celui qui reste libre porte son chiffre
 *  en or, celui qui est pris s'éteint. C'est la seule rupture visuelle de la
 *  page, et elle dit le prix de la rareté mieux qu'une phrase. */
const Emplacements: React.FC<{ vendus: number; fr: boolean }> = ({ vendus, fr }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
    {Array.from({ length: CAMPING.places }, (_, i) => {
      const pris = i < vendus;
      return (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
        >
          <Glass
            className="relative flex flex-col items-center justify-center text-center px-4"
            style={{
              aspectRatio: '3 / 4',
              opacity: pris ? 0.42 : 1,
              borderColor: pris ? 'rgba(217,180,92,0.08)' : 'rgba(217,180,92,0.3)',
            }}
          >
            <span
              className="font-prata"
              style={{
                color: pris ? 'rgba(255,250,240,0.3)' : GOLD,
                fontSize: 'clamp(3.2rem, 7vw, 5rem)',
                lineHeight: 1,
                textShadow: pris ? 'none' : '0 0 46px rgba(217,180,92,0.45)',
              }}
            >
              {i + 1}
            </span>
            <span
              className="font-cinzel uppercase mt-5"
              style={{
                fontSize: '10px',
                letterSpacing: '0.28em',
                color: pris ? 'rgba(255,250,240,0.4)' : 'rgba(255,250,240,0.7)',
              }}
            >
              {pris ? (fr ? 'Pris' : 'Taken') : fr ? 'Libre' : 'Free'}
            </span>
          </Glass>
        </motion.div>
      );
    })}
  </div>
);

export const CampingPage: React.FC<Props> = ({ onNavigate, language }) => {
  const fr = language === 'FR';
  const t = (en: string, frTxt: string) => (fr ? frTxt : en);

  const [vendus, setVendus] = useState(0);
  const [lienStripe, setLienStripe] = useState(LIEN_STRIPE_SECOURS);
  const [pret, setPret] = useState(false);

  // Le document est en lecture publique (règle Firestore sur /config). On
  // s'abonne plutôt que de lire une fois : le compteur baisse sous les yeux du
  // visiteur pendant qu'il hésite, ce qui est exactement l'effet voulu.
  useEffect(() => {
    if (!db) { setPret(true); return; }
    const unsub = onSnapshot(
      doc(db, 'config', 'camping'),
      (snap) => {
        const data = snap.data() as { vendus?: number; lienStripe?: string } | undefined;
        setVendus(Math.max(0, Math.min(CAMPING.places, data?.vendus ?? 0)));
        if (data?.lienStripe) setLienStripe(data.lienStripe);
        setPret(true);
      },
      () => setPret(true),
    );
    return unsub;
  }, []);

  const restants = Math.max(0, CAMPING.places - vendus);
  const passe = Date.now() > new Date(CAMPING.fermeture).getTime();

  const etat: Etat = !pret ? 'chargement' : passe ? 'ferme' : restants === 0 ? 'complet' : 'ouvert';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: '#060403' }}>
      <Atmosphere />
      <TopBar
        onBack={() => onNavigate('INN')}
        title={t('Festival camping', 'Camping du festival')}
        back={t('Back', 'Retour')}
      />

      <HeroFramed
        img={HERO}
        kicker={t(
          'Montpellier Medieval Festival · September 25 to 27',
          'Festival médiéval de Montpellier · 25 au 27 septembre',
        )}
        lead={t('Your base camp', 'Le camp de base')}
        accent={t('for the festival', 'du festival')}
        sub={t(
          'Four pitches on the twelve wooded acres of Maison Favier, in Namur, for the festival weekend. You put up your tent on the Friday, you leave on the Sunday, and the forest takes care of the rest.',
          "Quatre emplacements sur les douze acres boisés de la Maison Favier, à Namur, pour la fin de semaine du festival. Vous plantez votre tente le vendredi, vous repartez le dimanche, et la forêt s'occupe du reste.",
        )}
      />

      <main className="px-5 md:px-10 lg:px-16 py-24 md:py-32 max-w-[1500px] mx-auto">
        {/* I · Ce que vous réservez */}
        <section className="mb-28 md:mb-40">
          <SectionLabel numeral="I" label={t('What you are booking', 'Ce que vous réservez')} />
          <EditorialRow
            img={PHOTO_FEU}
            kicker={t('The pitch', "L'emplacement")}
            title={t('Two nights on the land', 'Deux nuits sur le terrain')}
            body={t(
              'A pitch of your own for the Friday and Saturday nights, somewhere on the land around the house. There is room to park beside your tent, three fire pits that get used every evening, and a stream running down behind the house into the woods.',
              "Un emplacement à vous pour les nuits du vendredi et du samedi, quelque part sur le terrain qui entoure la maison. Il y a de la place pour stationner à côté de votre tente, trois pits à feux qui servent tous les soirs, et un ruisseau qui descend derrière la maison jusque dans la forêt.",
            )}
          />
        </section>

        {/* II · Les quatre emplacements — LA rupture visuelle de la page */}
        <section className="mb-28 md:mb-40">
          <SectionLabel numeral="II" label={t('Four pitches, no more', 'Quatre emplacements, pas un de plus')} />
          <p
            className="font-cormorant mb-12 md:mb-16"
            style={{ color: 'rgba(255,250,240,0.74)', fontSize: 'clamp(1.1rem, 1.5vw, 1.3rem)', lineHeight: 1.6, maxWidth: '60ch', fontWeight: 500 }}
          >
            {t(
              'We are opening four for that weekend, because twelve acres fill up faster than you would think and nobody wants to camp pressed against their neighbour. Once the four are taken, the page closes on its own.',
              "Nous en ouvrons quatre pour cette fin de semaine-là, parce que douze acres se remplissent plus vite qu'on ne le croit et que personne n'a envie de camper collé sur son voisin. Quand les quatre sont pris, la page se ferme d'elle-même.",
            )}
          </p>
          <Emplacements vendus={vendus} fr={fr} />
        </section>

        {/* III · Le terrain */}
        <section className="mb-28 md:mb-40">
          <SectionLabel numeral="III" label={t('The land', 'Le terrain')} />
          <EditorialRow
            flip
            img={PHOTO_FORET}
            kicker={t('Namur, Outaouais', 'Namur, en Outaouais')}
            title={t('Half an hour from the festival', "À une demi-heure du festival")}
            body={t(
              'The festival site is in Montpellier, less than half an hour away by road. You sleep under the trees, you spend your day in the Middle Ages, and you come back at night to a fire that someone has already lit.',
              "Le site du festival se tient à Montpellier, à moins d'une demi-heure de route. Vous dormez sous les arbres, vous passez la journée au Moyen Âge, et vous rentrez le soir vers un feu que quelqu'un a déjà allumé.",
            )}
          />
        </section>

        {/* IV · Le prix et la réservation */}
        <section>
          <SectionLabel numeral="IV" label={t('Booking', 'Réserver')} />
          <Glass className="px-7 md:px-16 py-14 md:py-20">
            <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-center">
              <div className="md:col-span-5">
                <span className="font-cinzel uppercase block mb-5" style={{ fontSize: '10px', letterSpacing: '0.3em', color: GOLD }}>
                  {t('Per pitch, for the weekend', "Par emplacement, pour la fin de semaine")}
                </span>
                <span className="font-prata block" style={{ color: CREAM, fontSize: 'clamp(3.4rem, 7vw, 5.2rem)', lineHeight: 1 }}>
                  {CAMPING.prixToutCompris} $
                </span>
                <span className="font-cormorant block mt-4" style={{ color: 'rgba(255,250,240,0.62)', fontSize: '1.1rem', fontWeight: 500 }}>
                  {t(
                    `${CAMPING.prixAvantTaxes} $ plus taxes, all in`,
                    `${CAMPING.prixAvantTaxes} $ plus les taxes, tout compris`,
                  )}
                </span>
              </div>

              <div className="md:col-span-7">
                {etat === 'ferme' && (
                  <p className="font-cormorant" style={{ color: 'rgba(255,250,240,0.74)', fontSize: 'clamp(1.1rem, 1.5vw, 1.3rem)', lineHeight: 1.6, fontWeight: 500 }}>
                    {t(
                      'The festival camping is over for this year. The land reopens for the next edition.',
                      "Le camping du festival est terminé pour cette année. Le terrain rouvrira pour la prochaine édition.",
                    )}
                  </p>
                )}

                {etat === 'complet' && (
                  <p className="font-cormorant" style={{ color: 'rgba(255,250,240,0.74)', fontSize: 'clamp(1.1rem, 1.5vw, 1.3rem)', lineHeight: 1.6, fontWeight: 500 }}>
                    {t(
                      'The four pitches are taken. Write to us and we will keep your name for a cancellation.',
                      'Les quatre emplacements sont pris. Écrivez-nous et nous garderons votre nom en cas de désistement.',
                    )}
                  </p>
                )}

                {etat === 'ouvert' && (
                  <>
                    <p
                      className="font-cormorant mb-8"
                      style={{ color: 'rgba(255,250,240,0.78)', fontSize: 'clamp(1.1rem, 1.5vw, 1.3rem)', lineHeight: 1.6, fontWeight: 500 }}
                    >
                      {t(
                        `Payment goes through by card, and your pitch is held the moment the transaction clears. Arrival on ${CAMPING.arriveeEN}, departure on ${CAMPING.departEN}.`,
                        `Le paiement se fait par carte, et votre emplacement est retenu dès que la transaction passe. Arrivée le ${CAMPING.arriveeFR}, départ le ${CAMPING.departFR}.`,
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-6">
                      {lienStripe ? (
                        <GoldButton href={lienStripe}>
                          {t('Book my pitch', 'Réserver mon emplacement')}
                        </GoldButton>
                      ) : (
                        <GoldButton disabled>
                          {t('Booking opens shortly', 'Billetterie ouverte sous peu')}
                        </GoldButton>
                      )}
                      <span className="font-cinzel uppercase" style={{ fontSize: '10px', letterSpacing: '0.26em', color: 'rgba(255,250,240,0.55)' }}>
                        {restants === 1
                          ? t('One pitch left', 'Un emplacement libre')
                          : t(`${restants} pitches left`, `${restants} emplacements libres`)}
                      </span>
                    </div>
                  </>
                )}

                {etat === 'chargement' && (
                  <span className="font-cinzel uppercase" style={{ fontSize: '10px', letterSpacing: '0.28em', color: 'rgba(255,250,240,0.4)' }}>
                    {t('Loading', 'Chargement')}
                  </span>
                )}
              </div>
            </div>
          </Glass>

          <p
            className="font-cormorant mt-10 text-center mx-auto"
            style={{ color: 'rgba(255,250,240,0.5)', fontSize: '1rem', maxWidth: '58ch', fontWeight: 500 }}
          >
            {t(
              'Le Salon des Inconnus · 826 Côte à Favier, Namur · The camping is ours; the festival is run by the Festival médiéval de Montpellier.',
              'Le Salon des Inconnus · 826 Côte à Favier, Namur · Le camping est le nôtre, et le festival est celui du Festival médiéval de Montpellier.',
            )}
          </p>
        </section>
      </main>
    </div>
  );
};
