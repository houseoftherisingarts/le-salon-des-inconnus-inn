// Coquille Electron de Pai Sho : sert le build Vite sous le protocole app:// (origine sûre,
// donc travailleurs en module, fetch des GLB et du décodeur draco fonctionnent comme sur le web).
const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
const DEV = process.env.VITE_DEV_SERVER_URL;

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

function creerFenetre() {
  const fenetre = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'Pai Sho',
    backgroundColor: '#120d0a',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  fenetre.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  if (DEV) fenetre.loadURL(DEV);
  else fenetre.loadURL('app://jeu/index.html');
}

app.whenReady().then(() => {
  protocol.handle('app', (requete) => {
    const { pathname } = new URL(requete.url);
    const relatif = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    const fichier = path.normalize(path.join(DIST, relatif));
    if (!fichier.startsWith(DIST)) return new Response('Interdit', { status: 403 });
    return net.fetch(pathToFileURL(fichier).toString());
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'editMenu' },
    { label: 'Affichage', submenu: [{ role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'toggleDevTools' }] },
    { role: 'windowMenu' },
  ]));
  creerFenetre();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) creerFenetre(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
