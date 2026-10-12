# -*- coding: utf-8 -*-
"""La page interactive (press kit) : HTML complet, à chiffrer ensuite par _encrypt.py."""
import html
from modele import M
import contenu as C
import graphiques as G

e = html.escape
argent, nombre = C.argent, C.nombre
P, R, S = M["PROJ"], M["RENTA"], M["SCENARIOS"]
PDF_NOM = "mini-spa-des-inconnus-plan-2027-k7x2.pdf"

def ps(paras, cls="prose"):
    return f'<div class="{cls}">' + "".join(f"<p>{e(p)}</p>" for p in paras) + "</div>"

def fig(titre, sous, svg, legende, cls=""):
    return f'<div class="verre fig {cls}"><div class="fig-titre"><h3>{e(titre)}</h3></div><div class="fig-sous">{e(sous)}</div>{svg}{G.legende_html(legende)}<div class="tip" aria-hidden="true"></div></div>'

def hero():
    puces = "".join(f'<span class="puce"><b>{e(v)}</b>{e(l)}</span>' for v, l in C.HERO["puces"])
    return f'''<section class="hero" id="haut">
  <div class="fond"><img src="media/hero.jpg" alt="Le manoir du Salon des Inconnus au coucher du soleil" fetchpriority="high"></div>
  <div class="voile"></div><div class="brume" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="col contenu">
    <p class="eyebrow rev">{e(C.HERO["eyebrow"])}</p>
    <h1 class="rev d1">{e(C.HERO["titre"])}</h1>
    <p class="sous rev d2">{e(C.HERO["sous"])}</p>
    <div class="puces rev d3">{puces}</div>
    <div class="defile" aria-hidden="true"><i></i>Défiler</div>
  </div>
</section>'''

def aujourdhui():
    A = C.AUJOURDHUI
    tuiles = "".join(f'<div class="verre tuile rev"><div class="chiffre">{e(v)}</div><div class="etiquette">{e(l)}</div><div class="note">{e(n)}</div></div>' for v, l, n in A["tuiles"])
    svg, leg = G.mensuel()
    mos = [("salle.jpg", "La salle à manger", "l"), ("biblio.jpg", "La bibliothèque", "h"), ("hemerocales.jpg", "Les hémérocalles", ""), ("yourte.jpg", "La yourte", ""), ("drone.jpg", "Le domaine vu du ciel", "l"), ("cuisine.jpg", "La grande cuisine", "h"), ("barista.jpg", "Le café", ""), ("projecteur.jpg", "La salle de projection", "")]
    mosaique = "".join(f'<figure class="{c}"><img src="media/{f}" alt="{e(t)}" loading="lazy"><figcaption>{e(t)}</figcaption></figure>' for f, t, c in mos)
    return f'''<section id="auberge">
  <div class="col">
    <div class="titre rev"><p class="eyebrow">{e(A["eyebrow"])}</p><h2>{e(A["titre"])}</h2></div>
    <div class="deux"><div class="rev">{ps(A["prose"])}</div><div class="grille g2">{tuiles}</div></div>
    <div style="height:48px"></div>
    <div class="rev">{fig(A["graphique"]["titre"], A["graphique"]["sous"], svg, leg)}</div>
    <div style="height:48px"></div>
    <div class="mosaique rev">{mosaique}</div>
  </div>
</section>'''

def projet():
    Pr = C.PROJET
    cartes = "".join(f'<div class="phase-carte"><div class="num">Phase {p["id"]}</div><div class="nom">{e(p["nom"])}</div><div class="somme">{argent(p["cout"])}</div><div class="an">{e(p["annee"])}</div></div>' for p in M["PHASES"])
    return f'''<section class="rupture" id="projet">
  <div class="col">
    <p class="eyebrow rev">{e(Pr["eyebrow"])}</p>
    <div class="deux" style="align-items:center">
      <div class="rev"><div class="grand">{e(Pr["grand"])}</div><h2 style="font-size:clamp(28px,3.2vw,46px);margin-top:18px">{e(Pr["titre"])}</h2></div>
      <div class="rev d1">{ps(Pr["prose"])}</div>
    </div>
    <div class="phases-cartes rev d2">{cartes}</div>
  </div>
</section>'''

