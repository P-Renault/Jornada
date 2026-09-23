/* B20 S20 · Métricas mejoradas · 1.1
   Diseño: análisis complementario al módulo Resumen.
   Se eliminan indicadores acumulados/repetidos que ya muestra Resumen.
*/
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
 const sec=document.getElementById('metricas');
 if(!sec||document.getElementById('s20MetricsExtra'))return;

 const c=document.createElement('div');
 c.className='card';
 c.id='s20MetricsExtra';
 c.innerHTML=`
   <h2>Análisis de rendimiento</h2>
   <p class="muted">Indicadores complementarios al Resumen. No repite ganancias acumuladas, jornadas, kilómetros, horas, viajes ni costos mensuales.</p>

   <h3>Productividad</h3>
   <div id="s20Productivity" class="metric-grid"></div>

   <h3 style="margin-top:18px">Eficiencia operacional</h3>
   <div id="s20Efficiency" class="metric-grid"></div>

   <h3 style="margin-top:18px">Cumplimiento de meta</h3>
   <div id="s20Compliance" class="metric-grid"></div>

   <div class="chart-head" style="margin-top:22px">
     <div>
       <h3>Evolución del desempeño</h3>
       <p class="muted">Comparación de meta, neto real y combustible.</p>
     </div>
     <label class="chart-period">Período
       <select id="s20Range">
         <option value="7">Últimos 7 días</option>
         <option value="30">Últimos 30 días</option>
       </select>
     </label>
   </div>
   <div id="s20Chart" class="performance-chart"></div>
 `;
 sec.appendChild(c);
 document.getElementById('s20Range').onchange=renderChart;
}

function render(){
 const a=rows.filter(closed);

 let net=0,kmTotal=0,hoursTotal=0,trips=0,fuel=0,commission=0;
 let deviation=0,deviationPct=0,metaCount=0;
 let bestHour=0,bestKm=0,bestTrip=0;

 for(const r of a){
   const n=Number(r.ganancia_neta)||0;
   const k=km(r);
   const h=Number(r.horas_trabajadas)>0?Number(r.horas_trabajadas):hours(r.hora_inicio,r.hora_fin);
   const t=Number(r.viajes)||0;
   const f=Number(r.combustible)||0;
   const c=Number(r.comision_app)||0;
   const m=Number(r.meta_dia)||0;

   net+=n;kmTotal+=k;hoursTotal+=h;trips+=t;fuel+=f;commission+=c;

   if(h>0)bestHour=Math.max(bestHour,n/h);
   if(k>0)bestKm=Math.max(bestKm,n/k);
   if(t>0)bestTrip=Math.max(bestTrip,n/t);

   if(m>0){
     deviation+=n-m;
     deviationPct+=(n-m)/m*100;
     metaCount++;
   }
 }

 const avg=(x,y)=>y?x/y:0;
 const avgNetHour=avg(net,hoursTotal);
 const avgNetKm=avg(net,kmTotal);
 const avgNetTrip=avg(net,trips);
 const avgKmTrip=avg(kmTotal,trips);
 const fuelKm=avg(fuel,kmTotal);
 const fuelHour=avg(fuel,hoursTotal);
 const commissionGrossRatio=net>0?commission/(net+commission)*100:0;
 const dev=avg(deviation,metaCount);
 const devPct=avg(deviationPct,metaCount);
 const metaCompliance=metaCount?((metaCount+ a.filter(r=>Number(r.meta_dia)>0 && Number(r.ganancia_neta)>=Number(r.meta_dia)).length-metaCount)/metaCount)*100:0;

 document.getElementById('s20Productivity').innerHTML=[
   ['Neto por hora',money(avgNetHour)],
   ['Neto por viaje',money(avgNetTrip)],
   ['Neto por km',money(avgNetKm)],
   ['Km por viaje',avgKmTrip.toFixed(2)]
 ].map(([x,y])=>`<div class="metric"><span>${x}</span><strong>${y}</strong></div>`).join('');

 document.getElementById('s20Efficiency').innerHTML=[
   ['Combustible por km',money(fuelKm)],
   ['Combustible por hora',money(fuelHour)],
   ['Comisión sobre bruto',''+commissionGrossRatio.toFixed(2)+'%'],
   ['Mejor neto/hora',money(bestHour)]
 ].map(([x,y])=>`<div class="metric"><span>${x}</span><strong>${y}</strong></div>`).join('');

 document.getElementById('s20Compliance').innerHTML=[
   ['Desviación media vs meta',money(dev)],
   ['Desviación relativa',devPct.toFixed(2)+'%'],
   ['Mejor neto/km',money(bestKm)],
   ['Mejor neto/viaje',money(bestTrip)]
 ].map(([x,y])=>`<div class="metric"><span>${x}</span><strong>${y}</strong></div>`).join('');
}

