# -*- coding: utf-8 -*-
"""Prévisionnel financier pour les prêteurs : état des résultats sur cinq ans, trésorerie mensuelle 2027-2028,
sources et emplois, service de la dette, sensibilité. Lit modele.py, écrit un classeur Excel dans Onyx."""
import pathlib, sys
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
import modele as m
from graphiques import MOIS

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("previsionnel-mini-spa-2027-2031.xlsx")
OR, ENCRE, PARCH = "B08A3E", "2A1F0E", "F4ECD8"
H = Font(name="Inter", bold=True, color="FFFFFF"); T = Font(name="Inter", bold=True, size=14, color=ENCRE); B = Font(name="Inter", bold=True)
FILL = PatternFill("solid", fgColor=OR); FILL2 = PatternFill("solid", fgColor=PARCH)
ARG = '#,##0 $;[Red]-#,##0 $'; PCT = '0.0 %'; DEC = '0.00'
fin = Side(style="thin", color="C9A565")

def feuille(wb, nom, titre, note=""):
    ws = wb.create_sheet(nom); ws["A1"] = titre; ws["A1"].font = T
    if note: ws["A2"] = note; ws["A2"].font = Font(name="Inter", italic=False, color="6B4E1F", size=9)
    ws.sheet_view.showGridLines = False
    return ws

def entete(ws, r, cols, w0=44, w=15):
    for j, c in enumerate(cols):
        cell = ws.cell(row=r, column=j + 1, value=c); cell.font = H; cell.fill = FILL
        cell.alignment = Alignment(horizontal="left" if j == 0 else "right", vertical="center")
        ws.column_dimensions[get_column_letter(j + 1)].width = w0 if j == 0 else w

def ligne(ws, r, nom, vals, fmt=ARG, gras=False, fond=False):
    ws.cell(row=r, column=1, value=nom).font = B if gras else Font(name="Inter")
    for j, v in enumerate(vals):
        c = ws.cell(row=r, column=j + 2, value=v); c.number_format = fmt; c.alignment = Alignment(horizontal="right")
        if gras: c.font = B
        if fond: c.fill = FILL2
    if fond: ws.cell(row=r, column=1).fill = FILL2

wb = Workbook(); wb.remove(wb.active)
P, A = m.PROJ, m.ANNEES

# ---- 1. Hypothèses
ws = feuille(wb, "Hypothèses", "Hypothèses du plan, 2027 à 2031", "Les mêmes hypothèses que le plan d'affaires (modele.py). Chaque chiffre se modifie ici dans la tête et se répercute dans les feuilles calculées du plan.")
entete(ws, 4, ["Hypothèse"] + [str(a) for a in A])
r = 5
for k, nom, fmt in [("nuits", "Nuits vendues", '#,##0'), ("adr", "Tarif moyen par nuit", ARG), ("visites_jour", "Visiteurs du spa par jour d'ouverture", '#,##0'),
                    ("jours_ouverts", "Jours d'ouverture du spa", '#,##0'), ("massages", "Massages de 60 minutes", '#,##0'), ("cafe", "Ventes du café", ARG), ("retraites", "Retraites et journées corporatives", ARG)]:
    ligne(ws, r, nom, m.HYP[k], fmt); r += 1
r += 1
for nom, v in [("Accès moyen au spa", m.PRIX["acces_moyen"]), ("Massage de 60 minutes", m.PRIX["massage60"]), ("Part du massage gardée par le domaine", m.PRIX["part_massage"]), ("Marge du café", m.MARGE_CAFE),
               ("Plancher d'hébergement 2027 (prévisionnel Premium Booking, 29 août 2026)", m.PB_HEB[2027]), ("Charges fixes actuelles hors dette", m.OPEX["base"]),
               ("Charges variables sur l'hébergement additionnel", m.OPEX["var_hebergement"]), ("Charges variables sur les accès", m.OPEX["var_spa"]),
               ("Prêt principal", m.FIN["bdc"]), ("Taux", m.FIN["taux"]), ("Amortissement (années)", m.FIN["amort"]), ("Contribution non remboursable (Tourisme Outaouais)", m.FIN["pdto"]), ("Mise de fonds", m.FIN["mise_de_fonds"]),
               ("Dette actuelle (Banque Nationale), solde", m.DETTE_ACTUELLE["solde"]), ("Dette actuelle, service annuel", m.DETTE_ACTUELLE["service_annuel"])]:
    ws.cell(row=r, column=1, value=nom).font = Font(name="Inter"); c = ws.cell(row=r, column=2, value=v)
    c.number_format = PCT if isinstance(v, float) and v < 1 else ARG if v > 500 else '0.##'; c.alignment = Alignment(horizontal="right"); r += 1
