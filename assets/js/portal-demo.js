/* ==========================================================================
   Wainwrights — portal demo mode

   A stand-in for the database so both sides of the portal can be seen and
   clicked through before Supabase is set up (and afterwards, as a safe way to
   show it to someone). Reached with ?demo=1 (or #demo) on any portal or admin
   page.

   - Every name, address and number here is invented.
   - Data lives in this browser's localStorage and goes nowhere.
   - The customer side and Bryan's side share ONE store, so saying "go ahead"
     as the sample customer shows up on Bryan's board, and a date Bryan books
     shows up in the customer's portal.
   - It enforces the SAME rules as the real database (schema.sql section 13
     for customers; the status-history and no-double-booking triggers for
     Bryan), so what can and cannot be done here matches the real thing.
   ========================================================================== */
(function (w) {
  'use strict';
  var P = w.WPortal;
  if (!P || !P.demo) return;

  var path = w.location.pathname;
  var AREA = /\/(admin|demo)(\/|$)/.test(path) ? 'admin' : (/\/portal(\/|$)/.test(path) ? 'portal' : '');
  if (!AREA) return;

  var KEY = 'w-portal-demo-v2';
  var ME = 'demo-user';
  var S = w.WAINWRIGHTS_SCHEDULE;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return S ? S.ymd(d) : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function iso(daysFromNow, hour) {
    var d = new Date(); d.setDate(d.getDate() + daysFromNow); d.setHours(hour || 9, 12, 0, 0);
    return d.toISOString();
  }
  /* The nth working day from today (negative = in the past), as YYYY-MM-DD. */
  function workday(n) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    var step = n < 0 ? -1 : 1, left = Math.abs(n);
    while (left > 0) {
      d.setDate(d.getDate() + step);
      if (d.getDay() !== 0 && d.getDay() !== 6) left--;
    }
    return ymd(d);
  }
  function uid() { return 'demo-' + Math.random().toString(36).slice(2, 10); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /* ------------------------------------------------------------------ seed */
  function seed() {
    var visit = workday(3);
    var ADDR = '123 Example Road, Pine Mountain Lake';
    function job(o) {
      return Object.assign({
        customer_id: null, contact_name: '', contact_phone: '', contact_email: '', contact_time: '',
        address: '', details: '', quote_cents: null, surcharge_cents: 0, quote_accepted_at: null,
        scheduled_for: null, slot_start: null, slots_needed: 1, requested_day: null, requested_slot: null,
        created_at: iso(-1), updated_at: iso(-1)
      }, o);
    }
    var pat = { customer_id: ME, contact_name: 'Pat Sample', contact_phone: '(209) 555-0142',
                contact_email: 'pat.sample@example.com', address: ADDR };

    var jobs = [
      /* --- the sample customer, Pat --- */
      job(Object.assign({}, pat, { id: 'demo-deck', service: 'Interior or exterior painting', status: 'quoted',
        details: 'Back deck is peeling badly and the railing on the lake side is loose. About 300 square feet. Would like it stained the same redwood colour.',
        quote_cents: 185000, slots_needed: 2, created_at: iso(-6), updated_at: iso(-1) })),
      job(Object.assign({}, pat, { id: 'demo-clear', service: 'Defensible space / fire clearing', status: 'scheduled',
        details: 'Zone 0 and Zone 1 around the house. Gutters are full of needles and the low limbs on the two pines by the driveway need raising.',
        quote_cents: 64000, quote_accepted_at: iso(-9), scheduled_for: visit, slot_start: 0, slots_needed: 3,
        requested_day: visit, requested_slot: 0, created_at: iso(-14), updated_at: iso(-8) })),
      job(Object.assign({}, pat, { id: 'demo-gutter', service: 'Yard waste removal', status: 'requested',
        details: 'Pile of oak branches behind the shed from the last storm, plus about ten bags of leaves.',
        requested_day: workday(6), requested_slot: 1, created_at: iso(-1, 16), updated_at: iso(-1, 16) })),
      job(Object.assign({}, pat, { id: 'demo-junk', service: 'Junk and debris hauling', status: 'completed',
        details: 'Old refrigerator and a broken recliner from the garage.',
        quote_cents: 17500, surcharge_cents: 6000, quote_accepted_at: iso(-40),
        scheduled_for: workday(-24), slot_start: 1, created_at: iso(-45), updated_at: iso(-32) })),

      /* --- other (invented) customers, so Bryan's board looks like a real week --- */
      job({ id: 'demo-o1', service: 'Handyman repairs', status: 'requested',
        contact_name: 'Margaret Ellis', contact_phone: '(209) 555-0118', contact_email: 'm.ellis@example.com',
        contact_time: 'Mornings', address: '48 Sample Court, Pine Mountain Lake',
        details: 'Screen door will not latch and two kitchen cabinet doors are hanging off their hinges.',
        requested_day: workday(4), requested_slot: 0, created_at: iso(0, 7), updated_at: iso(0, 7) }),
      job({ id: 'demo-o2', service: 'Junk and debris hauling', status: 'quoted',
        contact_name: 'Don Reyes', contact_phone: '(209) 555-0177', contact_email: 'don.reyes@example.com',
        address: '9 Placeholder Drive, Pine Mountain Lake',
        details: 'Clearing out the garage before we sell — an old sofa, a treadmill and about a dozen boxes.',
        quote_cents: 17500, surcharge_cents: 6000, quote_accepted_at: iso(-1, 18), slots_needed: 1,
        requested_day: workday(5), requested_slot: 2, created_at: iso(-5), updated_at: iso(-1, 18) }),
      job({ id: 'demo-o3', service: 'Ongoing property watch and upkeep', status: 'scheduled',
        contact_name: 'Carol Whitfield', contact_phone: '(209) 555-0163', contact_email: 'carol.w@example.com',
        address: '210 Demo Lane, Pine Mountain Lake',
        details: 'We are away until November. Monthly check: run the taps, check for leaks and mice, clear the porch.',
        quote_cents: 12000, quote_accepted_at: iso(-20), scheduled_for: workday(1), slot_start: 1, slots_needed: 1,
        created_at: iso(-25), updated_at: iso(-19) }),
      job({ id: 'demo-o4', service: 'Interior or exterior painting', status: 'scheduled',
        contact_name: 'Jim Hartley', contact_phone: '(209) 555-0190', contact_email: 'jim.hartley@example.com',
        address: '77 Example Way, Pine Mountain Lake',
        details: 'Guest bedroom and hallway, walls only. Paint is already bought — it is in the garage.',
        quote_cents: 52000, quote_accepted_at: iso(-7), scheduled_for: workday(2), slot_start: 0, slots_needed: 2,
        created_at: iso(-11), updated_at: iso(-6) }),
      job({ id: 'demo-o5', service: 'Yard waste removal', status: 'scheduled',
        contact_name: 'Ruth Castillo', contact_phone: '(209) 555-0105', contact_email: '',
        address: '15 Sample Ridge, Pine Mountain Lake',
        details: 'Pine needles and cones along the fence line, about a truckload.',
        quote_cents: 15000, quote_accepted_at: iso(-4), scheduled_for: workday(4), slot_start: 2, slots_needed: 1,
        created_at: iso(-8), updated_at: iso(-3) }),
      job({ id: 'demo-o6', service: 'Handyman repairs', status: 'completed',
        contact_name: 'Walt Brennan', contact_phone: '(209) 555-0131', contact_email: 'walt.b@example.com',
        address: '3 Placeholder Point, Pine Mountain Lake',
        details: 'Grab bar in the shower and a new railing on the two front steps.',
        quote_cents: 26000, quote_accepted_at: iso(-12), scheduled_for: workday(-3), slot_start: 0, slots_needed: 1,
        created_at: iso(-15), updated_at: iso(-4, 12) })
    ];

    function ev(job_id, author, note, status, at) { return { id: uid(), job_id: job_id, author: author, status: status || null, note: note, created_at: at }; }
    var events = [
      ev('demo-deck', 'system', 'Request received from the website.', 'requested', iso(-6)),
      ev('demo-deck', 'bryan', 'Came out Tuesday and measured up. The boards are sound — it needs a proper strip and sand, then two coats. The loose railing is two rotted posts; price includes replacing both.', null, iso(-2)),
      ev('demo-deck', 'system', '', 'quoted', iso(-1)),

      ev('demo-clear', 'system', 'Request received from the website.', 'requested', iso(-14)),
      ev('demo-clear', 'system', '', 'quoted', iso(-10)),
      ev('demo-clear', 'customer', 'Said go ahead at the quoted price.', null, iso(-9)),
      ev('demo-clear', 'system', '', 'scheduled', iso(-8)),
      ev('demo-clear', 'bryan', 'Booked you in for a full day. I will bring the chipper, so everything cut gets hauled off the same day.', null, iso(-8, 10)),

      ev('demo-gutter', 'system', 'Request received.', 'requested', iso(-1, 16)),

      ev('demo-junk', 'system', 'Request received from the website.', 'requested', iso(-45)),
      ev('demo-junk', 'system', '', 'quoted', iso(-42)),
      ev('demo-junk', 'customer', 'Said go ahead at the quoted price.', null, iso(-40)),
      ev('demo-junk', 'system', '', 'scheduled', iso(-39)),
      ev('demo-junk', 'system', '', 'completed', iso(-32)),
      ev('demo-junk', 'bryan', 'All gone. Thanks Pat — the garage floor got a sweep too.', null, iso(-32, 15)),

      ev('demo-o1', 'system', 'Request received from the website.', 'requested', iso(0, 7)),
      ev('demo-o2', 'system', 'Request received from the website.', 'requested', iso(-5)),
      ev('demo-o2', 'system', '', 'quoted', iso(-3)),
      ev('demo-o2', 'customer', 'Said go ahead at the quoted price.', null, iso(-1, 18)),
      ev('demo-o3', 'system', '', 'scheduled', iso(-19)),
      ev('demo-o4', 'system', '', 'scheduled', iso(-6)),
      ev('demo-o5', 'system', '', 'scheduled', iso(-3)),
      ev('demo-o6', 'system', '', 'completed', iso(-4, 12))
    ];

    return {
      profiles: {
        'demo-user':  { id: ME, email: 'pat.sample@example.com', name: 'Pat Sample', phone: '(209) 555-0142', address: ADDR, is_admin: false },
        'demo-bryan': { id: 'demo-bryan', email: 'bryan@example.com', name: 'Bryan Wainwright', phone: '(209) 456-1846', address: '', is_admin: true }
      },
      jobs: jobs,
      events: events,
      notes: [
        { job_id: 'demo-clear', body: 'Gate code at the guard shack. Two big pines by the driveway — bring the pole saw. Dog is friendly.', updated_at: iso(-8) },
        { job_id: 'demo-o3',    body: 'Key is in the lockbox by the side door. Water shut-off is under the kitchen sink.', updated_at: iso(-19) },
        { job_id: 'demo-o4',    body: 'Paint: Swiss Coffee, eggshell. Move the bed away from the wall first.', updated_at: iso(-6) }
      ],
      blackouts: [ { day: workday(8), reason: '' } ]
    };
  }

  function load() {
    try { var raw = w.localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    var db = seed(); save(db); return db;
  }
  function save(db) { try { w.localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }

  /* A beat of latency, so loading states and button spinners can be seen. */
  function later(result) { return new Promise(function (r) { setTimeout(function () { r(result); }, 320); }); }
  var ok = function (data) { return later({ data: data === undefined ? null : data, error: null }); };
  var no = function (msg) { return later({ data: null, error: { message: msg } }); };

  function addEvent(db, jobId, author, note, status) {
    db.events.push({ id: uid(), job_id: jobId, author: author, status: status || null, note: note || '', created_at: new Date().toISOString() });
  }
  /* A job the signed-in customer owns — same answer for "not yours" and "does not exist". */
  function own(db, id) { return db.jobs.filter(function (j) { return j.id === id && j.customer_id === ME; })[0]; }

  /* Slots taken by booked work, derived from the jobs themselves. */
  function occupied(db, exceptId) {
    var out = [];
    db.jobs.forEach(function (j) {
      if (j.id === exceptId || !j.scheduled_for || j.slot_start == null) return;
      if (j.status !== 'scheduled' && j.status !== 'in_progress') return;
      for (var k = 0; k < (j.slots_needed || 1); k++) out.push({ day: j.scheduled_for, slot: j.slot_start + k });
    });
    return out;
  }

  /* ---------------------------------------------------------- customer API */
  var customer = {
    session: function () { return Promise.resolve({ user: { id: ME, email: load().profiles[ME].email } }); },
    signOut: function () { try { w.sessionStorage.removeItem('w-demo'); } catch (e) {} return Promise.resolve(); },

    profile: function () { return Promise.resolve({ data: load().profiles[AREA === 'admin' ? 'demo-bryan' : ME], error: null }); },
    saveProfile: function (p) {
      var db = load(), me = db.profiles[ME];
      me.name = p.name; me.phone = p.phone; me.address = p.address;
      save(db); return ok();
    },

    jobs: function () {
      var rows = load().jobs.filter(function (j) { return j.customer_id === ME; })
        .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
      return ok(clone(rows));
    },
    job: function (id) { var j = own(load(), id); return ok(j ? clone(j) : null); },
    events: function (id) {
      var db = load();
      if (!own(db, id)) return Promise.resolve({ data: [], error: null });
      var rows = db.events.filter(function (e) { return e.job_id === id; })
        .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
      return Promise.resolve({ data: clone(rows), error: null });
    },

    /* The rules below mirror schema.sql section 13 line for line. */
    accept: function (id) {
      var db = load(), j = own(db, id);
      if (!j) return no('Job not found.');
      if (j.status !== 'quoted' || j.quote_cents == null) return no('There is no quote waiting on this job.');
      if (!j.quote_accepted_at) {
        j.quote_accepted_at = new Date().toISOString();
        addEvent(db, id, 'customer', 'Said go ahead at the quoted price.');
        save(db);
      }
      return ok();
    },
    note: function (id, text) {
      var db = load(), j = own(db, id), body = String(text || '').trim();
      if (!j) return no('Job not found.');
      if (!body) return no('The message is empty.');
      if (body.length > 1000) return no('That message is too long. 1000 characters at most.');
      addEvent(db, id, 'customer', body); save(db);
      return ok();
    },
    reslot: function (id, day, slot) {
      var db = load(), j = own(db, id);
      if (!j) return no('Job not found.');
      if (j.status !== 'requested' && j.status !== 'quoted') return no('This job is already booked in. Call Bryan to change the time.');
      j.requested_day = day; j.requested_slot = slot;
      addEvent(db, id, 'customer', 'Asked for ' + (S ? S.prettyDate(day) + ', ' + S.slotLabel(slot) : day) + '.');
      save(db); return ok();
    },
    cancel: function (id) {
      var db = load(), j = own(db, id);
      if (!j) return no('Job not found.');
      if (j.status !== 'requested' && j.status !== 'quoted') return no('This job is already booked in. Please call Bryan to cancel it.');
      j.status = 'cancelled';
      addEvent(db, id, 'system', '', 'cancelled');
      addEvent(db, id, 'customer', 'Cancelled this request.');
      save(db); return ok();
    },
    request: function (r) {
      var db = load(), me = db.profiles[ME];
      var open = db.jobs.filter(function (j) { return j.customer_id === ME && (j.status === 'requested' || j.status === 'quoted'); }).length;
      if (open >= 5) return no('You already have several requests open. Give Bryan a call and he will sort them out together.');
      var id = uid(), now = new Date().toISOString();
      db.jobs.push({ id: id, customer_id: ME, service: r.service || 'Not sure yet', status: 'requested', details: r.details || '',
        address: r.address || me.address, contact_name: me.name, contact_phone: me.phone, contact_email: me.email, contact_time: '',
        quote_cents: null, surcharge_cents: 0, quote_accepted_at: null,
        scheduled_for: null, slot_start: null, slots_needed: S ? S.slotsNeeded(r.service) : 1,
        requested_day: r.day || null, requested_slot: r.slot == null ? null : r.slot,
        created_at: now, updated_at: now });
      addEvent(db, id, 'system', 'Request received.', 'requested');
      save(db); return ok(id);
    },
    availability: function () {
      var db = load();
      return ok({ booked: occupied(db), blackouts: db.blackouts.map(function (b) { return b.day; }) });
    },

    requestDeletion: function (note) {
      var db = load();
      db.profiles[ME].deletion_requested_at = new Date().toISOString();
      db.profiles[ME].deletion_note = note || '';
      save(db); return ok();
    },

    /* Demo only: put the sample data back as it started. */
    reset: function () { try { w.localStorage.removeItem(KEY); } catch (e) {} return Promise.resolve(); }
  };

  /* ------------------------------------------------ Bryan's side: a tiny
     stand-in for the Supabase client, covering exactly the calls the admin
     pages make. Bryan is admin, so — as in the real database — he sees
     every row. */
  var TABLES = { jobs: 'jobs', job_events: 'events', job_notes: 'notes', blackouts: 'blackouts', devices: 'devices',
                 profiles: 'profiles', reviews: 'reviews', admin_grants: 'grants', admin_audit: 'audit' };
  var KEYS   = { job_notes: 'job_id', blackouts: 'day' };

  function Query(table) { this.table = table; this.op = 'select'; this.where = []; this.sort = null; this.mode = 'many'; this.payload = null; }
  Query.prototype.select = function () { return this; };
  Query.prototype.eq  = function (c, v) { this.where.push(function (r) { return r[c] === v; }); return this; };
  Query.prototype.gte = function (c, v) { this.where.push(function (r) { return r[c] != null && r[c] >= v; }); return this; };
  Query.prototype.lte = function (c, v) { this.where.push(function (r) { return r[c] != null && r[c] <= v; }); return this; };
  Query.prototype.in  = function (c, a) { this.where.push(function (r) { return a.indexOf(r[c]) !== -1; }); return this; };
  Query.prototype.not = function (c, op, v) { this.where.push(function (r) { return op === 'is' && v === null ? r[c] != null : r[c] !== v; }); return this; };
  Query.prototype.limit = function (n) { this.cap = n; return this; };
  Query.prototype.order = function (c, o) { this.sort = { c: c, asc: !o || o.ascending !== false }; return this; };
  Query.prototype.maybeSingle = function () { this.mode = 'maybe'; return this; };
  Query.prototype.single = function () { this.mode = 'one'; return this; };
  Query.prototype.insert = function (p) { this.op = 'insert'; this.payload = p; return this; };
  Query.prototype.update = function (p) { this.op = 'update'; this.payload = p; return this; };
  Query.prototype.upsert = function (p) { this.op = 'upsert'; this.payload = p; return this; };
  Query.prototype.delete = function () { this.op = 'delete'; return this; };
  Query.prototype.then = function (res, rej) { return this.run().then(res, rej); };

  Query.prototype.run = function () {
    var db = load(), name = TABLES[this.table];
    if (!name) return no('Unknown table ' + this.table);
    /* profiles live as a map keyed by id — present them as a table. */
    if (name === 'profiles') {
      var list = Object.keys(db.profiles).map(function (k) { return db.profiles[k]; });
      var picked = list.filter(function (r) { return this.where.every(function (f) { return f(r); }); }, this);
      if (this.op === 'select') return ok(clone(picked));
      if (this.op === 'update') { picked.forEach(function (r) { Object.assign(r, this.payload); }, this); save(db); return ok(); }
      return no('Not in the demo.');
    }
    if (!db[name]) db[name] = [];
    var rows = db[name], where = this.where;
    var hit = function (r) { return where.every(function (f) { return f(r); }); };
    var now = new Date().toISOString();

    if (this.op === 'select') {
      var out = rows.filter(hit);
      if (this.sort) {
        var s = this.sort;
        out.sort(function (a, b) { var x = a[s.c], y = b[s.c]; return (x === y ? 0 : (x < y ? -1 : 1)) * (s.asc ? 1 : -1); });
      }
      if (this.cap != null) out = out.slice(0, this.cap);
      out = clone(out);
      if (this.mode === 'many') return ok(out);
      if (!out.length && this.mode === 'one') return no('Not found.');
      return ok(out[0] || null);
    }

    if (this.op === 'insert') {
      (Array.isArray(this.payload) ? this.payload : [this.payload]).forEach(function (p) {
        var row = Object.assign({ id: uid(), created_at: now }, p);
        if (name === 'events' && !row.author) row.author = 'system';
        rows.push(row);
      });
      save(db); return ok();
    }

    if (this.op === 'upsert') {
      var key = KEYS[this.table] || 'id', p = this.payload;
      var found = rows.filter(function (r) { return r[key] === p[key]; })[0];
      if (found) Object.assign(found, p); else rows.push(Object.assign({}, p));
      save(db); return ok();
    }

    if (this.op === 'delete') {
      db[name] = rows.filter(function (r) { return !hit(r); });
      save(db); return ok();
    }

    /* update — with the two database triggers the real jobs table has */
    var targets = rows.filter(hit), p2 = this.payload;
    if (name === 'jobs') {
      for (var i = 0; i < targets.length; i++) {
        var next = Object.assign({}, targets[i], p2);
        if (next.scheduled_for && next.slot_start != null && (next.status === 'scheduled' || next.status === 'in_progress')) {
          var taken = occupied(db, next.id);
          for (var k = 0; k < (next.slots_needed || 1); k++) {
            var clash = taken.some(function (t) { return t.day === next.scheduled_for && t.slot === next.slot_start + k; });
            if (clash) return no('That time overlaps another booked job. Pick a different day or start time.');
          }
          if (db.blackouts.some(function (b) { return b.day === next.scheduled_for; })) {
            return no('That day is blocked out on your schedule.');
          }
        }
      }
    }
    targets.forEach(function (r) {
      var before = r.status;
      Object.assign(r, p2);
      if (name === 'jobs') {
        r.updated_at = now;
        if (p2.status && p2.status !== before) addEvent(db, r.id, 'system', '', p2.status);
      }
    });
    save(db); return ok();
  };

  var fakeClient = {
    from: function (t) { return new Query(t); },
    /* Only Bryan's pairing code is ever called this way from the admin pages.
       In the demo, "typing it into the phone" is simulated a few seconds later. */
    rpc: function (fn, args) {
      if (fn === 'clear_deletion_request') {
        var db = load(), who = db.profiles[(args || {}).p_customer];
        if (who) { who.deletion_requested_at = null; who.deletion_note = null; save(db); }
        return ok();
      }
      if (fn === 'grant_admin' || fn === 'revoke_admin') {
        var d2 = load(), addr = String((args || {}).p_email || '').trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return no('That does not look like an email address.');
        d2.grants = d2.grants || []; d2.audit = d2.audit || [];
        var who = Object.keys(d2.profiles).map(function (k) { return d2.profiles[k]; })
          .filter(function (r) { return (r.email || '').toLowerCase() === addr; })[0];
        if (fn === 'revoke_admin') {
          var admins = Object.keys(d2.profiles).filter(function (k) { return d2.profiles[k].is_admin; });
          if (who && who.is_admin && admins.length < 2) return no('That is the only admin left. Make someone else an admin first.');
          if (who) who.is_admin = false;
          d2.grants = d2.grants.filter(function (g) { return g.email !== addr; });
          d2.audit.push({ id: uid(), at: new Date().toISOString(), actor_email: 'bryan@example.com', action: 'revoked', target_email: addr });
          save(d2); return ok();
        }
        if (who) who.is_admin = true;
        if (!d2.grants.some(function (g) { return g.email === addr; })) {
          d2.grants.push({ email: addr, created_at: new Date().toISOString() });
        }
        d2.audit.push({ id: uid(), at: new Date().toISOString(), actor_email: 'bryan@example.com', action: 'granted', target_email: addr });
        save(d2);
        return ok(who ? 'now an admin' : 'approved — they become an admin when they sign up and confirm their email');
      }
      if (fn !== 'create_pairing_code') return no('Not in the demo.');
      var hex = '0123456789ABCDEF', c = '';
      for (var i = 0; i < 8; i++) c += hex[Math.floor(Math.random() * 16)];
      setTimeout(function () {
        var db = load(); db.devices = db.devices || [];
        if (!db.devices.length) {
          db.devices.push({ id: uid(), label: 'Bryan’s phone (demo)', fcm_token: 'demo', created_at: new Date().toISOString(), last_seen_at: new Date().toISOString() });
          save(db);
        }
      }, 6000);
      return ok(c.slice(0, 4) + '-' + c.slice(4));
    }
  };

  P.api = customer;
  if (AREA === 'admin') P.client = function () { return fakeClient; };

  /* Bryan's pages get the demo banner too, with a way across to the other side. */
  if (AREA === 'admin') {
    var put = function () {
      var header = document.querySelector('.portal-header');
      if (!header || document.querySelector('.demo-banner')) return;
      var b = document.createElement('div');
      b.className = 'demo-banner';
      b.innerHTML = '<b>Demo</b> — Bryan’s side, with sample data kept only in this browser. ' +
                    '<a href="../portal/index.html?demo=1#demo">See the customer’s side</a>' +
                    '<a href="../index.html">Leave the tour</a>';
      header.parentNode.insertBefore(b, header);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', put); else put();
  }
})(window);
