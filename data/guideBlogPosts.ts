import type { BlogPost } from '../types';

// Blog posts for the Local Guide.
// Keyed by the LocalGuideItem.id. Posts marked _draft: true are
// auto-generated drafts pending owner review. The medieval festival post
// uses content sourced directly from festivalmedievaldemontpellier.org.
//
// Adding a new post here automatically wires it up — GuidePage merges this
// map into LOCAL_GUIDE_DATA at module load (see constants.ts).

export const GUIDE_BLOG_POSTS: Record<string, BlogPost> = {
    // ─── VIE LOCALE · LA PETITE MONNAIE ──────────────────────────────────
    // SEO/GEO article: names the concept + every participating merchant we can
    // confirm (the 11 bureaux de change + the artistic/community anchors).
    // Facts from pmonnaie.ca and our own data/petiteMonnaie.ts.
    'petite-monnaie': {
        _draft: false,
        intro_fr: "La Petite Monnaie est la monnaie locale et communautaire de la Petite-Nation, dans la MRC de Papineau. Une petite-monnaie vaut un dollar canadien, tout simplement, et chaque billet dépensé reste dans la région : chez les artisans, les fermes, les cafés et les galeries qui font vivre la vallée. Plus de 150 commerces l'acceptent. Voici comment elle fonctionne, où s'en procurer, et la liste des commerces qui la prennent, du lac Simon jusqu'aux rives de l'Outaouais.",
        intro_en: "La Petite Monnaie is the local, community currency of the Petite-Nation, in the MRC de Papineau. One petite-monnaie is worth one Canadian dollar, plainly, and every note you spend stays in the region: with the artisans, farms, cafés and galleries that keep the valley alive. More than 150 businesses accept it. Here is how it works, where to get it, and the full list of merchants who take it, from Lac Simon down to the banks of the Ottawa River.",
        sections: [
            { title_fr: "Le concept, en clair", title_en: "The concept, plainly",
              body_fr: "La Petite Monnaie est portée par la Coopérative de solidarité Place du Marché, à Ripon. Le principe est simple : une petite-monnaie égale un dollar canadien, et l'argent circule en boucle dans la Petite-Nation au lieu de filer vers les grandes chaînes. À chaque recharge, une bonification de 5 % s'ajoute à votre solde : payez 100 $, repartez avec 105 petites-monnaies. Plus de 150 commerces de la MRC de Papineau l'acceptent, et à Ripon, même une partie du salaire du maire est versée en petites-monnaies. C'est une économie de proximité, fondée sur la confiance, qui garde la richesse chez nous.",
              body_en: "La Petite Monnaie is run by the Coopérative de solidarité Place du Marché, in Ripon. The idea is simple: one petite-monnaie equals one Canadian dollar, and the money loops back through the Petite-Nation instead of leaking out to big chains. Every time you top up, a 5 % bonus is added to your balance: pay 100 $, walk away with 105 petites-monnaies. More than 150 businesses across the MRC de Papineau accept it, and in Ripon, even part of the mayor's salary is paid in petites-monnaies. It is a trust-based local economy that keeps the wealth at home." },
            { title_fr: "Comment s'en procurer", title_en: "How to get it",
              body_fr: "Quatre façons. Sur l'application mobile Petite-monnaie (iOS et Android) : créez votre compte, rechargez votre solde, et l'activation se fait en un à deux jours ouvrables. Aux bureaux de change : onze commerces phares font office de guichets, payez 100 $ comptant ou par débit et repartez avec une enveloppe scellée de 105 petites-monnaies, bonification incluse. En ligne avec Zeffy, le partenaire de paiement de la coopérative, avec la même bonification de 5 %. Et par la poste, en commandant des billets papier sur la boutique en ligne, pratique pour offrir en cadeau.",
              body_en: "Four ways. On the Petite-monnaie mobile app (iOS and Android): create your account, top up your balance, and activation takes one to two business days. At the exchange points: eleven flagship businesses act as wickets, pay 100 $ in cash or by debit and leave with a sealed envelope of 105 petites-monnaies, bonus included. Online through Zeffy, the cooperative's payment partner, with the same 5 % bonus. And by mail, ordering paper notes from the online shop, handy as a gift." },
            { title_fr: "Les onze bureaux de change", title_en: "The eleven exchange points",
              body_fr: "Les bureaux de change sont les guichets officiels où échanger vos dollars contre une enveloppe de petites-monnaies. On en compte onze, répartis dans toute la vallée : Le Salon des Inconnus à Namur, le Marché Faubert à Montpellier, Carbo BBQ à Duhamel, Le Café des Orties et la Coop Place du Marché à Ripon, l'Alliance Alimentaire Papineau à Saint-André-Avellin, la Ferme aux Colibris à Saint-Sixte, Les Mignardises à Papineauville, Chocomotive à Montebello, le Dépanneur Bowman à Bowman, et le Dépanneur 10-10 à Thurso. Où que vous soyez dans la Petite-Nation, il y a un guichet à portée de route.",
              body_en: "The exchange points are the official wickets where you swap your dollars for an envelope of petites-monnaies. There are eleven, spread across the whole valley: Le Salon des Inconnus in Namur, Marché Faubert in Montpellier, Carbo BBQ in Duhamel, Le Café des Orties and Coop Place du Marché in Ripon, Alliance Alimentaire Papineau in Saint-André-Avellin, Ferme aux Colibris in Saint-Sixte, Les Mignardises in Papineauville, Chocomotive in Montebello, Dépanneur Bowman in Bowman, and Dépanneur 10-10 in Thurso. Wherever you are in the Petite-Nation, a wicket is a short drive away." },
            { title_fr: "Où la dépenser : les commerces d'ici", title_en: "Where to spend it: the local merchants",
              body_fr: "Au-delà des guichets, la petite-monnaie s'accepte dans les commerces artistiques et gourmands de la région. Du côté des arts : l'Atelier Galerie d'art Solart à Ripon, où Michelle Lemire crée et expose céramiques et sculptures depuis 1999, et Le Café des Orties, café-galerie installé dans un ancien presbytère. Du côté du ventre : la boulangerie au levain La Fille du Boulanger, le fumoir Carbo BBQ au bord du lac Simon, la pâtisserie Les Mignardises à Papineauville, la chocolaterie artisanale Chocomotive dans l'ancienne gare de Montebello, et la Ferme aux Colibris à Saint-Sixte pour les légumes de saison. Le grand rendez-vous médiéval de la vallée, le Festival Médiéval de Montpellier, et le pôle nourricier Alliance Alimentaire Papineau participent aussi au mouvement. La liste complète vit sur pmonnaie.ca et dans l'application.",
              body_en: "Beyond the wickets, the petite-monnaie is accepted across the region's artistic and food businesses. On the arts side: the Atelier Galerie d'art Solart in Ripon, where Michelle Lemire has created and shown ceramics and sculpture since 1999, and Le Café des Orties, a café-gallery set in a former presbytery. On the food side: the sourdough bakery La Fille du Boulanger, the Carbo BBQ smokehouse on the shore of Lac Simon, the Les Mignardises pastry shop in Papineauville, the artisanal chocolate maker Chocomotive in Montebello's old train station, and Ferme aux Colibris in Saint-Sixte for seasonal vegetables. The valley's great medieval gathering, the Festival Médiéval de Montpellier, and the food hub Alliance Alimentaire Papineau take part too. The full list lives on pmonnaie.ca and in the app." },
            { title_fr: "Au Salon des Inconnus", title_en: "At Le Salon des Inconnus",
              body_fr: "Le Salon des Inconnus, à Namur, est l'un des onze bureaux de change. Procurez-vous vos premières petites-monnaies directement à l'auberge, prenez la carte de la région, et repartez avec un café barista, offert, à l'achat de votre enveloppe. C'est le point de départ idéal pour descendre la Petite-Nation de commerce en commerce, la petite-monnaie en poche.",
              body_en: "Le Salon des Inconnus, in Namur, is one of the eleven exchange points. Pick up your first petites-monnaies right at the inn, grab the regional map, and leave with a free barista coffee when you buy your envelope. It is the ideal starting point to travel down the Petite-Nation shop by shop, petite-monnaie in hand." },
        ],
        faqs: [
            { q_fr: "C'est quoi la Petite Monnaie ?", q_en: "What is La Petite Monnaie?",
              a_fr: "C'est la monnaie locale et communautaire de la Petite-Nation (MRC de Papineau). Une petite-monnaie vaut un dollar canadien et s'accepte uniquement dans les commerces participants de la région.",
              a_en: "It is the local, community currency of the Petite-Nation (MRC de Papineau). One petite-monnaie is worth one Canadian dollar and is accepted only at participating businesses in the region." },
            { q_fr: "Combien vaut une petite-monnaie ?", q_en: "How much is one petite-monnaie worth?",
              a_fr: "Exactement un dollar canadien. À chaque recharge, une bonification de 5 % s'ajoute : 100 $ vous donnent 105 petites-monnaies.",
              a_en: "Exactly one Canadian dollar. Every top-up adds a 5 % bonus: 100 $ gets you 105 petites-monnaies." },
            { q_fr: "Où s'en procurer ?", q_en: "Where can I get it?",
              a_fr: "Sur l'application mobile Petite-monnaie, à l'un des onze bureaux de change, en ligne via Zeffy, ou par la poste sur la boutique en ligne.",
              a_en: "On the Petite-monnaie mobile app, at one of the eleven exchange points, online through Zeffy, or by mail from the online shop." },
            { q_fr: "Quels commerces l'acceptent ?", q_en: "Which businesses accept it?",
              a_fr: "Plus de 150 commerces de la MRC de Papineau, dont Le Café des Orties, la Coop Place du Marché, l'Atelier Galerie d'art Solart, Carbo BBQ, Chocomotive, Les Mignardises, la Ferme aux Colibris, l'Alliance Alimentaire Papineau et Le Salon des Inconnus.",
              a_en: "More than 150 businesses across the MRC de Papineau, including Le Café des Orties, Coop Place du Marché, Atelier Galerie d'art Solart, Carbo BBQ, Chocomotive, Les Mignardises, Ferme aux Colibris, Alliance Alimentaire Papineau and Le Salon des Inconnus." },
            { q_fr: "Peut-on en obtenir au Salon des Inconnus ?", q_en: "Can I get it at Le Salon des Inconnus?",
              a_fr: "Oui. Le Salon des Inconnus, à Namur, est un bureau de change officiel : vous y obtenez vos petites-monnaies sur place, avec un café barista offert à l'achat d'une enveloppe.",
              a_en: "Yes. Le Salon des Inconnus, in Namur, is an official exchange point: you get your petites-monnaies on site, with a free barista coffee when you buy an envelope." },
        ],
        schema: { type: "LocalBusiness", address: "MRC de Papineau, Petite-Nation, QC, Canada" },
    },

    // ─── SUMMER ──────────────────────────────────────────────────────────
    'plage-simon': {
        _draft: true,
        intro_fr: "Posé à mi-chemin entre Duhamel et Chénéville, le lac Simon est l'un des plus grands plans d'eau de la Petite-Nation : 74 kilomètres de tour, 45 mètres de profondeur au creux, et une eau si limpide qu'on voit le sable défiler sous le canot. La plage publique en est la porte d'entrée.",
        intro_en: "Sitting between Duhamel and Chénéville, Lac Simon is one of the largest lakes in the Petite-Nation region — 74 km around, 45 m deep at its lowest, and water so clear you can watch sand drift below the canoe. The public beach is the front door.",
        sections: [
            { title_fr: "L'expérience", title_en: "What to expect",
              body_fr: "La plage publique est de sable, surveillée pendant la haute saison, et idéale pour la baignade familiale. L'eau se tempère à partir de la mi-juin et reste agréable jusqu'en septembre. Le quai municipal, gratuit, accueille les petites embarcations — kayaks, canots, paddleboards. Plusieurs sentiers forestiers autour de Duhamel partent à quelques minutes à pied.",
              body_en: "The public beach is sandy, supervised in peak season, and ideal for family swimming. The water warms up from mid-June and stays pleasant through September. The free municipal dock welcomes small craft — kayaks, canoes, paddleboards. Several forest trails around Duhamel start a short walk away." },
            { title_fr: "S'y rendre", title_en: "Getting there",
              body_fr: "Accessible directement depuis le centre du village de Duhamel — environ 1h30 de Gatineau et 2h de Montréal. Stationnement gratuit pour les résidents, payant pour les visiteurs en haute saison.",
              body_en: "Accessible from the centre of Duhamel village — about 1h30 from Gatineau, 2h from Montreal. Parking is free for residents and paid for visitors in peak season." },
            { title_fr: "À proximité", title_en: "Nearby",
              body_fr: "Le Salon des Inconnus est à quelques minutes en voiture. Une journée à la plage, puis un retour pour un souper traiteur ou une soirée musicale — c'est le rythme parfait d'un séjour en Petite-Nation.",
              body_en: "Le Salon des Inconnus is a few minutes away by car. A day at the beach, then back for a catered supper or a musical evening — the ideal rhythm for a Petite-Nation stay." },
        ],
        faqs: [
            { q_fr: "La plage est-elle surveillée ?", q_en: "Is the beach supervised?",
              a_fr: "Oui, des sauveteurs sont présents pendant la haute saison estivale (juillet-août).",
              a_en: "Yes, lifeguards are on duty during the peak summer season (July-August)." },
            { q_fr: "Peut-on y louer des embarcations ?", q_en: "Can I rent watercraft?",
              a_fr: "Le quai municipal est gratuit pour mettre vos propres embarcations à l'eau. Plusieurs prestataires opèrent autour du lac pour la location.",
              a_en: "The municipal dock is free for launching your own craft. Several operators around the lake handle rentals." },
        ],
        schema: { type: "TouristAttraction", address: "Duhamel, QC, Canada", lat: 45.9667, lng: -75.0833, openingHours: "Mo-Su 09:00-20:00" },
    },

    'tubes': {
        _draft: true,
        intro_fr: "Descendre la rivière Petite-Nation sur un tube est l'un des rituels d'été les plus discrets — et les plus québécois — de la région. À Duhamel, on s'installe sur un tube gonflable, on lâche prise, et le courant vous porte à travers la forêt pendant une heure ou deux.",
        intro_en: "Floating down the Petite-Nation River on a tube is one of the region's quietest — and most quintessentially Quebecois — summer rituals. In Duhamel, you settle into an inflatable tube, let go, and the current carries you through the forest for an hour or two.",
        sections: [
            { title_fr: "L'art du slow floating", title_en: "The art of slow floating",
              body_fr: "Pas de moteur, pas de pagaie, pas de pression. Juste l'eau, la forêt, et le rythme du courant. C'est l'activité parfaite pour une journée chaude où l'envie de bouger est moindre que celle d'observer le ciel défiler entre les arbres.",
              body_en: "No motor, no paddle, no pressure. Just the water, the forest, and the rhythm of the current. It's the perfect activity for a hot day when watching the sky drift past the trees beats moving." },
            { title_fr: "Pratique", title_en: "Practical info",
              body_fr: "La municipalité de Duhamel publie les points d'accès et les recommandations de sécurité sur son site. Apportez de l'eau, de la crème solaire, des sandales d'eau et un petit sac étanche pour vos clés.",
              body_en: "The Duhamel municipality publishes access points and safety guidelines on its site. Bring water, sunscreen, water sandals, and a small dry bag for your keys." },
            { title_fr: "À proximité", title_en: "Nearby",
              body_fr: "Combinez la descente avec un passage par la plage du lac Simon ou un souper à l'Auberge — c'est le combo parfait d'une journée d'été en Petite-Nation.",
              body_en: "Pair the float with a stop at the Lac Simon beach or a supper at the Inn — that's the perfect summer-day combo in Petite-Nation." },
        ],
        faqs: [
            { q_fr: "Faut-il son propre tube ?", q_en: "Do I need my own tube?",
              a_fr: "Plusieurs prestataires locaux louent des tubes et organisent des navettes. Vérifiez les détails avec la municipalité de Duhamel avant votre visite.",
              a_en: "Several local operators rent tubes and run shuttles. Check with the Duhamel municipality for details before your visit." },
            { q_fr: "Convient-il aux enfants ?", q_en: "Is it kid-friendly?",
              a_fr: "Oui, le courant est généralement doux. Une veste de flottaison reste recommandée pour les jeunes enfants.",
              a_en: "Yes — the current is generally gentle. A flotation vest is still recommended for younger children." },
        ],
        schema: { type: "TouristAttraction", address: "Duhamel, QC, Canada" },
    },

    'lac-plages': {
        _draft: true,
        intro_fr: "Lac-des-Plages porte bien son nom : un long lac bordé de plages discrètes, un village au charme rétro, et cette qualité particulière de lumière qu'on ne trouve qu'au creux des Laurentides. C'est un coin que les locaux gardent un peu pour eux.",
        intro_en: "Lac-des-Plages lives up to its name: a long lake fringed with quiet beaches, a village with a retro charm, and that particular quality of light you only find tucked into the Laurentians. It's a spot the locals keep mostly to themselves.",
        sections: [
            { title_fr: "Le lieu", title_en: "The place",
              body_fr: "Cherchez les accès plus discrets — quelques rampes de mise à l'eau, des plages publiques moins fréquentées, et des sentiers qui longent l'eau. Le village offre dépanneur, restaurant et ce sentiment rare d'être hors du temps.",
              body_en: "Look for the quieter access points — a few boat ramps, lesser-known public beaches, and paths along the water. The village offers a corner store, a restaurant, and that rare feeling of being outside of time." },
            { title_fr: "Quoi y faire", title_en: "What to do there",
              body_fr: "Baignade, pêche, kayak, pique-nique. C'est aussi un excellent point de chute pour des balades à vélo dans les rangs environnants. L'hiver, le lac gèle solidement et accueille pêcheurs et patineurs.",
              body_en: "Swim, fish, kayak, picnic. It's also a great base for cycling along the surrounding country roads. In winter, the lake freezes solid and hosts ice fishers and skaters." },
        ],
        faqs: [
            { q_fr: "Est-ce loin de l'Auberge ?", q_en: "Is it far from the Inn?",
              a_fr: "Comptez environ 30-40 minutes de route depuis Le Salon des Inconnus.",
              a_en: "Plan for roughly 30-40 minutes by car from Le Salon des Inconnus." },
        ],
        schema: { type: "TouristAttraction", address: "Lac-des-Plages, QC, Canada" },
    },

    'lac-croche': {
        _draft: true,
        intro_fr: "Le lac Croche, à Montpellier, est un de ces petits lacs forestiers qu'on connaît surtout par tradition orale. Ni site touristique, ni plage organisée — juste un plan d'eau silencieux, entouré de forêt, où le bruit le plus fort est celui d'un huard à la fin de la journée.",
        intro_en: "Lac Croche, in Montpellier, is one of those small forest lakes you mostly hear about by word of mouth. Not a tourist site, not an organised beach — just a quiet body of water surrounded by forest, where the loudest sound is a loon at the end of the day.",
        sections: [
            { title_fr: "L'expérience", title_en: "What to expect",
              body_fr: "Baignade dans une eau fraîche, pique-nique sur la rive, cueillette sauvage de bleuets en juillet. Pas d'équipement, pas de stationnement officiel — apportez ce qu'il vous faut et repartez avec.",
              body_en: "Swimming in cool water, a picnic on the bank, wild blueberry foraging in July. No facilities, no official parking — bring what you need and take it back out." },
            { title_fr: "Esprit du lieu", title_en: "Spirit of the place",
              body_fr: "Ici, le silence est roi. C'est un endroit pour fuir le bruit, lire, méditer, ou simplement écouter le vent dans les arbres. Respectez la nature : pas de feu, pas de déchets.",
              body_en: "Here, silence rules. It's a place to escape noise, read, meditate, or simply listen to the wind in the trees. Respect the land: no fires, no trash left behind." },
        ],
        schema: { type: "TouristAttraction", address: "Montpellier, QC, Canada" },
    },

    'ile-raisin': {
        _draft: true,
        intro_fr: "L'Île au Raisin, sur le lac Gagnon, est le genre d'endroit dont on parle à voix basse. Plus sauvage que les plages publiques, accessible en canot ou kayak, c'est l'évasion ultime — eau claire, sable blanc, ciel ouvert et pas un rivage habité en vue.",
        intro_en: "Île au Raisin, on Lac Gagnon, is the kind of place people talk about in low voices. Wilder than the public beaches, reached by canoe or kayak, it's the ultimate escape — clear water, white sand, open sky, and not a single populated shore in sight.",
        sections: [
            { title_fr: "S'y rendre", title_en: "Getting there",
              body_fr: "Mise à l'eau au lac Gagnon (Duhamel), puis 15-30 minutes de pagaie selon votre point de départ. La traversée est généralement calme; vérifiez le vent avant de partir.",
              body_en: "Launch from Lac Gagnon (Duhamel), then 15-30 minutes of paddling depending on your starting point. The crossing is usually calm; check the wind before you head out." },
            { title_fr: "Sur place", title_en: "Once there",
              body_fr: "Lisez face à l'immensité, baignez-vous dans une eau limpide, faites une sieste au soleil. Aucun service — apportez tout, repartez avec tout.",
              body_en: "Read facing the open lake, swim in clear water, nap in the sun. No services — pack in, pack out." },
        ],
        schema: { type: "TouristAttraction", address: "Lac Gagnon, Duhamel, QC, Canada" },
    },

    // ─── HIKING ──────────────────────────────────────────────────────────
    'montagnes-noires': {
        _draft: true,
        intro_fr: "Le Parc des Montagnes Noires de Ripon est le joyau de la randonnée en Petite-Nation — 800 acres de forêt municipale, 25 km de sentiers, et une tour d'observation de 12 mètres perchée à 426 mètres d'altitude qui ouvre une vue à 360° sur toute la vallée.",
        intro_en: "The Parc des Montagnes Noires in Ripon is the crown jewel of hiking in Petite-Nation — 800 acres of municipal forest, 25 km of trails, and a 12-metre observation tower perched at 426 metres altitude that opens a 360° view over the entire valley.",
        sections: [
            { title_fr: "Les sentiers", title_en: "The trails",
              body_fr: "Le réseau accueille randonneurs en été, fat-bikers et raquetteurs en hiver, et skieurs de fond toute la saison froide. Plusieurs boucles sont possibles, du parcours familial d'une heure à la longue traversée d'une demi-journée.",
              body_en: "The network welcomes hikers in summer, fat-bikers and snowshoers in winter, and cross-country skiers all cold season. Multiple loops exist — from a one-hour family route to a half-day traverse." },
            { title_fr: "La tour et le ciel", title_en: "The tower and the sky",
              body_fr: "Allez-y la nuit en août. La région est suffisamment éloignée des halos urbains pour que la Voie lactée se découpe nettement. La tour offre une plateforme idéale pour observer le ciel sans obstacle.",
              body_en: "Go at night in August. The region is far enough from urban light halos that the Milky Way appears clearly. The tower is an ideal platform for unobstructed sky watching." },
            { title_fr: "Pratique", title_en: "Practical info",
              body_fr: "Stationnement, accès payant, cartes des sentiers et mise à jour des conditions sur parcdesmontagnesnoires.ca. Comptez environ 25 minutes en voiture depuis Le Salon des Inconnus.",
              body_en: "Parking, fees, trail maps and current conditions on parcdesmontagnesnoires.ca. Plan about 25 minutes by car from Le Salon des Inconnus." },
        ],
        faqs: [
            { q_fr: "Le parc est-il ouvert toute l'année ?", q_en: "Is the park open year-round?",
              a_fr: "Oui — l'usage change selon la saison (rando en été, ski/raquette/fat-bike en hiver), mais le parc est ouvert toute l'année.",
              a_en: "Yes — uses change with the season (hiking in summer, ski/snowshoe/fat-bike in winter), but the park stays open year-round." },
            { q_fr: "Peut-on y aller avec des enfants ?", q_en: "Is it kid-friendly?",
              a_fr: "Oui, plusieurs sentiers courts et faciles sont parfaits pour les familles.",
              a_en: "Yes — several short, easy trails are perfect for families." },
        ],
        schema: { type: "TouristAttraction", address: "Ripon, QC, Canada", openingHours: "Mo-Su 09:00-17:00" },
    },

    'iroquois': {
        _draft: true,
        intro_fr: "Le sentier de la rivière Iroquois est une promenade discrète mais marquante — une marche douce sous une lumière filtrée, le long d'une rivière qui chante entre les pierres, dans une forêt dense qui absorbe les bruits du monde.",
        intro_en: "The Rivière Iroquois trail is a quiet but memorable walk — a gentle hike under filtered light, along a river that sings between stones, through dense forest that absorbs the noise of the world.",
        sections: [
            { title_fr: "Le sentier", title_en: "The trail",
              body_fr: "Le tracé longe l'eau presque tout le long. Le terrain est facile, sans dénivelé important, ce qui en fait un excellent choix pour une marche méditative ou une sortie familiale. Une chute discrète ponctue le parcours.",
              body_en: "The route follows the water for most of its length. The terrain is easy, with no significant elevation gain — a great choice for a meditative walk or a family outing. A quiet waterfall punctuates the route." },
            { title_fr: "L'idée", title_en: "The idea",
              body_fr: "Combinez la marche et un bain rapide dans la rivière l'été. C'est le rythme parfait : marcher, écouter, se rafraîchir, repartir.",
              body_en: "Combine the walk with a quick swim in the river in summer. The rhythm is perfect: walk, listen, cool off, walk on." },
        ],
        schema: { type: "TouristAttraction", address: "Outaouais, QC, Canada" },
    },

    'cheneville': {
        _draft: true,
        intro_fr: "La Montagne de Chénéville est l'option « rapide et gratifiante » : une montée courte derrière l'école du village, et au sommet, une belle vue sur le bourg, les rangs et la ligne d'horizon laurentienne. Idéal pour une sortie improvisée.",
        intro_en: "The Montagne de Chénéville is the 'quick and rewarding' option: a short climb behind the village school, and at the top, a fine view of the village, the country roads, and the Laurentian skyline. Ideal for an unplanned outing.",
        sections: [
            { title_fr: "Le sentier", title_en: "The trail",
              body_fr: "Accessible toute l'année. Comptez 30 à 45 minutes pour une montée tranquille. Un bon choix entre deux étapes de la journée — un café au village avant, une boulangerie après.",
              body_en: "Accessible year-round. Plan 30 to 45 minutes for an easy climb. A good fit between other stops — a coffee in the village before, a bakery after." },
        ],
        schema: { type: "TouristAttraction", address: "Chénéville, QC, Canada" },
    },

    // ─── CULTURE ─────────────────────────────────────────────────────────
    'papineau': {
        _draft: true,
        intro_fr: "Le Manoir Papineau, à Montebello, est l'un des sites historiques les plus chargés du Québec — la résidence seigneuriale du 19e siècle de Louis-Joseph Papineau, leader des Patriotes, flanquée de quatre tours et entourée de jardins formels qui descendent vers l'Outaouais.",
        intro_en: "The Manoir Papineau in Montebello is one of Quebec's most storied historical sites — the 19th-century seigneurial residence of Louis-Joseph Papineau, leader of the Patriotes, flanked by four towers and surrounded by formal gardens descending toward the Ottawa River.",
        sections: [
            { title_fr: "Le lieu", title_en: "The place",
              body_fr: "Lieu historique national administré par Parcs Canada, le manoir abrite des pièces d'époque, des collections, et raconte l'histoire d'une famille au cœur des bouleversements politiques du Bas-Canada.",
              body_en: "A National Historic Site administered by Parks Canada, the manor houses period rooms, collections, and tells the story of a family at the heart of Lower Canada's political upheavals." },
            { title_fr: "À voir", title_en: "What to see",
              body_fr: "La salle d'étude de Papineau, les jardins, la chapelle funéraire, et la vue sur la rivière depuis les hauteurs du domaine. Des visites guidées et des activités saisonnières sont offertes en haute saison.",
              body_en: "Papineau's study, the gardens, the funerary chapel, and the river view from the heights of the estate. Guided tours and seasonal activities run during peak season." },
        ],
        schema: { type: "TouristAttraction", address: "Montebello, QC, Canada" },
    },

    'barclay': {
        _draft: true,
        intro_fr: "L'Expo-Barclay de Plaisance est le rendez-vous annuel des amoureux de la terre et du feu — une réunion de céramistes du Québec qui transforment, le temps d'un week-end, un coin de la Petite-Nation en grand atelier collectif.",
        intro_en: "Plaisance's Expo-Barclay is the annual meeting point for lovers of clay and fire — a gathering of ceramicists from across Quebec who, for one weekend, turn a corner of Petite-Nation into a great collective workshop.",
        sections: [
            { title_fr: "Ce qui s'y passe", title_en: "What happens",
              body_fr: "Démonstrations de tournage, cuissons publiques, pièces uniques à acquérir, et rencontres directes avec les artistes. C'est l'occasion de comprendre la matière, d'observer un savoir-faire qui ne s'écrit pas, et de repartir avec un objet chargé d'histoire.",
              body_en: "Throwing demonstrations, public firings, unique pieces for sale, and direct conversations with the artists. It's a chance to understand the material, watch a skill that can't really be written down, and leave with an object charged with history." },
        ],
        schema: { type: "Event", address: "Plaisance, QC, Canada" },
    },

    'michelle-lemire': {
        _draft: true,
        intro_fr: "Michelle Lemire a fondé l'Atelier Galerie Solart à Ripon en 1999. Depuis, elle y travaille la céramique, le bronze, la pierre et les métaux précieux — une pratique pluridisciplinaire enracinée dans une philosophie où l'eau est l'essence même de la vie.",
        intro_en: "Michelle Lemire founded the Atelier Galerie Solart in Ripon in 1999. She has worked there ever since with ceramic, bronze, stone, and precious metals — a multidisciplinary practice rooted in a philosophy where water is the very essence of life.",
        sections: [
            { title_fr: "Le lieu", title_en: "The place",
              body_fr: "Atelier et galerie sont fondus en un même espace : on peut voir l'artiste à l'œuvre, comprendre les pièces dans leur contexte, et acquérir directement sculptures, urnes, théières et bijoux.",
              body_en: "Studio and gallery merge into a single space: you can see the artist at work, understand the pieces in their context, and acquire sculptures, urns, teapots, and jewellery directly." },
            { title_fr: "Pourquoi y aller", title_en: "Why go",
              body_fr: "Pour rencontrer une artiste qui parle de son travail avec une rare précision. Pour repartir avec une pièce dont on connaît l'origine. Et pour découvrir la facette artisanale, profonde, de la Petite-Nation.",
              body_en: "To meet an artist who speaks about her work with rare precision. To leave with a piece whose origin you know. And to discover the deep, hand-made face of Petite-Nation." },
        ],
        schema: { type: "ArtGallery", address: "Ripon, QC, Canada" },
    },

    // ─── FOOD ────────────────────────────────────────────────────────────
    'orties': {
        _draft: true,
        intro_fr: "Le Café des Orties, c'est le vrai cœur de la Petite-Nation. Installé dans un ancien presbytère de Ripon, c'est à la fois café, table à manger, galerie d'art, lieu de rencontre et carrefour intellectuel. On y va pour le café — et on y reste pour les conversations.",
        intro_en: "Le Café des Orties is the real heart of Petite-Nation. Set up in a former presbytery in Ripon, it's at once a café, a dining room, an art gallery, a gathering place, and an intellectual crossroads. You come for the coffee — and you stay for the conversations.",
        sections: [
            { title_fr: "La table", title_en: "The food",
              body_fr: "Mets bio de producteurs locaux, vins naturels, cidres artisanaux. La carte change avec les saisons et reflète ce que la région offre à un moment donné. Tout y est cohérent — du café au dessert.",
              body_en: "Organic dishes from local producers, natural wines, artisanal ciders. The menu shifts with the seasons and mirrors what the region offers at any given moment. Everything is coherent — from the coffee to dessert." },
            { title_fr: "Les murs", title_en: "The walls",
              body_fr: "Les murs sont une galerie tournante. Les artistes locaux y exposent à tour de rôle, et c'est souvent là qu'on découvre, en avance, les voix qui comptent dans la région.",
              body_en: "The walls are a rotating gallery. Local artists exhibit in turn — and it's often where you discover, ahead of the curve, the voices that matter in the region." },
            { title_fr: "Pourquoi c'est unique", title_en: "Why it's unique",
              body_fr: "Il n'y a pas d'équivalent dans la région. Aucun autre lieu ne combine cette qualité de produit, cet engagement local et cette densité humaine. C'est aussi proche d'un café littéraire parisien que la Petite-Nation peut produire — avec une authenticité que personne ne joue.",
              body_en: "There's no equivalent in the region. Nowhere else combines this product quality, this local commitment, and this density of people. It's the closest thing to a Parisian literary café that Petite-Nation can produce — with an authenticity nobody is performing." },
        ],
        faqs: [
            { q_fr: "Faut-il réserver ?", q_en: "Do I need a reservation?",
              a_fr: "C'est recommandé en haute saison et le week-end. Vérifiez sur leur page Facebook pour les heures d'ouverture courantes.",
              a_en: "Recommended in peak season and on weekends. Check their Facebook page for current hours." },
        ],
        schema: { type: "Restaurant", address: "Ripon, QC, Canada" },
    },

    'napoleon': {
        _draft: true,
        intro_fr: "Le Napoléon est le bistro intimiste du chef Antoine Meunier, à Montebello — une adresse pour les soirs où on a envie d'un repas qui compte. Tartare de canard, filet de bison, poutine au foie gras : la cuisine joue avec les classiques sans jamais perdre la rigueur du produit.",
        intro_en: "Le Napoléon is chef Antoine Meunier's intimate bistro in Montebello — an address for evenings when you want a meal that matters. Duck tartare, bison fillet, foie-gras poutine: the kitchen plays with classics without ever losing rigour around the product.",
        sections: [
            { title_fr: "La cuisine", title_en: "The cooking",
              body_fr: "Produits locaux et de saison, présentations soignées, service attentif. La carte évolue avec l'année. C'est le genre d'endroit où chaque assiette est pensée — et où on le sent.",
              body_en: "Local, seasonal products, careful presentation, attentive service. The menu shifts with the year. The kind of place where every plate is considered — and you can feel it." },
            { title_fr: "Le cadre", title_en: "The setting",
              body_fr: "Salle chaleureuse, intimiste, parfaite pour un repas en couple ou une petite tablée. Réservation fortement recommandée le week-end.",
              body_en: "A warm, intimate room — perfect for a couple or a small table. Reservation strongly recommended on weekends." },
        ],
        schema: { type: "Restaurant", address: "Montebello, QC, Canada" },
    },

    'boulanger': {
        _draft: true,
        intro_fr: "À Montpellier, Mélissa et Julien moulent leur propre farine de grains biologiques et cuisent des miches au levain sur commande. La Fille du Boulanger est ouverte vendredi et samedi — et c'est devenu le rituel sacré de tout un village.",
        intro_en: "In Montpellier, Mélissa and Julien mill their own flour from organic grains and bake sourdough loaves to order. La Fille du Boulanger is open Fridays and Saturdays — and it's become the sacred ritual of an entire village.",
        sections: [
            { title_fr: "Le pain", title_en: "The bread",
              body_fr: "Levain naturel, farines fraîchement moulues, cuissons au four à bois. Les miches ont une croûte épaisse, une mie alvéolée, une fermentation qu'on sent dès la première bouchée. C'est du pain qui se conserve, qui voyage, et qui transforme un repas.",
              body_en: "Natural sourdough, freshly milled flours, wood-oven baked. The loaves have a thick crust, an open crumb, a fermentation you taste at first bite. Bread that keeps, travels, and transforms a meal." },
            { title_fr: "Le rituel", title_en: "The ritual",
              body_fr: "Le samedi matin, on vient chercher son pain — et on croise tout le village. Commandez à l'avance pour être sûr d'en avoir.",
              body_en: "On Saturday morning, you come to pick up your bread — and you run into the whole village. Order ahead to be sure of getting some." },
        ],
        faqs: [
            { q_fr: "Comment commander ?", q_en: "How do I order?",
              a_fr: "Via le site lafilleduboulanger.ca ou directement à la boulangerie pendant les heures d'ouverture (vendredi et samedi).",
              a_en: "Through lafilleduboulanger.ca or directly at the bakery during opening hours (Friday and Saturday)." },
        ],
        schema: { type: "Bakery", address: "Montpellier, QC, Canada", openingHours: "Fr,Sa 08:00-14:00" },
    },

    'souche-i': {
        _draft: true,
        intro_fr: "Souche-i, à Montebello, occupe une maison centenaire au centre du village et propose une combinaison rare : restaurant asiatique et microbrasserie sous le même toit, avec une terrasse de 110 places qui prend tout son sens en été.",
        intro_en: "Souche-i, in Montebello, occupies a century-old house in the village centre and offers a rare combination: Asian restaurant and microbrewery under one roof, with a 110-seat terrace that comes into its own in summer.",
        sections: [
            { title_fr: "La table", title_en: "The food",
              body_fr: "Sushis, tartares, plats inspirés de l'Asie de l'Est. La cuisine est précise sans être prétentieuse. La carte de bières maison est solide et change régulièrement.",
              body_en: "Sushi, tartares, East-Asian-inspired dishes. The kitchen is precise without being precious. The house beer list is solid and rotates regularly." },
            { title_fr: "Le cadre", title_en: "The setting",
              body_fr: "Maison centenaire restaurée, ambiance chaleureuse, grande terrasse pour les soirs d'été. Idéal pour un repas en groupe ou une étape sur la route du Manoir Papineau.",
              body_en: "A restored century-old house, warm atmosphere, large terrace for summer evenings. Ideal for a group meal or a stop on the way to Manoir Papineau." },
        ],
        schema: { type: "Restaurant", address: "Montebello, QC, Canada" },
    },

    'pommes': {
        _draft: true,
        intro_fr: "Les Pommes Perdues, à Chénéville, est le projet de Julien Robert et Gilbert Bégin — une quête patiente pour retrouver, fermenter et embouteiller les pommes oubliées du Québec. Leurs cidres sont vifs, sauvages et profondément ancrés dans le terroir local.",
        intro_en: "Les Pommes Perdues, in Chénéville, is the project of Julien Robert and Gilbert Bégin — a patient quest to find, ferment, and bottle Quebec's forgotten apples. Their ciders are sharp, wild, and deeply rooted in the local terroir.",
        sections: [
            { title_fr: "La démarche", title_en: "The approach",
              body_fr: "Pommes anciennes, levures sauvages, fermentations longues. Chaque cuvée a sa propre signature. C'est une approche qui demande du temps et qui produit des cidres dont on se souvient.",
              body_en: "Heritage apples, wild yeasts, long fermentations. Each cuvée has its own signature. An approach that takes time and produces ciders you remember." },
            { title_fr: "Sur place", title_en: "On site",
              body_fr: "Dégustations, vente directe, et l'occasion de comprendre ce que devient une pomme oubliée quand quelqu'un prend la peine de la sauver.",
              body_en: "Tastings, direct sales, and a chance to understand what happens to a forgotten apple when someone takes the trouble to save it." },
        ],
        schema: { type: "Winery", address: "Chénéville, QC, Canada" },
    },

    'brasseur': {
        _draft: true,
        intro_fr: "Les Brasseurs de Montebello sont la microbrasserie de référence du village — bières de saison brassées localement, cuisine de pub, terrasse en saison. C'est l'arrêt naturel avant ou après le Manoir Papineau, et un bon point de chute pour traverser un après-midi.",
        intro_en: "Brasseurs de Montebello is the village's go-to microbrewery — seasonal beers brewed locally, pub-style food, a terrace in season. It's the natural stop before or after Manoir Papineau, and a good base for an afternoon.",
        sections: [
            { title_fr: "La bière", title_en: "The beer",
              body_fr: "Une carte qui tourne avec les saisons — IPA, lager, stout, et toujours quelques expérimentations en édition limitée. Demandez ce qui sort de la cuve : c'est souvent là que ça devient intéressant.",
              body_en: "A list that rotates with the seasons — IPA, lager, stout, and always a few limited-edition experiments. Ask what's just coming off — that's often where it gets interesting." },
            { title_fr: "L'ambiance", title_en: "The vibe",
              body_fr: "Pub chaleureux, public mélangé, musique parfois en direct. Un endroit où on entre pour une pinte et où on reste pour deux.",
              body_en: "A warm pub, mixed crowd, occasional live music. The kind of place you walk into for one pint and stay for two." },
        ],
        schema: { type: "BarOrPub", address: "Montebello, QC, Canada" },
    },

    // ─── EVENTS ──────────────────────────────────────────────────────────
    'medieval': {
        intro_fr: "Du 25 au 27 septembre 2026, le village de Montpellier en Petite-Nation devient un campement médiéval grandeur nature. Le Festival Médiéval de Montpellier (FMM) — opéré par une équipe bénévole de Le Salon des Inconnus — réunit marchands, musiciens, cavaliers, forgerons et clans vikings sur trois jours d'immersion totale.",
        intro_en: "From September 25 to 27, 2026, the village of Montpellier in Petite-Nation becomes a full-scale medieval encampment. The Festival Médiéval de Montpellier (FMM) — operated by a volunteer team from Le Salon des Inconnus — brings together merchants, musicians, riders, blacksmiths, and Viking clans for three days of total immersion.",
        sections: [
            { title_fr: "Ce qui vous attend", title_en: "What awaits you",
              body_fr: "Le festival déploie un marché médiéval avec ses boutiques d'artisans, un village jeunesse aux activités adaptées à chaque âge, des spectacles musicaux en direct, une clinique équestre avec démonstrations chevalines, des ateliers pédagogiques, un village gastronomique, et de grands banquets historiques. C'est un spectacle visuel et sonore hors du commun, conçu pour faire vivre l'époque plutôt que la raconter.",
              body_en: "The festival unfolds with a medieval marketplace lined with artisan boutiques, a youth village with age-appropriate activities, live music performances, an equestrian clinic with horse demonstrations, educational workshops, a food village, and grand historical banquets. It's a sight-and-sound spectacle designed to live the era rather than describe it." },
            { title_fr: "L'esprit du lieu", title_en: "The spirit of the place",
              body_fr: "Le FMM est porté par une équipe bénévole, ce qui transparaît dans chaque détail : l'attention portée aux costumes, la précision des reconstitutions, la chaleur de l'accueil. C'est un festival de communauté avant d'être un festival de scène — on y vient autant pour participer que pour regarder.",
              body_en: "The FMM is carried by a volunteer team, and it shows in every detail — the care given to costumes, the precision of the reenactments, the warmth of the welcome. It's a community festival before it's a stage festival — you come to take part as much as to watch." },
            { title_fr: "Pratique", title_en: "Practical info",
              body_fr: "Adresse : 4 rue du Bosquet, Montpellier (Québec). Billets disponibles via le portail Zeffy sur le site officiel. Forfaits de groupe et options d'hébergement disponibles. Le festival accepte également les demandes de bénévoles et les locations pour mariages historiques. Contact : admin@festivalmedievaldemontpellier.org · 514-418-3450.",
              body_en: "Address: 4 rue du Bosquet, Montpellier, Quebec. Tickets available through the Zeffy portal on the official site. Group packages and lodging options available. The festival also accepts volunteer applications and bookings for historical weddings. Contact: admin@festivalmedievaldemontpellier.org · 514-418-3450." },
            { title_fr: "À 15 minutes de l'Auberge", title_en: "15 minutes from the Inn",
              body_fr: "Le Salon des Inconnus se trouve à un quart d'heure de route. Beaucoup de festivaliers logent à l'Auberge le temps du week-end : on revient le soir d'un banquet, on prend un dernier verre au coin du feu, et le lendemain on repart pour les joutes. C'est, sans exagération, une des meilleures façons de vivre le festival.",
              body_en: "Le Salon des Inconnus is a fifteen-minute drive away. Many festival-goers stay at the Inn for the weekend: you come back in the evening from a banquet, share a last drink by the fire, and head out again the next morning for the jousts. It's, without exaggeration, one of the best ways to experience the festival." },
        ],
        faqs: [
            { q_fr: "Quand a lieu le festival en 2026 ?", q_en: "When is the 2026 festival?",
              a_fr: "Du 25 au 27 septembre 2026, à Montpellier (Québec).",
              a_en: "September 25 to 27, 2026, in Montpellier, Quebec." },
            { q_fr: "Comment acheter des billets ?", q_en: "How do I buy tickets?",
              a_fr: "Les billets sont vendus via le portail Zeffy, accessible depuis le site officiel festivalmedievaldemontpellier.org.",
              a_en: "Tickets are sold through the Zeffy portal, accessible from the official site festivalmedievaldemontpellier.org." },
            { q_fr: "Y a-t-il des activités pour enfants ?", q_en: "Are there activities for children?",
              a_fr: "Oui — un village jeunesse propose des activités adaptées à chaque tranche d'âge tout au long du week-end.",
              a_en: "Yes — a youth village offers age-appropriate activities throughout the weekend." },
            { q_fr: "Peut-on s'y rendre en groupe ?", q_en: "Can groups attend?",
              a_fr: "Des forfaits de groupe sont offerts; contactez admin@festivalmedievaldemontpellier.org pour les détails.",
              a_en: "Group packages are available; contact admin@festivalmedievaldemontpellier.org for details." },
            { q_fr: "Où loger pendant le festival ?", q_en: "Where to stay during the festival?",
              a_fr: "Plusieurs options d'hébergement existent à proximité, dont Le Salon des Inconnus à 15 minutes du site.",
              a_en: "Several lodging options exist nearby, including Le Salon des Inconnus, 15 minutes from the site." },
        ],
        schema: { type: "Festival", address: "4 rue du Bosquet, Montpellier, QC, Canada", phone: "+1-514-418-3450", lat: 45.8833, lng: -75.1500, openingHours: "2026-09-25/2026-09-27" },
    },

    'mechoui': {
        _draft: true,
        intro_fr: "Le Méchoui de Montpellier est un événement légendaire — une fête populaire bruyante, festive, pleine de fumée et de musique. Chaque été, tout le village s'arrête pour cet agape collectif. C'est une expérience culturelle intense, authentiquement québécoise, qui ne ressemble à aucune autre.",
        intro_en: "The Méchoui de Montpellier is a legendary event — a noisy, festive, smoke-and-music popular feast. Every summer, the entire village comes to a halt for this collective gathering. It's an intense, authentically Quebecois cultural experience that resembles nothing else.",
        sections: [
            { title_fr: "L'événement", title_en: "The event",
              body_fr: "Cuisson lente d'animaux entiers à la broche, longues tablées partagées, bières et vins, musique live, et cette qualité d'ambiance qu'on n'obtient que quand un village entier décide de fêter ensemble.",
              body_en: "Slow-roasted whole animals on the spit, long shared tables, beers and wines, live music, and that quality of atmosphere you only get when an entire village decides to celebrate together." },
            { title_fr: "Pourquoi y aller", title_en: "Why go",
              body_fr: "C'est une plongée immédiate dans la culture locale. Vous y croiserez agriculteurs, artistes, artisans, retraités, jeunes familles — tout le tissu humain de Montpellier en une après-midi.",
              body_en: "It's an instant dive into local culture. You'll meet farmers, artists, craftspeople, retirees, young families — the entire human fabric of Montpellier in a single afternoon." },
        ],
        schema: { type: "Event", address: "Montpellier, QC, Canada" },
    },

    'rodeo': {
        _draft: true,
        intro_fr: "Le Festival Western de Saint-André-Avellin est le seul rodéo professionnel de la région — un événement annuel qui attire plus de 200 cowboys et cowgirls, et qui transforme, chaque juillet, un coin de la Petite-Nation en arène, chapiteau, et piste de danse country.",
        intro_en: "The Festival Western de Saint-André-Avellin is the only professional rodeo in the region — an annual event drawing more than 200 cowboys and cowgirls, turning a corner of Petite-Nation, every July, into an arena, a big top, and a country dance floor.",
        sections: [
            { title_fr: "Le rodéo", title_en: "The rodeo",
              body_fr: "Monte de taureau, course aux tonneaux, lasso, monte de chevaux sauvages — toutes les disciplines classiques du rodéo nord-américain, dans un format pro et ouvert au public.",
              body_en: "Bull riding, barrel racing, roping, bronc riding — all the classic disciplines of North American rodeo, in a pro format open to the public." },
            { title_fr: "L'ambiance", title_en: "The atmosphere",
              body_fr: "Musique country sous chapiteau, ambiance familiale en journée et plus festive en soirée. C'est une plongée dans une facette du Québec rural qu'on ne soupçonne pas toujours.",
              body_en: "Country music under the big top, family-friendly during the day and more festive in the evenings. A dive into a side of rural Quebec you don't always suspect." },
        ],
        schema: { type: "Event", address: "Saint-André-Avellin, QC, Canada" },
    },

    'peche-blanche': {
        _draft: true,
        intro_fr: "En février, le lac Simon gelé se couvre de cabanes de pêche colorées. Le Tournoi de Pêche Blanche rassemble pêcheurs locaux et visiteurs dans une atmosphère festive et conviviale, entre deux percées dans la glace.",
        intro_en: "In February, frozen Lac Simon becomes a field of colourful fishing huts. The Tournoi de Pêche Blanche brings together local anglers and visitors in a festive, friendly atmosphere, between drillings through the ice.",
        sections: [
            { title_fr: "Le tournoi", title_en: "The tournament",
              body_fr: "Pêche au doré et au brochet à travers la glace, prix pour les plus belles prises, et tout un campement temporaire qui s'installe sur le lac pour le week-end. Cabanes chauffées disponibles à la location.",
              body_en: "Walleye and pike fishing through the ice, prizes for the biggest catches, and a whole temporary encampment that sets up on the lake for the weekend. Heated huts available for rent." },
            { title_fr: "L'ambiance", title_en: "The atmosphere",
              body_fr: "C'est aussi social que sportif. Entre deux ouvertures de trous, on partage un café, une bière, une histoire de pêche. C'est une bonne porte d'entrée à la culture hivernale de la région.",
              body_en: "It's as social as it is sporting. Between drilling holes, you share a coffee, a beer, a fishing story. A good gateway to the region's winter culture." },
        ],
        schema: { type: "Event", address: "Lac Simon, Duhamel, QC, Canada" },
    },

    // ─── WINTER ──────────────────────────────────────────────────────────
    'meute': {
        _draft: true,
        intro_fr: "La Meute Tanwen, à Montpellier, c'est la meute de huskies sibériens d'Éric Pichette. Pas une simple promenade en traîneau : ici, vous pilotez vous-même un attelage de quatre chiens à travers les sentiers forestiers vallonnés. L'expérience est intense, chaleureuse, et profondément marquante.",
        intro_en: "Meute Tanwen, in Montpellier, is Éric Pichette's pack of Siberian huskies. Not a simple sled ride: here, you drive a four-dog team yourself through rolling forest trails. The experience is intense, warm, and deeply memorable.",
        sections: [
            { title_fr: "L'expérience", title_en: "The experience",
              body_fr: "Briefing, harnachement, et c'est parti pour une heure de course en forêt. Les chiens tirent avec une joie pure; le contact humain-animal est immédiat et fort. Pas de spectacle, pas de mise en scène — juste vous, la meute, et la neige.",
              body_en: "Briefing, harnessing, and off you go for an hour of forest running. The dogs pull with pure joy; the human-animal contact is immediate and strong. No show, no staging — just you, the pack, and the snow." },
            { title_fr: "Pourquoi y aller", title_en: "Why go",
              body_fr: "Parce qu'aucune autre activité hivernale de la région n'a cette intensité. Et parce qu'Éric et son équipe traitent les chiens avec un respect qui se voit immédiatement.",
              body_en: "Because no other winter activity in the region has this intensity. And because Éric and his team treat the dogs with a respect you can see immediately." },
            { title_fr: "Pratique", title_en: "Practical info",
              body_fr: "Réservation obligatoire via tanwen.qc.ca. Saison : décembre à mars selon la neige. Habillez-vous très chaudement — le vent du traîneau est mordant.",
              body_en: "Booking required via tanwen.qc.ca. Season: December to March depending on snow. Dress very warmly — the wind on the sled is sharp." },
        ],
        faqs: [
            { q_fr: "Faut-il de l'expérience ?", q_en: "Do I need experience?",
              a_fr: "Non — un briefing complet est donné avant le départ, et les chiens connaissent les sentiers.",
              a_en: "No — a full briefing is given before departure, and the dogs know the trails." },
        ],
        schema: { type: "TouristAttraction", address: "Montpellier, QC, Canada" },
    },

    'patin': {
        _draft: true,
        intro_fr: "Quand le lac Simon gèle à cœur, il devient un terrain de jeu immense. Sentier de patin balisé sur des kilomètres, glissades naturelles dans les talus enneigés, grands espaces blancs où le vent siffle — c'est la version locale du paradis hivernal.",
        intro_en: "When Lac Simon freezes through, it becomes a huge playground. A marked skating trail running for kilometres, natural sliding hills in the snowy banks, vast white expanses where the wind whistles — the local version of winter paradise.",
        sections: [
            { title_fr: "Le sentier de patin", title_en: "The skating trail",
              body_fr: "Entretenu par les bénévoles du village, le sentier est gratuit et accessible toute la saison. Apportez vos patins, une lampe frontale pour les fins de journée, et un thermos.",
              body_en: "Maintained by village volunteers, the trail is free and accessible all season. Bring your skates, a headlamp for late afternoons, and a thermos." },
            { title_fr: "Au-delà du patin", title_en: "Beyond skating",
              body_fr: "Glissades, ski de fond improvisé, observation des chevreuils en lisière de forêt. C'est un endroit qui se prête à toutes les formes de jeu hivernal.",
              body_en: "Sliding, improvised cross-country skiing, deer-watching at the forest's edge. A place that lends itself to every form of winter play." },
        ],
        schema: { type: "TouristAttraction", address: "Lac Simon, Duhamel, QC, Canada" },
    },

    'namur': {
        _draft: true,
        intro_fr: "La patinoire de Namur est la plus tranquille des patinoires de la région. Petite, peu fréquentée, entretenue par la communauté — c'est l'endroit idéal pour glisser seul ou avec les enfants, sans la foule, dans un coin serein du village.",
        intro_en: "The Namur skating rink is the quietest in the region. Small, lightly used, community-maintained — the ideal spot to skate alone or with kids, no crowds, in a serene corner of the village.",
        sections: [
            { title_fr: "Le lieu", title_en: "The place",
              body_fr: "Glace soignée, éclairage nocturne, banc d'accueil. Pas de service, pas de commerce attenant — c'est ce qui en fait son charme. Apportez tout, repartez avec.",
              body_en: "Well-kept ice, night lighting, a welcome bench. No services, no shops attached — that's what gives it its charm. Bring everything, take it back with you." },
        ],
        schema: { type: "TouristAttraction", address: "Namur, QC, Canada" },
    },

    'chevreuils': {
        _draft: true,
        intro_fr: "Ce n'est pas vraiment une activité — c'est un moment. Prendre son café le matin en regardant par la fenêtre, voir les chevreuils traverser la propriété dans la neige fraîche, et ne plus bouger. La Petite-Nation offre cela en abondance.",
        intro_en: "It's not really an activity — it's a moment. Drinking your morning coffee by the window, watching deer cross the property in fresh snow, and not moving. Petite-Nation offers this abundantly.",
        sections: [
            { title_fr: "Où et quand", title_en: "Where and when",
              body_fr: "Tout au long de l'hiver, les chevreuils circulent à travers les propriétés forestières de Duhamel et des villages alentours. Tôt le matin et en fin de journée sont les meilleurs moments. Restez à l'intérieur, soyez patient, et le moment vient.",
              body_en: "All winter, deer move through the forest properties of Duhamel and the surrounding villages. Early morning and late afternoon are best. Stay inside, be patient, and the moment comes." },
        ],
        schema: { type: "TouristAttraction", address: "Duhamel, QC, Canada" },
    },

    // ─── SPRING ──────────────────────────────────────────────────────────
    'ti-mousse': {
        _draft: true,
        intro_fr: "Depuis 1977, l'Érablière chez Ti-Mousse, à Papineauville, fait du printemps québécois ce qu'il devrait être : un repas traditionnel à volonté, de la tire sur la neige, des balades en traîneau à chevaux, et l'odeur du sirop d'érable qui imprègne tout. C'est un passage obligé.",
        intro_en: "Since 1977, Érablière chez Ti-Mousse in Papineauville has made Quebec spring exactly what it should be: a traditional all-you-can-eat meal, taffy on snow, horse-drawn sleigh rides, and the smell of maple syrup soaked into everything. A must-do.",
        sections: [
            { title_fr: "Le repas", title_en: "The meal",
              body_fr: "Soupe aux pois, fèves au lard, oreilles de crisse, jambon à l'érable, omelettes, crêpes, tartes au sirop. C'est rustique, généreux, et conçu pour rassasier après une matinée passée dans la cabane à sucre.",
              body_en: "Pea soup, baked beans, crispy pork rinds, maple ham, omelettes, pancakes, syrup pies. Rustic, generous, and built to fill you up after a morning spent in the sugar shack." },
            { title_fr: "Le rituel", title_en: "The ritual",
              body_fr: "On termine par la tire sur la neige : du sirop bouilli versé sur la neige fraîche, qu'on enroule autour d'un bâton. C'est une tradition qui se transmet d'une génération à l'autre.",
              body_en: "You finish with maple taffy: boiled syrup poured on fresh snow and rolled onto a stick. A tradition passed from generation to generation." },
            { title_fr: "Quand y aller", title_en: "When to go",
              body_fr: "De fin février à fin avril, selon les conditions de coulée. Réservation fortement recommandée le week-end.",
              body_en: "Late February to late April, depending on the sap flow. Reservation strongly recommended on weekends." },
        ],
        schema: { type: "Restaurant", address: "Papineauville, QC, Canada", openingHours: "Sa,Su 10:00-19:00" },
    },

    'agricola': {
        _draft: true,
        intro_fr: "La Ferme Agricola, à Papineauville, est une coopérative de jeunes agriculteurs qui cultive 160 acres en bio certifié — légumes, asperges, herbes et fleurs coupées. Du printemps à l'automne, c'est l'une des principales sources de produits frais de la région.",
        intro_en: "Ferme Agricola, in Papineauville, is a young-farmer cooperative growing 160 acres in certified organic — vegetables, asparagus, herbs, and cut flowers. From spring to autumn, it's one of the region's main sources of fresh produce.",
        sections: [
            { title_fr: "L'ASC", title_en: "The CSA",
              body_fr: "Paniers hebdomadaires de saison, possibilité de récupération sur place ou dans plusieurs points de chute. Le format idéal pour manger local toute la saison.",
              body_en: "Weekly seasonal baskets, pickup on site or at several drop-off points. The ideal format for eating local all season." },
            { title_fr: "Sur les marchés", title_en: "At the markets",
              body_fr: "Présence régulière dans les marchés fermiers de la région à partir du printemps. Bon endroit pour rencontrer l'équipe et goûter avant de s'engager.",
              body_en: "Regular presence at the region's farmers' markets from spring onwards. A good place to meet the team and taste before signing up." },
        ],
        schema: { type: "Farm", address: "Papineauville, QC, Canada" },
    },

    'vezeau': {
        _draft: true,
        intro_fr: "Le Domaine Mont-Vézeau, à Ripon, c'est 9 000 pieds de vigne, deux hectares de fraises, des framboises, et — peut-être le meilleur — des pizzas au feu de bois servies sur la terrasse les fins de semaine. Un domaine où le terroir et l'accueil se rencontrent.",
        intro_en: "Domaine Mont-Vézeau, in Ripon, is 9,000 grape vines, two hectares of strawberries, raspberries, and — maybe best of all — wood-fired pizzas served on the terrace on weekends. A property where terroir meets hospitality.",
        sections: [
            { title_fr: "Le vignoble", title_en: "The vineyard",
              body_fr: "Vins rouges, blancs et rosés issus de cépages adaptés au climat québécois. Dégustations sur place, vente directe, et visites guidées en saison.",
              body_en: "Reds, whites, and rosés from grape varieties adapted to Quebec's climate. Tastings on site, direct sales, and guided tours in season." },
            { title_fr: "L'autocueillette", title_en: "Pick-your-own",
              body_fr: "Fraises et framboises en saison. C'est une activité familiale parfaite pour une matinée d'été.",
              body_en: "Strawberries and raspberries in season. A perfect family activity for a summer morning." },
            { title_fr: "La terrasse", title_en: "The terrace",
              body_fr: "Pizzas au feu de bois, vins du domaine, vue sur les vignes. Le bon plan d'un samedi soir d'été.",
              body_en: "Wood-fired pizzas, estate wines, view over the vines. The smart choice for a summer Saturday night." },
        ],
        schema: { type: "Winery", address: "Ripon, QC, Canada" },
    },

    'presquile': {
        _draft: true,
        intro_fr: "Le Parc national de Plaisance, sur la rivière des Outaouais, est un sanctuaire d'oiseaux : 265 espèces recensées, des migrations printanières spectaculaires de bernaches, et des sentiers en milieu humide qui offrent un point de vue rare sur l'écosystème de la vallée.",
        intro_en: "Parc national de Plaisance, on the Ottawa River, is a bird sanctuary: 265 recorded species, spectacular spring goose migrations, and wetland trails offering a rare window onto the valley's ecosystem.",
        sections: [
            { title_fr: "Les migrations", title_en: "The migrations",
              body_fr: "Au printemps, des milliers de bernaches font escale dans les marais du parc. Le spectacle est sonore autant que visuel — un événement à vivre au moins une fois.",
              body_en: "In spring, thousands of Canada geese stop in the park's marshes. The spectacle is as auditory as it is visual — an event to experience at least once." },
            { title_fr: "Sur place", title_en: "On site",
              body_fr: "Sentiers piétons et cyclables, location de kayaks et canots, observatoires d'oiseaux. Comptez une demi-journée pour bien profiter du parc.",
              body_en: "Walking and cycling trails, kayak and canoe rental, bird-watching towers. Plan a half-day to make the most of the park." },
        ],
        schema: { type: "TouristAttraction", address: "Plaisance, QC, Canada" },
    },

    // ─── MUST-SEE ────────────────────────────────────────────────────────
    'omega': {
        _draft: true,
        intro_fr: "Le Parc Omega, à Montebello, n'est pas un zoo — c'est un sanctuaire animalier de 2 200 acres traversé par un parcours de 12 kilomètres en voiture, où vous croisez élans, bisons, loups, cerfs et ours noirs dans un environnement qui ressemble à leur habitat naturel. C'est, sans exagération, un des lieux les plus singuliers d'Amérique du Nord.",
        intro_en: "Parc Omega in Montebello isn't a zoo — it's a 2,200-acre animal sanctuary crossed by a 12-kilometre drive-through circuit where you encounter elk, bison, wolves, deer, and black bears in an environment that resembles their natural habitat. Without exaggeration, one of the most singular places in North America.",
        sections: [
            { title_fr: "Le parcours en voiture", title_en: "The drive-through",
              body_fr: "Vous restez dans votre voiture, et les animaux viennent à vous. Élans qui s'approchent à hauteur de fenêtre, bisons qui traversent la route, loups visibles depuis des plateformes sécurisées. Le parcours dure environ 2 heures.",
              body_en: "You stay in your car and the animals come to you. Elk approaching at window height, bison crossing the road, wolves visible from secure platforms. The circuit takes about 2 hours." },
            { title_fr: "ONIRO, la nuit", title_en: "ONIRO, by night",
              body_fr: "En soirée, ONIRO transforme une partie du parc en parcours piétonnier nocturne illuminé. Forêt enchantée, jeux de lumière, rencontres avec les animaux dans une autre temporalité. C'est une expérience à part entière.",
              body_en: "At night, ONIRO turns part of the park into a lit pedestrian night walk. An enchanted forest, light play, animal encounters in a different temporality. An experience in itself." },
            { title_fr: "Pratique", title_en: "Practical info",
              body_fr: "Billets et horaires sur parcomega.ca. Comptez une journée complète si vous combinez le parcours en voiture et ONIRO. Saison : ouvert toute l'année avec offres saisonnières.",
              body_en: "Tickets and hours at parcomega.ca. Plan a full day if you combine the drive-through and ONIRO. Open year-round with seasonal programming." },
        ],
        faqs: [
            { q_fr: "Faut-il un véhicule personnel ?", q_en: "Do I need my own vehicle?",
              a_fr: "Oui pour le parcours principal. Le véhicule doit être en bon état; une visite à pied n'est pas possible sur ce circuit.",
              a_en: "Yes for the main circuit. The vehicle should be in good condition; walking the route isn't permitted." },
            { q_fr: "Convient-il aux enfants ?", q_en: "Is it kid-friendly?",
              a_fr: "Oui — c'est même l'une des activités préférées des familles dans la région.",
              a_en: "Yes — it's one of the most popular family activities in the region." },
        ],
        schema: { type: "Zoo", address: "Montebello, QC, Canada" },
    },

    'chutes': {
        _draft: true,
        intro_fr: "Les Chutes de Plaisance sont une cascade de 63 mètres sur la rivière Petite-Nation — puissante au printemps quand la rivière est gonflée, sculpturale en hiver quand elle gèle en formations cristallines. Le sentier qui mène aux belvédères raconte aussi l'histoire d'un village industriel disparu.",
        intro_en: "The Chutes de Plaisance are a 63-metre waterfall on the Petite-Nation River — powerful in spring when the river runs full, sculptural in winter when it freezes into crystalline formations. The trail leading to the lookouts also tells the story of a vanished industrial village.",
        sections: [
            { title_fr: "Les chutes", title_en: "The falls",
              body_fr: "Plusieurs belvédères offrent des angles différents. Le bruit est impressionnant au printemps; les couleurs en automne sont parmi les plus belles de la région.",
              body_en: "Several lookouts offer different angles. The sound is impressive in spring; the autumn colours are among the best in the region." },
            { title_fr: "North Nation Mills", title_en: "North Nation Mills",
              body_fr: "Au 19e siècle, un village industriel prospérait au pied des chutes : scieries, moulins, des centaines d'habitants. Il a disparu, mais des panneaux le long du sentier en retracent l'histoire.",
              body_en: "In the 19th century, an industrial village thrived at the foot of the falls: sawmills, grain mills, hundreds of residents. It vanished, but signs along the trail trace its history." },
        ],
        schema: { type: "TouristAttraction", address: "Plaisance, QC, Canada" },
    },

    'centre-de-vie': {
        _draft: true,
        intro_fr: "Le Centre de Vie, à Ripon, est un centre de retraite bien-être posé sur 108 acres de forêt — yoga, naturopathie, massothérapie, méditation, cures de jus, programmes de jeûne. Lac privé, sentiers en forêt, repas végétariens, sauna, et des espaces de repos avec foyers : c'est un lieu de ressourcement rare, à quelques minutes seulement de l'Auberge.",
        intro_en: "Centre de Vie, in Ripon, is a wellness retreat centre sitting on 108 acres of forest — yoga, naturopathy, massage therapy, meditation, juice cleanses, fasting programs. Private lake, forest trails, vegetarian meals, sauna, and rest spaces with fireplaces. A rare place to recharge, just minutes from the Inn.",
        sections: [
            { title_fr: "Les programmes", title_en: "The programs",
              body_fr: "Des séjours d'une journée aux retraites de plusieurs semaines. Cures de jus, jeûnes encadrés, programmes de yoga intensif, ou simplement des massages à la séance. Tout est conçu pour ralentir.",
              body_en: "From day visits to multi-week retreats. Juice cleanses, supervised fasts, intensive yoga programs, or simply per-session massages. Everything designed to slow you down." },
            { title_fr: "Le lieu", title_en: "The place",
              body_fr: "108 acres de nature, lac privé, foyers extérieurs, salles de méditation. L'environnement fait la moitié du travail : on s'y détend presque malgré soi.",
              body_en: "108 acres of nature, a private lake, outdoor fire pits, meditation rooms. The setting does half the work: you relax almost in spite of yourself." },
            { title_fr: "Combiner avec l'Auberge", title_en: "Combine with the Inn",
              body_fr: "Plusieurs visiteurs alternent : nuits à l'Auberge, journées au Centre. C'est une combinaison qui marche — l'un nourrit le corps social, l'autre le corps profond.",
              body_en: "Many visitors alternate: nights at the Inn, days at the Centre. It's a combination that works — one feeds the social body, the other the deeper one." },
        ],
        schema: { type: "HealthAndBeautyBusiness", address: "Ripon, QC, Canada" },
    },
};