r += 1
entete(ws, r, ["Charges salariales et fixes du spa"] + [str(a) for a in A]); r += 1
for k, nom in [("energie_spa", "Énergie des bassins et saunas"), ("labo_entretien", "Laboratoire et entretien de l'eau"), ("assurances", "Assurances additionnelles"), ("preposes", "Préposés aux bassins et à l'accueil"),
               ("direction", "Direction"), ("equipe_cafe", "Personnel du café"), ("marketing", "Marketing")]:
    ligne(ws, r, nom, m.OPEX[k]); r += 1

# ---- 2. État des résultats
ws = feuille(wb, "Résultats 5 ans", "État des résultats prévisionnel, 2027 à 2031", "Bénéfice avant intérêts, impôts et amortissement (BAIIA), puis service de la dette et couverture. Historique réel : EF 2023, 2024, 2025.")
entete(ws, 4, ["Poste", "2023 réel", "2024 réel", "2025 réel"] + [str(a) for a in A], w=14)
ef = [m.EF[a][0] for a in (2023, 2024, 2025)]
r = 5
ligne(ws, r, "Hébergement", ef + [p["hebergement"] for p in P]); r += 1
for k, nom in [("acces", "Accès aux bains"), ("massages", "Massages (part du domaine)"), ("cafe", "Café (marge brute)"), ("retraites", "Retraites et journées corporatives")]:
    ligne(ws, r, nom, ["", "", ""] + [p[k] for p in P]); r += 1
ligne(ws, r, "Revenus", ef + [p["revenus"] for p in P], gras=True, fond=True); r += 1
ligne(ws, r, "Charges d'exploitation", ["", "", ""] + [p["opex"] for p in P]); r += 1
ligne(ws, r, "BAIIA", ["", "", ""] + [p["ebitda"] for p in P], gras=True); r += 1
ligne(ws, r, "Bénéfice net (réel)", [m.EF[a][1] for a in (2023, 2024, 2025)] + ["" for _ in A]); r += 2
ligne(ws, r, "Service du nouveau prêt", ["", "", ""] + [p["service_nouveau"] for p in P]); r += 1
ligne(ws, r, "Service de la dette actuelle", ["", "", ""] + [m.DETTE_ACTUELLE["service_annuel"] for _ in A]); r += 1
ligne(ws, r, "Service total de la dette", ["", "", ""] + [p["service_total"] for p in P], gras=True); r += 1
ligne(ws, r, "Flux libre après service de la dette", ["", "", ""] + [p["flux"] for p in P], gras=True, fond=True); r += 1
ligne(ws, r, "Couverture de la dette (BAIIA / service)", ["", "", ""] + [p["dscr"] for p in P], fmt=DEC, gras=True); r += 2
ws.cell(row=r, column=1, value="En 2027, le prêt porte des intérêts seulement (chantier); l'annuité commence en 2028. L'hébergement 2027 retient le scénario réaliste de Premium Booking (150 388 $) parce qu'il dépasse le calcul nuits × tarif.").font = Font(name="Inter", size=9, color="6B4E1F")

# ---- 3. Trésorerie mensuelle 2027-2028
ws = feuille(wb, "Trésorerie 2027-2028", "Flux de trésorerie mensuel, janvier 2027 à décembre 2028",
             "Saisonnalité de l'hébergement : poids réels des mois de 2025 (Hostaway). Spa : ouverture en novembre 2027; poids d'hiver plus lourds. Déboursés du prêt au rythme du chantier; contribution de Tourisme Outaouais versée en deux réclamations. Encaisse d'ouverture à zéro, la marge d'exploitation de 25 000 $ restant disponible.")
mois_2025 = [MOIS[f"2025-{i:02d}"] for i in range(1, 13)]
tot = sum(mois_2025); w_heb = [v / tot for v in mois_2025]
w_spa = [.11, .11, .09, .06, .06, .07, .08, .08, .07, .08, .09, .10]
noms = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"]
cols = [f"{n} {a}" for a in (2027, 2028) for n in noms]
entete(ws, 4, ["Mois"] + cols + ["Total 2027", "Total 2028"], w0=40, w=11)
def serie(i_an, cle, poids):
    p = P[i_an]; v = p[cle]
    if i_an == 0 and cle in ("acces", "massages", "cafe"):
        return [0] * 10 + [round(v * .45), round(v * .55)]
    return [round(v * x) for x in poids]
