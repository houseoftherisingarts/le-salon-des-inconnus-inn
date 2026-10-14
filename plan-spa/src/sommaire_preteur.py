# -*- coding: utf-8 -*-
"""Sommaire de la demande de financement, deux pages, même canon parchemin que le PDF du plan.
Document de tête du dossier remis à un prêteur : la demande, les sources et emplois, les ratios, les garanties, l'équipe, les pièces."""
import pathlib, subprocess, sys, shutil
import pdf, contenu as C
from modele import M
e, argent, dec = pdf.e, C.argent, C.dec
P, GA, F = M["PROJ"], M["GARANTIES"], M["FIN"]
SRC = pathlib.Path(__file__).resolve().parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

def page1():
    emplois = "".join(f'<tr><td>Phase {p["id"]} · {e(p["nom"])}<small>{p["annee"]}</small></td><td class="n">{argent(p["cout"])}</td></tr>' for p in M["PHASES"])
    sources = "".join(f'<tr><td>{e(n)}<small>{e(d)}</small></td><td class="n">{e(v)}</td></tr>' for n, v, d in C.FINANCEMENT["montage"])
    ratios = [("Couverture de la dette 2028", f"{dec(P[1]['dscr'])}×"), ("Couverture de la dette 2029", f"{dec(P[2]['dscr'])}×"),
              ("Dette totale après projet", argent(GA["dette_apres"])), ("Dette sur valeur avant travaux et coût du projet", f"{GA['ratio']} %"),
              ("Part du projet sans emprunt", f"{GA['part_sans_emprunt']} %"), ("Revenus 2025, états financiers", argent(M["EF"][2025][0]))]
    rat = "".join(f'<div><div class="k">{e(k)}</div><b style="font-size:15pt">{e(v)}</b></div>' for k, v in ratios)
    return f'''<p class="eyebrow">Demande de financement · octobre 2026</p><h2>Le Mini-Spa des Inconnus</h2><div class="filet"></div>
<p><b>{e(C.PIED["entreprise"])}</b>, {e(C.PIED["adresse"])}. {e(C.PIED["citq"].split(" · ")[0])}. Auberge de {M["UNITES"]} unités exploitée depuis 2021, revenus passés de {argent(M["EF"][2023][0])} en 2023 à {argent(M["EF"][2025][0])} en 2025.</p>
<p>Un parcours thermal nordique ouvert au public autour du manoir, deux bains chauds, un bain froid, un sauna, un pavillon de vapeur et un café, qui remplit l'hiver, la saison creuse de l'auberge, et fait entrer l'accès aux bains dans le tarif des chambres.</p>
<h3>La demande</h3>
<p>Un prêt commercial de <b>{argent(F["bdc"])}</b> amorti sur {F["amort"]} ans, avec intérêts seulement pendant l'année de chantier, pour un projet de {argent(M["TOTAL"])} en trois phases, les bains ouvrant en novembre 2027.</p>
<div class="deux"><div><h3>Emplois</h3><table><tbody>{emplois}<tr class="total"><td>Total</td><td class="n">{argent(M["TOTAL"])}</td></tr></tbody></table></div>
<div><h3>Sources</h3><table><tbody>{sources}<tr class="total"><td>Total</td><td class="n">{argent(M["TOTAL"])}</td></tr></tbody></table></div></div>
<h3>Les ratios</h3><div class="prevu" style="grid-template-columns:1fr 1fr 1fr">{rat}</div>'''

