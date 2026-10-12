# -*- coding: utf-8 -*-
"""Le texte du plan d'affaires, en un seul endroit, partagé par la page interactive et le PDF.
Registre épistolaire, vouvoyé, pour la BDC et Tourisme Outaouais."""
from modele import M

def argent(n):
    return f"{int(round(n)):,}".replace(",", " ") + " $"

def nombre(n):
    return f"{int(round(n)):,}".replace(",", " ")

T, EF, P, S, R = M["T12"], M["EF"], M["PROJ"], M["SCENARIOS"], M["RENTA"]
an3, an5 = P[2], P[4]

HERO = dict(
    eyebrow="Plan d'affaires · Namur, Petite-Nation, Outaouais · 2027-2028",
    titre="Le Mini-Spa des Inconnus",
    sous="Un parcours thermal nordique au pied d'un manoir victorien, ouvert aux voyageurs de l'auberge comme aux visiteurs d'un jour, à moins de deux heures de Gatineau, d'Ottawa et de Montréal.",
    puces=[("445", "réservations en 12 mois"), (argent(T["revenus"]), "de revenus réalisés"), ("+45 %", "été 2026 sur été 2025"), (argent(M["TOTAL"]), "d'investissement en trois phases")],
)

AUJOURDHUI = dict(
    eyebrow="Ce qui existe déjà",
    titre="Une auberge qui a doublé en deux ans",
    prose=[
        "Le Salon des Inconnus occupe depuis 2014 un manoir victorien du 826, Côte-à-Favier, à Namur, sur cinq acres de jardins et de forêt dans la Petite-Nation. La société 9380-0589 Québec inc. l'exploite comme auberge d'artistes, avec quatre chambres dans la maison, une yourte, des mini-maisons et un autobus aménagé, soit neuf unités que les voyageurs réservent par Airbnb, Booking, Expedia et le site de l'auberge. L'établissement détient le permis CITQ 209613, valide jusqu'au 31 août 2027.",
        f"Les états financiers racontent une courbe simple : {argent(EF[2023][0])} de revenus en 2023, {argent(EF[2024][0])} en 2024, {argent(EF[2025][0])} en 2025, et une année 2026 qui dépasse déjà la précédente à l'intérim. Sur les douze derniers mois, le système de réservation compte {T['reservations']} réservations et {T['nuits']} nuits vendues pour {argent(T['revenus'])}, à un prix moyen de {T['adr']} $ la nuit. L'été 2026 a rapporté {argent(T['ete2026'])} contre {argent(T['ete2025'])} l'été précédent, une hausse de 45 % obtenue sans ajouter une seule unité.",
        "Un prêteur lira dans ces chiffres une demande réelle qui grandit plus vite que l'offre. L'aubergiste y lit autre chose : neuf unités occupées un cinquième de l'année laissent une marge immense, parce que chaque point d'occupation gagné rapporte sans rien coûter de plus. Le spa est l'outil qui transforme cette marge en revenu, et il donne à l'auberge un produit à vendre aux gens qui ne dorment pas sur place.",
    ],
    tuiles=[
        (argent(T["revenus"]), "Revenus réalisés", "12 derniers mois, système de réservation Hostaway"),
        (str(T["reservations"]), "Réservations", f"{T['nuits']} nuits vendues sur neuf unités"),
        (f"{T['adr']} $", "Nuit moyenne", "toutes unités confondues, manoir entier compris"),
        ("+45 %", "Été 2026 sur été 2025", f"{argent(T['ete2026'])} contre {argent(T['ete2025'])}"),
        (argent(EF[2025][0]), "Revenus 2025", f"après {argent(EF[2023][0])} en 2023 et {argent(EF[2024][0])} en 2024"),
        ("5 acres", "De jardins et de forêt", "lot 4 674 756, Namur, Petite-Nation"),
    ],
    graphique=dict(titre="Revenus mensuels de janvier 2025 à septembre 2026", sous="Réservations encaissées, par mois d'arrivée. Les trois mois d'été 2026 dépassent chacun le meilleur mois de 2025."),
)

