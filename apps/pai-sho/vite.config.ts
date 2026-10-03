import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : le même build sert la version web et le paquet Electron (file://).
export default defineConfig({
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  // Pas de Tailwind ici : on coupe le postcss hérité de la racine du dépôt.
  css: { postcss: { plugins: [] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
