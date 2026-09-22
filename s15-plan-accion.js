'use strict';

const S15_KEY='b20s15_action_items';
const S15_STATUSES=[['pendiente','Pendiente'],['en_progreso','En progreso'],['resuelto','Resuelto']];
const S15_PRIORITIES=[['alta','Alta'],['media','Media'],['baja','Baja']];

const j15=()=>{try{const x=JSON.parse(localStorage.getItem(S15_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const save15=v=>localStorage.setItem(S15_KEY,JSON.stringify(v));
const today15=()=>new Date().toISOString().slice(0,10);
const esc15=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function ensure15(){
  if(document.getElementById('acciones'))return;
  const nav=document.querySelector('nav');
  if(nav){
    const b=document.createElement('button');
    b.dataset.tab='acciones';b.textContent='Acciones';nav.appendChild(b);b.onclick=show15;
  }
  const app=document.getElementById('app');if(!app)return;
  const s=document.createElement('section');s.id='acciones';s.className='tab';s.hidden=true;
  s.innerHTML=`
    <div class="card">
      <h2>Plan de acción</h2>
      <p>Convierte pendientes y alertas B20 en acciones con responsable, prioridad, fecha y estado.</p>
      <form id="s15Form" class="grid">
        <input id="s15Title" required placeholder="Acción o compromiso">
        <select id="s15Priority">${S15_PRIORITIES.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')}</select>
        <input id="s15Due" type="date">
        <input id="s15Owner" placeholder="Responsable">
        <input id="s15Source" placeholder="Origen (S14, S06, etc.)">
        <button>Agregar acción</button>
      </form>
      <div class="row">
        <button id="s15ImportAlerts" type="button">Importar alertas S14</button>
        <button id="s15Export" type="button">Exportar acciones</button>
        <button id="s15ClearResolved" type="button">Limpiar resueltas</button>
      </div>
    </div>
    <div id="s15Summary" class="metric-grid"></div>
    <div class="card"><h2>Acciones pendientes</h2><div id="s15Pending"></div></div>
    <div class="card"><h2>Historial de acciones</h2><div id="s15History"></div></div>
    <div class="card"><h2>Diagnóstico</h2><div id="s15Diag" class="plan"></div></div>
  `;
  app.appendChild(s);

  document.getElementById('s15Form').onsubmit=e=>{
    e.preventDefault();
    const a=j15();
    a.push({
      id:'a15-'+Date.now(),
      titulo:document.getElementById('s15Title').value.trim(),
      prioridad:document.getElementById('s15Priority').value,
      vencimiento:document.getElementById('s15Due').value||'',
      responsable:document.getElementById('s15Owner').value.trim(),
      origen:document.getElementById('s15Source').value.trim(),
      estado:'pendiente',
      creado:new Date().toISOString()
    });
    save15(a);e.target.reset();render15();
  };

  document.getElementById('s15ImportAlerts').onclick=importAlerts15;
  document.getElementById('s15Export').onclick=export15;
  document.getElementById('s15ClearResolved').onclick=()=>{
    save15(j15().filter(x=>x.estado!=='resuelto'));render15();
  };
}

function badge15(){
  const b=document.getElementById('appBadge'),l=document.getElementById('appLayer'),f=document.getElementById('footerLabel');
  if(b)b.textContent='B20 · S15';
  if(l)l.textContent='Capa 15 · plan de acción';
  if(f)f.textContent='B20 · Sprint S15 · plan de acción · v1.0';
}

function show15(){
  ensure15();
  document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!=='acciones');
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab==='acciones'));
  badge15();render15();
}

function importAlerts15(){
  const alerts=[];
  try{
    const docs=JSON.parse(localStorage.getItem('b20s6_document_records')||'[]');
    const today=today15();
    docs.forEach(r=>{
      const d=r.vencimiento||r.fechaVencimiento||r.fecha_vencimiento||r.proximaFecha||r.proxima_fecha;
      if(d&&String(d).slice(0,10)<today)alerts.push({titulo:`Regularizar ${r.nombre||r.documento||r.tipo||'documento'}`,prioridad:'alta',origen:'S06',vencimiento:today});
    });
  }catch{}
  try{
    const credits=JSON.parse(localStorage.getItem('b20s10_credit_movements')||'[]');
    const map=new Map();
    credits.forEach(r=>{
      const ref=r.creditRef||r.id;
      if(!map.has(ref))map.set(ref,{original:0,recovered:0,concepto:r.concepto||'Crédito personal'});
      const c=map.get(ref);
      if(r.tipo==='credito')c.original+=Number(r.monto||0);else c.recovered+=Number(r.monto||0);
    });
    for(const c of map.values()){
      if(c.original-c.recovered>0)alerts.push({titulo:`Gestionar saldo: ${c.concepto}`,prioridad:'media',origen:'S10',vencimiento:''});
    }
  }catch{}
  const a=j15();
  let added=0;
  alerts.forEach(x=>{
    const exists=a.some(y=>y.titulo===x.titulo&&y.estado!=='resuelto');
    if(!exists){a.push({id:'a15-'+Date.now()+'-'+added,titulo:x.titulo,prioridad:x.prioridad,vencimiento:x.vencimiento||'',responsable:'',origen:x.origen,estado:'pendiente',creado:new Date().toISOString()});added++}
  });
  save15(a);render15();
  alert(added?`${added} acción(es) importada(s).`:'No se encontraron nuevas alertas convertibles en acciones.');
}

function export15(){
  const blob=new Blob([JSON.stringify(j15(),null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='b20-s15-plan-accion.json';a.click();URL.revokeObjectURL(a.href);
}

function update15(id,field,value){
  const a=j15();const x=a.find(v=>v.id===id);if(!x)return;
  x[field]=value;save15(a);render15();
}
window.s15Update=update15;
window.s15Delete=id=>{save15(j15().filter(x=>x.id!==id));render15()};

function table15(list){
  if(!list.length)return '<p>Sin acciones.</p>';
  const labels=Object.fromEntries([...S15_STATUSES,...S15_PRIORITIES]);
  return `<div style="overflow:auto"><table><thead><tr><th>Acción</th><th>Prioridad</th><th>Fecha</th><th>Responsable</th><th>Origen</th><th>Estado</th><th></th></tr></thead><tbody>${
    list.map(x=>`<tr>
      <td>${esc15(x.titulo)}</td>
      <td>${labels[x.prioridad]||x.prioridad}</td>
      <td>${esc15(x.vencimiento||'—')}</td>
      <td>${esc15(x.responsable||'—')}</td>
      <td>${esc15(x.origen||'—')}</td>
      <td><select onchange="s15Update('${x.id}','estado',this.value)">${S15_STATUSES.map(s=>`<option value="${s[0]}" ${x.estado===s[0]?'selected':''}>${s[1]}</option>`).join('')}</select></td>
      <td><button type="button" onclick="s15Delete('${x.id}')">Eliminar</button></td>
    </tr>`).join('')
  }</tbody></table></div>`;
}

function render15(){
  ensure15();badge15();
  const a=j15();
  const pending=a.filter(x=>x.estado!=='resuelto');
  const progress=a.filter(x=>x.estado==='en_progreso');
  const resolved=a.filter(x=>x.estado==='resuelto');
  const overdue=pending.filter(x=>x.vencimiento&&x.vencimiento<today15());
  document.getElementById('s15Summary').innerHTML=[
    ['Acciones totales',a.length],['Pendientes',pending.length],['En progreso',progress.length],['Resueltas',resolved.length],['Vencidas',overdue.length]
  ].map(x=>`<div class="card"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  document.getElementById('s15Pending').innerHTML=table15(pending);
  document.getElementById('s15History').innerHTML=table15(resolved);
  document.getElementById('s15Diag').innerHTML=`<strong>Diagnóstico S15</strong><p>Las acciones se almacenan localmente en ${S15_KEY}.</p><p>S15 no modifica S01-S14 y no requiere SQL.</p>`;
}

document.addEventListener('DOMContentLoaded',()=>{ensure15();render15()});
