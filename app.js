'use strict';
const $=id=>document.getElementById(id); const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0); const num=id=>Number($(id).value)||0; const val=id=>$(id).value; const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
let db=null, rows=[], active=null, tab='resumen';
const defaults={rend:13,precio:1635,mant:.03,pct:20,netHora:8000,viajesHora:2,kmHora:20};
function settings(){const x={};for(const k in defaults)x[k]=Number(localStorage.getItem('ct_'+k)??defaults[k]);return x}
function saveSettings(){for(const k of Object.keys(defaults))localStorage.setItem('ct_'+k,$(k).value);$('settingsMsg').textContent='Configuración guardada.';renderAll()}
function hours(a,b){if(!a||!b)return 0;let [ah,am]=a.split(':').map(Number),[bh,bm]=b.split(':').map(Number),x=ah*60+am,y=bh*60+bm;if(y<x)y+=1440;return (y-x)/60}
function calcPlan(){const s=settings(), goal=num('meta'), hp=num('horasPlan');const need=s.netHora>0?goal/s.netHora:0;const h=Math.max(hp,need);const trips=Math.ceil(h*s.viajesHora);const km=h*s.kmHora;const fuel=km/s.rend*s.precio;const maint=km*s.mant;const comm=Math.max(0,goal/(1-s.pct/100)-goal);const gross=Math.max(goal/(1-s.pct/100),h*s.netHora/(1-s.pct/100));const net=gross-comm-fuel-maint;return{need,h,trips,km,fuel,maint,comm,gross,net}}
function renderPlan(p){$('plan').innerHTML=[['Horas necesarias',p.need.toFixed(2)+' h'],['Viajes',p.trips+' viajes'],['Kilómetros',p.km.toFixed(1)+' km'],['Combustible',money(p.fuel)],['Mantenimiento',money(p.maint)],['Comisión estimada',money(p.comm)],['Ganancia bruta proyectada',money(p.gross)],['Ganancia neta proyectada',money(p.net)]].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}
function isClosed(r){return String(r.estado).toLowerCase()==='cerrada'||!!r.hora_fin&&r.km_final!=null&&r.ganancia_bruta!=null}
function kmReal(r){return Number(r.km_final)>=Number(r.km_inicio)?Number(r.km_final)-Number(r.km_inicio):0}
function hReal(r){return r.horas_trabajadas!=null&&Number(r.horas_trabajadas)>0?Number(r.horas_trabajadas):hours(String(r.hora_inicio||'').slice(0,5),String(r.hora_fin||'').slice(0,5))}
function fill(r){$('id').value=r.id;$('fecha').value=String(r.fecha).slice(0,10);$('meta').value=r.meta_dia??'';$('horasPlan').value=r.horas_planificadas??'';$('horaInicio').value=String(r.hora_inicio||'').slice(0,5);$('kmInicio').value=r.km_inicio??'';$('horaFin').value=String(r.hora_fin||'').slice(0,5);$('kmFinal').value=r.km_final??'';$('viajes').value=r.viajes??'';$('bruta').value=r.ganancia_bruta??'';$('combustible').value=r.combustible??'';$('comision').value=r.comision_app??'';$('notas').value=r.notas??'';renderPlan({need:Number(r.plan_horas_meta)||0,trips:Number(r.plan_viajes)||0,km:Number(r.plan_km)||0,fuel:Number(r.plan_combustible)||0,maint:Number(r.plan_mantenimiento)||0,gross:Number(r.plan_ganancia_bruta)||0,net:Number(r.plan_ganancia_neta)||0})}
function activeMode(r){active=r;$('formTitle').textContent='Jornada en curso';$('mainAction').textContent='Terminar jornada';$('mainAction').hidden=false;$('closePanel').hidden=false;['fecha','meta','horasPlan','horaInicio','kmInicio'].forEach(id=>$(id).disabled=true);previewClose();}
function startMode(){$('formTitle').textContent='Iniciar jornada de hoy';$('mainAction').textContent='Iniciar jornada';$('mainAction').hidden=false;$('closePanel').hidden=true;['fecha','meta','horasPlan','horaInicio','kmInicio'].forEach(id=>$(id).disabled=false);$('id').value='';active=null;$('startMsg').textContent='';$('fecha').value=today()}
function previewClose(){const r=active;if(!r)return;const km=Number(val('kmFinal'))-Number(r.km_inicio);const h=hours(String(r.hora_inicio).slice(0,5),val('horaFin'));const s=settings();const fuel=Number(val('combustible'))||km/s.rend*s.precio;const maint=km*s.mant;const gross=num('bruta');const comm=val('comision')!==''?num('comision'):gross*s.pct/100;const net=gross-comm-fuel-maint; $('actual').innerHTML=[['Horas',h.toFixed(2)+' h'],['Kilómetros',Math.max(0,km).toFixed(1)+' km'],['Combustible',money(fuel)],['Mantenimiento',money(maint)],['Comisión',money(comm)],['Ganancia bruta',money(gross)],['Ganancia neta',money(net)],['Vs. meta',money(net-Number(r.meta_dia||0))]].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');$('analysis').innerHTML=`<p class="${net>=Number(r.meta_dia||0)?'ok':'bad'}">${net>=Number(r.meta_dia||0)?'META CUMPLIDA':'FALTAN '+money(Number(r.meta_dia||0)-net)}</p>`}
async function withTimeout(p,ms=12000){return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('Tiempo de espera agotado al comunicarse con Supabase.')),ms))])}
async function load(){const r=await withTimeout(db.from('jornadas_trabajo').select('*').order('fecha',{ascending:false}).order('created_at',{ascending:false}));if(r.error)throw r.error;rows=r.data||[];active=rows.find(x=>!isClosed(x)&&String(x.estado).toLowerCase()!=='cerrada')||null;if(active){fill(active);activeMode(active)}else startMode();renderAll()}
async function start(){if(active){$('closePanel').hidden=false;return}const p=calcPlan();const payload={fecha:val('fecha'),meta_dia:num('meta'),horas_planificadas:num('horasPlan'),hora_inicio:val('horaInicio'),km_inicio:num('kmInicio'),viajes:0,estado:'en_curso',plan_horas_meta:p.need,plan_viajes:p.trips,plan_km:p.km,plan_combustible:p.fuel,plan_mantenimiento:p.maint,plan_ganancia_bruta:p.gross,plan_ganancia_neta:p.net};$('mainAction').disabled=true;$('startMsg').textContent='Guardando jornada en Supabase…';try{const r=await withTimeout(db.from('jornadas_trabajo').insert(payload));if(r.error)throw r.error;await load();$('startMsg').textContent='Jornada iniciada correctamente.'}catch(e){$('startMsg').textContent='No se pudo iniciar la jornada: '+e.message}finally{$('mainAction').disabled=false}}
async function deleteJourney(row){
  if(!row || row.id===undefined || row.id===null || String(row.id)===''){
    alert('No se pudo identificar el ID real de la jornada en Supabase.');
    return;
  }
  const id=String(row.id);
  const date=String(row.fecha||'').slice(0,10);
  const time=String(row.hora_inicio||'').slice(0,5);
  if(!confirm(`¿Borrar definitivamente la jornada ${date} · ${time}?\n\nEsta acción eliminará el registro de Supabase y no se puede deshacer.`))return;
  try{
    // V19.8: usamos directamente el objeto que generó la tarjeta.
    // No reconstruimos fecha/hora ni hacemos conversiones del ID.
    const result=await withTimeout(
      db.from('jornadas_trabajo').delete().eq('id',row.id)
    );
    if(result.error)throw result.error;

    // Confirmación independiente: el ID ya no debe existir.
    const check=await withTimeout(
      db.from('jornadas_trabajo').select('id').eq('id',row.id).maybeSingle()
    );
    if(check.error)throw check.error;
    if(check.data)throw new Error('Supabase no eliminó el registro. La política DELETE está activa, pero la fila continúa existiendo.');

    if(active && String(active.id)===id)active=null;
    await load();
    $('startMsg').textContent='Jornada eliminada correctamente.';
  }catch(e){
    $('startMsg').textContent='No se pudo borrar la jornada: '+e.message;
    alert('No se pudo borrar la jornada: '+e.message);
  }
}
async function closeDay(){
 if(!active){$('startMsg').textContent='No hay jornada activa.';return}
 const s=settings();
 const kmFinal=num('kmFinal');
 const kmInicio=Number(active.km_inicio||0);
 if(!val('horaFin')||!Number.isFinite(kmFinal)||kmFinal<kmInicio){$('startMsg').textContent='Completa una hora fin válida y un Km final igual o mayor al Km inicio.';return}
 const km=Math.max(0,kmFinal-kmInicio);
 const h=hours(String(active.hora_inicio).slice(0,5),val('horaFin'));
 const fuel=val('combustible')!==''?num('combustible'):km/s.rend*s.precio;
 const maint=km*s.mant;
 const gross=num('bruta');
 const comm=val('comision')!==''?num('comision'):gross*s.pct/100;
 const net=gross-comm-fuel-maint;
 const payload={hora_fin:val('horaFin'),km_final:kmFinal,viajes:num('viajes'),combustible:fuel,mantenimiento:maint,ganancia_bruta:gross,comision_app:comm,ganancia_neta:net,notas:val('notas')||null,estado:'cerrada'};
 $('closeDay').disabled=true;$('startMsg').textContent='Cerrando jornada y guardando resultado…';
 try{
  let result=await withTimeout(db.from('jornadas_trabajo').update(payload).eq('id',active.id).select('id,estado,ganancia_neta,km_recorridos,horas_trabajadas'));
  if(result.error)throw result.error;
  if(!result.data||result.data.length!==1)throw new Error('Supabase no confirmó el cierre de la jornada.');
  const saved=result.data[0];
  // Algunas instalaciones antiguas tienen columnas derivadas/generadas.
  // No se actualizan directamente: si la BD no las calcula, las completamos.
  const derived={};
  if(saved.km_recorridos==null)derived.km_recorridos=km;
  if(saved.horas_trabajadas==null)derived.horas_trabajadas=h;
  if(Object.keys(derived).length){
    const fill=await withTimeout(db.from('jornadas_trabajo').update(derived).eq('id',active.id).select('id,km_recorridos,horas_trabajadas'));
    if(fill.error)throw fill.error;
  }
  active=null;await load();switchTab('resumen');$('startMsg').textContent='Jornada cerrada correctamente.';
 }catch(e){$('startMsg').textContent='No se pudo cerrar la jornada: '+e.message;alert('No se pudo cerrar la jornada: '+e.message)}finally{$('closeDay').disabled=false}
}
function donutSvg(percent, centerText, title, detailA, detailB, overText=''){
 const p=Math.max(0,Math.min(100,Number(percent)||0));
 const r=46,c=2*Math.PI*r,dash=(p/100)*c;
 return `<div class="donut-card">
   <div class="donut-title">${title}</div>
   <div class="donut-wrap" role="img" aria-label="${title}: ${p.toFixed(1)}%">
     <svg class="donut-svg" viewBox="0 0 120 120" aria-hidden="true">
       <circle cx="60" cy="60" r="46" class="donut-track"></circle>
       <circle cx="60" cy="60" r="46" class="donut-value" stroke-dasharray="${dash.toFixed(2)} ${c.toFixed(2)}"></circle>
     </svg>
     <div class="donut-center"><strong>${p.toFixed(1)}%</strong><span>cumplido</span></div>
   </div>
   <div class="donut-details"><div><span class="donut-dot done"></span>${detailA}</div><div><span class="donut-dot missing"></span>${detailB}</div></div>
   ${overText?`<div class="donut-over">${overText}</div>`:''}
 </div>`;
}
function renderLastJourneyCharts(){
 const root=$('lastJourneyCharts');if(!root)return;
 const r=rows.find(isClosed);
 if(!r){root.innerHTML='<div class="chart-empty">Aún no hay una jornada cerrada para comparar.</div>';return}
 const goal=Math.max(0,Number(r.meta_dia||0));
 const net=Number(r.ganancia_neta||0);
 const planned=Math.max(0,Number(r.horas_planificadas||0));
 const worked=Math.max(0,hReal(r));
 const goalPct=goal>0?Math.min(100,net/goal*100):0;
 const hoursPct=planned>0?Math.min(100,worked/planned*100):0;
 const netOver=goal>0&&net>goal?`Superó la meta en ${((net-goal)/goal*100).toFixed(1)}%.`:'Por alcanzar: '+money(Math.max(0,goal-net))+'.';
 const hoursOver=planned>0&&worked>planned?`Superó el plan en ${((worked-planned)/planned*100).toFixed(1)}%.`:'Por completar: '+Math.max(0,planned-worked).toFixed(2)+' h.';
 root.innerHTML=`<div class="last-journey-heading"><div><h3>Indicadores de la última jornada cerrada</h3><p class="muted">${formatLongDate(String(r.fecha).slice(0,10))} · ${String(r.hora_inicio||'').slice(0,5)}</p></div></div>
 <div class="donut-grid">
   ${donutSvg(goalPct,`${goalPct.toFixed(1)}%`,'Meta alcanzada',`Real neto: ${money(net)}`,`Faltante: ${money(Math.max(0,goal-net))}`,netOver)}
   ${donutSvg(hoursPct,`${hoursPct.toFixed(1)}%`,'Horas cumplidas',`Trabajadas: ${worked.toFixed(2)} h`,`Faltantes: ${Math.max(0,planned-worked).toFixed(2)} h`,hoursOver)}
 </div>`;
}
function renderToday(){
 const r=rows.find(x=>String(x.fecha).slice(0,10)===today())||null;
 const closedRows=rows.filter(isClosed);
 const sum=k=>closedRows.reduce((t,x)=>t+Number(x[k]||0),0);
 const cumulativeNet=sum('ganancia_neta'), cumulativeGross=sum('ganancia_bruta'), cumulativeGoal=sum('meta_dia');
 const cumulativeKm=closedRows.reduce((t,x)=>t+kmReal(x),0), cumulativeHours=closedRows.reduce((t,x)=>t+hReal(x),0), cumulativeTrips=sum('viajes');
 const todayHtml=r?(()=>{const closed=isClosed(r),h=closed?hReal(r):0,km=closed?kmReal(r):0,net=closed?Number(r.ganancia_neta||0):0;return `<div class="grid"><div class="metric"><span>Estado</span><strong>${closed?'CERRADA':'EN CURSO'}</strong></div><div class="metric"><span>Meta</span><strong>${money(r.meta_dia)}</strong></div><div class="metric"><span>Ganancia neta</span><strong>${money(net)}</strong></div><div class="metric"><span>Horas</span><strong>${h.toFixed(2)} h</strong></div><div class="metric"><span>Viajes</span><strong>${r.viajes||0}</strong></div><div class="metric"><span>Kilómetros</span><strong>${km.toFixed(1)} km</strong></div></div><div class="scroll"><table><tr><th>Indicador</th><th>Plan</th><th>Real</th><th>Diferencia</th></tr><tr><td>Ganancia neta</td><td>${money(r.plan_ganancia_neta)}</td><td>${closed?money(net):'Pendiente'}</td><td>${closed?money(net-Number(r.plan_ganancia_neta||0)):'—'}</td></tr><tr><td>Horas</td><td>${Number(r.horas_planificadas||0).toFixed(2)} h</td><td>${closed?h.toFixed(2)+' h':'Pendiente'}</td><td>${closed?(h-Number(r.horas_planificadas||0)).toFixed(2)+' h':'—'}</td></tr></table></div>`})():'<p>Sin jornada registrada hoy.</p>';
 $('today').innerHTML=`${todayHtml}<div id="lastJourneyCharts" class="last-journey-charts"></div><div class="card cumulative"><h3>Ganancias acumuladas</h3><p class="muted">Suma de todas las jornadas cerradas almacenadas en Supabase.</p><div class="grid"><div class="metric"><span>Ganancia neta acumulada</span><strong>${money(cumulativeNet)}</strong></div><div class="metric"><span>Ganancia bruta acumulada</span><strong>${money(cumulativeGross)}</strong></div><div class="metric"><span>Metas acumuladas</span><strong>${money(cumulativeGoal)}</strong></div><div class="metric"><span>Diferencia neta vs metas</span><strong>${money(cumulativeNet-cumulativeGoal)}</strong></div><div class="metric"><span>Jornadas cerradas</span><strong>${closedRows.length}</strong></div><div class="metric"><span>Km acumulados</span><strong>${cumulativeKm.toFixed(1)} km</strong></div><div class="metric"><span>Horas acumuladas</span><strong>${cumulativeHours.toFixed(2)} h</strong></div><div class="metric"><span>Viajes acumulados</span><strong>${cumulativeTrips}</strong></div></div></div>`;
 renderLastJourneyCharts();
}
function renderHistory(){
 const m=$('histMonth').value||today().slice(0,7);
 const a=rows.filter(r=>String(r.fecha).slice(0,7)===m);
 $('history').innerHTML=a.length?a.map((r,i)=>{
   const c=isClosed(r), time=String(r.hora_inicio||'').slice(0,5);
   return `<div class="item"><b>${String(r.fecha).slice(0,10)} · ${time}</b><p>${c?'Cerrada':'EN CURSO'} · Meta ${money(r.meta_dia)} · Plan ${Number(r.horas_planificadas||0).toFixed(2)} h</p><p>${c?'Neta '+money(r.ganancia_neta)+' · '+hReal(r).toFixed(2)+' h · '+kmReal(r).toFixed(1)+' km':'Jornada pendiente de cierre'}</p><div class="history-actions">${!c?'<button data-finish-index="'+i+'">Terminar jornada</button>':''}<button class="danger" data-delete-index="${i}">Borrar jornada</button></div></div>`
 }).join(''):'<p>Sin jornadas en este mes.</p>';
 document.querySelectorAll('[data-finish-index]').forEach(b=>b.onclick=()=>{
   const r=a[Number(b.getAttribute('data-finish-index'))];
   if(r){fill(r);activeMode(r);switchTab('jornada');$('closePanel').scrollIntoView({behavior:'smooth'})}
 });
 document.querySelectorAll('[data-delete-index]').forEach(b=>b.onclick=()=>{
   const r=a[Number(b.getAttribute('data-delete-index'))];
   if(r)deleteJourney(r);
 });
}
function formatShortDate(iso){const [y,m,d]=iso.split('-').map(Number);return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`}
function formatLongDate(iso){const [y,m,d]=iso.split('-').map(Number);return new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,d))}
function dateShift(baseIso,days){const d=new Date(`${baseIso}T12:00:00`);d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function linePath(points,x,y){let path='';let drawing=false;for(const p of points){if(p.v==null){drawing=false;continue}const cmd=drawing?'L':'M';path+=`${cmd}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)} `;drawing=true}return path.trim()}
function renderPerformanceChart(){
 const root=$('performanceChart');if(!root)return;
 const days=Number($('chartRange')?.value||7);
 const end=today();
 const dates=Array.from({length:days},(_,i)=>dateShift(end,i-(days-1)));
 const closed=rows.filter(isClosed);
 const byDate=new Map();
 for(const r of closed){const d=String(r.fecha).slice(0,10);if(!byDate.has(d))byDate.set(d,{meta:0,net:0,fuel:0,count:0});const x=byDate.get(d);x.meta+=Number(r.meta_dia||0);x.net+=Number(r.ganancia_neta||0);x.fuel+=Number(r.combustible||0);x.count++}
 const data=dates.map(date=>{const x=byDate.get(date);return {date,meta:x?x.meta:null,net:x?x.net:null,fuel:x?x.fuel:null,count:x?.count||0}});
 const all=data.flatMap(d=>[d.meta,d.net,d.fuel]).filter(v=>Number.isFinite(v));
 if(!all.length){root.innerHTML='<div class="chart-empty">Aún no hay jornadas cerradas en este período.</div>';return}
 const max=Math.max(1,...all);const niceMax=Math.ceil(max/10000)*10000||10000;
 const W=900,H=360,L=64,R=18,T=28,B=58,CW=W-L-R,CH=H-T-B;
 const x=i=>L+(dates.length===1?CW/2:i*(CW/(dates.length-1)));
 const y=v=>T+CH-(v/niceMax)*CH;
 const series=[{key:'meta',label:'Meta',cls:'chart-line-meta',prefix:'$'},{key:'net',label:'Real neto',cls:'chart-line-net',prefix:'$'},{key:'fuel',label:'Combustible',cls:'chart-line-fuel',prefix:'$'}];
 const ticks=4;let svg=`<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de meta, ganancia neta real y gasto de combustible durante los últimos ${days} días">`;
 for(let i=0;i<=ticks;i++){const v=niceMax*i/ticks,yy=y(v);svg+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" class="chart-grid"/><text x="${L-10}" y="${yy+4}" text-anchor="end" class="chart-axis">${money(v)}</text>`}
 const labelStep=days<=7?1:Math.ceil(days/7);
 dates.forEach((d,i)=>{if(i%labelStep===0||i===dates.length-1){const xx=x(i);svg+=`<text x="${xx}" y="${H-25}" text-anchor="middle" class="chart-axis">${formatShortDate(d)}</text>`}});
 for(const s of series){
   const pts=data.map((d,i)=>({i,v:d[s.key]}));
   svg+=`<path d="${linePath(pts,x,y)}" class="chart-line ${s.cls}" fill="none"/>`;
   pts.forEach(p=>{
     if(p.v==null)return;
     const d=data[p.i],cx=x(p.i),cy=y(p.v);
     svg+=`<circle cx="${cx}" cy="${cy}" r="12" class="chart-hit" data-point-index="${p.i}" data-series="${s.key}" aria-label="${formatShortDate(d.date)} · ${s.label}: ${money(p.v)}"></circle>`;
     svg+=`<circle cx="${cx}" cy="${cy}" r="4.5" class="chart-point ${s.cls}" data-point-index="${p.i}" data-series="${s.key}" tabindex="0"><title>${formatShortDate(d.date)} · ${s.label}: ${money(p.v)}</title></circle>`;
   });
 }
 svg+='</svg><div class="chart-selection" id="chartSelection" role="status" aria-live="polite"><span class="chart-selection-hint">Toca un punto del gráfico para ver su valor.</span></div><div class="chart-legend">'+series.map(s=>`<span><i class="legend-dot ${s.cls}"></i>${s.label}</span>`).join('')+'</div>';
 root.innerHTML=svg;
 const selection=$('chartSelection');
 const selectPoint=(idx)=>{
   const d=data[idx];if(!d||!selection)return;
   root.querySelectorAll('.chart-point.chart-selected').forEach(el=>el.classList.remove('chart-selected'));
   root.querySelectorAll(`[data-point-index="${idx}"]`).forEach(el=>{if(el.classList.contains('chart-point'))el.classList.add('chart-selected')});
   const values=[['Meta',d.meta],['Real neto',d.net],['Combustible',d.fuel]].filter(x=>x[1]!=null);
   selection.innerHTML=`<div class="chart-selection-title">${formatLongDate(d.date)}</div><div class="chart-selection-values">${values.map(v=>`<span><b>${v[0]}</b><strong>${money(v[1])}</strong></span>`).join('')}</div>`;
 };
 root.querySelectorAll('.chart-hit,.chart-point').forEach(el=>{
   el.addEventListener('click',()=>selectPoint(Number(el.dataset.pointIndex)));
   el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPoint(Number(el.dataset.pointIndex));}});
 });
}
function renderMonth(){const m=$('histMonth').value||today().slice(0,7),a=rows.filter(r=>String(r.fecha).slice(0,7)===m&&isClosed(r));const sum=k=>a.reduce((t,r)=>t+Number(r[k]||0),0);$('monthCosts').innerHTML=[['Combustible',sum('combustible')],['Mantenimiento',sum('mantenimiento')],['Comisión app',sum('comision_app')],['Total costos',sum('combustible')+sum('mantenimiento')+sum('comision_app')]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${money(x[1])}</strong></div>`).join('');$('monthCompare').innerHTML=`<p>Jornadas cerradas: <b>${a.length}</b> · Horas: <b>${a.reduce((t,r)=>t+hReal(r),0).toFixed(2)} h</b> · Viajes: <b>${sum('viajes')}</b> · Km: <b>${a.reduce((t,r)=>t+kmReal(r),0).toFixed(1)} km</b> · Bruta: <b>${money(sum('ganancia_bruta'))}</b> · Neta: <b>${money(sum('ganancia_neta'))}</b></p>`}
function monthLabel(iso){const [y,m]=iso.split('-').map(Number);return new Intl.DateTimeFormat('es-CL',{month:'long',year:'numeric'}).format(new Date(y,m-1,1))}
function dateFromParts(y,m,d){return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function shiftMonth(iso,delta){const [y,m]=iso.split('-').map(Number);const d=new Date(y,m-1+delta,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function selectedCalendarDate(){return window.calendarSelectedDate||today()}
function setCalendarSelectedDate(d){window.calendarSelectedDate=d}
function aggregateDay(date){
 const dayRows=rows.filter(r=>String(r.fecha).slice(0,10)===date);
 const closed=dayRows.filter(isClosed);
 const activeRows=dayRows.filter(r=>!isClosed(r));
 const sum=(arr,key)=>arr.reduce((t,r)=>t+Number(r[key]||0),0);
 return {
   rows:dayRows, closed, activeRows,
   meta:sum(dayRows,'meta_dia'),
   net:sum(closed,'ganancia_neta'),
   fuel:sum(closed,'combustible'),
   maint:sum(closed,'mantenimiento'),
   commission:sum(closed,'comision_app'),
   km:closed.reduce((t,r)=>t+kmReal(r),0),
   hours:closed.reduce((t,r)=>t+hReal(r),0),
   gross:sum(closed,'ganancia_bruta'),
   trips:sum(closed,'viajes'),
   expenses:sum(closed,'combustible')+sum(closed,'mantenimiento')+sum(closed,'comision_app')
 };
}
function renderCalendarDaySummary(date){
 const root=$('calendarDaySummary');if(!root)return;
 const a=aggregateDay(date);
 const status=a.closed.length?'CERRADA':(a.activeRows.length?'EN CURSO':'SIN REGISTRO');
 const statusCls=a.closed.length?'closed':(a.activeRows.length?'active':'');
 root.innerHTML=`<div class="calendar-selected-head"><h3>${formatCalendarDate(date)}</h3><span class="calendar-status ${statusCls}">${status}</span></div>
 <div class="calendar-metrics">
   <div class="calendar-metric"><span>Horas trabajadas</span><strong>${a.hours.toFixed(2)} h</strong></div>
   <div class="calendar-metric"><span>Ganancia neta</span><strong>${money(a.net)}</strong></div>
   <div class="calendar-metric"><span>Meta proyectada</span><strong>${money(a.meta)}</strong></div>
   <div class="calendar-metric"><span>Combustible</span><strong>${money(a.fuel)}</strong></div>
   <div class="calendar-metric"><span>Kilómetros recorridos</span><strong>${a.km.toFixed(1)} km</strong></div>
   <div class="calendar-metric"><span>Comisión app</span><strong>${money(a.commission)}</strong></div>
   <div class="calendar-metric"><span>Total de gastos</span><strong>${money(a.expenses)}</strong></div>
   <div class="calendar-metric"><span>Viajes realizados</span><strong>${a.trips}</strong></div>
   <div class="calendar-metric"><span>Ingreso neto / hora</span><strong>${a.hours>0?money(a.net/a.hours):'—'}</strong></div>
   <div class="calendar-metric"><span>Ingreso bruto / hora</span><strong>${a.hours>0?money(a.gross/a.hours):'—'}</strong></div>
   <div class="calendar-metric"><span>Costo real / km</span><strong>${a.km>0?money(a.expenses/a.km):'—'}</strong></div>
   <div class="calendar-metric"><span>Costo por viaje</span><strong>${a.trips>0?money(a.expenses/a.trips):'—'}</strong></div>
   <div class="calendar-metric"><span>Ganancia / km</span><strong>${a.km>0?money(a.net/a.km):'—'}</strong></div>
 </div>`;
}
function formatCalendarDate(iso){const [y,m,d]=iso.split('-').map(Number);return new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,d));}
function renderCalendar(){
 const month=$('calMonth').value||today().slice(0,7);setCalendarSelectedDate(selectedCalendarDate().slice(0,7)===month?selectedCalendarDate():`${month}-01`);
 const [y,m]=month.split('-').map(Number);const first=new Date(y,m-1,1);const last=new Date(y,m,0);const leading=first.getDay();const total=last.getDate();
 $('calMonthTitle').textContent=monthLabel(month);$('calMonthSubtitle').textContent=`Plan mensual de ingresos y resultados · ${total} días`;
 const byDate=new Map();for(const r of rows){const d=String(r.fecha).slice(0,10);if(!byDate.has(d))byDate.set(d,[]);byDate.get(d).push(r)}
 const prevMonth=shiftMonth(month,-1),nextMonth=shiftMonth(month,1);const prevDays=new Date(y,m-1,0).getDate();let html='';
 ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'].forEach(x=>html+=`<div class="calendar-weekday">${x}</div>`);
 for(let i=leading-1;i>=0;i--){const d=prevDays-i;const iso=dateFromParts(...prevMonth.split('-').map(Number),d);html+=calendarDayCell(iso,month,byDate)}
 for(let d=1;d<=total;d++){const iso=dateFromParts(y,m,d);html+=calendarDayCell(iso,month,byDate)}
 const cells=leading+total;for(let d=1;d<=42-cells;d++){const iso=dateFromParts(...nextMonth.split('-').map(Number),d);html+=calendarDayCell(iso,month,byDate)}
 $('calendar').innerHTML=html;renderCalendarDaySummary(selectedCalendarDate());
 document.querySelectorAll('.calendar-day').forEach(btn=>btn.onclick=()=>{setCalendarSelectedDate(btn.dataset.date);renderCalendar()});
}
function calendarDayCell(iso,currentMonth,byDate){
 const a=aggregateDay(iso),same=iso.slice(0,7)===currentMonth,sel=iso===selectedCalendarDate(),tod=iso===today(),has=a.rows.length>0;
 const cls=['calendar-day',same?'':'other-month',sel?'selected':'',tod?'today':'',a.closed.length?'closed':'',a.activeRows.length&&!a.closed.length?'active':'',has?'has-data':''].filter(Boolean).join(' ');
 let body='';if(a.closed.length){body=`<div class="calendar-day-status">${a.closed.length>1?a.closed.length+' jornadas':'Jornada cerrada'}</div><div class="calendar-day-summary-line">Neto <strong>${money(a.net)}</strong></div><div class="calendar-day-summary-line">Comb. <strong>${money(a.fuel)}</strong></div><div class="calendar-day-summary-line">Horas <strong>${a.hours.toFixed(2)} h</strong></div><div class="calendar-day-summary-line">Comisión <strong>${money(a.commission)}</strong></div>`}else if(a.activeRows.length){body=`<div class="calendar-day-status">En curso</div><div class="calendar-day-summary-line">Meta <strong>${money(a.meta)}</strong></div><div class="calendar-day-summary-line">Sin cierre todavía</div>`}else body='<div class="calendar-day-empty">Sin registro</div>';
 return `<button type="button" class="${cls}" data-date="${iso}" aria-label="${formatCalendarDate(iso)}"> <div class="calendar-day-number">${Number(iso.slice(8,10))}</div>${body}</button>`;
}
function renderAll(){renderPlan(calcPlan());renderToday();renderPerformanceChart();renderHistory();renderMonth();renderCalendar()}
function switchTab(t){tab=t;document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!==t);document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));renderAll()}
$('connect').onclick=async()=>{try{const u=val('url').trim(),k=val('key').trim();if(!/^https:\/\/[^\s]+\.supabase\.co$/.test(u)||!k)throw new Error('Ingresa una URL de Supabase válida y la Publishable Key.');db=window.supabase.createClient(u,k);const t=await withTimeout(db.from('jornadas_trabajo').select('id').limit(1));if(t.error)throw t.error;localStorage.setItem('ct_url',u);localStorage.setItem('ct_key',k);$('config').hidden=true;$('app').hidden=false;await load()}catch(e){$('msg').textContent='No se pudo conectar: '+e.message}};
$('mainAction').onclick=start;$('closeDay').onclick=closeDay;['horaFin','kmFinal','viajes','bruta','combustible','comision'].forEach(id=>$(id).addEventListener('input',previewClose));document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));$('histMonth').value=today().slice(0,7);$('calMonth').value=today().slice(0,7);window.calendarSelectedDate=today();$('histMonth').onchange=renderHistory;$('calMonth').onchange=renderCalendar;$('calPrev').onclick=()=>{$('calMonth').value=shiftMonth($('calMonth').value||today().slice(0,7),-1);setCalendarSelectedDate(`${$('calMonth').value}-01`);renderCalendar()};$('calNext').onclick=()=>{$('calMonth').value=shiftMonth($('calMonth').value||today().slice(0,7),1);setCalendarSelectedDate(`${$('calMonth').value}-01`);renderCalendar()};$('calToday').onclick=()=>{$('calMonth').value=today().slice(0,7);setCalendarSelectedDate(today());renderCalendar()};$('chartRange').onchange=renderPerformanceChart;$('saveSettings').onclick=saveSettings;for(const k of Object.keys(defaults))$(k).value=settings()[k];$('fecha').value=today();
(function boot(){const u=localStorage.getItem('ct_url'),k=localStorage.getItem('ct_key');if(u&&k){$('url').value=u;$('key').value=k;$('connect').click()}})();
