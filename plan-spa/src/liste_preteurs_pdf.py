# -*- coding: utf-8 -*-
"""Où financer le Mini-Spa : une fiche par organisme, avec la marche à suivre pour appliquer.
Même canon parchemin que le plan (pdf.CSS). Produit le PDF et la note Markdown d'Onyx depuis les mêmes données.
Usage : python3 liste_preteurs_pdf.py <sortie.pdf> [sortie.md]"""
import pathlib, subprocess, sys, json, asyncio
import pdf
e = pdf.e
SRC = pathlib.Path(__file__).resolve().parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

LEAD = ("Seize portes, classées dans l'ordre où elles entrent dans le montage de 530 000 $ : les subventions d'abord, parce qu'elles réduisent l'emprunt, "
        "les prêts publics ensuite, le prêteur principal qui porte le gros du montant, puis les compléments. Chaque fiche dit combien, à quelles conditions, "
        "qui joindre et quoi faire, geste par geste. Les chiffres viennent des pages officielles lues le 14 octobre 2026; « non publié » veut dire que l'organisme ne le dit pas en ligne et qu'il faut le demander à l'appel.")

FICHES = [
 dict(rang=1, nom="BDC, Banque de développement du Canada", prog="Prêt pour immobilier commercial", role="Le prêteur principal : 420 000 $",
  quoi="Prêt à terme garanti sur l'immeuble, jusqu'à 100 % du coût du projet selon le dossier, amorti sur 25 ans au plus, intérêts seulement jusqu'à 36 mois au début. Taux et frais non publiés, fixés au dossier.",
  conditions="Entreprise active au Canada depuis 24 mois et plus, rentable ou sur une voie claire vers la rentabilité, bon dossier de crédit de l'entreprise et du propriétaire, plan d'affaires avec projections réalistes. Garantie : la propriété, parfois une caution personnelle ou de la société. Exclus : écoles privées, résidences pour aînés, projets zonés résidentiels.",
  contact="Centre d'affaires Outaouais, 200, rue Montcalm, bureau 301, Gatineau J8Y 3B5 · 819 997-4435 · 1 877 232-2269 · aucun conseiller nommé en ligne",
  comment=["Remplir le formulaire « Discutez de l'admissibilité de votre projet » (cinq étapes, aucun impact sur le crédit) : il réserve un appel gratuit de dix minutes avec un spécialiste en prêts hypothécaires commerciaux. Tout est prérempli dans le document « La demande à la BDC ».",
           "À l'appel, décrire le projet avec le réalisé en premier (445 réservations, 121 118 $ d'hébergement sur douze mois) et demander la liste des pièces et une rencontre à Gatineau.",
           "Créer l'Espace client (client.bdc.ca) : c'est là que les pièces se téléversent, que les consentements se signent et que l'offre s'accepte.",
           "Déposer les pièces de sa liste, ligne par ligne; l'analyste consulte le bureau de crédit, fait évaluer l'immeuble et émet une lettre d'intention, visée avant le 15 décembre 2026."],
  pieces="États financiers 2023 à 2025 et intérimaires 2026, plan d'affaires, prévisionnel, bilan personnel, pièce d'identité, chèque annulé de l'entreprise, données du registre des entreprises; après dépôt, selon le dossier : soumissions, évaluation de l'immeuble, rapport environnemental de phase 1.",
  quand="Formulaire cette semaine; rencontre du 26 octobre au 6 novembre; lettre d'intention avant le 15 décembre 2026.",
  url="https://www.bdc.ca/fr/financement/pret-terrains-batiments-commerciaux"),
 dict(rang=2, nom="Tourisme Outaouais", prog="PDTO 2025-2027, catégorie Hébergement", role="La subvention : 90 000 $, jusqu'à 150 000 $ avec la bonification",
  quoi="Contribution non remboursable, 25 % des coûts admissibles au plus, plafond de 90 000 $, bonification possible de 25 % jusqu'à 60 000 $ pour un projet structurant qui touche au moins trois objectifs régionaux (l'offre hivernale et l'hébergement expérientiel en sont deux). Coûts admissibles d'au moins 25 000 $.",
  conditions="Mise de fonds du promoteur de 50 % des coûts totaux pour une entreprise à but lucratif (à demander si un prêt commercial compte), cumul des aides publiques plafonné à 50 %, projet non commencé, appel d'offres public pour tout contrat de construction de 100 000 $ et plus. Exclus : restauration, alcool, fonds de roulement, service de la dette.",
  contact="Jeremy Howard, conseiller en développement économique, 819 576-3164, jhoward@tourisme-outaouais.ca · dépôts : programmes@tourisme-outaouais.ca · 103, rue Laurier, Gatineau J8X 3V8, 819 778-2222",
  comment=["Appeler Jeremy Howard avec trois questions : Hébergement ou Attraits pour un spa ajouté à une auberge, un prêt commercial compte-t-il dans la mise de fonds de 50 %, et quand s'ouvre le prochain dépôt.",
           "Après l'appel, Véronica envoie le sommaire et le lien du plan; le volet et la date fixent la suite.",
           "Remplir le formulaire Excel du volet, écrire le plan marketing et la politique de développement durable (exigés par le guide), faire confirmer la mise de fonds par le comptable.",
           "Déposer par courriel à programmes@tourisme-outaouais.ca; la contribution se verse sur réclamation, après les dépenses."],
  pieces="Formulaire Excel signé, plan d'affaires avec liste des permis, plan marketing, politique et plan d'action en développement durable, confirmation de la mise de fonds, états financiers des deux dernières années et intérimaires, prévisions sur trois ans, résolution du conseil d'administration.",
  quand="Appel d'ici le 23 octobre; le guide Hébergement ne fixe pas de date limite (un agrégateur le dit ouvert en continu, non confirmé); le dépôt suit les soumissions, à l'hiver 2026-2027.",
  url="https://admin.tourismeoutaouais.com/api/documents/file/guide-pdto-2025-2027-hebergement.pdf"),
 dict(rang=3, nom="Investissement Québec, division tourisme", prog="PADAT, volet 1 (attraits) ou volet 2 (établissements hôteliers)", role="Le prêt public patient, jusqu'à 50 % des dépenses",
  quoi="Prêt ou garantie de prêt jusqu'à 50 % des dépenses admissibles, minimum de 150 000 $ au volet 1 et de 100 000 $ au volet 2, durée jusqu'à 25 ans, moratoire de capital jusqu'à 3 ans, frais d'étude de 0,5 %. Taux fixe sur les obligations du Québec ou variable sur le préférentiel d'IQ. Les honoraires du plan d'affaires sont admissibles jusqu'à deux ans avant la demande.",
  conditions="Financement privé d'au moins 20 %, cumul des aides publiques de 50 % au plus, projet ni commencé ni engagé avant le dépôt, offre ou lettre d'intention d'un autre prêteur exigée au dépôt, numéro CITQ et fiche sur BonjourQuébec. Volet 1 : quatre critères éliminatoires (pertinence, retombées, profil durable, faisabilité) et avis sectoriel du ministère du Tourisme.",
  contact="Conseiller tourisme (nom non publié) · 1 866 870-0437 · IQTourisme@invest-quebec.com · le contact préalable est recommandé par la page",
  comment=["Appeler la division tourisme avant tout dépôt : un seul dossier de 530 000 $ pour les trois phases est-il accepté, le cumul de 50 % inclut-il le PDTO et le FLI, une lettre d'intention de la BDC suffit-elle.",
           "Télécharger le formulaire PDF du volet confirmé et le remplir dans Adobe Reader.",
           "Réunir la liste officielle, y compris la lettre d'intention de la BDC et les états financiers personnels de l'actionnaire.",
           "Transmettre le dossier complet à IQTourisme@invest-quebec.com avant le 31 décembre 2026; un dossier incomplet n'est pas examiné."],
  pieces="Formulaire du volet, plan d'affaires avec sommaire, états financiers des trois dernières années, intérimaires, prévisions de l'exercice en cours et du suivant, budget de caisse, listes chronologiques des comptes clients et fournisseurs, offre ou lettre d'intention d'un autre prêteur, soldes des prêts à terme, états financiers personnels de l'actionnaire, engagement de développement durable, soumissions et liste d'équipements.",
  quand="Demande reçue avant le 31 décembre 2026; projet débuté dans les six mois de l'approbation, terminé en deux ans, déboursés finaux au plus tard le 31 mars 2029.",
  url="https://www.quebec.ca/tourisme-et-loisirs/services-industrie-touristique/aide-financiere/programme-appui-au-developpement-attraits-touristiques/developpement-attraits"),
 dict(rang=4, nom="MRC de Papineau", prog="Réseau accès PME, FLI et FLS, fonds de la Politique de soutien, FRR volet 3", role="L'entrée gratuite et le complément : jusqu'à 150 000 $ + 100 000 $",
  quoi="Fonds local d'investissement jusqu'à 150 000 $ (50 % des dépenses admissibles) et fonds local de solidarité jusqu'à 100 000 $, qui investissent généralement ensemble; prêt à terme sur 7 ans, jusqu'à 10 ans avec moratoire, moratoire de capital et d'intérêts jusqu'à 24 mois pour une expansion; taux de 4 % plus une prime de risque de 1 à 7 %, plus 1 % au-delà de 60 mois. Petits fonds non remboursables de 5 000 $ (experts-conseils, horizon durable, numérique, tremplin) pour les études et le plan de durabilité.",
  conditions="Avoir net de l'entreprise après projet d'au moins 20 % (jamais moins de 15 %), cumul des aides de 70 % au plus, lien avec les priorités du territoire (le tourisme durable en est une). Namur figure parmi les municipalités admissibles au FRR volet 3.",
  contact="Catherine Jardon, conseillère aux entreprises, 819 427-6243 poste 1414, c.jardon@mrc-papineau.com · Andréane Sabourin, agente de développement rural (FRR volet 3), poste 1407 · 266, rue Viger, Papineauville J0V 1R0",
  comment=["Appeler Catherine Jardon : l'accompagnement est gratuit et confidentiel, et elle connaît Tourisme Outaouais et Investissement Québec.",
           "Demander si le FLI et le FLS acceptent un second rang derrière la Banque Nationale, les pièces exigées et le délai du comité.",
           "Déposer au Fonds experts-conseils (5 000 $) pour payer le plan de durabilité qu'exige le PDTO.",
           "Rencontrer Andréane Sabourin pour voir si une portion du projet entre au FRR volet 3."],
  pieces="Non publiées; la MRC demande un document d'analyse et un lien avec ses priorités. Prévoir le plan, les états financiers et le prévisionnel.",
  quand="Appel d'ici le 23 octobre; le FLI et le FLS complètent le montage une fois les étapes BDC, PDTO et PADAT connues.",
  url="https://mrcpapineau.com/services/prets-subventions/"),
 dict(rang=5, nom="Desjardins Entreprises Outaouais", prog="Prêt commercial, avec ou sans la garantie fédérale du PFPEC", role="La seconde offre, pour négocier le taux",
  quoi="Centre de services aux entreprises avec gestionnaires de comptes pour les marchés commercial et immobilier. Sous le PFPEC, la banque prête jusqu'à 1 000 000 $ pour l'immobilier sur 15 ans au plus, avec la garantie fédérale de 85 %; taux maximal préférentiel + 3 %, frais d'enregistrement de 2 % et frais annuels de 1,25 % du solde. Taux, durées et critères propres à Desjardins non publiés.",
  conditions="Celles d'un prêt commercial : capacité de remboursement, historique, mise de fonds, garantie sur l'immeuble. La caisse de la Petite-Nation et du Lièvre (Papineauville, 819 986-1551) sert de porte d'entrée.",
  contact="880, boulevard de la Carrière, bureau 100, Gatineau J8Y 6T5 · 819 778-1400 · 1 888 233-2473 · formulaire sur desjardins.com",
  comment=["Appeler le centre Desjardins Entreprises et demander un gestionnaire de comptes immobilier commercial.",
           "Présenter la même demande qu'à la BDC, avec le sommaire et le lien du plan.",
           "Mettre les deux offres côte à côte : deux offres donnent un prix à négocier, une seule donne un prix à accepter."],
  pieces="Les mêmes que pour la BDC : états financiers, intérimaires, plan, prévisionnel, bilan personnel, relevés des prêts en cours.",
  quand="Du 26 octobre au 6 novembre, en parallèle de la BDC.",
  url="https://www.desjardins.com/fr/nous-trouver/desjardins-entreprises/outaouais.html"),
 dict(rang=6, nom="Banque Nationale", prog="Hypothèque actuelle, refinancement à 4 % en cours", role="Reste au premier rang; aucune demande pour le spa",
  quoi="L'hypothèque du 826 reste au premier rang et son refinancement à 4 % est en cours; il ramènerait le service de 30 054 $ à 20 310 $ par année. La banque offre aussi le PFPEC, mais ce canal ne sert pas au spa.",
  conditions="Le dossier de refinancement avance sur ses propres pièces; le projet de spa ne s'y mêle pas, et le nouveau prêteur prend le second rang.",
  contact="Euplio Junior La Mendola, 514 281-9600 poste 18035, eupliojunior.lamendola@bnc.ca (dossier du refinancement)",
  comment=["Terminer le refinancement à 4 % avant le 1er décembre 2026, fin du terme ouvert.",
           "Fournir au nouveau prêteur, quand il le nomme, le relevé du terme en cours; rien d'autre ne traverse d'un dossier à l'autre."],
  pieces="Aucune pour le spa.", quand="Terme ouvert jusqu'au 1er décembre 2026.", url="https://www.nbc.ca/fr/entreprises/centre-aide/gestion-entreprise/financement/programme-financement-pe.html"),
 dict(rang=7, nom="SADC de Papineau-Collines", prog="Financement aux petites entreprises, Stratégie Verte, GoFin", role="Capital complémentaire pour la mise de fonds",
  quoi="Prêts souvent subordonnés, montants et taux actuels non publiés (un ancien programme allait jusqu'à 300 000 $ avec moratoire de six mois, mais c'était une mesure de pandémie). Outil gratuit GoFin de recherche de financement.",
  conditions="Petite entreprise du territoire de la SADC; un volet vert pourrait toucher la récupération de chaleur des bassins.",
  contact="Jean-Denis Deschênes, analyste financier, 819 986-1747 poste 202 · Chloé Gagnon, directrice générale · info@sadcpapineau.ca · 104, rue Maclaren Est, bureau 218, Gatineau J8L 1K1",
  comment=["Remplir le formulaire « Parlez-nous de votre projet » du site, puis appeler l'analyste pour les plafonds actuels.",
           "Demander si un prêt subordonné peut compter comme mise de fonds aux yeux de la BDC et du PDTO."],
  pieces="Non publiées; prévoir le sommaire, le plan et les états financiers.", quand="Après les trois appels d'exploration, en novembre.", url="https://sadcpapineau.ca"),
 dict(rang=8, nom="Développement économique Canada (DEC), bureau Outaouais", prog="Appui ciblé aux MRC économiquement vulnérables", role="À vérifier : un prêt sans intérêt changerait le coût du montage",
  quoi="Contribution jusqu'à 75 % des coûts admissibles, généralement remboursable, sans intérêt et sans garantie, remboursement qui débute deux ans après la fin du projet. Le Programme pour la croissance du tourisme est fermé.",
  conditions="Les huit MRC aux conditions bonifiées en Outaouais sont Pontiac et Vallée-de-la-Gatineau; la présence de Papineau parmi les 75 MRC à faible potentiel de croissance n'est pas confirmée en ligne.",
  contact="165, rue de l'Hôtel-de-Ville, Gatineau J8X 0A3 · 1 800 561-0633 · rendez-vous en personne ou virtuels · aucun conseiller nommé",
  comment=["Appeler le bureau et demander si la MRC de Papineau est admissible à l'appui ciblé.",
           "Si oui, demander le formulaire et la liste des pièces; sinon, fermer la porte et passer à la suivante."],
  pieces="Formulaires sur canada.ca, selon le programme confirmé.", quand="Un appel en novembre.", url="https://www.canada.ca/fr/developpement-economique-regions-quebec/financement-services/appui-cible-aux-mrc-economiquement-vulnerables-du-quebec.html"),
 dict(rang=9, nom="Hydro-Québec", prog="Solutions efficaces (entreprises), outil OSE", role="Aide à l'équipement de chauffage des bassins",
  quoi="Aide financière aux mesures d'efficacité énergétique commerciales (thermopompes, récupération de chaleur, analyse énergétique); un agrégateur parle d'une aide jusqu'à 90 % des dépenses admissibles pour l'option personnalisée, mais la page officielle n'a pas pu être lue et le volet thermopompes pour entreprises y est affiché fermé.",
  conditions="La demande se fait avant l'achat de l'équipement, sinon le projet est inadmissible; l'outil OSE 6.0 est en vigueur depuis le 31 mars 2026.",
  contact="Hydro-Québec affaires, service aux entreprises (numéro sur la facture d'électricité du 826)",
  comment=["Appeler avant de commander la filtration et le chauffage des bassins; décrire la récupération de chaleur prévue.",
           "Si une mesure est ouverte, calculer et déposer dans l'outil OSE avec l'ingénieur ou le fournisseur."],
  pieces="Fiches techniques des équipements, calcul OSE, factures après coup.", quand="Hiver 2026-2027, avant les commandes de la phase 1.", url="https://www.hydroquebec.com/affaires/"),
 dict(rang=10, nom="Fonds régionaux de solidarité FTQ, Outaouais", prog="Prêt ou capital-actions", role="Capital patient si un manque subsiste",
  quoi="Prêts et capital-actions jusqu'à 5 millions de dollars au palier national; seuil minimal et critères tourisme non publiés. La moitié du volume annuel va à la relève, et la performance ESG compte.",
  conditions="PME de la région; les tickets sont habituellement plus gros que le besoin du Mini-Spa.",
  contact="Véronique Fournier, directrice (investissement) · Dominique Labbé, conseiller principal · 259, rue Saint-Joseph, bureau 315, Gatineau J8Y 6T1 · formulaire de financement du site",
  comment=["Remplir le formulaire du site seulement si les étapes 1 à 7 laissent un trou dans le montage."],
  pieces="Sommaire, plan, états financiers.", quand="En réserve.", url="https://www.fondsftq.com/en/business/fonds-regionaux/outaouais"),
 dict(rang=11, nom="Desjardins Capital, dont Capital régional et coopératif Desjardins", prog="Prêt subordonné ou capital", role="Capital patient, en réserve",
  quoi="Investissements dans des PME en démarrage, croissance ou transfert; un fonds partenaire vise des prêts subordonnés généralement sous 3 millions de dollars. Seuil minimal non publié.",
  conditions="Non publiées en détail.", contact="Par le centre Desjardins Entreprises Outaouais, 819 778-1400",
  comment=["Poser la question au gestionnaire de comptes Desjardins à la rencontre de novembre; une porte à la fois."],
  pieces="Les mêmes que pour le prêt commercial.", quand="En réserve.", url="https://www.desjardins.com/fr/entreprises/financement-prets/desjardins-capital.html"),
 dict(rang=12, nom="Investissement Québec", prog="ESSOR, volet 2 (projets d'investissement)", role="À vérifier, derrière le PADAT",
  quoi="Prêts et garanties de prêt pour des projets d'investissement qui augmentent la productivité, dépenses admissibles d'au moins 100 000 $ selon des fiches de cabinets; aucune page officielle n'a pu être lue. Programme valide jusqu'au 31 mars 2027.",
  conditions="Potentiel réel de rentabilité ou de masse salariale au Québec; pour un projet touristique, le PADAT reste le programme d'IQ qui colle.",
  contact="Même division : 1 866 870-0437", comment=["Poser la question au conseiller d'IQ pendant l'appel du PADAT : ESSOR s'ajoute-t-il ou se substitue-t-il ?"],
  pieces="Selon la réponse.", quand="Pendant l'appel PADAT.", url="https://www.investquebec.com"),
 dict(rang=13, nom="Fondaction et Filaction", prog="Capital de développement", role="Dernier recours, non vérifié",
  quoi="Fonds de travailleurs et fonds d'investissement responsable; aucune page officielle utilisable n'a pu être lue, aucun seuil ni contact régional publié dans les sources trouvées.",
  conditions="Non vérifiées.", contact="À chercher si le besoin apparaît.", comment=["Garder de côté tant que les prêteurs 1 à 7 ne laissent pas de manque."],
  pieces="À demander.", quand="En réserve.", url="https://www.fondaction.com"),
 dict(rang=14, nom="Services Québec (Emploi-Québec Outaouais)", prog="Mesures d'aide à l'embauche et à la formation", role="Pour la paie des préposés, à la phase d'embauche",
  quoi="Subventions salariales et aide à la formation selon les mesures en vigueur; aucune mesure confirmée en ligne pour l'Outaouais.",
  conditions="Selon la mesure; les postes sont salariés (préposés aux bassins, accueil, café).",
  contact="Par la conseillère de la MRC (Réseau accès PME) ou le bureau de Services Québec de Papineauville",
  comment=["Demander à Catherine Jardon quelles mesures s'ouvrent à l'embauche, à l'été 2027."],
  pieces="Selon la mesure.", quand="Été 2027, trois mois avant l'ouverture des bains.", url="https://www.quebec.ca/emploi"),
 dict(rang=15, nom="L'apport familial", prog="Mise de fonds de 20 000 $", role="La part du promoteur, confirmée",
  quoi="Apport familial de 20 000 $, auquel s'ajoutent les honoraires de plan et d'études déjà engagés. Chaque prêteur et le PDTO demandent la preuve de la mise de fonds.",
  conditions="Une lettre d'apport ou un relevé qui montre le dépôt; le comptable confirme la mise de fonds pour le PDTO.",
  contact="La famille; Consultant EC inc. pour la confirmation comptable",
  comment=["Obtenir la lettre d'apport signée et le relevé du dépôt avant la rencontre BDC.", "Réunir les factures des honoraires déjà payés."],
  pieces="Lettre d'apport, relevé bancaire, factures d'honoraires.", quand="Avant le 26 octobre.", url=""),
 dict(rang=16, nom="Écartés après vérification", prog="Futurpreneur, Évol, microcrédit, banques sans programme tourisme", role="Ne pas y passer de temps",
  quoi="Futurpreneur exige une entreprise en exploitation depuis 24 mois ou moins et plafonne à 75 000 $; Évol vise des communautés sous-représentées et sa politique date de 2021; MicroEntreprendre Outaouais prête trop peu pour ce projet; RBC, TD, BMO, CIBC et Scotia n'ont aucun programme propre à l'hôtellerie pour une petite entreprise, leur seul levier est le PFPEC déjà couvert par Desjardins.",
  conditions="", contact="", comment=[], pieces="", quand="", url="https://futurpreneur.ca/eligibility/"),
]

