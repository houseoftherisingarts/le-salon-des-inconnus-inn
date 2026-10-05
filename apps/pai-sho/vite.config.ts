import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : le même build sert la version web et le paquet Electron (file://).
export default defineConfig({
  base: './',
  plugins: [react()],
  // Empreinte du build, collée aux figurines et vignettes : leurs noms ne
  // changent pas et l'hébergement les garde sept jours en cache.
  define: { __BUILD__: JSON.stringify(Date.now().toString(36)) },
  worker: { format: 'es' },
  // Pas de Tailwind ici : le postcss hérité de la racine du dépôt est coupé.
  css: { postcss: { plugins: [] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
