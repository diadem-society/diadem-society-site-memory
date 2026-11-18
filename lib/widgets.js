'use strict';
const clip=(v,n)=>String(v??'').trim().slice(0,n),sl=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,20);
const WG={hero:{title:120,text:600,showAuth:'b'},text:{title:120,body:4000},notice:{title:120,body:1000,level:['info','important']},countdown:{title:120,to:40,done:120},cards:{title:120,intro:600,items:{title:80,body:400,link:40}},practice:{}};
function cleanWidgets(list){return(Array.isArray(list)?list:[]).slice(0,60).map(w=>{const s=WG[w&&w.type];if(!s)return null;const q=w.props||{},p={};
 for(const[k,t]of Object.entries(s)){const v=q[k];
  if(t==='b')p[k]=!!v;else if(Array.isArray(t))p[k]=t.includes(v)?v:t[0];else if(typeof t==='number')p[k]=clip(v,t);
  else p[k]=(Array.isArray(v)?v:[]).slice(0,12).map(i=>Object.fromEntries(Object.entries(t).map(([a,n])=>{let x=clip(i&&i[a],n);if(a==='link'&&!/^[a-z]+:\/[a-z\/-]*$/.test(x))x='';return[a,x]})))}
 return{id:sl(w.id)||Math.random().toString(16).slice(2,8),type:w.type,props:p}}).filter(Boolean)}
module.exports={cleanWidgets};
