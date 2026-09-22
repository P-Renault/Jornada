'use strict';
const S12_CFG='b20s12_projection_config';
const S11_BUDGET='b20s11_budget_lines';
const S11_INCOME='b20s11_income_records';
const S11_GOAL='b20s11_income_goal';

const p12=v=>Number(v||0);
const money12=v=>'$'+Math.round(p12(v)).toLocaleString('es-CL');
const month12=()=>document.getElementById('s12Month')?.value||new Date().toISOString().slice(0,7);
const load12=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return[]}};
const save12=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

function cfg12(){
  try{
    const x=JSON.parse(localStorage.getItem(S12_CFG)||'{}');
    return {
      jornadas:Number.isFinite(Number(x.jornadas))?Number(x.jornadas):22,
      neto:Number.isFinite(Number(x.neto))?Number(x.neto):60000,
      variacion:Number.isFinite(Number(x.variacion))?Number(x.variacion):15
    };
  }catch{return {jornadas:22,neto:60000,variacion:15}}
}
function s11Budget12(){
  return load12(S11_BUDGET).filter(x=>x.mes===month12()).reduce((s,x)=>s+p12(x.plan),0);
}
function s11Income12(){
  return load12(S11_INCOME).filter(x=>String(x.fecha||'').slice(0,7)===month12()).reduce((s,x)=>s+p12(x.monto),0);
}
function s11Goal12(){return p12(localStorage.getItem(S11_GOAL))}
function ensure12(){
  if(document.getElementById('proyeccion'))return;
  const nav=document.querySelector('nav');
  if(nav){
    const b=document.createElement('button');
    b.dataset.tab='proyeccion';b.textContent='Proyección';nav.appendChild(b);
    b.onclick=()=>show12();
  }
  const app=document.getElementById('app');
  if(!app)return;
  const s=document.createElement('section');
  s.id='proyeccion';s.className='tab';s.hidden=true;
  s.innerHTML=`
  <div class="card">
    <h2>Proyección y escenarios</h2>
    <p class="muted">S12 proyecta ingresos, presupuesto y saldo mensual usando los datos de S11 y tres escenarios operativos.</p>
    <div class="grid">
      <label>Mes <input id="s12Month" type="month"></label>
      <label>Jornadas proyectadas <input id="s12Days" type="number" min="0" step="1"></label>
      <label>Neto objetivo por jornada ($) <input id="s12Net" type="number" min="0" step="1000"></label>
      <label>Variación escenario (%) <input id="s12Var" type="number" min="0" max="100" step="1"></label>
    </div>
    <div class="row"><button id="s12Save">Guardar parámetros</button><button id="s12Reset" class="secondary">Restaurar base</button></div>
  </div>
  <div class="card"><h2>Resumen de referencia</h2><div id="s12Reference" class="metric-grid"></div></div>
  <div class="card"><h2>Escenarios</h2><div id="s12Scenarios" class="metric-grid"></div></div>
  <div class="card"><h2>Brecha respecto de S11</h2><div id="s12Gap"></div></div>
  <div class="card"><h2>Lectura</h2><div id="s12Reading" class="plan"></div></div>
  `;
  app.appendChild(s);
  document.getElementById('s12Month').onchange=render12;
  document.getElementById('s12Save').onclick=()=>{
    save12(S12_CFG,{
      jornadas:p12(document.getElementById('s12Days').value),
      neto:p12(document.getElementById('s12Net').value),
      variacion:p12(document.getElementById('s12Var').value)
    });render12()
  };
  document.getElementById('s12Reset').onclick=()=>{localStorage.removeItem(S12_CFG);render12()};
}
function badge12(){
  const b=document.getElementById('appBadge'),l=document.getElementById('appLayer'),f=document.getElementById('footerLabel');
  if(b)b.textContent='B20 · S12';
  if(l)l.textContent='Capa 12 · proyección y escenarios';
  if(f)f.textContent='B20 · Sprint S12 · proyección y escenarios · v1.0';
}
function show12(){
  ensure12();
  document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!=='proyeccion');
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab==='proyeccion'));
  badge12();render12()
}
function render12(){
  ensure12();badge12();
  const c=cfg12();
  const month=document.getElementById('s12Month');
  month.value=month.value||month12();
  document.getElementById('s12Days').value=c.jornadas;
  document.getElementById('s12Net').value=c.neto;
  document.getElementById('s12Var').value=c.variacion;

  const plan=s11Budget12(),registered=s11Income12(),goal=s11Goal12();
  const target=c.jornadas*c.neto;
  const low=target*(1-c.variacion/100),base=target,high=target*(1+c.variacion/100);

  document.getElementById('s12Reference').innerHTML=[
    ['Meta S11',money12(goal)],['Ingreso S11 registrado',money12(registered)],
    ['Presupuesto S11',money12(plan)],['Ingreso proyectado base',money12(target)],
    ['Jornadas proyectadas',c.jornadas],['Neto objetivo/jornada',money12(c.neto)]
  ].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');

  const scenarios=[
    ['Conservador',low,low-plan],
    ['Base',base,base-plan],
    ['Expansivo',high,high-plan]
  ];
  document.getElementById('s12Scenarios').innerHTML=scenarios.map(([name,inc,saldo])=>
    `<div><span>${name}</span><strong>${money12(inc)}</strong><small>Saldo proyectado: ${money12(saldo)}</small></div>`
  ).join('');

  const gapBase=base-goal;
  const gapRegistered=goal-registered;
  document.getElementById('s12Gap').innerHTML=`
    <div class="mini-grid">
      <span>Base vs meta S11 <b>${money12(gapBase)}</b></span>
      <span>Meta pendiente sobre ingreso registrado <b>${money12(Math.max(0,gapRegistered))}</b></span>
      <span>Jornadas para cubrir la meta S11 <b>${c.neto>0?Math.ceil(Math.max(0,goal-registered)/c.neto):0}</b></span>
    </div>`;

  let text='Sin meta mensual definida en S11.';
  if(goal>0){
    const daysNeeded=c.neto>0?Math.ceil(goal/c.neto):0;
    text=`Con ${c.jornadas} jornadas a ${money12(c.neto)} netos por jornada, la proyección base es ${money12(base)}. Para alcanzar la meta S11 de ${money12(goal)} se requieren aproximadamente ${daysNeeded} jornadas a ese rendimiento.`;
  }
  document.getElementById('s12Reading').innerHTML=`<strong>Lectura S12</strong><p>${text}</p><p class="muted">S12 no modifica jornadas, S10 ni S11; solamente proyecta escenarios con los datos disponibles localmente.</p>`;
}
document.addEventListener('DOMContentLoaded',()=>{ensure12();render12()});
