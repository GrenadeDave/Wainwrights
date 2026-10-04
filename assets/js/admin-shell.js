/* ==========================================================================
   Admin shell (2026-10-04, D41)
   The glass side panel (desktop), icon rail (tablet) and the orange orb menu
   (phones), all built from the one NAV list below so they never disagree.
   Also loads the badge counts and shares the admin_dashboard() result with
   the Overview page through WAdmin.dashboard() — one call per page load.
   Loaded only by pages in /admin/, after portal.js.
   ========================================================================== */
(function (w, d) {
  'use strict';
  var P = w.WPortal;
  if (!P || !d.body.classList.contains('admin')) return;

  var page = d.body.getAttribute('data-admin-page') || '';
  if (page === 'jobs' && new URLSearchParams(w.location.search).get('f') === 'requested') page = 'requests';

  var ICON = {
    overview: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    requests: '<path d="M4 4h16v12H7l-3 3z"/>',
    schedule: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    jobs:     '<path d="M4 7h16v12H4zM9 7V4h6v3"/>',
    reviews:  '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    phones:   '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    admins:   '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
    week:     '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 14h3"/>',
    call:     '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    out:      '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'
  };
  var NAV = [
    { group: 'Work', items: [
      { key: 'overview', href: 'overview.html',          label: 'Overview' },
      { key: 'requests', href: 'index.html?f=requested', label: 'Requests', badge: 'requests' },
      { key: 'schedule', href: 'schedule.html',          label: 'Schedule' },
      { key: 'jobs',     href: 'index.html',             label: 'Jobs' } ] },
    { group: 'Business', items: [
      { key: 'reviews',  href: 'reviews.html',           label: 'Reviews', badge: 'reviews' } ] },
    { group: 'System', items: [
      { key: 'phones',   href: 'mydid.html',             label: 'Activity & phones' },
      { key: 'admins',   href: 'team.html',              label: 'Admins' } ] }
  ];
  var ALL = NAV.reduce(function (a, g) { return a.concat(g.items); }, []);

  function svg(name) { return '<svg class="adm-ico" viewBox="0 0 24 24" aria-hidden="true">' + ICON[name] + '</svg>'; }
  function link(it, cls) {
    return '<a class="' + cls + '" href="' + it.href + '" title="' + it.label + '"' +
      (it.key === page ? ' aria-current="page"' : '') + '>' + svg(it.key) +
      '<span class="adm-label">' + P.esc(it.label) + '</span>' +
      (it.badge ? '<b class="adm-badge" data-badge="' + it.badge + '" hidden></b>' : '') + '</a>';
  }

  /* Side panel / rail */
  var side = d.createElement('nav');
  side.className = 'adm-side';
  side.setAttribute('aria-label', 'Admin');
  side.innerHTML =
    '<a class="adm-brand" href="overview.html"><img src="../assets/img/logo-badge-dark-256.png" width="36" height="36" alt="">' +
      '<span><b>Wainwright’s</b><small>Admin</small></span></a>' +
    NAV.map(function (g) {
      return '<div class="adm-group">' + g.group + '</div>' +
             g.items.map(function (it) { return link(it, 'adm-link'); }).join('');
    }).join('') +
    '<div class="adm-me"><span class="adm-me-name" id="adm-me"></span>' +
      '<button type="button" class="adm-link" data-signout title="Sign out">' + svg('out') +
      '<span class="adm-label">Sign out</span></button></div>';
  d.body.insertBefore(side, d.body.firstChild);

  /* Phone orb + sheet */
  var orb = d.createElement('button');
  orb.type = 'button';
  orb.className = 'adm-orb';
  orb.id = 'adm-orb';
  orb.setAttribute('aria-expanded', 'false');
  orb.setAttribute('aria-controls', 'adm-sheet');
  orb.setAttribute('aria-label', 'Menu');
  orb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
                  '<b class="adm-badge" data-badge="total" hidden></b>';
  var dim = d.createElement('div');
  dim.className = 'adm-dim';
  dim.hidden = true;
  var sheet = d.createElement('div');
  sheet.className = 'adm-sheet';
  sheet.id = 'adm-sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', 'Admin menu');
  sheet.innerHTML =
    '<div class="adm-quick">' +
      '<a href="schedule.html">' + svg('week') + 'This week</a>' +
      '<a id="adm-call" href="#" hidden>' + svg('call') + 'Call back</a>' +
    '</div>' +
    '<div class="adm-grid">' +
      ALL.filter(function (it) { return it.key !== 'admins'; }).map(function (it) {
        return link({ key: it.key, href: it.href, label: it.key === 'phones' ? 'Phones' : it.label, badge: it.badge }, 'adm-tile');
      }).join('') +
    '</div>' +
    '<div class="adm-sheet-foot">' +
      '<a class="adm-plain" href="team.html">Admins</a>' +
      '<button type="button" class="adm-plain" data-signout>Sign out</button>' +
      '<button type="button" class="adm-plain" id="adm-close">✕ Close</button>' +
    '</div>';
  d.body.appendChild(dim);
  d.body.appendChild(sheet);
  d.body.appendChild(orb);

  function reduced() { return w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function focusables() {
    return Array.prototype.slice.call(sheet.querySelectorAll('a[href]:not([hidden]), button:not([hidden])'));
  }
  var lastFocus = null, pushed = false;

  function openSheet() {
    if (!sheet.hidden) return;
    lastFocus = d.activeElement;
    dim.hidden = false;
    sheet.hidden = false;
    sheet.getBoundingClientRect();              // start the morph from the closed shape
    sheet.classList.add('is-open');
    orb.setAttribute('aria-expanded', 'true');
    d.documentElement.classList.add('adm-open');
    try { w.history.pushState({ admSheet: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    var f = focusables()[0];
    if (f) f.focus();
  }
  function closeSheet(fromBack) {
    if (sheet.hidden) return;
    sheet.classList.remove('is-open');
    orb.setAttribute('aria-expanded', 'false');
    d.documentElement.classList.remove('adm-open');
    var done = function () { sheet.hidden = true; dim.hidden = true; };
    if (reduced()) done(); else setTimeout(done, 280);
    if (pushed && !fromBack) { pushed = false; w.history.back(); } else { pushed = false; }
    (lastFocus && lastFocus.focus && lastFocus !== d.body ? lastFocus : orb).focus();
  }

  orb.addEventListener('click', function () { if (sheet.hidden) openSheet(); else closeSheet(false); });
  dim.addEventListener('click', function () { closeSheet(false); });
  sheet.querySelector('#adm-close').addEventListener('click', function () { closeSheet(false); });
  w.addEventListener('popstate', function () { if (!sheet.hidden) closeSheet(true); });
  d.addEventListener('keydown', function (e) {
    if (sheet.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(false); return; }
    if (e.key !== 'Tab') return;
    var f = focusables(); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!sheet.contains(d.activeElement)) { e.preventDefault(); first.focus(); }
  });

  /* Hide the orb while the on-screen keyboard is likely up */
  d.addEventListener('focusin', function (e) {
    if (e.target.matches && e.target.matches('input, textarea, select') && !sheet.contains(e.target)) d.body.classList.add('adm-typing');
  });
  d.addEventListener('focusout', function () { d.body.classList.remove('adm-typing'); });

  /* Sign out (panel and sheet) */
  Array.prototype.forEach.call(d.querySelectorAll('[data-signout]'), function (b) {
    b.addEventListener('click', async function () {
      await P.signOut();
      w.location.replace('../portal/login.html');
    });
  });

  /* Who is signed in */
  if (P.profile) P.profile().then(function (p) {
    var el = d.getElementById('adm-me');
    if (el && p) el.textContent = p.name || p.email || '';
  });

  /* One admin_dashboard() call per page load, shared with the Overview */
  var cached = null;
  function dashboard(fresh) {
    if (!cached || fresh) {
      var c = P.client();
      /* Promise.resolve: a supabase-js query re-runs every time it is awaited,
         so it is turned into one real promise that can be shared. */
      cached = c ? Promise.resolve(c.rpc('admin_dashboard')) : Promise.resolve({ data: null, error: { message: 'Not connected' } });
    }
    return cached;
  }
  function setBadge(key, n) {
    Array.prototype.forEach.call(d.querySelectorAll('[data-badge="' + key + '"]'), function (el) {
      el.textContent = n > 0 ? String(n) : '';
      el.hidden = !(n > 0);
      if (n > 0) el.setAttribute('aria-label', n + ' waiting');
    });
  }
  function paintBadges(data) {
    var b = (data && data.badges) || {};
    setBadge('requests', b.requests || 0);
    setBadge('reviews', b.reviews || 0);
    setBadge('total', (b.requests || 0) + (b.reviews || 0));
    var o = data && data.requests && data.requests.oldest;
    var call = d.getElementById('adm-call');
    if (o && o.phone) {
      call.href = 'tel:' + String(o.phone).replace(/[^\d+]/g, '');
      call.setAttribute('aria-label', 'Call back ' + (o.name || 'the oldest request'));
      call.hidden = false;
    } else {
      call.hidden = true;
    }
  }
  dashboard().then(function (r) { if (r && !r.error) paintBadges(r.data); });

  w.WAdmin = { dashboard: dashboard, paintBadges: paintBadges, close: closeSheet };
})(window, document);
