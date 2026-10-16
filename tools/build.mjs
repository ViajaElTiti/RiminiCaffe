// Generador estático de Rimini Caffè. Sin dependencias: `node tools/build.mjs`
// Lee content/*.json + src/ y escribe dist/. Todo el contenido editable vive en content/.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(read(p));

const site = json('content/site.json');
const i18n = json('content/i18n.json');
const menu = json('content/menu.json');
const alts = json('content/images.json');
const events = json('content/events.json');
const imgMeta = json('src/img/meta.json');
const LANGS = i18n.langs;
const DIST = path.join(ROOT, 'dist');

/* ---------- utilidades ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const L = (v, lang) => (typeof v === 'string' ? v : v[lang]);
const ui = (k, lang) => i18n.ui[k][lang];
const ldJson = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const slug = (page, lang) => i18n.slugs[page][lang];
const route = (page, lang) => `/${lang}/${slug(page, lang) ? slug(page, lang) + '/' : ''}`;
const abs = (p) => site.baseUrl + p;
const enc = encodeURIComponent;
const hash = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 8);

const mapsDir = `https://www.google.com/maps/dir/?api=1&destination=${enc(site.mapsQuery)}`;
const mapsView = `https://www.google.com/maps/search/?api=1&query=${enc(site.mapsQuery)}`;
const mapsEmbed = `https://www.google.com/maps?q=${enc(site.mapsQuery)}&output=embed`;
const telHref = `tel:${site.phone}`;
const waHref = (lang) => `https://wa.me/${site.whatsapp}?text=${enc(i18n.visitPage.waText[lang])}`;
const addr = site.address;
const addrLine = `${addr.street}, ${addr.postalCode} ${addr.locality}`;

const ICON = {
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.7A8 8 0 1 1 21 12z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};

/* ---------- horarios ---------- */
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']; // lunes primero
const DOW = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
const EN_DAY = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
function fmtHM(hm, lang) {
  const [h, m] = hm.split(':').map(Number);
  if (lang === 'en') {
    const ap = h >= 12 ? 'pm' : 'am';
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
  }
  return `${h}:${String(m).padStart(2, '0')}`;
}
const fmtRanges = (r, lang) => (r.length ? r.map(([a, b]) => `${fmtHM(a, lang)}–${fmtHM(b, lang)}`).join(' / ') : '—');
function hourGroups(lang, short) {
  const names = short ? i18n.daysShort[lang] : i18n.days[lang].map((d) => d[0].toUpperCase() + d.slice(1));
  const byKey = new Map();
  DAY_KEYS.forEach((k, idx) => {
    const key = JSON.stringify(site.hours[k] || []);
    if (!byKey.has(key)) byKey.set(key, { ranges: site.hours[k] || [], idxs: [] });
    byKey.get(key).idxs.push(idx);
  });
  return [...byKey.values()].map((g) => {
    const runs = [];
    g.idxs.forEach((i) => {
      const last = runs[runs.length - 1];
      if (last && last[last.length - 1] === i - 1) last.push(i); else runs.push([i]);
    });
    const label = runs.map((r) => {
      const n = (i) => names[DOW[DAY_KEYS[i]]];
      if (r.length === 1) return n(r[0]);
      if (r.length === 2) return `${n(r[0])}, ${n(r[1])}`;
      return `${n(r[0])}–${n(r[r.length - 1])}`;
    }).join(` ${ui('and', lang)} `);
    return { label: g.idxs.length === 7 ? ui('everyDay', lang) : label, time: fmtRanges(g.ranges, lang), days: g.idxs.map((i) => DOW[DAY_KEYS[i]]), ranges: g.ranges };
  });
}
const hoursCompact = (lang) => hourGroups(lang, true).map((g) => `${g.label} ${g.time}`).join(' · ');

/* ---------- imágenes ---------- */
function img(name, lang, { sizes = '100vw', eager = false, cls = '', decorative = false, pos = '' } = {}) {
  const m = imgMeta[name];
  if (!m) throw new Error(`Imagen no encontrada: ${name}`);
  const widths = [480, 800, 1200].filter((w) => w <= m.w);
  const srcset = widths.map((w) => `/img/${name}-${w}.webp ${w}w`).join(', ');
  const h = Math.round((m.h * 800) / m.w);
  const alt = decorative ? '' : esc(alts[name][lang]);
  return `<img class="${cls}" src="/img/${name}-800.webp" srcset="${srcset}" sizes="${sizes}" width="800" height="${h}" alt="${alt}"${pos ? ` style="object-position:${pos}"` : ''} ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>`;
}

