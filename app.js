'use strict';
const B20_S07_VERSION='B20-S07-1.1';
import { planNetGoal, closeJourney, metrics, hoursBetween, round } from './b20-core.js';

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
const num = id => Number($(id).value)||0;
const val = id => $(id).value;
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const DEFAULTS={efficiencyKmL:13,fuelPrice:1635,maintenancePerKm:0.03,commissionPct:20,netPerHour:8000,tripsPerHour:2,kmPerHour:20};
let db=null, rows=[], active=null;


const VEHICLE_DEFAULTS={marca:'Chevrolet',modelo:'Sail',anio:2015,patente:'',kmReferencia:0,tanqueLitros:0};
function vehicleSettings(){
  const out={};
  for(const k of Object.keys(VEHICLE_DEFAULTS)){
    const raw=localStorage.getItem(`b20s3_${k}`);
    if(raw===null){out[k]=VEHICLE_DEFAULTS[k];continue;}
    out[k]=['anio','kmReferencia','tanqueLitros'].includes(k)?Number(raw):raw;
  }
  return out;
}
function loadVehicleForm(){
  const v=vehicleSettings();
  $('vehMarca').value=v.marca||'';
  $('vehModelo').value=v.modelo||'';
  $('vehAnio').value=v.anio||'';
  $('vehPatente').value=v.patente||'';
  $('vehKm').value=v.kmReferencia??0;
  $('vehTank').value=v.tanqueLitros??0;
}
function saveVehicle(){
  const v={marca:val('vehMarca').trim(),modelo:val('vehModelo').trim(),anio:Number(val('vehAnio'))||0,patente:val('vehPatente').trim().toUpperCase(),kmReferencia:Number(val('vehKm'))||0,tanqueLitros:Number(val('vehTank'))||0};
  if(!v.marca||!v.modelo){$('vehicleStatus').textContent='Marca y modelo son obligatorios.';msg('Completa marca y modelo.');return;}
  if(v.anio<1950||v.anio>2100){$('vehicleStatus').textContent='Año de vehículo inválido.';msg('Año inválido.');return;}
  if(v.kmReferencia<0||v.tanqueLitros<0){$('vehicleStatus').textContent='Los valores no pueden ser negativos.';msg('Valores inválidos.');return;}
  for(const k of Object.keys(v)) localStorage.setItem(`b20s3_${k}`,String(v[k]));
  localStorage.setItem('b20s3_saved_at',new Date().toISOString());
  renderVehicle();msg('Ficha de vehículo guardada.');
}
function resetVehicle(){
  for(const k of Object.keys(VEHICLE_DEFAULTS)) localStorage.removeItem(`b20s3_${k}`);
  loadVehicleForm();renderVehicle();msg('Ficha de vehículo restaurada.');
}
function renderVehicle(){
  if(!$('vehicleSummary')) return;
  const v=vehicleSettings();
  const dated=rows.filter(r=>r.km_final!=null && Number.isFinite(Number(r.km_final)));
  const latest=dated.slice().sort((a,b)=>{
    const ad=String(a.fecha||''); const bd=String(b.fecha||'');
    if(ad!==bd) return bd.localeCompare(ad);
    return String(b.created_at||'').localeCompare(String(a.created_at||''));
  })[0];
  const latestKm=latest?Number(latest.km_final):null;
  const refKm=Number(v.kmReferencia||0);
  const validOdometerScale=latestKm!=null && (refKm<=0 || latestKm>=refKm);
  const closedRows=rows.filter(r=>isClosed(r) && Number.isFinite(Number(r.km_inicio)) && Number.isFinite(Number(r.km_final)));
  const accumulatedKm=closedRows.reduce((sum,r)=>sum+Math.max(0,Number(r.km_final)-Number(r.km_inicio)),0);
  $('vehicleSummary').innerHTML=[
    ['Vehículo',`${v.marca||'—'} ${v.modelo||''}`.trim()],
    ['Año',v.anio||'—'],
    ['Patente',v.patente||'No registrada'],
    ['Odómetro actual de referencia',`${refKm.toFixed(1)} km`],
    ['Último valor km de jornada registrado',latestKm!=null?`${latestKm.toFixed(1)} km`:'Sin registro'],
    ['Km acumulados en registros B20',`${accumulatedKm.toFixed(1)} km`],
    ['Tanque',v.tanqueLitros?`${Number(v.tanqueLitros).toFixed(1)} L`:'No definido']
  ].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
  if(refKm>0){
    $('vehicleRef').innerHTML=`<b>Referencia correcta:</b> el ${refKm.toFixed(1)} km corresponde al odómetro real actual del vehículo. Los ${latestKm!=null?latestKm.toFixed(1):'—'} km encontrados en registros de jornada representan kilometraje de la actividad histórica/pruebas y <b>no deben restarse del odómetro</b>. Las nuevas jornadas deben iniciar con el odómetro real del vehículo.`;
  } else if(latestKm==null){
    $('vehicleRef').textContent='Registra el odómetro real actual del vehículo para establecer la referencia operativa.';
  } else {
    $('vehicleRef').textContent=`Se encontraron ${latestKm.toFixed(1)} km como último valor de jornada. Este valor se mantiene como dato histórico y no se interpreta como odómetro absoluto.`;
  }
  const ts=localStorage.getItem('b20s3_saved_at');
  $('vehicleStatus').textContent=ts?`Último guardado: ${new Date(ts).toLocaleString('es-CL')}`:'Ficha base local; aún no guardada.';
}

