'use strict';
import { planNetGoal, closeJourney, metrics, hoursBetween, round } from './b20-core.js';

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
const num = id => Number($(id).value)||0;
const val = id => $(id).value;
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const DEFAULTS={efficiencyKmL:13,fuelPrice:1635,maintenancePerKm:0.03,commissionPct:20,netPerHour:8000,tripsPerHour:2,kmPerHour:20};
let db=null, rows=[], active=null;

function settings(){const s={};for(const k of Object.keys(DEFAULTS))s[k]=Number(localStorage.getItem(`b20s1_${k}`) ?? DEFAULTS[k]);return s;}
function saveSettings(){for(const k of Object.keys(DEFAULTS))localStorage.setItem(`b20s1_${k}`,$(k).value);render();msg('Configuración local guardada.');}
async function withTimeout(p,ms=12000){return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('Tiempo de espera agotado con Supabase.')),ms))]);}
function msg(t){$('msg').textContent=t||'';}
function isClosed(r){return String(r.estado).toLowerCase()==='cerrada'||!!r.hora_fin&&r.km_final!=null&&r.ganancia_neta!=null;}
function activeRow(){return rows.find(r=>!isClosed(r)&&String(r.estado).toLowerCase()!=='cerrada')||null;}

async function load(){
  const r=await withTimeout(db.from('jornadas_trabajo').select('*').order('fecha',{ascending:false}).order('created_at',{ascending:false}));
  if(r.error)throw r.error; rows=r.data||[]; active=activeRow(); render();
}
function plan(){
  const s=settings();
  return planNetGoal({goalNet:num('meta'),hoursPlan:num('horasPlan'),netPerHour:s.netPerHour,tripsPerHour:s.tripsPerHour,kmPerHour:s.kmPerHour,efficiencyKmL:s.efficiencyKmL,fuelPrice:s.fuelPrice,maintenancePerKm:s.maintenancePerKm,commissionPct:s.commissionPct});
}
function renderPlan(){const p=plan();$('plan').innerHTML=[['Horas necesarias',`${p.hoursNeeded.toFixed(2)} h`],['Horas planificadas',`${p.hours.toFixed(2)} h`],['Viajes',`${p.trips}`],['Kilómetros',`${p.km.toFixed(1)} km`],['Combustible',money(p.fuel)],['Mantenimiento',money(p.maintenance)],['Comisión',money(p.commission)],['Bruto requerido',money(p.gross)],['Neto objetivo',money(p.net)]].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');}
function renderActive(){
  if(!active){$('active').innerHTML='<div class="empty">No hay jornada activa.</div>';return;}
  const km=Number(active.km_inicio)||0;
  $('active').innerHTML=`<div class="status active-status"><b>Jornada en curso</b><span>${String(active.fecha).slice(0,10)} · inicio ${String(active.hora_inicio||'').slice(0,5)}</span></div><div class="grid"><div><span>Meta</span><strong>${money(active.meta_dia)}</strong></div><div><span>Km inicio</span><strong>${km.toFixed(1)}</strong></div><div><span>Plan bruto</span><strong>${money(active.plan_ganancia_bruta)}</strong></div><div><span>Plan neto</span><strong>${money(active.plan_ganancia_neta)}</strong></div></div>`;
  $('fecha').value=String(active.fecha).slice(0,10);$('meta').value=active.meta_dia??'';$('horasPlan').value=active.horas_planificadas??'';$('horaInicio').value=String(active.hora_inicio||'').slice(0,5);$('kmInicio').value=active.km_inicio??'';
  ['fecha','meta','horasPlan','horaInicio','kmInicio'].forEach(id=>$(id).disabled=true);
  $('start').disabled=true; $('closeBox').hidden=false;
}
function renderFormIdle(){if(active)return;['fecha','meta','horasPlan','horaInicio','kmInicio'].forEach(id=>$(id).disabled=false);$('fecha').value=today();$('closeBox').hidden=true;$('start').disabled=false;}
function renderMetrics(){const m=metrics(rows);const items=[['Observaciones cerradas',m.n],['Neto acumulado',money(m.totalNet)],['Neto/hora',money(m.avgNetHour)],['Neto/km',money(m.avgNetKm)],['Neto/viaje',money(m.avgNetTrip)],['Km/viaje',m.avgKmTrip.toFixed(2)],['Combustible/km',money(m.avgFuelKm)],['Desviación media',money(m.avgDeviation)],['Desviación relativa',`${m.avgDeviationPct.toFixed(2)}%`]];$('metrics').innerHTML=items.map(([a,b])=>`<div class="metric"><span>${a}</span><strong>${b}</strong></div>`).join('');}
function renderHistory(){const month=$('histMonth').value||today().slice(0,7);const list=rows.filter(r=>String(r.fecha).slice(0,7)===month);if(!list.length){$('history').innerHTML='<div class="empty">Sin jornadas en el período.</div>';return;} $('history').innerHTML=list.map(r=>{const km=Math.max(0,Number(r.km_final||0)-Number(r.km_inicio||0));const h=Number(r.horas_trabajadas)>0?Number(r.horas_trabajadas):hoursBetween(r.hora_inicio,r.hora_fin);return `<article class="item"><div class="row"><b>${String(r.fecha).slice(0,10)}</b><span class="pill ${isClosed(r)?'closed-pill':'active-pill'}">${isClosed(r)?'Cerrada':'En curso'}</span></div><div class="mini-grid"><span>Neto <b>${money(r.ganancia_neta)}</b></span><span>Meta <b>${money(r.meta_dia)}</b></span><span>Km <b>${km.toFixed(1)}</b></span><span>Horas <b>${h.toFixed(2)}</b></span></div><div class="muted">Plan neto: ${money(r.plan_ganancia_neta)} · Desviación: ${money((Number(r.ganancia_neta)||0)-(Number(r.meta_dia)||0))}</div></article>`;}).join('');}
function render(){renderPlan();renderActive();renderFormIdle();renderMetrics();renderHistory();}

async function startJourney(){
  if(active)return;
  const p=plan();
  if(!val('fecha')||!val('horaInicio')||num('kmInicio')<0){msg('Completa fecha, hora de inicio y Km inicial.');return;}
  const payload={fecha:val('fecha'),meta_dia:num('meta'),horas_planificadas:num('horasPlan'),hora_inicio:val('horaInicio'),km_inicio:num('kmInicio'),viajes:0,estado:'en_curso',plan_horas_meta:p.hoursNeeded,plan_viajes:p.trips,plan_km:p.km,plan_combustible:p.fuel,plan_mantenimiento:p.maintenance,plan_ganancia_bruta:p.gross,plan_ganancia_neta:p.net};
  $('start').disabled=true;msg('Guardando jornada…');
  try{const r=await withTimeout(db.from('jornadas_trabajo').insert(payload));if(r.error)throw r.error;await load();msg('Jornada iniciada.');}catch(e){$('start').disabled=false;msg(`No se pudo iniciar: ${e.message}`);}
}
async function closeActive(){
  if(!active)return;
  const kmFinal=num('kmFinal');
  if(!val('horaFin')||kmFinal<Number(active.km_inicio||0)){msg('Completa hora fin y un Km final válido.');return;}
  const result=closeJourney({startTime:active.hora_inicio,endTime:val('horaFin'),kmStart:active.km_inicio,kmEnd:kmFinal,trips:num('viajes'),gross:num('bruta'),fuelReal:val('combustible'),commissionReal:val('comision'),settings:settings()});
  // Importante: km_recorridos y horas_trabajadas pueden ser columnas generadas/calculadas
  // en instalaciones V19/V20.3. No se envían en el primer UPDATE para evitar que
  // PostgreSQL rechace el cierre por intentar escribir una columna generada.
  const editablePayload={hora_fin:val('horaFin'),km_final:kmFinal,viajes:result.trips,combustible:result.fuel,mantenimiento:result.maintenance,ganancia_bruta:result.gross,comision_app:result.commission,ganancia_neta:result.net,notas:val('notas')||null,estado:'cerrada'};
  $('close').disabled=true;msg('Cerrando jornada…');
  try{
    const r=await withTimeout(db.from('jornadas_trabajo').update(editablePayload).eq('id',active.id).select('id,estado,km_recorridos,horas_trabajadas'));
    if(r.error)throw r.error;
    if(!r.data?.length)throw new Error('Supabase no confirmó el cierre.');
    const saved=r.data[0];
    // Si la instalación no calcula automáticamente las columnas derivadas,
    // intentamos completarlas en un segundo UPDATE. Si son GENERATED, se ignora
    // ese segundo intento porque el cierre editable ya quedó guardado.
    const missingKm=saved.km_recorridos==null;
    const missingHours=saved.horas_trabajadas==null;
    if(missingKm||missingHours){
      const derivedPayload={};
      if(missingKm)derivedPayload.km_recorridos=result.km;
      if(missingHours)derivedPayload.horas_trabajadas=result.hours;
      const d=await withTimeout(db.from('jornadas_trabajo').update(derivedPayload).eq('id',active.id).select('id'));
      // Si falla por columna generada/RLS, no revertimos el cierre principal.
      // La jornada ya está cerrada y los campos editables quedaron persistidos.
      if(d.error){ console.warn('Campos derivados no actualizados; el cierre principal fue guardado.',d.error); }
    }
    active=null;
    ['horaFin','kmFinal','viajes','bruta','combustible','comision','notas'].forEach(id=>$(id).value='');
    await load();
    msg('Jornada cerrada correctamente.');
  }catch(e){
    msg(`No se pudo cerrar: ${e.message}`);
  }finally{$('close').disabled=false;}
}
$('connect').onclick=async()=>{try{const u=val('url').trim(),k=val('key').trim();if(!/^https:\/\/[^\s]+\.supabase\.co$/.test(u)||!k)throw new Error('URL o Publishable Key inválida.');db=window.supabase.createClient(u,k);const t=await withTimeout(db.from('jornadas_trabajo').select('id').limit(1));if(t.error)throw t.error;localStorage.setItem('b20s1_url',u);localStorage.setItem('b20s1_key',k);$('config').hidden=true;$('app').hidden=false;await load();}catch(e){$('msg').textContent=`No se pudo conectar: ${e.message}`;}};
$('start').onclick=startJourney;$('close').onclick=closeActive;$('histMonth').onchange=renderHistory;$('saveSettings').onclick=saveSettings;
for(const k of Object.keys(DEFAULTS))$(k).value=settings()[k];$('histMonth').value=today().slice(0,7);$('fecha').value=today();
for(const id of ['meta','horasPlan','kmInicio'])$(id).addEventListener('input',renderPlan);
(function boot(){const u=localStorage.getItem('b20s1_url'),k=localStorage.getItem('b20s1_key');if(u&&k){$('url').value=u;$('key').value=k;$('connect').click();}})();