def avant_apres():
    A = C.AVANT_APRES
    items = []
    for i, (k, av, ap, ph) in enumerate(A["items"]):
        items.append(f'''<div class="rev"><div class="compare" style="--x:50%">
  <img class="avant" src="media/avant-{k}.jpg" alt="Avant : {e(av)}" loading="lazy">
  <img class="apres" src="media/apres-{k}.jpg" alt="Après : {e(ap)}" loading="lazy">
  <span class="tag g">Aujourd'hui</span><span class="tag d">{e(ph)}</span>
  <div class="poignee"><i>&#x2194;</i></div>
  <input type="range" min="2" max="98" value="50" aria-label="Glisser pour comparer avant et après">
</div><div class="compare-legende"><div><b>Avant</b>{e(av)}</div><div style="text-align:right"><b>Après</b>{e(ap)}</div></div></div>''')
    return f'''<section id="avant-apres">
  <div class="col">
    <div class="titre rev"><p class="eyebrow">{e(A["eyebrow"])}</p><h2>{e(A["titre"])}</h2><p class="lead">{e(A["lead"])}</p></div>
    <div class="apres-liste">{"".join(items)}</div>
  </div>
</section>'''

def phases():
    onglets = "".join(f'<button type="button" data-phase="{p["id"]}" class="{"actif" if p["id"]==1 else ""}">Phase {p["id"]} <b>{argent(p["cout"])}</b></button>' for p in M["PHASES"])
    blocs = []
    for p in M["PHASES"]:
        t = C.PHASES_TEXTE[p["id"]]; r = R[p["id"]]
        lignes = "".join(f'<tr><td>{e(n)}{f"<small>{e(d)}</small>" if d else ""}</td><td>{argent(c)}</td></tr>' for n, d, c in p["postes"])
        gains = f'''<div class="gains">
  <div class="verre gain"><div class="k">Revenus additionnels à maturité</div><div class="v">{argent(r["revenus"])}<small> / an</small></div><p>{e(r["texte"])}</p></div>
  <div class="verre gain"><div class="k">Contribution annuelle</div><div class="v">{argent(r["contribution"])}</div><p>après les charges propres à la phase, soit un retour sur l'investissement en {str(r["retour_ans"]).replace(".", ",")} ans</p></div>
  <div class="verre gain"><div class="k">Plus-value</div><p style="font-size:15px;color:var(--texte);margin-top:0">{e(t["plus_value"])}</p></div>
</div>'''
        blocs.append(f'''<div class="phase {"actif" if p["id"]==1 else ""}" data-phase="{p["id"]}">
  <div class="entete"><div><p class="eyebrow">Phase {p["id"]} · {e(p["annee"])}</p><h3>{e(p["nom"])}</h3></div><div class="montant">{argent(p["cout"])}<small>Coût estimé, imprévus compris</small></div></div>
  <div class="prose" style="margin-bottom:28px"><p>{e(t["intro"])}</p></div>
  <div class="corps"><div class="verre" style="padding:26px"><table class="postes"><thead><tr><th>Poste</th><th>Estimation</th></tr></thead><tbody>{lignes}<tr class="total"><td>Total de la phase</td><td>{argent(p["cout"])}</td></tr></tbody></table></div>{gains}</div>
</div>''')
    return f'''<section id="phases">
  <div class="col">
    <div class="titre rev"><p class="eyebrow">Les trois phases</p><h2>Trois phases, chacune rentable</h2><p class="lead">Les estimations viennent des prix publiés en 2026 par les fabricants et les entrepreneurs du Québec; trois soumissions par poste les remplaceront avant le chantier. Chaque phase porte 10 % d'imprévus.</p></div>
    <div class="onglets rev">{onglets}</div>
    {"".join(blocs)}
  </div>
</section>'''

def marche():
    Ma = C.MARCHE
    cartes = "".join(f'<div class="verre carte {"reco" if "Inconnus" in t else ""}"><h3>{e(t)}</h3><div class="chiffre" style="font-family:Prata,serif;font-size:30px;color:var(--or-2);margin-bottom:10px">{e(prix)}</div><p>{e(d)}</p><div class="src"><a href="{u}" target="_blank" rel="noopener">{e(lab)}</a></div></div>' for t, prix, d, lab, u in Ma["cartes"])
    return f'''<section id="marche">
  <div class="col">
    <div class="titre rev"><p class="eyebrow">{e(Ma["eyebrow"])}</p><h2>{e(Ma["titre"])}</h2></div>
    <div class="deux rev"><div>{ps(Ma["prose"][:2])}</div><div>{ps(Ma["prose"][2:])}</div></div>
    <div style="height:40px"></div>
    <div class="cartes rev">{cartes}</div>
  </div>
</section>'''

