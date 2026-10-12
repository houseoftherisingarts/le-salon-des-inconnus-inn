# -*- coding: utf-8 -*-
"""Graphiques SVG du plan, générés en Python pour la page et le PDF.
Palettes validées avec dataviz/validate_palette.js (mode sombre sur #0d0b09, mode clair sur #F4ECD8)."""
import json
from modele import M

SOMBRE = dict(serie=["#b58c2f", "#1fa39b", "#b5602c", "#7d6bd0", "#6f9a3c"], axe="rgba(251,247,239,.38)", grille="rgba(255,255,255,.08)",
              texte="#f3e5ab", accent="#c5a059", muet="#5f574a", police="Lato, sans-serif")
CLAIR = dict(serie=["#9a7224", "#0a9189", "#9c4f22", "#6a56c2", "#5e8530"], axe="#8A6B33", grille="rgba(42,31,14,.12)",
             texte="#2A1F0E", accent="#B08A3E", muet="#cbbb95", police="Lato, sans-serif")

MOIS = {"2025-01": 3285, "2025-02": 5347, "2025-03": 3996, "2025-04": 7126, "2025-05": 5096, "2025-06": 8101, "2025-07": 7204, "2025-08": 16055,
        "2025-09": 8651, "2025-10": 10506, "2025-11": 6767, "2025-12": 11003, "2026-01": 3118, "2026-02": 9993, "2026-03": 6761, "2026-04": 4629,
        "2026-05": 8586, "2026-06": 9056, "2026-07": 17729, "2026-08": 17872, "2026-09": 13228}
NOMS_MOIS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]

def k(n):
    return f"{n/1000:.0f} k$" if n >= 1000 else f"{n} $"

def argent(n):
    return f"{int(round(n)):,}".replace(",", " ") + " $"

def mensuel(th=SOMBRE, w=1200, h=380):
    """Barres mensuelles, 2025 en teinte muette, 2026 en or. Deux séries, donc légende."""
    ml, mr, mt, mb = 54, 16, 20, 44
    cles = list(MOIS.keys()); vals = list(MOIS.values()); n = len(cles)
    vmax = 20000; pw = w - ml - mr; ph = h - mt - mb; bw = pw / n
    out = [f'<svg viewBox="0 0 {w} {h}" role="img" aria-label="Revenus mensuels 2025-2026" data-chart="mensuel">']
    for t in range(0, vmax + 1, 5000):
        y = mt + ph - ph * t / vmax
        out.append(f'<g class="axe"><line x1="{ml}" x2="{w-mr}" y1="{y:.1f}" y2="{y:.1f}" stroke="{th["grille"]}"/><text x="{ml-8}" y="{y+4:.1f}" text-anchor="end" fill="{th["axe"]}" font-size="11.5" font-family="{th["police"]}">{k(t)}</text></g>')
    for i, (c, v) in enumerate(zip(cles, vals)):
        an, mo = c.split("-"); couleur = th["accent"] if an == "2026" else th["muet"]
        bh = ph * v / vmax; x = ml + i * bw + bw * 0.18; y = mt + ph - bh; ww = bw * 0.64
        out.append(f'<rect class="bar" x="{x:.1f}" y="{y:.1f}" width="{ww:.1f}" height="{bh:.1f}" rx="3" fill="{couleur}" data-tip="{NOMS_MOIS[int(mo)-1]}{"" if False else ""} {an} · {argent(v)}"><title>{c} : {argent(v)}</title></rect>')
        out.append(f'<text x="{x+ww/2:.1f}" y="{h-mb+18}" text-anchor="middle" fill="{th["axe"]}" font-size="11" font-family="{th["police"]}">{NOMS_MOIS[int(mo)-1]}</text>')
        if v >= 13000:
            out.append(f'<text x="{x+ww/2:.1f}" y="{y-7:.1f}" text-anchor="middle" fill="{th["texte"]}" font-size="12" font-family="{th["police"]}">{k(v)}</text>')
        if mo == "01":
            out.append(f'<text x="{ml + i*bw + 2:.1f}" y="{h-6}" fill="{th["texte"]}" font-size="11.5" font-family="Cinzel, serif" letter-spacing="2">{an}</text>')
    out.append("</svg>")
    legende = [("2026", th["accent"]), ("2025", th["muet"])]
    return "".join(out), legende

SOURCES = [("hebergement", "Hébergement"), ("acces", "Accès aux bains"), ("massages", "Massages"), ("cafe", "Café"), ("retraites", "Retraites")]

