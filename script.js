/* ===== Cute Planner =====
   Data lives in this browser's localStorage (key "planner") — it is DEVICE-SPECIFIC.
   Every row has a unique id and a real date. Weeks (Mon–Sun) are worked out from dates,
   so a new week simply shows up empty and old weeks are never touched. */
const $=s=>document.querySelector(s);
const P=['#f7b6d2','#c9b6f2','#b8e8d0','#b6d8f7','#fde2b3','#fbd3c4'];
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const fmt=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>fmt(new Date());
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const dayOf=d=>d?DAYS[(new Date(d+'T00:00').getDay()+6)%7]:'';
const week=d=>{const x=new Date(d+'T00:00'),k=(x.getDay()+6)%7;return[...Array(7)].map((_,i)=>{const y=new Date(x);y.setDate(x.getDate()-k+i);return fmt(y)})};
const sum=(a,f)=>a.reduce((n,x)=>n+(+f(x)||0),0);
const pct=(a,b)=>b?Math.round(a/b*100):0;
const bar=p=>`<div class="bar" role="progressbar" aria-valuenow="${p}"><i style="width:${p}%"></i></div>`;
const card=(t,v,p)=>`<div class="card"><small>${t}</small><div class="big">${v}</div>${p==null?'':bar(p)}</div>`;
const cv=id=>`<div class="card chart"><canvas id="${id}" role="img" aria-label="${id} chart"></canvas></div>`;

/* ---------- calculations ---------- */
const mins=r=>{if(!r.s||!r.e)return 0;const f=t=>t.split(':')[0]*60+ +t.split(':')[1];return Math.max(0,f(r.e)-f(r.s))};
const prot=r=>r.pt!==''&&r.pt!=null?+r.pt:(+r.pm||0)+(+r.pa||0)+(+r.pe||0)+(+r.pn||0);
const ST=['Not Started','In Progress','Completed','Need Revision'];
const SS=['Not Started','In Progress','Learned','Need Revision'];
const SK=['Speaking','Listening','Reading','Writing','Vocabulary','Grammar','Pronunciation','Interview Practice'];

/* ---------- table definitions: [key,label,type,extra] — type 'f' = auto-calculated, 'sel' = dropdown, number extra = max ---------- */
const T={
diet:{c:[['date','Date','date'],['_d','Day','f',r=>dayOf(r.date)],['m','Morning meal'],['pm','Protein g','number'],['a','Afternoon/lunch'],['pa','Protein g','number'],['e','Evening snacks'],['pe','Protein g','number'],['n','Night/dinner'],['pn','Protein g','number'],['pt','Daily protein (type to override)','number'],['_t','Total protein g','f',r=>prot(r)],['w','Water (ml)','number'],['d','Drink'],['kg','Weight kg','number'],['note','Notes']]},
study:{c:[['date','Date','date'],['_d','Day','f',r=>dayOf(r.date)],['cat','Subject / category'],['topic','Topic learned'],['s','Start','time'],['e','End','time'],['_m','Time (min)','f',r=>mins(r)],['prog','Program / problem'],['solved','Programs solved','number'],['st','Status','sel',ST],['note','Notes']]},
subj:{c:[['subject','Subject'],['unit','Unit','sel',['1','2','3','4','5']],['topic','Topic'],['_l','Learned','f',r=>r.st==='Learned'?'✔':''],['_p','Still to learn','f',r=>r.st==='Learned'?'':'•'],['st','Status','sel',SS],['ds','Date started','date'],['dc','Date completed','date'],['note','Notes']]},
eng:{c:[['date','Date','date'],['type','Practice type'],['skill','Skill','sel',SK],['topic','Topic / prompt'],['min','Minutes','number'],['words','New words','number'],['conf','Confidence /5','number',5],['score','Test score /100','number',100],['fb','Feedback & mistakes'],['goal','Next goal']]},
tests:{c:[['date','Test date','date'],['_m','Month','f',r=>(r.date||'').slice(0,7)],['kind','Test','sel',['Monthly Test 1','Monthly Test 2']],['topic','Speaking topic'],['score','Score /100','number',100],['conf','Confidence /5','number',5],['fb','Feedback']]}
};
const TITLES={dash:'🏠 Dashboard',diet:'🥗 Diet & Weight',study:'📚 Placement Preparation',subj:'🎓 College Subjects',eng:'🗣️ English Practice',hist:'🗓️ Progress History'};