def carte(f):
    pas = "".join(f"<li>{e(s)}</li>" for s in f["comment"])
    champs = ""
    for k, v in (("Combien, et sous quelle forme", f["quoi"]), ("Conditions", f["conditions"]), ("Qui joindre", f["contact"]), ("Pièces", f["pieces"]), ("Quand", f["quand"])):
        if v: champs += f'<div><div class="k">{e(k)}</div>{e(v)}</div>'
    url = f'<div class="src">{e(f["url"])}</div>' if f["url"] else ""
    return f'''<div class="fiche"><div class="tete"><div class="num">{f["rang"]}</div><div><h3>{e(f["nom"])}</h3><div class="prog">{e(f["prog"])}</div><div class="role">{e(f["role"])}</div></div></div>
<div class="corps">{champs}</div>{"<div class=k style=margin-top:5pt>Comment appliquer</div><ol>"+pas+"</ol>" if pas else ""}{url}</div>'''

CSS_PLUS = """
.fiche{border:1px solid var(--filet);background:rgba(255,255,255,.28);padding:8pt 10pt 7pt;margin:0 0 9pt;font-size:9.6pt;line-height:1.32;break-inside:avoid}
.fiche .tete{display:grid;grid-template-columns:26pt 1fr;gap:8pt;align-items:start;border-bottom:.5px solid var(--filet2);padding-bottom:5pt;margin-bottom:6pt}
.fiche .num{font-family:Cinzel,serif;font-size:18pt;color:var(--or);line-height:1}
.fiche h3{font-size:11pt;margin:0 0 2pt}
.fiche .prog{font-size:9.6pt;color:var(--accent)}
.fiche .role{font-family:Cinzel,serif;font-size:7.4pt;letter-spacing:.14em;text-transform:uppercase;color:var(--titre);margin-top:2pt}
.fiche .corps{display:grid;grid-template-columns:1fr 1fr;gap:4pt 12pt}
.fiche .k{font-family:Cinzel,serif;font-size:6.9pt;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin-bottom:1pt}
.fiche ol{margin:2pt 0 0;padding-left:14pt}.fiche li{margin-bottom:1.5pt}
.fiche .src{font-size:7.6pt;color:var(--accent);margin-top:4pt;word-break:break-all}
.mesure .page{height:auto;overflow:visible;page-break-after:auto}
"""

