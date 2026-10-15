// ブラウザの「戻る」でキャッシュから復元された場合も最新情報を再取得する。
window.addEventListener('pageshow', function (event) {
  if (event.persisted) window.location.reload();
});