lignes = {}
lignes["Hébergement"] = serie(0, "hebergement", w_heb) + serie(1, "hebergement", w_heb)
for k, nom in [("acces", "Accès aux bains"), ("massages", "Massages"), ("cafe", "Café (marge)")]:
    lignes[nom] = serie(0, k, w_spa) + serie(1, k, w_spa)
lignes["Retraites"] = [round(P[0]["retraites"] / 12)] * 12 + serie(1, "retraites", w_spa)
enc = [sum(x) for x in zip(*lignes.values())]
opex = []
for i_an in (0, 1):
    p = P[i_an]; fixes = p["opex"]
    for mo in range(12):
        # charges du spa concentrées sur les mois d'ouverture en 2027, réparties également en 2028
        if i_an == 0:
            spa_fixes = sum(m.OPEX[k][0] for k in ("energie_spa", "labo_entretien", "preposes", "marketing"))
            part = (spa_fixes / 2 if mo >= 10 else 0) + (fixes - spa_fixes) / 12
        else:
            part = fixes / 12
        opex.append(round(part))
capex = [0] * 24
for mo in range(3, 10): capex[mo] = round(m.PHASES[0]["cout"] / 7)
for mo in range(12, 15): capex[mo] = round(m.PHASES[1]["cout"] / 3)
for mo in range(15, 19): capex[mo] = round(m.PHASES[2]["cout"] / 4)
pret = [0] * 24; mise = [0] * 24; pdto = [0] * 24
mise[3] = m.FIN["mise_de_fonds"]
reste_pret = m.FIN["bdc"]
for mo in range(24):
    if capex[mo]:
        tire = min(capex[mo] - mise[mo], reste_pret); pret[mo] = max(0, tire); reste_pret -= pret[mo]
pdto[10] = round(m.FIN["pdto"] / 2); pdto[18] = m.FIN["pdto"] - pdto[10]
# le dernier déboursé absorbe ce que le prêt n'a pas encore couvert (phase 3 financée en partie par la contribution)
solde = 0; interets = []; capital = []
ann_mensuelle = m.annuite(m.FIN["bdc"], m.FIN["taux"] / 12, m.FIN["amort"] * 12)
for mo in range(24):
    solde += pret[mo]
    if mo < 12:
        interets.append(round(solde * m.FIN["taux"] / 12)); capital.append(0)
    else:
        i = round(solde * m.FIN["taux"] / 12); interets.append(i); capital.append(round(ann_mensuelle - i)); solde -= ann_mensuelle - i
bnc = [round(m.DETTE_ACTUELLE["service_annuel"] / 12)] * 24
r = 5
for nom, vals in lignes.items(): ligne(ws, r, nom, vals + [sum(vals[:12]), sum(vals[12:])]); r += 1
ligne(ws, r, "Encaissements d'exploitation", enc + [sum(enc[:12]), sum(enc[12:])], gras=True, fond=True); r += 1
ligne(ws, r, "Charges d'exploitation", [-x for x in opex] + [-sum(opex[:12]), -sum(opex[12:])]); r += 1
ligne(ws, r, "Intérêts du nouveau prêt", [-x for x in interets] + [-sum(interets[:12]), -sum(interets[12:])]); r += 1
ligne(ws, r, "Capital du nouveau prêt", [-x for x in capital] + [-sum(capital[:12]), -sum(capital[12:])]); r += 1
ligne(ws, r, "Service de la dette actuelle (Banque Nationale)", [-x for x in bnc] + [-sum(bnc[:12]), -sum(bnc[12:])]); r += 1
expl = [enc[i] - opex[i] - interets[i] - capital[i] - bnc[i] for i in range(24)]
ligne(ws, r, "Flux d'exploitation après dette", expl + [sum(expl[:12]), sum(expl[12:])], gras=True); r += 2
ligne(ws, r, "Travaux (phases 1, 2 et 3)", [-x for x in capex] + [-sum(capex[:12]), -sum(capex[12:])]); r += 1
ligne(ws, r, "Déboursés du prêt", pret + [sum(pret[:12]), sum(pret[12:])]); r += 1
ligne(ws, r, "Contribution de Tourisme Outaouais", pdto + [sum(pdto[:12]), sum(pdto[12:])]); r += 1
ligne(ws, r, "Mise de fonds", mise + [sum(mise[:12]), sum(mise[12:])]); r += 1
net = [expl[i] - capex[i] + pret[i] + pdto[i] + mise[i] for i in range(24)]
ligne(ws, r, "Variation de l'encaisse", net + [sum(net[:12]), sum(net[12:])], gras=True); r += 1
cum = []; s = 0
for x in net: s += x; cum.append(s)
ligne(ws, r, "Encaisse cumulée (ouverture à zéro)", cum + [cum[11], cum[23]], gras=True, fond=True); r += 1
ws.freeze_panes = "B5"
creux = min(cum)

