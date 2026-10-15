/* トップ画像・動画の切り替え。先頭の海老天丼は3秒、その他は5秒 */
(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  const media = window.TENNOYA_HERO_MEDIA;
  if (!hero || !Array.isArray(media) || !media.length) return;
  const DEFAULT_INTERVAL_MS = 5000;
  const FIRST_TENDON_MS = 3000;
  const FADE_MS = 900;
  const slides = media.map((item, i) => {
    const el = document.createElement(item.type === 'video' ? 'video' : 'img');
    el.className = 'hero-slide';
    el.setAttribute('aria-hidden', 'true');
    if (item.type === 'video') {
      el.muted = true;
      el.defaultMuted = true;
      el.loop = true;
      el.playsInline = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
      el.preload = i < 2 ? 'auto' : 'metadata';
      el.src = item.src;
    } else {
      el.alt = '';
      el.decoding = 'async';
      el.loading = i === 0 ? 'eager' : 'lazy';
      el.src = item.src;
    }
    hero.insertBefore(el, hero.firstChild);
    return el;
  });
  let current = 0;
  let busy = false;
  let timer;
  function scheduleNext() {
    clearTimeout(timer);
    const delay = current === 0 ? FIRST_TENDON_MS : DEFAULT_INTERVAL_MS;
    timer = setTimeout(advance, delay);
  }
  slides[0].classList.add('is-current');
  function startVideo(el) {
    if (el.tagName !== 'VIDEO') return;
    try {
      el.currentTime = 0;
      const result = el.play();
      if (result && result.catch) result.catch(() => {});
    } catch (_) {}
  }
  function ready(el) {
    if (el.tagName === 'IMG') {
      if (el.complete) return Promise.resolve(el.naturalWidth > 0);
      return new Promise(resolve => {
        const done = (ok) => {clearTimeout(timeout);el.removeEventListener('load', good);el.removeEventListener('error', bad);resolve(ok)};
        const good = () => done(true), bad = () => done(false);
        el.addEventListener('load', good, {once:true});el.addEventListener('error', bad, {once:true});
        const timeout = setTimeout(() => done(false), 2200);
      });
    }
    if (el.error) return Promise.resolve(false);
    if (el.readyState >= 2) return Promise.resolve(true);
    el.load();
    return new Promise(resolve => {
      const done = ok => {clearTimeout(timeout);el.removeEventListener('loadeddata',good);el.removeEventListener('error',bad);resolve(ok)};
      const good=()=>done(true),bad=()=>done(false);
      el.addEventListener('loadeddata',good,{once:true});el.addEventListener('error',bad,{once:true});
      const timeout=setTimeout(()=>done(el.readyState>=2),2200);
    });
  }
  async function advance() {
    if (busy || document.hidden) { scheduleNext(); return; }
    busy = true;
    let next = -1;
    for (let step = 1; step < slides.length; step++) {
      const candidate = (current + step) % slides.length;
      if (await ready(slides[candidate])) {next=candidate;break;}
    }
    if (next < 0 || document.hidden) {busy=false;scheduleNext();return;}
    const from = slides[current], to = slides[next];
    startVideo(to);
    from.style.zIndex = '1';
    from.style.opacity = '1';
    to.style.transition = 'none';
    to.style.opacity = '0';
    to.style.zIndex = '2';
    void to.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      to.style.transition = `opacity ${FADE_MS}ms ease-in-out`;
      to.style.opacity = '1';
      setTimeout(() => {
        from.classList.remove('is-current');
        from.style.opacity = '0';
        from.style.zIndex = '0';
        if (from.tagName === 'VIDEO') from.pause();
        to.style.transition = 'none';
        to.style.zIndex = '1';
        to.classList.add('is-current');
        current = next;
        busy = false;
        scheduleNext();
      }, FADE_MS + 30);
    }));
  }
  scheduleNext();
  addEventListener('pagehide', () => clearTimeout(timer), {once:true});
})();
