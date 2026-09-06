const VERSION = 'V12.0';
let db = null;
let cache = [];
let calendarMonth = new Date();
let closeFormOpen = false;

const $ = (id) => document.getElementById(id);
const CLP = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(n) || 0);
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const num = (id) => Math.max(0, Number($(id)?.value) || 0);
const val = (id) => ($(id)?.value ?? '').trim();
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
const setMsg = (id, text) => { if ($(id)) $(id).textContent = text; };

function settings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('work_settings') || '{}'); } catch (_) {}
  return {
    vehiculo: s.vehiculo || 'Chevrolet Sail 2015 1.4',
    rendimiento: Number(s.rendimiento) || 13,
    precioLitro: Number(s.precioLitro) || 1635,
    mantKm: Number(s.mantKm) || 30,
    comisionPct: Number(s.comisionPct) || 20,
    netHora: Number(s.netHora) || 8000,
    viajesHora: Number(s.viajesHora) || 2,
    kmHora: Number(s.kmHora) || 20
  };
}

function configLoad() {
  $('supabaseUrl').value = localStorage.getItem('work_url') || '';
  $('supabaseKey').value = localStorage.getItem('work_key') || '';
  $('fecha').value = today();
  $('fecha').max = today();
  $('dashboardMonth').value = today().slice(0, 7);
  $('historyMonth').value = today().slice(0, 7);
  const s = settings();
  $('vehiculo').value = s.vehiculo;
  $('rendimiento').value = s.rendimiento;
  $('precioLitro').value = s.precioLitro;
  $('mantKm').value = s.mantKm;
  $('comisionPct').value = s.comisionPct;
  $('netHora').value = s.netHora;
  $('viajesHora').value = s.viajesHora;
  $('kmHora').value = s.kmHora;
  $('metaDia').value = localStorage.getItem('last_goal') || '';
}

async function connect() {
  const url = val('supabaseUrl');
  const key = val('supabaseKey');
  if (!url || !key) return setMsg('configMsg', 'Completa URL y Publishable Key.');
  try {
    db = window.supabase.createClient(url, key);
    const { error } = await db.from('jornadas_trabajo').select('id').limit(1);
    if (error) throw error;
    localStorage.setItem('work_url', url);
    localStorage.setItem('work_key', key);
    $('configPanel').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('logoutBtn').classList.remove('hidden');
    await refresh();
  } catch (e) {
    console.error(e);
    setMsg('configMsg', 'No se pudo conectar: ' + (e.message || 'revisa URL, clave y SQL.'));
  }
}

$('saveConfig').onclick = connect;
$('logoutBtn').onclick = () => { localStorage.removeItem('work_url'); localStorage.removeItem('work_key'); location.reload(); };

document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  document.querySelectorAll('.tab').forEach((x) => x.classList.add('hidden'));
  $(b.dataset.tab).classList.remove('hidden');
  if (b.dataset.tab === 'dashboard') renderDashboard();
  if (b.dataset.tab === 'historial') renderHistory();
  if (b.dataset.tab === 'calendario') renderCalendar();
  if (b.dataset.tab === 'jornadas') loadTodayActive();
}));

function hoursBetween(a, b) {
  if (!a || !b) return 0;
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  let x = ah * 60 + am, y = bh * 60 + bm;
  if (y < x) y += 1440;
  return (y - x) / 60;
}

function completed(r) { return r?.estado === 'cerrada' && r.hora_fin && r.km_final != null; }

function historicalRates() {
  const done = cache.filter(completed);
  const s = settings();
  if (done.length < 3) return { netHora:s.netHora, viajesHora:s.viajesHora, kmHora:s.kmHora, source:'configuración' };
  const h = done.reduce((a,r)=>a+Number(r.horas_trabajadas||0),0);
  const tr = done.reduce((a,r)=>a+Number(r.viajes||0),0);
  const km = done.reduce((a,r)=>a+Number(r.km_recorridos||0),0);
  const net = done.reduce((a,r)=>a+Number(r.ganancia_neta||0),0);
  return { netHora:h?net/h:s.netHora, viajesHora:h?tr/h:s.viajesHora, kmHora:h?km/h:s.kmHora, source:'promedio de jornadas cerradas' };
}

