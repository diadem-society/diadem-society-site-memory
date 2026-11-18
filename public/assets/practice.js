(()=>{const q=(s,e=document)=>e.querySelector(s),qa=(s,e=document)=>[...e.querySelectorAll(s)];
const MAIL='secretariat.diadem.society@gmail.com';
/* tabs */
qa('[data-tab]').forEach(b=>b.onclick=()=>{qa('[data-tab]').forEach(x=>{x.classList.toggle('on',x===b);x.classList.toggle('ghost',x!==b)});qa('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!==b.dataset.tab)});
/* clocks */
const fmt=s=>(s<0?'-':'')+Math.floor(Math.abs(s)/60)+':'+String(Math.abs(s)%60).padStart(2,'0');let ac;
const bell=n=>{try{ac=ac||new AudioContext();for(let i=0;i<n;i++){const t=ac.currentTime+i*.35,o=ac.createOscillator(),g=ac.createGain();o.frequency.value=880;g.gain.setValueAtTime(.25,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+.3)}}catch{}};
function mk(id,len,tick){let t=len,L=len,iv=null;const o=q('#'+id),d=()=>o.textContent=fmt(t);
 return{set(n){L=t=n;d()},start(){if(iv||!L)return;iv=setInterval(()=>{t--;d();tick&&tick(t,L)},1000)},stop(){clearInterval(iv);iv=null},reset(){this.stop();t=L;d()}}}
const lens=(k,c)=>qa(`[data-lens=${k}] [data-len]`).forEach(b=>b.onclick=()=>{qa(`[data-lens=${k}] [data-len]`).forEach(x=>x.classList.toggle('on',x===b));c.set(+b.dataset.len)});
const g=mk('g-t',90),p=mk('p-t',900,t=>{if(t===0)bell(2)}),
 s=mk('s-t',0,(t,L)=>{if(t===L-60)bell(1);if(t===60)bell(1);if(t===0)bell(2);if(t===-15){bell(3);s.stop()}});
lens('g',g);lens('s',s);
q('#g-s').onclick=()=>g.start();q('#g-n').onclick=()=>{g.reset();g.start()};q('#g-y').onclick=()=>g.reset();
q('#p-s').onclick=()=>p.start();q('#p-r').onclick=()=>p.reset();
q('#s-s').onclick=()=>s.start();q('#s-n').onclick=()=>{s.reset();s.start()};q('#s-r').onclick=()=>s.reset();
/* Security Council vote */
const P5=['China','France','Russia','United Kingdom','United States'],EL=['Bahrain','Colombia','DR Congo','Denmark','Greece','Latvia','Liberia','Pakistan','Panama','Somalia'],ST=['','For','Against','Abstain'],v={};let mode='Substantive';
const vg=q('#v-g'),vd=()=>{vg.innerHTML=[...P5.map(c=>[c,1]),...EL.map(c=>[c,0])].map(([c,p])=>`<button class="${v[c]||''}" data-c="${c}">${p?'\u2605 ':''}${c}<small>${v[c]||'Tap to vote'}</small></button>`).join('')};vd();
vg.onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;const c=b.dataset.c;v[c]=ST[(ST.indexOf(v[c]||'')+1)%4];vd()};
qa('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;qa('[data-mode]').forEach(x=>{x.classList.toggle('on',x===b);x.classList.toggle('ghost',x!==b)})});
q('#v-c').onclick=()=>{for(const k in v)delete v[k];vd();q('#v-r').textContent=''};
q('#v-s').onclick=()=>{const all=[...P5,...EL],n=x=>all.filter(c=>v[c]===x).length,veto=P5.filter(c=>v[c]==='Against'),f=n('For');
 q('#v-r').textContent=`${f} for, ${n('Against')} against, ${n('Abstain')} abstaining. `+(f<9?'Not adopted: it needs nine votes in favour.':mode==='Substantive'&&veto.length?`Vetoed by ${veto.join(', ')}.`:'Adopted.')};
})();
