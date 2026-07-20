// Pensée du jour — un paragraphe quotidien (philosophie, art, hospitalité),
// publié automatiquement chaque matin par le job com.alex.pensee-du-jour.
// La plus récente en premier. Ne pas éditer à la main sauf pour retirer
// une entrée refusée par Alex.

export interface Pensee {
    date: string;      // AAAA-MM-JJ
    title_fr: string;
    title_en: string;
    body_fr: string;   // un seul paragraphe
    body_en: string;
}

export const PENSEES: Pensee[] = [
    {
        date: "2026-07-20",
        title_fr: "Le bois de juillet",
        title_en: "July firewood",
        body_fr: "Ce matin, j'ai commencé à corder le bois pour l'hiver, en plein soleil de juillet. Les mains font le geste pendant que la tête le trouve absurde : préparer du feu quand tout le pays brûle déjà de chaleur. Mais chaque bûche placée aujourd'hui est une soirée de janvier qui existe déjà, quelque part, en attente. Les stoïciens parlaient de se préparer à ce qui vient; moi, j'ai plutôt l'impression d'écrire une lettre à quelqu'un que je n'ai pas encore rencontré, l'inconnu qui se réchauffera à ce feu. Les gestes les plus généreux se posent des mois avant d'être reçus, sans témoin. Peut-être que tout ce qu'on fait de bien dans une vie ressemble à ça : du bois cordé en été pour des feux qu'on n'allumera pas soi-même.",
        body_en: "This morning I started stacking firewood for winter, under the full July sun. The hands do the work while the head calls it absurd: preparing for fire when the whole countryside is already burning with heat. But every log placed today is a January evening that already exists, somewhere, waiting. The Stoics spoke of preparing for what comes; to me it feels more like writing a letter to someone I have not yet met, the stranger who will warm themselves by this fire. The most generous gestures are made months before they are received, with no witness. Maybe everything good we do in a life looks like this: wood stacked in summer for fires we will not light ourselves.",
    },
    {
        date: "2026-07-05",
        title_fr: "L'art d'accueillir",
        title_en: "The art of welcoming",
        body_fr: "On pense souvent que l'hospitalité consiste à offrir un lit, un repas, un toit. Mais un inconnu qui franchit la porte n'a pas d'abord besoin d'un lit. Il a besoin qu'on le regarde comme quelqu'un qu'on attendait. Le reste, la chambre, le feu, le café du matin, ce sont des détails qui prennent leur sens après ce premier regard. Chaque salon du monde a été bâti pour ça : un endroit où l'on cesse d'être un étranger le temps d'une conversation. Et si c'était ça, au fond, le métier le plus ancien qui soit, faire de la place à quelqu'un dans son propre monde?",
        body_en: "We often think hospitality means offering a bed, a meal, a roof. But a stranger walking through the door does not need a bed first. He needs to be looked at like someone we were expecting. The rest, the room, the fire, the morning coffee, those are details that take their meaning after that first look. Every salon in the world was built for this: a place where you stop being a stranger for the length of a conversation. And what if that were, in the end, the oldest craft there is, making room for someone inside your own world?",
    },
];
