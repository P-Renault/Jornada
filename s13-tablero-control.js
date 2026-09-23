/* B20 · S13 · Tablero de control 1.2
   Corrección: los ingresos operacionales provienen de jornadas_trabajo en Supabase.
   Se separan Bruto, Comisión app y Neto real.
   Presupuesto/gastos/créditos continúan leyendo sus módulos correspondientes.
*/
'use strict';

const S13_S11_BUDGET='b20s11_budget_lines';
const S13_S11_GOAL='b20s11_income_goal';
const S13_S10_CREDIT='b20s10_credit_movements';
const S13_S08_EXPENSE='b20s8_operating_expenses';

const n13=v=>Number(v||0);
const money13=v=>'$'+Math.round(n13(v)).toLocaleString('es-CL');
const json13=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return[]}};
const monthDate13=d=>String(d||'').slice(0,7);
const closed13=r=>String(r.estado||'').toLowerCase()==='cerrada'||(r.hora_fin&&r.km_final!=null&&r.ganancia_neta!=null);

let rows13=[];

function month13(){
  return document.getElementById('s13Month')?.value||new Date().toISOString().slice(0,7);
}

function ensure13(){
  if(document.getElementById('tablero'))return;

  const nav=document.querySelector('nav');
  if(nav){
    const b=document.createElement('button');
    b.dataset.tab='tablero';
    b.textContent='Tablero';
    nav.appendChild(b);
    b.onclick=()=>show13();
  }

  const app=document.getElementById('app');
  if(!app)return;

  const s=document.createElement('section');
  s.id='tablero';
  s.className='tab';
  s.hidden=true;
  s.innerHTML=`
    <div class="card">
      <h2>Tablero de control</h2>
      <p>Consolidación mensual de jornadas reales, meta, gastos, presupuesto y compromisos.</p>
      <label>Mes <input id="s13Month" type="month"></label>
    </div>

    <div id="s13Kpis" class="metric-grid"></div>

    <div class="card">
      <h2>Ingresos de jornadas</h2>
      <div id="s13IncomeDetail"></div>
    </div>

    <div class="card">
      <h2>Control de cumplimiento</h2>
      <div id="s13Progress"></div>
    </div>

    <div class="card">
      <h2>Descomposición del resultado operacional</h2>
      <div id="s13CostBreakdown"></div>
    </div>

    <div class="card">
      <h2>Resultado mensual</h2>
      <div id="s13Result"></div>
    </div>

    <div class="card">
      <h2>Compromisos pendientes</h2>
      <div id="s13Credits"></div>
    </div>

    <div class="card">
      <h2>Lectura del período</h2>
      <div id="s13Reading" class="plan"></div>
    </div>
  `;

  app.appendChild(s);
  document.getElementById('s13Month').onchange=render13;
}

function badge13(){
  const b=document.getElementById('appBadge');
  const l=document.getElementById('appLayer');
  const f=document.getElementById('footerLabel');
  if(b)b.textContent='B20 · S13';
  if(l)l.textContent='Capa 13 · tablero de control';
  if(f)f.textContent='B20 · Sprint S13 · tablero de control · v1.2';
}

function show13(){
  ensure13();
  document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!=='tablero');
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab==='tablero'));
  badge13();
  render13();
}