function projectionFromValues(goal, planned) {
  const s = settings();
  const rates = historicalRates();
  const needHours = rates.netHora > 0 ? goal / rates.netHora : 0;
  const km = planned * rates.kmHora;
  const trips = Math.round(planned * rates.viajesHora);
  const fuel = s.rendimiento > 0 ? (km / s.rendimiento) * s.precioLitro : 0;
  const maint = km * s.mantKm;
  const grossNeeded = s.comisionPct < 100 ? (goal + fuel + maint) / (1 - s.comisionPct / 100) : 0;
  const net = planned * rates.netHora;
  const grossProjected = s.comisionPct < 100 ? (net + fuel + maint) / (1 - s.comisionPct / 100) : 0;
  return { goal, planned, rates, needHours, km, trips, fuel, maint, grossNeeded, net, grossProjected };
}

function projection() { return projectionFromValues(num('metaDia'), num('horasPlan')); }

function renderProjection(p = projection()) {
  $('planHours').textContent = p.needHours.toFixed(2) + ' h';
  $('planKm').textContent = p.km.toFixed(1) + ' km';
  $('planTrips').textContent = p.trips + ' viajes';
  $('planFuel').textContent = CLP(p.fuel);
  $('planMaintenance').textContent = CLP(p.maint);
  $('planGross').textContent = CLP(p.grossProjected);
  $('planNet').textContent = CLP(p.net);
  $('planGrossGoal').textContent = CLP(p.grossNeeded);
  $('planRate').textContent = CLP(p.rates.netHora) + '/h';
  $('planSource').textContent = 'Proyección basada en ' + p.rates.source + '. Meta: ' + CLP(p.goal) + '. Jornada: ' + p.planned.toFixed(2) + ' h.';
  $('planStatus').textContent = p.net >= p.goal ? 'Meta proyectada alcanzable' : 'La jornada planificada no alcanza la meta proyectada.';
}

function actualCalc() {
  const s = settings();
  const km = val('kmFinal') === '' ? 0 : Math.max(0, num('kmFinal') - num('kmInicio'));
  const h = hoursBetween(val('horaInicio'), val('horaFin'));
  const estFuel = s.rendimiento > 0 ? (km / s.rendimiento) * s.precioLitro : 0;
  const fuel = val('combustible') === '' ? estFuel : num('combustible');
  const maint = km * s.mantKm;
  const autoComm = num('bruta') * s.comisionPct / 100;
  const comm = val('comision') === '' ? autoComm : num('comision');
  const net = Math.max(0, num('bruta') - fuel - maint - comm);
  const goal = num('metaDia');
  $('actualHours').textContent = h.toFixed(2) + ' h';
  $('actualKm').textContent = km.toFixed(1) + ' km';
  $('actualFuel').textContent = CLP(fuel) + (val('combustible') === '' ? ' · estimado' : ' · real');
  $('actualMaint').textContent = CLP(maint);
  $('actualComm').textContent = CLP(comm);
  $('actualGross').textContent = CLP(num('bruta'));
  $('actualNet').textContent = CLP(net);
  $('actualDiff').textContent = CLP(net - goal);
  $('actualGoalStatus').textContent = goal > 0 ? (net >= goal ? 'META CUMPLIDA' : 'FALTAN ' + CLP(goal - net)) : 'Sin meta';
  return { km, h, fuel, maint, comm, net };
}

function setInitialFieldsLocked(locked) {
  ['metaDia','horasPlan','horaInicio','kmInicio'].forEach(id => {
    const el = $(id);
    if (el) el.disabled = locked;
  });
}

function setStartMode() {
  closeFormOpen = false;
  $('workId').value = '';
  $('closingPanel').classList.add('hidden');
  $('workSubmit').classList.remove('hidden');
  $('workSubmit').textContent = 'Iniciar jornada';
  $('workFinish').classList.add('hidden');
  $('closeDay').classList.add('hidden');
  $('workCancel').classList.add('hidden');
  $('workFormTitle').textContent = 'Iniciar jornada de hoy';
  $('closingNote').textContent = 'La jornada aún no está iniciada.';
  $('fecha').disabled = true;
  setInitialFieldsLocked(false);
}

