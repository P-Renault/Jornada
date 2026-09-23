/* B20 · S21 · Calendario 2.0
   Ficha diaria de operación sobre jornadas cerradas de Supabase.
   No crea tablas ni modifica jornadas.
*/
(function(){
'use strict';

const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
const pct=(a,b)=>b>0?(a/b*100):0;
const hours=(a,b)=>{if(!a||!b)return 0;let [ah,am]=String(a).slice(0,5).split(':').map(Number),[bh,bm]=String(b).slice(0,5).split(':').map(Number);let x=ah*60+am,y=bh*60+bm;if(y<x)y+=1440;return (y-x)/60};
const closed=r=>String(r.estado||'').toLowerCase()==='cerrada'||(r.hora_fin&&r.km_final!=null&&r.ganancia_neta!=null);
const km=r=>Math.max(0,Number(r.km_final||0)-Number(r.km_inicio||0));
const isoToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

let rows=[];

function styles(){
 if(document.getElementById('s21CalendarStyles'))return;
 const s=document.createElement('style');s.id='s21CalendarStyles';
 s.textContent=`
 #s21Calendar .s21-month{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
 #s21Calendar .s21-month button{min-width:42px}
 #s21Calendar .s21-title{text-align:center;font-weight:800;text-transform:capitalize;flex:1}
 #s21Calendar .s21-week,.s21-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
 #s21Calendar .s21-week span{text-align:center;font-size:11px;font-weight:700;color:#667085;padding:5px 0}
 #s21Calendar .s21-day{min-height:58px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:6px;text-align:left;cursor:pointer;position:relative}
 #s21Calendar .s21-day:hover{border-color:#98a2b3}
 #s21Calendar .s21-day.muted{background:#f7f8fa;color:#a0a6b1}
 #s21Calendar .s21-day.selected{outline:2px solid #111827}
 #s21Calendar .s21-day.has-data{background:#f8fafc}
 #s21Calendar .s21-day .num{font-weight:800;font-size:12px}
 #s21Calendar .s21-dot{display:block;width:7px;height:7px;border-radius:50%;margin-top:6px;background:#2563eb}
 #s21Calendar .s21-net{font-size:10px;font-weight:700;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 #s21Calendar .s21-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 #s21Calendar .s21-detail-item{border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff}
 #s21Calendar .s21-detail-item span{display:block;font-size:11px;color:#667085}
 #s21Calendar .s21-detail-item strong{display:block;margin-top:3px;font-size:16px}
 #s21Calendar .s21-reading{border:1px dashed #98a2b3;border-radius:12px;padding:14px;margin-top:12px}
 #s21Calendar .s21-reading b{font-weight:800}
 @media(max-width:560px){#s21Calendar .s21-day{min-height:52px;padding:5px}.s21-net{display:none}#s21Calendar .s21-detail-grid{grid-template-columns:1fr 1fr}}
 `;
 document.head.appendChild(s);
}

function addNav(){
 const nav=document.querySelector('nav');
 if(!nav||nav.querySelector('[data-tab="s21calendario"]'))return;
 const b=document.createElement('button');
 b.dataset.tab='s21calendario';
 b.textContent='Calendario';
 nav.insertBefore(b,nav.querySelector('[data-tab="configuracion"]')||null);
 b.onclick=()=>show();
}

function build(){
 if(document.getElementById('s21Calendar'))return;
 styles();addNav();
 const app=document.getElementById('app');if(!app)return;
 const sec=document.createElement('section');
 sec.id='s21calendario';sec.className='tab';sec.hidden=true;
 sec.innerHTML=`
 <div class="card" id="s21Calendar">
   <h2>Calendario operativo</h2>
   <p class="muted">Selecciona un día para revisar el resultado real de sus jornadas cerradas.</p>
   <div class="s21-month">
     <button class="secondary" id="s21Prev">‹</button>
     <div class="s21-title" id="s21MonthTitle"></div>
     <button class="secondary" id="s21Next">›</button>
   </div>
   <div class="s21-week"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
   <div class="s21-grid" id="s21Grid"></div>
 </div>
 <div class="card">
   <h2 id="s21SelectedTitle">Detalle del día</h2>
   <div id="s21Detail"></div>
 </div>`;
 app.appendChild(sec);
 document.getElementById('s21Prev').onclick=()=>move(-1);
 document.getElementById('s21Next').onclick=()=>move(1);
 renderCalendar();
}

let cursor=new Date();
cursor.setDate(1);
let selected=isoToday();

function monthRows(){
 const y=cursor.getFullYear(),m=cursor.getMonth();
 return rows.filter(r=>closed(r)&&String(r.fecha||'').slice(0,7)===`${y}-${String(m+1).padStart(2,'0')}`);
}

function move(n){
 cursor.setMonth(cursor.getMonth()+n);
 renderCalendar();
}

function renderCalendar(){
 const grid=document.getElementById('s21Grid');if(!grid)return;
 const y=cursor.getFullYear(),m=cursor.getMonth();
 document.getElementById('s21MonthTitle').textContent=new Intl.DateTimeFormat('es-CL',{month:'long',year:'numeric'}).format(cursor);
 const first=new Date(y,m,1);
 let start=(first.getDay()+6)%7;
 const days=new Date(y,m+1,0).getDate();
 const prevDays=new Date(y,m,0).getDate();
 const data=new Map();
 monthRows().forEach(r=>{
   const d=String(r.fecha).slice(0,10);
   if(!data.has(d))data.set(d,{net:0,gross:0,meta:0,km:0,hours:0,trips:0,fuel:0,commission:0,maintenance:0,count:0});
   const x=data.get(d);
   x.net+=Number(r.ganancia_neta)||0;
   x.gross+=Number(r.ganancia_bruta)||0;
   x.meta+=Number(r.meta_dia)||0;
   x.km+=km(r);
   x.hours+=Number(r.horas_trabajadas)>0?Number(r.horas_trabajadas):hours(r.hora_inicio,r.hora_fin);
   x.trips+=Number(r.viajes)||0;
   x.fuel+=Number(r.combustible)||0;
   x.commission+=Number(r.comision_app)||0;
   x.maintenance+=Number(r.mantenimiento)||0;
   x.count++;
 });
 let html='';
 const cells=42;
 for(let i=0;i<cells;i++){
   const day=i-start+1;
   let yy=y,mm=m,dd=day,muted=false;
   if(day<1){dd=prevDays+day;mm=m-1;muted=true}
   else if(day>days){dd=day-days;mm=m+1;muted=true}
   const date=`${yyFor(yy,mm)}-${String(mm+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
   const x=data.get(date);
   html+=`<button class="s21-day ${muted?'muted':''} ${x?'has-data':''} ${date===selected?'selected':''}" data-date="${date}"><span class="num">${dd}</span>${x?`<span class="s21-dot"></span><span class="s21-net">${money(x.net)}</span>`:''}</button>`;
 }
 grid.innerHTML=html;
 grid.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{selected=b.dataset.date;renderCalendar();renderDetail()});
 renderDetail();
}

function yyFor(y,m){let d=new Date(y,m,1);return d.getFullYear()}

function renderDetail(){
 const root=document.getElementById('s21Detail');if(!root)return;
 const list=rows.filter(r=>closed(r)&&String(r.fecha||'').slice(0,10)===selected);
 const title=document.getElementById('s21SelectedTitle');
 const dt=new Date(`${selected}T12:00:00`);
 title.textContent=new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(dt);
 if(!list.length){root.innerHTML='<div class="empty">No hay jornadas cerradas registradas para este día.</div>';return}

 let net=0,gross=0,meta=0,k=0,h=0,t=0,f=0,c=0,maint=0;
 list.forEach(r=>{net+=+r.ganancia_neta||0;gross+=+r.ganancia_bruta||0;meta+=+r.meta_dia||0;k+=km(r);h+=+r.horas_trabajadas>0?+r.horas_trabajadas:hours(r.hora_inicio,r.hora_fin);t+=+r.viajes||0;f+=+r.combustible||0;c+=+r.comision_app||0;maint+=+r.mantenimiento||0});
 const cost=f+c+maint;
 const compliance=pct(net,meta);
 const netHour=h?net/h:0, grossHour=h?gross/h:0, costKm=k?cost/k:0, costTrip=t?cost/t:0, gainKm=k?net/k:0;
 const gap=net-meta;
 root.innerHTML=`
   <div class="s21-detail-grid">
     <div class="s21-detail-item"><span>Meta</span><strong>${money(meta)}</strong></div>
     <div class="s21-detail-item"><span>Neto real</span><strong>${money(net)}</strong></div>
     <div class="s21-detail-item"><span>Cumplimiento</span><strong>${compliance.toFixed(1)}%</strong></div>
     <div class="s21-detail-item"><span>Brecha</span><strong>${money(gap)}</strong></div>

     <div class="s21-detail-item"><span>Horas trabajadas</span><strong>${h.toFixed(2)} h</strong></div>
     <div class="s21-detail-item"><span>Neto / hora</span><strong>${money(netHour)}</strong></div>
     <div class="s21-detail-item"><span>Bruto / hora</span><strong>${money(grossHour)}</strong></div>
     <div class="s21-detail-item"><span>Viajes</span><strong>${t}</strong></div>

     <div class="s21-detail-item"><span>Kilómetros</span><strong>${k.toFixed(1)} km</strong></div>
     <div class="s21-detail-item"><span>Neto / km</span><strong>${money(gainKm)}</strong></div>
     <div class="s21-detail-item"><span>Costo / km</span><strong>${money(costKm)}</strong></div>
     <div class="s21-detail-item"><span>Costo / viaje</span><strong>${money(costTrip)}</strong></div>

     <div class="s21-detail-item"><span>Combustible</span><strong>${money(f)}</strong></div>
     <div class="s21-detail-item"><span>Comisión app</span><strong>${money(c)}</strong></div>
     <div class="s21-detail-item"><span>Mantenimiento</span><strong>${money(maint)}</strong></div>
     <div class="s21-detail-item"><span>Costo operativo</span><strong>${money(cost)}</strong></div>
   </div>
   <div class="s21-reading"><b>Lectura del día</b><br>${reading(net,meta,compliance,gap,netHour,k)}</div>`;
}

function reading(net,meta,compliance,gap,netHour,k){
 if(meta<=0)return `Se registraron ${money(net)} netos, pero el día no tiene una meta válida para calcular cumplimiento.`;
 if(gap>=0)return `La jornada alcanzó la meta diaria con ${money(net)} netos, equivalente a ${compliance.toFixed(1)}% de cumplimiento. El rendimiento observado fue de ${money(netHour)}/hora y ${money(net/k)}/km.`;
 return `El día cerró ${money(Math.abs(gap))} bajo la meta, con ${compliance.toFixed(1)}% de cumplimiento. El rendimiento observado fue de ${money(netHour)}/hora y ${k>0?money(net/k):'—'}/km.`;
}

async function start(){
 try{
   if(window.B20_AUTH_READY)await window.B20_AUTH_READY;
   build();
   const client=window.B20_AUTH?.client;
   if(!client||!window.B20_AUTH?.user)return;
   const r=await client.from('jornadas_trabajo').select('*').order('fecha',{ascending:false}).order('created_at',{ascending:false});
   if(r.error)throw r.error;
   rows=r.data||[];
   renderCalendar();
 }catch(e){console.warn('[B20 S21 Calendario]',e)}
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('b20:synced',start);
})();