/* B20 · S12 · Proyección Dinámica v2.2
   Motor basado en:
   A) histórico consolidado S22
   B) jornadas cerradas actuales B20
   Genera escenarios histórico, actual y crítico para 12/13 h.
   Horizontes: 30, 60, 180 y 365 días.
*/
(function(){
'use strict';

const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
const num=v=>Number(v)||0;
const isClosed=r=>String(r.estado||'').toLowerCase()==='cerrada'||(r.hora_fin&&r.km_final!=null&&r.ganancia_neta!=null);
const hours=(a,b)=>{if(!a||!b)return 0;let [ah,am]=String(a).slice(0,5).split(':').map(Number),[bh,bm]=String(b).slice(0,5).split(':').map(Number);let x=ah*60+am,y=bh*60+bm;if(y<x)y+=1440;return (y-x)/60};
const median=a=>{const x=a.filter(Number.isFinite).sort((a,b)=>a-b);if(!x.length)return 0;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2};
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const fmtPct=v=>(v*100).toFixed(1)+'%';

let hist=[],current=[];

function styles(){
 if(document.getElementById('s12v22Styles'))return;
 const s=document.createElement('style');s.id='s12v22Styles';
 s.textContent=`
 #proyeccion.s12-full{width:100%;max-width:none;margin:0;padding:0}
 #proyeccion.s12-full>.card{width:100%}
 .s12-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
 .s12-kpi{border:1px solid #e2e8f0;border-radius:14px;padding:13px;background:#f8fafc}
 .s12-kpi span{display:block;color:#64748b;font-size:12px}.s12-kpi strong{display:block;font-size:20px;margin-top:4px}
 .s12-scenarios{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
 .s12-scenario{border:1px solid #e2e8f0;border-radius:14px;padding:14px;background:#fff}
 .s12-scenario h3{margin:0 0 6px}.s12-scenario .big{font-size:22px;font-weight:800}
 .s12-table-wrap{overflow:auto}.s12-table-wrap table{min-width:900px}
 .s12-note{padding:12px;border:1px solid #f59e0b;border-radius:12px;background:#fffbeb}
 .s12-good{padding:12px;border:1px solid #86efac;border-radius:12px;background:#f0fdf4}
 .s12-small{font-size:12px;color:#64748b}
 @media(max-width:850px){.s12-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.s12-scenarios{grid-template-columns:1fr}}
 @media(max-width:430px){.s12-kpis{grid-template-columns:1fr}}
 `;
 document.head.appendChild(s);
}

function ensure(){
 const old=document.getElementById('proyeccion');
 if(old && old.dataset.s12v22==='1')return;
 if(old)old.remove();
 const nav=document.querySelector('nav');
 if(nav){
  const b=nav.querySelector('[data-tab="proyeccion"]')||document.createElement('button');
  b.dataset.tab='proyeccion';b.textContent='Proyección';b.onclick=show;
  if(!b.parentNode)nav.appendChild(b);
 }
 const app=document.getElementById('app');if(!app)return;
 const s=document.createElement('section');s.id='proyeccion';s.className='tab s12-full';s.hidden=true;s.dataset.s12v22='1';
 s.innerHTML=`
 <div class="card">
  <h2>Proyección dinámica</h2>
  <p class="muted">S12 combina el histórico consolidado de S22 con las jornadas cerradas actuales de B20. La proyección se actualiza a medida que ingresan nuevas jornadas.</p>
  <div class="grid">
   <label>Jornadas por 30 días<input id="s12Days" type="number" min="1" step="1" value="22"></label>
   <label>Jornada base<input id="s12Hours" type="number" min="1" step="0.5" value="12"></label>
   <label>Jornada extendida<input id="s12Hours13" type="number" min="1" step="0.5" value="13"></label>
   <label>Combustible histórico S22 ($)<input id="s12HistFuel" type="number" min="0" step="10000" value="2200000"></label>
  </div>
  <div class="row"><button id="s12Refresh">Actualizar proyección</button></div>
 </div>

 <div class="card">
  <h2>Base estadística</h2>
  <div id="s12Base" class="s12-kpis"></div>
  <div id="s12BaseNote" style="margin-top:12px"></div>
 </div>

 <div class="card">
  <h2>Rendimiento de referencia para una jornada</h2>
  <div id="s12Scenarios" class="s12-scenarios"></div>
 </div>

 <div class="card">
  <h2>Proyección acumulada</h2>
  <p class="muted">La tabla muestra cuánto podría generar cada escenario manteniendo el número de jornadas configurado. 30 días usa las jornadas configuradas; 60/180/365 escalan ese ritmo.</p>
  <div class="s12-table-wrap"><div id="s12Horizons"></div></div>
 </div>

 <div class="card">
  <h2>Plan de ejecución</h2>
  <div id="s12Execution"></div>
 </div>

 <div class="card">
  <h2>Evolución del modelo</h2>
  <div id="s12Evolution"></div>
 </div>
 `;
 app.appendChild(s);
 s12Refresh.onclick=load;
}

function show(){
 ensure();
 document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!=='proyeccion');
 document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab==='proyeccion'));
 const b=document.getElementById('appBadge'),l=document.getElementById('appLayer'),f=document.getElementById('footerLabel');
 if(b)b.textContent='B20 · S12';if(l)l.textContent='Capa 12 · proyección dinámica';if(f)f.textContent='B20 · Sprint S12 · proyección dinámica · v2.2';
 load();
}

