'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{AsyncLocalStorage}=require('async_hooks');
const SHELL=require('./shell.js'),HOMEDEF=require('./home-default.json'),{cleanWidgets}=require('./widgets.js');
const PUBLIC=path.join(__dirname,'..','public');
const SERVERLESS=!!(process.env.VERCEL||process.env.SERVERLESS);
const PORT=+process.env.PORT||3000,DOMAIN=(process.env.DOMAIN||'').toLowerCase().replace(/^\./,''),DIR=process.env.DATA_DIR||path.join(__dirname,'..','storage');
const ADMINS=(process.env.SECRETARIAT_EMAILS||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
const PAGES={main:['/','/signin','/signup'],committees:['/'],training:['/','/mun','/rop','/speeches','/debate'],sessions:['/','/committee','/debate'],
 munsoc:['/','/about','/rop','/policy','/decorum','/constitution'],du:['/','/about','/rop','/policy','/decorum','/constitution'],
 allotments:['/'],newsletter:['/'],forum:['/'],applications:['/'],eb:['/','/controls'],adjudication:['/','/controls'],
 secretariat:['/','/registrations','/content','/committees','/portfolios','/topics','/allotments','/newsletter','/applications','/forum']};
const SITES=Object.keys(PAGES),PERMS=['members','content','committees','allot','news','apps','forum','site','admin'],ROLES=['member','eb','adjudicator','secretariat'];
const AL='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const str=(v,n)=>String(v??'').trim().slice(0,n),slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40),uid=()=>crypto.randomBytes(6).toString('hex');
const blank=()=>({title:'',status:'',speaker:'',queue:[],note:'',timer:{dur:90,left:90,end:null},updated:0});
const defaults=()=>({users:{},sessions:{},content:{},committees:[{id:'unsc',name:'UNSC',full:'United Nations Security Council'},{id:'unga',name:'UNGA',full:'United Nations General Assembly'},{id:'unhrc',name:'UNHRC',full:'United Nations Human Rights Council'},{id:'unicef',name:'UNICEF',full:'United Nations Children’s Fund'},{id:'ccc',name:'CCC',full:'Mahabharat Sabha'}],next:{},portfolios:{},duTopics:[],allot:{},news:[],forum:[],apps:[],pages:{home:JSON.parse(JSON.stringify(HOMEDEF))}});

/* ---------- storage: Upstash Redis over REST (works from Render and Vercel) or a local file ---------- */
const KV_URL=process.env.UPSTASH_REDIS_REST_URL,KV_TOKEN=process.env.UPSTASH_REDIS_REST_TOKEN,KEY='onediadem:db',KL='onediadem:live';
const kv=async cmd=>{const r=await fetch(KV_URL,{method:'POST',headers:{Authorization:'Bearer '+KV_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(cmd)});const j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw new Error(j.error||'KV '+r.status);return j.result};
const FILE=path.join(DIR,'db.json');
if(!KV_URL&&!SERVERLESS){fs.mkdirSync(DIR,{recursive:true});if(process.env.RENDER)console.warn('WARNING: UPSTASH_REDIS_REST_URL is not set. All data will be lost on every restart.')}
const als=new AsyncLocalStorage();let G=defaults();
const cur=()=>(als.getStore()||{}).db||G;
const db=new Proxy({},{get:(_,k)=>cur()[k],set:(_,k,v)=>{cur()[k]=v;return true},ownKeys:()=>Reflect.ownKeys(cur()),getOwnPropertyDescriptor:(_,k)=>({value:cur()[k],enumerable:true,configurable:true}),has:(_,k)=>k in cur()});
const persist=d=>{const n=Date.now();for(const t in d.sessions)if(d.sessions[t].exp<n)delete d.sessions[t];return JSON.stringify(d)};
let wt=null,dirty=false;
const flush=async()=>{if(!dirty)return;dirty=false;const s=persist(G);try{if(KV_URL)await kv(['SET',KEY,s]);else{fs.writeFileSync(FILE+'.tmp',s);fs.renameSync(FILE+'.tmp',FILE)}}catch(e){dirty=true;console.error('Save failed:',e.message)}};
const save=()=>{const s=als.getStore();if(s&&s.mark)return s.mark();dirty=true;clearTimeout(wt);wt=setTimeout(flush,KV_URL?2000:200)};
async function load(){try{const v=KV_URL?await kv(['GET',KEY]):fs.readFileSync(FILE,'utf8');if(v)G={...defaults(),...JSON.parse(v)}}catch(e){if(KV_URL){console.error('Could not load data, stopping so nothing is overwritten:',e.message);process.exit(1)}}}
/* serverless: every request loads the data, and writes use compare-and-set so two requests never overwrite each other */
const LUA="local c=tonumber(redis.call('GET',KEYS[2]) or '0') if c==tonumber(ARGV[1]) then redis.call('SET',KEYS[1],ARGV[2]) redis.call('SET',KEYS[2],c+1) return 1 else return 0 end";
const loadKV=async()=>{const[v,ver]=await kv(['MGET',KEY,KEY+':ver']);return{d:{...defaults(),...(v?JSON.parse(v):{})},ver:+ver||0}};
const casSave=async(d,ver)=>(await kv(['EVAL',LUA,'2',KEY,KEY+':ver',String(ver),persist(d)]))===1;
const mkCap=()=>({code:200,h:{},b:'',writeHead(c,h){this.code=c;this.h=h||{}},write(){},end(b){this.b=b}});

/* ---------- security helpers ---------- */
const hashPw=(p,s=crypto.randomBytes(16).toString('hex'))=>s+':'+crypto.scryptSync(p,s,32).toString('hex');
const okPw=(p,h)=>{const[s,x]=String(h).split(':'),y=crypto.scryptSync(p,s,32).toString('hex');return x.length===y.length&&crypto.timingSafeEqual(Buffer.from(x),Buffer.from(y))};
const hits=new Map();setInterval(()=>hits.clear(),6e5).unref();
const limit=(k,max,ms)=>{const n=Date.now(),a=(hits.get(k)||[]).filter(t=>n-t<ms);a.push(n);hits.set(k,a);return a.length>max};
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split('; ').filter(Boolean).map(c=>{const i=c.indexOf('=');return[c.slice(0,i),c.slice(i+1)]}));
const setC=(req,v,age)=>`onediadem=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${DOMAIN?'; Domain=.'+DOMAIN:''}${DOMAIN||req.headers['x-forwarded-proto']==='https'?'; Secure':''}`;
const who=req=>{const s=db.sessions[cookies(req).onediadem];return s&&s.exp>Date.now()&&db.users[s.id]||null};
const can=(u,r)=>!!u&&(r==='member'||u.roles.includes(r)||u.roles.includes('secretariat'));
const perm=(u,p)=>!!u&&u.roles.includes('secretariat')&&(u.perms.includes('*')||u.perms.includes(p));
const allow=(s,p,u)=>s==='eb'?can(u,'eb'):s==='adjudication'?can(u,'adjudicator'):s==='secretariat'?can(u,'secretariat'):(s==='main'||s==='committees'||(s==='du'&&p==='/about'))?true:!!u;
const pubU=u=>({id:u.id,name:u.name,grade:u.grade,roles:u.roles,perms:u.perms});
const SEC={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"};
const send=(res,c,o,h={})=>{res.writeHead(c,{'Content-Type':'application/json','Cache-Control':'no-store',...SEC,...h});res.end(JSON.stringify(o))};
const html=(res,c,t)=>{res.writeHead(c,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',...SEC});res.end(t)};
const readBody=req=>new Promise((ok,no)=>{let b='';req.on('data',c=>{b+=c;if(b.length>3e5){no(413);req.destroy()}});req.on('end',()=>{try{ok(b?JSON.parse(b):{})}catch{no(400)}})});
const bodyOf=async req=>{if(req.method!=='POST')return{};if(!/json/.test(req.headers['content-type']||''))throw 415;if(req.body!==undefined&&req.body!==null)return typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body;return await readBody(req)};
const MIME={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};

/* ---------- live displays: memory + SSE on a long-lived server, a Redis key + polling on serverless ---------- */
let live={committee:blank(),debate:blank()};const subs={committee:new Set(),debate:new Set()};
const snap=k=>`data: ${JSON.stringify({...live[k],now:Date.now()})}\n\n`,push=k=>subs[k].forEach(r=>r.write(snap(k)));
setInterval(()=>Object.values(subs).forEach(s=>s.forEach(r=>r.write(': ping\n\n'))),25000).unref();
const getLive=async()=>{if(!SERVERLESS)return live;try{const v=await kv(['GET',KL]);return{committee:blank(),debate:blank(),...(v?JSON.parse(v):{})}}catch{return{committee:blank(),debate:blank()}}};
const setLive=async L=>{if(SERVERLESS)await kv(['SET',KL,JSON.stringify(L)])};
function liveAct(L,k,b){const s=L[k],t=s.timer,n=Date.now(),left=()=>t.end?Math.max(0,Math.round((t.end-n)/1000)):t.left;
 switch(b.act){
  case 'set':for(const f of['title','status','note'])if(f in b)s[f]=str(b[f],140);break;
  case 'queue':s.queue=(Array.isArray(b.list)?b.list:[]).slice(0,60).map(x=>str(x,60)).filter(Boolean);break;
  case 'next':s.speaker=s.queue.shift()||'';t.left=t.dur;t.end=null;break;
  case 'clear':s.speaker='';break;
  case 'dur':t.dur=Math.min(3600,Math.max(5,(+b.n)|0));t.left=t.dur;t.end=null;break;
  case 'start':if(!t.end&&t.left>0)t.end=n+t.left*1000;break;
  case 'pause':t.left=left();t.end=null;break;
  case 'reset':t.left=t.dur;t.end=null;break;
  default:return false}
 s.updated=n;return true}

const STORE={committees:v=>(Array.isArray(v)?v:[]).slice(0,40).map(c=>({id:slug(c.id||c.name),name:str(c.name,60),full:str(c.full,120)})).filter(c=>c.id&&c.name),
 next:v=>({committee:str(v&&v.committee,60),date:str(v&&v.date,60),venue:str(v&&v.venue,80),agenda:(Array.isArray(v&&v.agenda)?v.agenda:[]).slice(0,30).map(x=>str(x,200)).filter(Boolean)}),
 portfolios:v=>Object.fromEntries(Object.entries(v||{}).slice(0,40).map(([k,a])=>[slug(k),(Array.isArray(a)?a:[]).slice(0,300).map(x=>str(x,80)).filter(Boolean)])),
 duTopics:v=>(Array.isArray(v)?v:[]).slice(0,100).map(x=>str(x,300)).filter(Boolean)};

async function api(req,res,p,b){
 const u=who(req),m=req.method,k=m+' '+p,ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
 const E=(c,e)=>send(res,c,{error:e}),O=o=>send(res,200,o);
 const M=()=>u||(E(401,'Sign in required'),0),R=r=>can(u,r)||(E(u?403:401,u?'Not allowed':'Sign in required'),0),P=x=>perm(u,x)||(E(u?403:401,u?'Not allowed':'Sign in required'),0);
 const sess=(user,extra)=>{const t=crypto.randomBytes(24).toString('hex');db.sessions[t]={id:user.id,exp:Date.now()+30*864e5};save();send(res,200,extra,{'Set-Cookie':setC(req,t,30*86400)})};

 if(k==='GET /api/me')return O({user:u?pubU(u):null});
 if(k==='GET /api/committees')return O({committees:db.committees,next:db.next});
 if(k==='GET /api/page/home')return O({widgets:db.pages&&db.pages.home||HOMEDEF});
 if(k==='POST /api/page/home'){if(!P('site'))return;db.pages=db.pages||{};db.pages.home=cleanWidgets(b.widgets);save();return O({ok:1})}
 if(k==='POST /api/signup'){
  if(limit('su'+ip,10,36e5))return E(429,'Too many attempts. Try again later.');
  if(b.website)return E(400,'Could not register.');
  const n=(s,l=200)=>str(b[s],l),name=n('name'),email=n('email').toLowerCase(),pw=String(b.password||'');
  if(!name||!n('grade'))return E(400,'Name and grade are required.');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return E(400,'Enter a valid email.');
  if(pw.length<8||pw.length>200)return E(400,'Password must be at least 8 characters.');
  if(Object.values(db.users).some(x=>x.email===email))return E(409,'That email already has an account. Sign in instead.');
  let id;do id='DIA-'+[...crypto.randomBytes(4)].map(x=>AL[x%32]).join('');while(db.users[id]);
  const adm=ADMINS.includes(email),user={id,name,email,grade:n('grade'),section:n('section'),phone:n('phone',30),exp:n('exp'),muns:n('muns',10),debates:n('debates',10),help:(Array.isArray(b.help)?b.help:[]).slice(0,6).map(x=>str(x,20)),why:n('why',1000),consent:!!b.consent,roles:adm?['member','secretariat']:['member'],perms:adm?['*']:[],pw:hashPw(pw),created:new Date().toISOString()};
  db.users[id]=user;
  return sess(user,{ok:1,card:{id,name,grade:user.grade,membership:'MUNSoc + Debate Union',exp:user.exp,registered:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),status:'Pending'}});
 }
 if(k==='POST /api/signin'){
  const id=str(b.id,20).toUpperCase();
  if(limit('si'+ip,20,6e5)||limit('si'+id,8,6e5))return E(429,'Too many attempts. Try again in a few minutes.');
  const user=db.users[id];
  if(!user||!okPw(String(b.password||''),user.pw))return E(401,'That Member ID and password do not match.');
  return sess(user,{ok:1});
 }
 if(k==='POST /api/signout'){const t=cookies(req).onediadem;if(t&&db.sessions[t]){delete db.sessions[t];save()}return send(res,200,{ok:1},{'Set-Cookie':setC(req,'',0)})}

 if(k==='GET /api/store'){if(!M())return;return O({committees:db.committees,next:db.next,portfolios:db.portfolios,duTopics:db.duTopics})}
 let a;
 if(m==='POST'&&(a=p.match(/^\/api\/store\/(\w+)$/))){if(!P('committees'))return;const f=STORE[a[1]];if(!f)return E(404,'Unknown list');db[a[1]]=f(b.value);save();return O({ok:1})}
 if(m==='GET'&&(a=p.match(/^\/api\/doc\/([a-z]+_[a-z]+)$/))){if(a[1]!=='du_about'&&!M())return;return O(db.content[a[1]]||{title:'',body:''})}
 if(m==='POST'&&(a=p.match(/^\/api\/doc\/((?:munsoc|du|training)_[a-z]+)$/))){if(!P('content'))return;db.content[a[1]]={title:str(b.title,120),body:String(b.body||'').slice(0,100000)};save();return O({ok:1})}

 if(k==='GET /api/allot/mine'){if(!M())return;const x=db.allot[u.id]||{},c=db.committees.find(c=>c.id===x.committee);return O({committee:c||null,portfolio:x.portfolio||'',bpRole:x.bpRole||''})}
 if(k==='GET /api/allot'){if(!(can(u,'eb')||can(u,'adjudicator')))return E(u?403:401,'Not allowed');return O({committees:db.committees,rows:Object.entries(db.allot).filter(([id])=>db.users[id]).map(([id,x])=>({id,name:db.users[id].name,...x}))})}
 if(k==='GET /api/allot/people'){if(!P('allot'))return;return O({people:Object.values(db.users).map(x=>({id:x.id,name:x.name})),allot:db.allot,committees:db.committees,portfolios:db.portfolios})}
 if(k==='POST /api/allot'){if(!P('allot'))return;const id=str(b.id,20);if(!db.users[id])return E(404,'No such member');const x={committee:str(b.committee,60),portfolio:str(b.portfolio,80),bpRole:str(b.bpRole,80)};if(x.committee||x.portfolio||x.bpRole)db.allot[id]=x;else delete db.allot[id];save();return O({ok:1})}

 if(k==='GET /api/news'){if(!M())return;return O({posts:db.news.slice().reverse()})}
 if(k==='POST /api/news'){if(!P('news'))return;const t=str(b.title,120);if(!t)return E(400,'Add a title');db.news.push({id:uid(),title:t,body:String(b.body||'').slice(0,20000),date:new Date().toISOString(),by:u.name});save();return O({ok:1})}
 if(k==='POST /api/news/delete'){if(!P('news'))return;db.news=db.news.filter(x=>x.id!==b.id);save();return O({ok:1})}

 if(k==='GET /api/forum'){if(!M())return;return O({threads:db.forum.slice().reverse()})}
 if(k==='POST /api/forum'){if(!M())return;if(limit('fp'+u.id,8,6e4))return E(429,'Slow down a little.');const t=str(b.title,120),body=str(b.body,2000);if(!t||!body)return E(400,'Add a title and a message');db.forum.push({id:uid(),by:u.id,name:u.name,title:t,body,date:new Date().toISOString(),replies:[]});save();return O({ok:1})}
 if(k==='POST /api/forum/reply'){if(!M())return;if(limit('fp'+u.id,8,6e4))return E(429,'Slow down a little.');const th=db.forum.find(x=>x.id===b.id),body=str(b.body,2000);if(!th||!body)return E(400,'Nothing to post');th.replies.push({id:uid(),by:u.id,name:u.name,body,date:new Date().toISOString()});save();return O({ok:1})}
 if(k==='POST /api/forum/delete'){if(!P('forum'))return;if(b.reply){const th=db.forum.find(x=>x.id===b.id);if(th)th.replies=th.replies.filter(r=>r.id!==b.reply)}else db.forum=db.forum.filter(x=>x.id!==b.id);save();return O({ok:1})}

 if(k==='POST /api/apply'){if(!M())return;const type=['eb','adjudicator','secretariat'].includes(b.type)?b.type:null,text=str(b.text,1000);if(!type||!text)return E(400,'Choose a role and tell us why');if(u.roles.includes(type))return E(400,'You already hold that role.');if(db.apps.some(x=>x.member===u.id&&x.type===type&&x.status==='pending'))return E(400,'You already have a pending application for that role.');db.apps.push({id:uid(),member:u.id,type,text,status:'pending',date:new Date().toISOString()});save();return O({ok:1})}
 if(k==='GET /api/apps/mine'){if(!M())return;return O({apps:db.apps.filter(x=>x.member===u.id)})}
 if(k==='GET /api/apps'){if(!P('apps'))return;return O({apps:db.apps.map(x=>({...x,name:(db.users[x.member]||{}).name||x.member})).reverse()})}
 if(k==='POST /api/apps/decide'){if(!P('apps'))return;const x=db.apps.find(y=>y.id===b.id);if(!x||x.status!=='pending')return E(404,'Not found');if(x.type==='secretariat'&&!perm(u,'admin'))return E(403,'Only an admin can decide secretariat applications.');x.status=b.decision==='approve'?'approved':'declined';const t=db.users[x.member];if(x.status==='approved'&&t&&!t.roles.includes(x.type)){t.roles.push(x.type);if(x.type==='secretariat')t.perms=t.perms||[]}save();return O({ok:1})}

 if(k==='GET /api/members'){if(!P('members'))return;return O({members:Object.values(db.users).map(({pw,...r})=>r)})}
 if(k==='POST /api/members/roles'){if(!P('admin'))return;const t=db.users[str(b.id,20)];if(!t)return E(404,'No such member');const roles=['member',...ROLES.filter(r=>r!=='member'&&(b.roles||[]).includes(r))],perms=PERMS.filter(x=>(b.perms||[]).includes(x));if(t.id===u.id&&!roles.includes('secretariat'))return E(400,'You cannot remove your own secretariat role.');t.roles=roles;t.perms=roles.includes('secretariat')?perms:[];save();return O({ok:1})}
 if(k==='POST /api/members/delete'){if(!P('members'))return;const id=str(b.id,20),t=db.users[id];if(!t)return E(404,'No such member');if(id===u.id)return E(400,'You cannot remove your own account.');if(t.roles.includes('secretariat')&&!perm(u,'admin'))return E(403,'Only an admin can remove a secretariat member.');
  delete db.users[id];delete db.allot[id];db.apps=db.apps.filter(x=>x.member!==id);db.forum=db.forum.filter(x=>x.by!==id);db.forum.forEach(th=>{th.replies=th.replies.filter(r=>r.by!==id)});for(const t2 in db.sessions)if(db.sessions[t2].id===id)delete db.sessions[t2];save();return O({ok:1})}

 if(m==='GET'&&(a=p.match(/^\/api\/live\/(committee|debate)(\/stream)?$/))){
  if(!M())return;
  if(!a[2]){const L=await getLive();return O({...L[a[1]],now:Date.now()})}
  if(SERVERLESS)return E(400,'Streaming is not available here. Poll instead.');
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store',Connection:'keep-alive',...SEC});res.write(snap(a[1]));subs[a[1]].add(res);req.on('close',()=>subs[a[1]].delete(res));return;
 }
 if(m==='POST'&&(a=p.match(/^\/api\/live\/(committee|debate)$/))){if(!R(a[1]==='committee'?'eb':'adjudicator'))return;const L=await getLive();if(!liveAct(L,a[1],b))return E(400,'Unknown action');await setLive(L);if(!SERVERLESS)push(a[1]);return O({ok:1})}
 return E(404,'Not found');
}

/* run one API call. Serverless: load, run, then compare-and-set; retry if another request wrote first */
async function runApi(req,res,p){
 let b;try{b=await bodyOf(req)}catch(e){return send(res,e===415?415:e===413?413:400,{error:e===415?'JSON only':'Bad request'})}
 if(!SERVERLESS)return api(req,res,p,b);
 if(!KV_URL)return send(res,503,{error:'Storage is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'});
 for(let i=0;i<4;i++){
  const{d,ver}=await loadKV(),cap=mkCap();let w=false;
  await als.run({db:d,mark:()=>{w=true}},()=>api(req,cap,p,b));
  if(!w||await casSave(d,ver)){res.writeHead(cap.code,cap.h);return res.end(cap.b)}
 }
 send(res,409,{error:'The server was busy. Please try again.'});
}
async function readUser(req){if(!SERVERLESS)return who(req);if(!KV_URL)return null;const{d}=await loadKV();return als.run({db:d},()=>who(req))}

async function handler(req,res){
 try{
  const url=new URL(req.url,'http://x');let p=url.pathname;
  if(p==='/healthz')return html(res,200,'ok');
  if(p.startsWith('/assets/')){const f=path.normalize(path.join(PUBLIC,p));if(!f.startsWith(path.join(PUBLIC,'assets')))return html(res,404,'Not found');return fs.readFile(f,(e,d)=>{if(e)return html(res,404,'Not found');res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'public, max-age=300',...SEC});res.end(d)})}
  if(p.startsWith('/api/'))return await runApi(req,res,p);
  if(req.method!=='GET'&&req.method!=='HEAD')return html(res,405,'Method not allowed');
  const host=(req.headers.host||'').split(':')[0].toLowerCase();let site='main';
  if(DOMAIN&&(host===DOMAIN||host.endsWith('.'+DOMAIN))){const sub=host===DOMAIN?'main':host.slice(0,-DOMAIN.length-1);if(!SITES.includes(sub))return html(res,404,'Not found');site=sub}
  else{const seg=p.split('/')[1];if(seg!=='main'&&SITES.includes(seg)){site=seg;p=p.slice(seg.length+1)||'/'}}
  if(p.length>1)p=p.replace(/\/+$/,'');
  const u=await readUser(req);
  if(!PAGES[site].includes(p)||!allow(site,p,u))return html(res,404,'<!doctype html><meta charset="utf-8"><title>Not found</title><body style="font-family:system-ui;background:#0e0608;color:#efe6dc;padding:3rem"><h1>Page not found</h1>');
  const od=JSON.stringify({site,path:p,domain:DOMAIN,live:SERVERLESS?'poll':'sse'}).replace(/</g,'\\u003c');
  html(res,200,SHELL.replace('@OD',()=>od));
 }catch(e){console.error(e);if(!res.headersSent)send(res,500,{error:'Server error'})}
}
function start(){
 load().then(()=>http.createServer(handler).listen(PORT,()=>console.log('OneDIADEM on :'+PORT)));
 setInterval(flush,30000).unref();
 const bye=async()=>{await flush();process.exit(0)};process.on('SIGTERM',bye);process.on('SIGINT',bye);
}
module.exports={handler,start};
