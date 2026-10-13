# -*- coding: utf-8 -*-
"""Assemble tout : page interactive (dist/), PDF (Chrome headless), porte chiffrée (public/plan-spa/)."""
import base64, os, shutil, subprocess, sys, pathlib
SRC = pathlib.Path(__file__).resolve().parent
PLAN = SRC.parent
RACINE = PLAN.parent
DIST = PLAN / "dist"
PUB = RACINE / "public" / "plan-spa"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

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

    # Page servie telle quelle, sans mot de passe (ordre d'Alex du 13 octobre 2026); noindex + robots suffisent.
    (PUB / "index.html").write_text(page.page(), encoding="utf-8")
    for vieux in ("plan.enc.js", ".bdt-salt"):
        (PUB / vieux).unlink(missing_ok=True)
    shutil.copy(SRC / "style.css", PUB / "style.css")
    for d in ("fonts", "media"):
        if (PUB / d).exists(): shutil.rmtree(PUB / d)
    shutil.copytree(SRC / "fonts", PUB / "fonts")
    shutil.copytree(PLAN / "media", PUB / "media")
    print("public ok", PUB / "index.html")

if __name__ == "__main__":
    main()
