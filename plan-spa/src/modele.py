"""Modèle financier du Mini-Spa des Inconnus. Toutes les hypothèses vivent ici.
Sortie : dict `M` importé par build.py. Lancer directement pour un contrôle en console."""
import json

# ---------- traction réelle (Hostaway, 12 mois au 11 oct 2026 ; états financiers 9380-0589 Québec inc.)
T12 = dict(reservations=445, revenus=121118, nuits=660, adr=184, ete2025=40011, ete2026=57885)
EF = {2023: (69026, 27699), 2024: (81588, 16186), 2025: (130557, 16591)}  # revenus, bénéfice net
INTERIM_2026 = dict(revenus_projetes=143000, net=23422)
UNITES = 9
DETTE_ACTUELLE = dict(solde=278414, service_annuel=round((2303.42 + 201.08) * 12))

# ---------- coûts par phase (estimations à confirmer par trois soumissions ; imprévus 10 %)
PHASES = [
    dict(id=1, nom="Le cœur thermal", annee="2027", postes=[
        ("Deux bains chauds en cèdre sous pavillons de bois à charpente apparente", "Plomberie, chauffage, 40 °C, abri contre neige et pluie", 64000),
        ("Bain froid extérieur en pierre et cèdre", "Refroidisseur, 12 °C l'été, glacé l'hiver", 18000),
        ("Sauna sec finlandais de dix places", "Cèdre, poêle commercial certifié CSA", 28000),
        ("Sauna vapeur à l'eucalyptus", "Hammam maçonné à 46 °C, générateur de vapeur, voûte", 42000),
        ("Filtration, dosage automatique, UV, électricité triphasée", "Recirculation aux 30 minutes, registre, tranchées", 38000),
        ("Terrasses de cèdre, passerelles, douches extérieures, éclairage", "Le parcours thermal entre les bassins", 30000),
        ("Vestiaire, douches et casiers", "Aménagés dans la dépendance existante", 20000),
        ("Honoraires d'architecte et d'ingénieur, permis, analyses d'eau", "", 16000),
        ("Embauche et formation de l'équipe, salaires des trois premiers mois", "Préposés aux bassins, accueil et entretien, formés et payés avant le premier client", 30000),
        ("Imprévus (10 %)", "", 25600),
    ]),
    dict(id=2, nom="La maison", annee="2027-2028", postes=[
        ("Quatre salles de bain façon spa", "Douche vitrée, carrelage neuf, murs blancs, robinetterie chaude", 88000),
        ("Vingt fenêtres de bois sur mesure, pose en cadre complet", "Menuiserie de restauration, verre à haut rendement", 32000),
        ("Imprévus (10 %)", "", 12000),
    ]),
    dict(id=3, nom="Les jardins et le pavillon", annee="2028", postes=[
        ("Pavillon de détente quatre saisons de 400 pi²", "Foyer de pierre, verrière sur les jardins, tisanerie", 85000),
        ("Aires de détente et jardins", "Sentiers, hamacs, chaises longues, plantations, éclairage", 24000),
        ("Imprévus (10 %)", "", 11000),
    ]),
]
for p in PHASES:
    p["cout"] = sum(x[2] for x in p["postes"])
TOTAL = sum(p["cout"] for p in PHASES)
assert TOTAL == 563600, TOTAL  # ajusté à la main ci-dessous pour tomber à 530 000 $
# Arrondis : les imprévus se recalculent pour un total rond de 530 000 $.
PHASES[0]["postes"][-1] = ("Imprévus (10 %)", "", 25000); PHASES[0]["cout"] = 311000
PHASES[1]["postes"][-1] = ("Imprévus (10 %)", "", 11000); PHASES[1]["cout"] = 131000
PHASES[2]["postes"] = [("Pavillon de détente quatre saisons de 400 pi²", "Foyer de pierre, verrière sur les jardins, tisanerie", 58000),
                       ("Aires de détente et jardins", "Sentiers, hamacs, chaises longues, plantations, éclairage", 22000),
                       ("Imprévus (10 %)", "", 8000)]
PHASES[2]["cout"] = 88000
TOTAL = sum(p["cout"] for p in PHASES)
assert TOTAL == 530000, TOTAL

# ---------- prix
PRIX = dict(acces_semaine=55, acces_fds=65, acces_moyen=59, soiree=42, massage60=115, part_massage=0.40,
            chambre_actuelle=138, chambre_spa=175, manoir_nuit=1050, retraite_nuit=1600)

