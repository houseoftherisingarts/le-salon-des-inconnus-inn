// Ambient declaration for the Vite-style import.meta.env that the imported
// pages (ArtsPage / ArtistHub) read. Kept hand-written instead of using
// `/// <reference types="vite/client" />` because @inconnus/ui itself doesn't
// depend on Vite — only its consuming apps do.

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