/* El gráfico sí se mantiene porque aporta evolución temporal y no duplica los bloques del Resumen. */
function renderChart(){
 const root=document.getElementById('s20Chart');
 if(!root)return;

 const days=Number(document.getElementById('s20Range')?.value||7);
 const end=today();
 const dates=Array.from({length:days},(_,i)=>shift(end,i-days+1));
 const by=new Map();

 rows.filter(closed).forEach(r=>{
   const d=String(r.fecha||'').slice(0,10);
   if(!by.has(d))by.set(d,{meta:0,net:0,fuel:0});
   const x=by.get(d);
   x.meta+=Number(r.meta_dia)||0;
   x.net+=Number(r.ganancia_neta)||0;
   x.fuel+=Number(r.combustible)||0;
 });

 const data=dates.map(date=>{
   const x=by.get(date);
   return {date,meta:x?x.meta:null,net:x?x.net:null,fuel:x?x.fuel:null};
 });

 const all=data.flatMap(d=>[d.meta,d.net,d.fuel]).filter(Number.isFinite);
 if(!all.length){
   root.innerHTML='<div class="chart-empty">Aún no hay jornadas cerradas en este período.</div>';
   return;
 }

 const mx=Math.ceil(Math.max(1,...all)/10000)*10000;
 const W=900,H=360,L=64,R=18,T=28,B=58,CW=W-L-R,CH=H-T-B;
 const x=i=>L+(dates.length===1?CW/2:i*CW/(dates.length-1));
 const y=v=>T+CH-v/mx*CH;
 const series=[
   ['meta','Meta','chart-line-meta'],
   ['net','Real neto','chart-line-net'],
   ['fuel','Combustible','chart-line-fuel']
 ];

 let svg=`<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de meta, ganancia neta real y combustible">`;

 for(let j=0;j<=4;j++){
   const v=mx*j/4,yy=y(v);
   svg+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" class="chart-grid"/><text x="${L-10}" y="${yy+4}" text-anchor="end" class="chart-axis">${money(v)}</text>`;
 }

 const step=days<=7?1:Math.ceil(days/7);
 dates.forEach((d,i)=>{
   if(i%step===0||i===dates.length-1)
     svg+=`<text x="${x(i)}" y="${H-25}" text-anchor="middle" class="chart-axis">${short(d)}</text>`;
 });

 series.forEach(s=>{
   const pts=data.map((d,i)=>({i,v:d[s[0]]}));
   svg+=`<path d="${path(pts,x,y)}" class="chart-line ${s[2]}" fill="none"/>`;
   pts.forEach(p=>{
     if(p.v==null)return;
     const d=data[p.i];
     svg+=`<circle cx="${x(p.i)}" cy="${y(p.v)}" r="12" class="chart-hit" data-p="${p.i}"></circle><circle cx="${x(p.i)}" cy="${y(p.v)}" r="4.5" class="chart-point ${s[2]}" data-p="${p.i}" tabindex="0"><title>${short(d.date)} · ${s[1]}: ${money(p.v)}</title></circle>`;
   });
 });

 svg+='</svg><div class="chart-selection" id="s20Sel"><span class="chart-selection-hint">Toca un punto del gráfico para ver su valor.</span></div><div class="chart-legend"><span><i class="legend-dot chart-line-meta"></i>Meta</span><span><i class="legend-dot chart-line-net"></i>Real neto</span><span><i class="legend-dot chart-line-fuel"></i>Combustible</span></div>';
 root.innerHTML=svg;

 const sel=document.getElementById('s20Sel');
 const choose=i=>{
   const d=data[i];if(!d)return;
   const v=[['Meta',d.meta],['Real neto',d.net],['Combustible',d.fuel]].filter(x=>x[1]!=null);
   sel.innerHTML=`<div class="chart-selection-title">${long(d.date)}</div><div class="chart-selection-values">${v.map(x=>`<span><b>${x[0]}</b><strong>${money(x[1])}</strong></span>`).join('')}</div>`;
 };

 root.querySelectorAll('[data-p]').forEach(e=>{
   e.onclick=()=>choose(Number(e.dataset.p));
   e.onkeydown=q=>{
     if(q.key==='Enter'||q.key===' '){
       q.preventDefault();
       choose(Number(e.dataset.p));
     }
   };
 });
}

async function start(){
 try{
   if(window.B20_AUTH_READY)await window.B20_AUTH_READY;
   build();

   const client=window.B20_AUTH?.client;
   if(!client||!window.B20_AUTH?.user)return;

   const r=await client.from('jornadas_trabajo').select('*').order('fecha',{ascending:false}).order('created_at',{ascending:false});
   if(r.error)throw r.error;

   rows=r.data||[];
   render();
   renderChart();
 }catch(e){
   console.warn('[B20 S20 Métricas 1.1]',e);
 }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();

window.addEventListener('b20:synced',start);
})();