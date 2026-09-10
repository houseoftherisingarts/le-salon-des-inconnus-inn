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
  /** Emplacements partis hors ligne, au téléphone, qui ne passeront jamais par
   *  Stripe. Ils s'ajoutent aux ventes du webhook pour donner le vrai restant,
   *  et la limite de paiements du lien Stripe est descendue d'autant. Deux
   *  loués le 9 septembre 2026. */
  dejaPris: 2,
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

/** Le lien de paiement du compte Stripe du Salon (produit prod_VEKnvBB5HwhA1L,
 *  prix price_1UDs8SKKPSkaQESfbjDOCRU6, limité à quatre paiements). L'adresse
 *  d'un lien de paiement est publique par nature, donc elle vit dans le dépôt.
 *  Firestore la remplace si Alex en pose une autre. */
const LIEN_STRIPE_SECOURS = 'https://buy.stripe.com/9B6fZidfgfDX3Si4Oc4sE00';

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

/** Stripe choisit la langue de sa page de paiement d'après le navigateur, ce qui
 *  envoie un visiteur québécois sur un formulaire anglais dès que son Chrome est
 *  en anglais. Le paramètre `locale` tranche à notre place. */
const lienDansLaLangue = (lien: string, fr: boolean): string => {
  if (!lien) return lien;
  try {
    const u = new URL(lien);
    u.searchParams.set('locale', fr ? 'fr-CA' : 'en');
    return u.toString();
  } catch {
    return lien;
  }
};

/** Les nombres s'ecrivent en toutes lettres dans la copie du site. */
const MOTS_FR = ['aucun', 'un seul', 'deux', 'trois', 'quatre'];
const MOTS_EN = ['No', 'A single', 'Two', 'Three', 'Four'];

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

  const [vendus, setVendus] = useState(CAMPING.dejaPris);
  const [lienStripe, setLienStripe] = useState(LIEN_STRIPE_SECOURS);
  const [pret, setPret] = useState(false);

  // Le document est en lecture publique (règle Firestore sur /config). Nous nous
  // abonnons plutôt que de lire une seule fois : le compteur baisse sous les yeux
  // du visiteur pendant qu'il hésite, ce qui est exactement l'effet voulu.
  useEffect(() => {
    if (!db) { setPret(true); return; }
    const unsub = onSnapshot(
      doc(db, 'config', 'camping'),
      (snap) => {
        const data = snap.data() as { vendus?: number; lienStripe?: string } | undefined;
        const enLigne = Math.max(0, Number(data?.vendus ?? 0));
        setVendus(Math.min(CAMPING.places, CAMPING.dejaPris + enLigne));
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

  // Le titre annonce que les chambres sont parties. Le sous-titre enchaîne sur
  // ce qui reste, avec le vrai compte plutôt qu'un chiffre figé dans le code.
  const sousTitre = restants === 0
    ? t(
        'The camping pitches are gone too for the festival weekend, and the land will reopen for the next edition.',
        'Les emplacements de camping sont partis eux aussi pour la fin de semaine du festival, et le terrain rouvrira pour la prochaine édition.',
      )
    : t(
        `${MOTS_EN[restants]} camping ${restants === 1 ? 'pitch is' : 'pitches are'} left on the five wooded acres of Maison Favier, in Namur, ten minutes from the Montpellier Medieval Festival. You put up your tent on the Friday and you leave on the Sunday.`,
        `Il reste ${MOTS_FR[restants]} ${restants === 1 ? 'emplacement' : 'emplacements'} de camping sur les cinq acres boisés de la Maison Favier, à Namur, à dix minutes du Festival médiéval de Montpellier. Vous plantez votre tente le vendredi et vous repartez le dimanche.`,
      );

  const scrollRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, []);

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-50 w-full h-full overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch]"
      style={{ background: '#060403' }}
    >
      <Atmosphere />
      <TopBar
        onBack={() => onNavigate('INN')}
        title={t('Festival camping', 'Camping du festival')}
        back={t('Back', 'Retour')}
      />

      <HeroFramed
        img={HERO}
        kicker={t('September 25 to 27, 2026', '25 au 27 septembre 2026')}
        lead={t('The inn is', "L'auberge est")}
        accent={t('full', 'complète')}
        sub={sousTitre}
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

        {/* II · Les quatre emplacements, la rupture visuelle de la page */}
        <section className="mb-28 md:mb-40">
          <SectionLabel numeral="II" label={t('Four pitches, no more', 'Quatre emplacements, pas un de plus')} />
          <div className="grid md:grid-cols-12 gap-10 md:gap-14 items-center">
            <p
              className="md:col-span-4 font-cormorant"
              style={{ color: 'rgba(255,250,240,0.74)', fontSize: 'clamp(1.1rem, 1.5vw, 1.3rem)', lineHeight: 1.6, fontWeight: 500 }}
            >
              {t(
                'We are opening four for that weekend, because five acres fill up faster than you would think and nobody wants to camp pressed against their neighbour. Once the four are taken, the page closes on its own.',
                "Nous en ouvrons quatre pour cette fin de semaine-là, parce que cinq acres se remplissent plus vite qu'on ne le croit et que personne n'a envie de camper collé sur son voisin. Quand les quatre sont pris, la page se ferme d'elle-même.",
              )}
            </p>
            <div className="md:col-span-8">
              <Emplacements vendus={vendus} fr={fr} />
            </div>
          </div>
        </section>

        {/* III · Le terrain */}
        <section className="mb-28 md:mb-40">
          <SectionLabel numeral="III" label={t('The land', 'Le terrain')} />
          <EditorialRow
            flip
            img={PHOTO_FORET}
            kicker={t('Namur, Outaouais', 'Namur, en Outaouais')}
            title={t('Ten minutes from the festival', 'À dix minutes du festival')}
            body={t(
              'The festival site is in Montpellier, ten minutes away by road. You sleep under the trees, you spend your day in the Middle Ages, and you come back at night to a fire that someone has already lit.',
              "Le site du festival se tient à Montpellier, à dix minutes de route. Vous dormez sous les arbres, vous passez la journée au Moyen Âge, et vous rentrez le soir vers un feu que quelqu'un a déjà allumé.",
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
                      'The festival camping is over for this year, and the land will reopen for the next edition.',
                      "Le camping du festival est terminé pour cette année, et le terrain rouvrira pour la prochaine édition.",
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
                        `Payment goes through by card, your pitch is held the moment the transaction clears, and you arrive on ${CAMPING.arriveeEN} to leave again on ${CAMPING.departEN}.`,
                        `Le paiement se fait par carte, votre emplacement est retenu dès que la transaction passe, et vous arrivez le ${CAMPING.arriveeFR} pour repartir le ${CAMPING.departFR}.`,
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-6">
                      {lienStripe ? (
                        <GoldButton href={lienDansLaLangue(lienStripe, fr)}>
                          {t('Book my pitch', 'Réserver mon emplacement')}
                        </GoldButton>
                      ) : (
                        <GoldButton disabled>
                          {t('Booking to come', 'Réservation à venir')}
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
