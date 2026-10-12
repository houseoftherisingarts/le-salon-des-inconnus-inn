# -*- coding: utf-8 -*-
"""Le PDF du plan : canon document-baseline du Salon (parchemin, double filet or, Cinzel, Cormorant Garamond),
une page .page par feuille US Letter, rendu par Chrome headless."""
import html
from modele import M
import contenu as C
import graphiques as G

e = html.escape
argent, nombre = C.argent, C.nombre
P, R, S = M["PROJ"], M["RENTA"], M["SCENARIOS"]

CSS = """
@font-face{font-family:'Cinzel';font-weight:400 700;src:url(fonts/cinzel.woff2) format('woff2')}
@font-face{font-family:'Prata';font-weight:400;src:url(fonts/prata.woff2) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-weight:400 600;src:url(fonts/cormorant.woff2) format('woff2')}
@font-face{font-family:'Lato';font-weight:400;src:url(fonts/lato400.woff2) format('woff2')}
@font-face{font-family:'Lato';font-weight:300;src:url(fonts/lato300.woff2) format('woff2')}
@page{size:letter;margin:0}
:root{--parch:#F4ECD8;--or:#B08A3E;--encre:#2A1F0E;--titre:#6B4E1F;--accent:#8A6B33;--filet:#C9A565;--filet2:#D5BA82;--nuit:#0d0b09}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
body{font-family:'Cormorant Garamond',Georgia,serif;font-size:12.6pt;line-height:1.5;color:var(--encre);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:8.5in;height:11in;position:relative;overflow:hidden;background:var(--parch);page-break-after:always;padding:.62in .68in .6in}
.page:last-child{page-break-after:auto}
.page::before{content:"";position:absolute;inset:.28in;border:5px solid var(--or);pointer-events:none}
.page::after{content:"";position:absolute;inset:.36in;border:.5px solid var(--or);pointer-events:none}
.page.noir{background:var(--nuit);color:#f3e5ab}
.page.noir::before,.page.noir::after{border-color:#c5a059}
.folio{position:absolute;bottom:.42in;left:0;right:0;text-align:center;font-family:Cinzel,serif;font-size:7.5pt;letter-spacing:.3em;color:var(--accent)}
.page.noir .folio{color:#c5a059}
h1,h2,h3{font-family:Cinzel,serif;font-weight:400;color:var(--titre);margin:0;line-height:1.15}
h1{font-size:30pt;letter-spacing:.04em}
h2{font-size:17pt;letter-spacing:.06em;margin-bottom:10pt}
h3{font-size:11.5pt;letter-spacing:.08em;margin-bottom:5pt}
.eyebrow{font-family:Cinzel,serif;font-size:8pt;letter-spacing:.3em;text-transform:uppercase;color:var(--accent);margin:0 0 8pt}
.display{font-family:Prata,serif;color:var(--encre)}
p{margin:0 0 8pt;text-align:justify;hyphens:auto}
.filet{height:1px;background:linear-gradient(90deg,var(--filet),var(--filet2),transparent);margin:10pt 0 14pt}
.deux{display:grid;grid-template-columns:1fr 1fr;gap:22pt}
.tuiles{display:grid;grid-template-columns:repeat(3,1fr);gap:9pt;margin:8pt 0 12pt}
.tuile{border:1px solid var(--filet);padding:9pt 10pt;background:rgba(255,255,255,.28)}
.tuile .c{font-family:Prata,serif;font-size:19pt;color:var(--titre);line-height:1.05}
.tuile .l{font-family:Cinzel,serif;font-size:7.2pt;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-top:5pt}
.tuile .n{font-size:9.6pt;color:#5a4a30;line-height:1.3;margin-top:3pt}
table{width:100%;border-collapse:collapse;font-size:11pt}
th{font-family:Cinzel,serif;font-weight:400;font-size:7.6pt;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);text-align:left;padding:0 6pt 6pt 0;border-bottom:1px solid var(--filet)}
td{padding:5pt 6pt 5pt 0;border-bottom:.5px solid var(--filet2);vertical-align:top}
td small{display:block;font-size:9.4pt;color:#5a4a30;line-height:1.25}
th.n,td.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;padding-right:0}
tr.total td{font-family:Cinzel,serif;font-size:9.4pt;letter-spacing:.06em;color:var(--titre);border-bottom:0;padding-top:8pt}
tr.sous td{color:#5a4a30;font-size:10.2pt}
.fig{border:1px solid var(--filet);padding:10pt 12pt 8pt;background:rgba(255,255,255,.28);margin:8pt 0}
.fig h3{margin-bottom:2pt}
.fig .s{font-size:10pt;color:#5a4a30;margin-bottom:6pt}
.fig svg{width:100%;height:auto;display:block}
.legende{display:flex;gap:14pt;flex-wrap:wrap;font-family:Lato,sans-serif;font-size:8.6pt;color:#5a4a30;margin-top:6pt}
.legende i{display:inline-block;width:9pt;height:9pt;border-radius:2pt;margin-right:5pt;vertical-align:-1pt}
.paire{display:grid;grid-template-columns:1fr 1fr;gap:8pt;margin-bottom:11pt}
.paire img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block;border:1px solid var(--filet)}
.paire .cap{font-size:9.6pt;color:#5a4a30;margin-top:3pt;line-height:1.3}
.paire .cap b{font-family:Cinzel,serif;font-weight:400;font-size:7.4pt;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);display:block}
.gains{display:grid;grid-template-columns:repeat(3,1fr);gap:9pt;margin-top:10pt}
.gain{border:1px solid var(--filet);padding:9pt 10pt;background:rgba(255,255,255,.28);font-size:10.2pt;line-height:1.35}
.gain .k{font-family:Cinzel,serif;font-size:7.2pt;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:4pt}
.gain .v{font-family:Prata,serif;font-size:16pt;color:var(--titre);margin-bottom:3pt}
.scen{border:1px solid var(--filet);padding:10pt 11pt;background:rgba(255,255,255,.28);font-size:10.4pt}
.scen.reco{border:2px solid var(--or)}
.scen .n{font-family:Cinzel,serif;font-size:10pt;letter-spacing:.1em;color:var(--titre)}
.scen .s{font-family:Prata,serif;font-size:18pt;color:var(--titre);margin:3pt 0 5pt}
.scen ul{margin:0 0 6pt;padding-left:12pt}
.scen .r{display:grid;grid-template-columns:1fr 1fr;gap:4pt 8pt;border-top:.5px solid var(--filet2);padding-top:6pt;margin-top:6pt}
.scen .r b{display:block;font-family:Prata,serif;font-weight:400;font-size:12pt;color:var(--encre)}
.scen .r span{font-family:Cinzel,serif;font-size:6.8pt;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.jalons{display:grid;grid-template-columns:repeat(4,1fr);gap:9pt;margin:8pt 0 14pt}
.jalon{border-top:2px solid var(--or);padding-top:7pt;font-size:10.2pt;line-height:1.35}
.jalon .q{font-family:Cinzel,serif;font-size:7.4pt;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}
.jalon .t{font-family:Prata,serif;font-size:12pt;color:var(--titre);margin:3pt 0}
.prevu{display:grid;grid-template-columns:1fr 1fr;gap:7pt 16pt;font-size:10.4pt;line-height:1.35}
.prevu .k{font-family:Cinzel,serif;font-size:7.6pt;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}
.cartes{display:grid;grid-template-columns:repeat(3,1fr);gap:9pt;margin-top:8pt}
.carte{border:1px solid var(--filet);padding:9pt 10pt;background:rgba(255,255,255,.28);font-size:10.2pt;line-height:1.35}
.carte h3{font-size:9.6pt}
.carte .p{font-family:Prata,serif;font-size:15pt;color:var(--titre);margin:2pt 0 4pt}
.carte .u{font-family:Lato,sans-serif;font-size:8.4pt;color:var(--accent);margin-top:4pt;word-break:break-all}
.src{font-size:9.6pt;line-height:1.35}
.src a{color:var(--accent);text-decoration:none;word-break:break-all}
.sites{display:grid;grid-template-columns:repeat(3,1fr);gap:9pt}
.sites img{width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top;border:1px solid var(--filet);display:block}
.sites b{font-family:Cinzel,serif;font-weight:400;font-size:8.4pt;letter-spacing:.1em;color:var(--titre);display:block;margin-top:5pt}
.sites span{font-size:9.6pt;color:#5a4a30;display:block;line-height:1.3}
.sites u{font-family:Lato,sans-serif;font-size:8.4pt;color:var(--accent);text-decoration:none;display:block;margin-top:2pt}
.couv{display:flex;flex-direction:column;justify-content:space-between;text-align:center;padding:1.3in .9in 1in}
.couv img.crest{width:.9in;margin:0 auto 18pt}
.couv h1{font-size:34pt;margin-top:14pt}
.couv .sous{font-size:14.5pt;max-width:5.4in;margin:18pt auto 0;text-align:center;color:#4a3a20}
.couv .bas{font-family:Cinzel,serif;font-size:8.4pt;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);line-height:2}
.couv .photo{width:100%;height:3.3in;object-fit:cover;border:1px solid var(--filet);margin:26pt 0 0}
.noir .plein{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
.noir .texte{position:absolute;left:.9in;right:.9in;bottom:1.1in}
.noir .grand{font-family:Prata,serif;font-size:72pt;line-height:1;letter-spacing:-.02em;color:#f3e5ab}
.noir .grand small{font-size:.32em;color:#c5a059;margin-left:.1em}
.noir h2{color:#f3e5ab;font-size:19pt;margin-top:12pt}
.noir p{color:rgba(251,247,239,.85);text-align:left;font-size:13pt;max-width:5.6in}
.noir .eyebrow{color:#c5a059}
"""