let db=JSON.parse(localStorage.getItem('planner')||'null')||{diet:[],study:[],subj:[],eng:[],tests:[]};
let pg='dash',sel=today(),q='',fs={subj:'',unit:'',st:''},mo=today().slice(0,7);
const save=()=>{localStorage.setItem('planner',JSON.stringify(db));const s=$('#saved');s.classList.add('on');clearTimeout(save.t);save.t=setTimeout(()=>s.classList.remove('on'),1200)};
const wk=()=>week(sel);
const inWk=r=>wk().includes(r.date);
const sorted=a=>[...a].sort((x,y)=>(x.date||'').localeCompare(y.date||''));
const match=r=>!q||JSON.stringify(r).toLowerCase().includes(q.toLowerCase());

/* ---------- weekly report: one summary row for EVERY week that has records (built from saved data, never deleted) ---------- */
function weekly(){
  const ms=[...new Set([...db.diet,...db.study,...db.eng].map(r=>r.date).filter(Boolean).map(d=>week(d)[0]))].sort();
  return ms.map(m=>{const W=week(m),f=a=>a.filter(r=>W.includes(r.date)),s=f(db.study),d=f(db.diet),e=f(db.eng),k=sorted(d.filter(r=>r.kg));
    return{wk:m,hours:+(sum(s,mins)/60).toFixed(1),solved:sum(s,r=>r.solved),topics:s.filter(r=>r.st==='Completed').length,prot:d.length?Math.round(sum(d,prot)/d.length):0,kg:k.length?+k[k.length-1].kg:null,eng:sum(e,r=>r.min)}});
}
const weeklyHtml=()=>{const w=weekly();return`<div class="card"><div class="tools"><h3>📈 Weekly report (all weeks)</h3><button class="b" data-a="wcsv">⬇ Weekly report CSV</button></div><div class="wrap"><table><tr><th>Week starting (Mon)</th><th>Study hours</th><th>Programs solved</th><th>Topics completed</th><th>Avg protein/day (g)</th><th>Latest weight (kg)</th><th>English min</th></tr>${w.map(r=>`<tr><td style="padding:6px">${r.wk}</td><td>${r.hours}</td><td>${r.solved}</td><td>${r.topics}</td><td>${r.prot}</td><td>${r.kg??'—'}</td><td>${r.eng}</td></tr>`).join('')}</table></div>${w.length?'':'<p class="empty">🌸 Your weekly report appears here once you add records.</p>'}</div><div class="grid">${cv('wh')}${cv('wsv')}${cv('wpr')}${cv('ww')}${cv('wen')}</div>`};