def page2():
    cols = "".join(f'<th class="n">{a}</th>' for a in M["ANNEES"])
    def ligne(nom, cle, fmt=argent, gras=False):
        return f'<tr{" class=total" if gras else ""}><td>{e(nom)}</td>' + "".join(f'<td class="n">{fmt(r[cle])}</td>' for r in P) + "</tr>"
    proj = ligne("Revenus", "revenus") + ligne("Charges d'exploitation", "opex") + ligne("BAIIA", "ebitda", gras=True) + ligne("Service total de la dette", "service_total") + ligne("Flux libre", "flux") + ligne("Couverture", "dscr", lambda x: f"{dec(x)}×", gras=True)
    sens = "".join(f'<tr><td>{e(sc["nom"])}<small>{e(sc["note"])}</small></td><td class="n">{dec(sc["rows"][1]["dscr"])}×</td><td class="n">{dec(sc["rows"][2]["dscr"])}×</td><td class="n">{C.signe(sc["rows"][2]["flux"])}</td></tr>' for sc in M["SENS"])
    gar = "".join(f'<div><div class="k">{e(k)}</div>{e(v)}</div>' for k, v in C.SOLIDITE["garanties"])
    return f'''<p class="eyebrow">Projections et solidité</p><h2>Cinq ans, et ce qui tient si l'année est moins bonne</h2><div class="filet"></div>
<table style="font-size:10.4pt"><thead><tr><th>Poste</th>{cols}</tr></thead><tbody>{proj}</tbody></table>
<p style="font-size:10.4pt">{e(C.CHIFFRES["hypotheses_note"]) if "hypotheses_note" in C.CHIFFRES else "Hypothèses détaillées dans le plan d'affaires, section Les chiffres; 2027 porte des intérêts seulement."}</p>
<h3>Sensibilité</h3><table style="font-size:10pt"><thead><tr><th>Scénario</th><th class="n">Couverture 2028</th><th class="n">Couverture 2029</th><th class="n">Flux libre 2029</th></tr></thead><tbody>{sens}</tbody></table>
<h3>Les garanties</h3><div class="prevu">{gar}</div>'''

def page3():
    equipe = "".join(f'<div><div class="k">{e(n)} · {e(r)}</div>{e(t)}</div>' for n, r, t in C.SOLIDITE["equipe"])
    pieces = ["Plan d'affaires complet (PDF de 16 pages) et version interactive en ligne", "États financiers 2023, 2024 et 2025, états intermédiaires 2026",
              "Prévisionnel sur cinq ans et trésorerie mensuelle 2027-2028 (classeur Excel)", "Soumissions des fournisseurs par poste (trois par poste)",
              "Confirmation de l'usage par la municipalité de Namur", "Attestation CITQ 209613", "Relevés des prêts en cours", "Bilan personnel du promoteur et déclarations de revenus"]
    pj = "".join(f"<li>{e(p)}</li>" for p in pieces)
    jalons = "".join(f'<div><div class="k">{e(q)}</div><b>{e(t)}</b>. {e(d)}</div>' for q, t, d in C.CALENDRIER["jalons"])
    return f'''<p class="eyebrow">L'équipe, le calendrier et les pièces</p><h2>Qui porte le projet, et quand</h2><div class="filet"></div>
<h3>L'équipe</h3><div class="prevu">{equipe}</div>
<h3 style="margin-top:12pt">Le calendrier</h3><div class="prevu">{jalons}</div>
<h3 style="margin-top:12pt">Pièces du dossier</h3><ul style="font-size:10.4pt;columns:2;margin:0;padding-left:14pt">{pj}</ul>
<p style="font-size:10.4pt;margin-top:10pt"><b>{e(C.PIED["contact"])}</b></p>'''

def document():
    corps = pdf.page(page1(), 1) + pdf.page(page2(), 2) + pdf.page(page3(), 3)
    return f'<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Demande de financement · Le Mini-Spa des Inconnus</title><style>{pdf.CSS}</style></head><body>{corps}</body></html>'

if __name__ == "__main__":
    out = pathlib.Path(sys.argv[1])
    dist = SRC.parent / "dist"; dist.mkdir(exist_ok=True)
    (dist / "sommaire.html").write_text(document(), encoding="utf-8")
    r = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw", "--virtual-time-budget=6000",
                        f"--print-to-pdf={out}", (dist / "sommaire.html").as_uri()], capture_output=True, text=True)
    print("sommaire", out.exists(), out.stat().st_size if out.exists() else r.stderr[-300:])
