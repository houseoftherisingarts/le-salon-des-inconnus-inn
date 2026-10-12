#!/usr/bin/env python3
"""
_encrypt.py - chiffre une page HTML pour la porte statique des démos Vexel.

Sortie : un fichier JavaScript qui pose une seule variable globale :

    window.__BDT_PAYLOAD__ = {salt:"<hex>", iv:"<hex>", ct:"<base64>"};

Schema cryptographique (compatible WebCrypto, style StatiCrypt) :
    cle  = PBKDF2-HMAC-SHA256(passphrase, sel, 200 000 iterations, 32 octets)
    sel  = 16 octets aleatoires
    iv   = 12 octets aleatoires
    ct   = AES-256-GCM(cle, iv, html_utf8) avec le tag de 16 octets colle a la fin

Normalisation de la passphrase (identique cote porte) :
    espaces de bord retires, espaces multiples reduits a un seul, minuscules.
    « Construction BDT », «  CONSTRUCTION   bdt  » et « construction bdt »
    donnent donc tous la meme cle.

Le sel est mis en cache dans le fichier « .bdt-salt » du dossier de sortie, de
sorte que demo.enc.js et admin.enc.js generes dans le meme dossier partagent le
meme sel : la cle gardee en sessionStorage par la porte principale ouvre alors
le back-office sans redemander le mot de passe. Utiliser --new-salt pour forcer
un sel neuf (et donc invalider ce partage).

Usage :
    python3 _encrypt.py entree.html sortie.enc.js
    python3 _encrypt.py demo-bdt.html deploy-bdt/demo.enc.js
    python3 _encrypt.py admin-bdt.html deploy-bdt/admin.enc.js
    python3 _encrypt.py page.html sortie.enc.js -p "autre mot de passe"
    python3 _encrypt.py page.html sortie.enc.js --var __AUTRE_PAYLOAD__
    python3 _encrypt.py --verify sortie.enc.js          (relit et dechiffre)
"""

import argparse
import base64
import getpass
import os
import re
import sys

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

MOT_DE_PASSE_DEFAUT = "Construction BDT"
ITERATIONS = 200_000
TAILLE_SEL = 16
TAILLE_IV = 12
VAR_DEFAUT = "__BDT_PAYLOAD__"
FICHIER_SEL = ".bdt-salt"


def normaliser(passphrase: str) -> str:
    """trim + espaces multiples reduits + minuscules."""
    return re.sub(r"\s+", " ", passphrase).strip().lower()


def deriver(passphrase: str, sel: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=sel,
        iterations=ITERATIONS,
    )
    return kdf.derive(normaliser(passphrase).encode("utf-8"))


def sel_du_dossier(dossier: str, neuf: bool) -> bytes:
    """Sel partage par tous les payloads d'un meme dossier de sortie."""
    chemin = os.path.join(dossier or ".", FICHIER_SEL)
    if not neuf and os.path.exists(chemin):
        try:
            with open(chemin, "r", encoding="utf-8") as f:
                sel = bytes.fromhex(f.read().strip())
            if len(sel) == TAILLE_SEL:
                return sel
        except ValueError:
            pass
    sel = os.urandom(TAILLE_SEL)
    os.makedirs(dossier or ".", exist_ok=True)
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(sel.hex())
    return sel


def chiffrer(chemin_entree, chemin_sortie, passphrase, nom_var, neuf):
    with open(chemin_entree, "rb") as f:
        clair = f.read()

    dossier = os.path.dirname(os.path.abspath(chemin_sortie))
    sel = sel_du_dossier(dossier, neuf)
    iv = os.urandom(TAILLE_IV)
    cle = deriver(passphrase, sel)
    ct = AESGCM(cle).encrypt(iv, clair, None)

    js = 'window.%s={salt:"%s",iv:"%s",ct:"%s"};\n' % (
        nom_var,
        sel.hex(),
        iv.hex(),
        base64.b64encode(ct).decode("ascii"),
    )
    os.makedirs(dossier, exist_ok=True)
    with open(chemin_sortie, "w", encoding="utf-8") as f:
        f.write(js)

    # relecture immediate : on ne livre jamais un payload qu'on n'a pas rouvert
    verifier(chemin_sortie, passphrase, attendu=clair)

    print("chiffre : %s -> %s" % (chemin_entree, chemin_sortie))
    print("  clair      : %d octets" % len(clair))
    print("  payload js : %d octets" % len(js))
    print("  variable   : window.%s" % nom_var)
    print("  sel        : %s%s" % (sel.hex(), "  (neuf)" if neuf else "  (partage)"))
    print("  passphrase : %r  ->  canonique %r" % (passphrase, normaliser(passphrase)))
    print("  relecture  : OK, le dechiffrement redonne le fichier d'origine")


def lire_payload(chemin):
    with open(chemin, "r", encoding="utf-8") as f:
        js = f.read()
    sel = re.search(r'salt:"([0-9a-f]+)"', js).group(1)
    iv = re.search(r'iv:"([0-9a-f]+)"', js).group(1)
    ct = re.search(r'ct:"([A-Za-z0-9+/=]+)"', js).group(1)
    return bytes.fromhex(sel), bytes.fromhex(iv), base64.b64decode(ct)


def verifier(chemin, passphrase, attendu=None, ecrire=None):
    sel, iv, ct = lire_payload(chemin)
    cle = deriver(passphrase, sel)
    clair = AESGCM(cle).decrypt(iv, ct, None)
    if attendu is not None and clair != attendu:
        raise SystemExit("ERREUR : le dechiffrement ne redonne pas le fichier d'origine")
    if ecrire:
        with open(ecrire, "wb") as f:
            f.write(clair)
        print("dechiffre vers %s (%d octets)" % (ecrire, len(clair)))
    return clair


def main():
    ap = argparse.ArgumentParser(add_help=True, description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entree", help="fichier HTML a chiffrer, ou le .enc.js avec --verify")
    ap.add_argument("sortie", nargs="?", help="fichier .enc.js a produire")
    ap.add_argument("-p", "--password", default=None,
                    help="mot de passe (defaut : « %s », ou la variable "
                         "d'environnement BDT_PASSWORD)" % MOT_DE_PASSE_DEFAUT)
    ap.add_argument("--ask", action="store_true", help="demander le mot de passe au clavier")
    ap.add_argument("--var", default=VAR_DEFAUT, help="nom de la variable globale (defaut %s)" % VAR_DEFAUT)
    ap.add_argument("--new-salt", action="store_true", help="forcer un sel neuf au lieu du sel partage du dossier")
    ap.add_argument("--verify", action="store_true", help="relire un .enc.js et le dechiffrer")
    ap.add_argument("--out", default=None, help="avec --verify : ecrire le clair dans ce fichier")
    args = ap.parse_args()

    if args.ask:
        passphrase = getpass.getpass("Mot de passe : ")
    else:
        passphrase = args.password or os.environ.get("BDT_PASSWORD") or MOT_DE_PASSE_DEFAUT

    if args.verify:
        clair = verifier(args.entree, passphrase, ecrire=args.out)
        print("verifie : %s  (%d octets de clair, passphrase canonique %r)"
              % (args.entree, len(clair), normaliser(passphrase)))
        return

    if not args.sortie:
        ap.error("il faut un fichier de sortie (ou utiliser --verify)")

    chiffrer(args.entree, args.sortie, passphrase, args.var, args.new_salt)


if __name__ == "__main__":
    sys.exit(main())