function setActiveMode(r, openClose = false) {
  closeFormOpen = openClose;
  $('workId').value = r.id;
  $('fecha').value = r.fecha;
  $('fecha').disabled = true;
  setInitialFieldsLocked(true);
  $('workSubmit').classList.add('hidden');
  $('workFinish').classList.toggle('hidden', openClose);
  $('workFinish').textContent = 'Terminar jornada';
  $('workCancel').classList.remove('hidden');
  $('workFormTitle').textContent = 'Jornada en curso';
  $('closingNote').textContent = openClose
    ? 'Completa los datos reales y pulsa “Cerrar día”.'
    : 'Jornada guardada. Pulsa “Terminar jornada” para abrir el formulario de cierre.';
  if (openClose) {
    $('closingPanel').classList.remove('hidden');
    $('closeDay').classList.remove('hidden');
    $('closeDay').textContent = 'Cerrar día';
  } else {
    $('closingPanel').classList.add('hidden');
    $('closeDay').classList.add('hidden');
  }
}

function setClosedEditMode(r) {
  closeFormOpen = true;
  $('workId').value = r.id;
  $('fecha').disabled = false;
  setInitialFieldsLocked(true);
  $('closingPanel').classList.remove('hidden');
  $('workFormTitle').textContent = 'Editar jornada cerrada';
  $('workSubmit').classList.add('hidden');
  $('workFinish').classList.add('hidden');
  $('closeDay').classList.remove('hidden');
  $('closeDay').textContent = 'Guardar cambios';
  $('workCancel').classList.remove('hidden');
  $('closingNote').textContent = 'Edita los datos reales y guarda nuevamente el cierre.';
  renderClosingAnalysis(r);
}

function clearForm() {
  $('workForm').reset();
  $('workId').value = '';
  $('fecha').value = today();
  $('fecha').disabled = true;
  $('metaDia').value = localStorage.getItem('last_goal') || '';
  setStartMode();
  renderProjection();
  actualCalc();
  $('closingAnalysis').innerHTML = '';
}

function fillRecord(r) {
  $('workId').value = r.id;
  $('fecha').value = r.fecha;
  $('metaDia').value = r.meta_dia ?? '';
  $('horasPlan').value = r.horas_planificadas ?? '';
  $('horaInicio').value = r.hora_inicio?.slice(0,5) || '';
  $('horaFin').value = r.hora_fin?.slice(0,5) || '';
  $('kmInicio').value = r.km_inicio ?? '';
  $('kmFinal').value = r.km_final ?? '';
  $('viajes').value = r.viajes ?? '';
  $('bruta').value = r.ganancia_bruta ?? '';
  $('combustible').value = r.combustible ?? '';
  $('comision').value = r.comision_app ?? '';
  $('notas').value = r.notas || '';
  renderProjection(projectionFromRecord(r));
  actualCalc();
}

function projectionFromRecord(r) {
  const p = projectionFromValues(Number(r.meta_dia||0), Number(r.horas_planificadas||0));
  if (r.plan_horas_meta != null) p.needHours = Number(r.plan_horas_meta);
  if (r.plan_viajes != null) p.trips = Number(r.plan_viajes);
  if (r.plan_km != null) p.km = Number(r.plan_km);
  if (r.plan_combustible != null) p.fuel = Number(r.plan_combustible);
  if (r.plan_mantenimiento != null) p.maint = Number(r.plan_mantenimiento);
  if (r.plan_ganancia_bruta != null) p.grossProjected = Number(r.plan_ganancia_bruta);
  if (r.plan_ganancia_neta != null) p.net = Number(r.plan_ganancia_neta);
  return p;
}

function loadTodayActive() {
  const active = cache.find(r => r.fecha === today() && r.estado === 'en_curso');
  if (active) { fillRecord(active); setActiveMode(active, closeFormOpen); }
  else { clearForm(); }
}

function validateStart() {
  if ($('fecha').value !== today()) return 'La jornada solo puede iniciarse con la fecha actual.';
  if (val('metaDia') === '') return 'Ingresa la meta del día.';
  if (val('horasPlan') === '') return 'Ingresa las horas de trabajo planificadas.';
  if (val('horaInicio') === '') return 'Ingresa la hora de inicio.';
  if (val('kmInicio') === '') return 'Ingresa el kilometraje inicial.';
  if (num('horasPlan') <= 0 || num('horasPlan') > 24) return 'Las horas planificadas deben estar entre 0 y 24.';
  return '';
}

