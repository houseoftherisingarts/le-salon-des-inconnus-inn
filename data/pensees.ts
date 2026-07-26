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
        date: "2026-07-23",
        title_fr: "La saison des framboises",
        title_en: "Raspberry season",
        body_fr: "Les framboises sont arrivées d'un coup le long de la clôture, comme chaque fin de juillet. C'est un fruit qui ne sait pas attendre : cueilli le matin, il veut être mangé le jour même, et celui qu'on laisse sur la tige pour demain est souvent déjà passé. Cette abondance ne se négocie pas : on se présente à son heure ou on la manque. Alors les bols circulent vers la table des invités, et les enfants reviennent de la clôture les doigts tachés de rouge, incapables d'attendre le bol. Je pense à tout ce qui mûrit de la même façon dans une vie : une conversation devenue possible, un pardon, l'âge exact où un enfant veut encore qu'on le porte. Ces choses-là n'attendent pas non plus que notre horaire se libère. La clôture est pleine cette semaine; qu'est-ce qui est mûr, là, dans ma journée, et que je remets à demain?",
        body_en: "The raspberries arrived all at once along the fence, the way they do every late July. It is a fruit that does not know how to wait: picked in the morning, it wants to be eaten that same day, and the one left on the cane for tomorrow is often already gone. That kind of abundance cannot be negotiated with: you show up at its hour or you miss it. So the bowls travel to the guests' table, and the children come back from the fence with red-stained fingers, unable to wait for a bowl. I think of everything that ripens the same way in a life: a conversation that has become possible, a forgiveness, the exact age when a child still wants to be carried. Those things do not wait for our schedule to clear either. The fence is full this week; what is ripe, right now, in my day, that I keep putting off until tomorrow?",
    },
    {
        date: "2026-07-22",
        title_fr: "Accorder avant de jouer",
        title_en: "Tuning before playing",
        body_fr: "Hier soir, un invité accordait sa guitare près du feu, et j'ai trouvé ce moment plus beau que la chanson qui a suivi. Pendant qu'on accorde, personne ne performe encore : on cherche seulement à être juste. La corde trop tendue tire vers le haut, la corde relâchée traîne vers le bas, et l'oreille patiente les ramène au vrai. Je me suis dit que les conversations demandent le même soin. Les premières minutes avec un inconnu servent à ça, tendre un peu, relâcher un peu, jusqu'à ce que deux voix se répondent sans forcer. La musique qui vient ensuite ne fait que confirmer un accord déjà trouvé. Ce matin, avant de me mettre à jouer ma journée, j'essaie d'écouter où je force et où je traîne.",
        body_en: "Last night a guest was tuning their guitar by the fire, and I found that moment more beautiful than the song that followed. While the tuning lasts, nobody is performing yet: you are only trying to be true. The string wound too tight pulls sharp, the loose one drags flat, and a patient ear brings them back to honest. It struck me that conversations ask for the same care. The first minutes with a stranger serve that purpose, tightening a little, loosening a little, until two voices answer each other without strain. The music that comes afterward only confirms an agreement already found. This morning, before I start playing my day, I am trying to hear where I force and where I drag.",
    },
    {
        date: "2026-07-21",
        title_fr: "Le sentier",
        title_en: "The footpath",
        body_fr: "Derrière l'auberge, un sentier s'enfonce dans le bois. Personne ne l'a dessiné : il existe parce que des centaines de pas, ceux d'inconnus pour la plupart, ont choisi à peu près la même ligne entre les fougères. Chaque marcheur croyait suivre le chemin, alors qu'il était en train de le faire. Si tout le monde cessait d'y passer, l'herbe le reprendrait en deux étés, sans rancune. Je trouve ça beau, une œuvre commune que personne ne signe et que tout le monde continue. Nos habitudes, nos amitiés, nos villages tiennent probablement de la même manière : par le passage répété de gens qui ne se sont jamais consultés. Quel sentier suis-je en train d'entretenir aujourd'hui, sans m'en rendre compte?",
        body_en: "Behind the inn, a footpath slips into the woods. Nobody designed it: it exists because hundreds of footsteps, most of them strangers', chose roughly the same line between the ferns. Each walker believed they were following the path while they were actually making it. If everyone stopped walking there, the grass would take it back within two summers, holding no grudge. I find that beautiful, a common work that nobody signs and everybody continues. Our habits, our friendships, our villages probably hold together the same way: through the repeated passage of people who never consulted one another. Which path am I keeping alive today without noticing?",
    },
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
