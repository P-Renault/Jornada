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
async function deleteJourney(id){
 const rawId=String(id ?? '').trim();
 if(!rawId){ alert('No se encontró el ID de la jornada.'); return; }
 const r=rows.find(x=>String(x.id)===rawId);
 if(!r){ alert('No se encontró la jornada seleccionada en los datos cargados.'); return; }
 const label=`${r.fecha} · ${String(r.hora_inicio||'').slice(0,5)}`;
 if(!confirm(`¿Borrar definitivamente la jornada ${label}?\n\nEsta acción eliminará el registro de Supabase y no se puede deshacer.`))return;
 const b=document.querySelector(`[data-delete-id="${CSS.escape(rawId)}"]`);
 if(b)b.disabled=true;
 try{
   // El ID se toma directamente de la fila cargada desde Supabase.
   const result=await withTimeout(db.from('jornadas_trabajo').delete().eq('id', rawId));
   if(result.error)throw result.error;

   // Verificación independiente: si la fila sigue existiendo, el DELETE no tuvo efecto.
   const check=await withTimeout(db.from('jornadas_trabajo').select('id').eq('id', rawId).maybeSingle());
   if(check.error)throw check.error;
   if(check.data)throw new Error('Supabase no eliminó el registro. Revisa las políticas RLS de DELETE.');

   if(active&&String(active.id)===rawId)active=null;
   await load();
   $('startMsg').textContent='Jornada eliminada correctamente.';
 }catch(e){
   if(b)b.disabled=false;
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
 const payload={hora_fin:val('horaFin'),km_final:kmFinal,km_recorridos:km,horas_trabajadas:h,viajes:num('viajes'),combustible:fuel,mantenimiento:maint,ganancia_bruta:gross,comision_app:comm,ganancia_neta:net,notas:val('notas')||null,estado:'cerrada'};
 $('closeDay').disabled=true;$('startMsg').textContent='Cerrando jornada y guardando resultado…';
 try{let result=await withTimeout(db.from('jornadas_trabajo').update(payload).eq('id',active.id).select('id,estado,ganancia_neta'));
  if(result.error)throw result.error;
  if(!result.data||result.data.length!==1)throw new Error('Supabase no confirmó el cierre de la jornada.');
  active=null;await load();switchTab('resumen');$('startMsg').textContent='Jornada cerrada correctamente.';
 }catch(e){$('startMsg').textContent='No se pudo cerrar la jornada: '+e.message;alert('No se pudo cerrar la jornada: '+e.message)}finally{$('closeDay').disabled=false}
}
function renderToday(){
 const r=rows.find(x=>String(x.fecha).slice(0,10)===today())||null;
 const closedRows=rows.filter(isClosed);
 const sum=k=>closedRows.reduce((t,x)=>t+Number(x[k]||0),0);
 const cumulativeNet=sum('ganancia_neta'), cumulativeGross=sum('ganancia_bruta'), cumulativeGoal=sum('meta_dia');
 const cumulativeKm=closedRows.reduce((t,x)=>t+kmReal(x),0), cumulativeHours=closedRows.reduce((t,x)=>t+hReal(x),0), cumulativeTrips=sum('viajes');
 const todayHtml=r?(()=>{const closed=isClosed(r),h=closed?hReal(r):0,km=closed?kmReal(r):0,net=closed?Number(r.ganancia_neta||0):0;return `<div class="grid"><div class="metric"><span>Estado</span><strong>${closed?'CERRADA':'EN CURSO'}</strong></div><div class="metric"><span>Meta</span><strong>${money(r.meta_dia)}</strong></div><div class="metric"><span>Ganancia neta</span><strong>${money(net)}</strong></div><div class="metric"><span>Horas</span><strong>${h.toFixed(2)} h</strong></div><div class="metric"><span>Viajes</span><strong>${r.viajes||0}</strong></div><div class="metric"><span>Kilómetros</span><strong>${km.toFixed(1)} km</strong></div></div><div class="scroll"><table><tr><th>Indicador</th><th>Plan</th><th>Real</th><th>Diferencia</th></tr><tr><td>Ganancia neta</td><td>${money(r.plan_ganancia_neta)}</td><td>${closed?money(net):'Pendiente'}</td><td>${closed?money(net-Number(r.plan_ganancia_neta||0)):'—'}</td></tr><tr><td>Horas</td><td>${Number(r.horas_planificadas||0).toFixed(2)} h</td><td>${closed?h.toFixed(2)+' h':'Pendiente'}</td><td>${closed?(h-Number(r.horas_planificadas||0)).toFixed(2)+' h':'—'}</td></tr></table></div>`})():'<p>Sin jornada registrada hoy.</p>';
 $('today').innerHTML=`${todayHtml}<div class="card cumulative"><h3>Ganancias acumuladas</h3><p class="muted">Suma de todas las jornadas cerradas almacenadas en Supabase.</p><div class="grid"><div class="metric"><span>Ganancia neta acumulada</span><strong>${money(cumulativeNet)}</strong></div><div class="metric"><span>Ganancia bruta acumulada</span><strong>${money(cumulativeGross)}</strong></div><div class="metric"><span>Metas acumuladas</span><strong>${money(cumulativeGoal)}</strong></div><div class="metric"><span>Diferencia neta vs metas</span><strong>${money(cumulativeNet-cumulativeGoal)}</strong></div><div class="metric"><span>Jornadas cerradas</span><strong>${closedRows.length}</strong></div><div class="metric"><span>Km acumulados</span><strong>${cumulativeKm.toFixed(1)} km</strong></div><div class="metric"><span>Horas acumuladas</span><strong>${cumulativeHours.toFixed(2)} h</strong></div><div class="metric"><span>Viajes acumulados</span><strong>${cumulativeTrips}</strong></div></div></div>`;
}
function renderHistory(){const m=$('histMonth').value||today().slice(0,7);const a=rows.filter(r=>String(r.fecha).slice(0,7)===m);$('history').innerHTML=a.length?a.map(r=>{const c=isClosed(r);return `<div class="item"><b>${r.fecha} · ${String(r.hora_inicio||'').slice(0,5)}</b><p>${c?'Cerrada':'EN CURSO'} · Meta ${money(r.meta_dia)} · Plan ${Number(r.horas_planificadas||0).toFixed(2)} h</p><p>${c?'Neta '+money(r.ganancia_neta)+' · '+hReal(r).toFixed(2)+' h · '+kmReal(r).toFixed(1)+' km':'Jornada pendiente de cierre'}</p><div class="history-actions">${!c?'<button data-finish="'+r.id+'">Terminar jornada</button>':''}<button class="danger" data-delete-id="'+String(r.id)+'">Borrar jornada</button></div></div>`}).join(''):'<p>Sin jornadas en este mes.</p>';document.querySelectorAll('[data-finish]').forEach(b=>b.onclick=()=>{const r=rows.find(x=>String(x.id)===b.dataset.finish);if(r){fill(r);activeMode(r);switchTab('jornada');$('closePanel').scrollIntoView({behavior:'smooth'})}});document.querySelectorAll('[data-delete-id]').forEach(b=>b.onclick=()=>deleteJourney(b.getAttribute('data-delete-id')))}
function renderMonth(){const m=$('histMonth').value||today().slice(0,7),a=rows.filter(r=>String(r.fecha).slice(0,7)===m&&isClosed(r));const sum=k=>a.reduce((t,r)=>t+Number(r[k]||0),0);$('monthCosts').innerHTML=[['Combustible',sum('combustible')],['Mantenimiento',sum('mantenimiento')],['Comisión app',sum('comision_app')],['Total costos',sum('combustible')+sum('mantenimiento')+sum('comision_app')]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${money(x[1])}</strong></div>`).join('');$('monthCompare').innerHTML=`<p>Jornadas cerradas: <b>${a.length}</b> · Horas: <b>${a.reduce((t,r)=>t+hReal(r),0).toFixed(2)} h</b> · Viajes: <b>${sum('viajes')}</b> · Km: <b>${a.reduce((t,r)=>t+kmReal(r),0).toFixed(1)} km</b> · Bruta: <b>${money(sum('ganancia_bruta'))}</b> · Neta: <b>${money(sum('ganancia_neta'))}</b></p>`}
function renderCalendar(){const m=$('calMonth').value||today().slice(0,7);const a=rows.filter(r=>String(r.fecha).slice(0,7)===m);$('calendar').innerHTML=a.map(r=>`<div class="item"><b>${r.fecha}</b> · ${isClosed(r)?'CERRADA':'EN CURSO'}<br>${isClosed(r)?money(r.ganancia_neta):'Pendiente'}</div>`).join('')||'<p>Sin jornadas.</p>'}
function renderAll(){renderPlan(calcPlan());renderToday();renderHistory();renderMonth();renderCalendar()}
function switchTab(t){tab=t;document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!==t);document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));renderAll()}
$('connect').onclick=async()=>{try{const u=val('url').trim(),k=val('key').trim();if(!/^https:\/\/[^\s]+\.supabase\.co$/.test(u)||!k)throw new Error('Ingresa una URL de Supabase válida y la Publishable Key.');db=window.supabase.createClient(u,k);const t=await withTimeout(db.from('jornadas_trabajo').select('id').limit(1));if(t.error)throw t.error;localStorage.setItem('ct_url',u);localStorage.setItem('ct_key',k);$('config').hidden=true;$('app').hidden=false;await load()}catch(e){$('msg').textContent='No se pudo conectar: '+e.message}};
$('mainAction').onclick=start;$('closeDay').onclick=closeDay;['horaFin','kmFinal','viajes','bruta','combustible','comision'].forEach(id=>$(id).addEventListener('input',previewClose));document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));$('histMonth').value=today().slice(0,7);$('calMonth').value=today().slice(0,7);$('histMonth').onchange=renderHistory;$('calMonth').onchange=renderCalendar;$('saveSettings').onclick=saveSettings;for(const k of Object.keys(defaults))$(k).value=settings()[k];$('fecha').value=today();
(function boot(){const u=localStorage.getItem('ct_url'),k=localStorage.getItem('ct_key');if(u&&k){$('url').value=u;$('key').value=k;$('connect').click()}})();
