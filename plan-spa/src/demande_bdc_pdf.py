# -*- coding: utf-8 -*-
"""La demande à la BDC : chaque champ du formulaire « Discutez de l'admissibilité de votre projet » prérempli,
le texte du projet, le fil de l'appel de dix minutes, les pièces et la suite. Canon parchemin. Produit le PDF et la note Markdown.
Usage : python3 demande_bdc_pdf.py <sortie.pdf> [sortie.md]"""
import pathlib, subprocess, sys
import pdf
e = pdf.e
SRC = pathlib.Path(__file__).resolve().parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL = "https://www.bdc.ca/fr/financement/pret-terrains-batiments-commerciaux/pret-terrains-batiments-commerciaux-financement-formulaire"

LEAD = ("La BDC n'a pas de formulaire de prêt immobilier à remplir d'un coup : sa page « Prêt pour immobilier commercial » mène à un formulaire de cinq étapes qui réserve un appel gratuit de dix minutes "
        "avec un spécialiste en prêts hypothécaires commerciaux, sans vérification de crédit ni obligation. C'est l'appel qui ouvre le dossier; le représentant donne ensuite sa liste de pièces, et l'Espace client (client.bdc.ca) sert à les téléverser, à signer les consentements et à accepter l'offre. Tout ce qui suit est écrit à ta première personne, comme tu l'as permis pour la BDC le 14 octobre 2026. Rien n'a été soumis.")

ETAPES = [
 ("Étape 1 · Votre projet", [("Depuis combien de temps votre entreprise est en activité ?", "Au moins 24 mois", "")]),
 ("Étape 2 · Votre projet", [("Combien voulez-vous emprunter ? (montant supérieur à 350 000 $, sans espace ni signe)", "420000", "Le prêt principal du montage de 530 000 $; les scénarios L'essentiel et La vision restent au dossier.")]),
 ("Étape 3 · Vos coordonnées", [("Prénom", "Alex", ""), ("Nom de famille", "Turcot St-Laurent", "Nom légal complet, celui des états financiers et du registre."),
    ("Courriel", "alex@lesalondesinconnus.com", ""), ("Téléphone", "514 418-3450", ""), ("Poste", "(vide)", ""),
    ("Titre de poste", "Propriétaire d'entreprise", "Liste déroulante."),
    ("Comment avez-vous entendu parler de BDC ?", "Gouvernement", "Liste déroulante; le PADAT du ministère du Tourisme renvoie à un prêteur principal, et la BDC est le prêteur fédéral des entrepreneurs."),
    ("J'accepte que BDC m'envoie des conseils par courriel", "Non coché", "Facultatif.")]),
 ("Étape 4 · Votre entreprise", [("Nom de l'entreprise", "9380-0589 Québec inc. (Le Salon des Inconnus)", "NEQ 1173745234."),
    ("Type d'entreprise", "Entreprise ou société par actions (à but lucratif)", ""), ("Secteur d'activité", "Tourisme et hébergement", ""),
    ("Année de fondation", "2021", "Début des activités de l'auberge, janvier 2021 (même réponse que dans les autres dossiers)."),
    ("Personnes employées", "1", "À confirmer avant de soumettre : les états financiers 2025 portent 23 142 $ de salaires."),
    ("Revenus annuels (sans espace ni signe)", "130557", "États financiers 2025, préparés par Consultant EC inc."),
    ("Adresse (AdresseComplète de Postes Canada)", "826, chemin de la Côte-à-Favier", "Taper le code postal J0V 1N0 et choisir l'adresse proposée."),
    ("Ville · Province · Code postal · Pays", "Namur · Québec · J0V 1N0 · Canada", "")]),
 ("Étape 5 · Décrivez votre projet", [("À quelle fin prévoyez-vous utiliser le prêt ?", "Rénover un espace commercial en tant que propriétaire", "Le spa s'ajoute à un immeuble que l'entreprise possède; « Acheter ou construire un hôtel ou un motel » vise un bâtiment neuf, ce n'est pas le cas."),
    ("À quel moment souhaitez-vous avoir accès au financement ?", "Dans 3 à 6 mois", "La lettre d'intention est visée avant le 15 décembre 2026 et les premiers déboursés suivent les soumissions, au printemps 2027."),
    ("Pouvez-vous nous en dire plus sur votre projet ?", "Le texte ci-dessous, collé tel quel.", "")]),
]

TEXTE = ("Le Salon des Inconnus est une auberge de neuf unités à Namur, dans la MRC de Papineau, exploitée par 9380-0589 Québec inc. depuis 2021. "
         "Les revenus sont passés de 69 026 $ en 2023 à 130 557 $ en 2025, avec 445 réservations et 121 118 $ d'hébergement sur les douze derniers mois, et l'auberge est gérée par Premium Booking depuis octobre 2026. "
         "Le projet ajoute au domaine un parcours thermal nordique ouvert au public, deux bains chauds, un bain froid, un sauna, un pavillon de vapeur et un café, pour 530 000 $ en trois phases, les bains ouvrant en novembre 2027. "
         "Je cherche un prêt immobilier commercial de 420 000 $ amorti sur 20 ans, avec intérêts seulement pendant l'année de chantier; une contribution de Tourisme Outaouais et une mise de fonds complètent le montage. "
         "Le plan d'affaires, le prévisionnel sur cinq ans et les états financiers 2023 à 2025 sont prêts.")

