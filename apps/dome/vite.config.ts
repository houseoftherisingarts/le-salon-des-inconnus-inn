import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Shared Firebase env vars live at the monorepo root (.env.local)
  envDir: '../..',
  server: { port: 5174, host: '0.0.0.0' },
  build: { outDir: 'dist' },
});
