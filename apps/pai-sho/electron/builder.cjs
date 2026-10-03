// electron-builder : paquet macOS (.app + .dmg), non signé (Alex ouvre par clic droit > Ouvrir la première fois).
module.exports = {
  appId: 'com.inconnus.paisho',
  productName: 'Pai Sho',
  directories: { output: 'release', buildResources: 'electron' },
  files: ['dist/**', 'electron/main.cjs', 'package.json'],
  asar: true,
  mac: {
    category: 'public.app-category.board-games',
    icon: 'electron/icon.png',
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    identity: null,
    hardenedRuntime: false,
    darkModeSupport: true,
  },
  dmg: { title: 'Pai Sho', contents: [{ x: 140, y: 180 }, { x: 420, y: 180, type: 'link', path: '/Applications' }] },
  npmRebuild: false,
};