async function getClient(){
 if(window.B20_AUTH_READY)await window.B20_AUTH_READY;
 const c=window.B20_AUTH?.client;if(!c||!window.B20_AUTH?.user)throw new Error('Sesión B20 no disponible.');
 return c;
}

async function load(){
 try{
  ensure();
  const c=await getClient();
  const [h,curr]=await Promise.all([
   c.from('b20_historico_operacional').select('*').order('periodo_desde',{ascending:false}),
   c.from('jornadas_trabajo').select('*').order('fecha',{ascending:false}).order('created_at',{ascending:false})
  ]);
  if(h.error)throw h.error;if(curr.error)throw curr.error;
  hist=h.data||[];current=(curr.data||[]).filter(isClosed);
  render();
 }catch(e){
  console.warn('[B20 S12 Proyección v2.2]',e);
  const n=document.getElementById('s12BaseNote');if(n)n.innerHTML=`<div class="s12-note">No fue posible actualizar la proyección: ${String(e.message||e)}</div>`;
 }
}

function metrics(){
 const histFuel=num(document.getElementById('s12HistFuel')?.value)||2200000;
 let hg=0,hc=0,hn=0,hkm=0,htr=0,hhrs=0;
 hist.forEach(r=>{hg+=num(r.ingreso_bruto);hc+=num(r.comision_app);hn+=num(r.ingreso_neto);hkm+=num(r.km_recorridos);htr+=num(r.viajes);hhrs+=num(r.horas_trabajadas)});
 const hAfterFuel=hn-histFuel;
 const histNetKm=hkm>0?hAfterFuel/hkm:0;
 const histNetTrip=htr>0?hAfterFuel/htr:0;
 const histGrossMargin=hg>0?hAfterFuel/hg:0;
 const histHourly=hhrs>0?hAfterFuel/hhrs:0;

 const cvals=current.map(r=>{
  const h=num(r.horas_trabajadas)>0?num(r.horas_trabajadas):hours(r.hora_inicio,r.hora_fin);
  const km=Math.max(0,num(r.km_final)-num(r.km_inicio));
  const trips=num(r.viajes),net=num(r.ganancia_neta),gross=num(r.ganancia_bruta),fuel=num(r.combustible);
  return {h,km,trips,net,gross,fuel,netH:h>0?net/h:0,netKm:km>0?net/km:0,netTrip:trips>0?net/trips:0};
 }).filter(r=>r.net>=0);

 const totalNet=cvals.reduce((s,r)=>s+r.net,0),totalH=cvals.reduce((s,r)=>s+r.h,0),totalKm=cvals.reduce((s,r)=>s+r.km,0),totalTrips=cvals.reduce((s,r)=>s+r.trips,0);
 const currentWeightedH=totalH>0?totalNet/totalH:0;
 const currentWeightedKm=totalKm>0?totalNet/totalKm:0;
 const currentWeightedTrip=totalTrips>0?totalNet/totalTrips:0;
 const currentMedianH=median(cvals.map(r=>r.netH).filter(x=>x>0));
 const currentMedianKm=median(cvals.map(r=>r.netKm).filter(x=>x>0));
 const currentMedianTrip=median(cvals.map(r=>r.netTrip).filter(x=>x>0));
 const currentPointH=(currentWeightedH+currentMedianH)/2||currentWeightedH;
 const currentPointKm=(currentWeightedKm+currentMedianKm)/2||currentWeightedKm;
 const currentPointTrip=(currentWeightedTrip+currentMedianTrip)/2||currentWeightedTrip;

 const histRows=hist.map(r=>{
  const gross=num(r.ingreso_bruto),fuelShare=gross>0?num(r.ingreso_neto)*(histFuel/Math.max(1,hn)):0;
  const netApprox=num(r.ingreso_neto)*(1-histFuel/Math.max(1,hn));
  return {gross,km:num(r.km_recorridos),trips:num(r.viajes),hrs:num(r.horas_trabajadas),net:netApprox,
   netKm:num(r.km_recorridos)>0?netApprox/num(r.km_recorridos):0,
   netTrip:num(r.viajes)>0?netApprox/num(r.viajes):0,
   netH:num(r.horas_trabajadas)>0?netApprox/num(r.horas_trabajadas):0};
 });
 const hWeightedKm=hkm>0?hAfterFuel/hkm:0,hWeightedTrip=htr>0?hAfterFuel/htr:0;
 const hMedianKm=median(histRows.map(r=>r.netKm).filter(x=>x>0));
 const hMedianTrip=median(histRows.map(r=>r.netTrip).filter(x=>x>0));
 const hPointKm=(hWeightedKm+hMedianKm)/2||hWeightedKm;
 const hPointTrip=(hWeightedTrip+hMedianTrip)/2||hWeightedTrip;

 return {histFuel,hg,hc,hn,hkm,htr,hhrs,hAfterFuel,histNetKm,histNetTrip,histGrossMargin,histHourly,
 cvals,totalNet,totalH,totalKm,totalTrips,currentWeightedH,currentWeightedKm,currentWeightedTrip,currentMedianH,currentMedianKm,currentMedianTrip,currentPointH,currentPointKm,currentPointTrip,
 hWeightedKm,hWeightedTrip,hMedianKm,hMedianTrip,hPointKm,hPointTrip};
}

