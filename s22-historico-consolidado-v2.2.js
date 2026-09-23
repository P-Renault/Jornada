/* B20 · S22 · Histórico consolidado v2.2
   Panel de planificación operacional.
   Usa el combustible histórico informado por el usuario (~$2.200.000)
   sin alterar los consolidados almacenados.
*/
(function(){
'use strict';

const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
const num=v=>Math.max(0,Number(String(v??'').replace(/\./g,'').replace(',','.'))||0);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let rows=[];

function injectStyles(){
 if(document.getElementById('s22v22Styles'))return;
 const st=document.createElement('style');st.id='s22v22Styles';
 st.textContent=`
 #historico.s22-fullscreen{width:100%;max-width:none;margin:0;padding:0}
 #historico.s22-fullscreen>.card{width:100%}
 .s22-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
 .s22-kpi{border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:13px}
 .s22-kpi span{display:block;color:#64748b;font-size:12px}.s22-kpi strong{display:block;font-size:20px;margin-top:4px}
 .s22-plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
 .s22-plan-box{border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:14px}
 .s22-plan-box span{display:block;color:#64748b;font-size:12px}.s22-plan-box strong{display:block;font-size:20px;margin-top:4px}
 .s22-scenario{border:1px solid #e2e8f0;border-radius:14px;padding:14px;background:#fff}
 .s22-scenario h3{margin:0 0 8px}.s22-scenario table{font-size:13px}
 .s22-note{border:1px solid #f59e0b;border-radius:12px;background:#fffbeb;padding:12px;margin-top:12px}
 .s22-good{border:1px solid #86efac;border-radius:12px;background:#f0fdf4;padding:12px;margin-top:12px}
 @media(max-width:850px){.s22-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.s22-plan-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:430px){.s22-kpis,.s22-plan-grid{grid-template-columns:1fr}}
 `;
 document.head.appendChild(st);
}

function addNav(){
 const nav=document.querySelector('nav');if(!nav||nav.querySelector('[data-tab="historico"]'))return;
 const b=document.createElement('button');b.dataset.tab='historico';b.textContent='Histórico';
 nav.insertBefore(b,nav.querySelector('[data-tab="historial"]')||null);b.onclick=show;
}

function build(){
 if(document.getElementById('historico'))return;
 injectStyles();addNav();
 const app=document.getElementById('app');if(!app)return;
 const s=document.createElement('section');s.id='historico';s.className='tab s22-fullscreen';s.hidden=true;
 s.innerHTML=`
 <div class="card">
  <h2>Histórico operacional consolidado</h2>
  <p class="muted">Registra totales históricos de Uber, InDrive u otra aplicación por período. No crea ni reconstruye jornadas antiguas.</p>
  <div class="grid">
   <label>Desde<input id="hDesde" type="date"></label><label>Hasta<input id="hHasta" type="date"></label>
   <label>Aplicación<select id="hFuente"><option>Uber</option><option>InDrive</option><option>Otra</option></select></label>
   <label>Ingreso bruto total ($)<input id="hBruto" type="number" min="0"></label>
   <label>Comisión total ($)<input id="hComision" type="number" min="0"></label>
   <label>Ganancia neta total ($)<input id="hNeto" type="number" min="0" placeholder="Vacío = bruto - comisión - combustible - mantenimiento"></label>
   <label>Viajes totales<input id="hViajes" type="number" min="0"></label><label>Kilómetros totales<input id="hKm" type="number" min="0" step="0.1"></label>
   <label>Horas totales<input id="hHoras" type="number" min="0" step="0.01"></label><label>Combustible total ($)<input id="hFuel" type="number" min="0"></label>
   <label>Mantenimiento total ($)<input id="hMaint" type="number" min="0"></label>
  </div>
  <label>Notas<input id="hNotas" maxlength="300" placeholder="Ej.: consolidado Uber/InDrive según historial de la aplicación"></label>
  <div class="row"><button id="hSave">Guardar consolidado</button><label class="file-button secondary">Importar CSV<input id="hCsv" type="file" accept=".csv,text/csv" hidden></label><button id="hExport" class="secondary">Exportar CSV</button></div>
  <div id="hStatus" class="muted"></div>
 </div>

 <div class="card">
  <h2>Panel de planificación operacional</h2>
  <p class="muted">Convierte una meta neta en bruto requerido, comisión, combustible, resultado, kilómetros y viajes. Las horas se incorporan cuando exista historial horario real.</p>
  <div class="grid">
   <label>Meta neta de la jornada ($)<input id="s22Target" type="number" min="0" value="60000"></label>
   <label>Combustible histórico de referencia ($)<input id="s22FuelHist" type="number" min="0" value="2200000"></label>
   <label>Horas actuales estimadas<input id="s22Hours" type="number" min="0" step="0.1" placeholder="Ej.: 8"></label>
  </div>
  <div id="s22Plan"></div>
 </div>

 <div class="card"><h2>Lectura de rendimiento histórico</h2><div id="s22Quality"></div></div>
 <div class="card"><h2>Importación masiva</h2><p class="muted">Una fila por consolidado. Columnas: periodo_desde,periodo_hasta,fuente,ingreso_bruto,comision_app,ingreso_neto,km_recorridos,horas_trabajadas,viajes,combustible,mantenimiento,notas</p><div id="hPreview"></div></div>
 <div class="card"><h2>Resumen histórico acumulado</h2><div id="hSummary" class="metric-grid"></div><div id="hIndicators"></div></div>
 <div class="card"><h2>Consolidados registrados</h2><div id="hTable"></div></div>`;
 app.appendChild(s);
 hSave.onclick=saveOne;hCsv.onchange=e=>{if(e.target.files?.[0])importCsv(e.target.files[0])};hExport.onclick=exportCsv;
 const today=new Date().toISOString().slice(0,10);hDesde.value=today;hHasta.value=today;
 s22Target.oninput=renderAll;s22FuelHist.oninput=renderAll;s22Hours.oninput=renderAll;
}

function show(){
 build();document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!=='historico');
 document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab==='historico'));
 const b=appBadge,l=appLayer,f=footerLabel;if(b)b.textContent='B20 · S22';if(l)l.textContent='Capa 22 · histórico consolidado';if(f)f.textContent='B20 · Sprint S22 · planificación operacional · v2.2';
 load();
}
async function client(){if(window.B20_AUTH_READY)await window.B20_AUTH_READY;const c=window.B20_AUTH?.client,u=window.B20_AUTH?.user;if(!c||!u)throw new Error('Sesión B20 no disponible.');return c}
function status(t,k=''){if(hStatus){hStatus.textContent=t;hStatus.className='muted '+k}}
function payload(){const gross=num(hBruto.value),comm=num(hComision.value),fuel=num(hFuel.value),maint=num(hMaint.value),ni=hNeto.value;return{periodo_desde:hDesde.value,periodo_hasta:hHasta.value,fuente:hFuente.value,ingreso_bruto:gross,comision_app:comm,ingreso_neto:ni===''?Math.max(0,gross-comm-fuel-maint):num(ni),km_recorridos:num(hKm.value),horas_trabajadas:num(hHoras.value),viajes:Math.round(num(hViajes.value)),combustible:fuel,mantenimiento:maint,notas:hNotas.value||null}}
async function saveOne(){try{const p=payload();if(!p.periodo_desde||!p.periodo_hasta)throw new Error('Debes indicar el período.');if(p.periodo_hasta<p.periodo_desde)throw new Error('Hasta no puede ser anterior a Desde.');const c=await client(),u=window.B20_AUTH.user,r=await c.from('b20_historico_operacional').insert({...p,user_id:u.id});if(r.error)throw r.error;status('Consolidado histórico guardado.','ok');await load()}catch(e){status(e.message||String(e),'error')}}
function parseCsv(text){const lines=text.replace(/\r/g,'').split('\n').filter(x=>x.trim());if(!lines.length)return[];const parse=line=>{const a=[];let c='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'&&line[i+1]==='"'){c+='"';i++;continue}if(ch==='"'){q=!q;continue}if(ch===','&&!q){a.push(c.trim());c='';continue}c+=ch}a.push(c.trim());return a};const h=parse(lines[0]).map(x=>x.toLowerCase());return lines.slice(1).map(line=>{const v=parse(line),o={};h.forEach((k,i)=>o[k]=v[i]??'');const gross=num(o.ingreso_bruto),comm=num(o.comision_app),fuel=num(o.combustible),maint=num(o.mantenimiento);return{periodo_desde:o.periodo_desde,periodo_hasta:o.periodo_hasta,fuente:o.fuente||'Uber',ingreso_bruto:gross,comision_app:comm,ingreso_neto:o.ingreso_neto===''?Math.max(0,gross-comm-fuel-maint):num(o.ingreso_neto),km_recorridos:num(o.km_recorridos),horas_trabajadas:num(o.horas_trabajadas),viajes:Math.round(num(o.viajes)),combustible:fuel,mantenimiento:maint,notas:o.notas||null}}).filter(x=>x.periodo_desde&&x.periodo_hasta&&x.periodo_hasta>=x.periodo_desde)}
async function importCsv(file){try{const data=parseCsv(await file.text());if(!data.length)throw new Error('El CSV no contiene consolidados válidos.');hPreview.innerHTML=`<p><b>${data.length}</b> consolidados listos.</p><button id="hConfirm">Confirmar importación</button>`;hConfirm.onclick=async()=>{try{const c=await client(),u=window.B20_AUTH.user,r=await c.from('b20_historico_operacional').insert(data.map(x=>({...x,user_id:u.id})));if(r.error)throw r.error;status(`${data.length} consolidados importados.`,'ok');hPreview.innerHTML='';await load()}catch(e){status(e.message||String(e),'error')}}}catch(e){status(e.message||String(e),'error')}}
async function load(){try{build();const c=await client(),r=await c.from('b20_historico_operacional').select('*').order('periodo_desde',{ascending:false});if(r.error)throw r.error;rows=r.data||[];renderAll()}catch(e){console.warn('[B20 S22 v2.2]',e)}}

