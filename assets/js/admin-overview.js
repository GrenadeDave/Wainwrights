/* ==========================================================================
   Admin Overview (2026-10-04, D41)
   Four cards, the 12-week graph, recent reviews, "Needs you" and the next 4
   weeks — all from the one admin_dashboard() call the shell already made
   (WAdmin.dashboard()). Money here is always ESTIMATES: real payments stay
   on Bryan's phone.
   ========================================================================== */
(function (w, d) {
  'use strict';
  var P = w.WPortal, A = w.WAdmin;
  var root = d.getElementById('root');
  var data = null, mode = 'jobs', tab = 'all';

  var KIND = { request: 'New request', estimate: 'Estimate, no answer', review: 'Done — ask for a review' };

  function esc(s) { return P.esc(s == null ? '' : String(s)); }
  function dollars(c) { return '$' + Math.round((c || 0) / 100).toLocaleString('en-US'); }
  function day(iso, opts) { return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric' }); }
  function age(hours) {
    var h = Math.max(0, Math.floor(hours || 0));
    if (h < 1) return 'under an hour';
    if (h < 24) return h + (h === 1 ? ' hour' : ' hours');
    var n = Math.floor(h / 24); return n + (n === 1 ? ' day' : ' days');
  }
  function since(iso) { return age((Date.now() - new Date(iso).getTime()) / 36e5); }

  function card(label, value, sub, href) {
    var inner = '<span class="ov-k-label">' + label + '</span><b class="ov-k-value">' + value + '</b>' +
                '<span class="ov-k-sub">' + sub + '</span>';
    return href ? '<a class="ov-card ov-k" href="' + href + '">' + inner + '</a>'
                : '<div class="ov-card ov-k">' + inner + '</div>';
  }

  function cards(x) {
    var r = x.requests, wk = x.week, e = x.estimates, wn = x.win;
    var change = e.last_month_cents > 0
      ? Math.round((e.this_month_cents - e.last_month_cents) * 100 / e.last_month_cents) : null;
    var decided = (wn.won || 0) + (wn.lost || 0);
    return '<section class="ov-kpis" aria-label="At a glance">' +
      card('Requests waiting', r.waiting,
        r.waiting ? '<span class="' + (r.oldest_hours >= 24 ? 'ov-bad' : 'ov-warn') + '">oldest ' + age(r.oldest_hours) + '</span>'
                  : '<span class="ov-good">No requests waiting</span>',
        'index.html?f=requested') +
      card('This week', wk.booked + ' / ' + wk.capacity,
        '<span class="ov-good">' + Math.max(0, wk.capacity - wk.booked) + ' slots free</span>', 'schedule.html') +
      card('Estimates booked · ' + day(x.today, { month: 'short' }), dollars(e.this_month_cents),
        change == null ? 'none booked last month'
          : '<span class="' + (change >= 0 ? 'ov-good' : 'ov-bad') + '">' + (change >= 0 ? '▲ ' : '▼ ') + Math.abs(change) + '%</span> vs last month',
        'index.html?f=scheduled') +
      card('Estimate win rate · 30 days', decided ? Math.round(wn.won * 100 / decided) + '%' : '—',
        decided ? wn.won + ' of ' + decided + ' said go ahead' + (wn.avg_cents ? ' · avg ' + dollars(wn.avg_cents) : '')
                : 'no estimates decided yet', null) +
    '</section>';
  }

  function graph(weeks) {
    var W = 600, H = 220, L = 46, R = 588, T = 14, B = 186, n = weeks.length;
    var money = mode === 'money';
    var a = weeks.map(function (x) { return money ? Math.round(x.booked_cents / 100) : x.requests; });
    var b = money ? null : weeks.map(function (x) { return x.booked; });
    var top = Math.max.apply(null, a.concat(b || []).concat([money ? 100 : 4]));
    var step = Math.pow(10, Math.floor(Math.log10(top)));
    top = Math.ceil(top / step) * step;
    function X(i) { return L + (R - L) * i / Math.max(1, n - 1); }
    function Y(v) { return B - (B - T) * v / top; }
    function line(vals) { return vals.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' '); }
    var grid = [0, 0.5, 1].map(function (f) {
      var v = top * f, y = Y(v).toFixed(1);
      return '<line x1="' + L + '" y1="' + y + '" x2="' + R + '" y2="' + y + '"/>' +
             '<text x="' + (L - 8) + '" y="' + (+y + 4) + '" text-anchor="end">' +
               (money ? (v >= 1000 ? '$' + (v / 1000) + 'k' : '$' + Math.round(v)) : Math.round(v)) + '</text>';   // short, to fit on phones
    }).join('');
    var ticks = [0, Math.floor((n - 1) / 2), n - 1].map(function (i) {
      return '<text x="' + X(i).toFixed(1) + '" y="' + (B + 22) + '" text-anchor="' +
             (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '">' + day(weeks[i].week) + '</text>';
    }).join('');
    var area = line(a) + ' L' + X(n - 1).toFixed(1) + ' ' + B + ' L' + L + ' ' + B + ' Z';
    var summary = money
      ? 'Estimated value booked per week over the last 12 weeks went from ' + dollars(weeks[0].booked_cents) + ' to ' + dollars(weeks[n - 1].booked_cents) + '.'
      : 'Over the last 12 weeks, requests per week went from ' + a[0] + ' to ' + a[n - 1] + ', and jobs booked per week from ' + b[0] + ' to ' + b[n - 1] + '.';
    var table = '<table class="adm-sr"><caption>' + (money ? 'Estimated $ booked per week' : 'Requests and booked jobs per week') + '</caption>' +
      '<tr><th>Week of</th><th>' + (money ? 'Estimated $' : 'Requests') + '</th>' + (b ? '<th>Booked</th>' : '') + '</tr>' +
      weeks.map(function (x, i) {
        return '<tr><td>' + day(x.week) + '</td><td>' + (money ? dollars(x.booked_cents) : a[i]) + '</td>' + (b ? '<td>' + b[i] + '</td>' : '') + '</tr>';
      }).join('') + '</table>';
    return '<svg class="ov-graph" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(summary) + '">' +
        '<defs><linearGradient id="ov-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EE6424" stop-opacity=".45"/>' +
        '<stop offset="1" stop-color="#EE6424" stop-opacity="0"/></linearGradient></defs>' +
        '<g class="ov-grid">' + grid + '</g><path d="' + area + '" fill="url(#ov-fill)"/>' +
        '<path class="ov-line-a" d="' + line(a) + '"/>' + (b ? '<path class="ov-line-b" d="' + line(b) + '"/>' : '') +
        '<g class="ov-ticks">' + ticks + '</g></svg>' +
      '<div class="ov-legend"><span><i class="ov-sw-a"></i>' + (money ? 'Estimated $ booked' : 'Requests') + '</span>' +
        (b ? '<span><i class="ov-sw-b"></i>Booked</span>' : '') + '</div>' + table;
  }

  function graphCard(x) {
    return '<section class="ov-card ov-graph-card" aria-labelledby="ov-g-h">' +
      '<h2 class="ov-h" id="ov-g-h">' + (mode === 'money' ? 'Estimated value booked' : 'Requests vs booked jobs') +
        '<span class="ov-seg" role="group" aria-label="Show">' +
          '<button type="button" data-mode="jobs" aria-pressed="' + (mode === 'jobs') + '">Jobs</button>' +
          '<button type="button" data-mode="money" aria-pressed="' + (mode === 'money') + '">Estimated $</button>' +
        '</span></h2>' + graph(x.weekly) + '</section>';
  }

  function reviewsCard(x) {
    var r = x.reviews;
    var head = r.count ? 'avg ' + r.avg + ' ★ · ' + r.count : '';
    return '<section class="ov-card ov-reviews" aria-labelledby="ov-r-h">' +
      '<h2 class="ov-h" id="ov-r-h">Recent reviews <span class="ov-h-note">' + head + '</span></h2>' +
      (r.latest.length ? r.latest.map(function (v) {
        return '<div class="ov-rev"><span class="ov-stars" aria-label="' + v.rating + ' out of 5 stars">' +
          '★★★★★'.slice(0, v.rating || 0) + '</span> <small>· ' + since(v.published_at) + ' ago</small>' +
          '<p>“' + esc(v.body) + (v.body && v.body.length >= 140 ? '…' : '') + '”</p>' +
          '<small>' + esc(v.name) + (v.town ? ' · ' + esc(v.town) : '') + '</small></div>';
      }).join('') : '<p class="ov-empty">No reviews yet.</p>') +
      (r.pending ? '<a class="ov-pending" href="reviews.html"><span class="ov-tag ov-tag--request">' + r.pending + ' waiting</span> ' +
                   (r.pending === 1 ? 'review' : 'reviews') + ' to approve</a>' : '') +
    '</section>';
  }

  function needsCard(x) {
    var list = x.needs.filter(function (n) { return tab === 'all' || n.kind === tab; });
    var count = function (k) { return x.needs.filter(function (n) { return n.kind === k; }).length; };
    var tabs = [['all', 'All ' + x.needs.length], ['request', 'Requests ' + count('request')],
                ['estimate', 'Estimates ' + count('estimate')], ['review', 'Ask for review ' + count('review')]];
    return '<section class="ov-card ov-needs-card" aria-labelledby="ov-n-h">' +
      '<h2 class="ov-h" id="ov-n-h">Needs you</h2>' +
      '<div class="ov-seg ov-tabs" role="group" aria-label="Filter">' + tabs.map(function (t) {
        return '<button type="button" data-tab="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      (list.length ? '<ul class="ov-needs">' + list.map(function (n) {
        var hours = (Date.now() - new Date(n.since).getTime()) / 36e5;
        var cls = n.kind === 'request' ? (hours >= 24 ? 'ov-bad' : 'ov-warn') : n.kind === 'estimate' ? 'ov-warn' : '';
        return '<li><a href="job.html?id=' + encodeURIComponent(n.job_id) + '">' + esc(n.name) +
            '<small>' + esc(n.service) + (n.value_cents != null ? ' · ' + dollars(n.value_cents) : '') +
            (n.town ? ' · ' + esc(n.town) : '') + '</small></a>' +
          '<span class="ov-tag ov-tag--' + n.kind + '">' + KIND[n.kind] + '</span>' +
          '<span class="ov-wait ' + cls + '">' + since(n.since) + '</span>' +
          (n.kind === 'review' ? '<button type="button" class="ov-asked" data-asked="' + esc(n.job_id) + '">Mark asked</button>' : '') +
        '</li>';
      }).join('') + '</ul>'
      : '<p class="ov-empty">' + (x.needs.length ? 'Nothing in this list.' : 'Nothing needs you right now 👍') + '</p>') +
    '</section>';
  }

  function daysCard(x) {
    var today = x.today;
    return '<section class="ov-card ov-days-card" aria-labelledby="ov-d-h">' +
      '<h2 class="ov-h" id="ov-d-h">Next 4 weeks</h2>' +
      '<div class="ov-heat-head" aria-hidden="true"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span></div>' +
      '<ol class="ov-heat" aria-label="Next 20 workdays">' + x.days.map(function (v, i) {
        var lead = i === 0 ? '<li class="ov-pad" aria-hidden="true"></li>'.repeat((new Date(v.day + 'T12:00:00').getDay() + 6) % 7) : '';
        var label = day(v.day, { weekday: 'short', month: 'short', day: 'numeric' }) + ': ' +
                    (v.off ? 'day off' : v.used + ' of 3 slots booked');
        return lead + '<li class="' + (v.off ? 'off' : 'u' + v.used) + (v.day === today ? ' is-today' : '') +
               '" title="' + label + '"><span class="adm-sr">' + label + '</span></li>';
      }).join('') + '</ol>' +
      '<div class="ov-legend"><span><i class="ov-u0"></i>Free</span><span><i class="ov-u1"></i>1 slot</span>' +
        '<span><i class="ov-u2"></i>2</span><span><i class="ov-u3"></i>Full</span><span><i class="ov-off"></i>Day off</span></div>' +
      '<p class="ov-note">' + (x.next_free_day ? 'Next free day: <b>' + day(x.next_free_day, { weekday: 'short', month: 'short', day: 'numeric' }) + '</b>'
                                              : 'No free day in the next 4 weeks') +
        (x.near_limit ? ' · <a href="index.html?f=scheduled">' + x.near_limit + (x.near_limit === 1 ? ' job' : ' jobs') + ' near the $1,000 limit</a>' : '') +
      '</p></section>';
  }

  function paint() {
    var hello = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
    root.innerHTML =
      '<div class="ov">' +
        '<header class="ov-head"><h1>' + hello + '</h1><p>' + day(data.today, { weekday: 'long', month: 'long', day: 'numeric' }) + '</p></header>' +
        cards(data) + graphCard(data) + reviewsCard(data) + needsCard(data) + daysCard(data) +
      '</div>';
    root.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { mode = b.dataset.mode; paint(); });
    });
    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { tab = b.dataset.tab; paint(); });
    });
    root.querySelectorAll('[data-asked]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var jobId = b.dataset.asked;
        b.disabled = true;
        var r = await P.client().rpc('admin_mark_review_asked', { p_job: jobId, p_asked: true });
        if (r.error) { b.disabled = false; P.toast('Could not save that: ' + r.error.message); return; }
        data.needs = data.needs.filter(function (n) { return !(n.kind === 'review' && n.job_id === jobId); });
        P.toast('Marked as asked');
        paint();
      });
    });
  }

  async function load(fresh) {
    root.innerHTML = '<p class="ov-loading"><span class="adm-spin" aria-hidden="true"></span> Adding up the week…</p>';
    var r = await A.dashboard(fresh);
    if (r.error || !r.data) {
      root.innerHTML = '<div class="ov-card ov-error" role="alert"><h2>Couldn’t load the overview</h2>' +
        '<p>' + esc(r.error ? r.error.message : 'No data came back.') + '</p>' +
        '<button type="button" class="btn btn-outline" id="ov-retry">Retry</button></div>';
      d.getElementById('ov-retry').addEventListener('click', function () { load(true); });
      return;
    }
    data = r.data;
    if (fresh) A.paintBadges(data);
    paint();
  }

  (async function () {
    if (!P.ready()) { root.innerHTML = P.notConfiguredHtml(); return; }
    var session = await P.requireSession('../portal/login.html');
    if (!session) return;
    var profile = await P.profile();
    if (!profile || !profile.is_admin) {
      root.innerHTML = '<div class="portal-empty"><h2>This page is Bryan’s</h2>' +
        '<p>Your account does not have admin access.</p>' +
        '<a class="btn btn-outline" href="../portal/index.html">Go to your own jobs</a></div>';
      return;
    }
    load(false);
  })();
})(window, document);