def entete(suite=False):
    t = "Où financer le Mini-Spa" + (", suite" if suite else "")
    return f'<p class="eyebrow">Le Mini-Spa des Inconnus · financement · octobre 2026</p><h2>{e(t)}</h2><div class="filet"></div>' + ("" if suite else f"<p>{e(LEAD)}</p>")

def page(contenu, n):
    return f'<div class="page">{contenu}<div class="folio">Le Mini-Spa des Inconnus · Où financer · {n}</div></div>'

def html(pages):
    corps = "".join(page(c, i + 1) for i, c in enumerate(pages))
    return f'<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Où financer le Mini-Spa</title><style>{pdf.CSS}{CSS_PLUS}</style></head><body>{corps}</body></html>'

async def mesurer(cartes):
    """Rend chaque fiche et l'en-tête dans une page sans limite de hauteur, et renvoie leurs hauteurs en pixels CSS."""
    from playwright.async_api import async_playwright
    dist = SRC.parent / "dist"; dist.mkdir(exist_ok=True)
    corps = entete() + '<div class="fiche" id="e1"></div>' + "".join(c.replace('<div class="fiche">', f'<div class="fiche" id="f{i}">', 1) for i, c in enumerate(cartes))
    doc = f'<!DOCTYPE html><html class="mesure"><head><meta charset="utf-8"><style>{pdf.CSS}{CSS_PLUS}</style></head><body class="mesure">{pdf.page(corps, 1)}</body></html>'
    p = dist / "ou-financer-mesure.html"; p.write_text(doc, encoding="utf-8")
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); pg = await b.new_page(viewport={"width": 816, "height": 1056})
        await pg.goto(p.as_uri()); await pg.wait_for_timeout(800)
        h = await pg.evaluate("""() => { const r=(id)=>document.getElementById(id).getBoundingClientRect();
            const page=document.querySelector('.page').getBoundingClientRect();
            return {entete: r('e1').top - page.top, fiches: [...document.querySelectorAll('.fiche[id^=f]')].map(x=>x.getBoundingClientRect().height)} }""")
        await b.close()
    return h