def folio(n):
    return f'<div class="folio">Le Mini-Spa des Inconnus · Plan d\'affaires · {n}</div>'

def ps(paras):
    return "".join(f"<p>{e(p)}</p>" for p in paras)

def page(contenu, n, cls=""):
    return f'<div class="page {cls}">{contenu}{folio(n)}</div>'

def couverture():
    return f'''<div class="couv" style="height:100%">
<div><img class="crest" src="_crest.png" alt=""><p class="eyebrow">{e(C.HERO["eyebrow"])}</p><h1>{e(C.HERO["titre"])}</h1><p class="sous">{e(C.HERO["sous"])}</p>
<img class="photo" src="media/apres-ete.jpg" alt=""></div>
<div class="bas">Le Salon des Inconnus · 9380-0589 Québec inc.<br>Plan d'affaires présenté à la Banque de développement du Canada et à Tourisme Outaouais<br>Octobre 2026</div>
</div>'''

def sommaire():
    A = C.AUJOURDHUI
    tuiles = "".join(f'<div class="tuile"><div class="c">{e(v)}</div><div class="l">{e(l)}</div><div class="n">{e(n)}</div></div>' for v, l, n in A["tuiles"])
    cartes = "".join(f'<div class="tuile"><div class="l">Phase {p["id"]} · {e(p["annee"])}</div><div class="c" style="font-size:16pt;margin-top:3pt">{e(p["nom"])}</div><div class="n" style="font-family:Prata,serif;font-size:13pt;color:var(--titre)">{argent(p["cout"])}</div></div>' for p in M["PHASES"])
    return f'''<p class="eyebrow">Sommaire</p><h2>Le projet en une page</h2><div class="filet"></div>
{ps(C.PROJET["prose"])}
<div class="tuiles">{tuiles}</div>
<p class="eyebrow" style="margin-top:6pt">Trois phases, {argent(M["TOTAL"])}</p>
<div class="tuiles">{cartes}</div>
<p>Le domaine demande à la BDC un prêt de {argent(M["FIN"]["bdc"])} sur vingt ans et dépose une demande de {argent(M["FIN"]["pdto"])} à Tourisme Outaouais. Le bénéfice d'exploitation couvre le service de la dette, ancienne et nouvelle, {str(P[1]["dscr"]).replace(".", ",")} fois dès 2028 et {str(P[2]["dscr"]).replace(".", ",")} fois en 2029.</p>'''