function validateClose() {
  if (val('horaFin') === '') return 'Ingresa la hora de término.';
  if (val('kmFinal') === '') return 'Ingresa el kilometraje final.';
  if (val('viajes') === '') return 'Ingresa los viajes realizados.';
  if (val('bruta') === '') return 'Ingresa la ganancia bruta.';
  if (num('kmFinal') < num('kmInicio')) return 'El kilometraje final no puede ser menor al inicial.';
  const c = actualCalc();
  if (c.h <= 0) return 'La hora de término debe ser posterior a la hora de inicio.';
  return '';
}

$('workForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!db) return setMsg('workMsg', 'Conecta primero la base de datos.');
  if ($('workId').value) return setMsg('workMsg', 'La jornada ya está iniciada. Pulsa “Terminar jornada” para abrir el cierre.');
  const err = validateStart();
  if (err) return setMsg('workMsg', err);
  if (cache.some(r => r.fecha === today() && r.estado === 'en_curso')) return setMsg('workMsg', 'Ya existe una jornada en curso para hoy.');

  const p = projection();
  const payload = {
    fecha: today(),
    meta_dia: num('metaDia'),
    horas_planificadas: num('horasPlan'),
    hora_inicio: val('horaInicio'),
    km_inicio: num('kmInicio'),
    viajes: 0,
    estado: 'en_curso',
    notas: null,
    plan_horas_meta: p.needHours,
    plan_viajes: p.trips,
    plan_km: p.km,
    plan_combustible: p.fuel,
    plan_mantenimiento: p.maint,
    plan_ganancia_bruta: p.grossProjected,
    plan_ganancia_neta: p.net,
    plan_comision: p.grossProjected * settings().comisionPct / 100
  };

  const { data, error } = await db.from('jornadas_trabajo').insert(payload).select().single();
  if (error) return setMsg('workMsg', error.message);
  localStorage.setItem('last_goal', String(payload.meta_dia));
  await refresh();
  const r = cache.find(x => String(x.id) === String(data.id)) || data;
  fillRecord(r);
  setActiveMode(r, false);
  renderProjection(projectionFromRecord(r));
  setMsg('workMsg', 'Jornada iniciada y guardada en Supabase. El plan quedó congelado para esta jornada.');
  $('workFormTitle').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('workFinish').addEventListener('click', () => {
  const r = cache.find(x => String(x.id) === String($('workId').value));
  if (!r) return setMsg('workMsg', 'No se encontró la jornada en curso. Actualiza la aplicación.');
  setActiveMode(r, true);
  actualCalc();
  $('closingPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setMsg('workMsg', 'Formulario de cierre abierto. Completa los datos reales y pulsa “Cerrar día”.');
});

async function finishCurrent() {
  if (!db) return setMsg('workMsg', 'Conecta primero la base de datos.');
  const id = $('workId').value;
  const current = cache.find(r => String(r.id) === String(id));
  if (!current) return setMsg('workMsg', 'No se encontró la jornada.');
  const err = validateClose();
  if (err) return setMsg('workMsg', err);
  const c = actualCalc();
  const payload = {
    hora_fin: val('horaFin'),
    km_final: num('kmFinal'),
    horas_trabajadas: c.h,
    km_recorridos: c.km,
    viajes: Math.round(num('viajes')),
    combustible: c.fuel,
    mantenimiento: c.maint,
    ganancia_bruta: num('bruta'),
    comision_app: c.comm,
    ganancia_neta: c.net,
    notas: val('notas') || null,
    estado: 'cerrada',
    updated_at: new Date().toISOString()
  };
  const { error } = await db.from('jornadas_trabajo').update(payload).eq('id', id);
  if (error) return setMsg('workMsg', error.message);
  await refresh();
  const closed = cache.find(r => String(r.id) === String(id));
  if (closed) {
    fillRecord(closed);
    setClosedEditMode(closed);
    renderClosingAnalysis(closed);
  }
  renderDashboard();
  setMsg('workMsg', 'Día cerrado correctamente. La jornada quedó almacenada en el historial.');
}

$('closeDay').addEventListener('click', finishCurrent);
$('workCancel').addEventListener('click', () => { loadTodayActive(); setMsg('workMsg', 'Operación cancelada.'); });

function renderClosingAnalysis(r) {
  const s = settings();
  const goal = Number(r.meta_dia || 0);
  const plan = {
    net:Number(r.plan_ganancia_neta ?? 0), gross:Number(r.plan_ganancia_bruta ?? 0), hours:Number(r.horas_planificadas || 0),
    trips:Number(r.plan_viajes ?? 0), km:Number(r.plan_km ?? 0), fuel:Number(r.plan_combustible ?? 0), maint:Number(r.plan_mantenimiento ?? 0),
    comm:Number(r.plan_comision ?? (Number(r.plan_ganancia_bruta ?? 0) * s.comisionPct / 100))
  };
  const real = { net:Number(r.ganancia_neta || 0), gross:Number(r.ganancia_bruta || 0), hours:Number(r.horas_trabajadas || 0), trips:Number(r.viajes || 0), km:Number(r.km_recorridos || 0), fuel:Number(r.combustible || 0), maint:Number(r.mantenimiento || 0), comm:Number(r.comision_app || 0) };
  const rows = [
    ['Meta del día', goal, real.net, '$'], ['Ganancia neta', plan.net, real.net, '$'], ['Ganancia bruta', plan.gross, real.gross, '$'],
    ['Horas', plan.hours, real.hours, 'h'], ['Viajes', plan.trips, real.trips, 'viajes'], ['Kilómetros', plan.km, real.km, 'km'],
    ['Combustible', plan.fuel, real.fuel, '$'], ['Mantenimiento', plan.maint, real.maint, '$'], ['Comisión', plan.comm, real.comm, '$']
  ];
  const fmt = (v,u) => u === '$' ? CLP(v) : Number(v).toFixed(2) + ' ' + u;
  $('closingAnalysis').innerHTML = '<h3>Análisis de la jornada</h3><p class="muted">Comparación entre la meta, el plan guardado al iniciar y el resultado real al cerrar el día.</p><div class="table-scroll"><table><thead><tr><th>Indicador</th><th>Meta / plan</th><th>Real</th><th>Diferencia</th></tr></thead><tbody>' + rows.map(([label,p,r,u]) => {
    const base = label === 'Meta del día' ? p : p;
    const diff = r - base;
    const pct = base ? diff / base * 100 : 0;
    return '<tr><td>'+label+'</td><td>'+fmt(base,u)+'</td><td>'+fmt(r,u)+'</td><td class="'+(diff>=0?'positive':'negative')+'">'+(diff>=0?'+':'')+fmt(diff,u)+' ('+pct.toFixed(0)+'%)</td></tr>';
  }).join('') + '</tbody></table></div>';
}

function monthRows() { const m = $('historyMonth').value; return cache.filter(r => r.fecha.startsWith(m)).sort((a,b) => b.fecha.localeCompare(a.fecha)); }
function renderHistory() {
  const rows = monthRows();
  $('historialLista').innerHTML = rows.length ? rows.map(r => {
    const closed = r.estado === 'cerrada';
    return '<div class="row"><div class="row-main"><b>'+esc(r.fecha)+' · '+esc(r.hora_inicio?.slice(0,5))+(r.hora_fin?'–'+esc(r.hora_fin.slice(0,5)):'')+'</b><div>'+ (closed?'Cerrada':'En curso') +' · Meta '+CLP(r.meta_dia)+' · Plan '+Number(r.horas_planificadas||0).toFixed(2)+' h</div>'+(closed?'<small>'+Number(r.horas_trabajadas||0).toFixed(2)+' h · '+Number(r.km_recorridos||0).toFixed(1)+' km · '+Number(r.viajes||0)+' viajes · Neto '+CLP(r.ganancia_neta)+'</small>':'<small>Jornada pendiente de cierre</small>')+'</div><div class="row-right"><strong class="'+(closed?(Number(r.ganancia_neta)>=Number(r.meta_dia)?'positive':'negative'):'')+'">'+(closed?CLP(r.ganancia_neta):'EN CURSO')+'</strong><div class="actions"><button type="button" class="small history-edit" data-id="'+r.id+'">'+(closed?'Editar':'Terminar jornada')+'</button><button type="button" class="small danger history-delete" data-id="'+r.id+'">Borrar</button></div></div></div>';
  }).join('') : '<p class="muted">Sin jornadas para este mes.</p>';
}

$('historialLista').addEventListener('click', (e) => {
  const edit = e.target.closest('.history-edit');
  const del = e.target.closest('.history-delete');
  if (edit) {
    const r = cache.find(x => String(x.id) === String(edit.dataset.id));
    if (!r) return;
    fillRecord(r);
    document.querySelector('[data-tab="jornadas"]').click();
    if (r.estado === 'en_curso') setActiveMode(r, true); else setClosedEditMode(r);
    $('closingPanel').scrollIntoView({ behavior:'smooth', block:'start' });
  }
  if (del) window.deleteWork(del.dataset.id);
});

window.deleteWork = async (id) => {
  if (!confirm('¿Borrar esta jornada?')) return;
  const { error } = await db.from('jornadas_trabajo').delete().eq('id', id);
  if (error) return alert(error.message);
  await refresh();
  loadTodayActive();
};

function summary(m) {
  const rs = cache.filter(r => r.fecha.startsWith(m) && r.estado === 'cerrada');
  const sum = (k) => rs.reduce((a,r) => a + Number(r[k] || 0), 0);
  return { rs, h:sum('horas_trabajadas'), km:sum('km_recorridos'), trips:sum('viajes'), gross:sum('ganancia_bruta'), net:sum('ganancia_neta'), fuel:sum('combustible'), maint:sum('mantenimiento'), comm:sum('comision_app'), goals:sum('meta_dia') };
}

function todayRecord() { return cache.find(r => r.fecha === today()) || null; }

function renderTodayDashboard() {
  const r = todayRecord();
  $('dashboardTodayLabel').textContent = new Date().toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  if (!r) {
    $('dashboardTurnStatus').textContent = 'Sin jornada';
    $('todayCompareBars').innerHTML = '<p class="muted">Inicia la jornada de hoy para generar la proyección.</p>';
    $('todayComparisonTable').innerHTML = '<tr><td colspan="4">Sin jornada registrada hoy.</td></tr>';
    $('todayCostTable').innerHTML = '<tr><td colspan="4">Sin datos.</td></tr>';
    return;
  }
  const s = settings();
  const plan = projectionFromRecord(r);
  const closed = r.estado === 'cerrada';
  const real = { hours:Number(r.horas_trabajadas||0), trips:Number(r.viajes||0), km:Number(r.km_recorridos||0), gross:Number(r.ganancia_bruta||0), net:Number(r.ganancia_neta||0), fuel:Number(r.combustible||0), maint:Number(r.mantenimiento||0), comm:Number(r.comision_app||0) };
  $('dashboardTurnStatus').textContent = closed ? (real.net >= Number(r.meta_dia||0) ? 'META CUMPLIDA' : 'META NO ALCANZADA') : 'EN CURSO';
  const rows = [['Meta neta',Number(r.meta_dia||0),closed?real.net:null,'$'],['Horas',Number(r.horas_planificadas||0),closed?real.hours:null,'h'],['Viajes',plan.trips,closed?real.trips:null,'viajes'],['Kilómetros',plan.km,closed?real.km:null,'km'],['Ganancia bruta',plan.grossProjected,closed?real.gross:null,'$']];
  $('todayComparisonTable').innerHTML = rows.map(([label,p,rr,u]) => { const d=rr===null?null:rr-p; const pct=d!==null&&p?d/p*100:0; const f=v=>u==='$'?CLP(v):Number(v).toFixed(1)+' '+u; return '<tr><td>'+label+'</td><td>'+f(p)+'</td><td>'+(rr===null?'—':f(rr))+'</td><td class="'+(d===null?'':d>=0?'positive':'negative')+'">'+(d===null?'Pendiente':(d>=0?'+':'')+f(d)+' ('+pct.toFixed(0)+'%)')+'</td></tr>'; }).join('');
  const max = Math.max(Number(r.meta_dia||0), plan.net, real.net, 1);
  $('todayCompareBars').innerHTML = '<div class="bar-row"><span>Meta</span><div class="bar-track"><div class="bar goal" style="width:'+Math.min(100,Number(r.meta_dia||0)/max*100)+'%"></div></div><b>'+CLP(r.meta_dia)+'</b></div><div class="bar-row"><span>Plan</span><div class="bar-track"><div class="bar plan" style="width:'+Math.min(100,plan.net/max*100)+'%"></div></div><b>'+CLP(plan.net)+'</b></div><div class="bar-row"><span>Real</span><div class="bar-track"><div class="bar actual" style="width:'+(closed?Math.min(100,real.net/max*100):0)+'%"></div></div><b>'+(closed?CLP(real.net):'Pendiente')+'</b></div>';
  const planComm = Number(r.plan_comision ?? (plan.grossProjected * s.comisionPct / 100));
  const costs = [['Combustible',plan.fuel,closed?real.fuel:null],['Mantenimiento',plan.maint,closed?real.maint:null],['Comisión',planComm,closed?real.comm:null]];
  $('todayCostTable').innerHTML = costs.map(([label,p,rr]) => { const d=rr===null?null:rr-p; return '<tr><td>'+label+'</td><td>'+CLP(p)+'</td><td>'+(rr===null?'—':CLP(rr))+'</td><td class="'+(d===null?'':d>=0?'negative':'positive')+'">'+(d===null?'Pendiente':(d>=0?'+':'')+CLP(d))+'</td></tr>'; }).join('');
}

function renderDashboard() {
  const m = $('dashboardMonth').value;
  const s = summary(m);
  $('dNet').textContent = CLP(s.net); $('dGross').textContent = CLP(s.gross); $('dHours').textContent = s.h.toFixed(2)+' h'; $('dTrips').textContent = s.trips; $('dKm').textContent = s.km.toFixed(1)+' km'; $('dHourly').textContent = CLP(s.h?s.net/s.h:0);
  $('dFuel').textContent = CLP(s.fuel); $('dMaintenance').textContent = CLP(s.maint); $('dCommission').textContent = CLP(s.comm); $('dCosts').textContent = CLP(s.fuel+s.maint+s.comm);
  const goalDays = s.rs.filter(r => Number(r.meta_dia)>0).length; const hit = s.rs.filter(r => Number(r.meta_dia)>0 && Number(r.ganancia_neta)>=Number(r.meta_dia)).length;
  $('dashboardAdvice').textContent = `${s.rs.length} jornadas cerradas · ${hit}/${goalDays} metas cumplidas · Neto promedio/hora ${CLP(s.h?s.net/s.h:0)}.`;
  renderComparison(m); renderTodayDashboard();
}

function renderComparison(m) {
  const s = summary(m);
  const planHours = s.rs.reduce((a,r)=>a+Number(r.horas_planificadas||0),0);
  const planTrips = s.rs.reduce((a,r)=>a+Number(r.plan_viajes||0),0);
  const planKm = s.rs.reduce((a,r)=>a+Number(r.plan_km||0),0);
  const planGross = s.rs.reduce((a,r)=>a+Number(r.plan_ganancia_bruta||0),0);
  const planNet = s.rs.reduce((a,r)=>a+Number(r.plan_ganancia_neta||0),0);
  const rows = [['Horas',s.h,planHours,'h'],['Viajes',s.trips,planTrips,'viajes'],['Kilómetros',s.km,planKm,'km'],['Ganancia bruta',s.gross,planGross,'$'],['Ganancia neta',s.net,planNet,'$']];
  $('comparisonTable').innerHTML = rows.map(([label,real,plan,u])=>{const d=real-plan,p=plan?d/plan*100:0;const f=v=>u==='$'?CLP(v):Number(v).toFixed(1)+' '+u;return '<tr><td>'+label+'</td><td>'+f(real)+'</td><td>'+f(plan)+'</td><td class="'+(d>=0?'positive':'negative')+'">'+(d>=0?'+':'')+f(d)+' ('+p.toFixed(0)+'%)</td></tr>';}).join('') || '<tr><td colspan="4">Sin datos cerrados.</td></tr>';
  const max = Math.max(s.net,planNet,1);
  $('compareBars').innerHTML = '<div class="bar-row"><span>Plan neto</span><div class="bar-track"><div class="bar plan" style="width:'+Math.min(100,planNet/max*100)+'%"></div></div><b>'+CLP(planNet)+'</b></div><div class="bar-row"><span>Real neto</span><div class="bar-track"><div class="bar actual" style="width:'+Math.min(100,s.net/max*100)+'%"></div></div><b>'+CLP(s.net)+'</b></div>';
}

$('dashboardMonth').onchange = renderDashboard;
$('historyMonth').onchange = renderHistory;

function ym(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function monthLabel(d){return d.toLocaleDateString('es-CL',{month:'long',year:'numeric'}).replace(/^./,x=>x.toUpperCase());}
function renderCalendar(){const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth(),month=ym(calendarMonth),first=new Date(y,m,1),start=addDays(first,-first.getDay()),days=Array.from({length:42},(_,i)=>addDays(start,i));$('calendarMonth').textContent=monthLabel(calendarMonth);const by={};cache.filter(r=>r.fecha.startsWith(month)).forEach(r=>(by[r.fecha]??=[]).push(r));const s=summary(month);$('calNet').textContent=CLP(s.net);$('calHours').textContent=s.h.toFixed(2)+' h';$('calKm').textContent=s.km.toFixed(1)+' km';$('calTrips').textContent=s.trips;$('calendarGrid').innerHTML=days.map(d=>{const k=dateKey(d),rs=by[k]||[],inm=d.getMonth()===m;return `<div class="calendar-day ${inm?'':'outside'} ${k===today()?'today-day':''}"><div class="day-head"><span class="day-number">${d.getDate()}</span>${k===today()?'<span class="today-dot">HOY</span>':''}</div>${rs.length?`<div class="day-line income">${CLP(rs.reduce((a,r)=>a+Number(r.ganancia_neta||0),0))}</div><div class="day-event ingreso">${rs.length} jornada${rs.length>1?'s':''}</div><div class="day-event">${rs.reduce((a,r)=>a+Number(r.viajes||0),0)} viajes · ${rs.reduce((a,r)=>a+Number(r.km_recorridos||0),0).toFixed(1)} km</div><div class="day-event">Meta ${CLP(rs.reduce((a,r)=>a+Number(r.meta_dia||0),0))}</div>`:''}</div>`}).join('');}
$('calPrev').onclick=()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);renderCalendar();};$('calNext').onclick=()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);renderCalendar();};$('calToday').onclick=()=>{calendarMonth=new Date();renderCalendar();};