/* ---------- carta ---------- */
const fmtPrice = (p, lang) => new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'es-ES', { style: 'currency', currency: menu.currency, minimumFractionDigits: 2 }).format(p);
const findItem = (catId, name) => menu.categories.find((c) => c.id === catId).items.find((i) => L(i.name, 'en') === name);

/* ---------- layout ---------- */
const assets = { css: '', js: '' };
let fontPreloads = [];
function head({ lang, page, title, description, ogImage = '/og.png', extra = '', preload = '' }) {
  const alt = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${abs(route(page, l))}">`).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${abs('/')}">`;
  const ogAlt = LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${i18n.meta[l].locale}">`).join('');
  const robots = page === 'legal' ? '<meta name="robots" content="noindex,follow">' : '';
  const analytics = site.analytics.plausibleDomain
    ? `<script defer data-domain="${esc(site.analytics.plausibleDomain)}" src="https://plausible.io/js/script.tagged-events.js"></script>` : '';
  return `<!doctype html>
<html lang="${i18n.meta[lang].htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${robots}
<link rel="canonical" href="${abs(route(page, lang))}">
${alt}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(route(page, lang))}">
<meta property="og:image" content="${abs(ogImage)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="${i18n.meta[lang].locale}">${ogAlt}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#00291B">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${preload}
${fontPreloads.map((f) => `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`).join('\n')}
<link rel="stylesheet" href="${assets.css}">
${extra}
${analytics}
</head>`;
}

function header(lang, page) {
  const langItems = LANGS.map((l) => `<li><a href="${route(page, l)}" hreflang="${l}" lang="${l}" data-track="lang_switch" data-lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${i18n.meta[l].label}</a></li>`).join('');
  return `<a class="skip" href="#main">${ui('skip', lang)}</a>
<header class="header">
  <div class="container header__in">
    <a class="brand" href="${route('home', lang)}" aria-label="${esc(ui('home', lang))}"><img src="/brand/logo-word-green.svg" width="136" height="37" alt="Rimini Caffè"></a>
    <nav class="nav" aria-label="${esc(ui('navLabel', lang))}">
      <a href="${route('menu', lang)}"${page === 'menu' ? ' aria-current="page"' : ''}>${ui('navMenu', lang)}</a>
      <a href="${route('visit', lang)}"${page === 'visit' ? ' aria-current="page"' : ''}>${ui('navVisit', lang)}</a>
      <details class="lang">
        <summary aria-label="${esc(ui('langLabel', lang))}: ${i18n.meta[lang].label}">${i18n.meta[lang].short}</summary>
        <ul>${langItems}</ul>
      </details>
    </nav>
  </div>
</header>`;
}

function footer(lang, page) {
  const langLinks = LANGS.map((l) => `<a href="${route(page, l)}" hreflang="${l}" lang="${l}" data-track="lang_switch" data-lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${i18n.meta[l].label}</a>`).join('');
  return `<footer class="footer on-dark">
  <div class="container">
    <div class="footer__grid">
      <div>
        <img src="/brand/logo-full-offwhite.svg" width="168" height="45" alt="Rimini Caffè — ${esc(site.tagline)}" loading="lazy">
        <p class="caption" style="margin-top:16px">${esc(addr.street)}<br>${addr.postalCode} ${addr.locality}</p>
      </div>
      <div>
        <h2>${ui('hoursStatic', lang)}</h2>
        <div class="footer__links caption">${hourGroups(lang, true).map((g) => `<span>${g.label}: ${g.time}</span>`).join('')}</div>
      </div>
      <div>
        <h2>${esc(i18n.visitPage.contact[lang])}</h2>
        <div class="footer__links">
          <a href="${telHref}" data-track="click_phone" data-place="footer">${site.phoneDisplay}</a>
          <a href="${waHref(lang)}" data-track="click_whatsapp" data-place="footer" rel="noopener">WhatsApp</a>
          <a href="${site.social.instagram}" data-track="click_instagram" data-place="footer" rel="noopener">${ui('followIg', lang)}</a>
          <a href="${site.social.tiktok}" data-track="click_tiktok" data-place="footer" rel="noopener">${ui('followTt', lang)}</a>
        </div>
      </div>
    </div>
    <div class="footer__small">
      <span>© ${new Date().getFullYear()} ${esc(site.name)}. ${ui('rights', lang)}</span>
      <span class="footer__links" style="display:flex;gap:16px;flex-wrap:wrap">${langLinks}</span>
      <a href="${route('legal', lang)}">${ui('legalLink', lang)}</a>
    </div>
  </div>
</footer>`;
}

