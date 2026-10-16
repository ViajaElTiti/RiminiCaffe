// Servidor estático local para revisar dist/. `node tools/serve.mjs [puerto]`
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const DIST = path.resolve(import.meta.dirname, '..', 'dist');
const port = Number(process.argv[2]) || 4173;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(DIST, p);
  if (!f.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': types['.html'] }).end(fs.readFileSync(path.join(DIST, '404.html'))); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }).end(fs.readFileSync(f));
}).listen(port, () => console.log(`http://localhost:${port}`));
