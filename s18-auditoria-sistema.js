'use strict';

const S18_LAYERS=[
  ['S05','Mantenciones','b20s5_maintenance_records'],
  ['S05','Componentes','b20s5_component_records'],
  ['S06','Documentación','b20s6_document_records'],
  ['S07','Servicios','b20s7_service_records'],
  ['S08','Gastos','b20s8_operating_expenses'],
  ['S09','Fondo','b20s9_fund_movements'],
  ['S09','Necesidades futuras','b20s9_future_needs'],
  ['S10','Créditos','b20s10_credit_movements'],
  ['S11','Presupuesto','b20s11_budget_lines'],
  ['S11','Ingresos','b20s11_income_records'],
  ['S11','Meta de ingreso','b20s11_income_goal'],
  ['S15','Acciones','b20s15_action_items']
];

const j18=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
const esc18=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function ensure18(){
  if(document.getElementById('auditoria'))return;
  const nav=document.querySelector('nav');
  if(nav){const b=document.createElement('button');b.dataset.tab='auditoria';b.textContent='Auditoría';nav.appendChild(b);b.onclick=show18;}
  const app=document.getElementById('app');if(!app)return;
  const s=document.createElement('section');s.id='auditoria';s.className='tab';s.hidden=true;
  s.innerHTML=`
    <div class="card"><h2>Auditoría y salud del sistema</h2>
      <p>Verificación de presencia, formato y estado de los datos locales de B20.</p>
      <button id="s18Run" type="button">Ejecutar auditoría</button>
    </div>
    <div id="s18Summary" class="metric-grid"></div>
    <div class="card"><h2>Resultado por capa</h2><div id="s18Results"></div></div>
    <div class="card"><h2>Observaciones</h2><div id="s18Notes"></div></div>
    <div class="card"><h2>Diagnóstico</h2><div id="s18Diag" class="plan"></div></div>`;
  app.appendChild(s);
  document.getElementById('s18Run').onclick=render18;
}
function badge18(){
  const b=document.getElementById('appBadge'),l=document.getElementById('appLayer'),f=document.getElementById('footerLabel');
  if(b)b.textContent='B20 · S18';
  if(l)l.textContent='Capa 18 · auditoría y salud del sistema';
  if(f)f.textContent='B20 · Sprint S18 · auditoría y salud del sistema · v1.0';
}
function audit18(){
  return S18_LAYERS.map(([s,name,key])=>{
    const raw=localStorage.getItem(key);
    if(raw===null)return {s,name,key,status:'ausente',detail:'No existe la clave local.'};
    const parsed=j18(key);
    if(parsed===null)return {s,name,key,status:'inválido',detail:'Existe la clave, pero el contenido no es JSON válido.'};
    if(Array.isArray(parsed))return {s,name,key,status:'ok',detail:`${parsed.length} registro(s).`};
    if(typeof parsed==='object')return {s,name,key,status:'ok',detail:'1 valor/objeto.'};
    // S11 income goal is intentionally stored as a scalar in the current build.
    if(key==='b20s11_income_goal' && (typeof parsed==='number' || (typeof parsed==='string' && parsed.trim()!=='' && Number.isFinite(Number(parsed)))))
      return {s,name,key,status:'ok',detail:`Meta escalar: ${Number(parsed).toLocaleString('es-CL')}.`};
    return {s,name,key,status:'revisar',detail:'Tipo de dato no esperado.'};
  });
}
function render18(){
  ensure18();badge18();
  const rows=audit18();
  const ok=rows.filter(x=>x.status==='ok').length;
  const absent=rows.filter(x=>x.status==='ausente').length;
  const invalid=rows.filter(x=>x.status==='inválido').length;
  const review=rows.filter(x=>x.status==='revisar').length;
  document.getElementById('s18Summary').innerHTML=[
    ['Elementos auditados',rows.length],['Correctos',ok],['Ausentes',absent],['Inválidos',invalid],['Revisar',review]
  ].map(x=>`<div class="card"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  const label={ok:'OK',ausente:'Ausente',inválido:'Inválido',revisar:'Revisar'};
  document.getElementById('s18Results').innerHTML=`<div style="overflow:auto"><table><thead><tr><th>Capa</th><th>Módulo</th><th>Clave</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc18(r.s)}</td><td>${esc18(r.name)}</td><td>${esc18(r.key)}</td><td>${label[r.status]}</td><td>${esc18(r.detail)}</td></tr>`).join('')}</tbody></table></div>`;
  const notes=[];
  if(absent)notes.push(`${absent} elemento(s) no tienen datos locales; esto puede ser normal si todavía no se han utilizado.`);
  if(invalid)notes.push(`${invalid} elemento(s) requieren revisión por formato JSON inválido.`);
  if(review)notes.push(`${review} elemento(s) tienen un tipo de dato distinto del esperado.`);
  if(!notes.length)notes.push('No se detectaron inconsistencias básicas en los datos locales auditados.');
  document.getElementById('s18Notes').innerHTML=`<ul>${notes.map(x=>`<li>${esc18(x)}</li>`).join('')}</ul>`;
  document.getElementById('s18Diag').innerHTML=`<strong>Diagnóstico S18</strong><p>La auditoría es de solo lectura y revisa ${rows.length} conjuntos de datos locales.</p><p>No modifica S01-S17, no toca Supabase y no requiere SQL.</p>`;
}
function show18(){
  ensure18();
  document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!=='auditoria');
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab==='auditoria'));
  badge18();render18();
}
document.addEventListener('DOMContentLoaded',()=>{ensure18();render18()});
