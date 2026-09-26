/* ==========================================================================
   Wainwright’s Handyman & Land Maintenance — site behaviour
   No dependencies. Works from the file system or any static host.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.WAINWRIGHTS_CONFIG || {};
  var BIZ = {
    phone:        CFG.phone        || '(209) 459-1846',
    phoneHref:    CFG.phoneHref    || 'tel:+12094591846',
    email:        CFG.email        || 'Bwain94Work@gmail.com',
    leadEndpoint: CFG.leadEndpoint || '',
    leadApiKey:   CFG.leadApiKey   || ''
  };

  /* ----------------------------------------------------------------------
     Mobile navigation
     ---------------------------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var drawer = document.getElementById('mobile-nav');
    if (!toggle || !drawer) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      drawer.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });

    /* It is a small popout, not a takeover — so it behaves like one: a tap
       anywhere else, or scrolling on, puts it away. */
    document.addEventListener('click', function (e) {
      if (!drawer.classList.contains('is-open')) return;
      if (drawer.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });

    var openedAt = 0;
    toggle.addEventListener('click', function () { openedAt = window.scrollY; });
    window.addEventListener('scroll', function () {
      if (drawer.classList.contains('is-open') && Math.abs(window.scrollY - openedAt) > 60) setOpen(false);
    }, { passive: true });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1240) setOpen(false);
    });
  }

  /* ----------------------------------------------------------------------
     Sticky header shadow
     ---------------------------------------------------------------------- */
  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle('is-stuck', window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ----------------------------------------------------------------------
     Scroll reveal
     ---------------------------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     Photo fallbacks — a missing photo shows a styled placeholder instead
     of a broken image, so the layout never looks unfinished.
     ---------------------------------------------------------------------- */
  var PH_SVG =
    '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
    '<circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';

  function placeholderFor(img) {
    var box = document.createElement('div');
    box.className = 'photo-ph';
    var label = img.getAttribute('data-ph') || 'Photo coming soon';
    var file = img.getAttribute('src') || '';
    file = file.split('/').pop();
    box.innerHTML = PH_SVG +
      '<b>' + label + '</b>' +
      '<span>Drop <code>' + file + '</code> into assets/img/</span>';
    return box;
  }

  function initPhotos() {
    var imgs = document.querySelectorAll('img[data-ph]');
    imgs.forEach(function (img) {
      function fail() {
        if (img.dataset.phDone) return;
        img.dataset.phDone = '1';
        var parent = img.parentNode;
        if (!parent) return;
        img.style.display = 'none';
        parent.appendChild(placeholderFor(img));
        var cap = parent.querySelector('.shot-cap');
        if (cap) cap.style.display = 'none';
      }
      img.addEventListener('error', fail);
      // Already failed before this script ran
      if (img.complete && img.naturalWidth === 0) fail();
    });
  }

  /* ----------------------------------------------------------------------
     Estimate form.

     Two delivery routes, in order of preference:

       1. POST the lead to a form service, when config.leadEndpoint is set.
       2. Fall back to opening the visitor's email app with the details
          filled in — which is also the default when no endpoint is set.

     The fallback is unconditional: if the POST fails for any reason, the
     visitor still ends up sending the message. A lead is never dropped
     because a server was unreachable.
     ---------------------------------------------------------------------- */

  function leadFrom(form) {
    var data = new FormData(form);
    return {
      name:     String(data.get('name') || '').trim(),
      phone:    String(data.get('phone') || '').trim(),
      email:    String(data.get('email') || '').trim(),
      address:  String(data.get('address') || '').trim(),
      bestTime: String(data.get('besttime') || 'Any time'),
      service:  String(data.get('service') || 'Not specified'),
      details:  String(data.get('details') || '').trim(),
      /* Honeypot. Hidden from people, irresistible to bots. */
      company:  String(data.get('company') || '').trim(),
      /* Chosen slot, when the picker was shown. Empty means 'no preference'. */
      requestedDay:  String(data.get('requestedDay') || '').trim(),
      requestedSlot: String(data.get('requestedSlot') || '').trim(),
      /* Would they use junk hauling one day? yes / maybe / no, or blank. */
      wantsHauling: String(data.get('hauling') || '').trim(),
      source:   'website'
    };
  }

  /* A CSV field, RFC 4180: quoted, with inner quotes doubled. MyDiD's own
     parser (src/import/csv.ts) reads exactly this. */
  function csvField(v) {
    return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  }

  /* The machine-readable half of the email.

     MyDiD stores a Customer as { name, phone, email, address, notes } and
     already understands CSV. So the lead email carries a delimited CSV block
     Bryan can either paste into MyDiD or save as a .csv and import — no
     network call, which is the whole point of that app.

     Keep these two lines in step with MyDiD's Customer columns. */
  function mydidBlock(lead) {
    var notes = [];
    if (lead.service)  notes.push(lead.service);
    if (lead.details)  notes.push(lead.details);
    if (lead.bestTime) notes.push('Best time: ' + lead.bestTime);
    notes.push('Website enquiry ' + new Date().toISOString().slice(0, 10));

    return [
      '--- MYDID CUSTOMER ---',
      'name,phone,email,address,notes',
      [lead.name, lead.phone, lead.email, lead.address, notes.join(' | ')].map(csvField).join(','),
      '--- END MYDID CUSTOMER ---'
    ].join('\n');
  }

  function leadEmailHref(lead) {
    var lines = [];
    lines.push('Name:      ' + lead.name);
    lines.push('Phone:     ' + lead.phone);
    lines.push('Email:     ' + lead.email);
    lines.push('Address:   ' + lead.address);
    lines.push('Best time: ' + lead.bestTime);
    if (lead.requestedDay) {
      var S = window.WAINWRIGHTS_SCHEDULE;
      lines.push('Asked for: ' + (S ? S.prettyDate(lead.requestedDay) : lead.requestedDay) +
                 (lead.requestedSlot !== '' && S ? ', ' + S.slotLabel(Number(lead.requestedSlot)) : ''));
    }
    lines.push('');
    lines.push('Service needed: ' + lead.service);
    if (lead.wantsHauling) lines.push('Would use junk hauling: ' + lead.wantsHauling);
    lines.push('');
    lines.push('Details:');
    lines.push(lead.details || '(none given)');
    lines.push('');
    lines.push('--');
    lines.push('Sent from the Wainwright’s website');
    lines.push('');
    lines.push(mydidBlock(lead));

    return 'mailto:' + BIZ.email +
      '?subject=' + encodeURIComponent('Free estimate request - ' + (lead.name || 'Website')) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  function say(form, html) {
    var status = form.querySelector('.form-status');
    if (!status) return;
    status.innerHTML = html;
    status.classList.add('is-visible');
  }

  function sendByEmail(form, lead) {
    say(form,
      '<strong>Opening your email app…</strong><br>' +
      'If nothing opens, no problem — just call or text Bryan on ' +
      '<a href="' + BIZ.phoneHref + '">' + BIZ.phone + '</a>.');
    window.location.href = leadEmailHref(lead);
  }

  /* Optional: hand the lead to a form service (Formspree, Netlify Forms, a
     Google Apps Script, anything that accepts JSON) so it lands somewhere
     without the visitor needing a working email app.

     NOT for MyDiD. MyDiD has no server and never will — see
     LINKING-TO-MYDID.md. The bridge to MyDiD is the CSV block in the email. */
  function postLead(lead) {
    /* Accept: form services such as Formspree only answer with JSON (rather
       than redirecting to a thank-you page) when asked for it. */
    var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (BIZ.leadApiKey) headers['X-Api-Key'] = BIZ.leadApiKey;

    var body = {
      name:     lead.name,
      phone:    lead.phone || null,
      email:    lead.email || null,
      address:  lead.address || null,
      service:  lead.service,
      bestTime: lead.bestTime,
      details:  lead.details,
      company:  lead.company,
      requestedDay:  lead.requestedDay || null,
      requestedSlot: lead.requestedSlot === '' ? null : Number(lead.requestedSlot),
      wantsHauling:  lead.wantsHauling || null,
      source:   lead.source,
      sentAt:   new Date().toISOString(),
      /* Same CSV row as the email carries, so whatever receives this can be
         saved straight to a file MyDiD will import. */
      mydidCsv: mydidBlock(lead)
    };

    return fetch(BIZ.leadEndpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) throw new Error('Lead endpoint returned ' + res.status);
      return res;
    });
  }

  function initForms() {
    var forms = document.querySelectorAll('form[data-estimate]');
    forms.forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        /* fx.js gives friendlier, field-by-field feedback. If it did not load,
           the browser's own validation still does the job. */
        var ok = (window.WFx && window.WFx.validate) ? window.WFx.validate(form)
                                                      : form.reportValidity();
        if (!ok) return;

        var lead = leadFrom(form);
        var submit = form.querySelector('[type="submit"]');

        if (!BIZ.leadEndpoint) {
          sendByEmail(form, lead);
          return;
        }

        if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }
        say(form, 'Sending your request to Bryan…');

        postLead(lead).then(function () {
          if (submit) submit.textContent = 'Sent';
          say(form,
            '<strong>Thank you — that is with Bryan now.</strong><br>' +
            'He will get back to you, usually the same day. If it is urgent, ' +
            'call <a href="' + BIZ.phoneHref + '">' + BIZ.phone + '</a>.');
          form.reset();
        }).catch(function (err) {
          if (window.console && console.warn) console.warn('Lead POST failed, falling back to email:', err);
          if (submit) { submit.disabled = false; submit.textContent = 'Send my request to Bryan'; }
          sendByEmail(form, lead);
        });
      });
    });
  }

  /* ----------------------------------------------------------------------
     Defensible space checklist
     ---------------------------------------------------------------------- */
  var STORE_KEY = 'wainwrights-dst-v1';

  function readStore() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) { return {}; }
  }

  function writeStore(obj) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (err) { /* private mode */ }
  }

  function initChecklist() {
    var root = document.getElementById('dst');
    if (!root) return;

    var boxes = Array.prototype.slice.call(root.querySelectorAll('.dst-item input[type="checkbox"]'));
    if (!boxes.length) return;

    var dial      = root.querySelector('.dial-fill');
    var dialNum   = root.querySelector('.dial-num b');
    var verdict   = root.querySelector('.dst-verdict');
    var verdictSub= root.querySelector('.dst-verdict-sub');
    var breakdown = root.querySelector('.dst-breakdown');
    var mailBtn   = root.querySelector('.dst-mail');
    var resetBtn  = root.querySelector('.dst-reset');
    var printBtn  = root.querySelector('.dst-print');

    var CIRC = 2 * Math.PI * 74;   // r = 74 in the dial markup
    if (dial) {
      dial.setAttribute('stroke-dasharray', CIRC.toFixed(1));
      dial.setAttribute('stroke-dashoffset', CIRC.toFixed(1));
    }

    var saved = readStore();
    boxes.forEach(function (box) {
      if (saved[box.id]) box.checked = true;
      box.addEventListener('change', function () {
        var store = readStore();
        if (box.checked) { store[box.id] = 1; } else { delete store[box.id]; }
        writeStore(store);
        update();
      });
    });

    function zoneStats() {
      var zones = {};
      boxes.forEach(function (box) {
        var z = box.getAttribute('data-zone') || '2';
        if (!zones[z]) zones[z] = { done: 0, total: 0 };
        zones[z].total += 1;
        if (box.checked) zones[z].done += 1;
      });
      return zones;
    }

    function update() {
      var done = boxes.filter(function (b) { return b.checked; }).length;
      var pct = Math.round((done / boxes.length) * 100);

      if (dial) {
        dial.setAttribute('stroke-dashoffset', (CIRC - (CIRC * pct) / 100).toFixed(1));
        dial.style.stroke = pct >= 80 ? 'var(--moss-600)'
                          : pct >= 45 ? 'var(--clay)'
                          : 'var(--fire)';
      }
      if (dialNum) dialNum.textContent = pct + '%';

      if (verdict && verdictSub) {
        if (pct === 100) {
          verdict.textContent = 'Fully covered';
          verdictSub.textContent = 'Every item on the list is done. Re-check each spring and after storms.';
        } else if (pct >= 80) {
          verdict.textContent = 'Nearly there';
          verdictSub.textContent = 'A short list left. Bryan can usually knock these out in a single visit.';
        } else if (pct >= 45) {
          verdict.textContent = 'Partly cleared';
          verdictSub.textContent = 'Good progress, but real gaps remain — especially close to the house.';
        } else if (done > 0) {
          verdict.textContent = 'Needs work';
          verdictSub.textContent = 'Most of the list is still open. Start with Zone 0, the first five feet.';
        } else {
          verdict.textContent = 'Start ticking items';
          verdictSub.textContent = 'Walk your property with this list and tick off what is already done.';
        }
      }

      if (breakdown) {
        var zones = zoneStats();
        var names = {
          '0': 'Zone 0 — 0 to 5 ft',
          '1': 'Zone 1 — 5 to 30 ft',
          '2': 'Zone 2 — 30 to 100 ft'
        };
        breakdown.innerHTML = Object.keys(zones).sort().map(function (z) {
          var s = zones[z];
          var p = Math.round((s.done / s.total) * 100);
          return '<li class="z' + z + '">' +
                   '<b>' + names[z] + '</b>' +
                   '<em>' + s.done + '/' + s.total + '</em>' +
                   '<span class="bar"><i style="width:' + p + '%"></i></span>' +
                 '</li>';
        }).join('');
      }

      if (mailBtn) mailBtn.setAttribute('href', buildMail(pct));
    }

    function buildMail(pct) {
      var lines = [];
      lines.push('Hi Bryan,');
      lines.push('');
      lines.push('I went through the defensible space checklist on your website.');
      lines.push('My property is at ' + pct + '% on the list. The items still outstanding are:');
      lines.push('');

      var current = null;
      boxes.forEach(function (box) {
        if (box.checked) return;
        var zoneName = box.getAttribute('data-zone-name') || '';
        if (zoneName !== current) {
          if (current !== null) lines.push('');
          current = zoneName;
          lines.push(zoneName.toUpperCase());
        }
        var label = box.parentNode.querySelector('.dst-text');
        var text = label ? label.childNodes[0].textContent.trim() : box.id;
        lines.push('  - ' + text);
      });

      if (lines[lines.length - 1] === '') lines.push('  (nothing — the list is complete)');

      lines.push('');
      lines.push('Could you take a look and give me a free estimate?');
      lines.push('');
      lines.push('My name:    ');
      lines.push('My address: ');
      lines.push('Best phone: ');

      return 'mailto:' + BIZ.email +
             '?subject=' + encodeURIComponent('Defensible space estimate - ' + pct + '% complete') +
             '&body=' + encodeURIComponent(lines.join('\n'));
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        boxes.forEach(function (b) { b.checked = false; });
        writeStore({});
        update();
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.print();
      });
    }

    update();
  }

  /* ----------------------------------------------------------------------
     Preview-only notes

     Reminders addressed to Bryan must never appear to a customer. They are
     hidden in the markup and only revealed when the site is being previewed
     locally, so publishing can never leak them.
     ---------------------------------------------------------------------- */
  function initPreviewNotes() {
    var local = location.protocol === 'file:' ||
                /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ||
                location.hostname === '';
    if (!local) return;
    document.querySelectorAll('[data-preview-only]').forEach(function (el) {
      el.hidden = false;
    });
  }

  /* ----------------------------------------------------------------------
     Year stamp
     ---------------------------------------------------------------------- */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---------------------------------------------------------------------- */
  function boot() {
    initNav();
    initHeader();
    initReveal();
    initPhotos();
    initForms();
    initChecklist();
    initPreviewNotes();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