function mobilebar(lang, page) {
  const second = page === 'menu'
    ? `<a class="btn btn--ghost" href="${waHref(lang)}" data-track="click_whatsapp" data-place="mobilebar" rel="noopener">${ICON.chat}<span>WhatsApp</span></a>`
    : `<a class="btn btn--ghost" href="${route('menu', lang)}" data-track="click_menu" data-place="mobilebar">${ui('navMenu', lang)}</a>`;
  return `<div class="mobilebar" role="region" aria-label="${esc(ui('directions', lang))}">
  <a class="btn btn--primary" href="${mapsDir}" data-track="click_directions" data-place="mobilebar" rel="noopener">${ICON.pin}<span>${ui('directions', lang)}</span></a>
  ${second}
  <a class="btn btn--ghost" href="${telHref}" data-track="click_phone" data-place="mobilebar" aria-label="${esc(ui('call', lang))} ${site.phoneDisplay}">${ICON.phone}<span>${ui('call', lang)}</span></a>
</div>`;
}

function clientConfig(lang) {
  return `<script type="application/json" id="rimini-config">${JSON.stringify({
    lang, locale: i18n.meta[lang].locale.replace('_', '-'), tz: site.timezone, hours: site.hours, closedDates: site.closedDates,
    days: i18n.days[lang],
    ui: { statusOpen: ui('statusOpen', lang), statusSoon: ui('statusSoon', lang), statusClosed: ui('statusClosed', lang), today: ui('today', lang), tomorrow: ui('tomorrow', lang) }
  })}</script>`;
}

function shell({ lang, page, bodyClass = '', main, headArgs, showBar = true }) {
  return `${head({ lang, page, ...headArgs })}
<body data-page="${page}" class="${showBar ? 'has-bar ' : ''}${bodyClass}">
${header(lang, page)}
<main id="main">
${main}
</main>
${footer(lang, page)}
${showBar ? mobilebar(lang, page) : ''}
${clientConfig(lang)}
<script src="${assets.js}" defer></script>
</body>
</html>`;
}

/* ---------- bloque visita (home + página visita) ---------- */
function visitBlock(lang, { heading, level = 'h2', place }) {
  const rows = hourGroups(lang, false).map((g) => `<div data-days="${g.days.join(',')}"><dt>${g.label}</dt><dd>${g.time}</dd></div>`).join('');
  return `<div class="visit__grid">
    <div class="info">
      <${level} class="${level === 'h1' ? 'h1' : 'h2'}">${heading}</${level}>
      <p><span data-status class="status" data-state="static">${ui('hoursStatic', lang)}: ${esc(hoursCompact(lang))}</span></p>
      <dl class="info">
        <div><dt>${i18n.visitPage.address[lang]}</dt><dd>${esc(addr.street)}<br>${addr.postalCode} ${addr.locality}</dd></div>
        <div><dt>${i18n.visitPage.hours[lang]}</dt><dd><dl class="hours">${rows}</dl></dd></div>
      </dl>
      <div class="btn-row">
        <a class="btn btn--light" href="${mapsDir}" data-track="click_directions" data-place="${place}" rel="noopener">${ICON.pin}${ui('directions', lang)}</a>
        <a class="btn btn--ghost" href="${telHref}" data-track="click_phone" data-place="${place}">${ICON.phone}${site.phoneDisplay}</a>
        <a class="btn btn--ghost" href="${waHref(lang)}" data-track="click_whatsapp" data-place="${place}" rel="noopener">${ICON.chat}WhatsApp</a>
      </div>
    </div>
    <div>
      <div class="map"><iframe src="${esc(mapsEmbed)}" title="${esc(ui('mapTitle', lang))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
      <p style="margin-top:12px"><a class="caption" href="${mapsView}" data-track="click_maps_open" data-place="${place}" rel="noopener">${ui('mapOpen', lang)}</a></p>
    </div>
  </div>`;
}

