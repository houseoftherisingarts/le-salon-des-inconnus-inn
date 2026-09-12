import React from 'react';

// Le médaillon d'un membre, partagé par le mur, le profil et la cloche.
// Au canon du Salon : cadre or antique, fond verre, initiale en Prata
// quand il n'y a pas de photo.
export const Avatar: React.FC<{ nom: string; url?: string; taille?: number; className?: string }> = ({
    nom, url, taille = 44, className = '',
}) => (
    <span
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-[#c5a059]/40 bg-black/40 backdrop-blur-md font-prata text-[#c5a059] ${className}`}
        style={{ width: taille, height: taille, fontSize: taille * 0.42 }}
    >
        {url ? (
            <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
            (nom || '?').trim().slice(0, 1).toUpperCase()
        )}
    </span>
);