$('settingsForm').onsubmit=(e)=>{e.preventDefault();localStorage.setItem('work_settings',JSON.stringify({vehiculo:val('vehiculo'),rendimiento:num('rendimiento'),precioLitro:num('precioLitro'),mantKm:num('mantKm'),comisionPct:num('comisionPct'),netHora:num('netHora'),viajesHora:num('viajesHora'),kmHora:num('kmHora')}));setMsg('settingsMsg','Configuración guardada.');renderProjection();actualCalc();renderDashboard();};

async function refresh(){
  const {data,error}=await db.from('jornadas_trabajo').select('*').order('fecha',{ascending:false}).order('created_at',{ascending:false});
  if(error){console.error(error);return setMsg('configMsg','Conectado, pero no se pudieron leer las jornadas: '+error.message);}
  cache=data||[];
  renderDashboard(); renderHistory(); renderCalendar();
  if(document.querySelector('[data-tab="jornadas"]')?.classList.contains('active')) loadTodayActive();
}

['metaDia','horasPlan','horaInicio','kmInicio','horaFin','kmFinal','viajes','combustible','bruta','comision'].forEach(id=>$(id).addEventListener('input',()=>{renderProjection();actualCalc();}));

configLoad();
setStartMode();
renderProjection();
actualCalc();
const versionEl = $('appVersion'); if (versionEl) versionEl.textContent = VERSION;
const versionFooter = $('versionFooter'); if (versionFooter) versionFooter.textContent = 'Versión ' + VERSION;
if(localStorage.getItem('work_url')&&localStorage.getItem('work_key')) connect();
