// Le visage d'un joueur : sa statuette, ou le lotus du jeu quand il n'en porte pas.
import { adversaire } from '../../jeu/adversaires';

const BASE = import.meta.env.BASE_URL;

export function Visage({ avatar, vignette, grand, enLigne }: {
  avatar?: string; vignette: (id: string) => string; grand?: boolean; enLigne?: boolean;
}) {
  const ok = avatar && adversaire(avatar);
  return (
    <span className={`visage ${grand ? 'grand' : ''}`}>
      {ok ? <img src={vignette(avatar)} alt="" loading="lazy" /> : <img className="visage-lotus" src={`${BASE}tuiles/LOTUS.webp`} alt="" />}
      {enLigne !== undefined && <i className={`visage-point ${enLigne ? 'oui' : ''}`} aria-hidden="true" />}
    </span>
  );
}
