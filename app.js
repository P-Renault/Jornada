let db=null,cache=[],calendarMonth=new Date();
const $=id=>document.getElementById(id);
const CLP=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
const today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const n=id=>Math.max(0,Number($(id).value)||0);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const msg=(id,v)=>$(id).textContent=v;
function settings(){const s=JSON.parse(localStorage.getItem('work_settings')||'{}');return{vehiculo:s.vehiculo||'Chevrolet Sail 2015 1.4',rendimiento:Number(s.rendimiento)||13,precioLitro:Number(s.precioLitro)||1635,mantKm:Number(s.mantKm)||30,comisionPct:Number(s.comisionPct)||20,netHora:Number(s.netHora)||8000,viajesHora:Number(s.viajesHora)||2,kmHora:Number(s.kmHora)||20}}
function configLoad(){
 $('supabaseUrl').value=localStorage.getItem('work_url')||'';$('supabaseKey').value=localStorage.getItem('work_key')||'';
 $('fecha').value=today();$('fecha').max=today();$('dashboardMonth').value=today().slice(0,7);$('historyMonth').value=today().slice(0,7);
 const s=settings();$('vehiculo').value=s.vehiculo;$('rendimiento').value=s.rendimiento;$('precioLitro').value=s.precioLitro;$('mantKm').value=s.mantKm;$('comisionPct').value=s.comisionPct;$('netHora').value=s.netHora;$('viajesHora').value=s.viajesHora;$('kmHora').value=s.kmHora;
 $('metaDia').value=localStorage.getItem('last_goal')||'';
}
async function connect(){const url=$('supabaseUrl').value.trim(),key=$('supabaseKey').value.trim();if(!url||!key)return msg('configMsg','Completa URL y Publishable Key.');try{db=window.supabase.createClient(url,key);const{error}=await db.from('jornadas_trabajo').select('id').limit(1);if(error)throw error;localStorage.setItem('work_url',url);localStorage.setItem('work_key',key);$('configPanel').classList.add('hidden');$('app').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');await refresh()}catch(e){console.error(e);msg('configMsg','No se pudo conectar. Revisa URL, clave y el SQL de V3/V4.')}}
$('saveConfig').onclick=connect;$('logoutBtn').onclick=()=>{localStorage.removeItem('work_url');localStorage.removeItem('work_key');location.reload()};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.tab').forEach(x=>x.classList.add('hidden'));$(b.dataset.tab).classList.remove('hidden');if(b.dataset.tab==='dashboard')renderDashboard();if(b.dataset.tab==='historial')renderHistory();if(b.dataset.tab==='calendario')renderCalendar();if(b.dataset.tab==='jornadas')loadTodayActive()});
function hoursBetween(a,b){if(!a||!b)return 0;let[ah,am]=a.split(':').map(Number),[bh,bm]=b.split(':').map(Number),x=ah*60+am,y=bh*60+bm;if(y<x)y+=1440;return(y-x)/60}
function completed(r){return !!(r.estado==='cerrada'&&r.hora_fin&&r.km_final!==null&&r.km_final!==undefined)}
function historicalRates(){const done=cache.filter(completed);if(done.length<3)return{netHora:settings().netHora,viajesHora:settings().viajesHora,kmHora:settings().kmHora,source:'configuración'};const h=done.reduce((a,r)=>a+Number(r.horas_trabajadas||0),0),tr=done.reduce((a,r)=>a+Number(r.viajes||0),0),km=done.reduce((a,r)=>a+Number(r.km_recorridos||0),0),net=done.reduce((a,r)=>a+Number(r.ganancia_neta||0),0);return{netHora:h?net/h:settings().netHora,viajesHora:h?tr/h:settings().viajesHora,kmHora:h?km/h:settings().kmHora,source:'promedio de tus jornadas cerradas'}}
function projection(){const s=settings(),rates=historicalRates(),goal=n('metaDia'),planned=n('horasPlan');const needHours=rates.netHora>0?goal/rates.netHora:0;const km=planned*rates.kmHora,trips=Math.round(planned*rates.viajesHora),fuel=rates.kmHora>0?(km/s.rendimiento)*s.precioLitro:0,maint=km*s.mantKm;const grossNeeded=s.comisionPct<100?(goal+fuel+maint)/(1-s.comisionPct/100):0;const net=planned*rates.netHora;const grossProjected=s.comisionPct<100?(net+fuel+maint)/(1-s.comisionPct/100):0;return{rates,needHours,km,trips,fuel,maint,grossNeeded,net,grossProjected,goal,planned}}
function renderProjection(){const p=projection();$('planHours').textContent=p.needHours.toFixed(2)+' h';$('planKm').textContent=p.km.toFixed(1)+' km';$('planTrips').textContent=p.trips+' viajes';$('planFuel').textContent=CLP(p.fuel);$('planMaintenance').textContent=CLP(p.maint);$('planGross').textContent=CLP(p.grossProjected);$('planNet').textContent=CLP(p.net);$('planGrossGoal').textContent=CLP(p.grossNeeded);$('planRate').textContent=CLP(p.rates.netHora)+'/h';$('planSource').textContent='Proyección basada en '+p.rates.source+'. Meta: '+CLP(p.goal)+'. Jornada planificada: '+n('horasPlan').toFixed(2)+' h.';const delta=p.net-p.goal;$('planStatus').textContent=delta>=0?'Con esta jornada proyectada, la meta es alcanzable.':'Con esta jornada proyectada, faltarían '+CLP(Math.abs(delta))+' para alcanzar la meta.'}
function actualCalc(){const s=settings(),km=$('kmFinal').value.trim()===''?0:Math.max(0,n('kmFinal')-n('kmInicio')),h=hoursBetween($('horaInicio').value,$('horaFin').value);const estFuel=s.rendimiento>0?(km/s.rendimiento)*s.precioLitro:0;const fuel=$('combustible').value.trim()===''?estFuel:n('combustible');const maint=km*s.mantKm;const autoComm=n('bruta')*s.comisionPct/100;const comm=$('comision').value.trim()===''?autoComm:n('comision');const net=n('bruta')-fuel-maint-comm;const goal=n('metaDia');$('actualHours').textContent=h.toFixed(2)+' h';$('actualKm').textContent=km.toFixed(1)+' km';$('actualFuel').textContent=CLP(fuel)+(fuel===estFuel?' · estimado':' · real');$('actualMaint').textContent=CLP(maint);$('actualComm').textContent=CLP(comm);$('actualGross').textContent=CLP(n('bruta'));$('actualNet').textContent=CLP(net);$('actualDiff').textContent=CLP(net-goal);$('actualGoalStatus').textContent=goal>0?(net>=goal?'META CUMPLIDA':'FALTAN '+CLP(goal-net)):'Sin meta';return{km,h,fuel,maint,comm,net}}
function setStartMode(){ $('closingPanel').classList.add('hidden');$('workSubmit').textContent='Iniciar jornada';$('workSubmit').classList.remove('secondary','hidden');$('workFinish').classList.add('hidden');$('closeDay').classList.add('hidden');$('workCancel').classList.add('hidden');$('workFormTitle').textContent='Iniciar jornada de hoy';$('closingNote').textContent='La jornada aún no está iniciada.';}
function setActiveMode(r){$('workId').value=r.id;$('fecha').value=r.fecha;$('fecha').disabled=true;$('closingPanel').classList.add('hidden');$('workFormTitle').textContent='Jornada en curso';$('workSubmit').classList.add('hidden');$('workFinish').classList.remove('hidden');$('workFinish').textContent='Terminar jornada';$('closeDay').classList.add('hidden');$('workCancel').classList.remove('hidden');$('closingNote').textContent='La jornada está guardada. Pulsa “Terminar jornada” para ingresar los datos de cierre.';}
function setClosedEditMode(r){$('workId').value=r.id;$('fecha').disabled=false;$('closingPanel').classList.remove('hidden');$('workFormTitle').textContent='Editar jornada cerrada';$('workSubmit').classList.add('hidden');$('workFinish').classList.add('hidden');$('closeDay').classList.remove('hidden');$('closeDay').textContent='Guardar cambios';$('workCancel').classList.remove('hidden');$('closingNote').textContent='Estás editando una jornada ya cerrada. Los datos reales se volverán a calcular y guardar.'}
function clearForm(){ $('workForm').reset();$('workId').value='';$('fecha').value=today();$('fecha').disabled=true;$('metaDia').value=localStorage.getItem('last_goal')||'';$('horaInicio').value='';$('kmInicio').value='';setStartMode();renderProjection();actualCalc() }
function loadTodayActive(){const active=cache.find(r=>r.fecha===today()&&r.estado==='en_curso');if(active){fillRecord(active);setActiveMode(active)}else{clearForm()}}
function fillRecord(r){$('workId').value=r.id;$('fecha').value=r.fecha;$('metaDia').value=r.meta_dia??'';$('horasPlan').value=r.horas_planificadas??'';$('horaInicio').value=r.hora_inicio?.slice(0,5)||'';$('horaFin').value=r.hora_fin?.slice(0,5)||'';$('kmInicio').value=r.km_inicio??'';$('kmFinal').value=r.km_final??'';$('viajes').value=r.viajes??'';$('bruta').value=r.ganancia_bruta??'';$('combustible').value=r.combustible??'';$('comision').value=r.comision_app??'';$('notas').value=r.notas||'';renderProjection();actualCalc()}
function validateStart(){if(!$('fecha').value||$('fecha').value!==today())return 'La jornada se inicia únicamente con la fecha actual.';if(!$('metaDia').value)return 'Ingresa la meta del día.';if(!$('horasPlan').value)return 'Ingresa las horas de trabajo planificadas.';if(!$('horaInicio').value)return 'Ingresa la hora de inicio.';if($('kmInicio').value.trim()==='')return 'Ingresa el kilometraje inicial.';return ''}
function validateClose(){if(!$('horaFin').value||$('kmFinal').value.trim()===''||$('bruta').value.trim()==='')return 'Para terminar el turno debes ingresar hora fin, km final y ganancia bruta.';if(Number($('kmFinal').value)<Number($('kmInicio').value))return 'El km final no puede ser menor al inicial.';const c=actualCalc();if(c.h<=0)return 'La hora de término debe ser posterior a la hora de inicio.';if(c.net<0)return 'Los costos superan la ganancia bruta. Revisa el cierre.';return ''}
$('workForm').onsubmit=async e=>{
 e.preventDefault();
 if(!db)return msg('workMsg','Conecta primero la base de datos.');
 const id=$('workId').value;
 const err=validateStart();
 if(id)return msg('workMsg','La jornada ya está iniciada. Usa “Terminar jornada” para guardar el cierre.');
 if(err)return msg('workMsg',err);
 if(cache.some(r=>r.fecha===today()&&r.estado==='en_curso'))return msg('workMsg','Ya existe una jornada en curso para hoy.');
 const p=projection(); const payload={fecha:today(),meta_dia:n('metaDia'),horas_planificadas:n('horasPlan'),hora_inicio:$('horaInicio').value,km_inicio:n('kmInicio'),viajes:0,notas:$('notas').value.trim(),estado:'en_curso',plan_horas_meta:p.needHours,plan_viajes:p.trips,plan_km:p.km,plan_combustible:p.fuel,plan_mantenimiento:p.maint,plan_ganancia_bruta:p.grossProjected,plan_ganancia_neta:p.net};
 const {data,error}=await db.from('jornadas_trabajo').insert(payload).select().single();
 if(error)return msg('workMsg',error.message);
 localStorage.setItem('last_goal',String(payload.meta_dia));
 await refresh();
 const r=cache.find(x=>String(x.id)===String(data.id))||data;
 fillRecord(r);setActiveMode(r);
 msg('workMsg','Jornada iniciada y guardada correctamente en Supabase. El plan proyectado quedó asociado a esta jornada.');
};

async function finishCurrent(){
 if(!db)return msg('workMsg','Conecta primero la base de datos.');
 const id=$('workId').value;
 if(!id)return msg('workMsg','Primero debes iniciar la jornada.');
 const current=cache.find(r=>String(r.id)===String(id));
 if(!current)return msg('workMsg','No se encontró la jornada en la base de datos.');
 const err=validateClose();if(err)return msg('workMsg',err);
 const c=actualCalc();
 const payload={hora_fin:$('horaFin').value,km_final:n('kmFinal'),horas_trabajadas:c.h,km_recorridos:c.km,combustible:c.fuel,mantenimiento:c.maint,ganancia_bruta:n('bruta'),comision_app:c.comm,ganancia_neta:c.net,viajes:Math.round(n('viajes')),notas:$('notas').value.trim(),estado:'cerrada',updated_at:new Date().toISOString()};
 const {error}=await db.from('jornadas_trabajo').update(payload).eq('id',id);
 if(error)return msg('workMsg',error.message);
 await refresh();
 const closed=cache.find(r=>String(r.id)===String(id));
 if(closed){fillRecord(closed);setClosedEditMode(closed);renderDashboard();}
 msg('workMsg','Día cerrado y jornada guardada. Revisa el análisis Meta vs. Plan vs. Real en esta pantalla y en Resumen.');
}

$('workFinish').onclick=()=>{ $('closingPanel').classList.remove('hidden'); $('workFinish').classList.add('hidden'); $('closeDay').classList.remove('hidden'); $('closeDay').textContent='Cerrar día'; $('closingNote').textContent='Completa ahora los datos reales de cierre y pulsa “Cerrar día”.'; window.scrollTo({top:document.getElementById('closingPanel').getBoundingClientRect().top+window.scrollY-20,behavior:'smooth'}); };
$('closeDay').onclick=finishCurrent;
$('workCancel').onclick=()=>{loadTodayActive();msg('workMsg','Operación cancelada.')};
$('workFinish').onclick=finishCurrent;
window.editWork=id=>{const r=cache.find(x=>String(x.id)===String(id));if(!r)return;fillRecord(r);document.querySelector('[data-tab="jornadas"]').click();if(r.estado==='en_curso')setActiveMode(r);else setClosedEditMode(r)};
window.deleteWork=async id=>{if(!confirm('¿Borrar esta jornada?'))return;const{error}=await db.from('jornadas_trabajo').delete().eq('id',id);if(error)return alert(error.message);await refresh();loadTodayActive()};
function monthRows(){const m=$('historyMonth').value;return cache.filter(r=>r.fecha.startsWith(m)).sort((a,b)=>b.fecha.localeCompare(a.fecha))}
function renderHistory(){const rows=monthRows();$('historialLista').innerHTML=rows.length?rows.map(r=>{const st=r.estado==='cerrada'?'Cerrada':'En curso';return `<div class="row"><div class="row-main"><b>${r.fecha} · ${esc(r.hora_inicio?.slice(0,5))}${r.hora_fin?'–'+esc(r.hora_fin.slice(0,5)):''}</b><div>${st} · Meta ${CLP(r.meta_dia)} · Plan ${Number(r.horas_planificadas||0).toFixed(2)} h</div>${r.estado==='cerrada'?`<small>${Number(r.horas_trabajadas||0).toFixed(2)} h · ${Number(r.km_recorridos||0).toFixed(1)} km · ${r.viajes||0} viajes · Neto ${CLP(r.ganancia_neta)}</small>`:'<small>Jornada pendiente de cierre</small>'}</div><div class="row-right"><strong class="${r.estado==='cerrada'?(Number(r.ganancia_neta)>=Number(r.meta_dia)?'positive':'negative'):''}">${r.estado==='cerrada'?CLP(r.ganancia_neta):'EN CURSO'}</strong><div class="actions"><button type="button" class="small history-edit" data-id="${r.id}">${r.estado==='en_curso'?'Terminar':'Editar'}</button><button type="button" class="small danger history-delete" data-id="${r.id}">Borrar</button></div></div></div>`}).join(''):'<p class="muted">Sin jornadas para este mes.</p>'}

$('historialLista').addEventListener('click',e=>{const edit=e.target.closest('.history-edit');const del=e.target.closest('.history-delete');if(edit){window.editWork(edit.dataset.id)}else if(del){window.deleteWork(del.dataset.id)}});
function summary(m){const rs=cache.filter(r=>r.fecha.startsWith(m)&&r.estado==='cerrada'),sum=k=>rs.reduce((a,r)=>a+Number(r[k]||0),0);return{rs,h:sum('horas_trabajadas'),km:sum('km_recorridos'),trips:sum('viajes'),gross:sum('ganancia_bruta'),net:sum('ganancia_neta'),fuel:sum('combustible'),maint:sum('mantenimiento'),comm:sum('comision_app'),goals:sum('meta_dia')}}
function todayRecord(){return cache.find(r=>r.fecha===today())||null}
function renderTodayDashboard(){
 const r=todayRecord();
 $('dashboardTodayLabel').textContent=new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 if(!r){
  $('dashboardTurnStatus').textContent='Sin jornada';
  $('todayCompareBars').innerHTML='<p class="muted">Inicia el turno de hoy para generar la proyección.</p>';
  $('todayComparisonTable').innerHTML='<tr><td colspan="4">Sin jornada registrada hoy.</td></tr>';
  return;
 }
 const s=settings(),rates=historicalRates();
 const planHours=Number(r.horas_planificadas||0),goal=Number(r.meta_dia||0);
 const planNet=Number(r.plan_ganancia_neta||0) || planHours*rates.netHora;
 const planTrips=Number(r.plan_viajes||0) || Math.round(planHours*rates.viajesHora);
 const planKm=Number(r.plan_km||0) || planHours*rates.kmHora;
 const planFuel=Number(r.plan_combustible||0) || (rates.kmHora>0?(planKm/s.rendimiento)*s.precioLitro:0);
 const planMaint=Number(r.plan_mantenimiento||0) || planKm*s.mantKm;
 const planGross=Number(r.plan_ganancia_bruta||0) || (s.comisionPct<100?(planNet+planFuel+planMaint)/(1-s.comisionPct/100):0);
 const realHours=Number(r.horas_trabajadas||0),realTrips=Number(r.viajes||0),realKm=Number(r.km_recorridos||0),realGross=Number(r.ganancia_bruta||0),realNet=Number(r.ganancia_neta||0);
 const closed=r.estado==='cerrada';
 $('dashboardTurnStatus').textContent=closed?(realNet>=goal?'Meta cumplida':'Meta no alcanzada'):'EN CURSO';
 const rows=[
  ['Ganancia neta',goal,closed?realNet:null,'$'],
  ['Horas',planHours,closed?realHours:null,'h'],
  ['Viajes',planTrips,closed?realTrips:null,'viajes'],
  ['Kilómetros',planKm,closed?realKm:null,'km'],
  ['Ganancia bruta',planGross,closed?realGross:null,'$']
 ];
 $('todayComparisonTable').innerHTML=rows.map(function(row){
  const label=row[0],plan=row[1],real=row[2],unit=row[3];
  const diff=real===null?null:real-plan;
  const pct=(diff!==null&&plan)?diff/plan*100:0;
  let diffText='Pendiente';
  if(diff!==null) diffText=(diff>=0?'+':'')+(unit==='$'?CLP(diff):diff.toFixed(1)+' '+unit)+' ('+pct.toFixed(0)+'%)';
  return '<tr><td>'+label+'</td><td>'+(unit==='$'?CLP(plan):plan.toFixed(1)+' '+unit)+'</td><td>'+(real===null?'—':unit==='$'?CLP(real):real.toFixed(1)+' '+unit)+'</td><td class="'+(diff===null?'':diff>=0?'positive':'negative')+'">'+diffText+'</td></tr>';
 }).join('');
 const max=Math.max(goal,planNet,realNet,1);
 const costRows=[
  ['Combustible',planFuel,closed?Number(r.combustible||0):null,'$'],
  ['Mantenimiento',planMaint,closed?Number(r.mantenimiento||0):null,'$'],
  ['Comisión',planGross*s.comisionPct/100,closed?Number(r.comision_app||0):null,'$']
 ];
 $('todayCostTable').innerHTML=costRows.map(function(row){const label=row[0],plan=row[1],real=row[2],unit=row[3];const diff=real===null?null:real-plan;return '<tr><td>'+label+'</td><td>'+CLP(plan)+'</td><td>'+(real===null?'—':CLP(real))+'</td><td class="'+(diff===null?'':diff>=0?'negative':'positive')+'">'+(diff===null?'Pendiente':(diff>=0?'+':'')+CLP(diff))+'</td></tr>';}).join('');
 $('todayCompareBars').innerHTML=
  '<div class="bar-row"><span>Meta neta</span><div class="bar-track"><div class="bar goal" style="width:'+Math.min(100,goal/max*100)+'%"></div></div><b>'+CLP(goal)+'</b></div>'+ 
  '<div class="bar-row"><span>Plan neto</span><div class="bar-track"><div class="bar plan" style="width:'+Math.min(100,planNet/max*100)+'%"></div></div><b>'+CLP(planNet)+'</b></div>'+ 
  '<div class="bar-row"><span>Real neto</span><div class="bar-track"><div class="bar actual" style="width:'+(closed?Math.min(100,realNet/max*100):0)+'%"></div></div><b>'+(closed?CLP(realNet):'Pendiente')+'</b></div>';
}
function renderDashboard(){const m=$('dashboardMonth').value,s=summary(m),all=cache.filter(r=>r.fecha.startsWith(m)),done=s.rs,pRate=historicalRates();$('dNet').textContent=CLP(s.net);$('dGross').textContent=CLP(s.gross);$('dHours').textContent=s.h.toFixed(2)+' h';$('dTrips').textContent=s.trips;$('dKm').textContent=s.km.toFixed(1)+' km';$('dHourly').textContent=CLP(s.h?s.net/s.h:0);$('dFuel').textContent=CLP(s.fuel);$('dMaintenance').textContent=CLP(s.maint);$('dCommission').textContent=CLP(s.comm);$('dCosts').textContent=CLP(s.fuel+s.maint+s.comm);const goalDays=done.filter(r=>Number(r.meta_dia)>0&&Number(r.ganancia_neta)>=Number(r.meta_dia)).length;$('dashboardAdvice').textContent=all.length?`${done.length} cerradas · ${all.length-done.length} en curso · Cumplimiento de meta: ${goalDays}/${done.filter(r=>Number(r.meta_dia)>0).length||0} · Rendimiento histórico: ${CLP(pRate.netHora)}/h.`:'Registra la jornada de hoy para comenzar.';renderComparison(m);renderTodayDashboard()}
function renderComparison(m){const s=summary(m),goal=s.goals,rows=[['Horas trabajadas',s.h,s.rs.reduce((a,r)=>a+Number(r.horas_planificadas||0),0),'h'],['Viajes realizados',s.trips,s.rs.reduce((a,r)=>a+Number(r.horas_planificadas||0)*historicalRates().viajesHora,0),'viajes'],['Kilómetros',s.km,s.rs.reduce((a,r)=>a+Number(r.horas_planificadas||0)*historicalRates().kmHora,0),'km'],['Ganancia bruta',s.gross,s.rs.reduce((a,r)=>a+Number(r.meta_dia||0),0),'$'],['Ganancia neta',s.net,goal,'$']];$('comparisonTable').innerHTML=rows.map(([label,real,plan,u])=>{const diff=real-plan,pct=plan?diff/plan*100:0;return `<tr><td>${label}</td><td>${u==='$'?CLP(real):real.toFixed(1)+' '+u}</td><td>${u==='$'?CLP(plan):plan.toFixed(1)+' '+u}</td><td class="${diff>=0?'positive':'negative'}">${diff>=0?'+':''}${u==='$'?CLP(diff):diff.toFixed(1)+' '+u} (${pct.toFixed(0)}%)</td></tr>`}).join('')||'<tr><td colspan="4">Sin datos cerrados.</td></tr>';const max=Math.max(goal,s.net,1);$('compareBars').innerHTML=`<div class="bar-row"><span>Meta neta</span><div class="bar-track"><div class="bar goal" style="width:${Math.min(100,goal/max*100)}%"></div></div><b>${CLP(goal)}</b></div><div class="bar-row"><span>Real neto</span><div class="bar-track"><div class="bar actual" style="width:${Math.min(100,s.net/max*100)}%"></div></div><b>${CLP(s.net)}</b></div>`}
$('dashboardMonth').onchange=renderDashboard;$('historyMonth').onchange=renderHistory;
function ym(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}function monthLabel(d){return d.toLocaleDateString('es-CL',{month:'long',year:'numeric'}).replace(/^./,x=>x.toUpperCase())}
function renderCalendar(){const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth(),month=ym(calendarMonth),first=new Date(y,m,1),start=addDays(first,-first.getDay()),days=Array.from({length:42},(_,i)=>addDays(start,i));$('calendarMonth').textContent=monthLabel(calendarMonth);const by={};cache.filter(r=>r.fecha.startsWith(month)).forEach(r=>(by[r.fecha]??=[]).push(r));const s=summary(month);$('calNet').textContent=CLP(s.net);$('calHours').textContent=s.h.toFixed(2)+' h';$('calKm').textContent=s.km.toFixed(1)+' km';$('calTrips').textContent=s.trips;$('calendarGrid').innerHTML=days.map(d=>{const k=dateKey(d),rs=by[k]||[],inm=d.getMonth()===m;return `<div class="calendar-day ${inm?'':'outside'} ${k===today()?'today-day':''}"><div class="day-head"><span class="day-number">${d.getDate()}</span>${k===today()?'<span class="today-dot">HOY</span>':''}</div>${rs.length?`<div class="day-line income">${CLP(rs.reduce((a,r)=>a+Number(r.ganancia_neta||0),0))}</div><div class="day-event ingreso">${rs.length} jornada${rs.length>1?'s':''}</div><div class="day-event">${rs.reduce((a,r)=>a+Number(r.viajes||0),0)} viajes · ${rs.reduce((a,r)=>a+Number(r.km_recorridos||0),0).toFixed(1)} km</div><div class="day-event">Meta ${CLP(rs.reduce((a,r)=>a+Number(r.meta_dia||0),0))}</div>`:''}</div>`}).join('')}
$('calPrev').onclick=()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);renderCalendar()};$('calNext').onclick=()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);renderCalendar()};$('calToday').onclick=()=>{calendarMonth=new Date();renderCalendar()};
$('settingsForm').onsubmit=e=>{e.preventDefault();localStorage.setItem('work_settings',JSON.stringify({vehiculo:$('vehiculo').value.trim(),rendimiento:n('rendimiento'),precioLitro:n('precioLitro'),mantKm:n('mantKm'),comisionPct:n('comisionPct'),netHora:n('netHora'),viajesHora:n('viajesHora'),kmHora:n('kmHora')}));msg('settingsMsg','Configuración guardada. Las nuevas proyecciones usarán estos valores.');renderProjection();actualCalc();renderDashboard()};
async function refresh(){const{data,error}=await db.from('jornadas_trabajo').select('*').order('fecha',{ascending:false}).order('created_at',{ascending:false});if(error){console.error(error);return msg('configMsg','Conectado, pero no se pudieron leer las jornadas. Ejecuta el SQL V3/V4.')}cache=data||[];renderDashboard();renderHistory();renderCalendar();if(document.querySelector('[data-tab="jornadas"]').classList.contains('active'))loadTodayActive()}
['metaDia','horasPlan','viajes','horaInicio','horaFin','kmInicio','kmFinal','combustible','bruta','comision'].forEach(id=>$(id).addEventListener('input',()=>{renderProjection();actualCalc()}));
configLoad();$('fecha').disabled=true;setStartMode();renderProjection();actualCalc();if(localStorage.getItem('work_url')&&localStorage.getItem('work_key'))connect();