def chiffres():
    Ch = C.CHIFFRES
    svg1, l1 = G.revenus_empiles(); svg2, l2 = G.ebitda_dette()
    hyp = "".join(f'<div class="verre risque"><div><div class="k">{e(k)}</div></div><p>{e(v)}</p></div>' for k, v in Ch["hypotheses"])
    ent = "".join(f"<th>{r['annee']}</th>" for r in P)
    def ligne(nom, cle, cls=""):
        return f'<tr class="{cls}"><td>{e(nom)}</td>' + "".join(f"<td>{argent(r[cle])}</td>" for r in P) + "</tr>"
    tableau = f'''<div class="verre" style="padding:26px"><div class="defilant"><table class="fin"><thead><tr><th>Année</th>{ent}</tr></thead><tbody>
{ligne("Hébergement", "hebergement")}{ligne("Accès aux bains", "acces")}{ligne("Massages, part de l'auberge", "massages")}{ligne("Café, marge", "cafe")}{ligne("Retraites et groupes", "retraites")}
{ligne("Revenus", "revenus", "total")}{ligne("Charges d'exploitation", "opex", "sous")}{ligne("Bénéfice d'exploitation", "ebitda", "total")}{ligne("Service de la dette, ancienne et nouvelle", "service_total", "sous")}{ligne("Flux après service de la dette", "flux", "total or")}
<tr class="sous"><td>Couverture du service de la dette</td>{"".join(f"<td>{str(r['dscr']).replace('.', ',')}×</td>" for r in P)}</tr>
<tr class="sous"><td>Nuits vendues · prix moyen</td>{"".join(f"<td>{nombre(r['nuits'])} · {r['adr']} $</td>" for r in P)}</tr>
<tr class="sous"><td>Visites du public</td>{"".join(f"<td>{nombre(r['visites'])}</td>" for r in P)}</tr>
</tbody></table></div></div>'''
    return f'''<section id="chiffres">
  <div class="col">
    <div class="titre rev"><p class="eyebrow">{e(Ch["eyebrow"])}</p><h2>{e(Ch["titre"])}</h2><p class="lead">{e(Ch["lead"])}</p></div>
    <div class="rev">{fig(Ch["graphique1"]["titre"], Ch["graphique1"]["sous"], svg1, l1)}</div>
    <div style="height:18px"></div>
    <div class="rev">{fig(Ch["graphique2"]["titre"], Ch["graphique2"]["sous"], svg2, l2)}</div>
    <div style="height:18px"></div>
    <div class="rev">{tableau}</div>
    <div style="height:40px"></div>
    <p class="eyebrow rev">Les hypothèses, écrites noir sur blanc</p>
    <div class="risques rev">{hyp}</div>
  </div>
</section>'''

def financement():
    F = C.FINANCEMENT
    cartes = []
    for s in S:
        reco = s["nom"] == "Le plan complet"
        ph = ", ".join(f"phase {p}" for p in s["phases"])
        cartes.append(f'''<div class="verre scen {"reco" if reco else ""}">{"<span class='badge'>Recommandé</span>" if reco else ""}
  <p class="eyebrow" style="margin-bottom:6px">{e(ph)}</p><h3>{e(s["nom"])}</h3><div class="somme">{argent(s["montant"])}</div>
  <ul><li>Prêt BDC de {argent(s["bdc"])}</li><li>Tourisme Outaouais, {argent(s["pdto"])}</li><li>Mise de fonds de {argent(s["mise"])}</li></ul>
  <p class="muted" style="font-size:14.5px">{e(s["note"])}</p>
  <div class="rendement"><div><b>{argent(s["revenus_an3"])}</b><span>Revenus, an 3</span></div><div><b>{argent(s["flux_an3"])}</b><span>Flux libre, an 3</span></div><div><b>{str(s["dscr_an3"]).replace(".", ",")}×</b><span>Couverture, an 3</span></div><div><b>{argent(s["revenus_an5"])}</b><span>Revenus, an 5</span></div></div>
</div>''')
    montage = "".join(f'<tr><td>{e(n)}<small>{e(d)}</small></td><td>{e(v)}</td></tr>' for n, v, d in F["montage"])
    prose = [p.replace(str(P[1]["dscr"]), str(P[1]["dscr"]).replace(".", ",")).replace(str(P[2]["dscr"]), str(P[2]["dscr"]).replace(".", ",")) for p in F["prose"]]
    return f'''<section id="financement">
  <div class="col">
    <div class="titre rev"><p class="eyebrow">{e(F["eyebrow"])}</p><h2>{e(F["titre"])}</h2><p class="lead">{e(F["lead"])}</p></div>
    <div class="scenarios rev">{"".join(cartes)}</div>
    <div style="height:48px"></div>
    <div class="deux rev"><div class="verre" style="padding:26px"><p class="eyebrow">{e(F["montage_titre"])}</p><table class="postes"><tbody>{montage}<tr class="total"><td>Total du projet</td><td>{argent(M["TOTAL"])}</td></tr></tbody></table></div><div>{ps(prose)}</div></div>
  </div>
</section>'''