function renderAll(){
 const gross=rows.reduce((s,x)=>s+num(x.ingreso_bruto),0),comm=rows.reduce((s,x)=>s+num(x.comision_app),0),net=rows.reduce((s,x)=>s+num(x.ingreso_neto),0),km=rows.reduce((s,x)=>s+num(x.km_recorridos),0),hrs=rows.reduce((s,x)=>s+num(x.horas_trabajadas),0),trips=rows.reduce((s,x)=>s+num(x.viajes),0),maint=rows.reduce((s,x)=>s+num(x.mantenimiento),0);
 const fuelHist=num(s22FuelHist?.value)||2200000;
 const netAfterFuel=net-fuelHist;
 const fuelPerKm=km?fuelHist/km:0;
 const netAfterFuelPerKm=km?netAfterFuel/km:0;
 const netAfterFuelPerTrip=trips?netAfterFuel/trips:0;
 const commPct=gross?comm/gross:0;
 const grossRequired=(target)=>commPct<1?target/(1-commPct):0;
 const target=num(s22Target?.value)||60000;
 const brutoReq=grossRequired(target);
 const commReq=brutoReq*commPct;
 const fuelReq=km?target>0?Math.max(0,brutoReq*(fuelHist/gross)):0:0;
 const resultReq=brutoReq-commReq-fuelReq;
 const kmReq=netAfterFuelPerKm>0?target/netAfterFuelPerKm:0;
 const tripsReq=netAfterFuelPerTrip>0?target/netAfterFuelPerTrip:0;
 const hours=num(s22Hours?.value);
 const hourly=hours?netAfterFuel/hours:0;
 const hoursReq=hourly>0?target/hourly:0;

 hSummary.innerHTML=[['Consolidados',rows.length],['Bruto acumulado',money(gross)],['Comisiones acumuladas',money(comm)],['Neto histórico',money(net)],['Combustible histórico',money(fuelHist)],['Resultado después combustible',money(netAfterFuel)],['Viajes acumulados',trips.toLocaleString('es-CL')],['Km acumulados',`${km.toLocaleString('es-CL',{maximumFractionDigits:1})} km`]].map(x=>`<div class="card"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');

 hIndicators.innerHTML=`<table><thead><tr><th>Indicador</th><th>Resultado</th></tr></thead><tbody>
 <tr><td>Comisión sobre bruto</td><td>${(commPct*100).toFixed(2)}%</td></tr>
 <tr><td>Combustible / km</td><td>${money(fuelPerKm)}</td></tr>
 <tr><td>Resultado después combustible / km</td><td>${money(netAfterFuelPerKm)}</td></tr>
 <tr><td>Resultado después combustible / viaje</td><td>${money(netAfterFuelPerTrip)}</td></tr>
 <tr><td>Bruto / km</td><td>${km?money(gross/km):'Sin datos'}</td></tr>
 <tr><td>Horas históricas registradas</td><td>${hrs?hrs.toLocaleString('es-CL')+' h':'No disponibles'}</td></tr>
 <tr><td>Mantenimiento histórico registrado</td><td>${money(maint)}</td></tr>
 </tbody></table>`;

 const s22Plan=document.getElementById('s22Plan');
 if(s22Plan)s22Plan.innerHTML=`
 <div class="s22-kpis">
  <div class="s22-kpi"><span>Meta neta</span><strong>${money(target)}</strong></div>
  <div class="s22-kpi"><span>Bruto requerido</span><strong>${money(brutoReq)}</strong></div>
  <div class="s22-kpi"><span>Comisión estimada</span><strong>${money(commReq)}</strong></div>
  <div class="s22-kpi"><span>Combustible estimado</span><strong>${money(fuelReq)}</strong></div>
 </div>
 <div class="s22-plan-grid" style="margin-top:12px">
  <div class="s22-plan-box"><span>Resultado después combustible</span><strong>${money(resultReq)}</strong></div>
  <div class="s22-plan-box"><span>Km objetivo</span><strong>${kmReq.toFixed(0)} km</strong></div>
  <div class="s22-plan-box"><span>Viajes objetivo</span><strong>${tripsReq.toFixed(0)}</strong></div>
  <div class="s22-plan-box"><span>Resultado histórico / km</span><strong>${money(netAfterFuelPerKm)}</strong></div>
  <div class="s22-plan-box"><span>Resultado histórico / viaje</span><strong>${money(netAfterFuelPerTrip)}</strong></div>
  <div class="s22-plan-box"><span>Horas requeridas</span><strong>${hoursReq?hoursReq.toFixed(1)+' h':'Esperando horas reales'}</strong></div>
 </div>
 <div class="s22-note"><strong>Lectura:</strong> la planificación ya descuenta comisión y el combustible histórico de referencia de ${money(fuelHist)}. El mantenimiento aún debe incorporarse con datos reales para obtener un resultado final de explotación.</div>`;

 const q=document.getElementById('s22Quality');
 if(q)q.innerHTML=`
 <div class="${hrs?'s22-good':'s22-note'}"><strong>Horas:</strong> ${hrs?'hay horas históricas registradas.':'el histórico está en 0 h; por ahora la planificación se basa en km y viajes, no en productividad horaria.'}</div>
 <div class="${fuelHist?'s22-good':'s22-note'}"><strong>Combustible:</strong> se incorporan ${money(fuelHist)} como costo histórico de referencia.</div>
 <div class="${maint?'s22-good':'s22-note'}"><strong>Mantenimiento:</strong> ${maint?money(maint)+' registrados.':'todavía $0 registrado; falta este costo para cerrar la rentabilidad real.'}</div>`;

 hTable.innerHTML=rows.length?`<div style="overflow:auto"><table><thead><tr><th>Período</th><th>App</th><th>Bruto</th><th>Comisión</th><th>Neto</th><th>Viajes</th><th>Km</th><th>Horas</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.periodo_desde)} → ${esc(x.periodo_hasta)}</td><td>${esc(x.fuente)}</td><td>${money(x.ingreso_bruto)}</td><td>${money(x.comision_app)}</td><td>${money(x.ingreso_neto)}</td><td>${Number(x.viajes||0).toLocaleString('es-CL')}</td><td>${num(x.km_recorridos).toLocaleString('es-CL',{maximumFractionDigits:1})}</td><td>${num(x.horas_trabajadas).toLocaleString('es-CL',{maximumFractionDigits:2})}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Sin consolidados históricos.</div>';
}

function exportCsv(){const head='periodo_desde,periodo_hasta,fuente,ingreso_bruto,comision_app,ingreso_neto,km_recorridos,horas_trabajadas,viajes,combustible,mantenimiento,notas';const lines=rows.map(x=>[x.periodo_desde,x.periodo_hasta,x.fuente,x.ingreso_bruto,x.comision_app,x.ingreso_neto,x.km_recorridos,x.horas_trabajadas,x.viajes,x.combustible,x.mantenimiento,`"${String(x.notas||'').replaceAll('"','""')}"`].join(','));const blob=new Blob([[head,...lines].join('\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='b20-historico-consolidado.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{build();load()},{once:true});else{build();load()}
window.addEventListener('b20:synced',load);
})();