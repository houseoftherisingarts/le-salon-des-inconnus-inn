/**
 * Inspirosphere catalog. The Studio surfaces these inside the orb tool — one
 * at random when the user opens the orb, advancing on each "Next zap". Users
 * who want to browse by discipline switch to Conscious Mode, which exposes
 * the categories below as filter chips.
 *
 * Adding a video
 * ──────────────
 * 1. Drop a new entry at the end of the array. Order doesn't matter — the orb
 *    picks at random.
 * 2. `url` accepts:
 *      • youtube.com/watch?v=ID
 *      • youtu.be/ID
 *      • youtube.com/shorts/ID
 *      • youtube.com/embed/ID
 *      • facebook.com/.../videos/ID, /reel/ID, /share/r/ID, fb.watch/...
 * 3. `category` must match one of CATEGORIES below (the chip in Conscious Mode
 *    pulls from this enum). Add a new category up there if needed.
 *
 * Avoid posting links you don't have rights to redistribute.
 */
export const INSPIROSPHERE_CATEGORIES = [
    'SCREENWRITING',
    'DRAWING',
    'CINEMATOGRAPHY',
    'MUSIC',
    'ACTING',
    'PHOTOGRAPHY',
    'WRITING',
    'ANIMATION',
    'PERFORMANCE',
    'MINDSET',
    'CRAFT',
    'GENERAL',
] as const;

export type InspirosphereCategory = (typeof INSPIROSPHERE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<InspirosphereCategory, { en: string; fr: string }> = {
    SCREENWRITING:   { en: 'Screenwriting',  fr: 'Scénarisation' },
    DRAWING:         { en: 'Drawing',        fr: 'Dessin' },
    CINEMATOGRAPHY:  { en: 'Cinematography', fr: 'Cinématographie' },
    MUSIC:           { en: 'Music',          fr: 'Musique' },
    ACTING:          { en: 'Acting',         fr: 'Jeu' },
    PHOTOGRAPHY:     { en: 'Photography',    fr: 'Photographie' },
    WRITING:         { en: 'Writing',        fr: 'Écriture' },
    ANIMATION:       { en: 'Animation',      fr: 'Animation' },
    PERFORMANCE:     { en: 'Performance',    fr: 'Performance' },
    MINDSET:         { en: 'Mindset',        fr: 'État d\'esprit' },
    CRAFT:           { en: 'Craft',          fr: 'Artisanat' },
    GENERAL:         { en: 'General',        fr: 'Général' },
};

export interface InspirosphereVideo {
    /** Stable id — use a slug or short string. Used as React key + dedupe. */
    id: string;
    /** Source URL (YouTube watch/shorts/embed or Facebook). */
    url: string;
    /** Display title shown under the orb / on the thumbnail. */
    title: string;
    /** Optional credit (creator, channel). */
    credit?: string;
    /** Required category — drives Conscious Mode filtering. */
    category: InspirosphereCategory;
}

// ─── Seed catalog ────────────────────────────────────────────────────────
// Curated picks — each ID verified live against YouTube's oEmbed endpoint
// (HTTP 200 = exists + embeddable). Add new picks at the end; order doesn't
// matter (the orb picks at random).
export const INSPIROSPHERE_VIDEOS: InspirosphereVideo[] = [
    { id: 'tarkovsky-sculpting',  url: 'https://www.youtube.com/watch?v=4VJe-cQu9FU', title: 'Sculpting in Time — Tarkovsky\'s philosophy on filmmaking', credit: 'Andrei Tarkovsky',   category: 'CINEMATOGRAPHY' },
    { id: 'mckee-substance',      url: 'https://www.youtube.com/watch?v=ITSu9IbCr9Q', title: 'The art of story, dialogue and character',                 credit: 'Robert McKee',       category: 'SCREENWRITING' },
    { id: 'rilke-letters',        url: 'https://www.youtube.com/watch?v=x73IZiaFF9E', title: 'Letters to a Young Poet — full audiobook',                 credit: 'Rainer M. Rilke',    category: 'WRITING' },
    { id: 'gibson-on-cyberpunk',  url: 'https://www.youtube.com/watch?v=nTjz6ueHhEw', title: 'Cyberpunk and cigarettes — Gibson interview (1990)',       credit: 'William Gibson',     category: 'WRITING' },
    { id: 'kentaro-miura-process',url: 'https://www.youtube.com/watch?v=VpBmjiUojrk', title: 'Kentaro Miura — a Berserk documentary',                    credit: 'Berserk',            category: 'DRAWING' },
    { id: 'ross-bob-trees',       url: 'https://www.youtube.com/watch?v=lLWEXRAnQd0', title: 'Bob Ross — happy little trees',                            credit: 'Bob Ross',           category: 'DRAWING' },
    { id: 'duke-ellington-mood',  url: 'https://www.youtube.com/watch?v=JiP7jKdAhD0', title: 'In a sentimental mood — Ellington & Coltrane',             credit: 'Duke Ellington',     category: 'MUSIC' },
    { id: 'rick-rubin-noticing',  url: 'https://www.youtube.com/watch?v=R5AjpKSE9SA', title: 'Rick Rubin & The Creative Act — Broken Record',            credit: 'Rick Rubin',         category: 'MINDSET' },
    { id: 'stoppard-craft',       url: 'https://www.youtube.com/watch?v=INwU9f0oFRs', title: 'Tom Stoppard — the art of playwriting & Arcadia',          credit: 'Tom Stoppard',       category: 'CRAFT' },
    { id: 'cassavetes-acting',    url: 'https://www.youtube.com/watch?v=0HikZrxF_p4', title: 'The man who invented independent filmmaking',              credit: 'John Cassavetes',    category: 'ACTING' },
    { id: 'hill-anatomy',         url: 'https://www.youtube.com/watch?v=31dBpwsYbG8', title: 'The creature and portrait sculptures of Mike Hill',        credit: 'Mike Hill',          category: 'CRAFT' },
    { id: 'sarah-kane-lyric',     url: 'https://www.youtube.com/watch?v=FcTVc2iGdmA', title: 'The work of Sarah Kane (National Theatre)',                credit: 'Sarah Kane',         category: 'PERFORMANCE' },
    { id: 'cartier-bresson',      url: 'https://www.youtube.com/watch?v=14ih3WgeOLs', title: 'Cartier-Bresson — the decisive moment (1973)',             credit: 'HCB',                category: 'PHOTOGRAPHY' },
    { id: 'disney-principles',    url: 'https://www.youtube.com/watch?v=uXHnudwQde0', title: 'Disney\'s 12 principles of animation',                     credit: 'Disney',             category: 'ANIMATION' },
    { id: 'lynch-meditation',     url: 'https://www.youtube.com/watch?v=S2RFMCmfRmc', title: 'David Lynch on ideas',                                     credit: 'David Lynch',        category: 'MINDSET' },
];