def partenaires():
    Pa = C.PARTENAIRES
    sites = "".join(f'<a class="site" href="{u}" target="_blank" rel="noopener"><img src="media/{img}" alt="{e(t)}" loading="lazy"><div class="l"><b>{e(t)}</b><span>{e(d)}</span><u>{e(u.replace("https://", "").replace("www.", ""))}</u></div></a>' for t, d, u, img in Pa["sites"])
    mc = Pa["mapchef"]
    return f'''<section id="partenaires">
  <div class="col">
    <div class="titre rev"><p class="eyebrow">{e(Pa["eyebrow"])}</p><h2>{e(Pa["titre"])}</h2></div>
    <div class="deux rev">
      <div><a class="site" href="{mc["url"]}" target="_blank" rel="noopener"><img src="media/{mc["image"]}" alt="Le site MapChef"><div class="l"><b>{e(mc["titre"])}</b><span>{e(mc["prose"])}</span><u>mapchef.ca</u></div></a></div>
      <div><a class="site" href="https://www.tourismeoutaouais.com" target="_blank" rel="noopener"><img src="media/drone.jpg" alt="Le domaine vu du ciel" loading="lazy"><div class="l"><b>{e(Pa["outaouais"]["titre"])}</b><span>{e(Pa["outaouais"]["prose"])}</span><u>tourismeoutaouais.com</u></div></a></div>
    </div>
    <div style="height:40px"></div>
    <p class="eyebrow rev">Nos adresses</p>
    <div class="sites rev">{sites}</div>
  </div>
</section>'''

def calendrier():
    Ca = C.CALENDRIER
    jalons = "".join(f'<div class="jalon"><div class="q">{e(q)}</div><div class="t">{e(t)}</div><p>{e(d)}</p></div>' for q, t, d in Ca["jalons"])
    prevu = "".join(f'<div class="verre risque"><div><div class="k ok">{e(k)}</div></div><p>{e(v)}</p></div>' for k, v in Ca["prevu"])
    return f'''<section id="calendrier">
  <div class="col">
    <div class="titre rev"><p class="eyebrow">{e(Ca["eyebrow"])}</p><h2>{e(Ca["titre"])}</h2></div>
    <div class="jalons rev">{jalons}</div>
    <div style="height:56px"></div>
    <p class="eyebrow rev">{e(Ca["prevu_titre"])}</p>
    <div class="risques rev">{prevu}</div>
  </div>
</section>'''

def fermeture():
    return f'''<section class="plein" id="fin">
  <div class="fond"><img src="media/apres-hiver.jpg" alt="Le parcours thermal en hiver" loading="lazy"></div><div class="voile"></div>
  <div class="col rev"><p class="eyebrow">Le prochain geste</p><h2>Les bains ouvrent en novembre 2027</h2>
  <p class="lead" style="margin:22px 0 30px">Le plan complet, ses hypothèses et ses sources tiennent dans le document PDF ci-dessous. Les soumissions des fournisseurs et les états financiers 2023 à 2025 accompagnent la demande.</p>
  <p><a class="btn" href="{PDF_NOM}" download>Télécharger le plan en PDF</a> <a class="btn vide" href="#haut">Revenir au début</a></p></div>
</section>'''

def pied():
    Pi = C.PIED
    return f'''<footer>
  <div class="col">
    <div><div class="marque"><img src="media/logo.png" alt="" width="56" height="56"><div><b>Le Salon des Inconnus</b><span>{e(Pi["entreprise"])}</span></div></div><p style="margin-top:18px">{e(Pi["colophon"])}</p></div>
    <div><div class="k">Adresse</div><p>{e(Pi["adresse"])}<br>{e(Pi["citq"])}</p></div>
    <div><div class="k">Contact</div><p>{e(Pi["contact"])}</p><div class="k" style="margin-top:18px">Document</div><p><a href="{PDF_NOM}" download>Version PDF du plan</a></p></div>
  </div>
  <div class="col colophon"><span>Le Mini-Spa des Inconnus · Plan d'affaires · Octobre 2026</span><span>Préparé par Vexel, le studio web du Salon des Inconnus</span></div>
</footer>'''

NAV = [("auberge", "L'auberge"), ("projet", "Le projet"), ("avant-apres", "Avant / après"), ("phases", "Les phases"), ("marche", "Le marché"), ("chiffres", "Les chiffres"), ("financement", "Financement"), ("partenaires", "Partenaires"), ("calendrier", "Calendrier")]

