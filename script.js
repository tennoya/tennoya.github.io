// ブラウザの「戻る」でキャッシュから復元された場合も最新情報を再取得する。
window.addEventListener('pageshow', function (event) {
  if (event.persisted) window.location.reload();
});

/* ===== ORIGINAL SCRIPT SECTION ===== */

(function(){
 const button=document.getElementById('menu-toggle');
 const header=button&&button.closest('header');
 if(!button||!header)return;
 button.addEventListener('click',function(){
   const open=header.classList.toggle('menu-open');
   button.setAttribute('aria-expanded',String(open));
   button.textContent=open?'✕ 閉じる':'☰ メニュー';
 });
 header.querySelectorAll('nav a').forEach(function(link){link.addEventListener('click',function(){header.classList.remove('menu-open');button.setAttribute('aria-expanded','false');button.textContent='☰ メニュー';});});
})();

/* ===== ORIGINAL SCRIPT SECTION ===== */

(() => {
  const bgm = document.getElementById('tennoya-bgm');
  if (!bgm) return;
  // PC は従来どおり 8%。スマホはさらに小さくする。
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  bgm.volume = isMobile ? 0.015 : 0.08;
  bgm.loop = true;

  // iPhone/iPad は audio.volume を無視することがあるため、Web Audio で音量調整。
  let audioContext = null;
  if (isIOS) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
        const source = audioContext.createMediaElementSource(bgm);
        const gain = audioContext.createGain();
        gain.gain.value = 0.015;
        source.connect(gain);
        gain.connect(audioContext.destination);
      }
    } catch (e) {
      console.warn('BGM volume control:', e);
      audioContext = null;
    }
  }

  // ページを離れたら再生を停止し、端末側のメディア表示も終了を通知する。
  function stopBgm() {
    bgm.pause();
    try { bgm.currentTime = 0; } catch (_) {}
    if (audioContext && audioContext.state === 'running') {
      audioContext.suspend().catch(() => {});
    }
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'none'; } catch (_) {}
      try { navigator.mediaSession.metadata = null; } catch (_) {}
    }
  }

  // 音声ソースを解除してバックグラウンド再生・プレーヤー残留を抑える。
  function leavePage() {
    stopBgm();
    bgm.removeAttribute('src');
    bgm.load();
  }
  function restoreSource() {
    if (!bgm.getAttribute('src')) {
      bgm.setAttribute('src', 'bgm.mp3');
      bgm.load();
    }
  }

  // play() はユーザーの操作イベントの中から直接実行する。
  // 非同期処理を挟むとスマホの再生許可が失われる場合がある。
  function startBgm() {
    if (document.hidden) return;
    restoreSource();
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    if (!bgm.paused) return;
    try {
      const pending = bgm.play();
      if (pending && typeof pending.catch === 'function') {
        pending.catch(() => { /* ブラウザの自動再生制限では操作を待つ */ });
      }
    } catch (_) { /* 音声が読み込めない場合もページは正常に表示 */ }
  }

  // ブラウザが自動再生を許可している環境ではページ表示直後から鳴らす。
  startBgm();
  window.addEventListener('pageshow', startBgm);
  window.addEventListener('pagehide', leavePage);
  bgm.addEventListener('canplay', startBgm);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) leavePage();
    else startBgm();
  });

  // 音付き自動再生が禁止されたスマホでも、最初のタップで再生する。
  // ゲストのタップを邪魔しないよう、イベントの動作は変更しない。
  for (const type of ['touchstart', 'pointerdown', 'click', 'keydown']) {
    document.addEventListener(type, startBgm, {capture:true, passive:true});
  }
})();

/* ===== ORIGINAL SCRIPT SECTION ===== */

