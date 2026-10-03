import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/style.css';

// Dans la coquille Electron, les trois feux de la fenêtre macOS se posent
// en haut à gauche par-dessus la page : la feuille leur laisse la place.
if (navigator.userAgent.includes('Electron')) document.documentElement.classList.add('electron');

// Le premier écran attend ses polices (une seconde et demie au plus),
// pour que « Bonne fête Kamy » ne s'écrive jamais dans la police de repli.
const polices = Promise.all([
  document.fonts.load("400 40px 'Avatar Airbender'"),
  document.fonts.load("400 16px 'Herculanum'"),
]).catch(() => undefined);
const delai = new Promise((ok) => setTimeout(ok, 1500));
void Promise.race([polices, delai]).then(() => createRoot(document.getElementById('root')!).render(<App />));