SCRIPT = r'''
(function(){
  var pre=document.getElementById('pre');
  window.addEventListener('load',function(){setTimeout(function(){pre.classList.add('parti');document.body.classList.add('pret');},900)});
  setTimeout(function(){pre.classList.add('parti')},2600);
  var barre=document.querySelector('header.barre'),prog=document.querySelector('.progres');
  var liens=[].slice.call(document.querySelectorAll('header.barre nav a'));
  var cibles=liens.map(function(a){return document.getElementById(a.getAttribute('href').slice(1))});
  function surScroll(){
    var y=window.scrollY||0;barre.classList.toggle('voile',y>40);
    var h=document.documentElement.scrollHeight-window.innerHeight;prog.style.width=(h>0?Math.min(100,y/h*100):0)+'%';
    var act=0;for(var i=0;i<cibles.length;i++){if(cibles[i]&&cibles[i].getBoundingClientRect().top<window.innerHeight*0.4)act=i;}
    liens.forEach(function(a,i){a.classList.toggle('actif',i===act)});
  }
  window.addEventListener('scroll',surScroll,{passive:true});surScroll();
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('vu');io.unobserve(en.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:0.05});
    document.querySelectorAll('.rev').forEach(function(el){io.observe(el)});
  } else {document.querySelectorAll('.rev').forEach(function(el){el.classList.add('vu')});}
  document.querySelectorAll('.compare').forEach(function(c){
    var r=c.querySelector('input');function maj(){c.style.setProperty('--x',r.value+'%')}
    r.addEventListener('input',maj);maj();
  });
  document.querySelectorAll('.onglets button').forEach(function(b){
    b.addEventListener('click',function(){
      var id=b.getAttribute('data-phase');
      document.querySelectorAll('.onglets button').forEach(function(x){x.classList.toggle('actif',x===b)});
      document.querySelectorAll('.phase').forEach(function(p){p.classList.toggle('actif',p.getAttribute('data-phase')===id)});
    });
  });
  document.querySelectorAll('.fig').forEach(function(f){
    var tip=f.querySelector('.tip');
    f.querySelectorAll('[data-tip]').forEach(function(m){
      m.addEventListener('mouseenter',function(){tip.textContent=m.getAttribute('data-tip');tip.classList.add('vu')});
      m.addEventListener('mousemove',function(ev){var b=f.getBoundingClientRect();tip.style.left=(ev.clientX-b.left)+'px';tip.style.top=(ev.clientY-b.top)+'px'});
      m.addEventListener('mouseleave',function(){tip.classList.remove('vu')});
    });
  });
})();
'''

def page():
    nav = "".join(f'<a href="#{i}">{e(n)}</a>' for i, n in NAV)
    corps = hero() + aujourdhui() + projet() + avant_apres() + phases() + marche() + chiffres() + financement() + partenaires() + calendrier() + fermeture() + pied()
    return f'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>Le Mini-Spa des Inconnus · Plan d'affaires</title>
<link rel="icon" href="media/logo.png">
<link rel="stylesheet" href="style.css">
<style>
.phases-cartes{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:56px}}
.phase-carte{{border:1px solid #c9a565;border-radius:15px;padding:24px 26px;background:rgba(255,255,255,.35)}}
.phase-carte .num{{font-family:Cinzel,serif;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#8a6b33}}
.phase-carte .nom{{font-family:Prata,serif;font-size:24px;color:var(--encre);margin:8px 0 10px}}
.phase-carte .somme{{font-family:Prata,serif;font-size:34px;color:#6b4e1f;letter-spacing:-.02em}}
.phase-carte .an{{font-size:13px;color:#8a6b33;margin-top:6px}}
.carte.reco{{border-color:var(--or);box-shadow:0 0 0 1px var(--or)}}
@media (max-width:720px){{.phases-cartes{{grid-template-columns:1fr}}}}
</style>
</head>
<body>
<div id="pre" aria-hidden="true"><div class="marque"><img src="media/logo.png" alt=""><div class="nom">Le Salon des Inconnus</div><div class="fil"><i></i></div></div></div>
<div class="progres" aria-hidden="true"></div>
<header class="barre"><div class="col"><a class="logo" href="#haut"><img src="media/logo.png" alt=""><span>Le Mini-Spa des Inconnus</span></a><nav>{nav}</nav><a class="pdf" href="{PDF_NOM}" download>PDF</a></div></header>
<main>{corps}</main>
<script>{SCRIPT}</script>
</body>
</html>'''