def auberge():
    A = C.AUJOURDHUI
    svg, leg = G.mensuel(G.CLAIR, 1200, 330)
    return f'''<p class="eyebrow">{e(A["eyebrow"])}</p><h2>{e(A["titre"])}</h2><div class="filet"></div>
{ps(A["prose"])}
<div class="fig"><h3>{e(A["graphique"]["titre"])}</h3><div class="s">{e(A["graphique"]["sous"])}</div>{svg}{G.legende_html(leg)}</div>
<div class="paire" style="margin-top:8pt"><div><img src="media/salle.jpg" alt=""><div class="cap"><b>Le manoir</b>La salle à manger</div></div><div><img src="media/hemerocales.jpg" alt=""><div class="cap"><b>Le domaine</b>Les jardins, l'été</div></div></div>'''

def rupture():
    return f'''<img class="plein" src="media/apres-hiver.jpg" alt="">
<div class="texte"><p class="eyebrow">Le projet</p><div class="grand">{e(C.PROJET["grand"])}</div><h2>{e(C.PROJET["titre"])}</h2><p>Deux bains chauds de cèdre, un bain froid, un sauna sec, un sauna vapeur à l'eucalyptus, quatre salles de bain façon spa, vingt fenêtres de bois et un pavillon quatre saisons. Les bains ouvrent au public en novembre 2027.</p></div>'''

