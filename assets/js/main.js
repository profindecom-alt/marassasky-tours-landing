/* ============================================================
   Marassa Sky Tours : landing page Google Ads
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = {
    // Webhook n8n qui reçoit les demandes de devis
    webhook: 'https://n8n.srv1019025.hstgr.cloud/webhook/9ee70198-c719-4860-a10f-fdc7dc7e587e',
    // Numéro affiché si le webhook reste injoignable après une nouvelle tentative
    phone: '+212610205353',
    phoneDisplay: '+212 610 205 353',
    // Page affichée après un envoi réussi (porte la conversion Google Ads)
    thanksUrl: 'merci.html',
    // Étiquette de conversion Google Ads : 'AW-XXXXXXXXX/AbCdEfGhIjKlMnOp'
    // Laisser vide si la conversion est déclarée sur merci.html (recommandé).
    adsConversionLabel: ''
  };

  var doc = document;
  var root = doc.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
    (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, params || {}));
  }

  /* ---------- Année du copyright ---------- */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- En-tête : ombre au défilement ---------- */
  var header = $('#header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Révélation des sections au défilement ---------- */
  var revealEls = $$('.reveal');
  if (revealEls.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var revealObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var siblings = $$('.reveal', entry.target.parentNode);
          var i = siblings.indexOf(entry.target);
          entry.target.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
          entry.target.classList.add('is-in');
          revealObs.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
      revealEls.forEach(function (el) { revealObs.observe(el); });
    }
  }

  /* ---------- Navigation : section active ---------- */
  var navLinks = $$('.header__nav a');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var sections = navLinks
      .map(function (a) { return $(a.getAttribute('href')); })
      .filter(Boolean);

    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { navObs.observe(s); });
  }

  /* ---------- Suivi des clics ---------- */
  $$('[data-track]').forEach(function (el) {
    el.addEventListener('click', function () {
      var name = el.getAttribute('data-track');
      var isCall = name.indexOf('call') === 0;
      track(isCall ? 'call_click' : 'cta_click', {
        element: name,
        page_location: window.location.href
      });
    });
  });

  /* ---------- Compteurs animés ---------- */
  function runCounters(scope) {
    $$('.counter', scope).forEach(function (el) {
      var target = parseInt(el.getAttribute('data-to'), 10) || 0;
      if (reduceMotion) { el.textContent = target; return; }
      var duration = 1500;
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  var statsEl = $('#stats');
  if (statsEl) {
    if ('IntersectionObserver' in window) {
      var statsObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCounters(entry.target);
          statsObs.unobserve(entry.target);
        });
      }, { threshold: 0.4 });
      statsObs.observe(statsEl);
    } else {
      runCounters(statsEl);
    }
  }

  /* ---------- FAQ : une seule réponse ouverte ---------- */
  var faqItems = $$('.faq details');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      faqItems.forEach(function (other) { if (other !== item) other.open = false; });
    });
  });

  /* ---------- Attribution : UTM, GCLID, referrer ---------- */
  var ATTR_KEYS = [
    'gclid', 'gbraid', 'wbraid', 'msclkid', 'fbclid',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'
  ];

  var attribution = (function () {
    var params = new URLSearchParams(window.location.search);
    var stored = {};
    try { stored = JSON.parse(sessionStorage.getItem('msk_attr') || '{}'); } catch (e) { stored = {}; }
    ATTR_KEYS.forEach(function (key) {
      var value = params.get(key);
      if (value) stored[key] = value;
    });
    try { sessionStorage.setItem('msk_attr', JSON.stringify(stored)); } catch (e) { /* mode privé */ }
    return stored;
  })();

  /* ---------- Identifiant de lead ---------- */
  // Le webhook reçoit d'abord les coordonnées seules, puis la demande complète.
  // Les deux envois portent le même `lead_id` : n8n doit mettre à jour la fiche
  // existante plutôt que d'en créer une seconde.
  var leadId = (function () {
    try {
      if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    } catch (e) { /* contexte non sécurisé */ }
    return 'msk-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  })();

  /* ============================================================
     VÉRIFICATION DU TÉLÉPHONE (INTERNATIONAL)
     ============================================================
     Les demandes ne viennent pas que du Maroc : France, Espagne, Belgique et
     Suisse reviennent souvent. Or « 06 12 34 56 78 » est un numéro valide au
     Maroc comme en France, et rien dans la saisie ne permet de trancher. Le
     visiteur choisit donc son indicatif, et le numéro est vérifié selon les
     règles du pays retenu, puis normalisé en E.164 avant l'envoi à n8n.

     Chaque entrée : indicatif, nom, longueur nationale min/max, « 0 » initial à
     retirer (1 = oui), motif du numéro national (null = contrôle de longueur
     seul), exemple affiché en aide de saisie.
     ============================================================ */
  var PHONE_COUNTRIES = [
    ['MA', '212', 'Maroc',                9,  9, 1, /^[5-7]\d{8}$/,            '6 12 34 56 78'],
    ['FR', '33',  'France',               9,  9, 1, /^[1-9]\d{8}$/,            '6 12 34 56 78'],
    ['ES', '34',  'Espagne',              9,  9, 0, /^[6-9]\d{8}$/,            '612 34 56 78'],
    ['BE', '32',  'Belgique',             8,  9, 1, /^[1-9]\d{7,8}$/,          '470 12 34 56'],
    ['CH', '41',  'Suisse',               9,  9, 1, /^[1-9]\d{8}$/,            '78 123 45 67'],
    ['DE', '49',  'Allemagne',            6, 11, 1, /^[1-9]\d{5,10}$/,         '151 23456789'],
    ['IT', '39',  'Italie',               6, 11, 0, /^(3\d{8,9}|0\d{5,10})$/,  '312 345 6789'],
    ['NL', '31',  'Pays-Bas',             9,  9, 1, /^[1-9]\d{8}$/,            '6 12345678'],
    ['GB', '44',  'Royaume-Uni',          9, 10, 1, /^[1-9]\d{8,9}$/,          '7400 123456'],
    ['US', '1',   'USA / Canada',        10, 10, 0, /^[2-9]\d{2}[2-9]\d{6}$/,  '201 555 0123'],
    ['PT', '351', 'Portugal',             9,  9, 0, /^[2369]\d{8}$/,           '912 345 678'],

    ['ZA', '27',  'Afrique du Sud',       9,  9, 1, /^[1-9]\d{8}$/,            '71 123 4567'],
    ['DZ', '213', 'Algérie',              9,  9, 1, /^[1-9]\d{8}$/,            '551 23 45 67'],
    ['AO', '244', 'Angola',               9,  9, 0, null,                      '923 123 456'],
    ['SA', '966', 'Arabie saoudite',      9,  9, 1, /^[1-9]\d{8}$/,            '51 234 5678'],
    ['AR', '54',  'Argentine',           10, 11, 0, null,                      '11 2345 6789'],
    ['AU', '61',  'Australie',            9,  9, 1, /^[1-9]\d{8}$/,            '412 345 678'],
    ['AT', '43',  'Autriche',             7, 13, 1, null,                      '664 123456'],
    ['BH', '973', 'Bahreïn',              8,  8, 0, /^[13679]\d{7}$/,          '3600 1234'],
    ['BJ', '229', 'Bénin',                8, 10, 0, null,                      '01 12 34 56 78'],
    ['BR', '55',  'Brésil',              10, 11, 0, null,                      '11 96123 4567'],
    ['BF', '226', 'Burkina Faso',         8,  8, 0, null,                      '70 12 34 56'],
    ['CM', '237', 'Cameroun',             9,  9, 0, /^[26]\d{8}$/,             '6 71 23 45 67'],
    ['CN', '86',  'Chine',                9, 11, 0, null,                      '131 2345 6789'],
    ['CY', '357', 'Chypre',               8,  8, 0, /^[2-9]\d{7}$/,            '96 123456'],
    ['CD', '243', 'Congo (RDC)',          9,  9, 1, null,                      '991 234 567'],
    ['KR', '82',  'Corée du Sud',         8, 10, 1, null,                      '10 1234 5678'],
    ['CI', '225', 'Côte d’Ivoire',        10, 10, 0, null,                '07 12 34 56 78'],
    ['DK', '45',  'Danemark',             8,  8, 0, /^[2-9]\d{7}$/,            '32 12 34 56'],
    ['EG', '20',  'Égypte',               9, 10, 1, null,                      '100 123 4567'],
    ['AE', '971', 'Émirats arabes unis',  9,  9, 1, /^[2-9]\d{8}$/,            '50 123 4567'],
    ['FI', '358', 'Finlande',             6, 10, 1, null,                      '41 2345678'],
    ['GA', '241', 'Gabon',                7,  8, 0, null,                      '06 03 12 34'],
    ['GH', '233', 'Ghana',                9,  9, 1, null,                      '24 123 4567'],
    ['GR', '30',  'Grèce',               10, 10, 0, /^[2-7]\d{9}$/,            '691 234 5678'],
    ['GN', '224', 'Guinée',               9,  9, 0, null,                      '622 12 34 56'],
    ['HU', '36',  'Hongrie',              8,  9, 1, null,                      '20 123 4567'],
    ['IN', '91',  'Inde',                10, 10, 0, /^[6-9]\d{9}$/,            '81234 56789'],
    ['ID', '62',  'Indonésie',            8, 12, 1, null,                      '812 345 678'],
    ['IQ', '964', 'Irak',                10, 10, 1, null,                      '791 234 5678'],
    ['IE', '353', 'Irlande',              7,  9, 1, null,                      '85 012 3456'],
    ['IL', '972', 'Israël',               8,  9, 1, null,                      '50 123 4567'],
    ['JP', '81',  'Japon',                9, 10, 1, null,                      '90 1234 5678'],
    ['JO', '962', 'Jordanie',             8,  9, 1, null,                      '79 012 3456'],
    ['KE', '254', 'Kenya',                9,  9, 1, null,                      '712 123456'],
    ['KW', '965', 'Koweït',               8,  8, 0, /^[12569]\d{7}$/,          '500 12345'],
    ['LB', '961', 'Liban',                7,  8, 1, null,                      '71 123 456'],
    ['LY', '218', 'Libye',                9,  9, 1, null,                      '91 234 5678'],
    ['LU', '352', 'Luxembourg',           6,  9, 0, null,                      '628 123 456'],
    ['MG', '261', 'Madagascar',           9,  9, 1, null,                      '32 12 345 67'],
    ['MY', '60',  'Malaisie',             8,  9, 1, null,                      '13 345 6789'],
    ['ML', '223', 'Mali',                 8,  8, 0, null,                      '65 01 23 45'],
    ['MT', '356', 'Malte',                8,  8, 0, null,                      '9696 1234'],
    ['MU', '230', 'Maurice',              7,  8, 0, null,                      '5251 2345'],
    ['MR', '222', 'Mauritanie',           8,  8, 0, null,                      '22 12 34 56'],
    ['MX', '52',  'Mexique',             10, 10, 0, /^[1-9]\d{9}$/,            '55 1234 5678'],
    ['NE', '227', 'Niger',                8,  8, 0, null,                      '93 12 34 56'],
    ['NG', '234', 'Nigeria',              7, 10, 1, null,                      '802 123 4567'],
    ['NO', '47',  'Norvège',              8,  8, 0, /^[2-9]\d{7}$/,            '406 12 345'],
    ['NZ', '64',  'Nouvelle-Zélande',     8, 10, 1, null,                      '21 123 4567'],
    ['OM', '968', 'Oman',                 8,  8, 0, null,                      '9212 3456'],
    ['UG', '256', 'Ouganda',              9,  9, 1, null,                      '712 345678'],
    ['PK', '92',  'Pakistan',            10, 10, 1, null,                      '301 2345678'],
    ['PH', '63',  'Philippines',          8, 10, 1, null,                      '905 123 4567'],
    ['PL', '48',  'Pologne',              9,  9, 0, /^[1-9]\d{8}$/,            '512 345 678'],
    ['QA', '974', 'Qatar',                8,  8, 0, /^[3-7]\d{7}$/,            '3312 3456'],
    ['CZ', '420', 'République tchèque',   9,  9, 0, /^[1-9]\d{8}$/,            '601 123 456'],
    ['RO', '40',  'Roumanie',             9,  9, 1, /^[1-9]\d{8}$/,            '712 345 678'],
    ['RU', '7',   'Russie',              10, 10, 1, /^[3-9]\d{9}$/,            '912 345 67 89'],
    ['SN', '221', 'Sénégal',              9,  9, 0, null,                      '70 123 45 67'],
    ['RS', '381', 'Serbie',               8,  9, 1, null,                      '60 1234567'],
    ['SG', '65',  'Singapour',            8,  8, 0, /^[3689]\d{7}$/,           '8123 4567'],
    ['SK', '421', 'Slovaquie',            9,  9, 1, null,                      '912 123 456'],
    ['SE', '46',  'Suède',                7,  9, 1, null,                      '70 123 45 67'],
    ['TZ', '255', 'Tanzanie',             9,  9, 1, null,                      '621 234 567'],
    ['TD', '235', 'Tchad',                8,  8, 0, null,                      '63 01 23 45'],
    ['TH', '66',  'Thaïlande',            8,  9, 1, null,                      '81 234 5678'],
    ['TG', '228', 'Togo',                 8,  8, 0, null,                      '90 11 23 45'],
    ['TN', '216', 'Tunisie',              8,  8, 0, /^[2-59]\d{7}$/,           '20 123 456'],
    ['TR', '90',  'Turquie',             10, 10, 1, /^[1-9]\d{9}$/,            '501 234 56 78'],
    ['UA', '380', 'Ukraine',              9,  9, 1, /^[3-9]\d{8}$/,            '50 123 4567'],
    ['VN', '84',  'Vietnam',              9, 10, 1, null,                      '91 234 56 78']
  ];

  // Indicatifs mis en tête de liste : ce sont ceux des campagnes en cours.
  var PHONE_TOP = ['MA', 'FR', 'ES', 'BE', 'CH', 'DE', 'IT', 'NL', 'GB', 'US', 'PT'];

  var PHONE_BY_ISO = {};
  var PHONE_BY_LENGTH = PHONE_COUNTRIES.slice().sort(function (a, b) {
    return b[1].length - a[1].length; // +212 doit être testé avant +21
  });
  PHONE_COUNTRIES.forEach(function (row) { PHONE_BY_ISO[row[0]] = row; });

  function phoneCountry(iso) { return PHONE_BY_ISO[iso] || PHONE_BY_ISO.MA; }

  // Chiffres arabes et persans : un visiteur sur clavier arabe saisit ٠٦١٢…
  function toLatinDigits(value) {
    return String(value || '').replace(/[٠-٩۰-۹]/g, function (ch) {
      var code = ch.charCodeAt(0);
      return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
    });
  }

  // Numéros de démonstration : 00000000, 123456789… Ils coûtent un clic payant
  // pour un lead injoignable, autant les refuser à la saisie.
  // Le motif reste volontairement étroit : « 23456789 » est un vrai numéro fixe
  // belge, seules les suites tapées depuis le début du clavier sont refusées.
  function looksFake(national) {
    if (/^(\d)\1+$/.test(national)) return true;
    if (national.length < 7) return false;
    return /^0?123456/.test(national) || /^9876543/.test(national);
  }

  /* Renvoie { ok, e164, iso, national, error }. */
  function checkPhone(raw, iso) {
    var text = toLatinDigits(raw).trim();
    if (!text) return { ok: false, error: 'Indiquez votre numéro de téléphone.' };

    // « 00 » comme « + » annoncent un indicatif pays. Le test porte sur les
    // chiffres seuls : « 00 212 … » et « 00212… » doivent être lus pareil.
    var digits = text.replace(/\D/g, '');
    var international = /^[+＋]/.test(text) || /^00/.test(digits);
    digits = digits.replace(/^00/, '');
    if (!digits) return { ok: false, error: 'Ce numéro ne contient aucun chiffre.' };

    var country = phoneCountry(iso);
    var national = digits;

    if (international) {
      // L'indicatif saisi prime sur la liste déroulante : un visiteur qui colle
      // « +33 6 … » a raison, même si le menu est resté sur le Maroc.
      var found = null;
      for (var i = 0; i < PHONE_BY_LENGTH.length; i++) {
        if (digits.indexOf(PHONE_BY_LENGTH[i][1]) === 0) { found = PHONE_BY_LENGTH[i]; break; }
      }
      if (!found) {
        // Pays absent de la liste : contrôle E.164 générique (8 à 15 chiffres).
        // Aucun indicatif ne commence par 0 : c'est une saisie en l'air.
        if (digits.charAt(0) === '0') {
          return { ok: false, error: 'Indicatif pays inconnu : vérifiez le début du numéro.' };
        }
        if (digits.length < 8 || digits.length > 15) {
          return { ok: false, error: 'Numéro international invalide : 8 à 15 chiffres attendus.' };
        }
        if (looksFake(digits)) return { ok: false, error: 'Ce numéro ne semble pas réel.' };
        return { ok: true, e164: '+' + digits, iso: '', national: digits, country: null };
      }
      country = found;
      national = digits.slice(found[1].length);
    }

    // Préfixe interurbain : « 06 … » devient « 6 … » là où le 0 ne se compose
    // pas depuis l'étranger. En Italie ou en Espagne, ce 0 fait partie du numéro.
    if (country[5] && national.charAt(0) === '0') national = national.replace(/^0+/, '');

    if (!national) return { ok: false, error: 'Numéro incomplet.' };

    var name = country[2];
    var min = country[3];
    var max = country[4];

    if (national.length < min || national.length > max) {
      var attendu = min === max
        ? min + ' chiffres'
        : 'entre ' + min + ' et ' + max + ' chiffres';
      return {
        ok: false,
        iso: country[0],
        error: 'Un numéro ' + name + ' compte ' + attendu +
               ' après l’indicatif (vous en avez saisi ' + national.length + ').'
      };
    }

    if (country[6] && !country[6].test(national)) {
      return {
        ok: false,
        iso: country[0],
        error: 'Ce numéro ne correspond pas à un numéro ' + name + ' valide.'
      };
    }

    if (looksFake(national)) {
      return { ok: false, iso: country[0], error: 'Ce numéro ne semble pas réel.' };
    }

    return {
      ok: true,
      e164: '+' + country[1] + national,
      iso: country[0],
      national: national,
      country: country
    };
  }

  // Lecture confortable du numéro reconnu : +212 6 12 34 56 78
  function formatPhone(result) {
    if (!result.ok) return '';
    if (!result.country) return result.e164; // pays hors liste : E.164 brut
    var rest = result.national;
    var dial = '+' + result.country[1] + ' ';

    // 10 chiffres : découpage nord-américain, le plus courant à cette longueur.
    if (rest.length === 10) return dial + rest.slice(0, 3) + ' ' + rest.slice(3, 6) + ' ' + rest.slice(6);

    var head = rest.length % 2 ? rest.slice(0, 1) : '';
    var groups = rest.slice(head.length).match(/\d{2}/g) || [];
    return (dial + head + ' ' + groups.join(' ')).replace(/\s+/g, ' ').trim();
  }

  /* ============================================================
     VÉRIFICATION DE L'E-MAIL
     ============================================================ */
  var EMAIL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

  // Fautes de frappe les plus fréquentes sur les domaines grand public.
  var EMAIL_TYPOS = {
    'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com',
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmaill.com': 'gmail.com',
    'gnail.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.fr': 'gmail.com',
    'hotmail.co': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmial.com': 'hotmail.com',
    'hotmal.com': 'hotmail.com', 'hotmil.com': 'hotmail.com',
    'outlook.co': 'outlook.com', 'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com',
    'yahoo.co': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com',
    'yahoo.fe': 'yahoo.fr', 'orange.f': 'orange.fr', 'wanadoo.f': 'wanadoo.fr',
    'laposte.ne': 'laposte.net', 'free.f': 'free.fr', 'icloud.co': 'icloud.com'
  };

  function checkEmail(raw) {
    var value = String(raw || '').trim();
    if (!value) return { ok: false, error: 'Indiquez votre adresse e-mail.' };
    if (value.indexOf('..') !== -1 || !EMAIL_RE.test(value)) {
      return { ok: false, error: 'Cette adresse e-mail n’est pas valide.' };
    }
    var domain = value.split('@').pop().toLowerCase();
    return { ok: true, email: value, suggestion: EMAIL_TYPOS[domain] ? value.replace(/@.*$/, '@' + EMAIL_TYPOS[domain]) : '' };
  }

  /* ============================================================
     FORMULAIRE MULTI-ÉTAPES
     ============================================================ */
  var form = $('#quoteForm');
  if (!form) return;

  var steps = $$('.step', form);
  var stepMarkers = $$('.progress__list li');
  var progressFill = $('#progressFill');
  var prevBtn = $('#prevBtn');
  var nextBtn = $('#nextBtn');
  var submitBtn = $('#submitBtn');
  var statusEl = $('#formStatus');
  var successEl = $('#formSuccess');
  var formcard = $('#devis');

  /* ---------- Champ téléphone : liste des indicatifs et aides de saisie ---------- */
  var telCode = form.elements.telephone_pays;
  var telInput = form.elements.telephone;
  var telHint = $('#telHint');
  var mailInput = form.elements.email;
  var mailHint = $('#mailHint');

  function fillCountries() {
    if (!telCode) return;
    var top = [];
    var rest = [];
    PHONE_COUNTRIES.forEach(function (row) {
      (PHONE_TOP.indexOf(row[0]) !== -1 ? top : rest).push(row);
    });
    top.sort(function (a, b) { return PHONE_TOP.indexOf(a[0]) - PHONE_TOP.indexOf(b[0]); });
    rest.sort(function (a, b) { return a[2].localeCompare(b[2], 'fr'); });

    function group(label, rows) {
      var optgroup = doc.createElement('optgroup');
      optgroup.label = label;
      rows.forEach(function (row) {
        var option = doc.createElement('option');
        // L'indicatif en premier : si la liste est trop étroite pour le nom du
        // pays, c'est le nom qui est rogné, jamais le numéro.
        option.value = row[0];
        option.textContent = '+' + row[1] + ' ' + row[2];
        optgroup.appendChild(option);
      });
      return optgroup;
    }

    telCode.innerHTML = '';
    telCode.appendChild(group('Fréquents', top));
    telCode.appendChild(group('Tous les pays', rest));
    telCode.value = 'MA';
  }

  function setHint(el, message, isError) {
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('field__hint--err', !!isError);
    el.hidden = !message;
  }


  function syncPlaceholder() {
    if (!telInput || !telCode) return;
    var country = phoneCountry(telCode.value);
    telInput.placeholder = country[7] || '';
  }

  function telState() {
    return checkPhone(telInput ? telInput.value : '', telCode ? telCode.value : 'MA');
  }

  // Au départ du champ : l'indicatif collé dans le numéro est déplacé dans la
  // liste, et le numéro reconnu est affiché pour que le visiteur le relise.
  function reviewPhone() {
    if (!telInput) return;
    if (!telInput.value.trim()) { setHint(telHint, ''); return; }

    var result = telState();
    if (!result.ok) {
      setHint(telHint, result.error, true);
      return;
    }
    if (result.iso && telCode && telCode.value !== result.iso) telCode.value = result.iso;
    if (result.country) telInput.value = result.national;
    syncPlaceholder();
    telInput.classList.remove('is-invalid');
    setHint(telHint, 'Numéro enregistré : ' + (formatPhone(result) || result.e164), false);
  }

  function reviewEmail() {
    if (!mailInput || !mailInput.value.trim()) { setHint(mailHint, ''); return; }
    var result = checkEmail(mailInput.value);
    if (!result.ok) {
      setHint(mailHint, result.error, true);
      return;
    }
    mailInput.classList.remove('is-invalid');
    if (!result.suggestion) { setHint(mailHint, ''); return; }

    // Suggestion non bloquante : une faute de frappe sur le domaine rend le lead
    // injoignable par e-mail, mais le visiteur reste seul juge de son adresse.
    setHint(mailHint, '');
    mailHint.hidden = false;
    mailHint.classList.remove('field__hint--err');
    mailHint.textContent = 'Vouliez-vous dire ';
    var fix = doc.createElement('button');
    fix.type = 'button';
    fix.textContent = result.suggestion;
    fix.addEventListener('click', function () {
      mailInput.value = result.suggestion;
      mailInput.classList.remove('is-invalid');
      setHint(mailHint, '');
    });
    mailHint.appendChild(fix);
    mailHint.appendChild(doc.createTextNode(' ?'));
  }

  fillCountries();
  syncPlaceholder();

  if (telCode) {
    telCode.addEventListener('change', function () {
      syncPlaceholder();
      if (telInput && telInput.value.trim()) reviewPhone();
    });
  }
  if (telInput) {
    telInput.addEventListener('blur', reviewPhone);
    telInput.addEventListener('input', function () { setHint(telHint, ''); });
  }
  if (mailInput) {
    mailInput.addEventListener('blur', reviewEmail);
    mailInput.addEventListener('input', function () { setHint(mailHint, ''); });
  }

  var current = 0;
  var maxReached = 0;

  function setStatus(html) {
    if (!statusEl) return;
    statusEl.innerHTML = html || '';
  }

  function clearInvalid(scope) {
    $$('.is-invalid', scope || form).forEach(function (el) { el.classList.remove('is-invalid'); });
  }

  /* ---------- Affichage d'une étape ---------- */
  function showStep(index, opts) {
    opts = opts || {};
    current = Math.max(0, Math.min(index, steps.length - 1));
    maxReached = Math.max(maxReached, current);

    steps.forEach(function (step, i) {
      step.hidden = i !== current;
      step.classList.toggle('is-active', i === current);
    });

    stepMarkers.forEach(function (marker, i) {
      marker.classList.toggle('is-active', i === current);
      marker.classList.toggle('is-done', i < current);
    });

    if (progressFill) {
      progressFill.style.width = ((current + 1) / steps.length) * 100 + '%';
    }

    var isLast = current === steps.length - 1;
    if (prevBtn) prevBtn.hidden = current === 0;
    if (nextBtn) nextBtn.hidden = isLast;
    if (submitBtn) submitBtn.hidden = !isLast;

    setStatus('');

    if (opts.focus !== false) {
      var firstControl = $('input:not([type=hidden]), select, textarea', steps[current]);
      // Jamais de focus automatique sur un <select> : le focus programmé suffit
      // à déployer la liste, soit par le picker natif sur mobile, soit par le
      // keyup de la touche Entrée qui vient de servir à changer d'étape. Ouvrir
      // la liste doit rester une décision du visiteur.
      var isSelect = firstControl && firstControl.tagName === 'SELECT';
      // On ne vole pas le focus au premier affichage, uniquement lors d'une navigation
      if (firstControl && !isSelect && opts.userInitiated) {
        try { firstControl.focus({ preventScroll: true }); } catch (e) { firstControl.focus(); }
      }
    }

    if (opts.userInitiated && formcard) {
      var top = formcard.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.5) {
        formcard.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }

  /* ---------- Validation de l'étape courante ---------- */
  function validateStep(index) {
    var scope = steps[index];
    clearInvalid(scope);
    var firstInvalid = null;
    var hasEmpty = false;
    var message = '';

    $$('[required]', scope).forEach(function (el) {
      if (el.type === 'checkbox') {
        if (!el.checked && !firstInvalid) firstInvalid = el;
        return;
      }

      if (!String(el.value).trim()) {
        el.classList.add('is-invalid');
        hasEmpty = true;
        if (!firstInvalid) firstInvalid = el;
      }
    });

    // Téléphone : contrôle complet selon l'indicatif choisi
    var phone = scope.querySelector('input[name="telephone"]');
    if (phone && phone.value.trim()) {
      var tel = checkPhone(phone.value, telCode ? telCode.value : 'MA');
      if (!tel.ok) {
        phone.classList.add('is-invalid');
        if (!firstInvalid) firstInvalid = phone;
        if (!message) message = tel.error;
        setHint(telHint, tel.error, true);
      }
    }

    // E-mail : désormais obligatoire, le vide est déjà traité plus haut
    var mail = scope.querySelector('input[name="email"]');
    if (mail && mail.value.trim()) {
      var email = checkEmail(mail.value);
      if (!email.ok) {
        mail.classList.add('is-invalid');
        if (!firstInvalid) firstInvalid = mail;
        if (!message) message = email.error;
        setHint(mailHint, email.error, true);
      }
    }

    if (firstInvalid) {
      // Un champ rempli mais refusé affiche déjà le détail juste sous lui : la
      // ligne sous le bouton ne le répète pas, elle ne sert qu'aux champs vides.
      setStatus(hasEmpty || !message ? 'Merci de compléter les champs surlignés.' : '');
      // Même raison que dans showStep : un <select> fautif est amené dans
      // l'écran sans recevoir le focus, sinon sa liste se déploie toute seule.
      if (firstInvalid.tagName === 'SELECT') {
        firstInvalid.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      } else {
        try { firstInvalid.focus({ preventScroll: false }); } catch (e) { firstInvalid.focus(); }
      }
      return false;
    }
    setStatus('');
    return true;
  }

  /* ---------- Navigation ---------- */
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (!validateStep(current)) return;
      // L'étape 1 ne contient que les coordonnées : on les sécurise tout de suite.
      if (current === 0) sendPartialLead();
      track('form_step', { step: current + 1, step_name: ['contact', 'demande'][current] });
      showStep(current + 1, { userInitiated: true });
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      showStep(current - 1, { userInitiated: true });
    });
  }

  // Retour possible en cliquant sur une étape déjà franchie
  stepMarkers.forEach(function (marker, i) {
    marker.addEventListener('click', function () {
      if (i <= maxReached && i !== current) showStep(i, { userInitiated: true });
    });
  });

  // Entrée = étape suivante (sauf dans le textarea)
  form.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' || event.target.tagName === 'TEXTAREA') return;
    if (current < steps.length - 1) {
      event.preventDefault();
      if (nextBtn) nextBtn.click();
    }
  });

  // Nettoyage du surlignage d'erreur dès que le visiteur corrige
  form.addEventListener('input', function (event) {
    event.target.classList.remove('is-invalid');
  });

  form.addEventListener('change', function (event) {
    event.target.classList.remove('is-invalid');
  });

  /* ---------- Envoi ---------- */
  function buildPayload(extra) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      data[key] = typeof value === 'string' ? value.trim() : value;
    });
    delete data.website; // honeypot

    // Téléphone normalisé en E.164 : la forme utilisable telle quelle pour
    // appeler, ouvrir un WhatsApp ou dédoublonner les fiches dans n8n. La saisie
    // d'origine est conservée au cas où la normalisation se tromperait de pays.
    var tel = checkPhone(data.telephone || '', data.telephone_pays || 'MA');
    data.telephone_saisi = data.telephone || '';
    if (tel.ok) {
      data.telephone = tel.e164;
      data.telephone_pays = tel.iso || data.telephone_pays || '';
    }

    return Object.assign({}, data, attribution, {
      lead_id: leadId,
      lead_status: 'complet',
      source: 'landing-google-ads',
      page_url: window.location.href,
      page_title: doc.title,
      referrer: doc.referrer || '',
      langue: 'fr',
      user_agent: navigator.userAgent,
      submitted_at: new Date().toISOString()
    }, extra || {});
  }

  // Le formulaire est désormais le seul chemin de conversion : une coupure réseau
  // ponctuelle ne doit pas coûter un lead, donc on retente une fois avant d'échouer.
  function sendLead(payload, attempt, opts) {
    opts = opts || {};
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 12000);

    return fetch(CONFIG.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // keepalive : la requête survit à la fermeture de l'onglet, indispensable
      // pour la capture partielle que le visiteur peut interrompre à tout moment.
      keepalive: opts.keepalive === true,
      signal: controller.signal
    })
      .then(function (response) {
        clearTimeout(timer);
        if (response.ok) return response;
        var err = new Error('HTTP ' + response.status);
        err.status = response.status;
        throw err;
      })
      .catch(function (error) {
        clearTimeout(timer);
        // On ne retente pas une erreur 4xx : le serveur a bien reçu et refusé.
        var retryable = !error.status || error.status >= 500;
        if (attempt < 2 && retryable) return sendLead(payload, attempt + 1, opts);
        throw error;
      });
  }

  /* ---------- Capture des coordonnées dès l'étape 1 ---------- */
  // Beaucoup de visiteurs abandonnent avant la dernière étape. Dès que le nom et
  // le téléphone sont validés, ils partent au webhook : le lead reste exploitable
  // même si la demande n'est jamais terminée.
  var partialSignature = '';

  function contactSignature() {
    var data = new FormData(form);
    return ['nom', 'telephone', 'telephone_pays', 'email'].map(function (key) {
      return String(data.get(key) || '').trim();
    }).join('|');
  }

  function sendPartialLead() {
    if (form.elements.website && form.elements.website.value) return; // robot
    // Un retour en arrière sans modification ne doit pas renvoyer le même lead.
    var signature = contactSignature();
    if (signature === partialSignature) return;
    partialSignature = signature;

    // Envoi silencieux : aucune erreur affichée, la navigation continue.
    sendLead(buildPayload({ lead_status: 'partiel' }), 1, { keepalive: true })
      .then(function () {
        track('lead_partial', { lead_id: leadId });
      })
      .catch(function (error) {
        partialSignature = ''; // nouvelle tentative au prochain passage sur l'étape
        track('lead_partial_error', { message: String((error && error.message) || error) });
      });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    // Honeypot rempli → robot
    if (form.elements.website && form.elements.website.value) return;
    if (!validateStep(current)) return;

    var payload = buildPayload();

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;
    setStatus('');

    sendLead(payload, 1)
      .then(function () {
        track('generate_lead', {
          currency: 'MAD',
          value: 1,
          service: payload.service,
          personnes: payload.personnes
        });
        if (CONFIG.adsConversionLabel && typeof window.gtag === 'function') {
          window.gtag('event', 'conversion', { send_to: CONFIG.adsConversionLabel });
        }

        form.reset();

        // La page de remerciement porte la conversion Google Ads.
        window.location.assign(CONFIG.thanksUrl);

        // Filet de sécurité : si la navigation est bloquée (file://, extension,
        // navigateur restreint), on affiche la confirmation sur place.
        setTimeout(function () {
          form.hidden = true;
          successEl.hidden = false;
          successEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        }, 1200);
      })
      .catch(function (error) {
        // Le formulaire n'est pas vidé : le visiteur peut renvoyer sans tout ressaisir.
        setStatus(
          'L’envoi a échoué. Réessayez dans un instant, ou appelez-nous au ' +
          '<a href="tel:' + CONFIG.phone + '">' + CONFIG.phoneDisplay + '</a>.'
        );
        track('lead_error', { message: String((error && error.message) || error) });
      })
      .finally(function () {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
      });
  });

  /* ---------- Initialisation ---------- */
  showStep(0, { focus: false });
})();
