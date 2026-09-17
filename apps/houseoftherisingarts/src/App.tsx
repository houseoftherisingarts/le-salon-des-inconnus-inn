import { CreatorStudio } from '@inconnus/ui';

// House of the Rising Arts et Creator Studio ne font qu'un seul et même projet.
// Ce domaine monte donc directement le studio des artistes, en anglais, à la
// racine. Le studio porte sa propre porte de connexion (Google + courriel), son
// propre choix de langue et son propre routage interne ; le domaine n'a plus à
// trancher entre Mécène et Artiste, puisqu'il est le studio lui-même.
export default function App() {
  return (
    <CreatorStudio
      language="EN"
      onExit={() => window.location.assign('https://www.lesalondesinconnus.com/centre-arts')}
    />
  );
}