def avant_apres_pages():
    A = C.AVANT_APRES
    pages = []
    items = A["items"]
    for bloc in (items[:3], items[3:]):
        paires = "".join(f'<div class="paire"><div><img src="media/avant-{k}.jpg" alt=""><div class="cap"><b>Aujourd\'hui</b>{e(av)}</div></div><div><img src="media/apres-{k}.jpg" alt=""><div class="cap"><b>{e(ph)}</b>{e(ap)}</div></div></div>' for k, av, ap, ph in bloc)
        entete = f'<p class="eyebrow">{e(A["eyebrow"])}</p><h2>{e(A["titre"])}</h2><div class="filet"></div><p>{e(A["lead"])}</p>' if bloc is items[:3] else f'<p class="eyebrow">{e(A["eyebrow"])}</p><h2>{e(A["titre"])}, suite</h2><div class="filet"></div>'
        pages.append(entete + paires)
    return pages

def phase_page(p):
    t = C.PHASES_TEXTE[p["id"]]; r = R[p["id"]]
    lignes = "".join(f'<tr><td>{e(n)}{f"<small>{e(d)}</small>" if d else ""}</td><td class="n">{argent(c)}</td></tr>' for n, d, c in p["postes"])
    return f'''<p class="eyebrow">Phase {p["id"]} · {e(p["annee"])}</p><h2>{e(p["nom"])} · {argent(p["cout"])}</h2><div class="filet"></div>
<p>{e(t["intro"])}</p>
<table><thead><tr><th>Poste</th><th class="n">Estimation</th></tr></thead><tbody>{lignes}<tr class="total"><td>Total de la phase, imprévus compris</td><td class="n">{argent(p["cout"])}</td></tr></tbody></table>
<div class="gains">
<div class="gain"><div class="k">Revenus additionnels à maturité</div><div class="v">{argent(r["revenus"])} / an</div>{e(r["texte"])}</div>
<div class="gain"><div class="k">Contribution annuelle</div><div class="v">{argent(r["contribution"])}</div>après les charges propres à la phase, soit un retour sur l'investissement en {str(r["retour_ans"]).replace(".", ",")} ans</div>
<div class="gain"><div class="k">Plus-value</div>{e(t["plus_value"])}</div>
</div>'''

def marche():
    Ma = C.MARCHE
    cartes = "".join(f'<div class="carte"><h3>{e(t)}</h3><div class="p">{e(prix)}</div>{e(d)}<div class="u">{e(lab)}</div></div>' for t, prix, d, lab, u in Ma["cartes"])
    return f'''<p class="eyebrow">{e(Ma["eyebrow"])}</p><h2>{e(Ma["titre"])}</h2><div class="filet"></div>{ps(Ma["prose"])}<div class="cartes">{cartes}</div>'''

