/* ==========================================================================
   Wainwrights — portal engine
   Shared by the customer portal (portal/) and Bryan's admin (admin/).

   The customer pages never talk to the database directly. They call P.api,
   which has two implementations behind one interface:

     live  — Supabase. Reads go through row-level security; every write goes
             through a narrow database function (see schema.sql, section 13).
     demo  — sample data held in this browser only (portal-demo.js). Nothing
             leaves the device. Reached with ?demo=1.

   Depends on: supabase-config.js, rates.js, schedule.js, and the supabase-js
   bundle (live mode only).
   ========================================================================== */
(function (w) {
  'use strict';

  var CFG   = w.WAINWRIGHTS_SUPABASE || {};
  var RATES = w.WAINWRIGHTS_RATES || {};
  var P = {};

  /* ----------------------------------------------------------------------
     Status vocabulary — plain English, because the customer reads this.
     ---------------------------------------------------------------------- */
  P.STATUS = {
    requested:   { label: 'Request received', tone: 'wait',
                   blurb: 'Bryan has your request and will be in touch to arrange a look.' },
    quoted:      { label: 'Quoted',           tone: 'act',
                   blurb: 'Bryan has been out and given you a price. Nothing happens until you say go ahead.' },
    scheduled:   { label: 'Scheduled',        tone: 'good',
                   blurb: 'Booked in. The date is below.' },
    in_progress: { label: 'In progress',      tone: 'good',
                   blurb: 'Work has started.' },
    completed:   { label: 'Completed',        tone: 'done',
                   blurb: 'All finished. Thanks for the work.' },
    cancelled:   { label: 'Cancelled',        tone: 'off',
                   blurb: 'This one is not going ahead.' }
  };
  P.ORDER = ['requested', 'quoted', 'scheduled', 'in_progress', 'completed'];

  P.SERVICES = [
    'Handyman repairs', 'Interior or exterior painting', 'Defensible space / fire clearing',
    'Yard waste removal', 'Junk and debris hauling', 'Ongoing property watch and upkeep',
    'Several of these', 'Not sure yet'
  ];

  /* ----------------------------------------------------------------------
     A sign-in that came back broken
     ----------------------------------------------------------------------
     Google hands the customer back to us with an error in the address bar —
     most often "OAuth state not found or expired", which means the sign-in
     finished in a different browser than it started in (tapping the link
     inside another app's browser does it). Left alone they land on the
     sign-in page with no idea why, which reads as "the page failed". Catch
     it, keep the reason, and let the sign-in page explain. */
  (function () {
    var raw = (w.location.hash || '').replace(/^#/, '') + '&' + (w.location.search || '').replace(/^\?/, '');
    if (raw.indexOf('error') === -1) return;
    var q = new URLSearchParams(raw);
    var code = q.get('error_code') || '';
    var desc = (q.get('error_description') || q.get('error') || '').replace(/\+/g, ' ');
    if (!desc) return;

    var msg;
    if (/state not found|expired/i.test(desc)) {
      msg = '<strong>That sign-in did not finish.</strong><br>It usually means the Google window opened in a ' +
            'different browser than the one you started in. Try <b>Continue with Google</b> again here, or use ' +
            'your email and password below.';
    } else if (/access_denied|cancel/i.test(desc + code)) {
      msg = '<strong>Sign-in was cancelled.</strong><br>Nothing has changed. Try again whenever you like.';
    } else {
      msg = '<strong>That sign-in did not go through.</strong><br>' + P.esc(desc) +
            '<br>Try again, or call Bryan on <a href="tel:+12094561846">(209) 456-1846</a>.';
    }
    try { w.sessionStorage.setItem('w-auth-error', msg); } catch (e) {}
    /* Take the error out of the address bar so a refresh does not repeat it. */
    if (w.history && w.history.replaceState) {
      w.history.replaceState(null, '', w.location.pathname + w.location.search.replace(/[?&]error[^&]*/g, ''));
    }
  })();

  /* ----------------------------------------------------------------------
     Mode
     ---------------------------------------------------------------------- */
  /* Accepts ?demo=1 or #demo. The hash form matters: some static servers
     redirect index.html to a clean URL and drop the query string on the way,
     but a hash always survives. */
  var wantsDemo  = /[?&]demo=1\b/.test(w.location.search) || w.location.hash === '#demo';
  var leavesDemo = /[?&]demo=0\b/.test(w.location.search) || w.location.hash === '#nodemo';
  try {
    if (wantsDemo)  w.sessionStorage.setItem('w-demo', '1');
    if (leavesDemo) w.sessionStorage.removeItem('w-demo');
    P.demo = w.sessionStorage.getItem('w-demo') === '1';
  } catch (e) { P.demo = wantsDemo && !leavesDemo; }

  P.configured = function () { return !!(CFG.url && CFG.anonKey); };
  P.ready      = function () { return P.demo || P.configured(); };

  var _client = null;
  P.client = function () {
    if (!P.configured()) return null;
    if (_client) return _client;
    if (!w.supabase || !w.supabase.createClient) return null;
    _client = w.supabase.createClient(CFG.url, CFG.anonKey);
    return _client;
  };

  P.notConfiguredHtml = function () {
    return '' +
      '<div class="portal-empty">' +
        '<h2>The portal is not connected yet</h2>' +
        '<p>This page needs a Supabase project before it can show real jobs. ' +
        'The rest of the website works normally in the meantime.</p>' +
        '<p class="portal-empty-note">Setup takes about 45 minutes — see ' +
        '<code>SETUP-PORTAL.md</code> in the website folder.</p>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<a class="btn btn-primary" href="index.html?demo=1#demo">See it working with sample data</a>' +
          '<a class="btn btn-outline" href="../index.html">Back to the website</a>' +
        '</div>' +
      '</div>';
  };

  /* ----------------------------------------------------------------------
     Formatting
     ---------------------------------------------------------------------- */
  P.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  P.money = function (cents) {
    return RATES.money ? RATES.money(cents) : (cents == null ? '—' : '$' + (cents / 100).toFixed(2));
  };
  P.date = function (value) {
    if (!value) return null;
    var d = new Date(String(value).length <= 10 ? value + 'T00:00:00' : value);
    if (isNaN(d)) return null;
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };
  P.dateTime = function (value) {
    if (!value) return null;
    var d = new Date(value);
    if (isNaN(d)) return null;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
           ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  /* "3 days ago" reads better on a timeline than a full stamp. */
  P.ago = function (value) {
    var d = new Date(value), s = (Date.now() - d.getTime()) / 1000;
    if (isNaN(s)) return '';
    if (s < 90) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' minutes ago';
    if (s < 86400) { var h = Math.round(s / 3600); return h + (h === 1 ? ' hour ago' : ' hours ago'); }
    if (s < 86400 * 7) { var dd = Math.round(s / 86400); return dd + (dd === 1 ? ' day ago' : ' days ago'); }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  P.total = function (job) {
    if (job.quote_cents == null) return null;
    return job.quote_cents + (job.surcharge_cents || 0);
  };
  /* Slot 1 for 2 slots -> "11:00am – 5:00pm": what a person needs to know. */
  P.window = function (job) {
    var S = w.WAINWRIGHTS_SCHEDULE;
    if (!S || job.slot_start == null) return null;
    var n = job.slots_needed || 1;
    var a = S.slots[job.slot_start], b = S.slots[Math.min(S.slots.length - 1, job.slot_start + n - 1)];
    if (!a || !b) return null;
    return a.time.split('–')[0].trim() + ' – ' + b.time.split('–')[1].trim();
  };
  P.statusPill = function (status) {
    var s = P.STATUS[status] || { label: status, tone: 'wait' };
    return '<span class="pill pill--' + s.tone + '">' + P.esc(s.label) + '</span>';
  };
  P.track = function (status) {
    if (status === 'cancelled') return '<p class="track-cancelled">This job was cancelled.</p>';
    var at = P.ORDER.indexOf(status);
    return '<ol class="track">' + P.ORDER.map(function (key, i) {
      var cls = i < at ? 'is-done' : (i === at ? 'is-now' : '');
      return '<li class="' + cls + '"><span class="track-dot"></span>' +
             '<span class="track-label">' + P.esc(P.STATUS[key].label) + '</span></li>';
    }).join('') + '</ol>';
  };
  /* Does this job need the customer to do something? */
  P.needsYou = function (job) {
    return job.status === 'quoted' && job.quote_cents != null && !job.quote_accepted_at;
  };

  /* ----------------------------------------------------------------------
     Small UI pieces
     ---------------------------------------------------------------------- */
  var toastEl, toastTimer;
  P.toast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'fx-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-up');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-up'); }, 3200);
  };
  /* Carry a message across a page change ("Request sent" after a redirect). */
  P.flashNext = function (msg) { try { w.sessionStorage.setItem('w-flash', msg); } catch (e) {} };
  function showFlash() {
    try {
      var m = w.sessionStorage.getItem('w-flash');
      if (m) { w.sessionStorage.removeItem('w-flash'); setTimeout(function () { P.toast(m); }, 350); }
    } catch (e) {}
  }

  /* A proper confirmation step for anything that commits the customer.
     Resolves true/false. Uses <dialog>, so focus and Escape are handled by
     the browser rather than by hand. */
  P.confirm = function (opts) {
    return new Promise(function (resolve) {
      var d = document.createElement('dialog');
      d.className = 'p-dialog';
      d.innerHTML =
        '<h2>' + P.esc(opts.title) + '</h2>' +
        '<div class="p-dialog-body">' + (opts.html || '<p>' + P.esc(opts.body || '') + '</p>') + '</div>' +
        '<div class="btn-row">' +
          '<button class="btn ' + (opts.danger ? 'btn-dark' : 'btn-primary') + '" value="ok">' + P.esc(opts.ok || 'Yes') + '</button>' +
          '<button class="btn btn-outline" value="no">' + P.esc(opts.cancel || 'Not yet') + '</button>' +
        '</div>';
      document.body.appendChild(d);
      /* Remember anything typed in the dialog, so callers can read it. */
      d.addEventListener('close', function () {
        var box = d.querySelector('textarea, input[type="text"]');
        P._lastDialogText = box ? box.value.trim() : '';
      });
      if (typeof opts.before === 'function') setTimeout(function () { opts.before(d); }, 30);
      d.addEventListener('click', function (e) {
        if (e.target === d) { d.close('no'); return; }               // backdrop
        var b = e.target.closest('button[value]');
        if (b) d.close(b.value);
      });
      d.addEventListener('close', function () { var v = d.returnValue === 'ok'; d.remove(); resolve(v); });
      if (d.showModal) d.showModal(); else { d.remove(); resolve(w.confirm(opts.title)); }
    });
  };

  /* Put a button into its working state; returns a function that restores it. */
  P.busy = function (btn, label) {
    var old = btn.innerHTML;
    btn.disabled = true; btn.classList.add('is-loading');
    if (label) btn.textContent = label;
    return function () { btn.disabled = false; btn.classList.remove('is-loading'); btn.innerHTML = old; };
  };

  P.skeleton = function (n) {
    var out = '';
    for (var i = 0; i < (n || 3); i++) out += '<div class="skel"></div>';
    return '<div class="skel-list" aria-busy="true" aria-label="Loading">' + out + '</div>';
  };

  /* Calendar file for a booked visit, so it lands in the customer's diary. */
  P.icsHref = function (job) {
    var S = w.WAINWRIGHTS_SCHEDULE;
    if (!S || !job.scheduled_for || job.slot_start == null) return null;
    var startH = [8, 11, 14][job.slot_start], endH = startH + 3 * (job.slots_needed || 1);
    var d = job.scheduled_for.replace(/-/g, '');
    function t(h) { return d + 'T' + String(h).padStart(2, '0') + '0000'; }
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wainwrights//Portal//EN', 'BEGIN:VEVENT',
      'UID:' + job.id + '@wainwrights', 'DTSTAMP:' + t(startH),
      'DTSTART:' + t(startH), 'DTEND:' + t(endH),
      'SUMMARY:Bryan Wainwright — ' + job.service,
      'LOCATION:' + String(job.address || '').replace(/[,;\\]/g, ' '),
      'DESCRIPTION:Wainwrights Handyman & Land Management. Questions: (209) 456-1846',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  };

  /* Reusable "when would suit you?" picker.
     opts: { needed, selected:{day,slot}, onPick(day, slot) } */
  P.slotPicker = async function (container, opts) {
    var S = w.WAINWRIGHTS_SCHEDULE;
    if (!S) { container.innerHTML = ''; return; }
    container.innerHTML = '<p class="form-note" style="text-align:left">Checking Bryan’s diary…</p>';

    var from = new Date(); from.setDate(from.getDate() + S.leadTimeDays);
    var to = new Date(from); to.setDate(to.getDate() + S.horizonDays);
    var av = await P.api.availability(S.ymd(from), S.ymd(to));
    if (av.error) {
      container.innerHTML = '<p class="slot-none">The diary could not be loaded just now. ' +
        'Send the request anyway and Bryan will call you to arrange a time.</p>';
      return;
    }

    var chosen = opts.selected && opts.selected.day ? { day: opts.selected.day, slot: opts.selected.slot } : null;
    var showAll = false;

    function draw() {
      var needed = typeof opts.needed === 'function' ? opts.needed() : (opts.needed || 1);
      var days = S.availability(av.data.booked, av.data.blackouts, needed, new Date());
      if (!days.length) {
        container.innerHTML = '<p class="slot-none">Nothing free in the next few weeks. ' +
          'Bryan will call you with the first opening.</p>';
        return;
      }
      var shown = showAll ? days : days.slice(0, 5);
      container.innerHTML = '<div class="slot-picker">' + shown.map(function (d) {
        return '<div class="slot-day"><div class="slot-date">' + P.esc(S.prettyDate(d.day)) + '</div>' +
          '<div class="slot-times">' + d.starts.map(function (s) {
            var on = chosen && chosen.day === d.day && chosen.slot === s;
            var end = s + needed - 1;
            var time = S.slots[s].time.split('–')[0].trim() + ' – ' + S.slots[end].time.split('–')[1].trim();
            return '<button type="button" class="slot-btn' + (on ? ' is-on' : '') + '" data-day="' + d.day +
                   '" data-slot="' + s + '" aria-pressed="' + (on ? 'true' : 'false') + '"><b>' +
                   P.esc(S.slots[s].label) + '</b><span>' + P.esc(time) + '</span></button>';
          }).join('') + '</div></div>';
      }).join('') +
      (days.length > 5 && !showAll ? '<button type="button" class="slot-more" data-more>Show more dates (' + (days.length - 5) + ')</button>' : '') +
      '</div>';

      container.querySelectorAll('.slot-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          chosen = { day: b.dataset.day, slot: +b.dataset.slot };
          draw();
          if (opts.onPick) opts.onPick(chosen.day, chosen.slot);
        });
      });
      var more = container.querySelector('[data-more]');
      if (more) more.addEventListener('click', function () { showAll = true; draw(); });
    }
    draw();
    return { redraw: function () { chosen = null; draw(); } };
  };

  /* ----------------------------------------------------------------------
     Page chrome: tabs under the header, plus the demo banner.
     ---------------------------------------------------------------------- */
  function signOutNow(e) {
    if (e) e.preventDefault();
    P.api.signOut().then(function () {
      w.location.replace(P.demo ? 'login.html?demo=0#nodemo' : 'login.html');
    });
  }

  /* "Delete my account" — a request, not an instant wipe: completed work has
     to stay in Bryan's books for tax. He sees the request on his job board. */
  P.askDeletion = async function () {
    var yes = await P.confirm({
      title: 'Ask Bryan to delete your account?',
      html: '<p>This tells Bryan you want your details removed. He will take out everything he is allowed to; ' +
            'records of finished work have to stay in his books for tax, with nothing extra kept.</p>' +
            '<p>You can add anything he should know:</p>' +
            '<textarea id="del-why" maxlength="1000" rows="3" placeholder="Optional"></textarea>',
      ok: 'Send the request', cancel: 'Not now', danger: true,
      before: function (dialog) { var f = dialog.querySelector('#del-why'); if (f) f.focus(); }
    });
    if (!yes) return;
    var note = P._lastDialogText || '';
    var r = await P.api.requestDeletion(note);
    P.toast(r && r.error ? r.error.message : 'Sent. Bryan will be in touch about your account.');
  };

  P.mount = function (active) {
    showFlash();
    var header = document.querySelector('.portal-header');
    if (!header) return;

    if (P.demo && !document.querySelector('.demo-banner')) {
      var b = document.createElement('div');
      b.className = 'demo-banner';
      b.innerHTML = '<b>Demo</b> — sample data, stored only in this browser. Nothing here is real or sent anywhere. ' +
                    '<a href="../admin/index.html">See Bryan’s side</a>' +
                    '<a href="login.html?demo=0#nodemo">Leave the demo</a>';
      header.parentNode.insertBefore(b, header);
    }

    if (!document.querySelector('.ptabs')) {
      var tabs = [['jobs', 'index.html', 'My jobs'], ['new', 'new.html', 'New request'], ['me', 'profile.html', 'My details']];
      var nav = document.createElement('nav');
      nav.className = 'ptabs';
      nav.setAttribute('aria-label', 'Portal');
      nav.innerHTML = '<div class="wrap ptabs-inner">' + tabs.map(function (t) {
        return '<a href="' + t[1] + '"' + (t[0] === active ? ' aria-current="page"' : '') + '>' + t[2] + '</a>';
      }).join('') + '</div>';
      header.parentNode.insertBefore(nav, header.nextSibling);
    }

    /* The account menu. California gives people the right to see, correct and
       delete what a business holds about them, so those three live together
       here, one tap from every page, next to a way to reach a human. */
    if (!document.querySelector('.acct')) {
      var wrapEl = header.querySelector('.header-inner') || header;
      var acct = document.createElement('div');
      acct.className = 'acct';
      acct.innerHTML =
        '<button class="acct-btn" type="button" aria-expanded="false" aria-controls="acct-menu" aria-label="Account menu">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>' +
        '</button>' +
        '<div class="acct-menu" id="acct-menu" hidden>' +
          '<a href="profile.html"><b>My details</b><small>Change your name, phone or address</small></a>' +
          '<a href="mydata.html"><b>My information</b><small>Everything Bryan holds about you</small></a>' +
          '<a href="../resources.html"><b>Local rules</b><small>Pine Mountain Lake, in plain English</small></a>' +
          '<a href="tel:+12094561846"><b>Call Bryan</b><small>(209) 456-1846 · Mon–Fri 8–5</small></a>' +
          '<a href="mailto:Bwain94Work@gmail.com"><b>Email Bryan</b><small>Bwain94Work@gmail.com</small></a>' +
          '<button type="button" id="acct-delete"><b>Delete my account</b><small>Ask Bryan to remove your details</small></button>' +
          '<button type="button" id="acct-signout"><b>Sign out</b><small>On this device</small></button>' +
        '</div>';
      var who = wrapEl.querySelector('.who');
      if (who) who.parentNode.insertBefore(acct, who.nextSibling); else wrapEl.appendChild(acct);

      var btn = acct.querySelector('.acct-btn'), menu = acct.querySelector('.acct-menu');
      var open = function (want) {
        menu.hidden = !want;
        btn.setAttribute('aria-expanded', String(want));
      };
      btn.addEventListener('click', function () { open(menu.hidden); });
      document.addEventListener('click', function (e) { if (!acct.contains(e.target)) open(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { open(false); btn.focus(); } });
      acct.querySelector('#acct-signout').addEventListener('click', signOutNow);
      acct.querySelector('#acct-delete').addEventListener('click', function () { open(false); P.askDeletion(); });
    }

    var out = document.getElementById('signout');
    if (out) out.addEventListener('click', signOutNow);
  };

  /* Send visitors without a session to the login page. */
  P.requireSession = async function (loginUrl) {
    var s = await P.api.session();
    if (!s) {
      var back = encodeURIComponent(w.location.pathname.split('/').pop() || '');
      w.location.replace((loginUrl || 'login.html') + (back ? '?next=' + back : ''));
      return null;
    }
    return s;
  };

  /* ----------------------------------------------------------------------
     LIVE implementation
     ---------------------------------------------------------------------- */
  function fail(message) { return { data: null, error: { message: message } }; }

  /* Customer actions go through the portal-action edge function when it is
     deployed, because it also tells Bryan. If it is not reachable the same
     database function is called directly: the action still happens, securely,
     just without the text message. */
  async function act(action, rpcName, rpcArgs) {
    var c = P.client();
    var s = (await c.auth.getSession()).data.session;
    if (!s) return fail('Please sign in again.');
    try {
      var res = await fetch(CFG.url + '/functions/v1/portal-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.access_token, 'apikey': CFG.anonKey },
        body: JSON.stringify({ action: action, args: rpcArgs })
      });
      if (res.ok) return { data: (await res.json()).data, error: null };
      if (res.status >= 400 && res.status < 500 && res.status !== 404) {
        var j = await res.json().catch(function () { return {}; });
        return fail(j.error || 'That could not be done.');
      }
    } catch (e) { /* function not deployed or offline — fall through */ }
    var r = await c.rpc(rpcName, rpcArgs);
    return r.error ? fail(r.error.message) : { data: r.data, error: null };
  }

  var live = {
    session: async function () {
      var c = P.client(); if (!c) return null;
      var r = await c.auth.getSession();
      return r.data ? r.data.session : null;
    },
    signOut: async function () { var c = P.client(); if (c) await c.auth.signOut(); },
    profile: async function () {
      var s = await live.session(); if (!s) return fail('Not signed in');
      return P.client().from('profiles').select('*').eq('id', s.user.id).maybeSingle();
    },
    saveProfile: async function (p) {
      var s = await live.session(); if (!s) return fail('Not signed in');
      /* Only these three columns are writable at all — see schema.sql 12c. */
      return P.client().from('profiles')
        .update({ name: p.name, phone: p.phone, address: p.address }).eq('id', s.user.id);
    },
    jobs:   function () { return P.client().from('my_jobs').select('*').order('created_at', { ascending: false }); },
    job:    function (id) { return P.client().from('my_jobs').select('*').eq('id', id).maybeSingle(); },
    events: function (id) { return P.client().from('job_events').select('*').eq('job_id', id).order('created_at', { ascending: false }); },
    accept: function (id) { return act('accept', 'customer_accept_quote', { p_job: id }); },
    note:   function (id, text) { return act('note', 'customer_add_note', { p_job: id, p_text: text }); },
    reslot: function (id, day, slot) { return act('reslot', 'customer_request_slot', { p_job: id, p_day: day, p_slot: slot }); },
    cancel: function (id) { return act('cancel', 'customer_cancel', { p_job: id }); },
    requestDeletion: function (note) { return act('delete_request', 'customer_request_deletion', { p_note: note || '' }); },
    request: function (r) {
      return act('request', 'customer_new_request', {
        p_service: r.service, p_details: r.details, p_address: r.address,
        p_day: r.day || null, p_slot: r.slot == null ? null : r.slot
      });
    },
    availability: async function (from, to) {
      var c = P.client(), args = { from_day: from, to_day: to };
      var r = await Promise.all([c.rpc('booked_slots', args), c.rpc('blackout_days', args)]);
      if (r[0].error || r[1].error) return fail('unavailable');
      return { data: { booked: r[0].data || [], blackouts: (r[1].data || []).map(function (b) { return b.day; }) }, error: null };
    }
  };

  /* portal-demo.js installs itself as P.api when demo mode is on. */
  P.api = live;
  P._fail = fail;

  /* Kept for the admin pages, which still use these names. */
  P.session = function () { return P.api.session(); };
  P.signOut = function () { return P.api.signOut(); };
  P.profile = async function () { var r = await P.api.profile(); return r && r.data ? r.data : null; };

  w.WPortal = P;
})(window);