/* ---------- JSON-LD ---------- */
function localBusiness(lang) {
  const specs = hourGroups('en', false).map((g) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: g.days.map((d) => EN_DAY[DAY_KEYS.find((k) => DOW[k] === d)]),
    opens: g.ranges[0][0], closes: g.ranges[0][1]
  }));
  const o = {
    '@context': 'https://schema.org', '@type': 'CafeOrCoffeeShop', '@id': abs('/#business'),
    name: site.name, url: abs(route('home', lang)), image: abs('/og.png'), logo: abs('/apple-touch-icon.png'),
    telephone: site.phone, priceRange: site.priceRange, servesCuisine: ['Italian', 'Coffee', 'Focaccia', 'Pizza'],
    hasMenu: abs(route('menu', lang)), inLanguage: lang,
    address: { '@type': 'PostalAddress', streetAddress: addr.street, postalCode: addr.postalCode, addressLocality: addr.locality, addressRegion: addr.region, addressCountry: addr.country },
    openingHoursSpecification: specs, sameAs: [site.social.instagram, site.social.tiktok]
  };
  if (site.geo) o.geo = { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng };
  if (site.email) o.email = site.email;
  return ldJson(o);
}
function menuLd(lang) {
  return ldJson({
    '@context': 'https://schema.org', '@type': 'Menu', name: i18n.menuPage.h1[lang], inLanguage: lang, url: abs(route('menu', lang)),
    hasMenuSection: menu.categories.map((c) => ({
      '@type': 'MenuSection', name: L(c.name, lang),
      hasMenuItem: c.items.map((i) => {
        const it = { '@type': 'MenuItem', name: L(i.name, lang) };
        if (i.price != null) it.offers = { '@type': 'Offer', price: i.price.toFixed(2), priceCurrency: menu.currency };
        if (i.tags?.includes('v')) it.suitableForDiet = 'https://schema.org/VegetarianDiet';
        return it;
      })
    }))
  });
}

