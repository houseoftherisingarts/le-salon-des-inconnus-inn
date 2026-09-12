// Super Profile: standalone artist portfolio page, en deux paliers.
//
// Palier de base (existant depuis août) : hero plein écran + galerie simple
// (`works`), gating par `members/{uid}/admin/flags.maestroEnabled`.
//
// Profil Pro (100 $/mois, ajouté en septembre) : le même document gagne un
// `type` d'artiste, une liste de sections à éteindre ou allumer, et des
// contenus enrichis par type (oeuvres, écoute, dates, presse, expositions,
// livres, atelier). Le gating devient `flags.proEnabled`, avec
// `maestroEnabled` accepté comme synonyme pour ne rien casser côté membres
// déjà activés à la main.
//
// Data lives in two places:
//   • members/{uid}/superProfile/config: owner-editable settings doc
//   • usernames/{slug}: uniqueness lookup; doc id is the slug, body is { uid }

export type SuperProfileMedium = 'photo' | 'visual-art' | 'other';

/** Les dix types d'artiste du Profil Pro. Le medium historique ('photo',
 *  'visual-art', 'other') reste lisible : deduireType() fait le pont. */
export type ArtistType =
    | 'peintre'
    | 'musicien'
    | 'photographe'
    | 'sculpteur'
    | 'ecrivain'
    | 'scene'
    | 'cineaste'
    | 'artisan'
    | 'numerique'
    | 'autre';

export interface SuperProfileLinks {
    instagram?: string;
    website?: string;
    buy?: string;       // print shop, gumroad, store, etc.
    booking?: string;   // calendly, contact form, etc.
}

export interface SuperProfileHeroPhoto {
    /** Public download URL of the (alpha-channeled) hero cutout. */
    url: string;
    /** Storage path so the file can be deleted on replace. */
    storagePath: string;
    /**
     * 'manual-png': the user uploaded a transparent PNG and we trusted it.
     * 'auto-removed': we ran @imgly/background-removal client-side.
     */
    source: 'manual-png' | 'auto-removed';
    /** Pixel width/height: used by templates to size the cutout proportionally. */
    width?: number;
    height?: number;
}

export interface SuperProfileWork {
    /** Public download URL. */
    url: string;
    /** Storage path for delete. */
    storagePath: string;
    /** Optional caption shown under the work in some templates. */
    caption?: string;
}

/** Une œuvre du mur de galerie (section Oeuvres), avec sa fiche complète. */
export interface OeuvreProfilPro {
    url: string;
    storagePath: string;
    titre?: string;
    technique?: string;
    dimensions?: string;
    annee?: string;
    /** Prix en cents. Absent quand statutVente n'est pas 'a-vendre'. */
    prixCents?: number;
    statutVente?: 'a-vendre' | 'vendu' | 'sur-demande';
    caption?: string;
}

export type PlateformeEcoute = 'spotify' | 'youtube' | 'bandcamp' | 'soundcloud' | 'autre';

/** Un lien d'écoute (section Ecoute). Rendu en embed pour les quatre
 *  plateformes reconnues, en simple lien pour tout le reste. */
export interface LienEcoute {
    url: string;
    plateforme?: PlateformeEcoute;
    titre?: string;
}

/** Une date à venir (section Dates). */
export interface DateSpectacle {
    lieu: string;
    ville: string;
    /** 'AAAA-MM-JJ' */
    date: string;
    lienBillets?: string;
}

/** Une citation de presse (section Presse). */
export interface CitationPresse {
    citation: string;
    source?: string;
    lienArticle?: string;
}

/** Une exposition, passée ou à venir (section Expositions). */
export interface ExpositionProfilPro {
    titre: string;
    lieu: string;
    /** Texte libre : "12 mai au 3 juin 2026". */
    dates: string;
    aVenir: boolean;
}

/** Un livre publié (section Livres). */
export interface LivreProfilPro {
    couvertureUrl?: string;
    couverturePath?: string;
    titre: string;
    lienAchat?: string;
}

/** L'atelier ou le lieu de travail (section Atelier). */
export interface AtelierProfilPro {
    ville?: string;
    visitesSurRendezVous: boolean;
    note?: string;
}

/** Les sections optionnelles qu'un artiste peut éteindre depuis son
 *  back-office. Le hero n'y figure pas : il est toujours présent. */
export type SectionId =
    | 'oeuvres'
    | 'ecoute'
    | 'dates'
    | 'presse'
    | 'expositions'
    | 'livres'
    | 'bio'
    | 'atelier'
    | 'rendezvous'
    | 'contact'
    | 'liens'
    | 'pied';

export type SectionsConfig = Partial<Record<SectionId, boolean>>;

export interface SuperProfileConfig {
    /** When false, the public route 404s even if the username is claimed. */
    enabled: boolean;
    /** Lowercase slug, [a-z0-9-]{3,32}. Validated client + server side. */
    username: string;
    medium: SuperProfileMedium;
    /** Type d'artiste (Profil Pro). Déduit de `medium` quand absent. */
    type?: ArtistType;
    /** Sections allumées ou éteintes. Une clé absente vaut « allumée » si
     *  le contenu de la section existe. */
    sections?: SectionsConfig;
    hero?: SuperProfileHeroPhoto;
    works: SuperProfileWork[];
    /** Display name shown on the page; defaults to the user's auth displayName. */
    displayName?: string;
    /** Short one-liner under the name. */
    tagline?: string;
    /** Long-form bio paragraph. */
    bio?: string;
    links?: SuperProfileLinks;

    // ── Contenu du Profil Pro, par type ──────────────────────────────────
    oeuvres?: OeuvreProfilPro[];
    ecoute?: LienEcoute[];
    dates?: DateSpectacle[];
    presse?: CitationPresse[];
    lienEPK?: string;
    expositions?: ExpositionProfilPro[];
    livres?: LivreProfilPro[];
    atelier?: AtelierProfilPro;

    /** Set by serverTimestamp on every save. */
    updatedAt?: any;
}

export interface UsernameClaim {
    uid: string;
    /** Lowercase slug: mirrored from the doc id for convenience in client code. */
    slug: string;
    claimedAt?: any;
}

/** Maximum works in Phase 1 (palier de base). Keeps the layouts predictable. */
export const MAX_WORKS = 12;

/** Bornes du Profil Pro (5.2 de la direction). */
export const MAX_OEUVRES = 48;
export const MAX_DATES = 24;
export const MAX_LIENS_ECOUTE = 12;
export const MAX_EXPOSITIONS = 12;
export const MAX_LIVRES = 12;

/** Storage paths used for super-profile assets. */
export const heroStoragePath = (uid: string, ext: 'png' | 'webp' = 'png') =>
    `members/${uid}/superProfile/hero.${ext}`;
export const workStoragePath = (uid: string, workId: string, ext: string) =>
    `members/${uid}/superProfile/works/${workId}.${ext}`;
export const oeuvreStoragePath = (uid: string, oeuvreId: string, ext: string) =>
    `members/${uid}/superProfile/oeuvres/${oeuvreId}.${ext}`;
export const couvertureLivreStoragePath = (uid: string, livreId: string, ext: string) =>
    `members/${uid}/superProfile/livres/${livreId}.${ext}`;
