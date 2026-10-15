// BGMの音量・自動再生制御（動作していた元の処理を独立ファイル化）。
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
