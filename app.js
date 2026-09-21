'use strict';
import { planNetGoal, closeJourney, metrics, hoursBetween, round } from './b20-core.js';

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
const num = id => Number($(id).value)||0;
const val = id => $(id).value;
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const DEFAULTS={efficiencyKmL:13,fuelPrice:1635,maintenancePerKm:0.03,commissionPct:20,netPerHour:8000,tripsPerHour:2,kmPerHour:20};
let db=null, rows=[], active=null;

function settings(){
  const s={};
  let invalidCore=false;
  for(const k of Object.keys(DEFAULTS)){
    const raw=localStorage.getItem(`b20s2_${k}`);
    const n=raw===null||raw===''?DEFAULTS[k]:Number(raw);
    s[k]=Number.isFinite(n)?n:DEFAULTS[k];
    if(['efficiencyKmL','fuelPrice','netPerHour','tripsPerHour','kmPerHour'].includes(k) && s[k]<=0) invalidCore=true;
  }
  if(invalidCore){
    for(const k of Object.keys(DEFAULTS)) s[k]=DEFAULTS[k];
    for(const k of Object.keys(DEFAULTS)) localStorage.setItem(`b20s2_${k}`,String(s[k]));
    localStorage.setItem('b20s2_migrated_at',new Date().toISOString());
  }
  if(s.maintenancePerKm<0 || !Number.isFinite(s.maintenancePerKm)) s.maintenancePerKm=DEFAULTS.maintenancePerKm;
  if(s.commissionPct<0 || s.commissionPct>=100 || !Number.isFinite(s.commissionPct)) s.commissionPct=DEFAULTS.commissionPct;
  return s;
}
function validateSettings(s){
  if(s.efficiencyKmL<=0) return 'El rendimiento debe ser mayor que 0 km/L.';
  if(s.fuelPrice<0) return 'El precio de combustible no puede ser negativo.';
  if(s.maintenancePerKm<0) return 'El mantenimiento por km no puede ser negativo.';
  if(s.commissionPct<0||s.commissionPct>=100) return 'La comisión debe estar entre 0% y 99,9%.';
  if(s.netPerHour<0||s.tripsPerHour<0||s.kmPerHour<0) return 'Los parámetros productivos no pueden ser negativos.';
  return '';
}
function saveSettings(){
  const s={}; for(const k of Object.keys(DEFAULTS)) s[k]=Number($(k).value);
  const error=validateSettings(s); if(error){$('settingsStatus').textContent=error;msg(error);return;}
  for(const k of Object.keys(DEFAULTS)) localStorage.setItem(`b20s2_${k}`,String(s[k]));
  localStorage.setItem('b20s2_saved_at',new Date().toISOString()); render(); $('settingsStatus').textContent='Parámetros guardados localmente en este dispositivo.'; msg('Configuración B20 guardada.');
}
function resetSettings(){for(const k of Object.keys(DEFAULTS)) localStorage.removeItem(`b20s2_${k}`);loadSettingsIntoForm();render();$('settingsStatus').textContent='Valores base restaurados.';msg('Valores base restaurados.');}
function loadSettingsIntoForm(){const s=settings();for(const k of Object.keys(DEFAULTS))$(k).value=s[k];}
function renderSettings(){const s=settings();$('settingsSummary').innerHTML=[['Rendimiento',`${s.efficiencyKmL} km/L`],['Combustible',money(s.fuelPrice)+'/L'],['Mantenimiento',money(s.maintenancePerKm)+'/km'],['Comisión',`${s.commissionPct}%`],['Neto/hora',money(s.netPerHour)],['Viajes/hora',s.tripsPerHour],['Km/hora',s.kmPerHour]].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');const ts=localStorage.getItem('b20s2_saved_at');$('settingsStatus').textContent=ts?`Último guardado: ${new Date(ts).toLocaleString('es-CL')}`:'Usando valores base o no guardados.';}
function exportSettings(){const payload={version:'B20-S02-1.3',exportedAt:new Date().toISOString(),settings:settings()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`b20-parametros-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
async function importSettingsFile(file){try{const text=await file.text();const data=JSON.parse(text);const s=data.settings||data;const merged={};for(const k of Object.keys(DEFAULTS)) merged[k]=Number(s[k]??DEFAULTS[k]);const error=validateSettings(merged);if(error)throw new Error(error);for(const k of Object.keys(DEFAULTS))localStorage.setItem(`b20s2_${k}`,String(merged[k]));localStorage.setItem('b20s2_saved_at',new Date().toISOString());loadSettingsIntoForm();render();msg('Configuración importada correctamente.');}catch(e){msg(`No se pudo importar: ${e.message}`);$('settingsStatus').textContent=e.message;}}

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
function renderPlan(){
  const p=active ? {
    hoursNeeded:Number(active.plan_horas_meta)||0,
    hours:Number(active.horas_planificadas)||Number(active.plan_horas_meta)||0,
    trips:Number(active.plan_viajes)||0,
    km:Number(active.plan_km)||0,
    fuel:Number(active.plan_combustible)||0,
    maintenance:Number(active.plan_mantenimiento)||0,
    commission:Number(active.plan_ganancia_bruta||0)-Number(active.plan_ganancia_neta||0)-Number(active.plan_combustible||0)-Number(active.plan_mantenimiento||0),
    gross:Number(active.plan_ganancia_bruta)||0,
    net:Number(active.plan_ganancia_neta)||0
  } : plan();
  $('plan').innerHTML=[['Horas necesarias',`${p.hoursNeeded.toFixed(2)} h`],['Horas planificadas',`${p.hours.toFixed(2)} h`],['Viajes',`${p.trips}`],['Kilómetros',`${p.km.toFixed(1)} km`],['Combustible',money(p.fuel)],['Mantenimiento',money(p.maintenance)],['Comisión',money(p.commission)],['Bruto requerido',money(p.gross)],['Neto objetivo',money(p.net)]].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
}
function renderActive(){
  if(!active){$('active').innerHTML='<div class="empty">No hay jornada activa.</div>';return;}
  const km=Number(active.km_inicio)||0;
  $('active').innerHTML=`<div class="status active-status"><b>Jornada en curso</b><span>${String(active.fecha).slice(0,10)} · inicio ${String(active.hora_inicio||'').slice(0,5)}</span></div><div class="grid"><div><span>Meta</span><strong>${money(active.meta_dia)}</strong></div><div><span>Km inicio</span><strong>${km.toFixed(1)}</strong></div><div><span>Plan bruto</span><strong>${money(active.plan_ganancia_bruta)}</strong></div><div><span>Plan neto</span><strong>${money(active.plan_ganancia_neta)}</strong></div></div>`;
  $('fecha').value=String(active.fecha).slice(0,10);$('meta').value=active.meta_dia??'';$('horasPlan').value=active.horas_planificadas??'';$('horaInicio').value=String(active.hora_inicio||'').slice(0,5);$('kmInicio').value=active.km_inicio??'';
  ['fecha','meta','horasPlan','horaInicio','kmInicio'].forEach(id=>$(id).disabled=true);
  $('start').disabled=true; $('closeBox').hidden=false;
  if(!$('horaFin').value){ const d=new Date(); $('horaFin').value=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
}
function renderFormIdle(){if(active)return;['fecha','meta','horasPlan','horaInicio','kmInicio'].forEach(id=>$(id).disabled=false);$('fecha').value=today();$('closeBox').hidden=true;$('start').disabled=false;}
function renderMetrics(){const m=metrics(rows);const items=[['Observaciones cerradas',m.n],['Neto acumulado',money(m.totalNet)],['Neto/hora',money(m.avgNetHour)],['Neto/km',money(m.avgNetKm)],['Neto/viaje',money(m.avgNetTrip)],['Km/viaje',m.avgKmTrip.toFixed(2)],['Combustible/km',money(m.avgFuelKm)],['Desviación media',money(m.avgDeviation)],['Desviación relativa',`${m.avgDeviationPct.toFixed(2)}%`]];$('metrics').innerHTML=items.map(([a,b])=>`<div class="metric"><span>${a}</span><strong>${b}</strong></div>`).join('');}
function renderHistory(){const month=$('histMonth').value||today().slice(0,7);const list=rows.filter(r=>String(r.fecha).slice(0,7)===month);if(!list.length){$('history').innerHTML='<div class="empty">Sin jornadas en el período.</div>';return;} $('history').innerHTML=list.map(r=>{const km=Math.max(0,Number(r.km_final||0)-Number(r.km_inicio||0));const h=Number(r.horas_trabajadas)>0?Number(r.horas_trabajadas):hoursBetween(r.hora_inicio,r.hora_fin);return `<article class="item"><div class="row"><b>${String(r.fecha).slice(0,10)}</b><span class="pill ${isClosed(r)?'closed-pill':'active-pill'}">${isClosed(r)?'Cerrada':'En curso'}</span></div><div class="mini-grid"><span>Neto <b>${money(r.ganancia_neta)}</b></span><span>Meta <b>${money(r.meta_dia)}</b></span><span>Km <b>${km.toFixed(1)}</b></span><span>Horas <b>${h.toFixed(2)}</b></span></div><div class="muted">Plan neto: ${money(r.plan_ganancia_neta)} · Desviación: ${money((Number(r.ganancia_neta)||0)-(Number(r.meta_dia)||0))}</div></article>`;}).join('');}
function render(){renderPlan();renderActive();renderFormIdle();renderMetrics();renderHistory();renderSettings();}

async function startJourney(){
  if(active)return;
  const p=plan();
  if(!val('fecha')||!val('horaInicio')||num('kmInicio')<0){msg('Completa fecha, hora de inicio y Km inicial.');return;}
  const payload={fecha:val('fecha'),meta_dia:num('meta'),horas_planificadas:num('horasPlan'),hora_inicio:val('horaInicio'),km_inicio:num('kmInicio'),viajes:0,estado:'en_curso',plan_horas_meta:p.hoursNeeded,plan_viajes:p.trips,plan_km:p.km,plan_combustible:p.fuel,plan_mantenimiento:p.maintenance,plan_ganancia_bruta:p.gross,plan_ganancia_neta:p.net};
  $('start').disabled=true;msg('Guardando jornada…');
  try{const r=await withTimeout(db.from('jornadas_trabajo').insert(payload));if(r.error)throw r.error;await load();msg('Jornada iniciada.');}catch(e){$('start').disabled=false;msg(`No se pudo iniciar: ${e.message}`);}
}
async function closeActive(){
  if(!active){msg('No existe una jornada en curso para cerrar.');return;}
  const horaFin=val('horaFin');
  const kmFinal=num('kmFinal');
  const kmInicio=Number(active.km_inicio||0);
  const viajes=num('viajes');
  const bruto=num('bruta');
  if(!horaFin){msg('Debes indicar la hora de término.');$('horaFin').focus();return;}
  if(kmFinal<kmInicio){msg(`El Km final (${kmFinal}) no puede ser menor que el Km inicial (${kmInicio}).`);$('kmFinal').focus();return;}
  if(viajes<0||bruto<0){msg('Viajes e ingreso bruto no pueden ser negativos.');return;}
  const result=closeJourney({startTime:active.hora_inicio,endTime:horaFin,kmStart:kmInicio,kmEnd:kmFinal,trips:viajes,gross:bruto,fuelReal:val('combustible'),commissionReal:val('comision'),settings:settings()});
  const editablePayload={hora_fin:horaFin,km_final:kmFinal,viajes:result.trips,combustible:result.fuel,mantenimiento:result.maintenance,ganancia_bruta:result.gross,comision_app:result.commission,ganancia_neta:result.net,notas:val('notas')||null,estado:'cerrada'};
  $('close').disabled=true;msg('Cerrando jornada…');
  try{
    // Cierre mínimo y compatible: no se escriben ni se seleccionan columnas derivadas.
    // Supabase/PostgreSQL puede calcularlas, y el historial B20 puede derivarlas desde los datos base.
    const r=await withTimeout(db.from('jornadas_trabajo').update(editablePayload).eq('id',active.id));
    if(r.error)throw r.error;
    active=null;
    ['horaFin','kmFinal','viajes','bruta','combustible','comision','notas'].forEach(id=>$(id).value='');
    await load();
    msg('Jornada cerrada correctamente.');
  }catch(e){
    console.error('Error de cierre B20 S01:',e);
    msg(`No se pudo cerrar: ${e.message||'Error desconocido de Supabase'}`);
  }finally{$('close').disabled=false;}
}
$('connect').onclick=async()=>{try{const u=val('url').trim(),k=val('key').trim();if(!/^https:\/\/[^\s]+\.supabase\.co$/.test(u)||!k)throw new Error('URL o Publishable Key inválida.');db=window.supabase.createClient(u,k);const t=await withTimeout(db.from('jornadas_trabajo').select('id').limit(1));if(t.error)throw t.error;localStorage.setItem('b20s2_url',u);localStorage.setItem('b20s2_key',k);$('config').hidden=true;$('app').hidden=false;await load();}catch(e){$('msg').textContent=`No se pudo conectar: ${e.message}`;}};
$('start').onclick=startJourney;$('close').onclick=closeActive;$('histMonth').onchange=renderHistory;$('saveSettings').onclick=saveSettings;$('resetSettings').onclick=resetSettings;$('exportSettings').onclick=exportSettings;$('importSettings').onchange=e=>{if(e.target.files[0])importSettingsFile(e.target.files[0]);e.target.value='';};
loadSettingsIntoForm();$('histMonth').value=today().slice(0,7);$('fecha').value=today();
for(const id of ['meta','horasPlan','kmInicio'])$(id).addEventListener('input',renderPlan);
(function boot(){const u=localStorage.getItem('b20s2_url'),k=localStorage.getItem('b20s2_key');if(u&&k){$('url').value=u;$('key').value=k;$('connect').click();}})();
