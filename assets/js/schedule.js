/* ==========================================================================
   Wainwrights — scheduling
   --------------------------------------------------------------------------
   The working day is three 3-hour slots. A job takes one or more of them
   depending on its scope, and a booking runs through consecutive slots on
   the same day.

   This file is the single source of truth for all of it, and it is loaded by
   both the public quote form and Bryan's admin. Change a time here and it
   changes everywhere.
   ========================================================================== */
window.WAINWRIGHTS_SCHEDULE = {

  /* ---------------------------------------------------------------------
     The three slots. `key` is what goes in the database (0, 1, 2).
     --------------------------------------------------------------------- */
  slots: [
    { key: 0, label: 'Morning',   time: '8:00am – 11:00am' },
    { key: 1, label: 'Midday',    time: '11:00am – 2:00pm' },
    { key: 2, label: 'Afternoon', time: '2:00pm – 5:00pm' }
  ],

  /* Working days. 0 = Sunday … 6 = Saturday.
     Mon–Fri, matching the 8–5 business hours. The three slots below cover
     exactly that span, so the two never drift apart. */
  workingDays: [1, 2, 3, 4, 5],

  /* How far ahead a customer may book, and the earliest they may pick.
     Two days' notice keeps tomorrow free for Bryan to plan. */
  leadTimeDays: 2,
  horizonDays: 42,

  /* ---------------------------------------------------------------------
     Scope → how many 3-hour slots a job usually takes.

     These are the DEFAULT used to show the customer realistic availability.
     Bryan can change the real figure on any job from the admin — this only
     decides what gets offered up front.
     --------------------------------------------------------------------- */
  slotsForService: {
    'Handyman repairs':                  1,
    'Interior or exterior painting':     2,
    'Defensible space / fire clearing':  3,
    'Yard waste removal':                1,
    'Junk and debris hauling':           1,
    'Ongoing property watch and upkeep': 1,
    'Several of these':                  2,
    'Not sure yet':                      1
  },

  scopeNote: {
    1: 'About half a day',
    2: 'Most of a day',
    3: 'A full day'
  },

  /* ---------------------------------------------------------------------
     Helpers. Pure functions — no network, no DOM.
     --------------------------------------------------------------------- */

  slotsNeeded: function (service) {
    return this.slotsForService[service] || 1;
  },

  slotLabel: function (key) {
    var s = this.slots[key];
    return s ? s.label + ' (' + s.time + ')' : 'Slot ' + key;
  },

  /* A job starting at `start` and needing `n` slots occupies these. */
  span: function (start, n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(start + i);
    return out;
  },

  isWorkingDay: function (date) {
    return this.workingDays.indexOf(date.getDay()) !== -1;
  },

  /* YYYY-MM-DD in LOCAL time. `toISOString` would shift the date backwards
     for anyone west of UTC — which is everyone in California. */
  ymd: function (date) {
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() + '-' + m + '-' + d;
  },

  parseYmd: function (s) {
    var p = String(s).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  },

  prettyDate: function (s) {
    var d = typeof s === 'string' ? this.parseYmd(s) : s;
    return d.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  },

  /* ---------------------------------------------------------------------
     Which days can be offered at all, before considering bookings.
     --------------------------------------------------------------------- */
  candidateDays: function (fromDate) {
    var days = [];
    var d = new Date(fromDate || new Date());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + this.leadTimeDays);
    for (var i = 0; i < this.horizonDays; i++) {
      if (this.isWorkingDay(d)) days.push(this.ymd(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  },

  /* ---------------------------------------------------------------------
     Work out what is actually offerable.

     booked   : [{ day: '2026-09-22', slot: 1 }, …]  (from the database)
     blackouts: ['2026-09-25', …]                     (days Bryan is out)
     needed   : how many consecutive slots this job wants

     Returns [{ day, starts: [0, 2] }] — only days with at least one run of
     `needed` consecutive free slots, and only the slots a run can start at.
     --------------------------------------------------------------------- */
  availability: function (booked, blackouts, needed, fromDate) {
    var taken = {};
    (booked || []).forEach(function (b) {
      taken[b.day + '#' + b.slot] = true;
    });
    var out = [];
    var blocked = blackouts || [];
    var self = this;

    this.candidateDays(fromDate).forEach(function (day) {
      if (blocked.indexOf(day) !== -1) return;
      var starts = [];
      for (var s = 0; s + needed <= self.slots.length; s++) {
        var free = true;
        for (var i = 0; i < needed; i++) {
          if (taken[day + '#' + (s + i)]) { free = false; break; }
        }
        if (free) starts.push(s);
      }
      if (starts.length) out.push({ day: day, starts: starts });
    });
    return out;
  }
};