PROJET = dict(
    eyebrow="Le projet",
    grand=argent(M["TOTAL"]),
    titre="Un spa nordique à l'échelle d'un manoir",
    prose=[
        "Le modèle existe déjà, à Lévis. Le Sento Spa a installé un parcours thermal d'inspiration japonaise autour d'une villa victorienne de 1904, à Breakeyville, et il vend l'accès à ses bains entre 44 $ et 59 $ depuis plus de dix ans. Le Salon des Inconnus possède la même matière première : une maison ancienne qui a du caractère, des jardins, la forêt tout autour, et une clientèle qui vient déjà chercher le calme.",
        "Le projet ajoute au domaine deux bains chauds en cèdre sous des pavillons de bois, un bain froid, un sauna sec finlandais et un sauna vapeur à l'eucalyptus, reliés par des terrasses de cèdre. La maison suit, avec quatre salles de bain refaites façon spa et vingt fenêtres de bois sur mesure, pour que l'intérieur tienne la promesse de l'extérieur. Les jardins ferment la marche avec des aires de détente et un pavillon quatre saisons.",
        "Le café et les bains ouvrent au public. Un couple de Gatineau qui monte pour la journée, une famille de Montebello, un groupe de Montréal en route vers Tremblant : tous trouvent à Namur ce qui n'existe encore nulle part dans la Petite-Nation, un spa nordique à taille humaine avec une table tenue par un chef.",
    ],
)

AVANT_APRES = dict(
    eyebrow="Avant et après",
    titre="Les mêmes lieux, vus en 2028",
    lead="Chaque image de droite part d'une photo réelle du domaine prise cette année. Les rendus montrent l'intention : la maison reste la même, et les installations viennent se poser autour d'elle.",
    items=[
        ("hiver", "Le bain à remous actuel, hiver 2026", "Deux bains de cèdre sous pavillon, bain froid de pierre, passerelles", "Phase 1"),
        ("ete", "Le jardin derrière la maison, été 2026", "Le parcours thermal en été, hamacs et chaises longues", "Phases 1 et 3"),
        ("bain", "Une salle de bain partagée du manoir", "La même pièce façon spa : ardoise, cèdre, douche à l'italienne", "Phase 2"),
        ("saunas", "La clairière de la yourte", "Le sauna finlandais et le sauna vapeur à l'eucalyptus", "Phase 1"),
        ("jardins", "Les jardins et les hémérocalles", "Le pavillon quatre saisons et les aires de détente", "Phase 3"),
        ("maison", "La façade, automne 2026", "Vingt fenêtres de bois neuves, la maison éclairée à l'heure bleue", "Phase 2"),
    ],
)

PHASES_TEXTE = {
    1: dict(
        intro="Le cœur thermal est la phase qui crée le produit. Dès qu'elle ouvre, l'auberge vend quelque chose qu'elle ne vendait pas : l'accès aux bains, à 55 $ en semaine et 65 $ la fin de semaine, aux visiteurs de passage comme aux clients des chambres, dont le tarif monte avec l'accès compris. Les massothérapeutes contractuels s'installent dans la foulée, parce que le massage pèse 46 % des revenus d'un spa québécois selon l'Association québécoise des spas.",
        plus_value="Le domaine passe d'auberge à destination. L'accès aux bains se vend 250 jours par année, l'hiver devient une saison pleine, et le prix des chambres monte de 184 $ à 235 $ la nuit en trois ans parce que l'accès au parcours thermal est compris.",
    ),
    2: dict(
        intro="La maison est la phase qui tient la promesse. Un client qui sort d'un bain de cèdre à 40 °C et qui remonte dans une salle de bain d'un autre âge ne revient pas; le même client, dans une pièce d'ardoise et de cèdre avec une douche à l'italienne, publie la photo. Les vingt fenêtres de bois sur mesure rendent au manoir son dessin d'origine, coupent la facture de chauffage et mettent l'intérieur au niveau de ce que le domaine offre dehors.",
        plus_value="Chaque dollar de cette phase entre dans la valeur du bâtiment, évaluée autour de 750 000 $ aujourd'hui. Des salles de bain et des fenêtres neuves sur un manoir de 1900 se retrouvent dans le prix de l'immeuble, dans la note des avis et dans le tarif des chambres.",
    ),
    3: dict(
        intro="Les jardins et le pavillon forment la phase qui allonge la saison et la journée. Le pavillon quatre saisons, avec son foyer de pierre et sa verrière, donne aux visiteurs un endroit où rester entre deux bains quand il pleut ou qu'il fait moins vingt, et il accueille les retraites de yoga, les journées d'équipe et les petits mariages que le manoir reçoit déjà l'été. Les sentiers, les hamacs et les plantations font des cinq acres une partie du parcours.",
        plus_value="Le pavillon est l'espace que les retraites et les groupes corporatifs demandent, et le manoir se loue déjà 1 600 $ la nuit en formule retraite. Les jardins aménagés font le tour des photos que les visiteurs partagent, et ils coûtent peu à entretenir une fois plantés.",
    ),
}

