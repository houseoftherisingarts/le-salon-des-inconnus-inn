// versWebp : redimensionne une image dans le navigateur et la réencode en
// webp avant l'envoi (recette du FMM). Safari ne sait pas encoder le webp
// depuis un canevas : il rend alors un jpeg, que Storage accepte aussi.

export async function versWebp(fichier: Blob, coteMax = 1600, qualite = 0.82): Promise<Blob> {
    const image = await createImageBitmap(fichier);
    const r = Math.min(1, coteMax / Math.max(image.width, image.height));
    const w = Math.max(1, Math.round(image.width * r));
    const h = Math.max(1, Math.round(image.height * r));
    const canevas = document.createElement('canvas');
    canevas.width = w;
    canevas.height = h;
    canevas.getContext('2d')!.drawImage(image, 0, 0, w, h);
    image.close?.();
    const encoder = (type: string) => new Promise<Blob | null>((ok) => canevas.toBlob(ok, type, qualite));
    const webp = await encoder('image/webp');
    if (webp && webp.type === 'image/webp') return webp;
    const jpeg = await encoder('image/jpeg');
    if (!jpeg) throw new Error('Encodage impossible');
    return jpeg;
}
