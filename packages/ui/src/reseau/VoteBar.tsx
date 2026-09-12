import React from 'react';

// La barre de vote façon forum, au canon du Salon. Recliquer une flèche
// déjà active retire le vote.
export const VoteBar: React.FC<{
    score: number;
    monVote: 1 | -1 | 0;
    onVoter: (valeur: 1 | -1 | 0) => void;
    disabled?: boolean;
}> = ({ score, monVote, onVoter, disabled = false }) => {
    const scoreClasse = score > 0 ? 'text-[#c5a059]' : score < 0 ? 'text-rose-400' : 'text-neutral-500';
    return (
        <div className="flex items-center gap-1">
            <button
                type="button"
                disabled={disabled}
                onClick={() => onVoter(monVote === 1 ? 0 : 1)}
                aria-label="Voter pour"
                aria-pressed={monVote === 1}
                className={`p-1.5 rounded-full transition-colors hover:bg-white/10 disabled:opacity-40 ${monVote === 1 ? 'text-[#c5a059]' : 'text-neutral-500'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
            </button>
            <span className={`text-xs font-bold tabular-nums px-0.5 font-lato ${scoreClasse}`}>{score}</span>
            <button
                type="button"
                disabled={disabled}
                onClick={() => onVoter(monVote === -1 ? 0 : -1)}
                aria-label="Voter contre"
                aria-pressed={monVote === -1}
                className={`p-1.5 rounded-full transition-colors hover:bg-white/10 disabled:opacity-40 ${monVote === -1 ? 'text-rose-400' : 'text-neutral-500'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
        </div>
    );
};
