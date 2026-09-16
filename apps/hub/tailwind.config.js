// Tailwind compilé au build (remplace le script cdn.tailwindcss.com, qui recompilait
// le CSS dans le navigateur à chaque visite). Configuration par défaut, comme le CDN.
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/ecosysteme/**/*.{ts,tsx}',
    '../../packages/ui/src/super-profile/templates/sections/**/*.{ts,tsx}',
    '../../packages/ui/src/super-profile/templates/shared*',
  ],
};