# ---- 4. Sources et emplois
ws = feuille(wb, "Sources et emplois", "Sources et emplois des fonds", "Le montage recommandé du plan : 530 000 $.")
entete(ws, 4, ["Emplois", "Montant"]); r = 5
for p in m.PHASES: ligne(ws, r, f"Phase {p['id']} · {p['nom']} ({p['annee']})", [p["cout"]]); r += 1
ligne(ws, r, "Total des emplois", [m.TOTAL], gras=True, fond=True); r += 2
entete(ws, r, ["Sources", "Montant", "Part"]); r += 1
for nom, v in [("Prêt commercial (BDC ou équivalent), 20 ans", m.FIN["bdc"]), ("Tourisme Outaouais, contribution non remboursable", m.FIN["pdto"]), ("Mise de fonds du promoteur", m.FIN["mise_de_fonds"])]:
    ligne(ws, r, nom, [v]); c = ws.cell(row=r, column=3, value=v / m.TOTAL); c.number_format = PCT; c.alignment = Alignment(horizontal="right"); r += 1
ligne(ws, r, "Total des sources", [m.TOTAL], gras=True, fond=True); r += 2
entete(ws, r, ["Détail des postes de la phase 1", "Montant"]); r += 1
for nom, d, v in m.PHASES[0]["postes"]: ligne(ws, r, nom, [v]); r += 1

# ---- 5. Service de la dette
ws = feuille(wb, "Service de la dette", "Tableau d'amortissement du nouveau prêt", f"{m.argent(m.FIN['bdc']) if hasattr(m, 'argent') else m.FIN['bdc']} à {m.FIN['taux']*100:.2f} % sur {m.FIN['amort']} ans, intérêts seulement la première année.")
entete(ws, 4, ["Année", "Solde au début", "Intérêts", "Capital", "Versements", "Solde à la fin"], w0=12)
solde = m.FIN["bdc"]; r = 5; ann = m.annuite(m.FIN["bdc"], m.FIN["taux"], m.FIN["amort"])
for i, a in enumerate(range(2027, 2027 + m.FIN["amort"] + 1)):
    i_ = solde * m.FIN["taux"]; cap = 0 if i == 0 else ann - i_
    if solde <= 0: break
    vals = [solde, i_, cap, i_ + cap, solde - cap]
    ws.cell(row=r, column=1, value=a)
    for j, v in enumerate(vals): c = ws.cell(row=r, column=j + 2, value=round(v)); c.number_format = ARG; c.alignment = Alignment(horizontal="right")
    solde -= cap; r += 1

# ---- 6. Sensibilité
ws = feuille(wb, "Sensibilité", "Sensibilité : couverture de la dette et flux libre", "Les mêmes projections avec moins de visiteurs, un taux plus haut ou une ouverture retardée.")
entete(ws, 4, ["Scénario", "Couverture 2028", "Couverture 2029", "Couverture 2030", "Flux libre 2028", "Flux libre 2029"], w0=48)
r = 5
for sc in m.SENS:
    rr = sc["rows"]
    ws.cell(row=r, column=1, value=f"{sc['nom']} · {sc['note']}").font = Font(name="Inter")
    for j, v in enumerate([rr[1]["dscr"], rr[2]["dscr"], rr[3]["dscr"]]): c = ws.cell(row=r, column=j + 2, value=v); c.number_format = DEC; c.alignment = Alignment(horizontal="right")
    for j, v in enumerate([rr[1]["flux"], rr[2]["flux"]]): c = ws.cell(row=r, column=j + 5, value=v); c.number_format = ARG; c.alignment = Alignment(horizontal="right")
    r += 1
wb.save(OUT)
print("xlsx", OUT, "creux d'encaisse", creux, "mois", cum.index(creux) + 1, "fin 2027", cum[11], "fin 2028", cum[23], "prêt tiré", sum(pret))