/* ---------- páginas ---------- */
function homePage(lang) {
  const h = i18n.home;
  const menuUrl = route('menu', lang);
  const parts = h.dayParts.map((p, idx) => {
    const cls = p.id === 'morning' ? 'bg-surface' : p.id === 'midday' ? 'bg-terra on-dark' : 'bg-velvet on-dark';
    const btn = p.id === 'morning' ? 'btn--primary' : 'btn--light';
    const media = p.photo
      ? img(p.photo, lang, { sizes: '(min-width:640px) 45vw, 100vw', cls: 'day__img' })
      : `<p class="day__big" aria-hidden="true">Spritz</p>`;
    const extra = p.id === 'midday' ? `<a class="btn btn--ghost" href="${waHref(lang)}" data-track="click_whatsapp" data-place="day-midday" rel="noopener">${ICON.chat}WhatsApp</a>` : '';
    return `<article class="day ${cls} reveal" id="${p.id}" data-from="${p.from}" data-to="${p.to}" aria-labelledby="${p.id}-t">
    <div class="container day__grid${idx % 2 ? ' day--flip' : ''}">
      <div class="day__body">
        <p class="day__time"><time datetime="${p.time}">${p.time}</time><span class="day__now">${ui('now', lang)}</span></p>
        <h3 class="h2" id="${p.id}-t">${p.title[lang]}</h3>
        <p>${p.text[lang]}</p>
        <div class="btn-row"><a class="btn ${btn}" href="${menuUrl}#${p.link}" data-track="click_menu" data-place="day-${p.id}">${p.cta[lang]}${ICON.arrow}</a>${extra}</div>
      </div>
      <div class="day__media">${media}</div>
    </div>
  </article>`;
  }).join('\n');

  const cards = [['pizzas', 'Truffle', 'pizza-truffle', 'Pizza Truffle'], ['focacce', 'Vitello tonnato', 'focaccia-vitello', 'Focaccia Vitello tonnato'], ['matcha', 'Matcha latte', 'matcha-marble', 'Matcha latte'], ['focacce', 'Mortadella', 'focaccia-mortadella', 'Focaccia Mortadella']]
    .map(([cat, item, photo, label]) => {
      const it = findItem(cat, item);
      return `<li><a class="card" href="${menuUrl}#${cat}" data-track="click_menu" data-place="teaser-card">${img(photo, lang, { sizes: '(min-width:640px) 22vw, 46vw' })}<span class="card__name">${label}</span><span class="card__price">${fmtPrice(it.price, lang)}</span></a></li>`;
    }).join('');
  const chips = menu.categories.map((c) => `<li><a class="chip" href="${menuUrl}#${c.id}" data-track="click_menu" data-place="teaser-chip">${esc(L(c.name, lang))}</a></li>`).join('');

  const gallery = [['barista-wide', '60% 50%'], ['serve-pizza'], ['window-sip'], ['barista-grinder'], ['mug-green'], ['barista-hands']]
    .map(([n, pos]) => `<figure>${img(n, lang, { sizes: '(min-width:900px) 30vw, 72vw', pos })}</figure>`).join('');

  const evs = events.length ? `<section class="section bg-surface" aria-labelledby="ev-t"><div class="container">
      <h2 class="h2 bracket" id="ev-t">${h.eventsTitle[lang]}</h2><p class="lead" style="margin-top:12px">${h.eventsLead[lang]}</p>
      <ul class="events">${events.map((e) => `<li class="event"><span class="event__date">${esc(L(e.date, lang))}</span><span class="h3">${esc(L(e.title, lang))}</span>${e.text ? `<span>${esc(L(e.text, lang))}</span>` : ''}</li>`).join('')}</ul>
    </div></section>` : '';

  const main = `
<section class="hero on-dark" aria-labelledby="hero-t">
  <div class="container hero__grid">
    <div class="hero__copy">
      <p><span class="status" data-status data-state="static">${ui('hoursStatic', lang)}: ${esc(hoursCompact(lang))}</span></p>
      <h1 class="display" id="hero-t">${esc(h.h1[lang])}</h1>
      <p class="lead">${esc(h.lead[lang])}</p>
      <div class="btn-row">
        <a class="btn btn--light" href="${mapsDir}" data-track="click_directions" data-place="hero" rel="noopener">${ICON.pin}${ui('directions', lang)}</a>
        <a class="btn btn--ghost" href="${menuUrl}" data-track="click_menu" data-place="hero">${ui('seeMenu', lang)}</a>
      </div>
    </div>
    <div class="hero__media">
      ${img('pizza-mortadella', lang, { sizes: '(min-width:900px) 40vw, 92vw', eager: true, cls: 'hero__img' })}
      ${img('latte-art', lang, { sizes: '16vw', cls: 'hero__img2', decorative: true })}
    </div>
  </div>
</section>
<div data-hero-end aria-hidden="true"></div>
<section class="statement" aria-label="Rimini Caffè">
  <div class="container"><p>${esc(h.statement[lang])}</p><p class="caption">${esc(site.tagline)}</p></div>
</section>
<section aria-labelledby="day-t">
  <div class="container day-title"><h2 class="h1" id="day-t">${h.dayTitle[lang]}</h2></div>
  ${parts}
</section>
<section class="section bg-green on-dark" aria-labelledby="menu-t">
  <div class="container">
    <div class="teaser__head"><h2 class="h1 bracket" id="menu-t">${h.menuTitle[lang]}</h2><p class="lead">${h.menuLead[lang]}</p></div>
    <ul class="chips" aria-label="${esc(ui('menuCats', lang))}">${chips}</ul>
    <ul class="cards">${cards}</ul>
    <a class="btn btn--light" href="${menuUrl}" data-track="click_menu" data-place="teaser">${ui('seeFullMenu', lang)}${ICON.arrow}</a>
  </div>
</section>
<section class="section" aria-labelledby="gal-t">
  <div class="container">
    <h2 class="h2" id="gal-t">${h.galleryTitle[lang]}</h2>
    <div class="gallery" style="margin-top:24px" tabindex="0" role="group" aria-label="${esc(h.galleryTitle[lang])}">${gallery}</div>
    <p class="quote">${h.quote[lang]}</p>
  </div>
</section>
${evs}
<section class="section bg-green on-dark" aria-labelledby="visit-t" id="visit">
  <div class="container">${visitBlock(lang, { heading: `<span id="visit-t">${i18n.visitPage.h1[lang]}</span>`, level: 'h2', place: 'home-visit' })}</div>
</section>`;
  return shell({ lang, page: 'home', main, headArgs: {
    title: h.title[lang], description: h.description[lang],
    extra: localBusiness(lang)
  } });
}