def chiffres():
    Ch = C.CHIFFRES
    svg1, l1 = G.revenus_empiles(G.CLAIR, 1200, 380); svg2, l2 = G.ebitda_dette(G.CLAIR, 1200, 330)
    return f'''<p class="eyebrow">{e(Ch["eyebrow"])}</p><h2>{e(Ch["titre"])}</h2><div class="filet"></div><p>{e(Ch["lead"])}</p>
<div class="fig"><h3>{e(Ch["graphique1"]["titre"])}</h3><div class="s">{e(Ch["graphique1"]["sous"])}</div>{svg1}{G.legende_html(l1)}</div>
<div class="fig"><h3>{e(Ch["graphique2"]["titre"])}</h3><div class="s">{e(Ch["graphique2"]["sous"])}</div>{svg2}{G.legende_html(l2)}</div>'''

def projections():
    Ch = C.CHIFFRES
    ent = "".join(f'<th class="n">{r["annee"]}</th>' for r in P)
    def ligne(nom, cle, cls=""):
        return f'<tr class="{cls}"><td>{e(nom)}</td>' + "".join(f'<td class="n">{argent(r[cle])}</td>' for r in P) + "</tr>"
    hyp = "".join(f'<div><div class="k">{e(k)}</div>{e(v)}</div>' for k, v in Ch["hypotheses"])
    return f'''<p class="eyebrow">Les chiffres</p><h2>Projections 2027 à 2031</h2><div class="filet"></div>
<table><thead><tr><th>Année</th>{ent}</tr></thead><tbody>
{ligne("Hébergement", "hebergement")}{ligne("Accès aux bains", "acces")}{ligne("Massages, part de l'auberge", "massages")}{ligne("Café, marge", "cafe")}{ligne("Retraites et groupes", "retraites")}
{ligne("Revenus", "revenus", "total")}{ligne("Charges d'exploitation", "opex", "sous")}{ligne("Bénéfice d'exploitation", "ebitda", "total")}{ligne("Service de la dette, ancienne et nouvelle", "service_total", "sous")}{ligne("Flux après service de la dette", "flux", "total")}
<tr class="sous"><td>Couverture du service de la dette</td>{"".join(f"<td class='n'>{str(r['dscr']).replace('.', ',')}×</td>" for r in P)}</tr>
<tr class="sous"><td>Nuits vendues · prix moyen</td>{"".join(f"<td class='n'>{nombre(r['nuits'])} · {r['adr']} $</td>" for r in P)}</tr>
<tr class="sous"><td>Visites du public</td>{"".join(f"<td class='n'>{nombre(r['visites'])}</td>" for r in P)}</tr>
</tbody></table>
<p class="eyebrow" style="margin-top:14pt">Les hypothèses, écrites noir sur blanc</p><div class="prevu">{hyp}</div>'''

def financement():
    F = C.FINANCEMENT
    cartes = []
    for s in S:
        reco = s["nom"] == "Le plan complet"
        cartes.append(f'''<div class="scen {"reco" if reco else ""}"><div class="n">{e(s["nom"])}{" · recommandé" if reco else ""}</div><div class="s">{argent(s["montant"])}</div>
<ul><li>Prêt BDC de {argent(s["bdc"])}</li><li>Tourisme Outaouais, {argent(s["pdto"])}</li><li>Mise de fonds de {argent(s["mise"])}</li></ul>{e(s["note"])}
<div class="r"><div><b>{argent(s["revenus_an3"])}</b><span>Revenus, an 3</span></div><div><b>{argent(s["flux_an3"])}</b><span>Flux libre, an 3</span></div><div><b>{str(s["dscr_an3"]).replace(".", ",")}×</b><span>Couverture, an 3</span></div><div><b>{argent(s["revenus_an5"])}</b><span>Revenus, an 5</span></div></div></div>''')
    montage = "".join(f'<tr><td>{e(n)}<small>{e(d)}</small></td><td class="n">{e(v)}</td></tr>' for n, v, d in F["montage"])
    prose = [p.replace(str(P[1]["dscr"]), str(P[1]["dscr"]).replace(".", ",")).replace(str(P[2]["dscr"]), str(P[2]["dscr"]).replace(".", ",")) for p in F["prose"]]
    return f'''<p class="eyebrow">{e(F["eyebrow"])}</p><h2>{e(F["titre"])}</h2><div class="filet"></div><p>{e(F["lead"])}</p>
<div class="cartes" style="margin-bottom:12pt">{"".join(cartes)}</div>
<h3>{e(F["montage_titre"])}</h3><table><tbody>{montage}<tr class="total"><td>Total du projet</td><td class="n">{argent(M["TOTAL"])}</td></tr></tbody></table>
<div style="height:8pt"></div>{ps(prose)}'''

