
/**
 * Global Image Optimizer Utility
 * Uses wsrv.nl (an open-source image proxy) to resize and compress images on the fly.
 */
import optimized from './optimizedImages.json';

// Variantes WebP locales générées par scripts/optimize-images.mjs :
// chemin décodé → [largeur native, largeurs disponibles…].
const LOCAL = optimized as Record<string, number[]>;

const localVariant = (url: string, width: number): string | null => {
    let path: string;
    try { path = decodeURIComponent(url.split(/[?#]/)[0]); } catch { return null; }
    const entry = LOCAL[path];
    if (!entry) return null;
    const [native, ...widths] = entry;
    // Plus petite variante qui couvre la largeur demandée ; au-delà de la plus
    // grande variante réduite, le fichier natif (WebP s'il existe, sinon l'original).
    const w = widths.find((v) => v >= width && v < native) ?? (widths.includes(native) ? native : null);
    return w ? encodeURI(`/_opt/${w}${path}.webp`).replace(/\(/g, "%28").replace(/\)/g, "%29") : null;
};

export const getOptimizedUrl = (url: string, width: number = 1000, quality: number = 80): string => {
    // 1. Safety Checks
    if (!url || typeof url !== 'string') return '';
    
    // 2. Skip if already optimized or invalid
    if (url.includes('wsrv.nl')) return url;
    if (url.startsWith('data:')) return url; // Skip base64
    if (url.endsWith('.svg')) return url; // Skip SVGs

    // 3. General Filter: Optimize all external http/https images
    // This catches Google Storage, GitHub, Unsplash, Imgur, etc.
    if (!url.startsWith('http')) return url.startsWith('/') ? localVariant(url, width) ?? url : url;

    // 4. Construct Proxy URL
    // output=webp for better compression
    // url needs to be encoded. We decode first to ensure we don't double-encode (e.g. %20 -> %2520)
    try {
        const decodedUrl = decodeURIComponent(url);
        return `https://wsrv.nl/?url=${encodeURIComponent(decodedUrl)}&w=${width}&q=${quality}&output=webp`;
    } catch (e) {
        // Fallback if decode fails
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&output=webp`;
    }
};

// Largeur de texture du carrousel héro (LiquidGlassCycler) : couvre le canevas en
// cover-fit pour une photo jusqu'à 2:1, au dpr plafonné à 2 comme son renderer.
// L'écran de chargement précharge la même URL pour que le cache serve les deux.
export const heroCoverWidth = (w: number, h: number): number =>
    Math.ceil(Math.max(w, h * 2) * Math.min(window.devicePixelRatio || 1, 2));

// srcSet 800w/1600w/2400w pour une photo locale ; le navigateur choisit selon
// sizes et la densité d'écran (même URL répétée si aucune variante n'existe).
export const getSrcSet = (url: string): string =>
    [800, 1600, 2400].map((w) => `${getOptimizedUrl(url, w)} ${w}w`).join(', ');
