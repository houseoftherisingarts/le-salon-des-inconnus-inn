import { createRoot } from 'react-dom/client';
import './firebase';
import App from './App';
import './ui/style.css';
// Après la feuille unique, pour que ses retouches l'emportent à égalité.
import './ui/campagne.css';
import './ui/communaute.css';

// Dans la coquille Electron, les trois feux de la fenêtre macOS se posent
// en haut à gauche par-dessus la page : la feuille leur laisse la place.
if (navigator.userAgent.includes('Electron')) document.documentElement.classList.add('electron');

// Avatar Airbender n'a pas les lettres accentuées : un titre qui en porte
// une passe tout entier en Cinzel, sinon l'« É » de repli sort deux fois
// trop grand au milieu du mot. Un seul guetteur pour tout le jeu.
const TITRES = '.rideau-titre, .rideau-surtitre, .prelude p, .menu-titre, .carte-titre, .niveau-nom b, .joueur-nom, .panneau-titre, .dialogue-titre, .regles-corps h3, .tuto-titre, .debloque-titre, .niveaux-titre, .fiches-bascule, .fiche-bulle-nom, .vs-nom';
const ACCENT = /[À-ÖØ-öø-ÿŒœ]/;
let prevu = 0;
new MutationObserver(() => {
  if (prevu) return;
  prevu = requestAnimationFrame(() => {
    prevu = 0;
    document.querySelectorAll<HTMLElement>(TITRES).forEach((el) => el.classList.toggle('titre-accent', ACCENT.test(el.textContent ?? '')));
  });
}).observe(document.body, { subtree: true, childList: true, characterData: true });

// Le premier écran attend ses polices (une seconde et demie au plus),
// pour que « Bonne fête Kamy » ne s'écrive jamais dans la police de repli.
const polices = Promise.all([
  document.fonts.load("400 40px 'Avatar Airbender'"),
  document.fonts.load("400 16px 'Herculanum'"),
]).catch(() => undefined);
const delai = new Promise((ok) => setTimeout(ok, 1500));
void Promise.race([polices, delai]).then(() => createRoot(document.getElementById('root')!).render(<App />));
