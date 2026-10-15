/* 天乃八 トップスライド：先頭の海老天丼はフェード込み3秒、以降5秒 */
(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  const media = window.TENNOYA_HERO_MEDIA;
  if (!hero || !Array.isArray(media) || media.length < 2) return;
  const DURATION_MS = 5000;
  const FIRST_MS = 3000;
  const FADE_MS = 700;
  const slides = media.map((item, i) => {
    const el = document.createElement(item.type === 'video' ? 'video' : 'img');
    el.className = 'hero-slide';
    el.setAttribute('aria-hidden', 'true');
    if (item.type === 'video') {
      el.muted = true; el.defaultMuted = true; el.loop = true;
      el.playsInline = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
      el.preload = 'auto'; el.src = item.src;
    } else {
      el.alt = ''; el.decoding = 'async';
      el.loading = i < 2 ? 'eager' : 'lazy'; el.src = item.src;
    }
    hero.insertBefore(el, hero.firstChild);
    return el;
  });
  let current = 0;
  let timer = null;
  let changing = false;
  let startedAt = performance.now();
  slides[0].classList.add('is-current');
  function playVideo(el) {
    if (el.tagName !== 'VIDEO') return;
    try { el.currentTime = 0; const p = el.play(); if (p?.catch) p.catch(() => {}); } catch (_) {}
  }
  playVideo(slides[0]);
  // 画像・動画の読み込みは次の表示前に開始する。読み込み待ちを表示時間に足さない。
  function preload(index) {
    const el = slides[index];
    if (el.tagName === 'VIDEO' && el.readyState === 0) el.load();
  }
  function schedule() {
    clearTimeout(timer);
    const duration = current === 0 ? FIRST_MS : DURATION_MS;
    const startFadeAfter = duration - FADE_MS;
    const remaining = Math.max(0, startedAt + startFadeAfter - performance.now());
    timer = setTimeout(nextSlide, remaining);
  }
  function nextSlide() {
    if (changing || document.hidden) { timer = setTimeout(nextSlide, 250); return; }
    changing = true;
    const previous = current;
    current = (current + 1) % slides.length;
    const from = slides[previous], to = slides[current];
    playVideo(to);
    from.style.transition = 'none';
    from.style.zIndex = '1'; from.style.opacity = '1';
    to.style.transition = 'none'; to.style.zIndex = '2'; to.style.opacity = '0';
    void to.offsetWidth;
    requestAnimationFrame(() => {
      to.style.transition = `opacity ${FADE_MS}ms ease-in-out`;
      to.style.opacity = '1';
    });
    timer = setTimeout(() => {
      from.classList.remove('is-current');
      from.style.opacity = '0'; from.style.zIndex = '0';
      if (from.tagName === 'VIDEO') from.pause();
      to.classList.add('is-current');
      to.style.transition = 'none'; to.style.zIndex = '1';
      changing = false;
      startedAt = performance.now();
      preload((current + 1) % slides.length);
      schedule();
    }, FADE_MS);
  }
  preload(1);
  schedule();
  addEventListener('pagehide', () => clearTimeout(timer), { once:true });
})();