MARCHE = dict(
    eyebrow="Le marché",
    titre="Un marché qui paie de 44 $ à 155 $",
    prose=[
        "Les spas nordiques du Québec affichent leurs prix, et ils tiennent. Le Nordik de Chelsea, à une heure de Namur, demande 99 $ en semaine et 107 $ la fin de semaine et reçoit près de 230 000 visiteurs par année. Le Scandinave de Mont-Tremblant monte jusqu'à 155 $. Les spas de taille humaine, le Sento à Lévis et le Kōena à Gatineau, vendent l'entrée entre 39 $ et 64 $. Le Salon des Inconnus se place à 55 $ en semaine et 65 $ la fin de semaine, sous les grands spas et au-dessus des petits, avec le manoir et la table en plus.",
        "La Petite-Nation ne compte aucun spa nordique commercial, ni à Montebello, ni à Saint-André-Avellin, ni au Lac-Simon. La région, elle, se porte bien : l'Outaouais affiche un taux d'occupation de 60,8 % en 2024, contre 49 % dans les Laurentides, et ses nuitées réservées ont progressé d'environ 9 % au premier trimestre de 2025. Au bureau d'accueil de Montebello, le plus proche de Namur, 57 % des visiteurs viennent du Québec, 15,7 % arrivent de l'Ontario et un quart vient de l'international.",
        "Le touriste du bien-être dépense 175 % de plus que le touriste moyen, selon le Global Wellness Institute. Dans l'étude de l'Association québécoise des spas, un spa moyen reçoit 42 clients par jour de semaine et 57 le week-end, à 92 $ de dépense moyenne. Les projections de ce plan comptent 14 visiteurs par jour à la troisième année : le tiers d'un spa moyen, pour un domaine qui n'a pas de concurrent à moins d'une heure.",
    ],
    cartes=[
        ("Sento Spa, Lévis", "44 $ à 59 $", "Une villa victorienne de 1904 qui a reçu un onsen de pierre, des cuves de cèdre, un hammam à l'eucalyptus et un café. C'est le modèle de ce plan.", "sentospa.com/tarifs", "https://www.sentospa.com/tarifs"),
        ("Kōena Spa, Gatineau", "39 $ à 64 $", "Spa urbain, formule de soirée à 39 $, massage de 60 minutes à 125 $.", "koenaspa.com/en/rates", "https://koenaspa.com/en/rates/"),
        ("Nordik Spa-Nature, Chelsea", "99 $ à 107 $", "Dix bassins et neuf saunas qui reçoivent près de 230 000 visiteurs par année, à une heure de Namur.", "chelsea.lenordik.com", "https://chelsea.lenordik.com/en/frequently-asked-questions/"),
        ("Scandinave Spa, Mont-Tremblant", "105 $ à 155 $", "Le haut du marché, à deux heures de Namur par la 323.", "scandinave.com", "https://www.scandinave.com/mont-tremblant/rates"),
        ("Strøm, Vieux-Québec", "69 $ à 104 $", "Groupe de dix établissements, 22 M$ investis à Saint-Sauveur pour 2026.", "stromspa.com", "https://www.stromspa.com"),
        ("Le Mini-Spa des Inconnus", "55 $ à 65 $", "Le seul spa nordique de la Petite-Nation, avec les chambres du manoir et la table du chef.", "lesalondesinconnus.com", "https://www.lesalondesinconnus.com"),
    ],
)

CHIFFRES = dict(
    eyebrow="Les chiffres",
    titre="Cinq ans de projections",
    lead="Les projections partent des chiffres réels de 2026 et avancent avec des hypothèses prudentes, écrites noir sur blanc. L'année 2027 est l'année du chantier : les bains ouvrent en novembre, et la BDC ne demande que les intérêts pendant les travaux.",
    hypotheses=[
        ("Nuits vendues", f"{T['nuits']} aujourd'hui, 720 en 2027, 1 050 en 2029, 1 200 en 2031, soit 37 % d'occupation sur neuf unités"),
        ("Prix moyen de la nuit", f"{T['adr']} $ aujourd'hui, 235 $ en 2029 avec l'accès aux bains compris, sous les 169 $ à 190 $ que les voisins demandent sans spa"),
        ("Visiteurs du public", "7 par jour en 2027, 11 en 2028, 14 en 2029, 250 jours par année, à 59 $ en moyenne"),
        ("Massages", "520 séances en 2028 et 800 en 2029, données par des massothérapeutes contractuels; l'auberge garde 40 % du prix de 115 $"),
        ("Café et retraites", "Un café à 35 % de marge, et des retraites qui passent de 18 000 $ à 48 000 $ en trois ans"),
        ("Charges", "Préposés à 86 000 $ en 2029, charges comprises, rémunération de la direction, énergie des bassins à 25 000 $, analyses de laboratoire aux deux semaines, marketing"),
    ],
    graphique1=dict(titre="Revenus projetés par source, 2027 à 2031", sous="Le graphique empile les cinq sources de revenus, de l'hébergement jusqu'aux retraites."),
    graphique2=dict(titre="Bénéfice d'exploitation et service de la dette", sous="Le bénéfice avant intérêts, impôts et amortissement couvre la dette totale, ancienne et nouvelle, dès 2028."),
)

