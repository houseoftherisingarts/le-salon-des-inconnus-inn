import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import type { MemberProfile } from '../../AuthModal';
import { MessagingPage } from '../../MessagingPage';
import { ListeAmis } from '../../../packages/ui/src/reseau/ListeAmis';
// On importe les données d'amitié via la fonction de ui/src/reseau si elle l'expose, 
// sinon on laisse la liste se gérer si elle le fait (mais ListeAmis prend `amities`).
import { suivreMesAmities, type Amitie } from '../../../packages/ui/src/reseau/amities';

interface OngletCommunauteProps {
  user: User;
  memberProfile: MemberProfile;
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
  readOnly?: boolean;
  uidCible?: string;
}

export const OngletCommunaute: React.FC<OngletCommunauteProps> = ({
  user,
  memberProfile,
  language,
  onNavigate,
  readOnly,
  uidCible,
}) => {
  const t = (en: string, fr: string) => language === 'FR' ? fr : en;
  const uid = uidCible ?? user.uid;
  const params = new URLSearchParams(window.location.search);
  const initialSous = params.get('sous') || 'amis';
  const initialConv = params.get('conv');

  const [sousOnglet, setSousOnglet] = useState(initialSous);
  const [amities, setAmities] = React.useState<Amitie[]>([]);

  React.useEffect(() => {
    return suivreMesAmities(uid, setAmities);
  }, [uid]);

  const changeSousOnglet = (id: string) => {
    setSousOnglet(id);
    window.history.replaceState({ view: 'COMPTE' }, '', `/compte?onglet=communaute&sous=${id}`);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px]">
      
      {/* En-tête Communauté */}
      <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 transition-colors duration-200 hover:border-[#c5a059]/40">
        <h3 className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c5a059] mb-4 flex items-center gap-2">
          <div className="h-px w-10 bg-[#c5a059]" />
          {t('Community', 'Communauté')}
        </h3>
        <h2 className="font-prata text-[#f3e5ab] text-[clamp(1.6rem,2.4vw,2.25rem)] leading-[1.1] mb-6">
          {t('Your people at the Salon', 'Vos gens au Salon')}
        </h2>

        {/* Sous-onglets */}
        <div className="flex gap-6 border-b border-white/10 pb-4">
          <button
            onClick={() => changeSousOnglet('amis')}
            className={`font-cinzel uppercase text-[12px] tracking-widest transition-colors ${
              sousOnglet === 'amis' ? 'text-[#c5a059] border-b-2 border-[#c5a059] pb-1' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('Friends', 'Amis')}
          </button>
          <button
            onClick={() => changeSousOnglet('messages')}
            className={`font-cinzel uppercase text-[12px] tracking-widest transition-colors ${
              sousOnglet === 'messages' ? 'text-[#c5a059] border-b-2 border-[#c5a059] pb-1' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('Messages', 'Messages')}
          </button>
          <button
            onClick={() => changeSousOnglet('notifications')}
            className={`font-cinzel uppercase text-[12px] tracking-widest transition-colors ${
              sousOnglet === 'notifications' ? 'text-[#c5a059] border-b-2 border-[#c5a059] pb-1' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('Notifications', 'Notifications')}
          </button>
        </div>
      </div>

      {/* Contenu du sous-onglet */}
      <div className="w-full">
        {sousOnglet === 'amis' && (
          <ListeAmis
            uid={uid}
            amities={amities}
            language={language}
            onOuvrirMembre={(uid) => { /* TODO: handle public profile open */ }}
          />
        )}

        {sousOnglet === 'messages' && readOnly && (
          <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7">
            <p className="font-lato text-neutral-400">
              {t('Messages between members stay private.', 'Les messages entre membres restent privés.')}
            </p>
          </div>
        )}

        {sousOnglet === 'messages' && !readOnly && (
          <MessagingPage
            user={user}
            memberProfile={memberProfile}
            language={language}
            onNavigate={onNavigate}
            onViewProfile={(uid) => { /* TODO: handle public profile open */ }}
            integre={true}
            initialConversationId={initialConv}
          />
        )}

        {sousOnglet === 'notifications' && (
          <div className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7">
            <p className="font-lato text-neutral-400">
              {t('Nothing new for now.', 'Rien de neuf pour l\'instant.')}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