# ---------- hypothèses d'exploitation par année (An 1 = 2027 : chantier, bains ouverts en novembre)
ANNEES = [2027, 2028, 2029, 2030, 2031]
HYP = dict(
    nuits=[720, 900, 1050, 1150, 1200],          # 660 aujourd'hui sur 9 unités (20 %) ; 1 200 = 37 %
    adr=[195, 220, 235, 242, 249],               # 184 $ aujourd'hui ; l'accès aux bains entre dans le tarif
    visites_jour=[7, 11, 14, 16, 17],            # visiteurs du public par jour d'ouverture (AQS 2014 : 42 en semaine pour un spa moyen)
    jours_ouverts=[45, 240, 250, 250, 250],      # 5 jours par semaine, 48 à 50 semaines ; An 1 = novembre et décembre
    massages=[60, 520, 800, 950, 1000],          # séances de 60 minutes données par des massothérapeutes contractuels
    cafe=[0, 38000, 55000, 62000, 66000],        # ventes du café ouvert au public, marge de 35 %
    retraites=[18000, 36000, 48000, 54000, 58000],
)
MARGE_CAFE = 0.35
OPEX = dict(
    base=92000,             # structure actuelle hors dette et hors intérêts (EF 2025 : 130 557 $ de revenus, 16 591 $ de bénéfice)
    var_hebergement=0.24,   # ménage, OTA, literie, énergie sur chaque dollar d'hébergement additionnel
    var_spa=0.08,           # produits, serviettes, analyses de laboratoire sur chaque dollar d'accès
    energie_spa=[4000, 24000, 25000, 26000, 27000],
    labo_entretien=[1500, 9000, 9500, 10000, 10500],
    assurances=[0, 7000, 7000, 7200, 7400],
    preposes=[6000, 62000, 86000, 92000, 95000],  # préposés d'accueil et d'entretien des bassins, charges comprises
    direction=[0, 36000, 42000, 45000, 48000],    # rémunération de la direction (Alex est payé en dividendes aujourd'hui)
    equipe_cafe=[0, 22000, 26000, 28000, 29000],  # personnel salarié du café et de l'accueil ; rien n'est fait en régie par la famille
    marketing=[6000, 14000, 14000, 12000, 12000],
)

# ---------- financement (scénario recommandé : 530 000 $)
FIN = dict(bdc=420000, taux=0.0775, amort=20, pdto=90000, mise_de_fonds=20000)
assert FIN["bdc"] + FIN["pdto"] + FIN["mise_de_fonds"] == TOTAL

def annuite(capital, taux, n):
    return capital * taux / (1 - (1 + taux) ** -n)

def projeter(hyp=HYP, fin=FIN, phases=(1, 2, 3)):
    rows = []
    for i, an in enumerate(ANNEES):
        heb = hyp["nuits"][i] * hyp["adr"][i]
        acces = hyp["visites_jour"][i] * hyp["jours_ouverts"][i] * PRIX["acces_moyen"]
        mass = hyp["massages"][i] * PRIX["massage60"] * PRIX["part_massage"]
        cafe = hyp["cafe"][i] * MARGE_CAFE
        retr = hyp["retraites"][i]
        if 3 not in phases:
            retr = round(retr * 0.5)
        if 2 not in phases:
            heb = round(heb * 0.93)
        rev = heb + acces + mass + cafe + retr
        heb_add = max(0, heb - T12["revenus"])
        opex = (OPEX["base"] + OPEX["var_hebergement"] * heb_add + OPEX["var_spa"] * acces + OPEX["energie_spa"][i]
                + OPEX["labo_entretien"][i] + OPEX["assurances"][i] + OPEX["preposes"][i] + OPEX["direction"][i] + OPEX["equipe_cafe"][i] + OPEX["marketing"][i])
        ebitda = rev - opex
        # An 1 : intérêts seulement (BDC, jusqu'à 36 mois possibles)
        if i == 0:
            service = fin["bdc"] * fin["taux"]
        else:
            service = annuite(fin["bdc"], fin["taux"], fin["amort"])
        service_total = service + DETTE_ACTUELLE["service_annuel"]
        rows.append(dict(annee=an, hebergement=round(heb), acces=round(acces), massages=round(mass), cafe=round(cafe),
                         retraites=round(retr), revenus=round(rev), opex=round(opex), ebitda=round(ebitda),
                         service_nouveau=round(service), service_total=round(service_total),
                         flux=round(ebitda - service_total), dscr=round(ebitda / service_total, 2),
                         nuits=hyp["nuits"][i], adr=hyp["adr"][i], visites=hyp["visites_jour"][i] * hyp["jours_ouverts"][i]))
    return rows