APPEL = [
 ("L'ouverture, en une respiration", "« Alex Turcot St-Laurent, du Salon des Inconnus à Namur. L'auberge a fait 445 réservations et 121 118 $ d'hébergement sur les douze derniers mois, elle est gérée par Premium Booking depuis octobre, et nous ajoutons un parcours thermal de 530 000 $ qui ouvre en novembre 2027. Je cherche un prêt immobilier commercial de 420 000 $ et je veux savoir si vos conditions collent. »"),
 ("Les trois questions", "Le prêt immobilier commercial s'applique-t-il à un immeuble qui porte déjà une hypothèque de premier rang ? Quel ratio de couverture de la dette et quelles sûretés demandez-vous ? Quelle est votre liste de pièces, et pouvez-vous émettre une lettre d'intention avant le 15 décembre, parce que le PADAT d'Investissement Québec la demande au dépôt ?"),
 ("Ce qui ne se dit pas tant qu'on ne le demande pas", "Le taux actuel de la Banque Nationale, l'historique du refinancement, la taille de l'auberge. La mise de fonds se répond en une phrase quand la question vient : 20 000 $ d'apport familial plus les honoraires déjà engagés, et 90 000 $ de Tourisme Outaouais, soit 21 % du projet sans dette."),
 ("La fermeture, logistique", "« Je vous envoie le sommaire et le lien du plan dans l'heure. Quel est votre meilleur moment la semaine prochaine pour une rencontre au centre d'affaires de Gatineau ? »"),
]

PIECES_PRETES = ["Plan d'affaires, 17 pages (PDF) et version en ligne lesalondesinconnus.com/plan-spa", "Sommaire de la demande, 3 pages", "Prévisionnel 2027-2031 et trésorerie mensuelle 2027-2028 (Excel)",
                 "États financiers 2023 (avec 2021-2022), 2024, 2025, et intérimaires 2026", "Avis de cotisation T2 2024", "T1 2024 et 2025, avis de cotisation 2024 et 2025", "Attestation CITQ 209613, valide jusqu'au 31 août 2027",
                 "Passeport et permis de conduire", "Relevés des prêts BNC 9784466 et 9784474", "Relevés bancaires de l'entreprise et personnels, août 2025 à juillet 2026"]
PIECES_A_FAIRE = ["Chèque annulé du compte de l'entreprise (la BDC le demande à la demande en ligne)", "Bilan personnel, sections actifs et passifs (gabarit prérempli dans le paquet d'août)", "Preuve de la mise de fonds : lettre d'apport familial et relevé du dépôt, factures des honoraires payés",
                  "Rapport du bureau de crédit (pointage 805), à fournir par Alex, aucun fichier sur le disque", "Contrat de gestion Premium Booking", "Attestation d'assurance en vigueur (celle du paquet est périmée)",
                  "Trois soumissions par poste de la phase 1, sans rien signer", "Confirmation écrite de l'usage par la municipalité de Namur"]

SUITE = [("Dans l'heure qui suit l'appel", "Courriel au nom d'Alex au représentant nommé, avec le sommaire en pièce jointe et le lien du plan; brouillon prêt dans « Les textes d'approche »."),
         ("Du 26 octobre au 6 novembre", "Rencontre au 200, rue Montcalm, bureau 301, Gatineau; dépôt des pièces de sa liste dans l'Espace client, ligne par ligne, rien de plus."),
         ("De quatre à douze semaines", "Analyse : bureau de crédit de l'entreprise et du propriétaire, évaluation de l'immeuble par un évaluateur mandaté (2 000 $ à 4 000 $ à ta charge), visite possible du domaine."),
         ("Avant le 15 décembre", "Lettre d'intention, la pièce qui permet le dépôt du PADAT avant le 31 décembre."),
         ("Printemps 2027", "Offre conditionnelle, notaire pour l'hypothèque de second rang et la garantie mobilière, déboursés au rythme du chantier.")]

CSS_PLUS = """
table.form{font-size:9.6pt}table.form td:first-child{width:38%;color:var(--titre)}table.form td.v{font-weight:600}table.form td.n2{font-size:8.8pt;color:var(--accent)}
.bloc{border:1px solid var(--filet);background:rgba(255,255,255,.28);padding:9pt 11pt;font-size:10.2pt;line-height:1.4;margin:6pt 0 10pt}
.etape{font-family:Cinzel,serif;font-size:7.6pt;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin:9pt 0 3pt}
ul.p{columns:2;font-size:9.6pt;margin:0;padding-left:13pt}ul.p li{margin-bottom:2pt;break-inside:avoid}
"""

def page(contenu, n):
    return f'<div class="page">{contenu}<div class="folio">Le Mini-Spa des Inconnus · La demande à la BDC · {n}</div></div>'