def paginer(cartes, h):
    # page utile : 11in moins marges (.62 + .6) = 9.78in = 939 px; l'en-tête de suite ≈ 70 px
    utile, suite_h, marge = 939, 72, 9
    pages, cur, used = [], [], h["entete"]
    for c, hh in zip(cartes, h["fiches"]):
        if cur and used + hh + marge > utile:
            pages.append(cur); cur, used = [], suite_h
        cur.append(c); used += hh + marge
    if cur: pages.append(cur)
    return ["".join([entete(i > 0)] + p) for i, p in enumerate(pages)]

def markdown():
    out = ["---", "type: liste", "project: mini-spa", "updated: 2026-10-14", "---", "", "# Où financer le Mini-Spa, et comment appliquer à chacun", "", LEAD, "",
           "Version PDF ouverte sur le bureau : `ou-financer-le-mini-spa.pdf` (même dossier). Générateur : `plan-spa/src/liste_preteurs_pdf.py`.", ""]
    for f in FICHES:
        out += [f"## {f['rang']}. {f['nom']} · {f['prog']}", "", f"**{f['role']}.**", ""]
        for k, v in (("Combien, et sous quelle forme", f["quoi"]), ("Conditions", f["conditions"]), ("Qui joindre", f["contact"]), ("Pièces", f["pieces"]), ("Quand", f["quand"])):
            if v: out += [f"- **{k}.** {v}"]
        if f["comment"]:
            out += ["", "Comment appliquer :", ""] + [f"{i+1}. {s}" for i, s in enumerate(f["comment"])]
        if f["url"]: out += ["", f"Source : {f['url']}"]
        out += [""]
    return "\n".join(out)

if __name__ == "__main__":
    out = pathlib.Path(sys.argv[1]); md = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None
    cartes = [carte(f) for f in FICHES]
    h = asyncio.run(mesurer(cartes))
    pages = paginer(cartes, h)
    dist = SRC.parent / "dist"; dist.mkdir(exist_ok=True)
    (dist / "ou-financer.html").write_text(html(pages), encoding="utf-8")
    r = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw", "--virtual-time-budget=6000",
                        f"--print-to-pdf={out}", (dist / "ou-financer.html").as_uri()], capture_output=True, text=True)
    print("pages", len(pages), "hauteurs", [round(x) for x in h["fiches"]], "pdf", out.exists(), out.stat().st_size if out.exists() else r.stderr[-300:])
    if md: md.write_text(markdown(), encoding="utf-8"); print("md", md)