function render13(){
  ensure13();
  badge13();

  const month=document.getElementById('s13Month');
  if(!month)return;
  month.value=month.value||new Date().toISOString().slice(0,7);

  const budget=json13(S13_S11_BUDGET).filter(x=>x.mes===month13());
  const expenses=json13(S13_S08_EXPENSE).filter(x=>monthDate13(x.fecha)===month13());
  const credits=json13(S13_S10_CREDIT);

  /* Fuente operacional: jornadas reales almacenadas en Supabase. */
  const incomeRows=rows13.filter(r=>closed13(r)&&monthDate13(r.fecha)===month13());

  const goal=n13(localStorage.getItem(S13_S11_GOAL));
  const grossTotal=incomeRows.reduce((s,x)=>s+n13(x.ganancia_bruta),0);
  const commissionTotal=incomeRows.reduce((s,x)=>s+n13(x.comision_app),0);
  const netTotal=incomeRows.reduce((s,x)=>s+n13(x.ganancia_neta),0);
  const metaTotal=incomeRows.reduce((s,x)=>s+n13(x.meta_dia),0);
  const journeys=incomeRows.length;
  const fuelTotal=incomeRows.reduce((s,x)=>s+n13(x.combustible),0);
  const maintenanceTotal=incomeRows.reduce((s,x)=>s+n13(x.mantenimiento),0);
  const operationalCost=fuelTotal+maintenanceTotal+commissionTotal;
  const reconciliation=grossTotal-operationalCost;
  const netDifference=netTotal-reconciliation;

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

  const outstanding=[...creditMap.values()]
    .map(x=>({...x,saldo:Math.max(0,x.original-x.recovered)}))
    .filter(x=>x.saldo>0);

  const outstandingTotal=outstanding.reduce((s,x)=>s+x.saldo,0);
  const progress=goal>0?Math.min(100,(netTotal/goal)*100):0;
  const balance=netTotal-expenseTotal;
  const budgetVariance=budgetTotal-expenseTotal;

  document.getElementById('s13Kpis').innerHTML=[
    ['Meta mensual',money13(goal)],
    ['Neto jornadas',money13(netTotal)],
    ['Bruto jornadas',money13(grossTotal)],
    ['Comisión app',money13(commissionTotal)],
    ['Jornadas cerradas',journeys],
    ['Gasto real S08',money13(expenseTotal)],
    ['Saldo del período',money13(balance)],
    ['Presupuesto planificado',money13(budgetTotal)],
    ['Crédito pendiente',money13(outstandingTotal)]
  ].map(x=>`<div class="card"><span>${x[0]}</span><strong>${typeof x[1]==='number'?x[1]:x[1]}</strong></div>`).join('');

  document.getElementById('s13IncomeDetail').innerHTML=`
    <table>
      <thead>
        <tr><th>Indicador</th><th>Resultado</th></tr>
      </thead>
      <tbody>
        <tr><td>Jornadas cerradas</td><td>${journeys}</td></tr>
        <tr><td>Ingreso bruto</td><td>${money13(grossTotal)}</td></tr>
        <tr><td>Comisión de aplicación</td><td>${money13(commissionTotal)}</td></tr>
        <tr><td>Ingreso neto real</td><td>${money13(netTotal)}</td></tr>
        <tr><td>Metas diarias acumuladas</td><td>${money13(metaTotal)}</td></tr>
      </tbody>
    </table>
    <p class="muted">Fuente: jornadas cerradas almacenadas en Supabase. El neto de cada jornada ya considera la comisión registrada en esa jornada.</p>
  `;

  document.getElementById('s13Progress').innerHTML=`
    <div><strong>${progress.toFixed(1)}%</strong> de cumplimiento de la meta mensual.</div>
    <div>Neto real acumulado: <strong>${money13(netTotal)}</strong>.</div>
    <div>Meta mensual configurada: <strong>${money13(goal)}</strong>.</div>
    <div>Brecha: <strong>${money13(Math.max(0,goal-netTotal))}</strong>.</div>
  `;

  document.getElementById('s13CostBreakdown').innerHTML=`
    <table>
      <thead><tr><th>Componente</th><th>Resultado</th></tr></thead>
      <tbody>
        <tr><td>Ingreso bruto</td><td>${money13(grossTotal)}</td></tr>
        <tr><td>Comisión app</td><td>− ${money13(commissionTotal)}</td></tr>
        <tr><td>Combustible</td><td>− ${money13(fuelTotal)}</td></tr>
        <tr><td>Mantenimiento</td><td>− ${money13(maintenanceTotal)}</td></tr>
        <tr><td><strong>Resultado por desglose</strong></td><td><strong>${money13(reconciliation)}</strong></td></tr>
        <tr><td>Neto almacenado en jornadas</td><td>${money13(netTotal)}</td></tr>
        <tr><td>Diferencia de conciliación</td><td>${money13(netDifference)}</td></tr>
      </tbody>
    </table>
    <p class="muted">La diferencia de conciliación permite detectar costos o ajustes incluidos en el neto que no estén representados en los campos de combustible, mantenimiento y comisión.</p>
  `;

  document.getElementById('s13Result').innerHTML=`
    <table>
      <thead><tr><th>Indicador</th><th>Resultado</th></tr></thead>
      <tbody>
        <tr><td>Ingreso bruto de jornadas</td><td>${money13(grossTotal)}</td></tr>
        <tr><td>Comisión app</td><td>${money13(commissionTotal)}</td></tr>
        <tr><td>Ingreso neto de jornadas</td><td>${money13(netTotal)}</td></tr>
        <tr><td>Gastos S08</td><td>${money13(expenseTotal)}</td></tr>
        <tr><td>Saldo neto después de S08</td><td>${money13(balance)}</td></tr>
        <tr><td>Presupuesto disponible</td><td>${money13(budgetVariance)}</td></tr>
        <tr><td>Créditos pendientes</td><td>${money13(outstandingTotal)}</td></tr>
      </tbody>
    </table>
  `;

  document.getElementById('s13Credits').innerHTML=outstanding.length
    ? `<table><thead><tr><th>Concepto</th><th>Original</th><th>Recuperado</th><th>Pendiente</th></tr></thead><tbody>${outstanding.map(x=>`<tr><td>${x.concepto}</td><td>${money13(x.original)}</td><td>${money13(x.recovered)}</td><td>${money13(x.saldo)}</td></tr>`).join('')}</tbody></table>`
    : '<p>No hay compromisos de crédito pendientes registrados en S10.</p>';

  let reading='No existe una meta mensual configurada en S11.';
  if(goal>0){
    reading=netTotal>=goal
      ? `Las jornadas cerradas registran ${money13(netTotal)} netos frente a ${money13(goal)} de meta mensual.`
      : `Las jornadas cerradas registran ${money13(netTotal)} netos frente a ${money13(goal)} de meta mensual; la brecha actual es ${money13(goal-netTotal)}.`;
  }

  document.getElementById('s13Reading').innerHTML=`
    <strong>Lectura S13</strong>
    <p>${reading}</p>
    <p>Los ingresos operacionales provienen de <code>jornadas_trabajo</code> en Supabase; presupuesto, gastos y créditos siguen leyendo sus módulos correspondientes.</p>
  `;
}

async function load13(){
  try{
    if(window.B20_AUTH_READY)await window.B20_AUTH_READY;
    const client=window.B20_AUTH?.client;
    if(!client||!window.B20_AUTH?.user)return;

    const r=await client
      .from('jornadas_trabajo')
      .select('*')
      .order('fecha',{ascending:false})
      .order('created_at',{ascending:false});

    if(r.error)throw r.error;
    rows13=r.data||[];
    render13();
  }catch(e){
    console.warn('[B20 S13 Tablero 1.2]',e);
  }
}

document.addEventListener('DOMContentLoaded',async()=>{
  ensure13();
  render13();
  await load13();
});

window.addEventListener('b20:synced',load13);
