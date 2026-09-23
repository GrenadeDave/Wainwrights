/* ==========================================================================
   Wainwright’s — the quote form's "when would suit you?" picker
   --------------------------------------------------------------------------
   Reads real availability from the database (which slots are already taken,
   which days Bryan is out) and offers only what is genuinely free.

   If the portal is not connected, the whole block stays hidden and the form
   behaves exactly as it did before — a plain email. That matters: the site
   has to keep working on a static host with no backend.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.WAINWRIGHTS_SCHEDULE;
  var P = window.WPortal;
  if (!S || !P || !P.configured()) return;         // stays hidden, form still works

  var field   = document.getElementById('slot-field');
  var picker  = document.getElementById('slot-picker');
  var scope   = document.getElementById('slot-scope');
  var dayIn   = document.getElementById('f-day');
  var slotIn  = document.getElementById('f-slot');
  var service = document.getElementById('f-service');
  if (!field || !picker || !service) return;

  var booked = [];
  var blackouts = [];
  var chosen = null;          // { day, slot }
  var showAll = false;

  function esc(s) { return P.esc(s); }

  /* ---------------------------------------------------------------------- */
  async function load() {
    var from = S.earliest();
    var to = new Date(from);
    to.setDate(to.getDate() + S.horizonDays);

    var c = P.client();
    var args = { from_day: S.ymd(from), to_day: S.ymd(to) };

    var res = await Promise.all([
      c.rpc('booked_slots', args),
      c.rpc('blackout_days', args)
    ]);

    /* If availability cannot be read we hide the picker rather than showing
       times that might already be taken. A wrong slot is worse than none. */
    if (res[0].error || res[1].error) {
      if (window.console) console.warn('availability unavailable', res[0].error || res[1].error);
      return;
    }

    booked    = res[0].data || [];
    blackouts = (res[1].data || []).map(function (b) { return b.day; });
    field.hidden = false;
    render();
  }

  /* ---------------------------------------------------------------------- */
  function render() {
    var needed = S.slotsNeeded(service.value);
    var days   = S.availability(booked, blackouts, needed, new Date());

    scope.textContent =
      (S.scopeNote[needed] || '') +
      ' — a job like this usually needs ' + needed +
      (needed === 1 ? ' of the 3-hour slots.' : ' of the 3-hour slots back to back.');

    if (!days.length) {
      picker.innerHTML =
        '<p class="slot-none">Nothing free in the next few weeks. Send the request anyway ' +
        'and Bryan will call you with the first opening.</p>';
      clear();
      return;
    }

    /* Keep the first pass short — a wall of forty dates is not a choice,
       it is a chore. */
    var shown = showAll ? days : days.slice(0, 6);

    picker.innerHTML = shown.map(function (d) {
      return '<div class="slot-day">' +
        '<div class="slot-date">' + esc(S.prettyDate(d.day)) + '</div>' +
        '<div class="slot-times">' +
          d.starts.map(function (s) {
            var on = chosen && chosen.day === d.day && chosen.slot === s;
            var end = s + needed - 1;
            var time = needed === 1
              ? S.slots[s].time
              : S.slots[s].time.split('–')[0].trim() + ' – ' + S.slots[end].time.split('–')[1].trim();
            return '<button type="button" class="slot-btn' + (on ? ' is-on' : '') + '" ' +
                   'data-day="' + esc(d.day) + '" data-slot="' + s + '" ' +
                   'aria-pressed="' + (on ? 'true' : 'false') + '">' +
                     '<b>' + esc(S.slots[s].label) + '</b>' +
                     '<span>' + esc(time) + '</span>' +
                   '</button>';
          }).join('') +
        '</div>' +
      '</div>';
    }).join('') +
    (days.length > 6 && !showAll
      ? '<button type="button" class="slot-more" id="slot-more">Show more dates (' + (days.length - 6) + ')</button>'
      : '') +
    '<button type="button" class="slot-more" id="slot-any">' +
      (chosen ? 'Clear my choice' : 'I don’t mind — whatever suits Bryan') +
    '</button>';

    picker.querySelectorAll('.slot-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        chosen = { day: b.dataset.day, slot: +b.dataset.slot };
        sync();
        render();
      });
    });

    var more = document.getElementById('slot-more');
    if (more) more.addEventListener('click', function () { showAll = true; render(); });

    document.getElementById('slot-any').addEventListener('click', function () {
      chosen = null; sync(); render();
    });
  }

  function sync() {
    dayIn.value  = chosen ? chosen.day : '';
    slotIn.value = chosen ? String(chosen.slot) : '';
  }

  function clear() { chosen = null; sync(); }

  /* Scope changes with the service, so the offer has to be recomputed. */
  service.addEventListener('change', function () {
    chosen = null; sync();
    if (!field.hidden) render();
  });

  load();
})();
