'use strict';

const S16_KEYS={
  income:'b20s11_income_records',
  expenses:'b20s8_operating_expenses',
  credits:'b20s10_credit_movements',
  actions:'b20s15_action_items'
};

const j16=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const n16=v=>Number(v||0);
const money16=v=>'$'+Math.round(n16(v)).toLocaleString('es-CL');
const date16=v=>String(v||'').slice(0,10);
const esc16=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function ensure16(){
  if(document.getElementById('cierre'))return;
  const nav=document.querySelector('nav');
  if(nav){
    const b=document.createElement('button');
    b.dataset.tab='cierre';b.textContent='Cierre diario';nav.appendChild(b);b.onclick=show16;
  }
  const app=document.getElementById('app');if(!app)return;
  const s=document.createElement('section');s.id='cierre';s.className='tab';s.hidden=true;
  s.innerHTML=`
    <div class="card">
      <h2>Cierre diario</h2>
      <p>Resumen operativo del día a partir de los registros disponibles en B20.</p>
      <label>Fecha <input id="s16Date" type="date"></label>
      <button id="s16Refresh" type="button">Actualizar cierre</button>
    </div>
    <div id="s16Kpis" class="metric-grid"></div>
    <div class="card"><h2>Resultado del día</h2><div id="s16Result"></div></div>
    <div class="card"><h2>Compromisos y acciones</h2><div id="s16Commitments"></div></div>
    <div class="card"><h2>Lectura del cierre</h2><div id="s16Reading" class="plan"></div></div>
  `;
  app.appendChild(s);
  document.getElementById('s16Date').onchange=render16;
  document.getElementById('s16Refresh').onclick=render16;
}

function badge16(){
  const b=document.getElementById('appBadge'),l=document.getElementById('appLayer'),f=document.getElementById('footerLabel');
  if(b)b.textContent='B20 · S16';
  if(l)l.textContent='Capa 16 · cierre diario';
  if(f)f.textContent='B20 · Sprint S16 · cierre diario · v1.0';
}

function show16(){
  ensure16();
  document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!=='cierre');
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab==='cierre'));
  badge16();render16();
}

function render16(){
  ensure16();badge16();
  const input=document.getElementById('s16Date');
  input.value=input.value||new Date().toISOString().slice(0,10);
  const selected=input.value;

  const income=j16(S16_KEYS.income).filter(x=>date16(x.fecha)===selected);
  const expenses=j16(S16_KEYS.expenses).filter(x=>date16(x.fecha)===selected);
  const actions=j16(S16_KEYS.actions);
  const incomeTotal=income.reduce((s,x)=>s+n16(x.monto),0);
  const expenseTotal=expenses.reduce((s,x)=>s+n16(x.monto),0);
  const net=incomeTotal-expenseTotal;

  const credits=j16(S16_KEYS.credits);
  const creditMap=new Map();
  credits.forEach(r=>{
    const ref=r.creditRef||r.id;
    if(!creditMap.has(ref))creditMap.set(ref,{original:0,recovered:0,concepto:r.concepto||'Crédito'});
    const c=creditMap.get(ref);
    if(r.tipo==='credito')c.original+=n16(r.monto);else c.recovered+=n16(r.monto);
  });
  const outstanding=[...creditMap.values()].reduce((s,c)=>s+Math.max(0,c.original-c.recovered),0);
  const pendingActions=actions.filter(x=>x.estado!=='resuelto').length;

  document.getElementById('s16Kpis').innerHTML=[
    ['Ingresos del día',money16(incomeTotal)],
    ['Gastos del día',money16(expenseTotal)],
    ['Resultado del día',money16(net)],
    ['Crédito pendiente',money16(outstanding)],
    ['Acciones pendientes',pendingActions]
  ].map(x=>`<div class="card"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');

  document.getElementById('s16Result').innerHTML=`
    <table><thead><tr><th>Indicador</th><th>Resultado</th></tr></thead><tbody>
      <tr><td>Ingresos registrados</td><td>${money16(incomeTotal)}</td></tr>
      <tr><td>Gastos registrados</td><td>${money16(expenseTotal)}</td></tr>
      <tr><td>Resultado neto del día</td><td>${money16(net)}</td></tr>
      <tr><td>Movimientos de ingreso</td><td>${income.length}</td></tr>
      <tr><td>Movimientos de gasto</td><td>${expenses.length}</td></tr>
    </tbody></table>`;

  document.getElementById('s16Commitments').innerHTML=`
    <div class="mini-grid">
      <div><strong>${pendingActions}</strong><span>acciones pendientes</span></div>
      <div><strong>${money16(outstanding)}</strong><span>crédito pendiente</span></div>
    </div>`;

  let reading='No existen movimientos registrados para esta fecha.';
  if(incomeTotal||expenseTotal){
    reading=`El día registra ${money16(incomeTotal)} de ingresos y ${money16(expenseTotal)} de gastos, con un resultado neto de ${money16(net)}.`;
  }
  document.getElementById('s16Reading').innerHTML=`<strong>Cierre S16</strong><p>Fecha: ${esc16(selected)}</p><p>${reading}</p><p>S16 consolida información local y no modifica los registros de S01-S15.</p>`;
}

document.addEventListener('DOMContentLoaded',()=>{ensure16();render16()});
