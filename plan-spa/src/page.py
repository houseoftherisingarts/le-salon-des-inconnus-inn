# -*- coding: utf-8 -*-
"""La page interactive (press kit) : HTML complet, à chiffrer ensuite par _encrypt.py."""
import html, re
from modele import M
import contenu as C
import graphiques as G

_NB = re.compile(r"(\d)[ \u202f\u00a0]([%$])")
def e(t):
    """Échappe et pose l'espace fine insécable entre un nombre et son % ou $ (jamais de % orphelin en début de ligne)."""
    return _NB.sub("\\1\u202f\\2", html.escape(str(t)))
argent, nombre = C.argent, C.nombre
P, R, S = M["PROJ"], M["RENTA"], M["SCENARIOS"]
PDF_NOM = "mini-spa-des-inconnus-plan-2027-k7x2.pdf"

def ps(paras, cls="prose"):
    return f'<div class="{cls}">' + "".join(f"<p>{e(p)}</p>" for p in paras) + "</div>"

def fig(titre, sous, svg, legende, cls=""):
    return f'<div class="verre fig {cls}"><div class="fig-titre"><h3>{e(titre)}</h3></div><div class="fig-sous">{e(sous)}</div><div class="fig-corps defilant">{svg}</div>{G.legende_html(legende)}<div class="tip" aria-hidden="true"></div></div>'

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
    tuiles = "".join(f'<div class="verre tuile rev"><div class="chiffre{" mot" if any(ch.isalpha() for ch in v) else ""}">{e(v)}</div><div class="etiquette">{e(l)}</div><div class="note">{e(n)}</div></div>' for v, l, n in A["tuiles"])
    svg, leg = G.mensuel()
    mos = [("salle.jpg", "La salle à manger", "l"), ("biblio.jpg", "La bibliothèque", "h"), ("hemerocales.jpg", "Les hémérocalles", ""), ("yourte.jpg", "La yourte", ""), ("drone.jpg", "Le domaine vu du ciel", "l"), ("cuisine.jpg", "La grande cuisine", "h"), ("barista.jpg", "Le café", ""), ("projecteur.jpg", "La salle de projection", "")]
    mosaique = "".join(f'<figure class="{c}"><img src="media/{f}" alt="{e(t)}" loading="lazy"><figcaption>{e(t)}</figcaption></figure>' for f, t, c in mos)
    return f'''<section id="auberge">
  <div class="col">
    <div class="titre rev"><p class="eyebrow">{e(A["eyebrow"])}</p><h2>{e(A["titre"])}</h2></div>
    <div class="deux"><div class="rev">{ps(A["prose"], "prose lettrine")}</div><div class="grille g2">{tuiles}</div></div>
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
      <div class="rev d1">{ps(Pr["prose"], "prose lettrine")}</div>
    </div>
    <div class="phases-cartes rev d2">{cartes}</div>
  </div>
</section>'''

def survol():
    """Le domaine vu du ciel : la vraie photo de drone, et les installations de la phase 1 qui se posent au fil du défilement (canvas scrubbé, deux images)."""
    V = C.SURVOL
    postes = M["PHASES"][0]["postes"]
    etapes = []
    for i, (titre, ligne, poste, _pts) in enumerate(V["etapes"]):
        etapes.append(f'<div class="etape" data-i="{i}"><div class="num">0{i+1}</div><h3>{e(titre)}</h3><p>{e(ligne)}</p><div class="cout">{argent(postes[poste][2])}</div></div>')
    pts = ";".join("|".join(f"{x},{y},{r}" for x, y, r in ps_) for _, _, _, ps_ in V["etapes"])
    fin = V["fin"]
    return f'''<section class="survol" id="survol" data-points="{pts}">
  <div class="colle">
    <canvas aria-hidden="true"></canvas>
    <img class="repli" src="media/survol-apres.webp" alt="Le domaine vu du ciel avec les installations de la phase 1" loading="lazy">
    <div class="voile" aria-hidden="true"></div>
    <div class="col entete"><p class="eyebrow">{e(V["eyebrow"])}</p><h2>{e(V["titre"])}</h2><p class="lead">{e(V["lead"])}</p></div>
    <div class="etapes">{"".join(etapes)}<div class="etape fin" data-i="{len(etapes)}"><div class="num">{e(fin[0])}</div><h3>{e(fin[1])}</h3><p>{e(fin[2])}</p><div class="cout">{argent(M["PHASES"][0]["cout"])}</div></div></div>
    <div class="jauge" aria-hidden="true"><i></i></div>
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
  <div class="verre gain"><div class="k">Plus-value</div><p style="color:var(--texte);margin-top:0">{e(t["plus_value"])}</p></div>
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
    cartes = "".join(f'<div class="verre carte {"reco" if "Inconnus" in t else ""}"><h3>{e(t)}</h3><div class="chiffre" style="font-family:var(--display);font-weight:500;letter-spacing:-.035em;font-size:30px;color:var(--or-2);margin-bottom:10px">{e(prix)}</div><p>{e(d)}</p><div class="src"><a href="{u}" target="_blank" rel="noopener">{e(lab)}</a></div></div>' for t, prix, d, lab, u in Ma["cartes"])
    return f'''<section id="marche">
  <div class="col">
    <div class="titre rev"><p class="eyebrow">{e(Ma["eyebrow"])}</p><h2>{e(Ma["titre"])}</h2></div>
    <div class="deux rev"><div>{ps(Ma["prose"][:2], "prose lettrine")}</div><div>{ps(Ma["prose"][2:])}</div></div>
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

