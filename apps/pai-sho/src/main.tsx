import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/style.css';

// Dans la coquille Electron, les trois feux de la fenêtre macOS se posent
// en haut à gauche par-dessus la page : la feuille leur laisse la place.
if (navigator.userAgent.includes('Electron')) document.documentElement.classList.add('electron');

createRoot(document.getElementById('root')!).render(<App />);