function menuPage(lang) {
  const m = i18n.menuPage;
  const nav = menu.categories.map((c) => `<li><a class="chip" href="#${c.id}">${esc(L(c.name, lang))}</a></li>`).join('');
  const cats = menu.categories.map((c) => {
    const items = c.items.map((i) => {
      const tag = i.tags?.includes('v') ? `<abbr class="tag" title="${esc(ui('veg', lang))}">V</abbr>` : '';
      const price = i.price != null ? `<span class="item__price">${fmtPrice(i.price, lang)}</span>` : `<span class="item__price item__price--ask">${ui('priceAsk', lang)}</span>`;
      return `<li class="item"><span class="item__name">${esc(L(i.name, lang))}${tag}</span>${price}</li>`;
    }).join('');
    const photo = c.photo ? img(c.photo, lang, { sizes: '(min-width:900px) 340px, 92vw', cls: 'cat__img' }) : '';
    return `<section class="cat" id="${c.id}" aria-labelledby="${c.id}-t">
      <div class="cat__grid${photo ? '' : ' cat__grid--noimg'}">
        ${photo}
        <div class="cat__list"><h2 class="h2 bracket cat__title" id="${c.id}-t">${esc(L(c.name, lang))}</h2><ul>${items}</ul></div>
      </div>
    </section>`;
  }).join('');
  const main = `
<div class="container page-head"><h1 class="h1">${m.h1[lang]}</h1><p class="lead">${m.lead[lang]}</p></div>
<div class="catnav"><div class="container"><ul aria-label="${esc(ui('menuCats', lang))}">${nav}</ul></div></div>
<div class="container">
  ${cats}
  <div class="legend caption"><p><abbr class="tag" title="${esc(ui('veg', lang))}">V</abbr> ${ui('veg', lang)}</p><p>${ui('priceNote', lang)}</p><p>${ui('terraceNote', lang)}</p><p>${ui('allergens', lang)}</p></div>
  <div class="cta-box bg-green on-dark"><h2 class="h2">${m.ctaTitle[lang]}</h2><p>${m.ctaText[lang]}</p>
    <div class="btn-row"><a class="btn btn--light" href="${waHref(lang)}" data-track="click_whatsapp" data-place="menu-cta" rel="noopener">${ICON.chat}WhatsApp</a>
    <a class="btn btn--ghost" href="${telHref}" data-track="click_phone" data-place="menu-cta">${ICON.phone}${site.phoneDisplay}</a>
    <a class="btn btn--ghost" href="${mapsDir}" data-track="click_directions" data-place="menu-cta" rel="noopener">${ICON.pin}${ui('directions', lang)}</a></div></div>
</div>`;
  return shell({ lang, page: 'menu', main, headArgs: { title: m.title[lang], description: m.description[lang], extra: menuLd(lang) } });
}

function visitPage(lang) {
  const v = i18n.visitPage;
  const main = `
<section class="section bg-green on-dark" style="padding-block:48px 64px">
  <div class="container">${visitBlock(lang, { heading: v.h1[lang], level: 'h1', place: 'visit-page' })}</div>
</section>
<section class="section" aria-labelledby="svc-t" style="padding-block:48px 64px">
  <div class="container"><h2 class="h2" id="svc-t">${v.services[lang]}</h2>
  <ul class="list" style="margin-top:24px">${v.serviceList.map((s) => `<li>${esc(s[lang])}</li>`).join('')}</ul></div>
</section>`;
  return shell({ lang, page: 'visit', main, headArgs: { title: v.title[lang], description: v.description[lang], extra: localBusiness(lang) } });
}

