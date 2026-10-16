/* Rimini Caffè — JS mínimo. Todo es mejora progresiva: sin JS la web sigue siendo completa. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  var cfg = {};
  try { cfg = JSON.parse(document.getElementById('rimini-config').textContent); } catch (e) { return; }

  /* ---------- Analítica: eventos propios, sin cookies ---------- */
  function track(name, props) {
    try {
      if (typeof window.plausible === 'function') window.plausible(name, { props: props || {} });
      (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, props || {}));
    } catch (e) { /* nunca romper la web por analítica */ }
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-track]');
    if (!el) return;
    track(el.getAttribute('data-track'), { place: el.getAttribute('data-place') || '', lang: cfg.lang });
    var pref = el.getAttribute('data-lang');
    if (pref) { try { localStorage.setItem('rimini-lang', pref); } catch (err) { /* sin storage */ } }
  });
  if (document.body.getAttribute('data-page') === 'menu') track('menu_view', { lang: cfg.lang });

  /* ---------- Horario: abierto ahora / cerrado ---------- */
  var KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function nowInTz() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: cfg.tz, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return { dow: WD[o.weekday], y: +o.year, m: +o.month, d: +o.day, min: (+o.hour) * 60 + (+o.minute) };
  }
  function toMin(hhmm) { var p = hhmm.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function isoPlus(n, add) {
    var dt = new Date(Date.UTC(n.y, n.m - 1, n.d + add));
    return dt.toISOString().slice(0, 10);
  }
  function fmtTime(min) {
    var dt = new Date(Date.UTC(2000, 0, 1, Math.floor(min / 60), min % 60));
    return new Intl.DateTimeFormat(cfg.locale, { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', hour12: cfg.lang === 'en' }).format(dt);
  }
  function rangesFor(n, add) {
    if (cfg.closedDates.indexOf(isoPlus(n, add)) !== -1) return [];
    return cfg.hours[KEYS[(n.dow + add) % 7]] || [];
  }
  function fill(tpl, vars) { return tpl.replace(/\{(\w+)\}/g, function (_, k) { return vars[k]; }); }

  function computeStatus() {
    var n = nowInTz(), today = rangesFor(n, 0), i;
    for (i = 0; i < today.length; i++) {
      var a = toMin(today[i][0]), b = toMin(today[i][1]);
      if (n.min >= a && n.min < b) {
        return b - n.min <= 45
          ? { state: 'soon', text: fill(cfg.ui.statusSoon, { t: fmtTime(b) }) }
          : { state: 'open', text: fill(cfg.ui.statusOpen, { t: fmtTime(b) }) };
      }
    }
    for (i = 0; i < today.length; i++) {
      if (toMin(today[i][0]) > n.min) return closed('today', today[i][0]);
    }
    for (var add = 1; add <= 7; add++) {
      var r = rangesFor(n, add);
      if (r.length) {
        var label = add === 1 ? cfg.ui.tomorrow : cfg.days[(n.dow + add) % 7];
        return closed(label, r[0][0]);
      }
    }
    return null;
    function closed(w, t) {
      var when = w === 'today' ? cfg.ui.today : w;
      return { state: 'closed', text: fill(cfg.ui.statusClosed, { w: when, t: fmtTime(toMin(t)) }) };
    }
  }
  function renderStatus() {
    var s = computeStatus();
    if (!s) return;
    document.querySelectorAll('[data-status]').forEach(function (el) {
      el.textContent = s.text;
      el.setAttribute('data-state', s.state);
    });
    var n = nowInTz();
    document.querySelectorAll('[data-days]').forEach(function (row) {
      var days = row.getAttribute('data-days').split(',');
      row.classList.toggle('is-today', days.indexOf(String(n.dow)) !== -1);
    });
    document.querySelectorAll('.day[data-from]').forEach(function (el) {
      var h = Math.floor(n.min / 60);
      el.setAttribute('aria-current', h >= +el.getAttribute('data-from') && h < +el.getAttribute('data-to') ? 'true' : 'false');
    });
  }
  renderStatus();
  setInterval(renderStatus, 60000);

  /* ---------- Barra móvil: aparece al salir del hero ---------- */
  var bar = document.querySelector('.mobilebar');
  var sentinel = document.querySelector('[data-hero-end]');
  if (bar && sentinel && 'IntersectionObserver' in window) {
    bar.setAttribute('data-hidden', 'true');
    new IntersectionObserver(function (en) {
      // oculta la barra mientras el final del hero siga por debajo del borde superior
      bar.setAttribute('data-hidden', en[0].boundingClientRect.top > 0 ? 'true' : 'false');
    }).observe(sentinel);
  }

  /* ---------- Carta: chip activo según scroll ---------- */
  var cats = document.querySelectorAll('.cat');
  if (cats.length && 'IntersectionObserver' in window) {
    var chips = {};
    document.querySelectorAll('.catnav a').forEach(function (a) { chips[a.getAttribute('href').slice(1)] = a; });
    var catIo = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        Object.keys(chips).forEach(function (k) { chips[k].removeAttribute('aria-current'); });
        var c = chips[x.target.id];
        if (c) { c.setAttribute('aria-current', 'true'); c.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    cats.forEach(function (c) { catIo.observe(c); });
  }

  /* ---------- Revelado suave (solo si el usuario no pidió menos movimiento) ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rev = document.querySelectorAll('.reveal');
  if (rev.length && !reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { threshold: .12 });
    rev.forEach(function (el) { io.observe(el); });
  } else {
    rev.forEach(function (el) { el.classList.add('in'); });
  }
})();
