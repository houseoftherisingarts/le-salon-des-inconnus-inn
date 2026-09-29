// Super Profile barrel: public surface of the feature.

export type {
    SuperProfileConfig,
    SuperProfileMedium,
    SuperProfileLinks,
    SuperProfileHeroPhoto,
    SuperProfileWork,
    UsernameClaim,
    ArtistType,
    SectionId,
    SectionsConfig,
    OeuvreProfilPro,
    LienEcoute,
    PlateformeEcoute,
    DateSpectacle,
    CitationPresse,
    ExpositionProfilPro,
    LivreProfilPro,
    AtelierProfilPro,
} from './types';
export {
    MAX_WORKS, MAX_OEUVRES, MAX_DATES, MAX_LIENS_ECOUTE, MAX_EXPOSITIONS, MAX_LIVRES,
    heroStoragePath, workStoragePath, oeuvreStoragePath, couvertureLivreStoragePath,
} from './types';

export {
    validateUsername,
    slugifyDisplayName,
    isSlugAvailable,
    claimUsername,
    releaseUsername,
    resolveSlugToUid,
    RESERVED_SLUGS,
} from './usernames';

export {
    LIBELLES_ARTISTE, ORDRE_TYPES, deduireType, familleGabarit, sectionsParDefaut, sectionAllumee,
} from './artistes';
export type { LibelleArtiste, FamilleGabarit } from './artistes';

export {
    normaliserHostname, validerHostname, domaineDe, reserverDomaine, retirerDomaine, resoudreHostname,
} from './domaines';
export type { DomaineClaim, ValidationHostname } from './domaines';

export {
    AGENDA_PAR_DEFAUT, cleJour, plagesDuJour, creneauxLibres, joursDisponibles,
    nomSalle, salleUrl, rencontreOuverte, formatDate, formatHeure, icsRendezVous, telechargerIcs,
    lireAgendaConfig, useAgendaConfig, useOccupationsPro, useMesRendezVousPro, useRendezVousProArtiste,
    demanderRendezVous, annulerRendezVousPro, majRendezVousProParArtiste, enregistrerAgendaConfig,
} from './rendezvous';
export type { PlageHoraire, AgendaConfig, StatutRendezVousPro, RendezVousPro, OccupationPro, Creneau } from './rendezvous';

export {
    ouvrirCheckoutProfilPro, ouvrirPortailProfilPro, useAbonnementPro, useMemberFlags, profilProDebloque,
} from './abonnement';
export type { AbonnementPro, StatutAbonnementPro } from './abonnement';

export { SuperProfileEditor } from './SuperProfileEditor';
export type { SuperProfileEditorProps } from './SuperProfileEditor';

export { HeroPhotoUploader } from './HeroPhotoUploader';
export { RevealWaveImage } from './RevealWaveImage';
export { InteractivePhotoStack } from './InteractivePhotoStack';
export type { PhotoStackItem, InteractivePhotoStackProps } from './InteractivePhotoStack';

export { Rencontre } from './Rencontre';
export { PriseRendezVous } from './PriseRendezVous';
export { AgendaAdmin } from './AgendaAdmin';
export { RendezVousAdmin } from './RendezVousAdmin';
export { DomaineAdmin } from './DomaineAdmin';
export { UpsellCard } from './UpsellCard';
export { ProfilProAdmin } from './ProfilProAdmin';
export type { ProfilProAdminProps } from './ProfilProAdmin';
export { ProfilProAdminSite } from './ProfilProAdminSite';
export { ProfilProAdminContenu } from './ProfilProAdminContenu';
export { ProfilProAdminAbonnement } from './ProfilProAdminAbonnement';
export { ProfilProPage } from './ProfilProPage';
export type { ProfilProPageProps } from './ProfilProPage';

export { gabaritPour, PeintreTemplate, MusicienTemplate, PhotoTemplate, VisualArtTemplate, EditorialTemplate, AuteurTemplate } from './templates';
export * from './templates/sections';
export type { TemplateProps } from './templates';

// Moteur d'espace : thèmes, ordre des sections, racine, lecteur, ateliers,
// assistance et espaces témoins.
export type { ProduitEspace, PisteEspace, ThemeEspace } from './types';
export { MAX_PRODUITS, MAX_PISTES, MAX_AUDIO_OCTETS, produitStoragePath, pisteStoragePath, lienPaiementValide } from './types';
export { THEMES, accentValide, resoudreTheme } from './themes';
export type { PaletteEspace, PaireFonts, ThemeResolu } from './themes';
export { SECTIONS_PAR_FAMILLE, ordreSections, deplacer } from './ordre';
export { EspaceRacine } from './templates/EspaceRacine';
export { LecteurProvider, useLecteur, formatDuree } from './templates/lecteur/LecteurContexte';
export { LecteurCollant, IconeLecture } from './templates/lecteur/LecteurCollant';
export { AtelierSections, SECTIONS_ETIQUETTES } from './AtelierSections';
export { AtelierTheme } from './AtelierTheme';
export { AtelierProduits } from './AtelierProduits';
export { AtelierPistes } from './AtelierPistes';
export { AssistanceCard } from './AssistanceCard';
export { ouvrirPaiementAssistance, useAssistance } from './assistance';
export type { StatutAssistance } from './assistance';
export { APERCUS, SLUGS_APERCU } from './apercus';
export { ApercuPage } from './ApercuPage';
export type { ApercuPageProps } from './ApercuPage';
