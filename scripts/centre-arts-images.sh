#!/usr/bin/env bash
# Dérivés WebP de la page /centre-arts (vague 5, 16 septembre 2026).
# Refait les fichiers à l'identique depuis les photos réelles de public/media.
# Ajoute des fichiers dans public/media/centre-arts, ne vide jamais le dossier.
set -euo pipefail
cd "$(dirname "$0")/.."
M=public/media
O=$M/centre-arts
mkdir -p "$O"
w() { # w <source> <nom> <largeurs...>
  local src="$1" nom="$2"; shift 2
  for l in "$@"; do
    cwebp -quiet -q 78 -m 6 -metadata none -resize "$l" 0 "$src" -o "$O/$nom-$l.webp"
  done
}
w "$M/Artistes/labronze-diagonale.jpg"            ouverture      960 1600 2400 2880
w "$M/Auberge photos/Maison main.jpg"             maison         960 1600 2400
w "$M/Auberge photos/biblio.jpg"                  bibliotheque   640 1200 1696
w "$M/Auberge photos/salle a manger.jpg"          salle-a-manger 960 1600 2400
w "$M/Financement Artistique/kamy inside.jpg"     kamy           960 1600 2400
w "$M/Artistes/roster/claude-philippe-nolin.jpg"  nolin          640 1200 1800
w "$M/Artistes/profle wide.jpg"                   alex           960 1600 2400
w public/vendredi-eric-pichette.png               billet-pichette 540 1080
w public/samedi-marie-laurence.png                billet-nault    540 1080
w public/dimanche-tania-martin.png                billet-martin   540 1080
w "$M/Financement Artistique/centered copy.jpg"   mecenes        960 1600 2400
w "$M/Artistes/main cynthia.jpg"                  murale         800 1544
w "$M/inn/golden drone copy.jpg"                  namur          960 1600 2400
magick "$M/Artistes/labronze-diagonale.jpg" -resize 1200x630^ -gravity center -extent 1200x630 -strip -quality 82 "$O/og-centre-arts.jpg"