def partenaires_calendrier():
    Pa, Ca = C.PARTENAIRES, C.CALENDRIER
    sites = "".join(f'<div><img src="media/{img}" alt=""><b>{e(t)}</b><span>{e(d)}</span><u>{e(u.replace("https://", ""))}</u></div>' for t, d, u, img in [(Pa["mapchef"]["titre"], "Marc-Alexis Pepin, chef consultant", Pa["mapchef"]["url"], Pa["mapchef"]["image"])] + Pa["sites"][:2])
    jalons = "".join(f'<div class="jalon"><div class="q">{e(q)}</div><div class="t">{e(t)}</div>{e(d)}</div>' for q, t, d in Ca["jalons"])
    return f'''<p class="eyebrow">{e(Pa["eyebrow"])}</p><h2>{e(Pa["titre"])}</h2><div class="filet"></div>
<div class="deux"><div><h3>{e(Pa["mapchef"]["titre"])}</h3><p>{e(Pa["mapchef"]["prose"])}</p></div><div><h3>{e(Pa["outaouais"]["titre"])}</h3><p>{e(Pa["outaouais"]["prose"])}</p></div></div>
<div class="sites">{sites}</div>
<p class="eyebrow" style="margin-top:14pt">{e(Ca["eyebrow"])}</p><h2 style="font-size:14pt">{e(Ca["titre"])}</h2><div class="jalons">{jalons}</div>'''

def prevu_sources():
    Ca, Pi = C.CALENDRIER, C.PIED
    prevu = "".join(f'<div><div class="k">{e(k)}</div>{e(v)}</div>' for k, v in Ca["prevu"])
    src = "".join(f'<div class="src">{e(t)}<br><a href="{u}">{e(u)}</a></div>' for t, u in C.SOURCES)
    return f'''<p class="eyebrow">{e(Ca["prevu_titre"])}</p><h2>Ce que le plan a prévu</h2><div class="filet"></div><div class="prevu">{prevu}</div>
<p class="eyebrow" style="margin-top:16pt">Sources</p><div class="prevu" style="font-size:9.4pt">{src}</div>
<div class="filet" style="margin-top:14pt"></div>
<p style="font-size:10.4pt;color:#5a4a30">{e(Pi["colophon"])}</p>
<p style="font-size:10.4pt"><b>{e(Pi["entreprise"])}</b> · {e(Pi["adresse"])}<br>{e(Pi["contact"])}<br>{e(Pi["citq"])}</p>'''

def document():
    pages = [("couverture", couverture(), ""), ("sommaire", sommaire(), ""), ("auberge", auberge(), ""), ("rupture", rupture(), "noir")]
    for i, pg in enumerate(avant_apres_pages()):
        pages.append((f"aa{i}", pg, ""))
    for p in M["PHASES"]:
        pages.append((f"phase{p['id']}", phase_page(p), ""))
    pages += [("marche", marche(), ""), ("chiffres", chiffres(), ""), ("projections", projections(), ""), ("financement", financement(), ""), ("partenaires", partenaires_calendrier(), ""), ("sources", prevu_sources(), "")]
    corps = "".join(page(c, i + 1, cls) if k != "couverture" else f'<div class="page">{c}</div>' for i, (k, c, cls) in enumerate(pages))
    return f'<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Le Mini-Spa des Inconnus · Plan d\'affaires</title><style>{CSS}</style></head><body>{corps}</body></html>'
