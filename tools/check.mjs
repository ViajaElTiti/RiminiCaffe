// QA automático sobre dist/: `node tools/build.mjs && node tools/check.mjs`
// Comprueba enlaces internos, imágenes, alt, h1, hreflang, metadatos, placeholders y peso.
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(DIST);
const pages = files.filter((f) => f.endsWith('.html'));
const rel = (f) => '/' + path.relative(DIST, f);
const exists = (u) => {
  const clean = u.split('#')[0].split('?')[0];
  if (!clean) return true;
  const p = path.join(DIST, clean);
  return fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(path.join(p, 'index.html')));
};
const errors = [], warns = [];
const err = (f, m) => errors.push(`${rel(f)} — ${m}`);
const warn = (f, m) => warns.push(`${rel(f)} — ${m}`);

for (const f of pages) {
  const html = fs.readFileSync(f, 'utf8');
  const isLegal = /aviso-legal|avis-legal|\/legal\//.test(f);
  const is404 = f.endsWith('404.html');
  // enlaces y recursos internos
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?][^"]*|\/#[^"]*|\/)"/g)) if (!exists(m[1])) err(f, `recurso interno roto: ${m[1]}`);
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) for (const part of m[1].split(',')) { const u = part.trim().split(' ')[0]; if (u.startsWith('/') && !exists(u)) err(f, `srcset roto: ${u}`); }
  // anclas internas
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!ids.has(m[1])) err(f, `ancla sin destino: #${m[1]}`);
  for (const m of html.matchAll(/href="(\/[^"#]*)#([^"]+)"/g)) {
    const target = path.join(DIST, m[1], m[1].endsWith('/') ? 'index.html' : '');
    if (fs.existsSync(target) && !new RegExp(`id="${m[2]}"`).test(fs.readFileSync(target, 'utf8'))) err(f, `ancla externa sin destino: ${m[1]}#${m[2]}`);
  }
  // imágenes
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const t = m[0];
    if (!/\salt="/.test(t)) err(f, `<img> sin alt: ${t.slice(0, 80)}`);
    if (!/\swidth="/.test(t) || !/\sheight="/.test(t)) err(f, `<img> sin width/height (CLS): ${t.slice(0, 80)}`);
  }
  if (is404 || /^\/r\//.test(rel(f))) continue;
  // estructura
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1 && f !== path.join(DIST, 'index.html')) err(f, `debe haber 1 <h1>, hay ${h1}`);
  if (!/<html lang="(es|ca|en)"/.test(html)) err(f, 'falta lang en <html>');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (!title) err(f, 'sin <title>'); else if (title.length > 70) warn(f, `title largo (${title.length})`);
  if (!desc) err(f, 'sin meta description'); else if (desc.length > 170) warn(f, `description larga (${desc.length})`);
  if (!/rel="canonical"/.test(html)) err(f, 'sin canonical');
  if (!/hreflang="x-default"/.test(html)) err(f, 'sin hreflang x-default');
  if (!/property="og:image"/.test(html)) err(f, 'sin og:image');
  if (!/id="main"/.test(html)) err(f, 'sin <main id="main">');
  // placeholders visibles
  if (!isLegal && /\[(PENDIENTE|PENDENT|PENDING|VERIFICAR)/i.test(html)) err(f, 'placeholder visible fuera de la página legal');
  // JSON-LD válido
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { err(f, 'JSON-LD inválido'); } }
  // botones/enlaces sin nombre accesible
  for (const m of html.matchAll(/<a\b[^>]*>\s*<\/a>/g)) err(f, `enlace vacío: ${m[0].slice(0, 80)}`);
  // tamaño del HTML
  const kb = Buffer.byteLength(html) / 1024;
  if (kb > 60) warn(f, `HTML pesado: ${kb.toFixed(0)} KB`);
}

// reciprocidad hreflang
for (const f of pages.filter((p) => /\/(es|ca|en)\//.test(rel(p)))) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/hreflang="(es|ca|en)" href="https:\/\/[^/]+(\/[^"]*)"/g)) {
    if (!exists(m[2])) err(f, `hreflang apunta a página inexistente: ${m[2]}`);
    else if (!fs.readFileSync(path.join(DIST, m[2], 'index.html'), 'utf8').includes(`hreflang="${/^\/(es|ca|en)\//.exec(rel(f))[1]}"`)) err(f, `hreflang no recíproco: ${m[2]}`);
  }
}

// peso de recursos críticos
const size = (p) => fs.statSync(path.join(DIST, p)).size / 1024;
const assets = files.filter((f) => /\/assets\//.test(f));
const heroKb = size('img/pizza-mortadella-800.webp');
const imgKb = files.filter((f) => /\/img\//.test(f)).reduce((a, f) => a + fs.statSync(f).size, 0) / 1024;
console.log(`Páginas: ${pages.length} · CSS+JS: ${assets.reduce((a, f) => a + fs.statSync(f).size, 0) / 1024 | 0} KB · hero@800: ${heroKb | 0} KB · img total en dist: ${imgKb | 0} KB`);
console.log(`Sitemap URLs: ${(fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8').match(/<loc>/g) || []).length}`);
warns.forEach((w) => console.log('AVISO  ' + w));
errors.forEach((e) => console.log('ERROR  ' + e));
console.log(errors.length ? `\n${errors.length} error(es)` : '\nSin errores.');
process.exit(errors.length ? 1 : 0);
