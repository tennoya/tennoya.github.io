// 独立した訪問者カウンター。ブログ用スクリプトの旧カウンターは起動しない。
import {firebaseConfig} from './firebase-config.js';
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getFirestore,doc,getDoc,runTransaction} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
const output=document.getElementById('visit-count-managed');
const counterArea=document.getElementById('tennoya-counter');
if(output&&firebaseConfig.apiKey&&firebaseConfig.projectId){
  const app=getApps().length?getApp():initializeApp(firebaseConfig);
  const db=getFirestore(app),auth=getAuth(app),ref=doc(db,'siteStats','visits');
  const format=n=>{if(Number.isFinite(Number(n)))output.textContent=Number(n).toLocaleString('ja-JP');};
  onAuthStateChanged(auth,async user=>{
    let admin=false;
    if(user){try{const a=await getDoc(doc(db,'admins',user.uid));admin=a.exists()&&a.data().role==='admin';}catch(e){console.warn('Admin check:',e);}}
    try{
      const snap=await getDoc(ref);format(snap.exists()?snap.data().count:0);
    }catch(e){output.textContent='集計中';console.warn('Counter read:',e);}
    // 管理者は加算しない。通常訪問者はタブのセッションにつき1回。
    if(admin||sessionStorage.getItem('tennoya-visit-counted-managed'))return;
    try{
      const n=await runTransaction(db,async tx=>{
        const snap=await tx.get(ref),v=snap.exists()?Number(snap.data().count||0):0;
        tx.set(ref,{count:v+1});return v+1;
      });
      sessionStorage.setItem('tennoya-visit-counted-managed','1');
      format(n);
    }catch(e){console.warn('Counter update:',e);}
  });
}