FINANCEMENT = dict(
    eyebrow="Le financement",
    titre="Trois scénarios, selon le montant financé",
    lead="Le plan se découpe pour que la banque choisisse l'ampleur. Chaque scénario tient debout seul, et le scénario complet est celui que le domaine recommande, parce que les trois phases se renforcent.",
    montage_titre="Le montage recommandé",
    montage=[
        ("Prêt BDC pour terrains et bâtiments commerciaux", argent(M["FIN"]["bdc"]), "amortissement sur 20 ans, intérêts seulement pendant le chantier de 2027, garantie sur l'immeuble"),
        ("Tourisme Outaouais, PDTO 2025-2027, catégorie Hébergement", argent(M["FIN"]["pdto"]), "contribution non remboursable, plafonnée à 90 000 $ et à 25 % des coûts admissibles"),
        ("Mise de fonds du promoteur", argent(M["FIN"]["mise_de_fonds"]), "honoraires de plan et d'études déjà engagés, travaux en régie"),
    ],
    prose=[
        f"L'annuité du prêt BDC s'établit à {argent(M['annuite_bdc'])} au taux de 7,75 % sur vingt ans. La dette actuelle du domaine, {argent(M['DETTE']['solde'])} à la Banque Nationale, reste en place et son service de {argent(M['DETTE']['service_annuel'])} par année est compris dans les projections. Le bénéfice d'exploitation couvre l'ensemble {P[1]['dscr']} fois en 2028 et {an3['dscr']} fois en 2029.",
        "L'immeuble porte le prêt. Le manoir et ses cinq acres valent autour de 750 000 $ avant les travaux, pour une dette de 278 414 $, et chaque dollar de la phase 2 entre directement dans la valeur du bâtiment. Le prêt pour équipement de la BDC, qui couvre jusqu'à 125 % du prix des bains, des saunas et de la filtration sur douze ans, peut remplacer une partie du prêt immobilier si la banque préfère cette structure.",
    ],
)

PARTENAIRES = dict(
    eyebrow="Les partenaires",
    titre="Une table, une région, une adresse",
    mapchef=dict(
        titre="MapChef, la table du domaine",
        prose="Marc-Alexis Pepin, chef consultant et frère de l'aubergiste, signe déjà les repas des retraites et des séjours corporatifs du manoir sous la bannière MapChef. Le café ouvert au public et les forfaits Nuit et Table, à 120 $ par personne, passent par sa cuisine, qui sert une soupe et un bol repas le midi, des tisanes entre deux bains et une table d'hôte le soir pour les clients des chambres. Son site présente son parcours et ses menus.",
        url="https://mapchef.ca", image="mapchef.jpg",
    ),
    outaouais=dict(
        titre="Tourisme Outaouais",
        prose="Le projet répond à trois priorités du Programme de développement touristique de l'Outaouais 2025-2027 : hausser le niveau de qualité d'un hébergement existant, bâtir une offre hivernale qui résiste aux saisons, et ajouter une expérience de nature et de patrimoine dans la Petite-Nation. La demande sera déposée dans la catégorie Hébergement, avec ce plan et les soumissions des fournisseurs en appui.",
    ),
    sites=[
        ("Le Salon des Inconnus", "L'auberge, les chambres, la yourte et le manoir entier", "https://www.lesalondesinconnus.com", "salon.jpg"),
        ("Forfaits et retraites", "Les séjours de groupe et les forfaits du domaine", "https://www.lesalondesinconnus.com/forfaits", "salon-forfaits.jpg"),
        ("Entreprises", "Journées d'équipe et retraites corporatives au manoir", "https://www.lesalondesinconnus.com/entreprises", "salon-entreprises.jpg"),
    ],
)

