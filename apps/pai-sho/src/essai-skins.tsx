// Banc d'essai TEMPORAIRE : la carte des skins posée dans le menu.
import { createRoot } from 'react-dom/client';
import App from './App';
import Skins from './ui/Skins';
import type { ScenePaiSho } from './scene/scene';
import './ui/style.css';

createRoot(document.getElementById('root')!).render(<App />);
const id = window.setInterval(() => {
  const grille = document.querySelector('.menu-cartes');
  const scene = (window as unknown as { __scene?: ScenePaiSho }).__scene;
  if (!grille || !scene || grille.querySelector('.essai')) return;
  const d = document.createElement('div');
  d.className = 'essai';
  d.style.display = 'contents';
  grille.appendChild(d);
  createRoot(d).render(<Skins langue={document.documentElement.lang === 'en' ? 'EN' : 'FR'} scene={scene} />);
  window.clearInterval(id);
}, 100);
