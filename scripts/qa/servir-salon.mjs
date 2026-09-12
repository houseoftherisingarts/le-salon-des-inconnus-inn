// Sert apps/salon/dist comme Firebase Hosting le ferait pour le site inconnus-salon :
// mêmes en-têtes (firebase.json), même réécriture vers index.html. Sert aux captures
// de la boucle verdict AVANT de déployer. Usage : node scripts/qa/servir-salon.mjs [port]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const dist = join(root, 'apps', 'salon', 'dist');
const port = Number(process.argv[2] || 4272);
const sites = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8')).hosting;
const conf = (Array.isArray(sites) ? sites : [sites]).find((s) => s.site === 'inconnus-salon') || {};

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.ico': 'image/x-icon' };

const globVersRegex = (g) => new RegExp('^' + g
  .replace(/\./g, '\\.')
  .replace(/@\(([^)]+)\)/g, '($1)')
  .replace(/\*\*\//g, '(.*/)?')
  .replace(/\*\*/g, '.*')
  .replace(/(?<![.\]])\*/g, '[^/]*') + '$');

const entetes = (conf.headers || []).map((h) => ({ re: globVersRegex(h.source), headers: h.headers }));

createServer((req, res) => {
  const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let fichier = resolve(dist, '.' + chemin);
  if (!fichier.startsWith(dist + sep) && fichier !== dist) { res.statusCode = 403; return res.end('interdit'); }
  if (existsSync(fichier) && statSync(fichier).isDirectory()) fichier = join(fichier, 'index.html');
  if (!existsSync(fichier)) fichier = join(dist, 'index.html');
  const relatif = fichier.slice(dist.length);
  for (const e of entetes) if (e.re.test(relatif) || e.re.test(relatif.slice(1))) for (const h of e.headers) res.setHeader(h.key, h.value);
  res.setHeader('Content-Type', TYPES[extname(fichier)] || 'application/octet-stream');
  res.end(readFileSync(fichier));
}).listen(port, () => console.log(`apps/salon/dist servi sur http://localhost:${port} avec les en-têtes du site inconnus-salon`));