function settings(){
  const s={};
  let needsMigration=false;
  for(const k of Object.keys(DEFAULTS)){
    const raw=localStorage.getItem(`b20s2_${k}`);
    const n=raw===null||raw===''?DEFAULTS[k]:Number(raw);
    s[k]=Number.isFinite(n)?n:DEFAULTS[k];
    // Legacy S02 stored zero values. Treat zero as an uninitialized parameter.
    if((['efficiencyKmL','fuelPrice','netPerHour','tripsPerHour','kmPerHour'].includes(k) && s[k]<=0) ||
       (['maintenancePerKm','commissionPct'].includes(k) && s[k]===0 && raw!==null)) needsMigration=true;
  }
  if(needsMigration){
    for(const k of Object.keys(DEFAULTS)){
      s[k]=DEFAULTS[k];
      localStorage.setItem(`b20s2_${k}`,String(s[k]));
    }
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
function renderFormIdle(){if(active)return;['fecha','meta','horasPlan','horaInicio','kmInicio'].forEach(id=>$(id).disabled=false);$('fecha').value=today();const v=vehicleSettings();if(Number(v.kmReferencia)>0 && (!val('kmInicio') || Number(val('kmInicio'))<1000)) $('kmInicio').value=Number(v.kmReferencia);$('closeBox').hidden=true;$('start').disabled=false;}
function renderMetrics(){const m=metrics(rows);const items=[['Observaciones cerradas',m.n],['Neto acumulado',money(m.totalNet)],['Neto/hora',money(m.avgNetHour)],['Neto/km',money(m.avgNetKm)],['Neto/viaje',money(m.avgNetTrip)],['Km/viaje',m.avgKmTrip.toFixed(2)],['Combustible/km',money(m.avgFuelKm)],['Desviación media',money(m.avgDeviation)],['Desviación relativa',`${m.avgDeviationPct.toFixed(2)}%`]];$('metrics').innerHTML=items.map(([a,b])=>`<div class="metric"><span>${a}</span><strong>${b}</strong></div>`).join('');}
function renderHistory(){const month=$('histMonth').value||today().slice(0,7);const list=rows.filter(r=>String(r.fecha).slice(0,7)===month);if(!list.length){$('history').innerHTML='<div class="empty">Sin jornadas en el período.</div>';return;} $('history').innerHTML=list.map(r=>{const km=Math.max(0,Number(r.km_final||0)-Number(r.km_inicio||0));const h=Number(r.horas_trabajadas)>0?Number(r.horas_trabajadas):hoursBetween(r.hora_inicio,r.hora_fin);return `<article class="item"><div class="row"><b>${String(r.fecha).slice(0,10)}</b><span class="pill ${isClosed(r)?'closed-pill':'active-pill'}">${isClosed(r)?'Cerrada':'En curso'}</span></div><div class="mini-grid"><span>Neto <b>${money(r.ganancia_neta)}</b></span><span>Meta <b>${money(r.meta_dia)}</b></span><span>Km <b>${km.toFixed(1)}</b></span><span>Horas <b>${h.toFixed(2)}</b></span></div><div class="muted">Plan neto: ${money(r.plan_ganancia_neta)} · Desviación: ${money((Number(r.ganancia_neta)||0)-(Number(r.meta_dia)||0))}</div></article>`;}).join('');}

// ===== S04: Combustible y costos operacionales (persistencia local durante validación) =====
const FUEL_KEY='b20s4_fuel_records';
function fuelRecords(){try{const x=JSON.parse(localStorage.getItem(FUEL_KEY)||'[]');return Array.isArray(x)?x:[];}catch{return [];}}
function saveFuelRecords(list){localStorage.setItem(FUEL_KEY,JSON.stringify(list));}
function vehicleOdometer(){return Number(vehicleSettings().kmReferencia)||0;}
function renderFuel(){
  const list=fuelRecords().sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))||Number(b.km)-Number(a.km));
  const totalLitros=list.reduce((s,r)=>s+Number(r.litros||0),0);
  const totalCosto=list.reduce((s,r)=>s+Number(r.total||0),0);
  const avgPrice=totalLitros?totalCosto/totalLitros:0;
  let distance=0, consumption=0, costKm=0;
  const ordered=list.slice().sort((a,b)=>Number(a.km)-Number(b.km));
  if(ordered.length>=2){distance=Math.max(0,Number(ordered[ordered.length-1]?.km)-Number(ordered[0]?.km));}
  if(distance>0 && totalLitros>0){consumption=distance/totalLitros;costKm=totalCosto/distance;}
  $('fuelSummary').innerHTML=[['Cargas registradas',list.length],['Litros acumulados',`${totalLitros.toFixed(2)} L`],['Costo acumulado',money(totalCosto)],['Precio medio',money(avgPrice)+'/L'],['Distancia entre lecturas',distance?`${distance.toFixed(1)} km`:'Sin 2 lecturas comparables'],['Rendimiento observado',consumption?`${consumption.toFixed(2)} km/L`:'Pendiente'],['Costo combustible/km',costKm?money(costKm):'Pendiente']].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
  $('fuelHistory').innerHTML=list.length?list.map(r=>`<article class="item"><div class="row"><b>${String(r.fecha).slice(0,10)}</b><button class="danger fuel-delete" data-id="${r.id}">Eliminar</button></div><div class="mini-grid"><span>Odómetro <b>${Number(r.km).toLocaleString('es-CL')} km</b></span><span>Litros <b>${Number(r.litros).toFixed(2)} L</b></span><span>Precio <b>${money(r.precio)}/L</b></span><span>Total <b>${money(r.total)}</b></span></div><div class="muted">${r.lleno?'Carga de estanque':'Carga parcial'}${r.nota?` · ${r.nota}`:''}</div></article>`).join(''):'<div class="empty">Sin cargas registradas.</div>';
  document.querySelectorAll('.fuel-delete').forEach(btn=>btn.onclick=()=>{saveFuelRecords(fuelRecords().filter(r=>r.id!==btn.dataset.id));renderFuel();msg('Carga eliminada del registro S04.');});
}
function clearFuelForm(){['fuelDate','fuelKm','fuelLitros','fuelPrice','fuelTotal','fuelNote'].forEach(id=>$(id).value='');$('fuelFull').checked=false;}
function calcFuelTotal(){const l=Number(val('fuelLitros'))||0,p=Number(val('fuelUnitPrice'))||0;$('fuelTotal').value=l&&p?(l*p).toFixed(0):'';}
function saveFuel(){
  const fecha=val('fuelDate')||today(), km=Number(val('fuelKm'))||0, litros=Number(val('fuelLitros'))||0, precio=Number(val('fuelUnitPrice'))||0;
  const total=Number(val('fuelTotal'))||litros*precio;
  const ref=vehicleOdometer();
  if(!fecha||km<=0||litros<=0||precio<=0||total<=0){msg('Completa fecha, odómetro, litros y precio con valores mayores que cero.');return;}
  if(ref>0 && km<ref){msg(`El odómetro de la carga (${km}) no puede ser menor que la referencia actual del vehículo (${ref}).`);return;}
  const rec={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,fecha,km,litros,precio,total,lleno:$('fuelFull').checked,nota:val('fuelNote').trim()||null};
  const list=fuelRecords();list.push(rec);saveFuelRecords(list);clearFuelForm();renderFuel();msg('Carga de combustible registrada.');
}
function exportFuel(){const payload={version:'B20-S04-1.1',exportedAt:new Date().toISOString(),records:fuelRecords()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`b20-combustible-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
async function importFuelFile(file){try{const d=JSON.parse(await file.text());const list=Array.isArray(d.records)?d.records:[];if(!list.length)throw new Error('El archivo no contiene cargas.');for(const r of list){if(!(Number(r.km)>0&&Number(r.litros)>0&&Number(r.precio)>0))throw new Error('El archivo contiene una carga inválida.');}saveFuelRecords(list);renderFuel();msg('Historial de combustible importado.');}catch(e){msg(`No se pudo importar combustible: ${e.message}`);}}

// ===== S05: Mantenciones y componentes (persistencia local durante validación) =====
const MAINT_KEY='b20s5_maintenance_records';
const COMP_KEY='b20s5_component_records';
function jsonList(key){try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[];}catch{return [];}}
function putList(key,list){localStorage.setItem(key,JSON.stringify(list));}
function maintenanceRecords(){return jsonList(MAINT_KEY);}
function componentRecords(){return jsonList(COMP_KEY);}
function renderMaintenance(){
 const list=maintenanceRecords().sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))||Number(b.km)-Number(a.km));
 const total=list.reduce((s,r)=>s+Number(r.costo||0),0);
 const preventive=list.filter(r=>r.tipo==='preventiva').length;
 const corrective=list.filter(r=>r.tipo==='correctiva').length;
 const pending=list.filter(r=>(r.proximoKm&&Number(r.proximoKm)>0)||(r.proximaFecha)).length;
 $('maintSummary').innerHTML=[['Intervenciones',list.length],['Costo acumulado',money(total)],['Preventivas',preventive],['Correctivas',corrective],['Con próximo hito',pending]].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('maintHistory').innerHTML=list.length?list.map(r=>`<article class="item"><div class="row"><b>${String(r.fecha).slice(0,10)} · ${r.concepto||'Sin concepto'}</b><span>${r.tipo}</span></div><div class="mini-grid"><span>Km <b>${Number(r.km).toLocaleString('es-CL')}</b></span><span>Costo <b>${money(r.costo)}</b></span><span>Próx. km <b>${r.proximoKm?Number(r.proximoKm).toLocaleString('es-CL'):'—'}</b></span><span>Próx. fecha <b>${r.proximaFecha||'—'}</b></span></div><div class="muted">${r.nota||'Sin observaciones'}</div></article>`).join(''):'<div class="empty">Sin mantenciones registradas.</div>';
}
function renderComponents(){
 const list=componentRecords();
 const active=list.filter(r=>r.estado==='activo');
 const total=list.reduce((s,r)=>s+Number(r.costo||0),0);
 $('compSummary').innerHTML=[['Componentes',list.length],['Activos',active.length],['Costo acumulado',money(total)]].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('compHistory').innerHTML=list.length?list.map(r=>{const current=vehicleOdometer();const used=(current>0&&Number(r.km)>0)?Math.max(0,current-Number(r.km)):null;const remaining=(used!=null&&Number(r.vidaKm)>0)?Math.max(0,Number(r.vidaKm)-used):null;return `<article class="item"><div class="row"><b>${r.nombre}</b><span>${r.estado}</span></div><div class="mini-grid"><span>Marca <b>${r.marca||'—'}</b></span><span>Modelo <b>${r.modelo||'—'}</b></span><span>Instalación <b>${r.km?Number(r.km).toLocaleString('es-CL'):'—'} km</b></span><span>Costo <b>${money(r.costo)}</b></span></div><div class="muted">Vida estimada: ${r.vidaKm?Number(r.vidaKm).toLocaleString('es-CL')+' km':'—'} · Restante estimado: ${remaining!=null?remaining.toLocaleString('es-CL')+' km':'—'}</div></article>`}).join(''):'<div class="empty">Sin componentes registrados.</div>';
}
function clearMaintForm(){['maintDate','maintKm','maintCost','maintConcept','maintNextKm','maintNextDate','maintNote'].forEach(id=>$(id).value='');$('maintType').value='preventiva';$('maintDate').value=today();const ref=vehicleOdometer();if(ref>0)$('maintKm').value=ref;}
function saveMaint(){const rawKm=val('maintKm');const rec={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,fecha:val('maintDate')||today(),km:rawKm===''?null:Number(rawKm),tipo:val('maintType'),costo:Number(val('maintCost')||0),concepto:val('maintConcept').trim(),proximoKm:val('maintNextKm')===''?null:Number(val('maintNextKm')),proximaFecha:val('maintNextDate')||null,nota:val('maintNote').trim()||null};const ref=vehicleOdometer();if(!rec.fecha||!rec.concepto||!Number.isFinite(rec.costo)||rec.costo<0){msg('Completa fecha, concepto y costo válido de la mantención.');return;}if(rec.km!==null&&(!Number.isFinite(rec.km)||rec.km<0)){msg('El kilometraje de la mantención debe ser válido.');return;}if(ref>0&&rec.km!==null&&rec.km>ref){msg(`El km de la mantención (${rec.km}) no puede superar el odómetro actual (${ref}).`);return;}if(rec.proximoKm!==null&&(!Number.isFinite(rec.proximoKm)||rec.proximoKm<0)){msg('El próximo km debe ser válido.');return;}if(rec.proximaFecha&&rec.proximaFecha<rec.fecha){msg('La próxima fecha no puede ser anterior a la fecha de la mantención.');return;}const list=maintenanceRecords();list.push(rec);putList(MAINT_KEY,list);clearMaintForm();renderMaintenance();msg('Mantención registrada.');}
function clearCompForm(){['compName','compBrand','compModel','compDate','compKm','compCost','compLifeKm'].forEach(id=>$(id).value='');$('compDate').value=today();$('compStatus').value='activo';const ref=vehicleOdometer();if(ref>0)$('compKm').value=ref;}
function saveComp(){const rawKm=val('compKm');const rec={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,nombre:val('compName').trim(),marca:val('compBrand').trim(),modelo:val('compModel').trim(),fecha:val('compDate')||today(),km:rawKm===''?null:Number(rawKm),costo:Number(val('compCost')||0),vidaKm:Number(val('compLifeKm')||0),estado:val('compStatus')};const ref=vehicleOdometer();if(!rec.nombre||!Number.isFinite(rec.costo)||rec.costo<0){msg('Completa componente y costo válido.');return;}if(rec.km!==null&&(!Number.isFinite(rec.km)||rec.km<0)){msg('El kilometraje de instalación debe ser válido.');return;}if(ref>0&&rec.km!==null&&rec.km>ref){msg(`El km de instalación (${rec.km}) no puede superar el odómetro actual (${ref}).`);return;}if(!Number.isFinite(rec.vidaKm)||rec.vidaKm<0){msg('La vida útil estimada debe ser válida.');return;}const list=componentRecords();list.push(rec);putList(COMP_KEY,list);clearCompForm();renderComponents();msg('Componente registrado.');}
function exportList(key,version,name){const payload={version,exportedAt:new Date().toISOString(),records:jsonList(key)};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`b20-${name}-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
async function importList(file,key,renderFn,label){try{const d=JSON.parse(await file.text());const list=Array.isArray(d.records)?d.records:[];if(!list.length)throw new Error('El archivo no contiene registros.');putList(key,list);renderFn();msg(`${label} importadas correctamente.`);}catch(e){msg(`No se pudo importar: ${e.message}`);}}


// ===== S06: Documentación y vencimientos (persistencia local durante validación) =====
const DOC_KEY='b20s6_vehicle_documents';
const docs=()=>jsonList(DOC_KEY);
function saveDocs(list){localStorage.setItem(DOC_KEY,JSON.stringify(list));}
function docTypeLabel(t){return ({revision_tecnica:'Revisión técnica',permiso_circulacion:'Permiso de circulación',soap:'SOAP',seguro:'Seguro',otro:'Otro'})[t]||t;}
function daysTo(date){if(!date)return null;const a=new Date(date+'T00:00:00');const b=new Date();a.setHours(0,0,0,0);b.setHours(0,0,0,0);return Math.ceil((a-b)/86400000);}
function docState(d){const days=daysTo(d.vencimiento);if(days===null)return ['Sin vencimiento','neutral'];if(days<0)return [`Vencido hace ${Math.abs(days)} días`,'danger'];if(days<=30)return [`Vence en ${days} días`,'warn'];return [`Vigente · ${days} días`,'ok'];}
function renderDocs(){
 const list=docs().sort((a,b)=>(a.vencimiento||'9999').localeCompare(b.vencimiento||'9999'));
 const expired=list.filter(d=>daysTo(d.vencimiento)!==null&&daysTo(d.vencimiento)<0).length;
 const due=list.filter(d=>{const x=daysTo(d.vencimiento);return x!==null&&x>=0&&x<=30}).length;
 const cost=list.reduce((a,d)=>a+(Number(d.costo)||0),0);
 $('docSummary').innerHTML=[['Documentos',list.length],['Vencidos',expired],['Vencen ≤30 días',due],['Costo acumulado',money(cost)]].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('docAlerts').innerHTML=list.length?list.map(d=>{const [state,cls]=docState(d);return `<div class="row"><strong>${docTypeLabel(d.tipo)}</strong><span>${d.nombre||'Sin nombre'} · ${state}</span></div>`}).join(''):'<p class="muted">No hay documentos registrados.</p>';
 $('docHistory').innerHTML=list.length?list.map(d=>{const [state,cls]=docState(d);return `<div class="history-item"><strong>${docTypeLabel(d.tipo)}</strong> — ${d.nombre||'Sin nombre'}<br><span class="muted">Vence: ${d.vencimiento||'—'} · Costo: ${money(d.costo||0)} · ${state}</span>${d.numero?`<br><span class="muted">N°/folio: ${d.numero}</span>`:''}${d.nota?`<br><span class="muted">${d.nota}</span>`:''}<br><button class="secondary doc-delete" data-id="${d.id}">Eliminar</button></div>`}).join(''):'<p class="muted">Sin documentos registrados.</p>';
 document.querySelectorAll('.doc-delete').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar este documento del registro local?')){saveDocs(docs().filter(x=>x.id!==b.dataset.id));renderDocs();msg('Documento eliminado.');}});
}
function clearDocForm(){['docName','docIssue','docExpiry','docCost','docNumber','docNote'].forEach(id=>$(id).value='');}
function saveDoc(){const d={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,tipo:val('docType'),nombre:val('docName').trim(),emision:val('docIssue')||null,vencimiento:val('docExpiry')||null,costo:Number(val('docCost'))||0,numero:val('docNumber').trim()||null,nota:val('docNote').trim()||null};if(!d.vencimiento||d.costo<0){msg('Completa la fecha de vencimiento y un costo válido.');return;}if(d.emision&&d.vencimiento<d.emision){msg('La fecha de vencimiento no puede ser anterior a la emisión.');return;}const list=docs();list.push(d);saveDocs(list);clearDocForm();renderDocs();msg('Documento registrado.');}
function exportDocs(){const payload={version:'B20-S06-1.0',exportedAt:new Date().toISOString(),records:docs()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`b20-documentacion-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function importDocs(file){const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result);if(!Array.isArray(p.records))throw new Error();saveDocs(p.records);renderDocs();msg('Documentación importada.');}catch(e){msg('Archivo de documentación inválido.');}};r.readAsText(file);}


// ===== S07: Servicios del vehículo (persistencia local durante validación) =====
const SERVICE_KEY='b20s7_vehicle_services';
function serviceRecords(){return jsonList(SERVICE_KEY);}
function serviceLabel(t){return ({lavado:'Lavado',aspirado:'Aspirado',limpieza:'Limpieza',lubricacion:'Lubricación',detailing:'Detailing',otro:'Otro'})[t]||t;}
function renderServices(){
 const list=serviceRecords().sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))||Number(b.km||0)-Number(a.km||0));
 const total=list.reduce((s,r)=>s+Number(r.costo||0),0);
 const recurring=list.filter(r=>r.proximaFecha).length;
 const ref=vehicleOdometer();
 $('svcSummary').innerHTML=[['Servicios',list.length],['Costo acumulado',money(total)],['Con próxima fecha',recurring],['Odómetro de referencia',ref?`${ref.toLocaleString('es-CL')} km`:'No definido']].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('svcHistory').innerHTML=list.length?list.map(r=>`<article class="item"><div class="row"><b>${String(r.fecha).slice(0,10)} · ${serviceLabel(r.tipo)}</b><button class="danger svc-delete" data-id="${r.id}">Eliminar</button></div><div class="mini-grid"><span>Km <b>${r.km?Number(r.km).toLocaleString('es-CL'):'—'}</b></span><span>Costo <b>${money(r.costo)}</b></span><span>Proveedor <b>${r.proveedor||'—'}</b></span><span>Próx. fecha <b>${r.proximaFecha||'—'}</b></span></div><div class="muted">${r.nota||'Sin observaciones'}</div></article>`).join(''):'<div class="empty">Sin servicios registrados.</div>';
 document.querySelectorAll('.svc-delete').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar este servicio del registro local?')){putList(SERVICE_KEY,serviceRecords().filter(x=>x.id!==b.dataset.id));renderServices();msg('Servicio eliminado.');}});
}
function clearServiceForm(){['svcDate','svcKm','svcCost','svcProvider','svcNextDate','svcNote'].forEach(id=>$(id).value='');$('svcDate').value=today();$('svcType').value='lavado';const ref=vehicleOdometer();if(ref>0)$('svcKm').value=ref;}
function saveService(){const rawKm=val('svcKm');const d=val('svcDate')||today(),km=rawKm===''?null:Number(rawKm),costo=Number(val('svcCost')||0),next=val('svcNextDate')||null;const rec={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,fecha:d,km,costo,tipo:val('svcType'),proveedor:val('svcProvider').trim()||null,proximaFecha:next,nota:val('svcNote').trim()||null};const ref=vehicleOdometer();if(!d||!val('svcType')||!Number.isFinite(costo)||costo<0){msg('Completa fecha, tipo y costo válido.');return;}if(km!==null&&(!Number.isFinite(km)||km<0)){msg('El kilometraje debe ser válido.');return;}if(ref>0&&km!==null&&km>ref){msg(`El km del servicio (${km}) no puede superar el odómetro actual (${ref}).`);return;}if(next&&next<d){msg('La próxima fecha no puede ser anterior a la fecha del servicio.');return;}const list=serviceRecords();list.push(rec);putList(SERVICE_KEY,list);clearServiceForm();renderServices();msg('Servicio registrado correctamente.');}
function exportServices(){const payload={version:'B20-S07-1.0',exportedAt:new Date().toISOString(),records:serviceRecords()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`b20-servicios-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
async function importServices(file){try{const d=JSON.parse(await file.text());const list=Array.isArray(d.records)?d.records:[];if(!list.length)throw new Error('El archivo no contiene servicios.');for(const r of list){if(!r.fecha||!r.tipo||Number(r.costo)<0)throw new Error('El archivo contiene un servicio inválido.');}putList(SERVICE_KEY,list);renderServices();msg('Historial de servicios importado.');}catch(e){msg(`No se pudo importar servicios: ${e.message}`);}}


// ===== S08: Gastos operacionales (persistencia local durante validación) =====
const EXP_KEY='b20s8_operating_expenses';
function expenseRecords(){return jsonList(EXP_KEY);}
function expenseCategoryLabel(t){return ({peajes:'Peajes',estacionamiento:'Estacionamiento',datos_movil:'Datos / móvil',alimentacion:'Alimentación de jornada',higiene:'Higiene',herramientas:'Herramientas',administrativo:'Administrativo',otro:'Otro'})[t]||t;}
function expenseNatureLabel(t){return ({gasto_efectivo:'Gasto efectivo',costo_economico:'Costo económico',provision_futura:'Provisión futura'})[t]||t;}
function renderExpenses(){
 const list=expenseRecords().sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))||String(b.id).localeCompare(String(a.id)));
 const cash=list.filter(r=>r.naturaleza==='gasto_efectivo').reduce((s,r)=>s+Number(r.monto||0),0);
 const econ=list.filter(r=>r.naturaleza==='costo_economico').reduce((s,r)=>s+Number(r.monto||0),0);
 const prov=list.filter(r=>r.naturaleza==='provision_futura').reduce((s,r)=>s+Number(r.monto||0),0);
 const total=list.reduce((s,r)=>s+Number(r.monto||0),0);
 $('expSummary').innerHTML=[['Registros',list.length],['Gasto efectivo',money(cash)],['Costo económico',money(econ)],['Provisión futura',money(prov)],['Total registrado',money(total)]].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('expHistory').innerHTML=list.length?list.map(r=>`<article class="item"><div class="row"><b>${String(r.fecha).slice(0,10)} · ${expenseCategoryLabel(r.categoria)}</b><button class="danger exp-delete" data-id="${r.id}">Eliminar</button></div><div class="mini-grid"><span>Naturaleza <b>${expenseNatureLabel(r.naturaleza)}</b></span><span>Monto <b>${money(r.monto)}</b></span><span>Km <b>${r.km!==null&&r.km!==undefined?Number(r.km).toLocaleString('es-CL'):'—'}</b></span><span>Jornada <b>${r.jornada||'—'}</b></span></div><div><b>${r.concepto||'Sin concepto'}</b></div><div class="muted">${r.nota||'Sin observaciones'}</div></article>`).join(''):'<div class="empty">Sin gastos registrados.</div>';
 document.querySelectorAll('.exp-delete').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar este gasto del registro local?')){putList(EXP_KEY,expenseRecords().filter(x=>x.id!==b.dataset.id));renderExpenses();msg('Gasto eliminado.');}});
}
function clearExpenseForm(){['expDate','expAmount','expKm','expJourney','expConcept','expNote'].forEach(id=>$(id).value='');$('expDate').value=today();$('expCategory').value='peajes';$('expNature').value='gasto_efectivo';}
function saveExpense(){
 const fecha=val('expDate')||today(), monto=Number(val('expAmount')||0), rawKm=val('expKm'), km=rawKm===''?null:Number(rawKm), categoria=val('expCategory'), naturaleza=val('expNature'), concepto=val('expConcept').trim();
 const ref=vehicleOdometer();
 if(!fecha||!categoria||!naturaleza||!concepto||!Number.isFinite(monto)||monto<0){msg('Completa fecha, categoría, naturaleza, concepto y monto válido.');return;}
 if(km!==null&&(!Number.isFinite(km)||km<0)){msg('El kilometraje debe ser válido.');return;}
 if(ref>0&&km!==null&&km>ref){msg(`El km asociado (${km}) no puede superar el odómetro actual (${ref}).`);return;}
 const rec={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,fecha,categoria,naturaleza,monto,km,jornada:val('expJourney').trim()||null,concepto,nota:val('expNote').trim()||null};
 const list=expenseRecords();list.push(rec);putList(EXP_KEY,list);clearExpenseForm();renderExpenses();msg('Gasto registrado correctamente.');
}
function exportExpenses(){const payload={version:'B20-S08-1.0',exportedAt:new Date().toISOString(),records:expenseRecords()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`b20-gastos-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
async function importExpenses(file){try{const d=JSON.parse(await file.text());const list=Array.isArray(d.records)?d.records:[];for(const r of list){if(!r.fecha||!r.categoria||!r.naturaleza||!r.concepto||Number(r.monto)<0)throw new Error('El archivo contiene un gasto inválido.');}putList(EXP_KEY,list);renderExpenses();msg('Historial de gastos importado.');}catch(e){msg(`No se pudo importar gastos: ${e.message}`);}}

function render(){renderPlan();renderActive();renderFormIdle();renderMetrics();renderHistory();renderSettings();renderVehicle();renderFuel();renderMaintenance();renderComponents();renderDocs();renderServices();renderExpenses();}

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
loadSettingsIntoForm();loadVehicleForm();$('histMonth').value=today().slice(0,7);$('fecha').value=today();
$('saveVehicle').onclick=saveVehicle;$('resetVehicle').onclick=resetVehicle;
$('fuelLitros').addEventListener('input',calcFuelTotal);$('fuelUnitPrice').addEventListener('input',calcFuelTotal);$('saveFuel').onclick=saveFuel;$('exportFuel').onclick=exportFuel;$('importFuel').onchange=e=>{if(e.target.files[0])importFuelFile(e.target.files[0]);e.target.value='';};$('fuelDate').value=today();
$('saveMaint').onclick=saveMaint;$('exportMaint').onclick=()=>exportList(MAINT_KEY,'B20-S05-1.1','mantenciones');$('importMaint').onchange=e=>{if(e.target.files[0])importList(e.target.files[0],MAINT_KEY,renderMaintenance,'Mantenciones');e.target.value='';};$('maintDate').value=today();

$('saveDoc').onclick=saveDoc;$('exportDocs').onclick=exportDocs;$('importDocs').onchange=e=>{if(e.target.files[0])importDocs(e.target.files[0]);e.target.value='';};
$('saveSvc').onclick=saveService;
$('saveExp').onclick=saveExpense;$('exportExp').onclick=exportExpenses;$('importExp').onchange=e=>{if(e.target.files[0])importExpenses(e.target.files[0]);e.target.value='';};clearExpenseForm();$('exportSvc').onclick=exportServices;$('importSvc').onchange=e=>{if(e.target.files[0])importServices(e.target.files[0]);e.target.value='';};clearServiceForm();
$('docIssue').value=today();
$('saveComp').onclick=saveComp;$('exportComp').onclick=()=>exportList(COMP_KEY,'B20-S05-1.1','componentes');$('importComp').onchange=e=>{if(e.target.files[0])importList(e.target.files[0],COMP_KEY,renderComponents,'Componentes');e.target.value='';};$('compDate').value=today();
for(const id of ['meta','horasPlan','kmInicio'])$(id).addEventListener('input',renderPlan);
(function boot(){const u=localStorage.getItem('b20s2_url'),k=localStorage.getItem('b20s2_key');if(u&&k){$('url').value=u;$('key').value=k;$('connect').click();}})();
