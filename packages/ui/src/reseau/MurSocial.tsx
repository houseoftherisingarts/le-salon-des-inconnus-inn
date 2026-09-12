import React, { useEffect, useState } from 'react';
import { suivreLeMur, suivrePublicationsDe, type PostMur } from './mur';
import { suivreBlocages } from './moderation';
import { Composeur } from './Composeur';
import { BilletCarte } from './BilletCarte';

interface MurSocialProps {
    currentUser: { uid: string; displayName?: string | null; photoURL?: string | null } | null;
    monNom: string;
    monAvatar?: string;
    isAdmin: boolean;
    language: 'EN' | 'FR';
    /** Quand fourni, n'affiche que les billets de ce membre (onglet « Mon mur »). Sinon, le mur complet du studio. */
    seulementDe?: string;
    onOuvrirMembre?: (uid: string) => void;
}

export const MurSocial: React.FC<MurSocialProps> = ({
    currentUser, monNom, monAvatar, isAdmin, language, seulementDe, onOuvrirMembre,
}) => {
    const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
    const [posts, setPosts] = useState<PostMur[]>([]);
    const [bloques, setBloques] = useState<string[]>([]);

    useEffect(() => (seulementDe ? suivrePublicationsDe(seulementDe, setPosts) : suivreLeMur(setPosts)), [seulementDe]);
    useEffect(() => (currentUser ? suivreBlocages(currentUser.uid, setBloques) : undefined), [currentUser?.uid]);

    const visibles = posts.filter((p) => !bloques.includes(p.uid));

    return (
        <div className="space-y-5">
            {!seulementDe && currentUser && (
                <Composeur uid={currentUser.uid} nom={monNom} avatarUrl={monAvatar} language={language} />
            )}
            {visibles.length === 0 ? (
                <p className="text-sm text-neutral-500 font-lato text-center py-8">
                    {seulementDe
                        ? t('No posts yet.', 'Aucune publication pour le moment.')
                        : t('The wall is still quiet. Be the first voice.', 'Le mur est encore silencieux. Soyez la première voix.')}
                </p>
            ) : (
                visibles.map((p, i) => (
                    <BilletCarte
                        key={p.id}
                        post={p}
                        currentUser={currentUser}
                        monNom={monNom}
                        monAvatar={monAvatar}
                        isAdmin={isAdmin}
                        language={language}
                        delaiIndex={i}
                        onOuvrirMembre={onOuvrirMembre}
                    />
                ))
            )}
        </div>
    );
};