function scenario(m,hoursTarget,type){
 if(type==='historical'){
  const kmRate=m.hPointKm,tripRate=m.hPointTrip;
  // historical has no reliable hours, so infer a provisional hourly value from km/trip
  // only when current B20 supplies a km/h or trip/h reference.
  const currentKmH=m.totalH>0?m.totalKm/m.totalH:0;
  const currentTripsH=m.totalH>0?m.totalTrips/m.totalH:0;
  const hourlyByKm=currentKmH>0?kmRate*currentKmH:0;
  const hourlyByTrip=currentTripsH>0?tripRate*currentTripsH:0;
  const h=avg([hourlyByKm,hourlyByTrip].filter(x=>x>0));
  return {name:'Histórico consolidado',color:'historical',hourly:h,netH:h,netKm:kmRate,netTrip:tripRate,note:m.hhrs?'Usa horas históricas.':'Las horas históricas están incompletas; la conversión horaria usa productividad km/viaje y el ritmo actual.'};
 }
 if(type==='current'){
  return {name:'Rendimiento actual',color:'current',hourly:m.currentPointH,netH:m.currentPointH,netKm:m.currentPointKm,netTrip:m.currentPointTrip,note:'Punto medio entre promedio ponderado y mediana de las jornadas cerradas actuales.'};
 }
 const base=m.currentPointH||m.currentWeightedH||0;
 return {name:'Escenario crítico',color:'critical',hourly:base*.80,netH:base*.80,netKm:(m.currentPointKm||0)*.80,netTrip:(m.currentPointTrip||0)*.80,note:'80% del punto medio actual para absorber variaciones, incidencias y menor productividad.'};
}

