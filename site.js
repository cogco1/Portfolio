/* Kaiwen Liu — site interactions: lightbox (with prev/next), hero carousel, mobile nav, contact, copy */
(function () {
  /* ---- Lightbox with up/down navigation ---- */
  var lb = document.createElement('div');
  lb.id = 'lb';
  lb.innerHTML =
    '<button class="lb-arrow lb-up" type="button" aria-label="Previous 上一张">↑</button>' +
    '<span class="lb-close">CLOSE ✕</span>' +
    '<img id="lb-img" alt="">' +
    '<button class="lb-arrow lb-down" type="button" aria-label="Next 下一张">↓</button>';

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(lb);
    trimNavForMobile();
    heroCarousel();
    heroScroll();
    siteLanguage();
  });

  var imgEl = lb.querySelector('#lb-img');
  var upBtn = lb.querySelector('.lb-up');
  var downBtn = lb.querySelector('.lb-down');
  var zoomList = [];
  var lbIdx = 0;

  function refreshArrows() {
    upBtn.style.display = (lbIdx <= 0) ? 'none' : 'flex';
    downBtn.style.display = (lbIdx >= zoomList.length - 1) ? 'none' : 'flex';
  }
  function openAt(i) {
    if (i < 0 || i >= zoomList.length) return;
    lbIdx = i;
    var el = zoomList[i];
    imgEl.src = el.currentSrc || el.src;
    lb.classList.add('on');
    document.body.style.overflow = 'hidden';
    refreshArrows();
  }
  function closeLb() { lb.classList.remove('on'); document.body.style.overflow = ''; }

  document.addEventListener('click', function (e) {
    var t = e.target;
    /* Any mailto link -> clean Contact page (no mail-client popup) */
    var mail = t.closest ? t.closest('a[href^="mailto:"]') : null;
    if (mail) {
      e.preventDefault();
      location.href = /\/projects\//.test(location.pathname) ? '../contact.html' : 'contact.html';
      return;
    }
    /* Copy buttons */
    if (t.classList && t.classList.contains('cm-copy')) {
      var v = t.getAttribute('data-copy');
      try { if (navigator.clipboard) navigator.clipboard.writeText(v); } catch (err) {}
      var old = t.textContent; t.textContent = 'Copied ✓ 已复制';
      setTimeout(function () { t.textContent = old; }, 1500);
      return;
    }
    /* Lightbox prev / next */
    if (t.classList && t.classList.contains('lb-up')) { openAt(lbIdx - 1); return; }
    if (t.classList && t.classList.contains('lb-down')) { openAt(lbIdx + 1); return; }
    /* Open lightbox from a zoomable image */
    if (t.classList && t.classList.contains('zoom')) {
      zoomList = Array.prototype.slice.call(document.querySelectorAll('.zoom'));
      openAt(zoomList.indexOf(t));
      return;
    }
    /* Close on backdrop / image / close button */
    if (t.id === 'lb' || t.id === 'lb-img' || (t.classList && t.classList.contains('lb-close'))) closeLb();
  });

  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { openAt(lbIdx - 1); e.preventDefault(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { openAt(lbIdx + 1); e.preventDefault(); }
  });

  /* ---- Mobile: top nav items English-only + logo line break ---- */
  function trimNavForMobile() {
    if (window.innerWidth > 760) return;
    var links = document.querySelectorAll('.nav > ul > li > a');
    for (var i = 0; i < links.length; i++) {
      var nodes = links[i].childNodes;
      for (var j = 0; j < nodes.length; j++) {
        var n = nodes[j];
        if (n.nodeType === 3 && /[一-鿿]/.test(n.textContent)) {
          n.textContent = n.textContent.replace(/[一-鿿·]+/g, '').replace(/\s{2,}/g, ' ').replace(/\s+$/, ' ');
        }
      }
    }
    var nm = document.querySelector('.nav a.name');
    if (nm && /[一-鿿]/.test(nm.innerHTML) && nm.innerHTML.indexOf('<br') === -1) {
      nm.innerHTML = nm.innerHTML.replace(/\s*([一-鿿][一-鿿·\s]*)$/, '<br>$1');
    }
  }

  /* ---- Hero manual carousel (arrows + dots, NO autoplay) ---- */
  function heroCarousel() {
    var hero = document.querySelector('.hero--cover');
    if (!hero) return;
    var slides = hero.querySelectorAll('.hero-slide');
    var dots = hero.querySelectorAll('.hero-dots button');
    if (slides.length < 2) return;
    var tag = hero.querySelector('#hero-tag');
    var tagNum = tag && tag.querySelector('.ht-num');
    var tagTitle = tag && tag.querySelector('.ht-title');
    var cur = 0;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function show(n) {
      cur = (n + slides.length) % slides.length;
      for (var k = 0; k < slides.length; k++) slides[k].classList.toggle('is-active', k === cur);
      for (var d = 0; d < dots.length; d++) dots[d].classList.toggle('on', d === cur);
      var s = slides[cur];
      if (tag && s.getAttribute('data-href')) {
        tag.setAttribute('href', s.getAttribute('data-href'));
        if (tagNum) tagNum.textContent = pad(cur + 1) + ' / ' + pad(slides.length);
        if (tagTitle) tagTitle.textContent = s.getAttribute('data-title') || '';
      }
    }
    var prev = hero.querySelector('.hero-arrow.prev');
    var next = hero.querySelector('.hero-arrow.next');
    if (prev) prev.addEventListener('click', function () { show(cur - 1); });
    if (next) next.addEventListener('click', function () { show(cur + 1); });
    for (var d = 0; d < dots.length; d++) {
      (function (idx) { dots[idx].addEventListener('click', function () { show(idx); }); })(d);
    }
    /* Click the cover image itself to open the matching project */
    for (var s = 0; s < slides.length; s++) {
      slides[s].style.cursor = 'pointer';
      slides[s].addEventListener('click', function () {
        var href = slides[cur].getAttribute('data-href');
        if (href) location.href = href;
      });
    }
    show(0);
  }

  /* ---- Scroll-linked hero: shrink + fade "Selected Works" as you scroll into the next screen ---- */
  function heroScroll() {
    var hero = document.querySelector('.hero--cover');
    if (!hero) return;
    var inner = hero.querySelector('.hero-inner');
    var slides = hero.querySelector('.hero-slides');
    var hint = hero.querySelector('.scroll-hint');
    var ticking = false;
    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var h = window.innerHeight || 1;
      var p = y / (h * 0.75);
      if (p < 0) p = 0; if (p > 1) p = 1;
      if (inner) {
        inner.style.transform = 'translateY(' + (-44 * p) + 'px) scale(' + (1 - 0.16 * p) + ')';
        inner.style.opacity = String(1 - p * 1.15);
      }
      if (slides) slides.style.transform = 'scale(' + (1 + 0.09 * p) + ')';
      if (hint) hint.style.opacity = String(Math.max(0, 0.9 - y / 90));
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---- Site language: one reading layer at a time, persisted across pages ---- */
  function siteLanguage() {
    var switches = document.querySelectorAll('[data-lang-switch]');
    var layers = document.querySelectorAll('[data-lang]');
    var copies = document.querySelectorAll('[data-copy-en][data-copy-zh]');
    if (!switches.length) return;
    function show(lang) {
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
      for (var i = 0; i < layers.length; i++) {
        layers[i].hidden = layers[i].getAttribute('data-lang') !== lang;
      }
      for (var c = 0; c < copies.length; c++) {
        copies[c].textContent = copies[c].getAttribute('data-copy-' + lang);
      }
      for (var j = 0; j < switches.length; j++) {
        var active = switches[j].getAttribute('data-lang-switch') === lang;
        switches[j].classList.toggle('is-active', active);
        switches[j].setAttribute('aria-pressed', active ? 'true' : 'false');
      }
      var title = document.body.getAttribute('data-title-' + lang);
      if (title) document.title = title;
      try { localStorage.setItem('kaiwen-site-language', lang); } catch (err) {}
    }
    for (var k = 0; k < switches.length; k++) {
      switches[k].addEventListener('click', function () { show(this.getAttribute('data-lang-switch')); });
    }
    var query = new URLSearchParams(window.location.search).get('lang');
    var saved = null;
    try { saved = localStorage.getItem('kaiwen-site-language'); } catch (err) {}
    show(query === 'zh' || query === 'en' ? query : (saved === 'zh' ? 'zh' : 'en'));
  }
})();
