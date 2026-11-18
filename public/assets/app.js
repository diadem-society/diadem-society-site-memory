(async()=>{
const OD=JSON.parse(document.getElementById('od').textContent);
const $=(s,e=document)=>e.querySelector(s),$$=(s,e=document)=>[...e.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const go=(s,p='/')=>OD.domain?`https://${s==='main'?OD.domain:s+'.'+OD.domain}${p}`:(s==='main'?'':'/'+s)+p;
const api=async(p,b)=>{try{const r=await fetch('/api'+p,b===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});let j={};try{j=await r.json()}catch{}return r.ok?j:{error:j.error||'Something went wrong'}}catch{return{error:'No connection. Try again.'}}};
const ME=(await api('/me')).user||null;
const is=r=>!!ME&&(ME.roles.includes(r)||ME.roles.includes('secretariat')),pm=p=>!!ME&&ME.roles.includes('secretariat')&&(ME.perms.includes('*')||ME.perms.includes(p));
const app=$('#app'),V={},show=h=>{app.innerHTML=h};app.onclick=app.oninput=app.onchange=null;
const md=t=>esc(t).split(/\n{2,}/).map(b=>/^# /.test(b)?`<h3>${b.slice(2)}</h3>`:/^- /m.test(b)?`<ul>${b.split('\n').map(l=>`<li>${l.replace(/^- /,'')}</li>`).join('')}</ul>`:`<p>${b.replace(/\n/g,'<br>')}</p>`).join('');
const head=(t,l)=>`<h1>${esc(t)}</h1>${l?`<p class="lead">${esc(l)}</p>`:''}`;
const card=(h,b)=>`<article class="card"><h3>${esc(h)}</h3>${b}</article>`;
const fld=(n,l,t='text',x='')=>`<label>${l}<input name="${n}" type="${t}"${x}></label>`;
const fd=f=>Object.fromEntries(new FormData(f));
const lines=t=>String(t||'').split('\n').map(s=>s.trim()).filter(Boolean);
const dt=d=>new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const idx=(site,items)=>`<div class="grid">${items.map(([p,t,d])=>`<a class="card" href="${go(site,p)}"><h3>${t}</h3><p>${d}</p></a>`).join('')}</div>`;
const fmt=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');

/* header */
const NAV=ME?[['main','Home'],['committees','Committees'],['training','Training'],['sessions','Sessions'],['munsoc','MUNSoc'],['du','Debate Union'],['allotments','Allotments'],['newsletter','Newsletter'],['forum','Forum'],['applications','Apply'],...(is('eb')?[['eb','EB']]:[]),...(is('adjudicator')?[['adjudication','Adjudication']]:[]),...(ME.roles.includes('secretariat')?[['secretariat','Dashboard']]:[])]:[['main','Home'],['committees','Committees']];
$('#hd').innerHTML=`<a class="logo" href="${go('main')}">DIADEM Society</a><nav aria-label="Main">${NAV.map(([s,t])=>`<a href="${go(s)}"${OD.site===s&&!(s==='main'&&OD.path!=='/')?' aria-current="page"':''}>${t}</a>`).join('')}${ME?'':`<a href="${go('du','/about')}">About BP debate</a>`}</nav><div class="acct">${ME?`<span class="who">${esc(ME.id)}</span><button class="ghost" id="so">Sign out</button>`:`<a href="${go('main','/signin')}">Sign in</a><a class="btn" href="${go('main','/signup')}">Create account</a>`}</div>`;
if(ME)api('/allot/mine').then(a=>{if(a&&(a.portfolio||a.bpRole||a.committee)){const t=[a.committee&&a.committee.name,a.portfolio,a.bpRole].filter(Boolean).join(' \u00b7 ');const c=document.createElement('a');c.className='chip';c.href=go('allotments');c.innerHTML='<b>'+esc(t)+'</b>';const x=$('.acct');if(x)x.prepend(c)}});
if($('#so'))$('#so').onclick=async()=>{await api('/signout',{});location.href=go('main')};
$$('[data-go]').forEach(a=>{const[s,p]=a.dataset.go.split(':');a.href=go(s,p)});
if(ME)$$('[data-anon]').forEach(e=>e.remove());

/* documents */
async function doc(key,title){
 const d=await api('/doc/'+key),t=d.title||title;
 show(`<h1>${esc(t)}</h1>${d.body?md(d.body):'<p class="empty">Nothing published here yet.</p>'}`+(pm('content')?`<details class="ed"><summary>Edit this page</summary><form id="ef"><label>Title<input name="title" value="${esc(t)}"></label><label>Text (blank line between paragraphs, "# " for a heading, "- " for a list)<textarea name="body" rows="14">${esc(d.body||'')}</textarea></label><button>Save</button><p class="ok"></p></form></details>`:''));
 if($('#ef'))$('#ef').onsubmit=async e=>{e.preventDefault();const r=await api('/doc/'+key,fd(e.target));if(r.error)return;doc(key,title)};
}
const DOCS=[['about','About'],['rop','Rules of Procedure'],['policy','Conference policy'],['decorum','Decorum policy'],['constitution','Constitution']];
for(const s of['munsoc','du'])for(const[p,t]of DOCS)V[`${s}/${p}`]=()=>doc(`${s}_${p}`,p==='about'?(s==='du'?'About BP debate':'About MUNSoc'):t);
for(const[p,t]of[['mun','MUN'],['rop','Rules of Procedure'],['speeches','Speeches'],['debate','Debate']])V['training/'+p]=()=>doc('training_'+p,t);
V['munsoc/']=()=>show(head('MUNSoc','Model United Nations.')+idx('munsoc',DOCS.map(([p,t])=>['/'+p,p==='about'?'About MUNSoc':t,''])));
V['du/']=async()=>{const s=await api('/store');show(head('Debate Union','Competitive parliamentary debating.')+idx('du',DOCS.map(([p,t])=>['/'+p,p==='about'?'About BP debate':t,'']))+`<section><h2>Debate topics</h2>${(s.duTopics||[]).length?`<ol>${s.duTopics.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:'<p class="empty">No topics posted yet.</p>'}</section>`)};
V['training/']=()=>show(head('Training',"Always check the relevant conference's own Rules of Procedure.")+idx('training',[['/mun','MUN',''],['/rop','Rules of Procedure',''],['/speeches','Speeches',''],['/debate','Debate','']]));
V['sessions/']=()=>show(head('Sessions','Put the Committee Display up on the projector. It follows the Controls live.')+idx('sessions',[['/committee','Committee display','Speakers, clock and status for the committee.'],['/debate','Debate display','Speakers, clock and status for the debate.']]));

/* homepage widgets */
const PRACTICE_HTML="<section id=\"practice\"><h2>Try the chamber before you\u2019re in it.</h2><p class=\"lead\">Two small tools from our sessions. Chair a committee and call a Security Council vote, or run a debate on the clock.</p><div class=\"row\"><button class=\"on\" data-tab=\"dais\">The Dais</button><button class=\"ghost\" data-tab=\"clock\">The Chamber Clock</button></div>\n<div data-pane=\"dais\"><div class=\"card\"><h3>General Speakers\u2019 List</h3><div class=\"row\" data-lens=\"g\"><button class=\"ghost\" data-len=\"60\">1:00</button><button class=\"ghost on\" data-len=\"90\">1:30</button><button class=\"ghost\" data-len=\"120\">2:00</button></div><p class=\"big\" id=\"g-t\">1:30</p><div class=\"row\"><button id=\"g-s\">Start</button><button class=\"ghost\" id=\"g-n\">Next speaker</button><button class=\"ghost\" id=\"g-y\">Yield to the Chair</button></div></div>\n<div class=\"card\" style=\"margin-top:1rem\"><h3>Security Council vote</h3><div class=\"row\"><button class=\"on\" data-mode=\"Substantive\">Substantive</button><button class=\"ghost\" data-mode=\"Procedural\">Procedural</button></div><p>Tap a placard to cycle For, Against and Abstain. \u2605 marks the permanent five.</p><div class=\"grid pl\" id=\"v-g\"></div><div class=\"row\"><button id=\"v-s\">Simulate a vote</button><button class=\"ghost\" id=\"v-c\">Clear</button></div><p id=\"v-r\" role=\"status\"></p></div></div>\n<div data-pane=\"clock\" hidden><div class=\"card\"><p class=\"big\" id=\"p-t\">15:00</p><div class=\"row\"><button id=\"p-s\">Start prep</button><button class=\"ghost\" id=\"p-r\">Reset</button></div><p>Fifteen minutes of team prep. No internet.</p></div>\n<div class=\"card\" style=\"margin-top:1rem\"><h3>Speech</h3><div class=\"row\" data-lens=\"s\"><button class=\"ghost\" data-len=\"180\">3:00</button><button class=\"ghost\" data-len=\"300\">5:00</button><button class=\"ghost\" data-len=\"420\">7:00</button></div><p class=\"big\" id=\"s-t\">0:00</p><div class=\"row\"><button id=\"s-s\">Start</button><button class=\"ghost\" id=\"s-n\">Next speaker</button><button class=\"ghost\" id=\"s-r\">Reset</button></div><p>A bell rings when Points of Information open and close, twice at time, and three times when grace runs out.</p></div></div></section>";
const DEST=[['','No link'],['committees:/','Committees'],['training:/','Training'],['sessions:/','Sessions'],['munsoc:/','MUNSoc'],['du:/','Debate Union'],['du:/about','About BP debate'],['allotments:/','Allotments'],['newsletter:/','Newsletter'],['forum:/','Forum'],['applications:/','Apply'],['main:/signup','Create account']];
const lnk=l=>{const[s,p]=String(l||'').split(':');return s&&p?go(s,p):''};
const WT={hero:'Hero',text:'Text',notice:'Notice',countdown:'Countdown',cards:'Cards',practice:'Practice room'};
const NEWW={hero:{title:'Heading',text:'',showAuth:true},text:{title:'Heading',body:''},notice:{title:'Important notice',body:'',level:'important'},countdown:{title:'Countdown',to:'',done:'It has started.'},cards:{title:'Heading',intro:'',items:[{title:'Card',body:'',link:''}]},practice:{}};
const FIELDS={hero:[['title','Heading'],['text','Text','area'],['showAuth','Show sign-in buttons to visitors','chk']],text:[['title','Heading'],['body','Text','area']],notice:[['title','Title'],['body','Text','area'],['level','Style','sel',[['info','Normal'],['important','Important']]]],countdown:[['title','Title'],['to','Counts down to','dt'],['done','Text when it arrives']],cards:[['title','Heading'],['intro','Intro text','area']],practice:[]};
const toLocal=iso=>{const d=new Date(iso);if(!iso||isNaN(d))return'';return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16)},fromLocal=v=>{const d=new Date(v);return v&&!isNaN(d)?d.toISOString():''};
const wHTML=w=>{const p=w.props||{};switch(w.type){
 case'hero':return`<section class="hero"><h1>${esc(p.title)}</h1><p>${esc(p.text)}</p>${!ME&&p.showAuth?`<a class="btn" href="${go('main','/signup')}">Create your OneDIADEM account</a><a class="btn ghost" href="${go('main','/signin')}">Sign in</a>`:''}</section>`;
 case'text':return`<section><h2>${esc(p.title)}</h2>${md(p.body||'')}</section>`;
 case'notice':return`<div class="notice ${p.level==='important'?'important':''}"><b>${esc(p.title)}</b><p>${esc(p.body)}</p></div>`;
 case'countdown':return`<section class="card cd" data-to="${esc(p.to)}" data-done="${esc(p.done)}"><h3>${esc(p.title)}</h3><p class="big">&nbsp;</p></section>`;
 case'cards':return`<section><h2>${esc(p.title)}</h2>${p.intro?`<p class="lead">${esc(p.intro)}</p>`:''}<div class="grid">${(p.items||[]).map(i=>{const h=lnk(i.link),t=h?'a':'div';return`<${t} class="card"${h?` href="${esc(h)}"`:''}><h3>${esc(i.title)}</h3><p>${esc(i.body)}</p></${t}>`}).join('')}</div></section>`;
 case'practice':return PRACTICE_HTML;default:return''}};
const tickCD=()=>$$('.cd').forEach(e=>{const t=new Date(e.dataset.to).getTime(),b=$('.big',e);if(!t||isNaN(t)){b.textContent='Date not set';return}let s=Math.round((t-Date.now())/1000);if(s<=0){b.textContent=e.dataset.done||'Started';return}const d=Math.floor(s/86400);s%=86400;b.textContent=`${d}d ${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`});
const runPractice=()=>{if(window.PRACTICE)return window.PRACTICE();const s=document.createElement('script');s.src='/assets/practice.js?'+Date.now();document.body.append(s)};
V['main/']=async()=>{
 const r=await api('/page/home');let W=r.widgets||[],edit=false;
 const after=()=>{if(W.some(w=>w.type==='practice'))runPractice();tickCD()};
 const formHTML=w=>(FIELDS[w.type]||[]).map(([n,l,k,o])=>{const v=w.props[n];return k==='area'?`<label>${l}<textarea data-n="${n}" rows="3">${esc(v)}</textarea></label>`:k==='chk'?`<label class="chk"><input type="checkbox" data-n="${n}"${v?' checked':''}> ${l}</label>`:k==='sel'?`<label>${l}<select data-n="${n}">${o.map(([a,b])=>`<option value="${a}"${a===v?' selected':''}>${b}</option>`).join('')}</select></label>`:k==='dt'?`<label>${l}<input type="datetime-local" data-n="${n}" value="${esc(toLocal(v))}"></label>`:`<label>${l}<input data-n="${n}" value="${esc(v)}"></label>`}).join('')+(w.type==='cards'?`<h3>Cards</h3>${(w.props.items||[]).map((it,j)=>`<div class="row" data-j="${j}"><input data-it="title" value="${esc(it.title)}" placeholder="Card title"><input data-it="body" value="${esc(it.body)}" placeholder="Text"><select data-it="link">${DEST.map(([a,b])=>`<option value="${a}"${a===it.link?' selected':''}>${b}</option>`).join('')}</select><button type="button" class="ghost" data-rj="${j}">Remove</button></div>`).join('')}<button type="button" class="ghost" data-addj="1">Add a card</button>`:'');
 function draw(){
  if(!edit){show(W.map(wHTML).join('')+(pm('site')?`<p class="noprint"><button class="ghost" id="ed">Edit this page</button></p>`:''));if($('#ed'))$('#ed').onclick=()=>{edit=true;draw()};after();return}
  show(`<div class="card next"><b>Editing the homepage.</b> Move, edit, add or remove widgets. Nothing goes live until you press Save.<div class="row"><select id="nt">${Object.entries(WT).map(([k,t])=>`<option value="${k}">${t}</option>`).join('')}</select><button id="add">Add widget</button><button id="save">Save page</button><button class="ghost" id="cancel">Cancel</button></div><p class="ok" id="msg"></p></div>`+W.map((w,i)=>`<div class="wg" data-i="${i}"><div class="row wgbar"><b>${WT[w.type]}</b><button class="ghost" data-a="up">Up</button><button class="ghost" data-a="down">Down</button><button class="ghost" data-a="edit">Edit</button><button class="ghost" data-a="rm">Remove</button></div><div class="wgprev">${wHTML(w)}</div><div class="wgform" hidden></div></div>`).join(''));
  app.oninput=app.onchange=e=>{const t=e.target,wg=t.closest('.wg');if(!wg)return;const w=W[+wg.dataset.i];if(t.dataset.n)w.props[t.dataset.n]=t.type==='checkbox'?t.checked:t.type==='datetime-local'?fromLocal(t.value):t.value;else if(t.dataset.it)w.props.items[+t.closest('[data-j]').dataset.j][t.dataset.it]=t.value;else return;$('.wgprev',wg).innerHTML=wHTML(w);after()};
  app.onclick=async e=>{const t=e.target;if(t.closest('.wgprev a'))e.preventDefault();const wg=t.closest('.wg'),i=wg?+wg.dataset.i:-1;
   if(t.id==='add'){W.push({id:Math.random().toString(16).slice(2,8),type:$('#nt').value,props:JSON.parse(JSON.stringify(NEWW[$('#nt').value]))});draw()}
   else if(t.id==='cancel'){const r2=await api('/page/home');W=r2.widgets||[];edit=false;draw()}
   else if(t.id==='save'){const x=await api('/page/home',{widgets:W});if(x.error)return $('#msg').textContent=x.error;const r2=await api('/page/home');W=r2.widgets||[];edit=false;draw()}
   else if(t.dataset.a==='up'&&i>0){[W[i-1],W[i]]=[W[i],W[i-1]];draw()}
   else if(t.dataset.a==='down'&&i<W.length-1){[W[i+1],W[i]]=[W[i],W[i+1]];draw()}
   else if(t.dataset.a==='rm'){W.splice(i,1);draw()}
   else if(t.dataset.a==='edit'){const f=$('.wgform',wg);f.hidden=!f.hidden;if(!f.hidden)f.innerHTML=formHTML(W[i])||'<p class="mute">This widget has nothing to edit.</p>'}
   else if(t.dataset.rj!==undefined){W[i].props.items.splice(+t.dataset.rj,1);$('.wgform',wg).innerHTML=formHTML(W[i]);$('.wgprev',wg).innerHTML=wHTML(W[i])}
   else if(t.dataset.addj){W[i].props.items.push({title:'Card',body:'',link:''});$('.wgform',wg).innerHTML=formHTML(W[i]);$('.wgprev',wg).innerHTML=wHTML(W[i])}};
  after()};
 setInterval(tickCD,1000);draw();
};

/* committees */
V['committees/']=async()=>{
 const r=await api('/committees'),n=r.next||{},c=(r.committees||[]).find(x=>x.id===n.committee||x.name===n.committee);
 show(head('Committees','The committees we simulate. Line-ups change from conference to conference.')+(n.committee?`<div class="card next"><h3>Next up: ${esc(c?c.name:n.committee)}</h3><p>${esc(c?c.full:'')}</p><p>${esc([n.date,n.venue].filter(Boolean).join(', '))}</p>${(n.agenda||[]).length?`<h3>Agenda</h3><ol>${n.agenda.map(a=>`<li>${esc(a)}</li>`).join('')}</ol>`:''}</div>`:'<p class="empty">No committee announced yet.</p>')+`<div class="grid">${(r.committees||[]).map(x=>card(x.name,`<p>${esc(x.full)}</p>`)).join('')}</div>`);
};

/* accounts */
V['main/signin']=()=>{
 show(`${head('Sign in','Use your OneDIADEM Member ID and password.')}<form class="login" id="f">${fld('id','Member ID','text',' required autocomplete="username" placeholder="DIA-XXXX"')}${fld('password','Password','password',' required autocomplete="current-password"')}<button>Sign in</button><p class="err" role="alert"></p></form><p>New here? <a href="${go('main','/signup')}">Create your OneDIADEM account</a>.</p>`);
 $('#f').onsubmit=async e=>{e.preventDefault();const r=await api('/signin',fd(e.target));if(r.error)return $('.err').textContent=r.error;location.href=go('main')};
};
let CARD=null;
async function pdf(c){
 if(!window.jspdf)await new Promise((r,j)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';s.onload=r;s.onerror=j;document.head.append(s)}).catch(()=>{});
 if(!window.jspdf)return;const p=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:[100,64]}),W=[239,230,220],M=[185,169,163],B=[201,164,92];
 p.setFillColor(14,6,8);p.rect(0,0,100,64,'F');p.setFillColor(...B);p.rect(0,0,3,64,'F');
 p.setTextColor(...W);p.setFont('times','bold');p.setFontSize(16);p.text('DIADEM',10,14);p.setFont('helvetica','normal');p.setFontSize(7);p.setTextColor(...M);p.text('Member credential',10,19);
 p.setTextColor(...W);p.setFont('times','bold');p.setFontSize(15);p.text(c.name,10,31);p.setFont('helvetica','normal');p.setFontSize(8);
 [['Grade',c.grade],['Membership',c.membership],['Experience',c.exp||'-']].forEach(([k,x],i)=>{p.setTextColor(...M);p.text(k,10,40+i*6);p.setTextColor(...W);p.text(String(x),34,40+i*6)});
 p.setTextColor(...B);p.text('Member ID '+c.id,10,59);p.setTextColor(...M);p.text(c.registered+'   Status: '+c.status,48,59);p.save('DIADEM-member-card.pdf');
}
V['main/signup']=()=>{
 const grades=[6,7,8,9,10,11,12,'College / university','Other'];
 show(`${head('Create your OneDIADEM account','This is a club registration. Your Member ID and password give you access to everything in DIADEM.')}<form id="f" class="reg">${fld('name','Full name','text',' required autocomplete="name"')}<label>Grade<select name="grade" required><option value="">\u2014</option>${grades.map(g=>`<option>${g}</option>`).join('')}</select></label>${fld('section','Section')}${fld('email','Email','email',' required autocomplete="email"')}${fld('phone','Phone / WhatsApp','tel',' autocomplete="tel"')}<div class="card"><h3>Membership</h3><p>MUNSoc + Debate Union. Included with every registration.</p></div><fieldset><legend>Experience</legend>${['First time','A few events','Seasoned'].map(x=>`<label><input type="radio" name="exp" value="${x}">${x}</label>`).join('')}</fieldset>${fld('muns','MUNs attended (optional)','text',' inputmode="numeric"')}${fld('debates','Debates / tournaments (optional)','text',' inputmode="numeric"')}<fieldset><legend>Want to help run things? (optional)</legend>${['Tech','Design','Media','Research','Logistics','Outreach'].map(x=>`<label><input type="checkbox" name="help" value="${x}">${x}</label>`).join('')}</fieldset><label>Why do you want to join? (optional)<textarea name="why" rows="3"></textarea></label><label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>${fld('password','Choose a password (8+ characters)','password',' required minlength="8" autocomplete="new-password"')}<label class="chk"><input type="checkbox" name="consent"> DIADEM can contact me about sessions and events.</label><button>Create account</button><p class="err" role="alert"></p></form><div id="done" hidden></div>`);
 $('#f').onsubmit=async e=>{e.preventDefault();const d=fd(e.target);d.help=new FormData(e.target).getAll('help');d.consent=!!d.consent;const r=await api('/signup',d);if(r.error)return $('.err').textContent=r.error;
  CARD=r.card;const c=CARD;$('#f').hidden=true;const o=$('#done');o.hidden=false;
  o.innerHTML=`<h2>You're on the roll.</h2><p class="lead">Your registration is in. Keep your Member ID: you sign in with it.</p><div class="row"><button id="rp">Download member card (PDF)</button><a class="btn ghost" href="${go('main')}">Continue</a></div><div class="card"><h3>DIADEM Member credential</h3><p>${[['Your name',c.name],['Grade',c.grade],['Membership',c.membership],['Experience',c.exp||'\u2014'],['Member ID',c.id],['Registered',c.registered],['Status',c.status]].map(([k,x])=>`${k}: <b>${esc(x)}</b>`).join('<br>')}</p></div>`;
  $('#rp').onclick=()=>pdf(c);pdf(c)};
};

/* members: allotments, newsletter, forum, applications */
V['allotments/']=async()=>{const a=await api('/allot/mine');const b=x=>x?`<p class="bold">${esc(x)}</p>`:'<p>Not allotted yet.</p>';show(head('Your allotments')+`<div class="grid">${card('Committee',b(a.committee?`${a.committee.name}, ${a.committee.full}`:''))}${card('Portfolio',b(a.portfolio))}${card('BP debate role',b(a.bpRole))}</div>`)};
V['newsletter/']=async()=>{const r=await api('/news');show(head('Newsletter')+((r.posts||[]).length?r.posts.map(p=>`<article class="card"><h3>${esc(p.title)}</h3><p class="mute">${dt(p.date)}</p>${md(p.body)}</article>`).join(''):'<p class="empty">No issues yet.</p>'))};
V['forum/']=async()=>{
 const r=await api('/forum');
 show(head('Forum','Everyone with an account can write here. Be kind; the Secretariat can remove posts.')+`<form id="nf"><label>Title<input name="title" maxlength="120" required></label><label>Message<textarea name="body" rows="3" maxlength="2000" required></textarea></label><button>Post</button><p class="err" role="alert"></p></form>`+(r.threads||[]).map(t=>`<article class="card"><h3>${esc(t.title)}</h3><p class="mute">${esc(t.name)}, ${dt(t.date)}</p><p>${esc(t.body).replace(/\n/g,'<br>')}</p>${t.replies.map(x=>`<p class="mute">${esc(x.name)}: <span style="color:var(--bone)">${esc(x.body)}</span>${pm('forum')?` <button class="ghost" data-del="${t.id}" data-rep="${x.id}">Delete</button>`:''}</p>`).join('')}<form class="rf" data-id="${t.id}"><input name="body" placeholder="Reply" maxlength="2000" required><button>Reply</button></form>${pm('forum')?`<button class="ghost" data-del="${t.id}">Delete thread</button>`:''}</article>`).join(''));
 $('#nf').onsubmit=async e=>{e.preventDefault();const x=await api('/forum',fd(e.target));x.error?$('.err').textContent=x.error:V['forum/']()};
 $$('.rf').forEach(f=>f.onsubmit=async e=>{e.preventDefault();const x=await api('/forum/reply',{id:f.dataset.id,body:fd(f).body});x.error?alert(x.error):V['forum/']()});
 $$('[data-del]').forEach(b=>b.onclick=async()=>{await api('/forum/delete',{id:b.dataset.del,reply:b.dataset.rep});V['forum/']()});
};
const TL={eb:'Executive Board',adjudicator:'Adjudicator',secretariat:'Secretariat'};
V['applications/']=async()=>{
 const r=await api('/apps/mine');
 show(head('Apply to join the team','Apply for the Executive Board, as an adjudicator, or for the Secretariat. The Secretariat reviews every application.')+`<form id="f"><label>Role<select name="type"><option value="eb">Executive Board (chair)</option><option value="adjudicator">Adjudicator</option><option value="secretariat">Secretariat</option></select></label><label>Why would you be good at it?<textarea name="text" rows="4" maxlength="1000" required></textarea></label><button>Send application</button><p class="err" role="alert"></p></form><h2>Your applications</h2>${(r.apps||[]).length?r.apps.map(a=>card(TL[a.type]||a.type,`<p>${esc(a.status)}, ${dt(a.date)}</p>`)).join(''):'<p class="empty">None yet.</p>'}`);
 $('#f').onsubmit=async e=>{e.preventDefault();const x=await api('/apply',fd(e.target));x.error?$('.err').textContent=x.error:V['applications/']()};
};

/* live: displays and controls */
function follow(key,cb){api('/live/'+key).then(cb);if(OD.live==='poll')setInterval(async()=>{const s=await api('/live/'+key);if(!s.error)cb(s)},4000);else{const es=new EventSource('/api/live/'+key+'/stream');es.onmessage=e=>cb(JSON.parse(e.data))}}
function display(key,label){
 show(`${head(label)}<div class="card disp"><p class="mute" id="d-title"></p><p class="big" id="d-sp">\u2014</p><p class="huge" id="d-t">0:00</p><p id="d-st"></p></div><section><h3>Up next</h3><ol id="d-q"></ol></section><p class="lead" id="d-n"></p>`);
 let S=null,off=0;
 const draw=()=>{if(!S)return;const t=S.timer,left=t.end?Math.max(0,Math.round((t.end-(Date.now()+off))/1000)):t.left;$('#d-title').textContent=S.title;$('#d-sp').textContent=S.speaker||'\u2014';$('#d-t').textContent=fmt(left);$('#d-st').textContent=S.status;$('#d-n').textContent=S.note;$('#d-q').innerHTML=S.queue.map(x=>`<li>${esc(x)}</li>`).join('')};
 const set=s=>{S=s;off=s.now-Date.now();draw()};
 follow(key,set);setInterval(draw,250);
}
V['sessions/committee']=()=>display('committee','Committee display');
V['sessions/debate']=()=>display('debate','Debate display');
async function controls(key,label,disp){
 const S=await api('/live/'+key);if(S.error)return show(`<p class="err">${esc(S.error)}</p>`);
 show(`${head(label)}<p><a href="${go('sessions','/'+disp)}">Open the ${disp} display</a></p><form id="cf"><label>Title<input name="title" value="${esc(S.title)}" maxlength="140"></label><label>Status line<input name="status" value="${esc(S.status)}" maxlength="140"></label><label>Note<input name="note" value="${esc(S.note)}" maxlength="140"></label><button>Update display</button></form><section class="card"><h3>Speakers</h3><p>Now speaking: <b id="c-sp">\u2014</b></p><form id="qf"><label>Queue (one name per line)<textarea name="list" rows="5">${esc(S.queue.join('\n'))}</textarea></label><button>Save list</button></form><div class="row"><button id="nx">Next speaker</button><button class="ghost" id="cl">Clear speaker</button></div></section><section class="card"><h3>Clock</h3><p class="big" id="c-t">0:00</p><div class="row">${[60,90,120,180,300,420].map(n=>`<button class="ghost" data-n="${n}">${fmt(n)}</button>`).join('')}</div><div class="row"><button data-a="start">Start</button><button class="ghost" data-a="pause">Pause</button><button class="ghost" data-a="reset">Reset</button></div></section>`);
 const post=async b=>{const r=await api('/live/'+key,b);if(OD.live==='poll'){const s=await api('/live/'+key);if(!s.error){L=s;off=L.now-Date.now();draw()}}return r};
 $('#cf').onsubmit=e=>{e.preventDefault();post({act:'set',...fd(e.target)})};
 $('#qf').onsubmit=e=>{e.preventDefault();post({act:'queue',list:lines(fd(e.target).list)})};
 $('#nx').onclick=async()=>{await post({act:'next'});const s=await api('/live/'+key);$('#qf').elements.list.value=s.queue.join('\n')};$('#cl').onclick=()=>post({act:'clear'});
 $$('[data-n]').forEach(b=>b.onclick=()=>post({act:'dur',n:+b.dataset.n}));$$('[data-a]').forEach(b=>b.onclick=()=>post({act:b.dataset.a}));
 let L=S,off=S.now-Date.now();
 const draw=()=>{const t=L.timer;$('#c-t').textContent=fmt(t.end?Math.max(0,Math.round((t.end-(Date.now()+off))/1000)):t.left);$('#c-sp').textContent=L.speaker||'\u2014'};
 draw();follow(key,s=>{L=s;off=L.now-Date.now();draw()});setInterval(draw,250);
}
V['eb/controls']=()=>controls('committee','Committee controls','committee');
V['adjudication/controls']=()=>controls('debate','Debate controls','debate');
const table=(cols,rows)=>`<div class="scroll"><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
V['eb/']=async()=>{const[c,a,s]=await Promise.all([api('/committees'),api('/allot'),api('/store')]);const n=c.next||{},cm=(c.committees||[]).find(x=>x.id===n.committee||x.name===n.committee);
 show(head('EB dashboard')+`<p><a class="btn" href="${go('eb','/controls')}">Open committee controls</a></p><section><h2>Next committee</h2>${n.committee?`<div class="card next"><h3>${esc(cm?cm.name+', '+cm.full:n.committee)}</h3><p>${esc([n.date,n.venue].filter(Boolean).join(', '))}</p>${(n.agenda||[]).length?`<ol>${n.agenda.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}</div>`:'<p class="empty">No committee announced yet.</p>'}</section><section><h2>Portfolios in the next committee</h2>${table(['Portfolio','Delegate'],(a.rows||[]).filter(r=>cm&&r.committee===cm.id).map(r=>[r.portfolio,`${r.name} (${r.id})`]))}</section>`)};
V['adjudication/']=async()=>{const[a,s]=await Promise.all([api('/allot'),api('/store')]);
 show(head('Adjudication dashboard')+`<p><a class="btn" href="${go('adjudication','/controls')}">Open debate controls</a></p><section><h2>Debate topics</h2>${(s.duTopics||[]).length?`<ol>${s.duTopics.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:'<p class="empty">No topics posted yet.</p>'}</section><section><h2>BP roles</h2>${table(['Debater','Role'],(a.rows||[]).filter(r=>r.bpRole).map(r=>[`${r.name} (${r.id})`,r.bpRole]))}</section>`)};

/* secretariat dashboard */
const SEC=[['/registrations','Registrations','members'],['/content','Documents','content'],['/committees','Committees and next committee','committees'],['/portfolios','Portfolio matrices','committees'],['/topics','Debate topics','committees'],['/allotments','Allotments','allot'],['/newsletter','Newsletter','news'],['/applications','EB and adjudicator applications','apps'],['/forum','Forum moderation','forum']];
const secNav=()=>`<div class="sub"><a href="${go('secretariat')}">Dashboard</a>${SEC.filter(s=>pm(s[2])).map(s=>`<a href="${go('secretariat',s[0])}"${OD.path===s[0]?' aria-current="page"':''}>${s[1]}</a>`).join('')}</div>`;
V['secretariat/']=async()=>{const m=pm('members')?await api('/members'):{},a=pm('apps')?await api('/apps'):{};show(head('Secretariat dashboard')+`<div class="grid">${m.members?card('Accounts',`<p class="big">${m.members.length}</p>`):''}${a.apps?card('Pending applications',`<p class="big">${a.apps.filter(x=>x.status==='pending').length}</p>`):''}${pm('site')?`<a class="card" href="${go('main')}"><h3>Edit the homepage</h3><p>Open it and press Edit this page. Add notices, countdowns and more.</p></a>`:''}${pm('committees')?`<a class="card" href="${go('secretariat','/committees')}"><h3>Edit the committee list</h3><p>Add, rename or remove committees, and set which is next.</p></a>`:''}</div>${secNav()}`)};
const ROLEOPT=['eb','adjudicator','secretariat'],PERMS=['members','content','committees','allot','news','apps','forum','site','admin'];
V['secretariat/registrations']=async()=>{
 const r=await api('/members');if(r.error)return show(secNav()+`<p class="err">${esc(r.error)}</p>`);
 const cols=['ID','Name','Grade','Section','Email','Phone','Experience','MUNs','Debates','Helping with','Why','Roles','Joined',''];
 show(secNav()+head('Registrations',`${r.members.length} accounts. Removing a person deletes their account, allotment, applications and forum posts.`)+`<p class="err" id="rmmsg"></p><div class="scroll"><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${r.members.map(m=>`<tr>${[m.id,m.name,m.grade,m.section,m.email,m.phone,m.exp,m.muns,m.debates,(m.help||[]).join(', '),m.why,m.roles.filter(x=>x!=='member').join(', '),dt(m.created)].map(c=>`<td>${esc(c)}</td>`).join('')}<td><button class="ghost" data-rm="${esc(m.id)}">Remove</button></td></tr>`).join('')}</tbody></table></div>`+(pm('admin')?`<h2>Roles and permissions</h2><form id="rf"><label>Member<select name="member">${r.members.map(m=>`<option value="${esc(m.id)}">${esc(m.id)} ${esc(m.name)}</option>`).join('')}</select></label><fieldset><legend>Roles</legend>${ROLEOPT.map(x=>`<label><input type="checkbox" name="r" value="${x}">${x}</label>`).join('')}</fieldset><fieldset><legend>Secretariat permissions</legend>${PERMS.map(x=>`<label><input type="checkbox" name="p" value="${x}">${x}</label>`).join('')}</fieldset><button>Save</button><p class="ok"></p><p class="err"></p></form>`:''));
 $$('[data-rm]').forEach(b=>b.onclick=async()=>{if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='Tap again to remove';setTimeout(()=>{b.dataset.arm='';b.textContent='Remove'},4000);return}const x=await api('/members/delete',{id:b.dataset.rm});x.error?$('#rmmsg').textContent=x.error:V['secretariat/registrations']()});
 if(!$('#rf'))return;const f=$('#rf'),fill=()=>{const m=r.members.find(x=>x.id===f.elements.member.value);$$('[name=r]',f).forEach(c=>c.checked=m.roles.includes(c.value));$$('[name=p]',f).forEach(c=>c.checked=m.perms.includes('*')||m.perms.includes(c.value))};
 f.elements.member.onchange=fill;fill();
 f.onsubmit=async e=>{e.preventDefault();const x=await api('/members/roles',{id:f.elements.member.value,roles:$$('[name=r]:checked',f).map(c=>c.value),perms:$$('[name=p]:checked',f).map(c=>c.value)});$('.ok',f).textContent=x.error?'':'Saved.';$('.err',f).textContent=x.error||'';if(!x.error){const m=r.members.find(y=>y.id===f.elements.member.value);m.roles=['member',...$$('[name=r]:checked',f).map(c=>c.value)];m.perms=$$('[name=p]:checked',f).map(c=>c.value)}};
};
V['secretariat/content']=async()=>{
 const keys=[...['munsoc','du'].flatMap(s=>DOCS.map(([p,t])=>[`${s}_${p}`,`${s==='du'?'Debate Union':'MUNSoc'}: ${t}`])),...[['mun','MUN'],['rop','Rules of Procedure'],['speeches','Speeches'],['debate','Debate']].map(([p,t])=>[`training_${p}`,`Training: ${t}`])];
 show(secNav()+head('Documents','Pick a page, then edit it.')+`<label>Page<select id="k">${keys.map(([k,t])=>`<option value="${k}">${esc(t)}</option>`).join('')}</select></label><form id="ef"><label>Title<input name="title" id="t"></label><label>Text (blank line between paragraphs, "# " for a heading, "- " for a list)<textarea name="body" id="b" rows="16"></textarea></label><button>Save</button><p class="ok"></p></form>`);
 const ld=async()=>{const d=await api('/doc/'+$('#k').value);$('#t').value=d.title||'';$('#b').value=d.body||''};$('#k').onchange=ld;ld();
 $('#ef').onsubmit=async e=>{e.preventDefault();const r=await api('/doc/'+$('#k').value,fd(e.target));$('.ok').textContent=r.error||'Saved.'};
};
V['secretariat/committees']=async()=>{
 const s=await api('/store'),n=s.next||{};let C=(s.committees||[]).map(c=>({...c}));
 const rows=()=>C.map((c,i)=>`<div class="row" data-i="${i}"><input data-k="name" value="${esc(c.name)}" placeholder="Short name"><input data-k="full" value="${esc(c.full)}" placeholder="Full name"><button type="button" class="ghost" data-rm="${i}">Remove</button></div>`).join('')||'<p class="empty">No committees. Add one.</p>';
 show(secNav()+head('Committees and next committee','Add, rename or remove committees any time. The Committees page updates straight away.')+`<div id="cl">${rows()}</div><div class="row"><button class="ghost" id="addc">Add a committee</button><button id="savec">Save committees</button></div><p class="ok" id="okc"></p><h2>Next committee</h2><form id="nf"><label>Committee<select name="committee"><option value="">None announced</option>${(s.committees||[]).map(c=>`<option value="${esc(c.id)}"${c.id===n.committee?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label>${fld('date','Date and time','text',` value="${esc(n.date||'')}"`)}${fld('venue','Venue','text',` value="${esc(n.venue||'')}"`)}<label>Agenda (one item per line)<textarea name="agenda" rows="4">${esc((n.agenda||[]).join('\n'))}</textarea></label><button>Save next committee</button><p class="ok" id="okn"></p></form>`);
 $('#cl').oninput=e=>{const r=e.target.closest('[data-i]');if(r&&e.target.dataset.k)C[+r.dataset.i][e.target.dataset.k]=e.target.value};
 $('#cl').onclick=e=>{const b=e.target.closest('[data-rm]');if(b){C.splice(+b.dataset.rm,1);$('#cl').innerHTML=rows()}};
 $('#addc').onclick=()=>{C.push({id:'',name:'',full:''});$('#cl').innerHTML=rows()};
 $('#savec').onclick=async()=>{const r=await api('/store/committees',{value:C.filter(c=>c.name.trim())});if(r.error)return $('#okc').textContent=r.error;V['secretariat/committees']()};
 $('#nf').onsubmit=async e=>{e.preventDefault();const d=fd(e.target);const r=await api('/store/next',{value:{committee:d.committee,date:d.date,venue:d.venue,agenda:lines(d.agenda)}});$('#okn').textContent=r.error||'Saved.'};
};
V['secretariat/portfolios']=async()=>{
 const s=await api('/store');show(secNav()+head('Portfolio matrices','One portfolio (country or character) per line, per committee.')+`<label>Committee<select id="k">${(s.committees||[]).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label><form id="pf"><textarea name="p" rows="14"></textarea><button>Save</button><p class="ok"></p></form>`);
 const ld=()=>{$('#pf textarea').value=((s.portfolios||{})[$('#k').value]||[]).join('\n')};$('#k').onchange=ld;ld();
 $('#pf').onsubmit=async e=>{e.preventDefault();s.portfolios=s.portfolios||{};s.portfolios[$('#k').value]=lines(fd(e.target).p);const r=await api('/store/portfolios',{value:s.portfolios});$('.ok').textContent=r.error||'Saved.'};
};
V['secretariat/topics']=async()=>{
 const s=await api('/store');show(secNav()+head('Debate topics','One motion per line.')+`<form id="tf"><textarea name="t" rows="12">${esc((s.duTopics||[]).join('\n'))}</textarea><button>Save</button><p class="ok"></p></form>`);
 $('#tf').onsubmit=async e=>{e.preventDefault();const r=await api('/store/duTopics',{value:lines(fd(e.target).t)});$('.ok').textContent=r.error||'Saved.'};
};
V['secretariat/allotments']=async()=>{
 const r=await api('/allot/people');if(r.error)return show(secNav()+`<p class="err">${esc(r.error)}</p>`);
 const cn=id=>(r.committees.find(c=>c.id===id)||{name:id||''}).name;
 show(secNav()+head('Allotments','Pick anyone in the registry and give them a committee, a portfolio and a BP role. They see it in bold on their account straight away.')+`<form id="af"><label>Member<select name="member">${r.people.map(p=>`<option value="${esc(p.id)}">${esc(p.id)} ${esc(p.name)}</option>`).join('')}</select></label><label>Committee<select name="committee"><option value="">None</option>${r.committees.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>${fld('portfolio','Portfolio','text',' list="pl"')}<datalist id="pl"></datalist>${fld('bpRole','BP debate role')}<button>Save allotment</button><p class="ok"></p></form><h2>The registry</h2><div class="scroll"><table><thead><tr><th>Member</th><th>Committee</th><th>Portfolio</th><th>BP role</th><th></th></tr></thead><tbody>${r.people.map(p=>{const a=r.allot[p.id]||{};return`<tr><td>${esc(p.id)} ${esc(p.name)}</td><td>${esc(cn(a.committee))}</td><td>${esc(a.portfolio||'')}</td><td>${esc(a.bpRole||'')}</td><td><button class="ghost" data-e="${esc(p.id)}">Edit</button></td></tr>`}).join('')}</tbody></table></div>`);
 const f=$('#af'),pl=()=>{$('#pl').innerHTML=(r.portfolios[f.elements.committee.value]||[]).map(x=>`<option value="${esc(x)}">`).join('')},fill=()=>{const a=r.allot[f.elements.member.value]||{};f.elements.committee.value=a.committee||'';f.elements.portfolio.value=a.portfolio||'';f.elements.bpRole.value=a.bpRole||'';pl()};
 f.elements.member.onchange=fill;f.elements.committee.onchange=pl;fill();
 $$('[data-e]').forEach(b=>b.onclick=()=>{f.elements.member.value=b.dataset.e;fill();f.scrollIntoView()});
 f.onsubmit=async e=>{e.preventDefault();const x=await api('/allot',{...fd(f),id:f.elements.member.value});if(x.error)return $('.ok',f).textContent=x.error;V['secretariat/allotments']()};
};
V['secretariat/newsletter']=async()=>{
 const r=await api('/news');show(secNav()+head('Newsletter')+`<form id="nf"><label>Title<input name="title" required></label><label>Text<textarea name="body" rows="8"></textarea></label><button>Publish</button><p class="err"></p></form>`+(r.posts||[]).map(p=>`<article class="card"><h3>${esc(p.title)}</h3><p class="mute">${dt(p.date)}</p><button class="ghost" data-id="${p.id}">Delete</button></article>`).join(''));
 $('#nf').onsubmit=async e=>{e.preventDefault();const x=await api('/news',fd(e.target));x.error?$('.err').textContent=x.error:V['secretariat/newsletter']()};
 $$('[data-id]').forEach(b=>b.onclick=async()=>{await api('/news/delete',{id:b.dataset.id});V['secretariat/newsletter']()});
};
V['secretariat/applications']=async()=>{
 const r=await api('/apps');show(secNav()+head('Applications')+((r.apps||[]).length?r.apps.map(a=>card(`${a.name} (${a.member}) for ${TL[a.type]||a.type}`,`<p>${esc(a.text)}</p><p class="mute">${esc(a.status)}, ${dt(a.date)}</p>${a.status==='pending'?(a.type==='secretariat'&&!pm('admin')?'<p class="mute">Only an admin can decide secretariat applications.</p>':`<div class="row"><button data-id="${a.id}" data-d="approve">Approve</button><button class="ghost" data-id="${a.id}" data-d="decline">Decline</button></div>`):''}`)).join(''):'<p class="empty">No applications yet.</p>'));
 $$('[data-d]').forEach(b=>b.onclick=async()=>{await api('/apps/decide',{id:b.dataset.id,decision:b.dataset.d});V['secretariat/applications']()});
};
V['secretariat/forum']=async()=>{
 const r=await api('/forum');show(secNav()+head('Forum moderation')+(r.threads||[]).map(t=>`<article class="card"><h3>${esc(t.title)}</h3><p class="mute">${esc(t.name)} (${esc(t.by)}), ${dt(t.date)}</p><p>${esc(t.body)}</p>${t.replies.map(x=>`<p class="mute">${esc(x.name)}: ${esc(x.body)} <button class="ghost" data-t="${t.id}" data-r="${x.id}">Delete</button></p>`).join('')}<button class="ghost" data-t="${t.id}">Delete thread</button></article>`).join(''));
 $$('[data-t]').forEach(b=>b.onclick=async()=>{await api('/forum/delete',{id:b.dataset.t,reply:b.dataset.r});V['secretariat/forum']()});
};

const view=V[OD.site+OD.path];
if(view)await view();
const T={main:'DIADEM Society',committees:'Committees',training:'Training',sessions:'Sessions',munsoc:'MUNSoc',du:'Debate Union',allotments:'Allotments',newsletter:'Newsletter',forum:'Forum',applications:'Apply',eb:'EB',adjudication:'Adjudication',secretariat:'Secretariat'};
document.title=(OD.site==='main'?'':T[OD.site]+' | ')+'DIADEM Society';
})();
