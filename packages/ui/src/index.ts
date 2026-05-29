/// <reference path="./env.d.ts" />

export { ArtsPage } from './arts/ArtsPage';
export type { ArtsPageProps } from './arts/ArtsPage';

// Creator Studio — currently mounted from inside ArtsPage when rootView === 'ARTIST'.
// Eventually houseoftherisingarts.com will mount this directly at `/`.
export { CreatorStudio } from './creator-studio/CreatorStudioShell';
export type { HubPhase } from './creator-studio/CreatorStudioShell';

// Section-change loading orb. Reusable splash for Inn ↔ Studio ↔ Auberge
// transitions — pass a `label` ("INN", "STUDIO", "AUBERGE") and `onDone`.
export { LoadingOrb } from './creator-studio/LoadingOrb';

// Public read-only call-sheet share page, mounted by the app at /c/{uid}/{slug}.
export { CallSheetPublicView } from './creator-studio/CallSheetPublicView';

// SDI Cafe — imported but DORMANT. Not mounted to any visible route yet.
// Future home: under the AUBERGE (aubergedesinconnus.com), as a casual-viewer
// showcase of productions + represented artists. NOT under the Salon — the
// Salon is the deep artist hub for creators/buyers.
export { SdiCafe } from './sdi-cafe/SdiCafe';
export type { SdiCafeProps } from './sdi-cafe/SdiCafe';

// Super Profile (Maestro tier) — /{username} fullscreen portfolio pages,
// the editor panel mounted inside the Studio's PROFILE tab, and the public
// templates dispatched on by medium.
export * from './super-profile';
