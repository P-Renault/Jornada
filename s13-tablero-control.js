'use strict';

const S13_S11_BUDGET='b20s11_budget_lines';
const S13_S11_INCOME='b20s11_income_records';
const S13_S11_GOAL='b20s11_income_goal';
const S13_S10_CREDIT='b20s10_credit_movements';
const S13_S08_EXPENSE='b20s8_operating_expenses';

const n13=v=>Number(v||0);
const money13=v=>'$'+Math.round(n13(v)).toLocaleString('es-CL');
const json13=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return[]}};
const month13=()=>document.getElementById('s13Month')?.value||new Date().toISOString().slice(0,7);
const monthDate13=d=>String(d||'').slice(0,7);

function ensure13(){
  if(document.getElementById('tablero'))return;
  const nav=document.querySelector('nav');
  if(nav){
    const b=document.createElement('button');
    b.dataset.tab='tablero';b.textContent='Tablero';nav.appendChild(b);
    b.onclick=()=>show13();
  }
  const app=document.getElementById('app');
  if(!app)return;
  const s=document.createElement('section');
  s.id='tablero';s.className='tab';s.hidden=true;
  s.innerHTML=`
    <div class="card">
      <h2>Tablero de control</h2>
      <p>Consolidación mensual de meta, ingresos, gastos, presupuesto y compromisos.</p>
      <label>Mes <input id="s13Month" type="month"></label>
    </div>
    <div id="s13Kpis" class="metric-grid"></div>
    <div class="card"><h2>Control de cumplimiento</h2><div id="s13Progress"></div></div>
    <div class="card"><h2>Resultado mensual</h2><div id="s13Result"></div></div>
    <div class="card"><h2>Compromisos pendientes</h2><div id="s13Credits"></div></div>
    <div class="card"><h2>Lectura del período</h2><div id="s13Reading" class="plan"></div></div>
  `;
  app.appendChild(s);
  document.getElementById('s13Month').onchange=render13;
}

function badge13(){
  const b=document.getElementById('appBadge'),l=document.getElementById('appLayer'),f=document.getElementById('footerLabel');
  if(b)b.textContent='B20 · S13';
  if(l)l.textContent='Capa 13 · tablero de control';
  if(f)f.textContent='B20 · Sprint S13 · tablero de control · v1.0';
}

function show13(){
  ensure13();
  document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!=='tablero');
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab==='tablero'));
  badge13();render13();
}

function render13(){
  ensure13();badge13();
  const month=document.getElementById('s13Month');
  month.value=month.value||new Date().toISOString().slice(0,7);

  const budget=json13(S13_S11_BUDGET).filter(x=>x.mes===month13());
  const income=json13(S13_S11_INCOME).filter(x=>monthDate13(x.fecha)===month13());
  const expenses=json13(S13_S08_EXPENSE).filter(x=>monthDate13(x.fecha)===month13());
  const credits=json13(S13_S10_CREDIT);

  const goal=n13(localStorage.getItem(S13_S11_GOAL));
  const incomeTotal=income.reduce((s,x)=>s+n13(x.monto),0);
  const budgetTotal=budget.reduce((s,x)=>s+n13(x.plan),0);
  const expenseTotal=expenses.reduce((s,x)=>s+n13(x.monto),0);

  const creditMap=new Map();
  credits.forEach(x=>{
    const ref=x.creditRef||x.id;
    if(!creditMap.has(ref))creditMap.set(ref,{ref,original:0,recovered:0,concepto:x.concepto||'Crédito personal'});
    const c=creditMap.get(ref);
    if(x.tipo==='credito')c.original+=n13(x.monto);
    else c.recovered+=n13(x.monto);
    if(x.concepto)c.concepto=x.concepto;
  });
  const outstanding=[...creditMap.values()].map(x=>({...x,saldo:Math.max(0,x.original-x.recovered)})).filter(x=>x.saldo>0);
  const outstandingTotal=outstanding.reduce((s,x)=>s+x.saldo,0);

  const progress=goal>0?Math.min(100,(incomeTotal/goal)*100):0;
  const balance=incomeTotal-expenseTotal;
  const budgetVariance=budgetTotal-expenseTotal;

  document.getElementById('s13Kpis').innerHTML=[
    ['Meta mensual',money13(goal)],
    ['Ingreso registrado',money13(incomeTotal)],
    ['Gasto real S08',money13(expenseTotal)],
    ['Saldo del período',money13(balance)],
    ['Presupuesto planificado',money13(budgetTotal)],
    ['Crédito pendiente',money13(outstandingTotal)]
  ].map(x=>`<div class="card"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');

  document.getElementById('s13Progress').innerHTML=`
    <div><strong>${progress.toFixed(1)}%</strong> de cumplimiento de la meta.</div>
    <div>Faltan <strong>${money13(Math.max(0,goal-incomeTotal))}</strong> para alcanzar la meta mensual.</div>
  `;

  document.getElementById('s13Result').innerHTML=`
    <table><thead><tr><th>Indicador</th><th>Resultado</th></tr></thead><tbody>
      <tr><td>Ingresos</td><td>${money13(incomeTotal)}</td></tr>
      <tr><td>Gastos S08</td><td>${money13(expenseTotal)}</td></tr>
      <tr><td>Saldo del período</td><td>${money13(balance)}</td></tr>
      <tr><td>Presupuesto disponible</td><td>${money13(budgetVariance)}</td></tr>
      <tr><td>Créditos pendientes</td><td>${money13(outstandingTotal)}</td></tr>
    </tbody></table>
  `;

  document.getElementById('s13Credits').innerHTML=outstanding.length
    ? `<table><thead><tr><th>Concepto</th><th>Original</th><th>Recuperado</th><th>Pendiente</th></tr></thead><tbody>${outstanding.map(x=>`<tr><td>${x.concepto}</td><td>${money13(x.original)}</td><td>${money13(x.recovered)}</td><td>${money13(x.saldo)}</td></tr>`).join('')}</tbody></table>`
    : '<p>No hay compromisos de crédito pendientes registrados en S10.</p>';

  let reading='No existe una meta mensual configurada en S11.';
  if(goal>0){
    if(incomeTotal>=goal)reading=`La meta mensual está cubierta con ${money13(incomeTotal)} registrados frente a ${money13(goal)} de objetivo.`;
    else reading=`El período registra ${money13(incomeTotal)} frente a una meta de ${money13(goal)}; la brecha actual es ${money13(goal-incomeTotal)}.`;
  }
  document.getElementById('s13Reading').innerHTML=`<strong>Lectura S13</strong><p>${reading}</p><p>Este tablero consolida información local de S08, S10 y S11. No modifica esos módulos.</p>`;
}

document.addEventListener('DOMContentLoaded',()=>{ensure13();render13()});
