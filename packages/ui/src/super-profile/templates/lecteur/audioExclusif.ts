// audioExclusif : une seule piste joue à la fois dans toute la page.
// Recette reprise du FMM : chaque lecteur annonce qu'il démarre par un
// événement de fenêtre, et chaque autre lecteur qui l'entend se tait.

const EVENEMENT = 'espace:audio-exclusif';

export function annoncerLecture(source: object): void {
    window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: source }));
}

/** Appelle `arreter` dès qu'une autre source annonce une lecture; renvoie le désabonnement. */
export function ecouterExclusivite(source: object, arreter: () => void): () => void {
    const h = (e: Event) => {
        if ((e as CustomEvent).detail !== source) arreter();
    };
    window.addEventListener(EVENEMENT, h);
    return () => window.removeEventListener(EVENEMENT, h);
}
