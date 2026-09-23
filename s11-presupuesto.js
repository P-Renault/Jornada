/* B20 S11.1 · Presupuesto financiero · persistencia Supabase */
'use strict';
const S11_KEY='b20s11_budget_lines';
const S11_INCOME_KEY='b20s11_income_records';
const S11_GOAL_KEY='b20s11_income_goal';
const S11_CATEGORIES=[
 ['vivienda','Vivienda'],['alimentacion','Alimentación'],['transporte','Transporte'],
 ['higiene','Higiene'],['herramientas_tecnologia','Herramientas / tecnología'],
 ['datos_movil','Datos / móvil'],['recreacion','Recreación'],['vestuario','Vestuario'],
 ['deudas','Deudas / compromisos'],['salud','Salud'],['otros','Otros']
];
const S11_S08_MAP={peajes:'transporte',estacionamiento:'transporte',datos_movil:'datos_movil',alimentacion:'alimentacion',higiene:'higiene',herramientas:'herramientas_tecnologia',administrativo:'otros',otro:'otros'};
const j11=v=>{try{return JSON.parse(localStorage.getItem(v)||'[]')}catch{return[]}};
const n11=v=>Number(v||0);
const money11=v=>'$'+Math.round(n11(v)).toLocaleString('es-CL');
const month11=()=>document.getElementById('s11Month')?.value||new Date().toISOString().slice(0,7);
const inMonth11=d=>String(d||'').slice(0,7)===month11();
const save11=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const sync11=async()=>{
 try{
   if(window.B20_AUTH?.sync) await window.B20_AUTH.sync();
 }catch(e){ console.warn('[B20 S11] sincronización pendiente:',e?.message||e); }
};
function s08Real11(){
 return j11('b20s8_operating_expenses').filter(x=>inMonth11(x.fecha)).reduce((m,x)=>{
  const c=S11_S08_MAP[x.categoria]||'otros';m[c]=(m[c]||0)+n11(x.monto);return m;
 },{});
}
function lines11(){return j11(S11_KEY).filter(x=>x.mes===month11())}
function incomes11(){return j11(S11_INCOME_KEY).filter(x=>inMonth11(x.fecha))}
function goal11(){return n11(localStorage.getItem(S11_GOAL_KEY))}
function ensure11(){
 if(!document.getElementById('presupuesto')){
  const nav=document.querySelector('nav');
  if(nav){
   const b=document.createElement('button');b.dataset.tab='presupuesto';b.textContent='Presupuesto';nav.appendChild(b);
   b.onclick=()=>{if(typeof activateTab==='function')activateTab('presupuesto');document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!=='presupuesto');document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab==='presupuesto'));badge11()};
  }
  const app=document.getElementById('app');
  if(app){
   const s=document.createElement('section');s.id='presupuesto';s.className='tab';s.hidden=true;
   s.innerHTML=`
   <h2>Presupuesto financiero</h2><p>Control mensual de ingresos, presupuesto y gasto real.</p>
   <div class="grid"><label>Mes <input id="s11Month" type="month"></label><label>Meta ingreso neto mensual <input id="s11Goal" type="number" min="0" step="1000"></label><button id="s11SaveGoal" type="button">Guardar meta</button></div>
   <div id="s11Summary" class="grid"></div><h3>Presupuesto por categoría</h3>
   <form id="s11BudgetForm" class="grid"><select id="s11Cat"></select><input id="s11Plan" type="number" min="0" step="1000" placeholder="Monto planificado"><input id="s11Note" placeholder="Nota"><button>Agregar / actualizar</button></form>
   <div id="s11BudgetTable"></div><h3>Ingresos registrados</h3>
   <form id="s11IncomeForm" class="grid"><input id="s11IncomeDate" type="date" required><input id="s11IncomeAmount" type="number" min="0" step="1000" placeholder="Monto" required><input id="s11IncomeConcept" placeholder="Concepto"><button>Registrar ingreso</button></form>
   <div id="s11IncomeTable"></div><h3>Lectura por categoría</h3><div id="s11ControlTable"></div>
   <div class="grid"><button id="s11Export" type="button">Exportar S11</button><button id="s11Import" type="button">Importar S11</button><input id="s11File" type="file" accept="application/json" hidden></div>`;
   app.appendChild(s);
  }
 }
 const m=document.getElementById('s11Month'),cat=document.getElementById('s11Cat'),date=document.getElementById('s11IncomeDate');
 if(!m||!cat||!date)return;
 m.value=month11();
 cat.innerHTML=S11_CATEGORIES.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('');
 date.value=new Date().toISOString().slice(0,10);
 m.onchange=render11;
 document.getElementById('s11SaveGoal').onclick=async()=>{
  const value=n11(document.getElementById('s11Goal').value);
  save11(S11_GOAL_KEY,value);
  render11();
  await sync11();
 };
 document.getElementById('s11BudgetForm').onsubmit=async e=>{
  e.preventDefault();const mes=month11(),a=j11(S11_KEY),c=document.getElementById('s11Cat').value,plan=n11(document.getElementById('s11Plan').value);
  if(!plan){alert('Ingresa un monto planificado mayor que $0.');return;}
  const i=a.findIndex(x=>x.mes===mes&&x.categoria===c),row={mes,categoria:c,plan,nota:document.getElementById('s11Note').value.trim()};
  i>=0?a[i]=row:a.push(row);save11(S11_KEY,a);e.target.reset();render11();await sync11();
 };
 document.getElementById('s11IncomeForm').onsubmit=async e=>{
  e.preventDefault();const a=j11(S11_INCOME_KEY);
  a.push({id:Date.now(),fecha:document.getElementById('s11IncomeDate').value,monto:n11(document.getElementById('s11IncomeAmount').value),concepto:document.getElementById('s11IncomeConcept').value.trim()});
  save11(S11_INCOME_KEY,a);e.target.reset();document.getElementById('s11IncomeDate').value=new Date().toISOString().slice(0,10);render11();await sync11();
 };
 document.getElementById('s11Export').onclick=()=>{const blob=new Blob([JSON.stringify({budget:j11(S11_KEY),income:j11(S11_INCOME_KEY),goal:goal11()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='b20-s11-presupuesto.json';a.click();URL.revokeObjectURL(a.href)};
 document.getElementById('s11Import').onclick=()=>document.getElementById('s11File').click();
 document.getElementById('s11File').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(Array.isArray(x.budget))save11(S11_KEY,x.budget);if(Array.isArray(x.income))save11(S11_INCOME_KEY,x.income);if(x.goal!=null)save11(S11_GOAL_KEY,n11(x.goal));await sync11();alert('S11 importado correctamente');render11()}catch{alert('Archivo S11 inválido')}};
}
function badge11(){const b=document.getElementById('appBadge'),l=document.getElementById('appLayer'),f=document.getElementById('footerLabel');if(b)b.textContent='B20 · S11';if(l)l.textContent='Capa 11 · presupuesto financiero';if(f)f.textContent='B20 · Sprint S11 · presupuesto financiero · v1.0'}
function render11(){
 ensure11();badge11();
 const plan=lines11().reduce((s,x)=>s+n11(x.plan),0),real=s08Real11(),realTotal=Object.values(real).reduce((s,x)=>s+x,0),income=incomes11().reduce((s,x)=>s+n11(x.monto),0),goal=goal11(),projected=income-plan,actual=income-realTotal;
 document.getElementById('s11Goal').value=goal||'';
 document.getElementById('s11Summary').innerHTML=[['Meta ingreso neto',goal],['Ingreso registrado',income],['Brecha de ingreso',Math.max(0,goal-income)],['Presupuesto planificado',plan],['Gasto real S08',realTotal],['Saldo proyectado',projected],['Saldo real',actual]].map(x=>`<div class="card"><strong>${x[0]}</strong><div>${money11(x[1])}</div></div>`).join('');
 const labels=Object.fromEntries(S11_CATEGORIES);
 document.getElementById('s11BudgetTable').innerHTML=`<table><thead><tr><th>Categoría</th><th>Plan</th><th>Nota</th><th>Acción</th></tr></thead><tbody>${lines11().map(x=>`<tr><td>${labels[x.categoria]||x.categoria}</td><td>${money11(x.plan)}</td><td>${x.nota||''}</td><td><button onclick="s11DeleteBudget('${x.categoria}')">Eliminar</button></td></tr>`).join('')}</tbody></table>`;
 document.getElementById('s11IncomeTable').innerHTML=`<table><thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th><th>Acción</th></tr></thead><tbody>${incomes11().map(x=>`<tr><td>${x.fecha}</td><td>${x.concepto||''}</td><td>${money11(x.monto)}</td><td><button onclick="s11DeleteIncome('${x.id}')">Eliminar</button></td></tr>`).join('')}</tbody></table>`;
 document.getElementById('s11ControlTable').innerHTML=`<table><thead><tr><th>Categoría</th><th>Plan</th><th>Real S08</th><th>Disponible</th><th>Variación</th></tr></thead><tbody>${S11_CATEGORIES.map(([k,l])=>{const p=lines11().find(x=>x.categoria===k)?.plan||0,r=real[k]||0;return `<tr><td>${l}</td><td>${money11(p)}</td><td>${money11(r)}</td><td>${money11(p-r)}</td><td>${money11(r-p)}</td></tr>`}).join('')}</tbody></table>`;
}
window.s11DeleteBudget=async cat=>{save11(S11_KEY,j11(S11_KEY).filter(x=>!(x.mes===month11()&&x.categoria===cat)));render11();await sync11()};
window.s11DeleteIncome=async id=>{save11(S11_INCOME_KEY,j11(S11_INCOME_KEY).filter(x=>String(x.id)!==String(id)));render11();await sync11()};
document.addEventListener('DOMContentLoaded',render11);
window.addEventListener('b20:synced',render11);
