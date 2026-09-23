/* B20 S20 · Métricas mejoradas */
(function(){
'use strict';
const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const closed=r=>String(r.estado||'').toLowerCase()==='cerrada'||(r.hora_fin&&r.km_final!=null&&r.ganancia_neta!=null);
const hours=(a,b)=>{if(!a||!b)return 0;let [ah,am]=String(a).slice(0,5).split(':').map(Number),[bh,bm]=String(b).slice(0,5).split(':').map(Number);let x=ah*60+am,y=bh*60+bm;if(y<x)y+=1440;return Math.round((y-x)/60*100)/100};
const km=r=>Math.max(0,Number(r.km_final||0)-Number(r.km_inicio||0));
const shift=(s,n)=>{let d=new Date(`${s}T12:00:00`);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const short=s=>{let [y,m,d]=s.split('-');return `${d}/${m}`};
const long=s=>{let [y,m,d]=s.split('-');return new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,d))};
const path=(p,x,y)=>{let z='',on=false;for(const q of p){if(q.v==null){on=false;continue}z+=(on?'L':'M')+`${x(q.i).toFixed(1)},${y(q.v).toFixed(1)} `;on=true}return z.trim()};
let rows=[];
function build(){
 const sec=document.getElementById('metricas');if(!sec||document.getElementById('s20MetricsExtra'))return;
 const c=document.createElement('div');c.className='card';c.id='s20MetricsExtra';
 c.innerHTML=`<div class="chart-head"><div><h2>Análisis de desempeño</h2><p class="muted">Información y gráficos del sistema inicial, calculados sobre jornadas cerradas.</p></div><label class="chart-period">Período<select id="s20Range"><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option></select></label></div><div id="s20Summary" class="metric-grid"></div><div id="s20Chart" class="performance-chart"></div>`;
 sec.appendChild(c);document.getElementById('s20Range').onchange=render;
}
function render(){
 const a=rows.filter(closed);let net=0,gross=0,k=0,h=0,t=0,f=0,dev=0,devp=0,nm=0;
 for(const r of a){let n=+r.ganancia_neta||0,g=+r.ganancia_bruta||0,x=km(r),q=+r.horas_trabajadas>0?+r.horas_trabajadas:hours(r.hora_inicio,r.hora_fin),v=+r.viajes||0,fu=+r.combustible||0,m=+r.meta_dia||0;net+=n;gross+=g;k+=x;h+=q;t+=v;f+=fu;if(m){dev+=n-m;devp+=(n-m)/m*100;nm++}}
 const av=(x,y)=>y?x/y:0;
 const s=[['Jornadas cerradas',a.length],['Ganancia neta acumulada',money(net)],['Ganancia bruta acumulada',money(gross)],['Neto/hora',money(av(net,h))],['Neto/km',money(av(net,k))],['Neto/viaje',money(av(net,t))],['Km/viaje',av(k,t).toFixed(2)],['Combustible/km',money(av(f,k))],['Desviación media',money(av(dev,nm))],['Desviación relativa',`${av(devp,nm).toFixed(2)}%`]];
 document.getElementById('s20Summary').innerHTML=s.map(([x,y])=>`<div class="metric"><span>${x}</span><strong>${y}</strong></div>`).join('');
 chart();
}
function chart(){
 const root=document.getElementById('s20Chart');if(!root)return;const days=+document.getElementById('s20Range').value||7,end=today(),dates=Array.from({length:days},(_,i)=>shift(end,i-days+1)),by=new Map();
 rows.filter(closed).forEach(r=>{let d=String(r.fecha||'').slice(0,10);if(!by.has(d))by.set(d,{meta:0,net:0,fuel:0});let x=by.get(d);x.meta+=+r.meta_dia||0;x.net+=+r.ganancia_neta||0;x.fuel+=+r.combustible||0});
 const data=dates.map(date=>{let x=by.get(date);return{date,meta:x?x.meta:null,net:x?x.net:null,fuel:x?x.fuel:null}}),all=data.flatMap(d=>[d.meta,d.net,d.fuel]).filter(Number.isFinite);
 if(!all.length){root.innerHTML='<div class="chart-empty">Aún no hay jornadas cerradas en este período.</div>';return}
 const mx=Math.ceil(Math.max(1,...all)/10000)*10000,W=900,H=360,L=64,R=18,T=28,B=58,CW=W-L-R,CH=H-T-B,x=i=>L+(dates.length===1?CW/2:i*CW/(dates.length-1)),y=v=>T+CH-v/mx*CH,ss=[['meta','Meta','chart-line-meta'],['net','Real neto','chart-line-net'],['fuel','Combustible','chart-line-fuel']];
 let svg=`<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de meta, ganancia neta real y combustible">`;
 for(let j=0;j<=4;j++){let v=mx*j/4,yy=y(v);svg+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" class="chart-grid"/><text x="${L-10}" y="${yy+4}" text-anchor="end" class="chart-axis">${money(v)}</text>`}
 let step=days<=7?1:Math.ceil(days/7);dates.forEach((d,i)=>{if(i%step===0||i===dates.length-1)svg+=`<text x="${x(i)}" y="${H-25}" text-anchor="middle" class="chart-axis">${short(d)}</text>`});
 ss.forEach(s=>{let pts=data.map((d,i)=>({i,v:d[s[0]]}));svg+=`<path d="${path(pts,x,y)}" class="chart-line ${s[2]}" fill="none"/>`;pts.forEach(p=>{if(p.v==null)return;let d=data[p.i];svg+=`<circle cx="${x(p.i)}" cy="${y(p.v)}" r="12" class="chart-hit" data-p="${p.i}"></circle><circle cx="${x(p.i)}" cy="${y(p.v)}" r="4.5" class="chart-point ${s[2]}" data-p="${p.i}" tabindex="0"><title>${short(d.date)} · ${s[1]}: ${money(p.v)}</title></circle>`})});
 svg+='</svg><div class="chart-selection" id="s20Sel"><span class="chart-selection-hint">Toca un punto del gráfico para ver su valor.</span></div><div class="chart-legend"><span><i class="legend-dot chart-line-meta"></i>Meta</span><span><i class="legend-dot chart-line-net"></i>Real neto</span><span><i class="legend-dot chart-line-fuel"></i>Combustible</span></div>';root.innerHTML=svg;
 const sel=document.getElementById('s20Sel');const choose=i=>{let d=data[i];if(!d)return;let v=[['Meta',d.meta],['Real neto',d.net],['Combustible',d.fuel]].filter(x=>x[1]!=null);sel.innerHTML=`<div class="chart-selection-title">${long(d.date)}</div><div class="chart-selection-values">${v.map(x=>`<span><b>${x[0]}</b><strong>${money(x[1])}</strong></span>`).join('')}</div>`};root.querySelectorAll('[data-p]').forEach(e=>{e.onclick=()=>choose(+e.dataset.p);e.onkeydown=q=>{if(q.key==='Enter'||q.key===' '){q.preventDefault();choose(+e.dataset.p)}}})
}
async function start(){try{if(window.B20_AUTH_READY)await window.B20_AUTH_READY;build();let c=window.B20_AUTH?.client;if(!c||!window.B20_AUTH?.user)return;let r=await c.from('jornadas_trabajo').select('*').order('fecha',{ascending:false}).order('created_at',{ascending:false});if(r.error)throw r.error;rows=r.data||[];render()}catch(e){console.warn('[B20 S20 Métricas]',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('b20:synced',start);
})();