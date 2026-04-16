
/**
 * Global Image Optimizer Utility
 * Uses wsrv.nl (an open-source image proxy) to resize and compress images on the fly.
 */

export const getOptimizedUrl = (url: string, width: number = 1000, quality: number = 80): string => {
    // 1. Safety Checks
    if (!url || typeof url !== 'string') return '';
    
    // 2. Skip if already optimized or invalid
    if (url.includes('wsrv.nl')) return url;
    if (url.startsWith('data:')) return url; // Skip base64
    if (url.endsWith('.svg')) return url; // Skip SVGs

    // 3. General Filter: Optimize all external http/https images
    // This catches Google Storage, GitHub, Unsplash, Imgur, etc.
    if (!url.startsWith('http')) return url;

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
