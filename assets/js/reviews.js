/* ==========================================================================
   Wainwrights — reviews on the public site

   Two jobs:
     1. Show the reviews Bryan has published, with a thumbs up on each.
     2. Take a new one from the form on review.html.

   Nothing here can publish anything. New reviews arrive as "waiting" and only
   appear once Bryan has read them, so the home page can never be sprayed with
   whatever a stranger types. Reading goes straight to the database with the
   public key (the rules only ever hand back published ones); writing and
   voting go through the `reviews` server function, which holds the limits.
   ========================================================================== */
(function (w, d) {
  'use strict';
  var CFG = w.WAINWRIGHTS_SUPABASE || {};
  var VOTED = 'w-voted';                       // remembers this browser's votes

  function ready() { return !!(CFG.url && CFG.anonKey); }
  function endpoint(path) { return CFG.url + '/functions/v1/reviews' + (path || ''); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function voted() {
    try { return JSON.parse(w.localStorage.getItem(VOTED) || '[]'); } catch (e) { return []; }
  }
  function remember(id) {
    try {
      var all = voted(); all.push(id);
      w.localStorage.setItem(VOTED, JSON.stringify(all.slice(-200)));
    } catch (e) {}
  }
  function stars(n) {
    if (!n) return '';
    var out = '<span class="stars" aria-label="' + n + ' out of 5">';
    for (var i = 1; i <= 5; i++) out += '<span' + (i <= n ? '' : ' class="off"') + '>&#9733;</span>';
    return out + '</span>';
  }
  function when(iso) {
    var dte = new Date(iso);
    return isNaN(dte) ? '' : dte.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  /* ------------------------------------------------------------- showing */
  async function load(box) {
    if (!ready()) { box.innerHTML = ''; return; }
    var url = CFG.url + '/rest/v1/reviews' +
      '?select=id,name,town,body,rating,upvotes,published_at' +
      '&status=eq.published&order=upvotes.desc,published_at.desc&limit=12';
    var rows = [];
    try {
      var res = await fetch(url, { headers: { apikey: CFG.anonKey } });
      if (res.ok) rows = await res.json();
    } catch (e) { /* offline: the invitation below still makes sense */ }

    var mine = voted();
    if (!rows.length) {
      box.innerHTML =
        '<div class="review-empty">' +
          '<h3>No reviews here yet</h3>' +
          '<p>Bryan is only just putting this page up. If he has done work for you, ' +
          'yours would be the first — and the one everyone else reads.</p>' +
        '</div>';
      return;
    }

    box.innerHTML = rows.map(function (r) {
      var did = mine.indexOf(r.id) !== -1;
      return '<article class="quote-card review-card">' +
        (r.rating ? stars(r.rating) : '') +
        '<p>' + esc(r.body) + '</p>' +
        '<div class="quote-who">' +
          '<span class="av">' + esc((r.name || '?').trim().charAt(0).toUpperCase()) + '</span>' +
          '<span><b>' + esc(r.name) + '</b><span>' + esc([r.town, when(r.published_at)].filter(Boolean).join(' · ')) + '</span></span>' +
          '<button class="thumb' + (did ? ' is-done' : '') + '" type="button" data-up="' + esc(r.id) + '"' +
            (did ? ' disabled aria-label="You found this helpful"' : ' aria-label="This was helpful"') + '>' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M7 22V11l5-9a2.5 2.5 0 0 1 2.4 3.2L13.5 9H19a2 2 0 0 1 2 2.4l-1.6 7A2 2 0 0 1 17.4 20H7z"/><path d="M7 11H3v11h4"/></svg>' +
            '<span class="thumb-n">' + (r.upvotes || 0) + '</span>' +
          '</button>' +
        '</div>' +
      '</article>';
    }).join('');

    box.querySelectorAll('[data-up]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var id = b.dataset.up;
        b.disabled = true; b.classList.add('is-done');
        var n = b.querySelector('.thumb-n');
        n.textContent = Number(n.textContent || 0) + 1;      // answer the tap at once
        remember(id);
        try {
          var res = await fetch(endpoint('/upvote'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
          });
          var j = await res.json();
          if (typeof j.upvotes === 'number') n.textContent = j.upvotes;
        } catch (e) { /* the count is right on the next load either way */ }
      });
    });
  }

  /* -------------------------------------------------------------- giving */
  function form(f) {
    var status = f.querySelector('.form-status');
    var rating = 0;

    f.querySelectorAll('[data-star]').forEach(function (b) {
      b.addEventListener('click', function () {
        rating = Number(b.dataset.star);
        f.querySelectorAll('[data-star]').forEach(function (o) {
          o.classList.toggle('is-on', Number(o.dataset.star) <= rating);
          o.setAttribute('aria-checked', String(Number(o.dataset.star) === rating));
        });
      });
    });

    function say(msg, ok) {
      status.innerHTML = msg;
      status.classList.add('is-visible');
      status.style.background  = ok === false ? 'var(--fire-050)' : 'var(--sage-050)';
      status.style.borderColor = ok === false ? '#E8C0B6' : 'var(--sage-200)';
      status.style.color       = ok === false ? 'var(--fire)' : 'var(--moss-800)';
    }

    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = f.querySelector('[type=submit]');
      var name = f.elements.name.value.trim();
      var body = f.elements.body.value.trim();
      if (name.length < 2) return say('Please put your name.', false);
      if (body.length < 15) return say('Please write a sentence or two about the work.', false);
      if (!ready()) return say('This is not connected yet. Please call Bryan on <a href="tel:+12094561846">(209) 456-1846</a>.', false);

      btn.disabled = true; btn.textContent = 'Sending…';
      var res, j = {};
      try {
        res = await fetch(endpoint(''), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name, town: f.elements.town.value.trim(), body: body,
            rating: rating || null, company: f.elements.company.value
          })
        });
        j = await res.json();
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Send my review';
        return say('That did not send. Check your connection, or call Bryan on <a href="tel:+12094561846">(209) 456-1846</a>.', false);
      }
      btn.disabled = false; btn.textContent = 'Send my review';
      if (!res.ok || j.error) return say(esc(j.error || 'That did not send.'), false);

      f.querySelector('.review-fields').hidden = true;
      btn.hidden = true;
      say('<strong>Thank you.</strong><br>Bryan reads every review himself before it goes up, so give him a day or two.');
    });
  }

  d.addEventListener('DOMContentLoaded', function () {
    var box = d.querySelector('[data-reviews]');
    if (box) load(box);
    var f = d.getElementById('review-form');
    if (f) form(f);
  });
})(window, document);
