// Shared by the public pages: language (ar/fr/en, saved), theme (the device's, or light/dark once chosen, saved), the header bar and the footer.
// Loaded in <head> so the saved theme and language apply before the page is drawn; a page then calls
// UI.init({page, T, onLang}) at the end of <body> with its own texts (T[lang][key], shown in [data-t] elements).
(function () {
  const NAME = {ar: 'منصة الشواهد', fr: 'Plateforme des attestations', en: 'Certificates platform'};
  const LOGO = '';  // for example 'logo.png', uploaded next to the pages
  const COMMON = {
    ar: {tagline: 'التحقق من صحة الشواهد وتحميلها', nVerify: 'التحقق', nMe: 'شواهدي', nPrivacy: 'سياسة الخصوصية', nDash: 'لوحة المنظمين',
         themeAuto: 'المظهر: حسب الجهاز', themeLight: 'المظهر: فاتح', themeDark: 'المظهر: داكن', net: 'تعذر الاتصال بالإنترنت أو بـ Google — أعد المحاولة'},
    fr: {tagline: 'Vérification et téléchargement des attestations', nVerify: 'Vérifier', nMe: 'Mes attestations', nPrivacy: 'Confidentialité',
         nDash: 'Espace organisateurs', themeAuto: 'Thème : selon l’appareil', themeLight: 'Thème : clair', themeDark: 'Thème : sombre',
         net: 'Connexion à Internet ou à Google impossible — réessayez'},
    en: {tagline: 'Verify and download certificates', nVerify: 'Verify', nMe: 'My certificates', nPrivacy: 'Privacy', nDash: 'Organizers',
         themeAuto: 'Theme: device', themeLight: 'Theme: light', themeDark: 'Theme: dark', net: 'Could not reach the Internet or Google — try again'},
  };
  const LOCALE = {ar: 'ar-MA-u-nu-latn', fr: 'fr-FR', en: 'en-GB'};
  const ICON = {
    auto: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 010 16z" fill="currentColor"/></svg>',
    light: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/></svg>',
    seal: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e2b65a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l7 3v6c0 5-3.4 8.6-7 10-3.6-1.4-7-5-7-10V5l7-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  };
  const LANGS = ['ar', 'fr', 'en'], THEMES = ['auto', 'light', 'dark'];
  const root = document.documentElement, params = new URLSearchParams(location.search);
  const store = {  // private browsing can refuse storage: the page still works, it only forgets
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* not kept */ } },
  };
  const pick = (v, list) => list.includes(v) ? v : null;

  let theme = pick(store.get('theme'), THEMES) || 'auto';
  let lang = pick(params.get('lang'), LANGS) || pick(store.get('lang'), LANGS) || 'ar';  // the platform speaks Arabic first; FR/EN from the switch
  let page = {T: {}, onLang: null, name: ''};
  applyTheme();
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';

  function el(tag, props, ...kids) {  // builds elements from text only: values from the sheets are never read as HTML
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null) continue;
      if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k.startsWith('aria')) n.setAttribute('aria-' + k.slice(4).toLowerCase(), v);  // ariaLabel -> aria-label
      else n[k] = v;
    }
    kids.flat(Infinity).forEach(k => k != null && k !== false && n.append(k instanceof Node ? k : String(k)));
    return n;
  }
  function svg(html) { const s = document.createElement('span'); s.innerHTML = html; return s.firstChild; }  // our own constant icons only
  function t(key) { return (page.T[lang] || {})[key] ?? COMMON[lang][key] ?? key; }
  function toast(msg, ms) {
    document.querySelectorAll('.toast').forEach(x => x.remove());
    const n = el('div', {className: 'toast', role: 'status', textContent: msg});
    document.body.append(n);
    setTimeout(() => n.remove(), ms || 2600);
  }
  function fmtDate(v, opts) {
    const d = new Date(v);
    return isNaN(d) ? v : new Intl.DateTimeFormat(LOCALE[lang], opts || {day: 'numeric', month: 'long', year: 'numeric'}).format(d);
  }

  function isDark() { return theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); }
  function applyTheme() {
    if (theme === 'auto') delete root.dataset.theme; else root.dataset.theme = theme;
    const dark = isDark();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#08263c' : '#0b3b5c';
    const b = document.getElementById('themeBtn');
    if (b) {
      b.replaceChildren(svg(ICON[dark ? 'dark' : 'light']));
      b.title = t(dark ? 'themeDark' : 'themeLight');
      b.setAttribute('aria-label', b.title);
    }
  }
  function setTheme(v) { theme = v; store.set('theme', v === 'auto' ? null : v); applyTheme(); }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => theme === 'auto' && applyTheme());  // the device switched

  function paint(root) {  // the texts of the current language into [data-t], [data-tp] and [data-name] under root
    root.querySelectorAll('[data-t]').forEach(n => { n.textContent = t(n.dataset.t); });
    root.querySelectorAll('[data-tp]').forEach(n => { n.placeholder = t(n.dataset.tp); });
    root.querySelectorAll('.langs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    root.querySelectorAll('[data-name]').forEach(n => { n.textContent = NAME[lang]; });
  }
  function setLang(l) {
    lang = l;
    store.set('lang', l);
    root.lang = l;
    root.dir = l === 'ar' ? 'rtl' : 'ltr';
    paint(document);
    document.title = (page.name ? t(page.name) + ' · ' : '') + NAME[l];
    applyTheme();
    if (page.onLang) page.onLang(l);
  }

  function brand(href, sub) {
    return el('a', {className: 'brand', href},
      LOGO ? el('img', {src: LOGO, alt: ''}) : el('span', {className: 'seal', ariaHidden: 'true'}, svg(ICON.seal)),
      el('span', {style: 'min-width:0'}, el('b', {dataset: {name: ''}}), el('small', {dataset: {t: sub}})));
  }
  function langSwitch() {
    return el('div', {className: 'langs', role: 'group', ariaLabel: 'Language'},
      ...LANGS.map(l => el('button', {type: 'button', lang: l, textContent: {ar: 'ع', fr: 'FR', en: 'EN'}[l], dataset: {lang: l},
                                       ariaPressed: String(l === lang), onclick: () => setLang(l)})));
  }
  function themeButton() {  // one button: light <-> dark (the device's own until it is pressed)
    const b = el('button', {type: 'button', className: 'iconbtn', id: 'themeBtn', onclick: () => setTheme(isDark() ? 'light' : 'dark')});
    queueMicrotask(applyTheme);
    return b;
  }
  function header(current) {  // the bar at the top of <header class="top">, then links to the public pages
    const tabs = el('nav', {className: 'tabs', ariaLabel: 'Pages'},
      ...[['index.html', 'nVerify', 'verify'], ['me.html', 'nMe', 'me']].map(([href, key, id]) =>
        el('a', {href, dataset: {t: key}, ariaCurrent: id === current ? 'page' : null})));
    return [el('div', {className: 'bar'}, brand('index.html', 'tagline'), el('div', {className: 'tools'}, langSwitch(), themeButton())), tabs];
  }
  function footer() {
    return el('footer', {}, el('div', {className: 'foot'},
      el('b', {dataset: {name: ''}}),
      el('a', {href: 'index.html', dataset: {t: 'nVerify'}}), el('a', {href: 'me.html', dataset: {t: 'nMe'}}),
      el('a', {href: 'privacy.html', dataset: {t: 'nPrivacy'}}), el('a', {href: 'dashboard.html', dataset: {t: 'nDash'}}),
      el('span', {className: 'ltr', textContent: String(new Date().getFullYear())})));
  }

  function init(opts) {  // opts.shell false: the page draws its own frame (the dashboard), with the pieces below
    page = Object.assign(page, opts);
    const top = document.querySelector('header.top');
    if (opts.shell !== false) {
      if (top) top.prepend(...header(opts.page));
      document.body.append(footer());
    }
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});  // pages open again without a connection
    setLang(lang);
  }

  // A participant's card as a picture (an ID card's shape): the platform's seal as a watermark, the name, a few facts, the QR
  // code the organizers scan. o: {code, name, kind, rows: [[label, value]], foot, scale}. Needs qrcode-generator loaded.
  // Returns a canvas; «شواهدي» and the dashboard draw the same card.
  const CARD_TXT = {ar: {kind: 'بطاقة المشارك', foot: 'أظهر هذا الرمز للمنظمين عند الدخول والخروج: يُسجَّل حضورك مباشرة'},
                    fr: {kind: 'Carte du participant', foot: 'Montrez ce code aux organisateurs à l’entrée et à la sortie : présence enregistrée aussitôt'},
                    en: {kind: 'Participant card', foot: 'Show this code to the organizers on the way in and out: attendance recorded at once'}};
  const SHIELD = 'M12 2l7 3v6c0 5-3.4 8.6-7 10-3.6-1.4-7-5-7-10V5l7-3z', CHECK = 'M8.5 12l2.5 2.5 4.5-5';
  async function cardCanvas(o) {
    const F = '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif', k = o.scale || 1, W = 1700, H = 1070;
    await Promise.all(['400', '600', '700'].map(w => document.fonts.load(w + ' 40px "IBM Plex Sans Arabic"', 'شواهد').catch(() => null)));
    const c = document.createElement('canvas'), x = c.getContext('2d'), rtl = lang === 'ar', ct = CARD_TXT[lang] || CARD_TXT.ar;
    c.width = Math.round(W * k); c.height = Math.round(H * k); x.scale(k, k);
    x.beginPath(); x.roundRect(0, 0, W, H, 56); x.clip();
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#06263c'); g.addColorStop(.55, '#0b3b5c'); g.addColorStop(1, '#14608f');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,.045)'; x.lineWidth = 2;  // fine rings, as on printed papers of value
    for (let r = 80; r < 1700; r += 30) { x.beginPath(); x.arc(rtl ? 260 : W - 260, H + 120, r, 0, 2 * Math.PI); x.stroke(); }
    const seal = (cx, cy, size, alpha, width) => {  // the platform's seal (its 24-unit drawing)
      x.save(); x.translate(cx - size / 2, cy - size / 2); x.scale(size / 24, size / 24);
      x.strokeStyle = 'rgba(226,182,90,' + alpha + ')'; x.lineWidth = width; x.lineCap = x.lineJoin = 'round';
      x.stroke(new Path2D(SHIELD)); x.stroke(new Path2D(CHECK)); x.restore();
    };
    const side = (v, w) => rtl ? W - v - (w || 0) : v;  // a position from the start of the reading side
    seal(side(600), 560, 760, .07, 1.2);  // the watermark, behind the facts
    const pad = 96, qs = 430, qx = rtl ? pad : W - pad - qs, qy = 300;
    // the header: seal, platform, kind of card; a gold rule
    seal(side(pad + 40), 132, 80, 1, 2.2);
    x.textAlign = rtl ? 'right' : 'left'; x.direction = rtl ? 'rtl' : 'ltr'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#ffffff'; x.font = '700 46px ' + F; x.fillText(NAME[lang] || NAME.ar, side(pad + 108), 128);
    x.fillStyle = 'rgba(255,255,255,.72)'; x.font = '400 30px ' + F; x.fillText(o.kind || ct.kind, side(pad + 108), 172);
    const gold = x.createLinearGradient(0, 0, W, 0);
    gold.addColorStop(0, 'rgba(226,182,90,0)'); gold.addColorStop(rtl ? .2 : .8, 'rgba(226,182,90,.95)'); gold.addColorStop(1, 'rgba(226,182,90,0)');
    x.fillStyle = gold; x.fillRect(pad, 222, W - 2 * pad, 4);
    // the code: a white tile, its modules drawn one by one (sharp at any size), its text under it
    x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(qx, qy, qs, qs, 30); x.fill();
    const q = qrcode(0, 'M'); q.addData(o.code); q.make();
    const n = q.getModuleCount(), m = (qs - 56) / n;
    x.fillStyle = '#0b2233';
    for (let r = 0; r < n; r++) for (let cc = 0; cc < n; cc++) if (q.isDark(r, cc)) x.fillRect(qx + 28 + cc * m, qy + 28 + r * m, m + .6, m + .6);
    x.textAlign = 'center'; x.direction = 'ltr'; x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '600 25px ui-monospace, Consolas, monospace';
    x.fillText(o.code, qx + qs / 2, qy + qs + 46);
    // the name (made smaller until it fits), then the facts
    const colW = W - 2 * pad - qs - 70, at = side(pad);
    x.textAlign = rtl ? 'right' : 'left'; x.direction = rtl ? 'rtl' : 'ltr';
    let fs = 76;
    do { x.font = '700 ' + fs + 'px ' + F; fs -= 4; } while (x.measureText(o.name).width > colW && fs > 34);
    x.fillStyle = '#ffffff'; x.fillText(o.name, at, 352);
    let y = 440;
    for (const [label, value] of (o.rows || []).filter(r => r[1]).slice(0, 4)) {
      x.direction = rtl ? 'rtl' : 'ltr'; x.fillStyle = 'rgba(226,182,90,.95)'; x.font = '600 25px ' + F; x.fillText(label, at, y);
      let vs = 36;
      do { x.font = '500 ' + vs + 'px ' + F; vs -= 2; } while (x.measureText(value).width > colW && vs > 20);
      x.direction = /[؀-ۿ]/.test(value) ? 'rtl' : 'ltr';  // an email or a phone keeps its own order
      x.fillStyle = '#ffffff'; x.fillText(value, at, y + 48);
      y += 112;
    }
    // the foot: what the card is for, and where it is checked
    x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(0, H - 118, W, 118);
    x.direction = rtl ? 'rtl' : 'ltr'; x.textAlign = rtl ? 'right' : 'left'; x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '400 26px ' + F;
    let ff = 26;
    while (x.measureText(o.foot || ct.foot).width > W - 2 * pad - 420 && ff > 18) { ff -= 1; x.font = '400 ' + ff + 'px ' + F; }
    x.fillText(o.foot || ct.foot, side(pad), H - 48);
    x.textAlign = rtl ? 'left' : 'right'; x.direction = 'ltr'; x.fillStyle = 'rgba(226,182,90,.95)'; x.font = '600 26px ' + F;
    x.fillText(location.host + location.pathname.replace(/[^/]*$/, ''), rtl ? pad : W - pad, H - 48);
    return c;
  }

  window.UI = {init, setLang, setTheme, paint, t, el, svg, toast, fmtDate, store, brand, langSwitch, themeButton, NAME, LANGS, THEMES, cardCanvas,
               get lang() { return lang; }, get theme() { return theme; }};
})();