CALENDRIER = dict(
    eyebrow="Le calendrier",
    titre="Dix-huit mois jusqu'aux jardins",
    jalons=[
        ("Hiver 2026-2027", "Soumissions et permis", "Trois soumissions par poste, confirmation de l'usage auprès de Namur, dépôt à la BDC et à Tourisme Outaouais."),
        ("Printemps et été 2027", "Le cœur thermal", "Les tranchées, la filtration, les bassins, les saunas, les terrasses et le vestiaire se construisent pendant que l'auberge reste ouverte."),
        ("Novembre 2027", "Ouverture des bains", "Le parcours thermal ouvre au public pour la saison d'hiver, la plus demandée dans les spas nordiques."),
        ("2028", "La maison et les jardins", "Salles de bain et fenêtres pendant l'hiver, pavillon et aires de détente pour l'été 2028."),
    ],
    prevu_titre="Ce que le plan a prévu",
    prevu=[
        ("L'eau", "Les bassins publics suivent le règlement Q-2, r. 39 : filtration en continu, dosage automatique, analyses en laboratoire accrédité aux deux semaines, registre affiché. Le budget de la phase 1 comprend ces systèmes et le plan d'exploitation nomme un préposé formé."),
        ("Le zonage", "L'ouverture au public d'un spa et d'un café se confirme auprès de la municipalité de Namur avant le premier dessin, et le projet se dépose aux programmes seulement une fois l'usage attesté."),
        ("Les coûts", "Chaque poste reçoit trois soumissions avant le chantier, et chaque phase porte 10 % d'imprévus. Les phases 2 et 3 attendent que la phase 1 encaisse."),
        ("La saison", "Un spa nordique vend d'abord l'hiver, ce qui est la saison creuse de l'auberge aujourd'hui. Le projet remplit les mois que les chambres remplissent le moins."),
        ("Les gens", "Les massothérapeutes travaillent à contrat, les préposés viennent du village, et la famille tient déjà l'accueil, la cuisine et l'entretien depuis 2014."),
        ("L'exploitant", "Douze ans d'exploitation continue, un permis CITQ en règle, des avis publics sur quatre plateformes et des revenus qui doublent sans investissement : le projet s'appuie sur une entreprise qui tourne."),
    ],
)

PIED = dict(
    entreprise="9380-0589 Québec inc., exploitant Le Salon des Inconnus",
    adresse="826, Côte-à-Favier, Namur (Québec) J0V 1N0",
    contact="Alex Turcot St-Laurent, propriétaire et aubergiste · 514 418-3450 · alex@lesalondesinconnus.com",
    citq="Permis CITQ 209613 · Plan préparé en octobre 2026",
    colophon="Les rendus avant-après sont des intentions de design produites à partir de photos réelles du domaine; les plans d'architecte et les soumissions des fournisseurs les préciseront. Les chiffres de marché portent leur source. Les projections reposent sur les hypothèses écrites dans ce document.",
)

SOURCES = [
    ("Sento Spa, tarifs et installations", "https://www.sentospa.com/tarifs"),
    ("Nordik Spa-Nature, foire aux questions", "https://chelsea.lenordik.com/en/frequently-asked-questions/"),
    ("Scandinave Spa Mont-Tremblant, tarifs", "https://www.scandinave.com/mont-tremblant/rates"),
    ("Kōena Spa, tarifs", "https://koenaspa.com/en/rates/"),
    ("Association québécoise des spas, étude 2014 (ITHQ)", "https://m3.ithq.qc.ca/collection/00000514.pdf"),
    ("Tourisme Outaouais, rapport annuel 2024-2025", "https://admin.tourismeoutaouais.com/api/documents/file/rapport-annuel-2024-2025-web.pdf"),
    ("PDTO 2025-2027, guide de la catégorie Hébergement", "https://admin.tourismeoutaouais.com/api/documents/file/guide-pdto-2025-2027-hebergement.pdf"),
    ("BDC, prêt pour terrains et bâtiments commerciaux", "https://www.bdc.ca/fr/financement/pret-terrains-batiments-commerciaux"),
    ("BDC, prêt pour équipement", "https://www.bdc.ca/fr/financement/pret-equipement"),
    ("Global Wellness Institute, tourisme de bien-être", "https://www.skininc.com/home/news/22884858/global-wellness-institute-global-wellness-tourism-market-projected-to-reach-1-trillion-in-2024"),
    ("Ministère de l'Environnement, spas publics, bonnes pratiques", "https://www.environnement.gouv.qc.ca/eau/piscine/entretien-controle-spaspublics.pdf"),
    ("Soumission Rénovation, salles de bain et fenêtres 2026", "https://soumissionrenovation.ca/fr/blogue/prix-renovation-salle-de-bain-au-quebec-en-2026-combien-prevoir-selon-votre-projet"),
]