function legalPage(lang) {
  const l = i18n.legalPage;
  const main = `<div class="container"><div class="page-head"><h1 class="h1">${l.h1[lang]}</h1></div>
  <div class="prose">${l.blocks.map((b) => `<section><h2>${b.h[lang]}</h2><p>${esc(b.p[lang])}</p></section>`).join('')}</div></div>`;
  return shell({ lang, page: 'legal', main, showBar: false, headArgs: { title: l.title[lang], description: l.title[lang] } });
}

function notFound() {
  const lang = 'en';
  const blocks = LANGS.map((l) => `<p lang="${l}"><a class="btn btn--ghost" href="${route('home', l)}">${i18n.meta[l].label}</a></p>`).join('');
  const main = `<div class="container notfound"><h1 class="h1">404</h1>${LANGS.map((l) => `<p lang="${l}">${ui('notFoundTitle', l)}. ${ui('notFoundText', l)}</p>`).join('')}<div class="btn-row">${blocks}</div></div>`;
  return `${head({ lang, page: 'home', title: 'Rimini Caffè · 404', description: '404' }).replace('<link rel="canonical"', '<meta name="robots" content="noindex"><link rel="canonical"')}
<body data-page="404"><a class="skip" href="#main">${ui('skip', lang)}</a><main id="main">${main}</main><script src="${assets.js}" defer></script></body></html>`;
}

function rootPage() {
  const links = LANGS.map((l) => `<a class="btn btn--light" href="/${l}/" hreflang="${l}" lang="${l}">${i18n.meta[l].label}</a>`).join('');
  const alt = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${abs(route('home', l))}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${abs('/')}">`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(i18n.home.title.en)}</title>
<meta name="description" content="${esc(i18n.home.description.en)}">
<link rel="canonical" href="${abs('/')}">
${alt}
<meta property="og:title" content="${esc(i18n.home.title.en)}"><meta property="og:image" content="${abs('/og.png')}"><meta property="og:url" content="${abs('/')}">
<meta name="theme-color" content="#00291B">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="${assets.css}">
<script>(function(){var l;try{l=localStorage.getItem('rimini-lang')}catch(e){}
if(!/^(es|ca|en)$/.test(l||'')){var ls=navigator.languages||[navigator.language||'en'];l='en';for(var i=0;i<ls.length;i++){var c=String(ls[i]).slice(0,2).toLowerCase();if(c==='ca'){l='ca';break}if(c==='es'||c==='gl'||c==='eu'){l='es';break}if(c==='en'){l='en';break}}}
location.replace('/'+l+'/'+location.hash)})()</script>
</head><body class="bg-green on-dark" style="min-height:100vh;display:grid;place-items:center;text-align:center">
<main id="main" class="container" style="display:grid;gap:32px;justify-items:center">
<img src="/brand/logo-full-offwhite.svg" width="320" height="86" alt="Rimini Caffè — ${esc(site.tagline)}">
<div class="btn-row" style="justify-content:center">${links}</div>
</main></body></html>`;
}

/* ---------- QR de reseñas: /r/<tarjeta>/ cuenta el escaneo y redirige a Google ---------- */
function reviewRedirect(card) {
  // Destino: enlace directo de reseñas de Google si está en site.json; si no, la ficha de Maps (el QR nunca queda roto).
  const target = site.reviewUrl || mapsView;
  const plausible = site.analytics.plausibleDomain
    ? `<script async data-domain="${esc(site.analytics.plausibleDomain)}" src="https://plausible.io/js/script.tagged-events.js"></script>` : '';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rimini Caffè · Gracias</title>
<meta name="robots" content="noindex,nofollow">
<noscript><meta http-equiv="refresh" content="0;url=${esc(target)}"></noscript>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${assets.css}">
<script>window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}</script>
${plausible}
</head><body class="bg-green on-dark" style="min-height:100vh;display:grid;place-items:center;text-align:center">
<main id="main" class="container" style="display:grid;gap:24px;justify-items:center;padding-block:48px">
<img src="/brand/logo-full-offwhite.svg" width="240" height="65" alt="Rimini Caffè">
<h1 class="h2" style="font-size:1.5rem">Gràcies · Gracias · Thank you</h1>
<p class="caption">Abriendo Google… / Obrint Google… / Opening Google…</p>
<a class="btn btn--light" href="${esc(target)}" rel="noopener">★ Google</a>
</main>
<script>(function(){var t=${JSON.stringify(target)},c=${JSON.stringify(card)},d=false;function go(){if(d)return;d=true;location.replace(t)}
try{(window.dataLayer=window.dataLayer||[]).push({event:"review_qr",card:c});window.plausible("review_qr",{props:{card:c},callback:go})}catch(e){go()}
setTimeout(go,${site.analytics.plausibleDomain ? 1800 : 0})})()</script>
</body></html>`;
}

