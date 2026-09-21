/* ==========================================================================
   Wainwrights — customer portal screens

   Four screens: dashboard, one job, new request, my details. Each HTML page
   is a thin shell that calls one function here. All data goes through P.api,
   so every screen works identically against the real database and the demo.

   Anything a person typed (theirs or Bryan's) is escaped with P.esc before it
   touches innerHTML. No exceptions.
   ========================================================================== */
(function (w) {
  'use strict';
  var P = w.WPortal, S = w.WAINWRIGHTS_SCHEDULE;
  var esc = P.esc;
  var root = function () { return document.getElementById('root'); };

  var ICON = {
    cal:   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    arrow: '<svg class="btn-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    phone: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>'
  };

  function problem(title, msg) {
    root().innerHTML = '<div class="portal-empty"><h2>' + esc(title) + '</h2><p>' + esc(msg) + '</p>' +
      '<div class="btn-row" style="justify-content:center"><a class="btn btn-outline" href="index.html">Back to your jobs</a>' +
      '<a class="btn btn-moss" href="tel:+12094561846">' + ICON.phone + ' Call Now</a></div></div>';
  }

  /* Shared start: right mode, signed in, chrome mounted. Returns the session. */
  async function begin(active) {
    if (!P.ready()) { root().innerHTML = P.notConfiguredHtml(); return null; }
    P.mount(active);
    root().innerHTML = P.skeleton(3);
    return P.requireSession('login.html');
  }

  function firstName(profile, session) {
    var n = (profile && profile.name || '').trim();
    return n ? n.split(/\s+/)[0] : '';
  }

  /* ======================================================================
     DASHBOARD
     ====================================================================== */
  function jobCard(job) {
    var when = P.date(job.scheduled_for), win = P.window(job), total = P.total(job);
    var flag = P.needsYou(job) ? '<span class="pill pill--act">Needs your OK</span>' : P.statusPill(job.status);
    return '<a class="job-card" href="job.html?id=' + encodeURIComponent(job.id) + '">' +
      '<div class="job-card-top"><h3>' + esc(job.service) + '</h3>' + flag + '</div>' +
      (job.status !== 'cancelled' && job.status !== 'completed' ? '<div class="job-card-track">' + P.track(job.status) + '</div>' : '') +
      '<div class="job-foot">' +
        (when ? '<span>' + esc(when) + (win ? ' · <b>' + esc(win) + '</b>' : '') + '</span>' : '<span>Asked ' + esc(P.ago(job.created_at)) + '</span>') +
        (total != null ? '<span>Price: <b>' + P.money(total) + '</b></span>' : '') +
        '<span class="link-arrow" style="margin-left:auto">Open</span>' +
      '</div></a>';
  }

  async function dashboard() {
    var session = await begin('jobs'); if (!session) return;
    var pr = await P.api.profile(), res = await P.api.jobs();

    /* Bryan signing in should see his job board, not his own empty customer
       view. "?customer=1" is the way back, for when he wants to look at what
       a customer sees. */
    if (pr.data && pr.data.is_admin && !P.demo &&
        new URLSearchParams(w.location.search).get('customer') !== '1') {
      w.location.replace('../admin/index.html');
      return;
    }
    if (res.error) return problem('Could not load your jobs', res.error.message);

    var jobs = res.data || [], me = pr.data || {};
    var name = firstName(me, session);
    var open = jobs.filter(function (j) { return j.status !== 'completed' && j.status !== 'cancelled'; });
    var past = jobs.filter(function (j) { return j.status === 'completed' || j.status === 'cancelled'; });
    var waiting = open.filter(P.needsYou);
    var next = open.filter(function (j) { return j.scheduled_for && (j.status === 'scheduled' || j.status === 'in_progress'); })
                   .sort(function (a, b) { return a.scheduled_for < b.scheduled_for ? -1 : 1; })[0];

    var html = '<div class="portal-title"><h1>' + (name ? 'Hello, ' + esc(name) : 'Your jobs') + '</h1>' +
      '<p>' + (open.length ? 'You have ' + open.length + (open.length === 1 ? ' job' : ' jobs') + ' on the go with Bryan.'
                           : 'Nothing on the go right now.') + '</p></div>';

    if (!jobs.length) {
      html += '<div class="portal-empty"><h2>Nothing here yet</h2>' +
        '<p>Once Bryan has a request from you it shows up here, with its price and where it has got to.</p>' +
        '<p class="portal-empty-note">Already asked for a quote? It may have been sent from a different email address. ' +
        'Give Bryan a ring and he will sort it.</p>' +
        '<a class="btn btn-primary" href="new.html">Request a free estimate ' + ICON.arrow + '</a></div>';
      root().innerHTML = html; return;
    }

    /* What needs the customer comes first — it is the reason most people open this. */
    if (waiting.length) {
      html += waiting.map(function (j) {
        return '<a class="hero-card-p hero-card-p--act" href="job.html?id=' + encodeURIComponent(j.id) + '">' +
          '<span class="hcp-label">Waiting on you</span>' +
          '<span class="hcp-main">Bryan has quoted <b>' + P.money(P.total(j)) + '</b> for ' + esc(j.service.toLowerCase()) + '</span>' +
          '<span class="hcp-cta">Review the quote ' + ICON.arrow + '</span></a>';
      }).join('');
    }

    if (next) {
      var win = P.window(next), ics = P.icsHref(next);
      html += '<div class="hero-card-p">' +
        '<span class="hcp-label">' + ICON.cal + ' Next visit</span>' +
        '<span class="hcp-main"><b>' + esc(P.date(next.scheduled_for)) + '</b>' + (win ? '<br>' + esc(win) : '') + '</span>' +
        '<span class="hcp-sub">' + esc(next.service) + '</span>' +
        '<span class="btn-row">' +
          '<a class="btn btn-light" href="job.html?id=' + encodeURIComponent(next.id) + '">See the job</a>' +
          (ics ? '<a class="btn btn-light" href="' + ics + '" download="bryan-visit.ics">Add to my calendar</a>' : '') +
        '</span></div>';
    }

    if (open.length) html += '<h2 class="p-h2">On the go</h2><div class="job-list">' + open.map(jobCard).join('') + '</div>';
    if (past.length) html += '<h2 class="p-h2">Finished</h2><div class="job-list">' + past.map(jobCard).join('') + '</div>';

    html += '<div class="btn-row" style="margin-top:30px">' +
      '<a class="btn btn-primary" href="new.html">Request more work ' + ICON.arrow + '</a>' +
      '<a class="btn btn-outline" href="tel:+12094561846">' + ICON.phone + ' (209) 456-1846</a></div>';

    root().innerHTML = html;
  }

  /* ======================================================================
     ONE JOB
     ====================================================================== */
  function timeline(events) {
    if (!events.length) return '';
    return '<ul class="thread">' + events.map(function (e) {
      var who = e.author === 'customer' ? 'You' : (e.author === 'bryan' ? 'Bryan' : '');
      var label = e.status && P.STATUS[e.status] ? P.STATUS[e.status].label : '';
      if (e.author === 'system') {
        return '<li class="thread-sys"><span>' + esc(label || e.note) +
               (label && e.note ? ' — ' + esc(e.note) : '') + '</span><time>' + esc(P.ago(e.created_at)) + '</time></li>';
      }
      return '<li class="thread-msg thread-msg--' + esc(e.author) + '">' +
        '<div class="bubble"><b>' + esc(who) + '</b><p>' + esc(e.note) + '</p></div>' +
        '<time>' + esc(P.ago(e.created_at)) + '</time></li>';
    }).join('') + '</ul>';
  }

  async function job() {
    var session = await begin('jobs'); if (!session) return;
    var id = new URLSearchParams(w.location.search).get('id');
    if (!id) return problem('Job not found', 'That link is missing the job it points to.');

    async function load() {
      var jr = await P.api.job(id);
      if (jr.error || !jr.data) return problem('Job not found', 'This job either does not exist, or belongs to a different account.');
      var er = await P.api.events(id);
      paint(jr.data, er.data || []);
    }

    function paint(j, events) {
      var st = P.STATUS[j.status] || { label: j.status, blurb: '' };
      var total = P.total(j), when = P.date(j.scheduled_for), win = P.window(j);
      var editable = j.status === 'requested' || j.status === 'quoted';
      var html = '';

      html += '<p class="crumbs-p"><a href="index.html">My jobs</a> › ' + esc(j.service) + '</p>' +
        '<div class="portal-title"><h1>' + esc(j.service) + '</h1><p>Asked ' + esc(P.ago(j.created_at)) + '</p></div>';

      /* ---- status ---- */
      html += '<div class="panel-card"><div class="status-line">' + P.statusPill(j.status) +
        '<span>' + esc(st.blurb) + '</span></div>' + P.track(j.status) + '</div>';

      /* ---- the thing to do next ---- */
      if (P.needsYou(j)) {
        html += '<div class="panel-card panel-card--act">' +
          '<span class="hcp-label">Waiting on you</span>' +
          '<h2>Bryan has quoted ' + P.money(total) + '</h2>' +
          '<div class="price-row"><span class="label">' + esc(j.service) + '</span><span class="amount">' + P.money(j.quote_cents) + '</span></div>' +
          (j.surcharge_cents ? '<div class="price-row"><span class="label">Disposal &amp; handling</span><span class="amount">' + P.money(j.surcharge_cents) + '</span></div>' : '') +
          '<div class="price-row total"><span class="label">Total</span><span class="amount">' + P.money(total) + '</span></div>' +
          '<p class="form-note" style="text-align:left;margin:14px 0 20px">This is the price for the work described below. ' +
          'If anything changes once the job starts, Bryan speaks to you before doing it.</p>' +
          '<div class="btn-row"><button class="btn btn-primary btn-lg" id="accept">' + ICON.check + ' Go ahead at this price</button>' +
          '<a class="btn btn-outline btn-lg" href="#ask">I have a question first</a></div></div>';
      } else if (j.status === 'quoted' && j.quote_accepted_at) {
        html += '<div class="panel-card panel-card--ok"><h2>' + ICON.check + ' You said go ahead</h2>' +
          '<p>On ' + esc(P.dateTime(j.quote_accepted_at)) + ', at <b>' + P.money(total) + '</b>. ' +
          'Bryan will confirm a date with you next' + (j.requested_day ? '' : ' — pick a time that suits you below to speed things up') + '.</p></div>';
      } else if (j.status === 'scheduled' || j.status === 'in_progress') {
        var ics = P.icsHref(j);
        html += '<div class="hero-card-p"><span class="hcp-label">' + ICON.cal + ' ' + (j.status === 'in_progress' ? 'Under way' : 'Booked in') + '</span>' +
          '<span class="hcp-main"><b>' + esc(when || 'Date to be confirmed') + '</b>' + (win ? '<br>' + esc(win) : '') + '</span>' +
          '<span class="btn-row">' + (ics ? '<a class="btn btn-light" href="' + ics + '" download="bryan-visit.ics">Add to my calendar</a>' : '') +
          '<a class="btn btn-light" href="tel:+12094561846">' + ICON.phone + ' Need to change it? Call</a></span></div>';
      } else if (j.status === 'completed') {
        html += '<div class="panel-card panel-card--ok"><h2>' + ICON.check + ' All finished</h2>' +
          '<p>Thanks for the work. If anything is not right, tell Bryan below or give him a call.</p>' +
          '<a class="btn btn-primary" href="new.html">Request more work ' + ICON.arrow + '</a></div>';
      }

      /* ---- price, once it is no longer the call to action ---- */
      if (total != null && !P.needsYou(j)) {
        html += '<div class="panel-card"><h2>Price</h2>' +
          '<div class="price-row"><span class="label">' + esc(j.service) + '</span><span class="amount">' + P.money(j.quote_cents) + '</span></div>' +
          (j.surcharge_cents ? '<div class="price-row"><span class="label">Disposal &amp; handling</span><span class="amount">' + P.money(j.surcharge_cents) + '</span></div>' : '') +
          '<div class="price-row total"><span class="label">Total</span><span class="amount">' + P.money(total) + '</span></div></div>';
      } else if (total == null && j.status !== 'cancelled') {
        html += '<div class="panel-card"><h2>Price</h2><p style="color:var(--muted);margin:0">No price yet. Bryan gives you a figure ' +
          'after he has been out and seen the property — that visit is free.</p></div>';
      }

      /* ---- preferred time ---- */
      if (editable) {
        html += '<div class="panel-card"><h2>When would suit you?</h2>' +
          (j.requested_day
            ? '<p class="picked">You asked for <b>' + esc(S.prettyDate(j.requested_day)) + '</b>' +
              (j.requested_slot != null ? ', ' + esc(P.window({ slot_start: j.requested_slot, slots_needed: j.slots_needed || S.slotsNeeded(j.service) })) : '') +
              '. Pick another below to change it.</p>'
            : '<p style="color:var(--muted)">Pick a time that works. It is a request, not a booking — Bryan confirms it.</p>') +
          '<div id="picker"></div></div>';
      }

      /* ---- details ---- */
      html += '<div class="panel-card"><h2>Details</h2><dl class="kv">' +
        (j.address ? '<dt>Property</dt><dd>' + esc(j.address) + '</dd>' : '') +
        (when && !(j.status === 'scheduled' || j.status === 'in_progress') ? '<dt>Date</dt><dd>' + esc(when) + (win ? ' · ' + esc(win) : '') + '</dd>' : '') +
        '<dt>Contact</dt><dd>' + esc(j.contact_name) + (j.contact_phone ? ' · ' + esc(j.contact_phone) : '') + '</dd></dl>' +
        (j.details ? '<p class="mini-label" style="margin-top:20px">What you asked for</p><p style="white-space:pre-wrap;margin:0">' + esc(j.details) + '</p>' : '') +
        '</div>';

      /* ---- conversation ---- */
      html += '<div class="panel-card" id="ask"><h2>Messages</h2>' +
        (j.status !== 'cancelled'
          ? '<form id="note-form" class="composer"><label class="sr-only" for="note">Message to Bryan</label>' +
            '<textarea id="note" maxlength="1000" placeholder="Ask Bryan a question, or tell him something he should know…" required></textarea>' +
            '<div class="composer-foot"><span class="form-note" style="margin:0" id="note-count">Bryan sees this the next time he checks his job board.</span>' +
            '<button class="btn btn-moss" type="submit">Send</button></div></form>'
          : '') +
        timeline(events) + '</div>';

      if (editable) {
        html += '<p style="text-align:center;margin-top:8px"><button class="dst-reset" id="cancel">I no longer need this — cancel the request</button></p>';
      }

      root().innerHTML = html;
      wire(j);
    }

    function wire(j) {
      var accept = document.getElementById('accept');
      if (accept) accept.addEventListener('click', async function () {
        var yes = await P.confirm({
          title: 'Go ahead at ' + P.money(P.total(j)) + '?',
          body: 'This tells Bryan you are happy with the price and he can book you in. Nothing is charged here — you pay Bryan directly when the work is done.',
          ok: 'Yes, go ahead', cancel: 'Not yet'
        });
        if (!yes) return;
        var done = P.busy(accept, 'Telling Bryan…');
        var r = await P.api.accept(j.id);
        if (r.error) { done(); return P.toast(r.error.message); }
        P.toast('Done — Bryan knows you said go ahead.');
        load();
      });

      var picker = document.getElementById('picker');
      if (picker) P.slotPicker(picker, {
        needed: j.slots_needed || (S ? S.slotsNeeded(j.service) : 1),
        selected: { day: j.requested_day, slot: j.requested_slot },
        onPick: async function (day, slot) {
          var r = await P.api.reslot(j.id, day, slot);
          if (r.error) return P.toast(r.error.message);
          P.toast('Bryan will see you asked for ' + S.prettyDate(day) + '.');
          load();
        }
      });

      var form = document.getElementById('note-form');
      if (form) {
        var ta = document.getElementById('note'), count = document.getElementById('note-count');
        ta.addEventListener('input', function () {
          var left = 1000 - ta.value.length;
          if (left < 200) count.textContent = left + ' characters left';
        });
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          var text = ta.value.trim(); if (!text) return;
          var done = P.busy(form.querySelector('button'), 'Sending…');
          var r = await P.api.note(j.id, text);
          if (r.error) { done(); return P.toast(r.error.message); }
          P.toast('Sent to Bryan.');
          load();
        });
      }

      var cancel = document.getElementById('cancel');
      if (cancel) cancel.addEventListener('click', async function () {
        var yes = await P.confirm({ title: 'Cancel this request?', danger: true,
          body: 'Bryan will see that you no longer need this. You can always ask again later.',
          ok: 'Yes, cancel it', cancel: 'Keep it' });
        if (!yes) return;
        var r = await P.api.cancel(j.id);
        if (r.error) return P.toast(r.error.message);
        P.flashNext('Request cancelled.');
        w.location.href = 'index.html';
      });
    }

    load();
  }

  /* ======================================================================
     NEW REQUEST
     ====================================================================== */
  async function newRequest() {
    var session = await begin('new'); if (!session) return;
    var me = (await P.api.profile()).data || {};
    var picked = { day: null, slot: null };

    root().innerHTML =
      '<div class="portal-title"><h1>Request more work</h1><p>Tell Bryan what you need. He already has your details, so this is the short version.</p></div>' +
      '<form class="form-card" id="req" novalidate>' +
        '<div class="field"><label for="r-service">What do you need?</label><select id="r-service">' +
          P.SERVICES.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="r-details">Describe the job <span class="hint">(a few sentences is plenty)</span></label>' +
          '<textarea id="r-details" maxlength="4000" placeholder="For example: the gate latch has broken, and the gutters on the garage side are full again."></textarea></div>' +
        '<div class="field"><label for="r-address">Property</label><input type="text" id="r-address" value="' + esc(me.address || '') + '"></div>' +
        '<div class="field"><label>When would suit you? <span class="hint">(optional)</span></label>' +
          '<p class="form-note" style="text-align:left;margin:0 0 12px" id="r-scope"></p><div id="picker"></div></div>' +
        '<button class="btn btn-primary btn-lg btn-block" type="submit">Send to Bryan ' + ICON.arrow + '</button>' +
        '<p class="form-note">The estimate is free, and there is no obligation either way.</p>' +
      '</form>';

    var service = document.getElementById('r-service'), scope = document.getElementById('r-scope');
    function scopeText() {
      var n = S.slotsNeeded(service.value);
      scope.textContent = S.scopeNote[n] + ' — a job like this usually needs ' + n + (n === 1 ? ' of the 3-hour slots.' : ' of the 3-hour slots back to back.');
    }
    scopeText();
    var pk = await P.slotPicker(document.getElementById('picker'), {
      needed: function () { return S.slotsNeeded(service.value); },
      onPick: function (day, slot) { picked = { day: day, slot: slot }; }
    });
    service.addEventListener('change', function () { picked = { day: null, slot: null }; scopeText(); if (pk) pk.redraw(); });

    document.getElementById('req').addEventListener('submit', async function (e) {
      e.preventDefault();
      var details = document.getElementById('r-details');
      if (details.value.trim().length < 5) { details.focus(); return P.toast('Add a line or two about the job so Bryan knows what to expect.'); }
      var done = P.busy(e.target.querySelector('[type=submit]'), 'Sending…');
      var r = await P.api.request({ service: service.value, details: details.value.trim(),
        address: document.getElementById('r-address').value.trim(), day: picked.day, slot: picked.slot });
      if (r.error) { done(); return P.toast(r.error.message); }
      P.flashNext('Sent — Bryan has your request.');
      w.location.href = r.data ? 'job.html?id=' + encodeURIComponent(r.data) : 'index.html';
    });
  }

  /* ======================================================================
     MY DETAILS
     ====================================================================== */
  async function profile() {
    var session = await begin('me'); if (!session) return;
    var me = (await P.api.profile()).data || {};

    root().innerHTML =
      '<div class="portal-title"><h1>My details</h1><p>So Bryan knows who you are and where to come.</p></div>' +
      '<form class="form-card" id="me" novalidate>' +
        '<div class="field"><label for="m-name">Your name</label><input type="text" id="m-name" autocomplete="name" value="' + esc(me.name || '') + '"></div>' +
        '<div class="field"><label for="m-phone">Phone</label><input type="tel" id="m-phone" autocomplete="tel" value="' + esc(me.phone || '') + '"></div>' +
        '<div class="field"><label for="m-address">Property address</label><input type="text" id="m-address" autocomplete="street-address" value="' + esc(me.address || '') + '"></div>' +
        '<div class="field"><label for="m-email">Email <span class="hint">(this is how you sign in, so it cannot be changed here)</span></label>' +
          '<input type="email" id="m-email" value="' + esc(me.email || session.user.email || '') + '" disabled></div>' +
        '<button class="btn btn-primary btn-lg" type="submit">Save my details</button>' +
      '</form>' +
      '<div class="panel-card" style="margin-top:20px"><h2>Your information</h2>' +
        '<p style="color:var(--muted)">Bryan keeps your name, contact details, address and the jobs you have asked for — nothing else. ' +
        'No card or bank details are ever stored here; you pay Bryan directly.</p>' +
        '<div class="btn-row"><a class="btn btn-outline" href="mydata.html">See my information</a>' +
        '<button class="btn btn-dark" type="button" id="del-acct">Delete my account</button></div>' +
        (P.demo ? '<button class="btn btn-outline" id="reset">Reset the demo data</button>' : '') +
      '</div>';

    document.getElementById('me').addEventListener('submit', async function (e) {
      e.preventDefault();
      var done = P.busy(e.target.querySelector('[type=submit]'), 'Saving…');
      var r = await P.api.saveProfile({
        name: document.getElementById('m-name').value.trim(),
        phone: document.getElementById('m-phone').value.trim(),
        address: document.getElementById('m-address').value.trim()
      });
      done();
      P.toast(r.error ? r.error.message : 'Saved.');
    });

    var del = document.getElementById('del-acct');
    if (del) del.addEventListener('click', function () { P.askDeletion(); });

    var reset = document.getElementById('reset');
    if (reset) reset.addEventListener('click', async function () {
      await P.api.reset(); P.flashNext('Demo data reset.'); w.location.href = 'index.html';
    });
  }


  /* ======================================================================
     MY INFORMATION  — everything held about this customer, in one place.
     California's privacy law calls this the right to know; this is it,
     without having to ask anyone.
     ====================================================================== */
  async function myData() {
    var session = await begin('me'); if (!session) return;
    var me = (await P.api.profile()).data || {};
    var res = await P.api.jobs();
    if (res.error) return problem('Could not load your information', res.error.message);
    var jobs = res.data || [];

    /* Messages live per job, so gather them job by job. */
    var threads = await Promise.all(jobs.map(function (j) { return P.api.events(j.id); }));

    var rows = function (pairs) {
      return '<dl class="kv">' + pairs.filter(function (p) { return p[1]; })
        .map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>'; }).join('') + '</dl>';
    };

    var html =
      '<div class="portal-title"><h1>My information</h1>' +
        '<p>Everything Bryan holds about you, taken straight from his records. ' +
        'Anything wrong? Change it under <a href="profile.html">My details</a>, or tell him.</p></div>' +

      '<div class="panel-card"><h2>About you</h2>' +
        rows([['Name', me.name], ['Email', me.email || session.user.email], ['Phone', me.phone],
              ['Address', me.address], ['Account created', P.dateTime(me.created_at)]]) +
      '</div>' +

      '<div class="panel-card"><h2>Your jobs (' + jobs.length + ')</h2>' +
        (jobs.length ? jobs.map(function (j, i) {
          var evs = (threads[i] && threads[i].data) || [];
          var msgs = evs.filter(function (e) { return e.note; });
          return '<div class="data-job">' +
            '<h3>' + esc(j.service) + ' <span class="data-when">asked ' + esc(P.dateTime(j.created_at) || '') + '</span></h3>' +
            rows([['Where it got to', P.STATUS[j.status] ? P.STATUS[j.status].label : j.status],
                  ['What you told Bryan', j.details],
                  ['Property', j.address],
                  ['Price', P.total(j) != null ? P.money(P.total(j)) : ''],
                  ['You said go ahead', P.dateTime(j.quote_accepted_at)],
                  ['Booked for', j.scheduled_for ? (P.date(j.scheduled_for) + (P.window(j) ? ', ' + P.window(j) : '')) : '']]) +
            (msgs.length ? '<p class="data-sub">Messages (' + msgs.length + ')</p><ul class="data-msgs">' +
              msgs.map(function (e) {
                var who = e.author === 'customer' ? 'You' : (e.author === 'bryan' ? 'Bryan' : 'The website');
                return '<li><b>' + esc(who) + '</b> · ' + esc(P.dateTime(e.created_at) || '') + '<br>' + esc(e.note) + '</li>';
              }).join('') + '</ul>' : '') +
          '</div>';
        }).join('') : '<p style="color:var(--muted);margin:0">None yet.</p>') +
      '</div>' +

      '<div class="panel-card"><h2>What is never kept</h2>' +
        '<p style="margin:0 0 10px">No card or bank details — you pay Bryan directly. No tracking, no advertising, ' +
        'and nothing is ever sold or shared for marketing. See the ' +
        '<a href="../privacy.html">privacy page</a> for the full picture.</p>' +
      '</div>' +

      '<div class="btn-row" style="margin-top:24px">' +
        '<button class="btn btn-outline" type="button" id="print-me">Print or save as PDF</button>' +
        '<button class="btn btn-dark" type="button" id="ask-delete">Delete my account</button>' +
      '</div>';

    root().innerHTML = html;
    document.getElementById('print-me').addEventListener('click', function () { w.print(); });
    document.getElementById('ask-delete').addEventListener('click', function () { P.askDeletion(); });
  }

  w.WPages = { dashboard: dashboard, job: job, newRequest: newRequest, profile: profile, myData: myData };
})(window);