def rows(etapes):
    r = ""
    for titre, champs in etapes:
        r += f'<tr><td colspan="3" class="etape" style="padding-top:7pt">{e(titre)}</td></tr>'
        for q, v, n in champs:
            r += f'<tr><td>{e(q)}</td><td class="v">{e(v)}</td><td class="n2">{e(n)}</td></tr>'
    return r

def page1():
    return f'''<p class="eyebrow">Le Mini-Spa des Inconnus · financement · octobre 2026</p><h2>La demande à la BDC</h2><div class="filet"></div>
<p>{e(LEAD)}</p><p style="font-size:9.4pt;color:var(--accent)">Formulaire : {e(URL)}</p>
<table class="form"><tbody>{rows(ETAPES[:3])}</tbody></table>'''

def page1b():
    return f'''<p class="eyebrow">Le Mini-Spa des Inconnus · financement · octobre 2026</p><h2>La demande à la BDC, suite</h2><div class="filet"></div>
<table class="form"><tbody>{rows(ETAPES[3:])}</tbody></table>'''

def page2():
    appel = "".join(f'<div><div class="k">{e(k)}</div>{e(v)}</div>' for k, v in APPEL)
    suite = "".join(f'<div><div class="k">{e(k)}</div>{e(v)}</div>' for k, v in SUITE)
    return f'''<p class="eyebrow">Le Mini-Spa des Inconnus · financement · octobre 2026</p><h2>Le texte du projet, et l'appel de dix minutes</h2><div class="filet"></div>
<h3>Le texte à coller au champ « Pouvez-vous nous en dire plus sur votre projet ? »</h3><div class="bloc">{e(TEXTE)}</div>
<h3 style="margin-top:10pt">L'appel, quand le spécialiste rappelle</h3><div class="prevu" style="grid-template-columns:1fr">{appel}</div>'''

def page3():
    suite = "".join(f'<div><div class="k">{e(k)}</div>{e(v)}</div>' for k, v in SUITE)
    p1 = "".join(f"<li>{e(x)}</li>" for x in PIECES_PRETES); p2 = "".join(f"<li>{e(x)}</li>" for x in PIECES_A_FAIRE)
    return f'''<p class="eyebrow">Le Mini-Spa des Inconnus · financement · octobre 2026</p><h2>Les pièces, et la suite</h2><div class="filet"></div>
<p>La BDC demande d'abord ce qui identifie l'entreprise et son propriétaire (données du registre, coordonnées des actionnaires, chèque annulé, pièce d'identité), puis les états financiers, le plan et les projections; le reste vient sur sa liste. Seule une pièce qu'elle a nommée part, et une pièce qui touche l'usage de l'immeuble se valide avec toi avant tout envoi. Le dossier local est assemblé dans <b>dossier-bdc/</b>, même répertoire que ce document.</p>
<h3>Prêtes, dans dossier-bdc/</h3><ul class="p">{p1}</ul>
<h3 style="margin-top:9pt">À produire avant la rencontre</h3><ul class="p">{p2}</ul>
<h3 style="margin-top:10pt">La suite</h3><div class="prevu">{suite}</div>'''

def html():
    corps = page(page1(), 1) + page(page1b(), 2) + page(page2(), 3) + page(page3(), 4)
    return f'<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>La demande à la BDC</title><style>{pdf.CSS}{CSS_PLUS}</style></head><body>{corps}</body></html>'

def markdown():
    out = ["---", "type: demande", "project: mini-spa", "updated: 2026-10-14", "statut: PRÉPARÉE, rien n'est soumis", "---", "", "# La demande à la BDC, préremplie", "", LEAD, "", f"Formulaire : {URL}", "", "## Les champs, étape par étape", ""]
    for titre, champs in ETAPES:
        out += [f"### {titre}", "", "| Champ | Réponse | Note |", "|---|---|---|"] + [f"| {q} | **{v}** | {n} |" for q, v, n in champs] + [""]
    out += ["## Le texte du projet", "", TEXTE, "", "## L'appel de dix minutes", ""] + [f"**{k}.** {v}\n" for k, v in APPEL]
    out += ["## Les pièces prêtes (dossier-bdc/)", ""] + [f"- {x}" for x in PIECES_PRETES] + ["", "## À produire avant la rencontre", ""] + [f"- {x}" for x in PIECES_A_FAIRE] + ["", "## La suite", ""] + [f"- **{k}.** {v}" for k, v in SUITE] + [""]
    return "\n".join(out)

if __name__ == "__main__":
    out = pathlib.Path(sys.argv[1]); md = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None
    dist = SRC.parent / "dist"; dist.mkdir(exist_ok=True)
    (dist / "demande-bdc.html").write_text(html(), encoding="utf-8")
    r = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw", "--virtual-time-budget=6000",
                        f"--print-to-pdf={out}", (dist / "demande-bdc.html").as_uri()], capture_output=True, text=True)
    print("demande bdc", out.exists(), out.stat().st_size if out.exists() else r.stderr[-300:])
    if md: md.write_text(markdown(), encoding="utf-8"); print("md", md)
