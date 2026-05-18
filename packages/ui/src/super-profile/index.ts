// Super Profile barrel — public surface of the feature.

export type {
    SuperProfileConfig,
    SuperProfileMedium,
    SuperProfileLinks,
    SuperProfileHeroPhoto,
    SuperProfileWork,
    UsernameClaim,
} from './types';
export { MAX_WORKS, heroStoragePath, workStoragePath } from './types';

export {
    validateUsername,
    slugifyDisplayName,
    isSlugAvailable,
    claimUsername,
    releaseUsername,
    resolveSlugToUid,
    RESERVED_SLUGS,
} from './usernames';

export { SuperProfileEditor } from './SuperProfileEditor';
export type { SuperProfileEditorProps } from './SuperProfileEditor';

export { HeroPhotoUploader } from './HeroPhotoUploader';
export { RevealWaveImage } from './RevealWaveImage';
export { InteractivePhotoStack } from './InteractivePhotoStack';
export type { PhotoStackItem, InteractivePhotoStackProps } from './InteractivePhotoStack';

export { PhotoTemplate } from './templates/PhotoTemplate';
export { VisualArtTemplate } from './templates/VisualArtTemplate';
export { EditorialTemplate } from './templates/EditorialTemplate';