/* ---------- build ---------- */
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });

// CSS (con @font-face solo si hay fuentes de marca en src/fonts) y JS con hash
let css = read('src/css/main.css');
const fontDir = path.join(ROOT, 'src/fonts');
const fontFaces = [];
fontPreloads = [];
const faceCss = (family, file, w) => `@font-face{font-family:"${family}";src:url("/fonts/${file}") format("woff2");font-weight:${w};font-style:normal;font-display:swap}`;
if (fs.existsSync(fontDir)) {
  // Fuente de marca (Neue Machina): se usa si están los .woff2 con licencia web. Si no, la provisional (Space Grotesk, OFL).
  const brand = [['NeueMachina-Regular.woff2', 400], ['NeueMachina-Bold.woff2', 700]].filter(([f]) => fs.existsSync(path.join(fontDir, f)));
  const prov = [['provisional/SpaceGrotesk-400.woff2', 400], ['provisional/SpaceGrotesk-700.woff2', 700]].filter(([f]) => fs.existsSync(path.join(fontDir, f)));
  brand.forEach(([f, w]) => { fontFaces.push(faceCss('Neue Machina', f, w)); fontPreloads.push(`/fonts/${f}`); });
  if (!brand.length) prov.forEach(([f, w]) => { fontFaces.push(faceCss('Space Grotesk', f, w)); fontPreloads.push(`/fonts/${f}`); });
  if (fontFaces.length) fs.cpSync(fontDir, path.join(DIST, 'fonts'), { recursive: true });
}
if (fontFaces.length) css = fontFaces.join('\n') + '\n' + css;
const js = read('src/js/main.js');
assets.css = `/assets/main.${hash(css)}.css`;
assets.js = `/assets/main.${hash(js)}.js`;
fs.writeFileSync(path.join(DIST, assets.css), css);
fs.writeFileSync(path.join(DIST, assets.js), js);

fs.cpSync(path.join(ROOT, 'src/img'), path.join(DIST, 'img'), { recursive: true });
fs.rmSync(path.join(DIST, 'img/meta.json'));
fs.cpSync(path.join(ROOT, 'src/brand'), path.join(DIST, 'brand'), { recursive: true });
if (fs.existsSync(path.join(ROOT, 'src/static'))) fs.cpSync(path.join(ROOT, 'src/static'), DIST, { recursive: true });

// favicon (marca corta sobre verde)
const short = read('src/brand/logo-short-offwhite.svg');
const inner = short.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
fs.writeFileSync(path.join(DIST, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#00291B"/><g transform="translate(5 23.5) scale(.0940)">${inner}</g></svg>`);

const write = (rel, html) => { const f = path.join(DIST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
write('index.html', rootPage());
write('404.html', notFound());
const builders = { home: homePage, menu: menuPage, visit: visitPage, legal: legalPage };
for (const lang of LANGS) for (const [page, fn] of Object.entries(builders)) write(`${route(page, lang).slice(1)}index.html`, fn(lang));

// sitemap + robots
const today = new Date().toISOString().slice(0, 10);
const pages = ['home', 'menu', 'visit'];
const urls = pages.flatMap((p) => LANGS.map((l) => `  <url>
    <loc>${abs(route(p, l))}</loc>
    <lastmod>${today}</lastmod>
${LANGS.map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${abs(route(p, a))}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${abs('/')}"/>
  </url>`)).join('\n');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`);
for (const c of ['', 'a', 'b', 'c']) write(`r/${c ? c + '/' : ''}index.html`, reviewRedirect(c || 'general'));
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /r/\n\nSitemap: ${abs('/sitemap.xml')}\n`);

console.log(`OK · ${LANGS.length * Object.keys(builders).length + 2} páginas · ${assets.css} · ${assets.js}`);