function render(){
 const m=metrics(),d12=num(s12Hours?.value)||12,d13=num(s12Hours13?.value)||13,days30=Math.max(1,Math.round(num(s12Days?.value)||22));
 const h=scenario(m,d12,'historical'),a=scenario(m,d12,'current'),cr=scenario(m,d12,'critical');

 document.getElementById('s12Base').innerHTML=[
  ['Histórico bruto',money(m.hg)],['Histórico neto después combustible',money(m.hAfterFuel)],['Histórico km',m.hkm.toLocaleString('es-CL')+' km'],['Histórico viajes',m.htr.toLocaleString('es-CL')],
  ['Actual jornadas',current.length],['Actual neto/hora',money(m.currentWeightedH)],['Actual neto/km',money(m.currentWeightedKm)],['Actual neto/viaje',money(m.currentWeightedTrip)]
 ].map(x=>`<div class="s12-kpi"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');

 document.getElementById('s12BaseNote').innerHTML=`
 <div class="s12-note"><strong>Metodología:</strong> cada referencia combina un promedio ponderado por volumen con la mediana de las jornadas/períodos disponibles. El punto medio reduce el efecto de valores extremos. El histórico usa el combustible de referencia de ${money(m.histFuel)}; el rendimiento actual usa el neto almacenado por B20.</div>`;

 const cards=[h,a,cr].map(s=>`
 <div class="s12-scenario"><h3>${s.name}</h3><div class="big">${money(s.netH)}/h</div>
 <p>${money(s.netKm)}/km · ${money(s.netTrip)}/viaje</p>
 <p class="s12-small">${s.note}</p>
 <table><tbody>
 <tr><td>${d12} h</td><td><strong>${money(s.netH*d12)}</strong></td></tr>
 <tr><td>${d13} h</td><td><strong>${money(s.netH*d13)}</strong></td></tr>
 </tbody></table></div>`).join('');
 document.getElementById('s12Scenarios').innerHTML=cards;

 const horizonDays=[['30 días',30],['60 días',60],['180 días',180],['1 año',365]];
 const rows=horizonDays.map(([label,days])=>{
   const workdays=days/30*days30;
   const vals=[h,a,cr].map(s=>({j12:s.netH*d12*workdays,j13:s.netH*d13*workdays}));
   return `<tr><td><strong>${label}</strong></td><td>${workdays.toFixed(1)}</td>
    <td>${money(vals[0].j12)}</td><td>${money(vals[0].j13)}</td>
    <td>${money(vals[1].j12)}</td><td>${money(vals[1].j13)}</td>
    <td>${money(vals[2].j12)}</td><td>${money(vals[2].j13)}</td></tr>`;
 }).join('');
 document.getElementById('s12Horizons').innerHTML=`
 <table><thead><tr><th>Horizonte</th><th>Jornadas</th><th>Hist. 12h</th><th>Hist. 13h</th><th>Actual 12h</th><th>Actual 13h</th><th>Crítico 12h</th><th>Crítico 13h</th></tr></thead><tbody>${rows}</tbody></table>`;

 const target=60000;
 const current12=a.netH*d12,current13=a.netH*d13;
 document.getElementById('s12Execution').innerHTML=`
 <div class="s12-kpis">
  <div class="s12-kpi"><span>Referencia actual 12 h</span><strong>${money(current12)}</strong></div>
  <div class="s12-kpi"><span>Referencia actual 13 h</span><strong>${money(current13)}</strong></div>
  <div class="s12-kpi"><span>Meta ejemplo</span><strong>${money(target)}</strong></div>
  <div class="s12-kpi"><span>Horas para $60.000</span><strong>${a.netH?((target/a.netH).toFixed(1)+' h'):'Sin datos'}</strong></div>
 </div>
 <div class="s12-good" style="margin-top:12px"><strong>Lectura operacional:</strong> si planificas ${d12} horas, la referencia actual es ${money(current12)}. Si planificas ${d13} horas, es ${money(current13)}. La cifra se actualizará con cada jornada cerrada y no reemplaza la meta: sirve para ajustar la meta a la capacidad observada.</div>`;

 const trend=m.currentWeightedH?`El rendimiento actual ponderado es ${money(m.currentWeightedH)}/h y el punto medio actual es ${money(m.currentPointH)}/h.`:'Todavía no hay suficientes horas calculables en las jornadas actuales.';
 document.getElementById('s12Evolution').innerHTML=`
 <p>${trend}</p>
 <p class="s12-small">Cada nueva jornada cerrada vuelve a calcular promedio ponderado, mediana y punto medio. Así la proyección de 30, 60, 180 y 365 días evoluciona con el desempeño real.</p>
 <div class="s12-note"><strong>Control de ejecución:</strong> el siguiente paso es conectar esta proyección con el inicio/cierre de jornada para comparar automáticamente <em>planificado vs. real</em>: horas, km, viajes, bruto, combustible y neto.</div>`;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{styles();ensure();load()},{once:true});else{styles();ensure();load()}
window.addEventListener('b20:synced',load);
})();