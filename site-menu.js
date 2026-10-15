// スマホ用メニューの開閉。ほかの機能に依存しません。
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