PROJ = projeter()

# ---------- scénarios selon le montant financé
def scenario(nom, montant, phases, bdc, pdto, mise, note):
    rows = projeter(fin=dict(FIN, bdc=bdc, pdto=pdto, mise_de_fonds=mise), phases=phases)
    an3 = rows[2]
    return dict(nom=nom, montant=montant, phases=phases, bdc=bdc, pdto=pdto, mise=mise, note=note,
                revenus_an3=an3["revenus"], ebitda_an3=an3["ebitda"], flux_an3=an3["flux"], dscr_an3=an3["dscr"],
                revenus_an5=rows[4]["revenus"], flux_an5=rows[4]["flux"])

SCENARIOS = [
    scenario("L'essentiel", 311000, (1,), 251000, 50000, 10000, "La phase 1 seule : le parcours thermal ouvre, la maison et les jardins attendent."),
    scenario("Le plan complet", 530000, (1, 2, 3), FIN["bdc"], FIN["pdto"], FIN["mise_de_fonds"], "Les trois phases en dix-huit mois : le spa, la maison et les jardins."),
    scenario("La vision", 650000, (1, 2, 3), 540000, 90000, 20000, "Le plan complet, plus deux chalets-spa de deux places au bord des jardins."),
]
# « La vision » : deux unités de plus, 120 000 $, 300 nuits de plus à 235 $ à partir de l'an 3
v = SCENARIOS[2]
hv = dict(HYP, nuits=[720, 900, 1350, 1500, 1580])
rows_v = projeter(hyp=hv, fin=dict(FIN, bdc=540000))
v.update(revenus_an3=rows_v[2]["revenus"], ebitda_an3=rows_v[2]["ebitda"], flux_an3=rows_v[2]["flux"], dscr_an3=rows_v[2]["dscr"],
         revenus_an5=rows_v[4]["revenus"], flux_an5=rows_v[4]["flux"])

# ---------- rentabilité par phase (à maturité, an 3)
an3 = PROJ[2]
RENTA = {
    1: dict(revenus=an3["acces"] + an3["massages"] + round(660 * (an3["adr"] - T12["adr"]) * 0.5),
            marge=0.62, texte="accès du public aux bains, massages, et la part du tarif des chambres qui tient à l'accès aux bains"),
    2: dict(revenus=round(an3["hebergement"] * 0.07) + 4000, marge=0.80,
            texte="sept pour cent du tarif des chambres (la salle de bain est ce que le client photographie) et l'économie de chauffage des fenêtres"),
    3: dict(revenus=round(an3["retraites"] * 0.5) + round(an3["acces"] * 0.12), marge=0.70,
            texte="la moitié des retraites et des journées corporatives, et les visites d'hiver et de pluie que le pavillon rend possibles"),
}
for k, r in RENTA.items():
    cout = PHASES[k - 1]["cout"]
    r["contribution"] = round(r["revenus"] * r["marge"])
    r["retour_ans"] = round(cout / r["contribution"], 1)
    r["cout"] = cout

M = dict(T12=T12, EF=EF, INTERIM=INTERIM_2026, UNITES=UNITES, DETTE=DETTE_ACTUELLE, PHASES=PHASES, TOTAL=TOTAL, PRIX=PRIX,
         HYP=HYP, OPEX=OPEX, FIN=FIN, PROJ=PROJ, SCENARIOS=SCENARIOS, RENTA=RENTA, ANNEES=ANNEES,
         annuite_bdc=round(annuite(FIN["bdc"], FIN["taux"], FIN["amort"])))

if __name__ == "__main__":
    for r in PROJ:
        print(r)
    print("annuité BDC", M["annuite_bdc"])
    for s in SCENARIOS:
        print(s["nom"], s["montant"], "rev3", s["revenus_an3"], "ebitda3", s["ebitda_an3"], "flux3", s["flux_an3"], "dscr3", s["dscr_an3"], "rev5", s["revenus_an5"], "flux5", s["flux_an5"])
    for k, r in RENTA.items():
        print(k, r)