/* ---------- editable table ---------- */
function cell(key,col,r){
  const[k,l,t,x]=col,v=r[k]??'',at=`data-t="${key}" data-i="${r.id}" data-k="${k}"`;
  if(t==='f')return`<td style="padding:6px">${x(r)}</td>`;
  if(t==='sel')return`<td><select ${at} aria-label="${l}"><option value=""></option>${x.map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('')}</select></td>`;
  return`<td><input ${at} type="${t||'text'}" ${t==='number'?'min="0" step="any"':''} value="${esc(v)}" aria-label="${l}"></td>`;
}
function table(key,rows){
  const c=T[key].c;
  return`<div class="card"><div class="tools"><button class="b" data-a="add" data-k="${key}">＋ Add row</button><button class="b" data-a="csv" data-k="${key}">⬇ CSV (Excel)</button></div><div class="wrap"><table><thead><tr>${c.map(x=>`<th>${x[1]}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map(r=>`<tr>${c.map(x=>cell(key,x,r)).join('')}<td><button class="x" data-a="del" data-k="${key}" data-i="${r.id}" aria-label="Delete row">🗑️</button></td></tr>`).join('')}</tbody></table></div>${rows.length?'':'<p class="empty">🌸 No records yet — press “Add row”.</p>'}</div>`;
}
const search=()=>`<label>🔍 Search <input id="q" value="${esc(q)}" placeholder="search records"></label>`;
const wkbar=()=>`<div class="card tools"><button class="b" data-a="wk" data-i="-7">◀ Prev week</button><input type="date" id="sel" value="${sel}" aria-label="Pick a date"><button class="b" data-a="wk" data-i="7">Next week ▶</button><b>Week: ${wk()[0]} → ${wk()[6]}</b><button class="b" data-a="now">This week</button> ${search()}</div>`;

/* ---------- pages ---------- */
const pages={
dash(){
  const d=db.diet.filter(inWk),s=db.study.filter(inWk),e=db.eng.filter(inWk),sb=db.subj;
  const wts=sorted(db.diet.filter(r=>r.kg)),lt=sorted(db.tests).slice(-2);
  const dn=sb.filter(r=>r.st==='Learned').length;
  return`<h1>${TITLES.dash}</h1><p>Today is <b>${dayOf(today())}, ${today()}</b> · <button class="b" data-a="go" data-i="diet">Today’s entries</button> <button class="b" data-a="go" data-i="hist">View all history</button></p>${wkbar()}
  <div class="grid">${card('Study hours (week)',(sum(s,mins)/60).toFixed(1)+' h')}${card('Topics completed (week)',s.filter(r=>r.st==='Completed').length)}${card('Programs solved (week)',sum(s,r=>r.solved))}
  ${card('Protein this week',sum(d,prot)+' g · avg '+(d.length?Math.round(sum(d,prot)/d.length):0)+'/day')}${card('Latest weight',wts.length?wts[wts.length-1].kg+' kg ('+wts[wts.length-1].date+')':'—')}
  ${card('College topics learned',dn+' / '+sb.length+' ('+pct(dn,sb.length)+'%)',pct(dn,sb.length))}${card('English minutes (week)',sum(e,r=>r.min))}${card('Latest tests',lt.length?lt.map(t=>t.score||'?').join(' → '):'—')}</div>
  <div class="grid">${cv('cs')}${cv('cp')}${cv('cpr')}${cv('cw')}${cv('csu')}${cv('ce')}${cv('ct')}</div>`;
},
diet(){const r=sorted(db.diet.filter(inWk)).filter(match),k=db.diet.filter(inWk).filter(x=>x.kg).sort((a,b)=>a.date.localeCompare(b.date));
  return`<h1>${TITLES.diet}</h1>${wkbar()}${table('diet',r)}<div class="card">Weekly protein: <b>${sum(db.diet.filter(inWk),prot)} g</b> · Weight change this week (measured): <b>${k.length>1?(k[k.length-1].kg-k[0].kg).toFixed(1)+' kg':'need 2+ weights'}</b></div><div class="grid">${cv('cpr')}${cv('cw')}</div>`},
study(){const r=sorted(db.study.filter(inWk)).filter(match),all=db.study.filter(inWk);
  return`<h1>${TITLES.study}</h1>${wkbar()}${table('study',r)}<div class="card"><div class="wrap"><table><tr><th>Day</th>${wk().map(d=>`<th>${dayOf(d).slice(0,3)}</th>`).join('')}</tr><tr><td>Hours</td>${wk().map(d=>`<td>${(sum(all.filter(x=>x.date===d),mins)/60).toFixed(1)}</td>`).join('')}</tr><tr><td>Solved</td>${wk().map(d=>`<td>${sum(all.filter(x=>x.date===d),r=>r.solved)}</td>`).join('')}</tr></table></div></div><div class="grid">${cv('cs')}${cv('cp')}</div>`},
subj(){
  const names=[...new Set(db.subj.map(r=>r.subject).filter(Boolean))],vis=db.subj.filter(r=>!fs.subj||r.subject===fs.subj);
  const rows=vis.filter(r=>(!fs.unit||r.unit===fs.unit)&&(!fs.st||r.st===fs.st)).filter(match);
  const prog=(fs.subj?[fs.subj]:names).map(n=>{const a=db.subj.filter(r=>r.subject===n);return`<div class="card"><b>${esc(n)}</b> — ${pct(a.filter(r=>r.st==='Learned').length,a.length)}% overall${bar(pct(a.filter(r=>r.st==='Learned').length,a.length))}${[1,2,3,4,5].map(u=>{const x=a.filter(r=>r.unit==u),l=x.filter(r=>r.st==='Learned').length;return`<small>Unit ${u}: ${l}/${x.length} (${pct(l,x.length)}%)</small>${bar(pct(l,x.length))}`}).join('')}</div>`}).join('');
  const op=(a,v)=>a.map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('');
  return`<h1>${TITLES.subj}</h1><div class="card tools"><button class="b" data-a="addsub">＋ Add subject</button><label>Subject <select data-f="subj"><option value="">All</option>${op(names,fs.subj)}</select></label><label>Unit <select data-f="unit"><option value="">All</option>${op(['1','2','3','4','5'],fs.unit)}</select></label><label>Status <select data-f="st"><option value="">All</option>${op(SS,fs.st)}</select></label>${search()}</div>
  ${names.length?`<div class="grid">${prog}</div>`:'<p class="empty">📚 No subjects yet — press “Add subject” and type its name.</p>'}${table('subj',rows)}<div class="grid">${cv('csu')}</div>`;
},
eng(){return`<h1>${TITLES.eng}</h1><div class="card tools">${search()}</div>${table('eng',sorted(db.eng).filter(match))}<h2>Monthly tests</h2>${table('tests',sorted(db.tests).filter(match))}<div class="grid">${cv('ce')}${cv('ct')}</div>`},
hist(){
  const m=r=>(r.date||'').startsWith(mo),s=db.study.filter(m),d=db.diet.filter(m),k=sorted(d.filter(x=>x.kg));
  return`<h1>${TITLES.hist}</h1><div class="card tools"><label>Month <input type="month" id="mo" value="${mo}"></label><button class="b" data-a="exp">⬇ Export JSON backup</button><label>Import JSON <input type="file" id="imp" accept=".json"></label><button class="b" data-a="rst">♻️ Reset all</button></div>
  <div class="grid">${card('Study hours',(sum(s,mins)/60).toFixed(1)+' h')}${card('Programs solved',sum(s,r=>r.solved))}${card('Days with diet record',d.length)}${card('Avg protein / day',d.length?Math.round(sum(d,prot)/d.length)+' g':'—')}${card('Weight change (measured)',k.length>1?(k[k.length-1].kg-k[0].kg).toFixed(1)+' kg':'need 2+ weights')}${card('English minutes',sum(db.eng.filter(m),r=>r.min))}${card('Tests this month',db.tests.filter(m).length)}</div>
  ${weeklyHtml()}<p class="card">ℹ️ Your records are saved only in <b>this browser on this device</b>. Export a backup regularly. For phone + laptop sync you would need a cloud database with login.</p>`;
}};

/* ---------- charts ---------- */
const charts={};
function mk(id,type,labels,data,t,u){
  const c=document.getElementById(id);if(!c)return;
  if(!data.some(ds=>ds.data.some(v=>v)))return c.parentNode.innerHTML=`<p class="empty">🌸 ${t}<br>No data yet</p>`;
  charts[id]=new Chart(c,{type,data:{labels,datasets:data.map((ds,i)=>({backgroundColor:P[i%6],borderColor:P[(i+1)%6],borderRadius:8,tension:.35,spanGaps:true,...ds}))},
   options:{responsive:true,animation:{duration:600},plugins:{legend:{display:data.length>1},title:{display:true,text:t}},scales:{y:{beginAtZero:true,title:{display:!!u,text:u}}}}});
}
function draw(){
  const W=wk(),L=W.map(d=>dayOf(d).slice(0,3)),by=(a,f)=>W.map(d=>sum(a.filter(x=>x.date===d),f));
  mk('cs','bar',L,[{label:'Hours',data:by(db.study,mins).map(m=>m/60)}],'Study hours this week','hours');
  mk('cp','bar',L,[{label:'Solved',data:by(db.study,r=>r.solved)}],'Programs solved this week','programs');
  mk('cpr','bar',L,[{label:'Protein (g)',data:by(db.diet,prot)}],'Protein this week','grams');
  const w=sorted(db.diet.filter(r=>r.kg));mk('cw','line',w.map(r=>r.date),[{label:'Weight',data:w.map(r=>+r.kg)}],'Weight over time (measured)','kg');
  const n=[...new Set(db.subj.map(r=>r.subject).filter(Boolean))];
  mk('csu','bar',n,[{label:'Learned %',data:n.map(x=>{const a=db.subj.filter(r=>r.subject===x);return pct(a.filter(r=>r.st==='Learned').length,a.length)})}],'Subject completion','%');
  mk('ce','bar',L,[{label:'Minutes',data:by(db.eng,r=>r.min)}],'English practice this week','minutes');
  const t=sorted(db.tests);mk('ct','bar',t.map(r=>r.date+' '+(r.kind||'').replace('Monthly ','')),[{label:'Score',data:t.map(r=>+r.score)}],'Monthly test scores','/100');
  const wr=weekly(),WL=wr.map(r=>r.wk);
  mk('wh','bar',WL,[{label:'Hours',data:wr.map(r=>r.hours)}],'Study hours — every week','hours');
  mk('wsv','bar',WL,[{label:'Solved',data:wr.map(r=>r.solved)},{label:'Topics completed',data:wr.map(r=>r.topics)}],'Programs solved & topics — every week','count');
  mk('wpr','bar',WL,[{label:'Avg protein',data:wr.map(r=>r.prot)}],'Average daily protein — every week','grams');
  mk('ww','line',WL,[{label:'Weight',data:wr.map(r=>r.kg)}],'Weight at end of each week (measured)','kg');
  mk('wen','bar',WL,[{label:'Minutes',data:wr.map(r=>r.eng)}],'English practice — every week','minutes');
}

/* ---------- render (keeps keyboard focus after redraw) ---------- */
function render(){
  const a=document.activeElement,key=a&&a.dataset&&a.dataset.i?`[data-i="${a.dataset.i}"][data-k="${a.dataset.k}"]`:null;
  Object.values(charts).forEach(c=>c.destroy());
  $('#view').innerHTML=pages[pg]();draw();
  $('#nav').innerHTML=Object.entries(TITLES).map(([k,v])=>`<button data-a="go" data-i="${k}" class="${k===pg?'on':''}">${v}</button>`).join('');
  if(key){const n=$(key);n&&n.focus()}
}

/* ---------- events ---------- */
const nr=k=>({id:uid(),created:new Date().toISOString(),date:k==='subj'?'':(week(today()).includes(sel)||pg!=='diet'&&pg!=='study'?today():wk()[0])});
document.addEventListener('change',e=>{
  const el=e.target,D=el.dataset;
  if(D.f){fs[D.f]=el.value;return render()}
  if(el.id==='sel'&&el.value){sel=el.value;return render()}
  if(el.id==='mo'){mo=el.value;return render()}
  if(el.id==='imp'){const f=new FileReader();f.onload=()=>{try{const x=JSON.parse(f.result);if(!x.diet)throw 0;db=x;save();render();alert('Imported 💖')}catch{alert('That is not a valid backup file')}};return f.readAsText(el.files[0])}
  if(!D.i)return;
  const r=db[D.t].find(x=>x.id===D.i),col=T[D.t].c.find(c=>c[0]===D.k);
  if(col[2]==='number'&&el.value!==''&&(isNaN(el.value)||el.value<0||(col[3]&&el.value>col[3]))){alert('Please enter a number between 0 and '+(col[3]||'a positive value')+'.');el.value=r[D.k]??'';return}
  if(D.t==='study'&&(D.k==='s'||D.k==='e')&&r.s&&r.e&&mins({s:r.s,e:r.e})===0&&D.k==='e'&&el.value<r.s)alert('End time is before start time.');
  r[D.k]=el.value;save();render();
});
document.addEventListener('input',e=>{if(e.target.id==='q'){q=e.target.value;const p=e.target.selectionStart;render();const n=$('#q');n.focus();n.setSelectionRange(p,p)}});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;const{a,k,i}=b.dataset;
  if(a==='go'){pg=i;render()}
  else if(a==='wk'){const d=new Date(sel+'T00:00');d.setDate(d.getDate()+ +i);sel=fmt(d);render()}
  else if(a==='now'){sel=today();render()}
  else if(a==='add'){db[k].push({...nr(k)});save();render()}
  else if(a==='addsub'){const n=prompt('Subject name?');if(n&&n.trim()){db.subj.push({...nr('subj'),subject:n.trim(),unit:'1'});save();render()}}
  else if(a==='del'){if(confirm('Permanently delete this record?')){db[k]=db[k].filter(x=>x.id!==i);save();render()}}
  else if(a==='csv'){const c=T[k].c,v=r=>'"'+String(r??'').replace(/"/g,'""')+'"';download(c.map(x=>v(x[1])).join(',')+'\n'+db[k].map(r=>c.map(x=>v(x[2]==='f'?x[3](r):r[x[0]])).join(',')).join('\n'),k+'.csv','text/csv')}
  else if(a==='wcsv'){const v=x=>'"'+x+'"';download(['Week start,Study hours,Programs solved,Topics completed,Avg protein/day,Latest weight kg,English min',...weekly().map(r=>[r.wk,r.hours,r.solved,r.topics,r.prot,r.kg??'',r.eng].map(v).join(','))].join('\n'),'weekly-report.csv','text/csv')}
  else if(a==='exp')download(JSON.stringify(db,null,2),'planner-backup-'+today()+'.json','application/json');
  else if(a==='rst'&&confirm('Erase ALL records? Export a backup first!')){db={diet:[],study:[],subj:[],eng:[],tests:[]};save();render()}
});
function download(text,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+text],{type}));a.download=name;a.click()}
render();