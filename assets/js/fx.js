/* ==========================================================================
   Wainwrights — interaction layer

   Everything in here is polish: motion, feedback, shortcuts. site.js holds
   the things the site needs to function; this file holds the things that make
   it feel good. If it fails to load, nothing breaks — the site just gets
   quieter.

   All motion respects prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var doc = document.documentElement;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* One scroll listener for everything that cares about scrolling. */
  var scrollJobs = [];
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      var y = window.scrollY;
      for (var i = 0; i < scrollJobs.length; i++) scrollJobs[i](y);
      ticking = false;
    });
  }

  /* ----------------------------------------------------------------------
     Toast — small confirmations
     ---------------------------------------------------------------------- */
  var toastEl, toastTimer;
  function toast(msg) {
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
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-up'); }, 2800);
  }

  /* ----------------------------------------------------------------------
     Scroll progress bar + header that gets out of the way
     ---------------------------------------------------------------------- */
  function initChrome() {
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var header = $('.site-header');
    var lastY = window.scrollY;

    scrollJobs.push(function (y) {
      var max = doc.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';

      if (!header) return;
      var navOpen = document.body.classList.contains('nav-open');
      var goingDown = y > lastY;
      /* Only tuck away once well past the hero, and only on a real scroll —
         a few pixels of jitter should not make the header flap. */
      if (Math.abs(y - lastY) > 6) {
        var hide = goingDown && y > 420 && !navOpen;
        header.classList.toggle('is-hidden', hide);
        document.body.classList.toggle('header-hidden', hide);
        lastY = y;
      }
    });

    /* Keyboard users must never lose the header while tabbing through it. */
    if (header) {
      header.addEventListener('focusin', function () {
        header.classList.remove('is-hidden');
        document.body.classList.remove('header-hidden');
      });
    }
  }

  /* ----------------------------------------------------------------------
     Back to top, with a ring that shows how far down you are
     ---------------------------------------------------------------------- */
  function initToTop() {
    var btn = document.createElement('button');
    btn.className = 'to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });

    scrollJobs.push(function (y) {
      var max = doc.scrollHeight - window.innerHeight;
      btn.style.setProperty('--p', max > 0 ? (y / max).toFixed(3) : 0);
      btn.classList.toggle('is-on', y > 700);
    });
  }

  /* ----------------------------------------------------------------------
     Headline word rotator
     ---------------------------------------------------------------------- */
  function initRotator() {
    var box = $('.rotator');
    if (!box || reduce) return;
    var words = $$('.rot', box);
    if (words.length < 2) return;
    var i = 0;

    function next() {
      if (document.hidden) return;
      var cur = words[i];
      i = (i + 1) % words.length;
      var nxt = words[i];
      cur.classList.remove('is-on');
      cur.classList.add('is-out');
      nxt.classList.remove('is-out');
      nxt.classList.add('is-on');
      setTimeout(function () { cur.classList.remove('is-out'); }, 600);
    }
    setInterval(next, 2300);
  }

  /* ----------------------------------------------------------------------
     Count-up numbers
     ---------------------------------------------------------------------- */
  function initCounters() {
    var els = $$('[data-count]');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) return;   // markup already holds the final value

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target;
        var end = parseFloat(el.getAttribute('data-count'));
        var t0 = null, dur = 1300;
        function frame(t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * eased);
          if (p < 1) window.requestAnimationFrame(frame);
        }
        el.textContent = '0';
        window.requestAnimationFrame(frame);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     Stagger — siblings that reveal together arrive one after another
     ---------------------------------------------------------------------- */
  function initStagger() {
    $$('.grid, .gallery-grid, .stats').forEach(function (grid) {
      var kids = $$(':scope > .reveal', grid);
      if (kids.length < 2) return;
      kids.forEach(function (k, n) {
        if (!/\bd[1-4]\b/.test(k.className)) k.style.setProperty('--d', (n % 3) * 0.09 + 's');
      });
    });
  }

  /* ----------------------------------------------------------------------
     Card spotlight — a soft amber glow that follows the pointer
     ---------------------------------------------------------------------- */
  function initSpotlight() {
    if (!finePointer || reduce) return;
    $$('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ----------------------------------------------------------------------
     Lightbox — tap any work photo to see it properly
     ---------------------------------------------------------------------- */
  function initLightbox() {
    var shots = $$('.shot').filter(function (s) {
      var img = $('img', s);
      return img && !img.dataset.phDone;
    });
    if (!shots.length) return;

    var box, imgEl, capEl, countEl, idx = 0, lastFocus = null, items = [];

    function build() {
      box = document.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'Photo viewer');
      var ic = function (d) {
        return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
               'stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
      };
      box.innerHTML =
        '<button class="lb-btn lb-close" type="button" aria-label="Close">' + ic('<path d="M18 6 6 18M6 6l12 12"/>') + '</button>' +
        '<button class="lb-btn lb-prev" type="button" aria-label="Previous photo">' + ic('<path d="m15 18-6-6 6-6"/>') + '</button>' +
        '<button class="lb-btn lb-next" type="button" aria-label="Next photo">' + ic('<path d="m9 18 6-6-6-6"/>') + '</button>' +
        '<figure><img alt=""><figcaption></figcaption></figure>' +
        '<div class="lb-count" aria-hidden="true"></div>';
      document.body.appendChild(box);
      imgEl = $('img', box); capEl = $('figcaption', box); countEl = $('.lb-count', box);

      $('.lb-close', box).addEventListener('click', close);
      $('.lb-prev', box).addEventListener('click', function () { go(-1); });
      $('.lb-next', box).addEventListener('click', function () { go(1); });
      box.addEventListener('click', function (e) { if (e.target === box) close(); });

      /* Swipe */
      var x0 = null;
      box.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
      box.addEventListener('pointerup', function (e) {
        if (x0 === null) return;
        var dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      });

      document.addEventListener('keydown', function (e) {
        if (!box.classList.contains('is-open')) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') go(-1);
        else if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'Tab') {                       // keep focus inside
          var f = $$('button', box);
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }

    function show() {
      var it = items[idx];
      imgEl.classList.remove('is-ready');
      var pre = new Image();
      pre.onload = function () {
        imgEl.src = it.src; imgEl.alt = it.alt;
        window.requestAnimationFrame(function () { imgEl.classList.add('is-ready'); });
      };
      pre.src = it.src;
      capEl.textContent = it.cap;
      countEl.textContent = (idx + 1) + ' / ' + items.length;
    }

    function go(d) { idx = (idx + d + items.length) % items.length; show(); }

    function open(i) {
      if (!box) build();
      /* Only photos that actually loaded — a placeholder is not worth zooming. */
      items = shots.map(function (s) {
        var img = $('img', s), cap = $('.shot-cap', s);
        /* "ok" means "did not fail", not "has loaded": photos further down the
           page are lazy and may not have loaded yet, but they still belong in
           the carousel. */
        return { el: s, src: img.currentSrc || img.src, alt: img.alt, cap: cap ? cap.textContent.trim() : '', ok: !img.dataset.phDone };
      });
      var target = items[i];
      items = items.filter(function (it) { return it.ok; });
      idx = Math.max(0, items.indexOf(target));
      if (!items.length) return;

      lastFocus = document.activeElement;
      show();
      box.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      $('.lb-close', box).focus();
    }

    function close() {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    shots.forEach(function (s, i) {
      s.classList.add('is-zoomable');
      s.setAttribute('tabindex', '0');
      s.setAttribute('role', 'button');
      var cap = $('.shot-cap', s);
      s.setAttribute('aria-label', 'View larger: ' + (cap ? cap.textContent.trim() : 'photo'));
      s.addEventListener('click', function () { open(i); });
      s.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
      });
    });
  }

  /* ----------------------------------------------------------------------
     Phone links on a desktop: tel: usually does nothing useful there, so
     copy the number as well and say so.
     ---------------------------------------------------------------------- */
  function initPhoneCopy() {
    if (!finePointer || !navigator.clipboard) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="tel:"]');
      if (!a) return;
      var num = '(209) 456-1846';
      navigator.clipboard.writeText(num).then(function () {
        toast('Number copied — ' + num);
      }, function () { /* clipboard refused; the tel: link still fires */ });
    });
  }

  /* ----------------------------------------------------------------------
     FAQ — animate open and closed instead of snapping
     ---------------------------------------------------------------------- */
  function initFaq() {
    if (reduce) return;
    $$('.faq details').forEach(function (d) {
      var sum = $('summary', d), body = $('.faq-body', d);
      if (!sum || !body || !body.animate) return;
      var running = null;

      sum.addEventListener('click', function (e) {
        e.preventDefault();
        if (running) running.cancel();

        if (d.open) {
          var h = body.offsetHeight;
          running = body.animate(
            [{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
            { duration: 260, easing: 'cubic-bezier(.22,.61,.36,1)' });
          running.onfinish = function () { d.open = false; running = null; };
        } else {
          d.open = true;
          var h2 = body.offsetHeight;
          running = body.animate(
            [{ height: '0px', opacity: 0 }, { height: h2 + 'px', opacity: 1 }],
            { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
          running.onfinish = function () { running = null; };
        }
      });
    });
  }

  /* ----------------------------------------------------------------------
     Form feedback — each field says how it is going, as you go
     ---------------------------------------------------------------------- */
  var RULES = {
    name:  function (v) { return v.trim().length >= 2 ? '' : 'Please add your name so Bryan knows who to ask for.'; },
    phone: function (v) {
      var digits = v.replace(/\D/g, '');
      return digits.length >= 10 ? '' : 'That looks short — a 10-digit number, area code first.';
    },
    email: function (v) {
      if (!v.trim()) return '';                                  // optional
      return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v.trim()) ? '' : 'That email address does not look quite right.';
    }
  };

  function checkField(input, quiet) {
    var rule = RULES[input.name];
    if (!rule) return true;
    var field = input.closest('.field');
    if (!field) return true;
    var msg = rule(input.value);

    var err = $('.field-error', field);
    if (!err) {
      err = document.createElement('p');
      err.className = 'field-error';
      err.id = input.id + '-error';
      field.appendChild(err);
      input.setAttribute('aria-describedby', err.id);
    }
    err.textContent = msg;

    var filled = input.value.trim() !== '';
    field.classList.toggle('is-invalid', !!msg && !quiet);
    field.classList.toggle('is-valid', !msg && filled);
    input.setAttribute('aria-invalid', msg && !quiet ? 'true' : 'false');
    return !msg;
  }

  /* (209) 555-0000 as they type. Older eyes check a formatted number faster. */
  function formatPhone(input) {
    var d = input.value.replace(/\D/g, '').slice(0, 10);
    var out = d;
    if (d.length > 6)      out = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    else if (d.length > 3) out = '(' + d.slice(0, 3) + ') ' + d.slice(3);
    else if (d.length > 0) out = '(' + d;
    input.value = out;
  }

  function initForms() {
    $$('form[data-estimate]').forEach(function (form) {
      $$('input, textarea', form).forEach(function (input) {
        if (!RULES[input.name]) return;
        input.addEventListener('blur', function () { checkField(input, false); });
        input.addEventListener('input', function () {
          if (input.name === 'phone') formatPhone(input);
          /* While typing, only ever clear an error — never raise a new one
             mid-word. Nagging someone before they finish is just rude. */
          var field = input.closest('.field');
          if (field && field.classList.contains('is-invalid')) checkField(input, false);
          else checkField(input, true);
        });
      });
    });
  }

  /* Called by site.js on submit. Returns true when the form may go. */
  function validate(form) {
    var ok = true, firstBad = null;
    $$('input, textarea', form).forEach(function (input) {
      if (!RULES[input.name]) return;
      if (!checkField(input, false)) { ok = false; if (!firstBad) firstBad = input; }
    });
    if (!ok) {
      var btn = $('[type="submit"]', form);
      if (btn && !reduce) {
        btn.classList.remove('is-shaking');
        void btn.offsetWidth;                                   // restart the animation
        btn.classList.add('is-shaking');
      }
      if (firstBad) firstBad.focus();
      toast('Nearly there — check the highlighted boxes.');
    }
    return ok;
  }

  /* ----------------------------------------------------------------------
     Services jump bar — highlights the section you are reading
     ---------------------------------------------------------------------- */
  function initJumpbar() {
    var bar = $('.jumpbar');
    if (!bar) return;
    var links = $$('a[href^="#"]', bar);
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });

    /* On a phone a row of ten long labels is a hidden sideways scroll: you see
       a label and a half and no sign there is more. Build a picker from the
       same links instead — one tap, everything visible. CSS decides which of
       the two is shown at which width, so there is one list to keep right. */
    var picker = null;
    if (links.length > 3 && !$('.jump-select', bar)) {
      picker = document.createElement('select');
      picker.className = 'jump-select';
      picker.setAttribute('aria-label', 'Jump to a section');
      picker.innerHTML = '<option value="">Jump to a section&hellip;</option>' +
        links.map(function (a) {
          return '<option value="' + a.getAttribute('href') + '">' + a.textContent.trim() + '</option>';
        }).join('');
      picker.addEventListener('change', function () {
        var id = picker.value.slice(1);
        var sec = id && document.getElementById(id);
        if (!sec) return;
        sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', picker.value);
      });
      (bar.querySelector('.jumpbar-inner') || bar).parentNode.insertBefore(picker, bar.querySelector('.jumpbar-inner'));
    }

    /* Chips are nicer when they fit on one line. The moment they would wrap —
       ten long section names, or a narrow window — the picker takes over. */
    function chooseForm() {
      var inner = bar.querySelector('.jumpbar-inner');
      if (!inner || !picker) return;
      bar.classList.remove('jumpbar--picker');
      var oneRow = inner.firstElementChild ? inner.firstElementChild.offsetHeight + 24 : 68;
      if (getComputedStyle(inner).display !== 'none' && inner.offsetHeight > oneRow) {
        bar.classList.add('jumpbar--picker');
      }
    }
    chooseForm();
    var reflow;
    window.addEventListener('resize', function () {
      clearTimeout(reflow);
      reflow = setTimeout(chooseForm, 150);
    }, { passive: true });

    if (!('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('is-active'); });
        var a = map[en.target.id];
        if (a) {
          a.classList.add('is-active');
          /* Keep the active pill in view where the row still scrolls. */
          var inner = a.parentNode;
          if (inner.scrollWidth > inner.clientWidth) {
            var target = a.offsetLeft - (inner.clientWidth - a.offsetWidth) / 2;
            inner.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' });
          }
          if (picker) picker.value = '#' + en.target.id;   // the picker follows along
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });

    Object.keys(map).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) io.observe(sec);
    });
  }

  /* ----------------------------------------------------------------------
     Checklist extras — per-zone tallies, and a moment of celebration at 100%
     ---------------------------------------------------------------------- */
  function initChecklistFx() {
    var root = document.getElementById('dst');
    if (!root) return;
    var boxes = $$('.dst-item input[type="checkbox"]', root);
    if (!boxes.length) return;

    var tallies = {};
    $$('.zone', root).forEach(function (zone) {
      var head = $('.zone-head', zone);
      var first = $('input[data-zone]', zone);
      if (!head || !first) return;
      var t = document.createElement('span');
      t.className = 'zone-tally';
      t.setAttribute('aria-hidden', 'true');
      head.appendChild(t);
      tallies[first.getAttribute('data-zone')] = t;
    });

    var wasComplete = boxes.every(function (b) { return b.checked; });

    function update(fromUser) {
      var by = {};
      boxes.forEach(function (b) {
        var z = b.getAttribute('data-zone');
        by[z] = by[z] || { done: 0, total: 0 };
        by[z].total++; if (b.checked) by[z].done++;
      });
      Object.keys(tallies).forEach(function (z) {
        var s = by[z]; if (!s) return;
        tallies[z].textContent = s.done + ' / ' + s.total;
        tallies[z].classList.toggle('is-done', s.done === s.total);
      });

      var complete = boxes.every(function (b) { return b.checked; });
      if (fromUser && complete && !wasComplete) celebrate();
      wasComplete = complete;
    }

    function celebrate() {
      toast('Every item done. That is a well-defended property.');
      if (reduce) return;
      var dial = $('.dst-dial', root);
      var r = dial ? dial.getBoundingClientRect()
                   : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var colours = ['#FAA90D', '#2D5A93', '#0D1723', '#F09C00', '#8FB0D6'];
      for (var i = 0; i < 28; i++) {
        var p = document.createElement('i');
        p.className = 'burst';
        var ang = (Math.PI * 2 * i) / 28 + Math.random() * 0.4;
        var dist = 90 + Math.random() * 130;
        p.style.left = cx + 'px'; p.style.top = cy + 'px';
        p.style.background = colours[i % colours.length];
        p.style.setProperty('--bx', Math.cos(ang) * dist + 'px');
        p.style.setProperty('--by', Math.sin(ang) * dist + 40 + 'px');
        p.style.setProperty('--br', (Math.random() * 720 - 360) + 'deg');
        document.body.appendChild(p);
        (function (node) { setTimeout(function () { node.remove(); }, 1200); })(p);
      }
    }

    root.addEventListener('change', function (e) {
      if (e.target && e.target.matches('input[type="checkbox"]')) update(true);
    });
    var reset = $('.dst-reset', root);
    if (reset) reset.addEventListener('click', function () { setTimeout(function () { update(false); }, 0); });
    update(false);
  }

  /* ---------------------------------------------------------------------- */
  function boot() {
    initChrome();
    initToTop();
    initRotator();
    initCounters();
    initStagger();
    initSpotlight();
    initLightbox();
    initPhoneCopy();
    initFaq();
    initForms();
    initJumpbar();
    initChecklistFx();

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  window.WFx = { validate: validate, toast: toast };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
