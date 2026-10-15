// 掲示板の写真は posts.images（配列）に保存されている。
// 既存の投稿・返信・いいね処理には触れず、トップの2記事に写真を補完する。
import {getDocs,collection,query,where} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const host=document.getElementById('blog-posts');
if(host){
  const waitForDb=()=>new Promise((resolve,reject)=>{
    let n=0;
    const timer=setInterval(()=>{
      if(window.tennoyaDb?.db){clearInterval(timer);resolve(window.tennoyaDb.db);}
      else if(++n>100){clearInterval(timer);reject(Error('Firebase initialization timed out'));}
    },100);
  });
  try{
    const db=await waitForDb();
    const snap=await getDocs(query(collection(db,'posts'),where('status','==','approved')));
    const recent=[...snap.docs].sort((a,b)=>(b.data().createdAt?.toMillis?.()||0)-(a.data().createdAt?.toMillis?.()||0)).slice(0,2);
    function apply(){
      const articles=[...host.querySelectorAll(':scope > article')];
      recent.forEach((entry,i)=>{
        const article=articles[i];
        if(!article||article.querySelector('.tn-post-photos'))return;
        const photos=entry.data().images;
        if(!Array.isArray(photos)||!photos.length)return;
        const grid=document.createElement('div');grid.className='tn-post-photos';
        photos.slice(0,3).forEach(url=>{
          if(typeof url!=='string'||!(url.startsWith('https://')||url.startsWith('data:image/')))return;
          const img=document.createElement('img');img.src=url;img.alt='ブログに投稿された写真';img.loading='lazy';
          img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','写真を拡大表示');
          const enlarge=()=>{
            const overlay=document.createElement('div');overlay.className='tn-photo-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','写真の拡大表示');
            const big=document.createElement('img');big.src=url;big.alt='拡大したブログ写真';
            const close=document.createElement('button');close.type='button';close.className='tn-photo-close';close.textContent='× 閉じる';
            const dismiss=()=>{overlay.remove();document.removeEventListener('keydown',onEscape);};
            const onEscape=e=>{if(e.key==='Escape')dismiss();};
            close.addEventListener('click',dismiss);
            overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss();});
            overlay.append(big,close);document.body.append(overlay);close.focus();document.addEventListener('keydown',onEscape);
          };
          img.addEventListener('click',enlarge);
          img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enlarge();}});
          grid.append(img);
        });
        if(grid.childElementCount){
          const old=article.querySelector('img:not(.tn-post-photos img)');
          if(old)old.remove();
          const body=article.querySelector('p');
          if(body)body.before(grid);else article.append(grid);
        }
      });
    }
    const observer=new MutationObserver(apply);
    observer.observe(host,{childList:true});
    apply();
  }catch(e){console.warn('Blog photos:',e);}
}
