import {firebaseConfig} from './firebase-config.js';
const count=document.getElementById('visit-count');
const posts=document.getElementById('blog-posts');
if(!firebaseConfig.apiKey || !firebaseConfig.projectId){
  if(count)count.textContent='準備中';
  if(posts)posts.textContent='お知らせは準備中です。';
}else{
  try{
    const [{initializeApp},{getFirestore,doc,getDoc,setDoc,runTransaction,collection,query,where,orderBy,getDocs,addDoc,deleteDoc,serverTimestamp},{getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged}] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js')
    ]);
    const app=initializeApp(firebaseConfig),db=getFirestore(app),auth=getAuth(app);
    window.tennoyaDb={db,auth,doc,getDoc,setDoc,collection,query,orderBy,getDocs,signInWithEmailAndPassword,signOut,onAuthStateChanged};
    if(count){
      const ref=doc(db,'siteStats','visits');
      // Display the last known count immediately when available.
      const cached=localStorage.getItem('tennoya-visit-last-count');
      if(cached!==null && /^\d+$/.test(cached))count.textContent=Number(cached).toLocaleString('ja-JP');
      else count.textContent='集計中';
      const showCount=value=>{
        const n=Number(value);
        if(Number.isFinite(n)&&n>=0){
          count.textContent=n.toLocaleString('ja-JP');
          localStorage.setItem('tennoya-visit-last-count',String(n));
        }
      };
      try{
        // Read first: don't block rendering on the write transaction.
        const snap=await getDoc(ref);
        showCount(snap.exists()?snap.data().count:0);
      }catch(e){console.warn('Counter read:',e);if(cached===null)count.textContent='集計中';}
      if(!sessionStorage.getItem('tennoya-visit-counted')){
        try{
          const newCount=await runTransaction(db,async tx=>{
            const snap=await tx.get(ref);
            const current=snap.exists()?Number(snap.data().count||0):0;
            tx.set(ref,{count:current+1});
            return current+1;
          });
          sessionStorage.setItem('tennoya-visit-counted','1');
          showCount(newCount);
        }catch(e){console.warn('Counter update:',e);}
      }
    }
    if(posts){
      const style=document.createElement('style');
      style.textContent=`.tn-replies{margin:16px 0;font:14px system-ui,sans-serif}.tn-reply{margin:12px 0 12px 12px;padding:10px 12px;border-left:3px solid #c8b5a1;background:#fffaf4;overflow-wrap:anywhere}.tn-reply-meta{font-size:12px;color:#6f6256}.tn-reply-message{white-space:pre-wrap;margin:6px 0}.tn-reply-button{background:#654736;color:white;border:0;border-radius:5px;padding:7px 12px;cursor:pointer;margin-top:8px}.tn-reply-form{margin:12px 0;padding:12px;background:#f5eee5;border-radius:7px}.tn-reply-form input,.tn-reply-form textarea{display:block;box-sizing:border-box;width:100%;margin:7px 0;padding:9px;border:1px solid #c5b9a9;border-radius:5px;font:14px system-ui,sans-serif}.tn-reply-form textarea{min-height:80px}.tn-reply-status{font-size:12px;color:#735039}.tn-reply-thread{margin-left:12px}`;
      document.head.append(style);
      style.textContent += `.tn-reactions{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.tn-react{background:#fff;border:1px solid #c8b5a1;border-radius:20px;padding:7px 13px;color:#493528;cursor:pointer}.tn-react[aria-pressed="true"]{background:#fce8e7;border-color:#c77b78}.tn-react:disabled{opacity:.6}`;
      const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
      const fmt=ts=>ts?.toDate?.()?.toLocaleString('ja-JP')||'日時未確定';
      let allReplies=[];
      const loadReplies=async()=>{const snap=await getDocs(query(collection(db,'replies'),where('status','==','approved')));allReplies=snap.docs;};
      function replyForm(container,postId,parentId,refresh){
        const form=make('form','tn-reply-form');
        const name=make('input');name.placeholder='お名前（30文字以内）';name.maxLength=30;name.required=true;
        const message=make('textarea');message.placeholder='返信内容（1000文字以内）';message.maxLength=1000;message.required=true;
        const submit=make('button','tn-reply-button','返信を送信');submit.type='submit';
        const status=make('div','tn-reply-status');status.setAttribute('role','status');
        form.append(name,message,submit,status);
        form.addEventListener('submit',async ev=>{ev.preventDefault();const n=name.value.trim(),m=message.value.trim();if(!n||!m||n.length>30||m.length>1000){status.textContent='名前と返信内容を入力してください。';return;}
          submit.disabled=true;status.textContent='送信中…';try{await addDoc(collection(db,'replies'),{postId,parentId,name:n,message:m,createdAt:serverTimestamp(),status:'approved'});status.textContent='返信しました。';await loadReplies();refresh();}catch(e){console.error(e);status.textContent='返信できませんでした。Firebaseのルールや通信状況を確認してください。';}finally{submit.disabled=false;}
        });container.append(form);
      }
      function thread(target,postId,parentId,depth,seen,refresh){
        if(depth>=30)return;
        const rows=allReplies.filter(s=>s.data().postId===postId&&(s.data().parentId||null)===parentId).sort((a,b)=>(a.data().createdAt?.toMillis?.()||0)-(b.data().createdAt?.toMillis?.()||0));
        for(const s of rows){if(seen.has(s.id))continue;const next=new Set(seen);next.add(s.id);const d=s.data();const item=make('div','tn-reply');
          item.append(make('strong','',d.name||'匿名'),make('div','tn-reply-meta',fmt(d.createdAt)),make('div','tn-reply-message',d.message||''));
          const button=make('button','tn-reply-button','この返信に返信');button.type='button';button.onclick=()=>{const old=item.querySelector(':scope > .tn-reply-form');if(old){old.remove();return;}replyForm(item,postId,s.id,refresh);};item.append(button);
          const children=make('div','tn-reply-thread');thread(children,postId,s.id,depth+1,next,refresh);item.append(children);target.append(item);
        }
      }
      // 匿名ブラウザごとの識別子。端末変更やブラウザデータ削除でリセットされます。
      const key='tennoya-reaction-id';
      let browserId=localStorage.getItem(key);
      if(!browserId){browserId='b'+Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem(key,browserId);}
      async function reactionsFor(article,postId){
        const wrap=make('div','tn-reactions');article.append(wrap);
        const ref=collection(db,'posts',postId,'reactions');
        const types=[['like','👍 いいね！'],['heart','❤️ ハート']];
        let records=[];
        const load=async()=>{const snap=await getDocs(ref);records=snap.docs;};
        const render=()=>{wrap.replaceChildren();for(const [type,label] of types){
          const ownId=browserId+'_'+type;
          const active=records.some(r=>r.id===ownId);
          const total=records.filter(r=>r.data().type===type).length;
          const button=make('button','tn-react',`${label} ${total}`);
          button.type='button';button.setAttribute('aria-pressed',String(active));
          button.onclick=async()=>{button.disabled=true;try{
            const target=doc(db,'posts',postId,'reactions',ownId);
            if(active)await deleteDoc(target);else await setDoc(target,{type,createdAt:serverTimestamp()});
            await load();render();
          }catch(e){console.warn('Reaction:',e);button.disabled=false;alert('反応を保存できませんでした。Firebaseルールを確認してください。');}};
          wrap.append(button);
        }};
        try{await load();render();}catch(e){console.warn('Reactions:',e);wrap.textContent='いいね・ハートを読み込めませんでした。';}
      }
      try{
        const snapshot=await getDocs(query(collection(db,'posts'),where('status','==','approved')));
        try{await loadReplies();}catch(e){console.warn('Replies:',e);}
        posts.replaceChildren();
        if(snapshot.empty)posts.textContent='新しいお知らせをお楽しみに。';
        const sorted=[...snapshot.docs].sort((a,b)=>(b.data().createdAt?.toMillis?.()||0)-(a.data().createdAt?.toMillis?.()||0));
        for(const s of sorted){const d=s.data();const article=make('article');const h=make('h3','',d.title||d.name||'お知らせ');article.append(h);
          const t=make('time','',d.createdAt?.toDate?.().toLocaleDateString('ja-JP')||'');article.append(t);
          if(d.image){const img=make('img');img.src=d.image;img.alt=d.title||'記事の写真';img.loading='lazy';article.append(img);}
          article.append(make('p','',d.body||d.message||''));
          const area=make('div','tn-replies');const replies=make('div');const refresh=()=>{replies.replaceChildren();thread(replies,s.id,null,0,new Set(),refresh);};refresh();
          const button=make('button','tn-reply-button','この記事に返信する');button.type='button';button.onclick=()=>{const old=area.querySelector(':scope > .tn-reply-form');if(old){old.remove();return;}replyForm(area,s.id,null,refresh);};
          area.append(replies,button);article.append(area);posts.append(article);await reactionsFor(article,s.id);
        }
      }catch(e){posts.textContent='記事を読み込めませんでした。';console.warn(e);}
    }
  }catch(e){if(count)count.textContent='接続待ち';if(posts)posts.textContent='接続設定を確認してください。';console.error(e);}
}
