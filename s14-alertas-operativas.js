'use strict';

const S14_KEYS={
  docs:'b20s6_document_records',
  maint:'b20s5_maintenance_records',
  comps:'b20s5_component_records',
  services:'b20s7_service_records',
  expenses:'b20s8_operating_expenses',
  fund:'b20s9_fund_movements',
  needs:'b20s9_future_needs',
  credits:'b20s10_credit_movements',
  budget:'b20s11_budget_lines',
  income:'b20s11_income_records'
};

const j14=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const n14=v=>Number(v||0);
const money14=v=>'$'+Math.round(n14(v)).toLocaleString('es-CL');
const month14=()=>document.getElementById('s14Month')?.value||new Date().toISOString().slice(0,7);
const today14=()=>new Date().toISOString().slice(0,10);
const date14=v=>String(v||'').slice(0,10);
const days14=(a,b)=>Math.ceil((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000);

function ensure14(){
  if(document.getElementById('alertas'))return;
  const nav=document.querySelector('nav');
  if(nav){
    const b=document.createElement('button');
    b.dataset.tab='alertas';b.textContent='Alertas';nav.appendChild(b);b.onclick=show14;
  }
  const app=document.getElementById('app');if(!app)return;
  const s=document.createElement('section');s.id='alertas';s.className='tab';s.hidden=true;
  s.innerHTML=`
    <div class="card">
      <h2>Alertas operativas</h2>
      <p>Detección de pendientes, vencimientos, déficits y desviaciones en las capas B20.</p>
      <label>Mes de referencia <input id="s14Month" type="month"></label>
      <button id="s14Refresh" type="button">Actualizar alertas</button>
    </div>
    <div id="s14Summary" class="metric-grid"></div>
    <div class="card"><h2>Prioridad alta</h2><div id="s14High"></div></div>
    <div class="card"><h2>Atención</h2><div id="s14Medium"></div></div>
    <div class="card"><h2>Información</h2><div id="s14Info"></div></div>
    <div class="card"><h2>Diagnóstico</h2><div id="s14Diag" class="plan"></div></div>
  `;
  app.appendChild(s);
  document.getElementById('s14Month').onchange=render14;
  document.getElementById('s14Refresh').onclick=render14;
}

function badge14(){
  const b=document.getElementById('appBadge'),l=document.getElementById('appLayer'),f=document.getElementById('footerLabel');
  if(b)b.textContent='B20 · S14';
  if(l)l.textContent='Capa 14 · alertas operativas';
  if(f)f.textContent='B20 · Sprint S14 · alertas operativas · v1.0';
}

function add14(list,nivel,titulo,detalle,fuente){
  list.push({nivel,titulo,detalle,fuente});
}

function build14(){
  const a=[];
  const today=today14(),month=month14();

  // S06: vencimientos documentales. Supports common date field names without altering data.
  const docs=j14(S14_KEYS.docs);
  docs.forEach(r=>{
    const expiry=r.vencimiento||r.fechaVencimiento||r.fecha_vencimiento||r.proximaFecha||r.proxima_fecha;
    if(!expiry)return;
    const d=days14(today,date14(expiry));
    const name=r.nombre||r.documento||r.tipo||'Documento';
    if(d<0)add14(a,'alta',`${name}: vencido`,`Venció el ${date14(expiry)}.`,'S06');
    else if(d<=7)add14(a,'alta',`${name}: vence en ${d} día(s)`,`Fecha de vencimiento: ${date14(expiry)}.`,'S06');
    else if(d<=30)add14(a,'media',`${name}: próximo vencimiento`,`Vence el ${date14(expiry)}.`,'S06');
  });

  // S05: maintenance/component next milestones.
  [...j14(S14_KEYS.maint),...j14(S14_KEYS.comps)].forEach(r=>{
    const name=r.concepto||r.nombre||r.componente||'Mantención/componente';
    const nextDate=r.proximaFecha||r.proxima_fecha;
    if(nextDate){
      const d=days14(today,date14(nextDate));
      if(d<0)add14(a,'alta',`${name}: hito vencido`,`Fecha objetivo: ${date14(nextDate)}.`,'S05');
      else if(d<=14)add14(a,'media',`${name}: hito cercano`,`Fecha objetivo: ${date14(nextDate)}.`,'S05');
    }
  });

  // S08: monthly expenses compared with S11 planned budget.
  const expenses=j14(S14_KEYS.expenses).filter(r=>date14(r.fecha).slice(0,7)===month);
  const budget=j14(S14_KEYS.budget).filter(r=>r.mes===month);
  const expBy={};
  expenses.forEach(r=>{const c=r.categoria||'otros';expBy[c]=(expBy[c]||0)+n14(r.monto)});
  budget.forEach(r=>{
    const p=n14(r.plan),real=expBy[r.categoria]||0;
    if(p>0&&real>p)add14(a,'alta',`Presupuesto excedido: ${r.categoria}`,`Real ${money14(real)} vs plan ${money14(p)}.`,'S08/S11');
    else if(p>0&&real>=p*.8)add14(a,'media',`Presupuesto próximo al límite: ${r.categoria}`,`Real ${money14(real)} de ${money14(p)}.`,'S08/S11');
  });

  // S09: future needs without coverage.
  const fund=j14(S14_KEYS.fund).reduce((s,r)=>s+(r.tipo==='aporte'?n14(r.monto):-n14(r.monto)),0);
  const needs=j14(S14_KEYS.needs).filter(r=>!r.cubierta);
  const future=needs.reduce((s,r)=>s+n14(r.costo),0);
  if(future>0&&fund<future)add14(a,'alta','Fondo de desgaste con déficit',`Fondo ${money14(fund)} frente a necesidades ${money14(future)}. Déficit ${money14(future-Math.max(0,fund))}.`,'S09');
  else if(needs.length)add14(a,'media','Necesidades futuras pendientes',`${needs.length} necesidad(es) aún no cubierta(s).`,'S09');

  // S10: outstanding personal credits.
  const credits=j14(S14_KEYS.credits),map=new Map();
  credits.forEach(r=>{
    const ref=r.creditRef||r.id;
    if(!map.has(ref))map.set(ref,{original:0,recovered:0,concepto:r.concepto||'Crédito'});
    const c=map.get(ref);
    if(r.tipo==='credito')c.original+=n14(r.monto);else c.recovered+=n14(r.monto);
  });
  const outstanding=[...map.values()].reduce((s,c)=>s+Math.max(0,c.original-c.recovered),0);
  if(outstanding>0)add14(a,'media','Créditos con saldo pendiente',`Saldo total pendiente: ${money14(outstanding)}.`,'S10');

  // S11: monthly income gap.
  const goal=n14(localStorage.getItem('b20s11_income_goal'));
  const income=j14(S14_KEYS.income).filter(r=>date14(r.fecha).slice(0,7)===month).reduce((s,r)=>s+n14(r.monto),0);
  if(goal>0&&income<goal){
    const gap=goal-income;
    add14(a,gap>=goal*.5?'media':'info','Meta de ingreso aún no cubierta',`Registrado ${money14(income)} de ${money14(goal)}. Brecha ${money14(gap)}.`,'S11');
  }

  return a;
}

function renderList14(id,list){
  const el=document.getElementById(id);
  if(!list.length){el.innerHTML='<p>Sin elementos.</p>';return;}
  el.innerHTML=`<div class="mini-grid">${list.map(x=>`<article class="item"><div class="row"><b>${x.titulo}</b><span>${x.fuente}</span></div><div class="muted">${x.detalle}</div></article>`).join('')}</div>`;
}

function render14(){
  ensure14();badge14();
  const month=document.getElementById('s14Month');
  month.value=month.value||new Date().toISOString().slice(0,7);
  const selectedMonth=month.value;
  const alerts=build14();
  const high=alerts.filter(x=>x.nivel==='alta'),medium=alerts.filter(x=>x.nivel==='media'),info=alerts.filter(x=>x.nivel==='info');
  document.getElementById('s14Summary').innerHTML=[
    ['Alertas totales',alerts.length],['Prioridad alta',high.length],['Atención',medium.length],['Información',info.length]
  ].map(x=>`<div class="card"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  renderList14('s14High',high);renderList14('s14Medium',medium);renderList14('s14Info',info);
  document.getElementById('s14Diag').innerHTML=`<strong>Diagnóstico S14</strong><p>Referencia: ${selectedMonth}. Las alertas son calculadas localmente a partir de S05, S06, S08, S09, S10 y S11.</p><p>No se modifican registros de las capas anteriores y no se requiere SQL.</p>`;
}

function show14(){
  ensure14();
  document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!=='alertas');
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab==='alertas'));
  badge14();render14();
}

document.addEventListener('DOMContentLoaded',()=>{ensure14();render14()});
