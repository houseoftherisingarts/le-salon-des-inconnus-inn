# -*- coding: utf-8 -*-
"""Assemble tout : page interactive (dist/), PDF (Chrome headless), porte chiffrée (public/plan-spa/)."""
import base64, os, shutil, subprocess, sys, pathlib
SRC = pathlib.Path(__file__).resolve().parent
PLAN = SRC.parent
RACINE = PLAN.parent
DIST = PLAN / "dist"
PUB = RACINE / "public" / "plan-spa"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
MDP = "Mini-Spa 2027"

import page, pdf

def main():
    shutil.copy(SRC / "logo.png", PLAN / "media" / "logo.png")
    DIST.mkdir(exist_ok=True)
    (DIST / "index.html").write_text(page.page(), encoding="utf-8")
    shutil.copy(SRC / "style.css", DIST / "style.css")
    for d in ("fonts", "media"):
        if (DIST / d).exists(): shutil.rmtree(DIST / d)
    shutil.copytree(SRC / "fonts", DIST / "fonts")
    shutil.copytree(PLAN / "media", DIST / "media")
    print("page ok", DIST / "index.html")

    # PDF
    (DIST / "pdf.html").write_text(pdf.document(), encoding="utf-8")
    shutil.copy(SRC / "_crest.png", DIST / "_crest.png")
    PUB.mkdir(parents=True, exist_ok=True)
    out = PUB / page.PDF_NOM
    r = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
                        "--virtual-time-budget=8000", f"--print-to-pdf={out}", (DIST / "pdf.html").as_uri()], capture_output=True, text=True)
    print("pdf", out.exists(), out.stat().st_size if out.exists() else r.stderr[-400:])

    # Porte + chiffrement
    r = subprocess.run([sys.executable, str(SRC / "_encrypt.py"), str(DIST / "index.html"), str(PUB / "plan.enc.js"), "-p", MDP], capture_output=True, text=True)
    print("enc", r.returncode, r.stdout.strip()[-200:], r.stderr.strip()[-300:])
    tpl = (SRC / "_gate-tpl.html").read_text(encoding="utf-8")
    b64 = lambda p, mime: f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()
    grain = "data:image/svg+xml;base64," + base64.b64encode(b'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/></filter><rect width="200" height="200" filter="url(#n)" opacity=".5"/></svg>').decode()
    lignes = [l for l in tpl.splitlines(True) if "logo-client" not in l]
    tpl = "".join(lignes)
    for k, v in {"__TITRE__": "Le Mini-Spa des Inconnus · Plan d'affaires", "__CLASSE__": "spa", "__SUR_A__": "Plan d'affaires",
                 "__SUR_B__": "Le Mini-Spa des Inconnus", "__LIBELLE__": "Accès réservé", "__PAYLOAD__": "plan.enc.js", "__AUTO__": "false",
                 "__F_CINZEL__": base64.b64encode((SRC / "fonts" / "cinzel.woff2").read_bytes()).decode(),
                 "__LOGO__": b64(SRC / "_crest.png", "image/png"), "__GRAIN__": grain}.items():
        tpl = tpl.replace(k, v)
    reste = [k for k in ("__TITRE__","__CLASSE__","__SUR_A__","__SUR_B__","__LIBELLE__","__PAYLOAD__","__AUTO__","__F_CINZEL__","__LOGO__","__LOGO_BDT__","__GRAIN__") if k in tpl]
    (PUB / "index.html").write_text(tpl, encoding="utf-8")
    shutil.copy(SRC / "style.css", PUB / "style.css")
    for d in ("fonts", "media"):
        if (PUB / d).exists(): shutil.rmtree(PUB / d)
    shutil.copytree(SRC / "fonts", PUB / "fonts")
    shutil.copytree(PLAN / "media", PUB / "media")
    print("porte ok, placeholders restants:", reste)

if __name__ == "__main__":
    main()
