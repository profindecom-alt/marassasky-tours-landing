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
  var recapEl = $('#recap');
  var formcard = $('#devis');

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

    if (isLast) buildRecap();
    setStatus('');

    if (opts.focus !== false) {
      var firstControl = $('input:not([type=hidden]), select, textarea', steps[current]);
      // On ne vole pas le focus au premier affichage, uniquement lors d'une navigation
      if (firstControl && opts.userInitiated) {
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

    $$('[required]', scope).forEach(function (el) {
      if (el.type === 'checkbox') {
        if (!el.checked && !firstInvalid) firstInvalid = el;
        return;
      }

      if (!String(el.value).trim()) {
        el.classList.add('is-invalid');
        if (!firstInvalid) firstInvalid = el;
      }
    });

    // Téléphone : au moins 9 chiffres
    var phone = scope.querySelector('input[name="telephone"]');
    if (phone && phone.value.trim() && phone.value.replace(/\D/g, '').length < 9) {
      phone.classList.add('is-invalid');
      if (!firstInvalid) firstInvalid = phone;
    }

    // E-mail : format simple, seulement s'il est rempli
    var mail = scope.querySelector('input[name="email"]');
    if (mail && mail.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) {
      mail.classList.add('is-invalid');
      if (!firstInvalid) firstInvalid = mail;
    }

    if (firstInvalid) {
      setStatus('Merci de compléter les champs surlignés.');
      try { firstInvalid.focus({ preventScroll: false }); } catch (e) { firstInvalid.focus(); }
      return false;
    }
    setStatus('');
    return true;
  }

  /* ---------- Récapitulatif ---------- */
  function buildRecap() {
    if (!recapEl) return;
    var data = new FormData(form);
    var parts = [];
    ['service', 'personnes', 'vehicule'].forEach(function (key) {
      var v = data.get(key);
      if (v) parts.push(String(v));
    });
    // Le trajet est saisi librement : on le raccourcit pour la pastille de récap
    var trajet = (data.get('trajet') || '').trim();
    if (trajet) {
      parts.unshift(trajet.length > 64 ? trajet.slice(0, 64).trim() + '…' : trajet);
    }

    recapEl.innerHTML = parts.map(function (p) {
      return '<span>' + p.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
    }).join('');
  }

  /* ---------- Navigation ---------- */
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (!validateStep(current)) return;
      // L'étape 1 ne contient que les coordonnées : on les sécurise tout de suite.
      if (current === 0) sendPartialLead();
      track('form_step', { step: current + 1, step_name: ['contact', 'trajet', 'passagers'][current] });
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
    return ['nom', 'telephone', 'email'].map(function (key) {
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