(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const items = Array.from(hero.children).filter(el =>
    el.matches('video.tennoya-hero-fade-video'));
  if (items.length === 0) return;

  // まず天丼を独立した1枚にする。以後ヒーローの背景には写真を置かない。
  const originalBackground = getComputedStyle(hero).backgroundImage;
  const tendon = document.createElement('div');
  tendon.id = 'tennoya-hero-tendon-slide';
  tendon.setAttribute('aria-hidden', 'true');
  // 元からある天丼の背景画像を1枚目として使う。
  const pictureURLs = originalBackground.match(/url\((?:"[^"]*"|'[^']*'|[^)]*)\)/g);
  tendon.style.backgroundImage = pictureURLs?.at(-1) || originalBackground;
  hero.insertBefore(tendon, hero.firstChild);
  hero.style.backgroundImage = 'none';
  hero.style.backgroundColor = '#201915';

  const slides = [tendon, ...items];
  for (const slide of slides) {
    slide.style.opacity = '0';
    slide.style.zIndex = '0';
    slide.style.transition = 'none';
    if (slide.tagName === 'VIDEO') {
      slide.muted = true;
      slide.setAttribute('muted', '');
      slide.playsInline = true;
      slide.preload = 'auto';
      slide.pause();
    }
  }
  tendon.style.opacity = '1';
  tendon.style.zIndex = '1';
  let current = 0;
  let busy = false;
  const HOLD_MS = 8000;
  const FADE_MS = 1050;

  // 動画がまだ読み込めていない場合は、黒い画面へ切り替えず前の画像を残す。
  function waitForMedia(el) {
    if (el.tagName === 'IMG') {
      if (el.complete) return Promise.resolve(el.naturalWidth > 0);
      return new Promise(resolve => {
        let settled = false;
        let timeout;
        const done = good => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          el.removeEventListener('load', onload);
          el.removeEventListener('error', onerror);
          resolve(good);
        };
        const onload = () => done(true);
        const onerror = () => done(false);
        el.addEventListener('load', onload);
        el.addEventListener('error', onerror);
        timeout = setTimeout(() => done(false), 2600);
      });
    }
    if (el.tagName !== 'VIDEO') return Promise.resolve(true);
    if (el.error) return Promise.resolve(false);
    try { if (el.readyState >= 1) el.currentTime = 0; } catch (e) {}
    try {
      const playing = el.play();
      if (playing?.catch) playing.catch(() => {});
    } catch (e) {}
    if (el.readyState >= 2) return Promise.resolve(true);
    return new Promise(resolve => {
      let settled = false;
      let timeout;
      const done = good => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        el.removeEventListener('loadeddata', ondata);
        el.removeEventListener('canplay', ondata);
        el.removeEventListener('error', onerror);
        resolve(good);
      };
      const ondata = () => done(el.readyState >= 2);
      const onerror = () => done(false);
      el.addEventListener('loadeddata', ondata);
      el.addEventListener('canplay', ondata);
      el.addEventListener('error', onerror);
      timeout = setTimeout(() => done(el.readyState >= 2), 2600);
    });
  }

  async function advance() {
    if (busy || document.hidden) return;
    busy = true;
    const outgoing = slides[current];
    let target = -1;
    // 動画を読み込めなければ天丼表示を維持する。
    for (let n = 1; n < slides.length; n++) {
      const candidate = (current + n) % slides.length;
      if (await waitForMedia(slides[candidate])) { target = candidate; break; }
    }
    if (target < 0 || document.hidden) { busy = false; return; }
    const incoming = slides[target];
    outgoing.style.zIndex = '1';
    outgoing.style.opacity = '1';
    incoming.style.transition = 'none';
    incoming.style.opacity = '0';
    incoming.style.zIndex = '2';
    void incoming.offsetWidth; // commit initial zero-opacity frame
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    incoming.style.transition = `opacity ${FADE_MS}ms ease-in-out`;
    incoming.style.opacity = '1';
    // 前の映像は次が不透明になるまで絶対に消さない。
    await new Promise(resolve => setTimeout(resolve, FADE_MS + 110));
    incoming.style.transition = 'none';
    incoming.style.opacity = '1';
    incoming.style.zIndex = '1';
    outgoing.style.transition = 'none';
    outgoing.style.opacity = '0';
    outgoing.style.zIndex = '0';
    if (outgoing.tagName === 'VIDEO') outgoing.pause();
    current = target;
    busy = false;
  }

  // 別タブから復帰したときの重複タイマーは作らない。
  const timer = setInterval(advance, HOLD_MS);
  addEventListener('pagehide', () => clearInterval(timer), {once:true});
})();
