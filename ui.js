// Shared by the public pages: language (ar/fr/en, saved), theme (device/light/dark, saved), the header bar and the footer.
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
  let lang = pick(params.get('lang'), LANGS) || pick(store.get('lang'), LANGS) || pick((navigator.language || '').slice(0, 2), LANGS) || 'ar';
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
    kids.flat().forEach(k => k != null && k !== false && n.append(k instanceof Node ? k : String(k)));
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

  function applyTheme() {
    if (theme === 'auto') delete root.dataset.theme; else root.dataset.theme = theme;
    const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#08263c' : '#0b3b5c';
    const b = document.getElementById('themeBtn');
    if (b) {
      b.replaceChildren(svg(ICON[theme]));
      b.title = t('theme' + theme[0].toUpperCase() + theme.slice(1));
      b.setAttribute('aria-label', b.title);
    }
  }
  function setTheme(v) { theme = v; store.set('theme', v === 'auto' ? null : v); applyTheme(); }

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
  function themeButton() {  // one button going round: device, light, dark
    const b = el('button', {type: 'button', className: 'iconbtn', id: 'themeBtn',
                            onclick: () => setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length])});
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
    setLang(lang);
  }

  window.UI = {init, setLang, setTheme, paint, t, el, svg, toast, fmtDate, store, brand, langSwitch, themeButton, NAME, LANGS, THEMES,
               get lang() { return lang; }, get theme() { return theme; }};
})();