def solidite():
    So = C.SOLIDITE
    th = "".join(f"<th>{e(h)}</th>" for h in So["colonnes"])
    lignes = []
    for i, sc in enumerate(M["SENS"]):
        r = sc["rows"]
        lignes.append(f'<tr class="{"base" if i == 0 else ""}"><td>{e(sc["nom"])}<small>{e(sc["note"])}</small></td><td>{C.dec(r[1]["dscr"])}×</td><td>{C.dec(r[2]["dscr"])}×</td><td>{C.dec(r[3]["dscr"])}×</td><td>{C.signe(r[2]["flux"])}</td></tr>')
    garanties = "".join(f'<div class="verre risque"><div><div class="k">{e(k)}</div></div><p>{e(v)}</p></div>' for k, v in So["garanties"])
    equipe = "".join(f'<div class="verre membre"><p class="eyebrow">{e(r)}</p><h3>{e(n)}</h3><p>{e(t)}</p></div>' for n, r, t in So["equipe"])
    return f'''<section id="solidite">
  <div class="col">
    <div class="titre rev"><p class="eyebrow">{e(So["eyebrow"])}</p><h2>{e(So["titre"])}</h2><p class="lead">{e(So["lead"])}</p></div>
    <div class="verre rev" style="padding:26px;overflow:auto"><table class="sens"><thead><tr>{th}</tr></thead><tbody>{"".join(lignes)}</tbody></table></div>
    <div class="rev" style="margin-top:34px">{ps(So["prose"])}</div>
    <div style="height:56px"></div>
    <p class="eyebrow rev">{e(So["garanties_titre"])}</p>
    <div class="risques rev">{garanties}</div>
    <div style="height:56px"></div>
    <p class="eyebrow rev">{e(So["equipe_titre"])}</p>
    <div class="equipe rev">{equipe}</div>
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

NAV = [("auberge", "L'auberge"), ("projet", "Le projet"), ("avant-apres", "Avant / après"), ("phases", "Les phases"), ("marche", "Le marché"), ("chiffres", "Les chiffres"), ("financement", "Financement"), ("solidite", "Solidité"), ("partenaires", "Partenaires"), ("calendrier", "Calendrier")]

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

SCRIPT_SURVOL = r"""
(function(){
  var sec=document.getElementById('survol'); if(!sec) return;
  var cv=sec.querySelector('canvas'), colle=sec.querySelector('.colle'), entete=sec.querySelector('.entete'), jauge=sec.querySelector('.jauge i');
  var etapes=[].slice.call(sec.querySelectorAll('.etape'));
  var reduit=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(reduit||!cv.getContext){sec.classList.add('statique');etapes.forEach(function(x){x.classList.add('vu')});return;}
  var pts=sec.getAttribute('data-points').split(';').map(function(s){return s.split('|').map(function(q){var a=q.split(',').map(Number);return {x:a[0],y:a[1],r:a[2]}})});
  var N=pts.length, DEBUT=0.08, PAS=0.15, DUREE=0.12;
  var mob=window.innerWidth<=720, suffixe='';
  var avant=new Image(), apres=new Image(), prets=0;
  avant.src='media/survol-avant'+suffixe+'.webp'; apres.src='media/survol-apres'+suffixe+'.webp';
  avant.onload=apres.onload=function(){prets++; if(prets===2){sec.classList.add('pret');dessine(true)}};
  var ctx=cv.getContext('2d'), off=document.createElement('canvas'), octx=off.getContext('2d'), masque=document.createElement('canvas'), mctx=masque.getContext('2d');
  var cible=0, cour=0, actif=false, W=0, H=0, dpr=1, derniere=-1;
  function taille(){dpr=Math.min(2,window.devicePixelRatio||1);var b=colle.getBoundingClientRect();W=Math.round(b.width);H=Math.round(b.height);
    [cv,off,masque].forEach(function(c){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr)});cv.style.width=W+'px';cv.style.height=H+'px';derniere=-1;}
  function sortie(t){return 1-Math.pow(1-Math.max(0,Math.min(1,t)),5)}
  function progres(){var r=sec.getBoundingClientRect();var course=sec.offsetHeight-window.innerHeight;return course>0?Math.max(0,Math.min(1,-r.top/course)):0}
  /* foyer : sur mobile, la caméra glisse d'une installation à l'autre (point principal de chaque étape), puis recule sur la vue d'ensemble */
  var VUE={x:0.385,y:0.78};
  function centre(i){var s=pts[i],x=0,y=0;s.forEach(function(q){x+=q.x;y+=q.y});return {x:x/s.length,y:y/s.length}}
  function foyer(p){
    var u=(p-DEBUT)/PAS, k=sortie(p/DEBUT), fin=sortie((p-(DEBUT+(N-1)*PAS+DUREE))/0.1);
    var c0=centre(0); if(u<=0) return {x:VUE.x+(c0.x-VUE.x)*k, y:VUE.y+(c0.y-VUE.y)*k, k:k, fin:0};
    var i=Math.min(N-1,Math.floor(u)), j=Math.min(N-1,i+1), t=sortie((u-i-0.72)/0.28), a=centre(i), b=centre(j);
    var x=a.x+(b.x-a.x)*t, y=a.y+(b.y-a.y)*t;
    return {x:x+(VUE.x-x)*fin, y:y+(VUE.y-y)*fin, k:1-fin, fin:fin};
  }
  function cadre(p){
    var iw=avant.naturalWidth, ih=avant.naturalHeight; var f=foyer(p);
    var z=mob?1:1+0.22*sortie(p/0.4)*(1-0.5*f.fin);
    var s=Math.max(W/iw,H/ih)*z; var dw=iw*s, dh=ih*s;
    var fx=mob?f.x:0.45, fy=mob?f.y:0.78;
    var ox=W/2-fx*dw, oy=H/2-fy*dh; ox=Math.min(0,Math.max(W-dw,ox)); oy=Math.min(0,Math.max(H-dh,oy));
    return {s:s,ox:ox,oy:oy,dw:dw,dh:dh};
  }
  function dessine(force){
    if(prets<2||!W) return; var p=cour; if(!force&&Math.abs(p-derniere)<0.0005) return; derniere=p;
    var c=cadre(p); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
    ctx.drawImage(avant,c.ox,c.oy,c.dw,c.dh);
    mctx.setTransform(dpr,0,0,dpr,0,0); mctx.clearRect(0,0,W,H); var tout=0, ks=[];
    for(var i=0;i<N;i++){ks[i]=sortie((p-(DEBUT+i*PAS))/DUREE);}
    mctx.globalCompositeOperation='source-over';
    for(var i=0;i<N;i++){var k=ks[i]; if(k<=0) continue; tout++;
      pts[i].forEach(function(q){var x=c.ox+q.x*c.dw, y=c.oy+q.y*c.dh, R=q.r*c.dw*k+1;
      var g=mctx.createRadialGradient(x,y,0,x,y,R); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(0.5,'rgba(0,0,0,1)'); g.addColorStop(1,'rgba(0,0,0,0)');
      mctx.fillStyle=g; mctx.beginPath(); mctx.arc(x,y,R,0,Math.PI*2); mctx.fill();});}
    /* les installations à venir restent cachées : on perce leur zone dans le masque, et le trou se referme à mesure qu'elles se révèlent */
    mctx.globalCompositeOperation='destination-out';
    for(var i=0;i<N;i++){var k2=ks[i]; if(k2>=1) continue;
      pts[i].forEach(function(q){if(q.r>0.1) return; var x=c.ox+q.x*c.dw, y=c.oy+q.y*c.dh, R=Math.min(q.r,0.065)*c.dw*(1-k2)*0.95+1;
      var g=mctx.createRadialGradient(x,y,0,x,y,R); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(0.6,'rgba(0,0,0,1)'); g.addColorStop(1,'rgba(0,0,0,0)');
      mctx.fillStyle=g; mctx.beginPath(); mctx.arc(x,y,R,0,Math.PI*2); mctx.fill();});}
    if(tout){octx.setTransform(dpr,0,0,dpr,0,0); octx.globalCompositeOperation='source-over'; octx.clearRect(0,0,W,H); octx.drawImage(apres,c.ox,c.oy,c.dw,c.dh);
      octx.globalCompositeOperation='destination-in'; octx.drawImage(masque,0,0,W,H); ctx.drawImage(off,0,0,W,H);}
    var act=-1; for(var j=0;j<N;j++){if(p>=DEBUT+j*PAS) act=j;} if(p>=DEBUT+N*PAS-0.02) act=N;
    if(act>=0&&act<N){var q=pts[act][0], X=c.ox+q.x*c.dw, Y=c.oy+q.y*c.dh, tt=(p-(DEBUT+act*PAS))/DUREE, a=Math.min(1,tt*2);
      ctx.strokeStyle='rgba(217,185,120,'+(0.9*a)+')'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(X,Y,14,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='rgba(243,229,171,'+a+')'; ctx.beginPath(); ctx.arc(X,Y,3.5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(217,185,120,'+(0.35*a)+')'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(X,Y,26,0,Math.PI*2); ctx.stroke();}
    etapes.forEach(function(el,i){el.classList.toggle('vu',i===act)});
    entete.classList.toggle('efface',p>0.05); jauge.style.transform='scaleX('+p+')';
  }
  function boucle(){cour+=(cible-cour)*0.16; if(Math.abs(cible-cour)<0.0004) cour=cible; dessine(false); if(actif) requestAnimationFrame(boucle);}
  function surScroll(){cible=progres()}
  window.addEventListener('scroll',surScroll,{passive:true}); window.addEventListener('resize',function(){taille();surScroll();dessine(true)});
  if('IntersectionObserver' in window){new IntersectionObserver(function(es){es.forEach(function(en){var av=actif;actif=en.isIntersecting;if(actif&&!av){surScroll();requestAnimationFrame(boucle)}})},{rootMargin:'20% 0px'}).observe(sec);}
  else {actif=true;requestAnimationFrame(boucle)}
  taille(); surScroll(); cour=cible;
})();
"""


def page():
    nav = "".join(f'<a href="#{i}">{e(n)}</a>' for i, n in NAV)
    corps = hero() + aujourdhui() + projet() + survol() + avant_apres() + phases() + marche() + chiffres() + financement() + solidite() + partenaires() + calendrier() + fermeture() + pied()
    return _NB.sub("\\1\u202f\\2", f'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>Le Mini-Spa des Inconnus · Plan d'affaires</title>
<link rel="icon" href="media/logo.png">
<link rel="stylesheet" href="style.css?v={int(__import__("time").time())}">
<style>
.phases-cartes{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:56px}}
.phase-carte{{border:1px solid #c9a565;border-radius:15px;padding:24px 26px;background:rgba(255,255,255,.35)}}
.phase-carte .num{{font-family:var(--display);font-weight:500;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8a6b33}}
.phase-carte .nom{{font-family:var(--display);font-weight:500;letter-spacing:-.025em;font-size:24px;color:var(--encre);margin:8px 0 10px}}
.phase-carte .somme{{font-family:var(--display);font-weight:500;font-size:34px;color:#6b4e1f;letter-spacing:-.03em;font-variant-numeric:tabular-nums}}
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
<script>{SCRIPT_SURVOL}</script>
<script>document.querySelectorAll('.defilant').forEach(d=>{{const f=()=>d.classList.toggle('fin-de-course',d.scrollLeft+d.clientWidth>=d.scrollWidth-2);d.addEventListener('scroll',f,{{passive:true}});f()}})</script>
</body>
</html>''')