def revenus_empiles(th=SOMBRE, w=1200, h=420):
    rows = M["PROJ"]; ml, mr, mt, mb = 60, 16, 24, 40
    vmax = 800000; pw = w - ml - mr; ph = h - mt - mb; n = len(rows); bw = pw / n
    out = [f'<svg viewBox="0 0 {w} {h}" role="img" aria-label="Revenus projetés par source" data-chart="revenus">']
    for t in range(0, vmax + 1, 200000):
        y = mt + ph - ph * t / vmax
        out.append(f'<g class="axe"><line x1="{ml}" x2="{w-mr}" y1="{y:.1f}" y2="{y:.1f}" stroke="{th["grille"]}"/><text x="{ml-8}" y="{y+4:.1f}" text-anchor="end" fill="{th["axe"]}" font-size="11.5" font-family="{th["police"]}">{k(t)}</text></g>')
    for i, r in enumerate(rows):
        x = ml + i * bw + bw * 0.22; ww = bw * 0.56; cum = 0
        for j, (cle, nom) in enumerate(SOURCES):
            v = r[cle]
            if v <= 0:
                continue
            bh = ph * v / vmax; y = mt + ph - ph * (cum + v) / vmax
            out.append(f'<rect class="bar" x="{x:.1f}" y="{y+1:.1f}" width="{ww:.1f}" height="{max(bh-2,0):.1f}" rx="{3 if j==len(SOURCES)-1 or cum+v==r["revenus"] else 0}" fill="{th["serie"][j]}" data-tip="{r["annee"]} · {nom} · {argent(v)}"><title>{r["annee"]} {nom} : {argent(v)}</title></rect>')
            cum += v
        out.append(f'<text x="{x+ww/2:.1f}" y="{mt + ph - ph*cum/vmax - 8:.1f}" text-anchor="middle" fill="{th["texte"]}" font-size="13" font-family="Prata, serif">{argent(cum)}</text>')
        out.append(f'<text x="{x+ww/2:.1f}" y="{h-mb+20}" text-anchor="middle" fill="{th["texte"]}" font-size="12" font-family="Cinzel, serif" letter-spacing="2">{r["annee"]}</text>')
    out.append("</svg>")
    legende = [(nom, th["serie"][j]) for j, (cle, nom) in enumerate(SOURCES)]
    return "".join(out), legende

def ebitda_dette(th=SOMBRE, w=1200, h=360):
    rows = M["PROJ"]; ml, mr, mt, mb = 60, 16, 24, 40
    vmax = 400000; pw = w - ml - mr; ph = h - mt - mb; n = len(rows); bw = pw / n
    c1, c2 = th["serie"][0], th["serie"][1]
    out = [f'<svg viewBox="0 0 {w} {h}" role="img" aria-label="Bénéfice d\'exploitation et service de la dette" data-chart="dette">']
    for t in range(0, vmax + 1, 100000):
        y = mt + ph - ph * t / vmax
        out.append(f'<g class="axe"><line x1="{ml}" x2="{w-mr}" y1="{y:.1f}" y2="{y:.1f}" stroke="{th["grille"]}"/><text x="{ml-8}" y="{y+4:.1f}" text-anchor="end" fill="{th["axe"]}" font-size="11.5" font-family="{th["police"]}">{k(t)}</text></g>')
    for i, r in enumerate(rows):
        x0 = ml + i * bw + bw * 0.16; ww = bw * 0.32
        for j, (v, c, nom) in enumerate([(r["ebitda"], c1, "Bénéfice d'exploitation"), (r["service_total"], c2, "Service de la dette")]):
            bh = ph * v / vmax; x = x0 + j * (ww + 4); y = mt + ph - bh
            out.append(f'<rect class="bar" x="{x:.1f}" y="{y:.1f}" width="{ww:.1f}" height="{bh:.1f}" rx="3" fill="{c}" data-tip="{r["annee"]} · {nom} · {argent(v)}"><title>{r["annee"]} {nom} : {argent(v)}</title></rect>')
            out.append(f'<text x="{x+ww/2:.1f}" y="{y-7:.1f}" text-anchor="middle" fill="{th["texte"]}" font-size="12" font-family="{th["police"]}">{k(v)}</text>')
        out.append(f'<text x="{x0+ww+2:.1f}" y="{h-mb+20}" text-anchor="middle" fill="{th["texte"]}" font-size="12" font-family="Cinzel, serif" letter-spacing="2">{r["annee"]}</text>')
        out.append(f'<text x="{x0+ww+2:.1f}" y="{h-4}" text-anchor="middle" fill="{th["axe"]}" font-size="11" font-family="{th["police"]}">couverture {str(r["dscr"]).replace(".", ",")}×</text>')
    out.append("</svg>")
    return "".join(out), [("Bénéfice d'exploitation", c1), ("Service de la dette", c2)]

def legende_html(leg):
    return '<div class="legende">' + "".join(f'<span><i style="background:{c}"></i>{n}</span>' for n, c in leg) + "</div>"
