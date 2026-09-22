/* B20 S19 · Producción: autenticación, sesión persistente, RLS y sincronización */
(function(){
'use strict';
const KEYS=[
'b20s2_efficiencyKmL','b20s2_fuelPrice','b20s2_maintenancePerKm','b20s2_commissionPct','b20s2_netPerHour','b20s2_tripsPerHour','b20s2_kmPerHour','b20s2_saved_at','b20s2_url','b20s2_key',
'b20s3_marca','b20s3_modelo','b20s3_anio','b20s3_patente','b20s3_kmReferencia','b20s3_tanqueLitros','b20s3_saved_at',
'b20s4_fuel_records','b20s5_maintenance_records','b20s5_component_records','b20s6_vehicle_documents','b20s7_service_records','b20s8_operating_expenses','b20s9_fund_movements','b20s9_future_needs','b20s10_credit_movements','b20s11_budget_lines','b20s11_income_records','b20s11_income_goal','b20s15_action_items'
];
const DATA_KEYS=KEYS.filter(k=>!['b20s2_url','b20s2_key'].includes(k));
const nativeCreate=window.supabase.createClient.bind(window.supabase);
const REDIRECT_URL='https://p-renault.github.io/Jornada/';
let client=null,user=null,timer=null,hydrating=false,recoveryMode=false,authBusy=false;
const last=new Map();

function cfg(){return {url:localStorage.getItem('b20s2_url')||'',key:localStorage.getItem('b20s2_key')||''};}
function status(t,kind){const e=document.getElementById('s19Status');if(e){e.textContent=t||'';e.dataset.kind=kind||'';}}
function makeClient(){
  const {url,key}=cfg();
  if(!/^https:\/\/[^\s]+\.supabase\.co$/.test(url)||!key)return null;
  if(!client)client=nativeCreate(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return client;
}
function sessionUser(){return user;}
async function refreshUser(){
  const c=makeClient();
  if(!c){user=null;return null;}
  const r=await c.auth.getUser();
  if(r.error&&r.error.message!=='Auth session missing!')throw r.error;
  user=r.data.user||null;
  return user;
}
function scopeBuilder(builder,table){
  if(table!=='jornadas_trabajo')return builder;
  return new Proxy(builder,{
    get(target,prop,receiver){
      const value=Reflect.get(target,prop,receiver);
      if(typeof value!=='function')return value;
      if(prop==='select'||prop==='delete'||prop==='update')return function(...args){
        const result=value.apply(target,args);
        const b=result&&typeof result.eq==='function'?result:target;
        const id=sessionUser()?.id;
        return id?b.eq('user_id',id):b;
      };
      if(prop==='insert')return function(...args){
        const id=sessionUser()?.id;
        if(id&&args[0]){
          const add=x=>({...x,user_id:id});
          args[0]=Array.isArray(args[0])?args[0].map(add):add(args[0]);
        }
        return value.apply(target,args);
      };
      return value.bind(target);
    }
  });
}
window.supabase.createClient=function(url,key,opts){
  const raw=nativeCreate(url,key,{...(opts||{}),auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,...((opts||{}).auth||{})}});
  return new Proxy(raw,{get(target,prop,receiver){
    if(prop!=='from')return Reflect.get(target,prop,receiver);
    return table=>scopeBuilder(target.from(table),table);
  }});
};
async function cloudRows(){
  if(!user)return [];
  const c=makeClient();
  const r=await c.from('b20_user_data').select('data_key,data,updated_at').eq('user_id',user.id);
  if(r.error)throw r.error;
  return r.data||[];
}
async function push(key){
  if(hydrating||!user||!DATA_KEYS.includes(key))return;
  const raw=localStorage.getItem(key);
  if(raw===null)return;
  let data;try{data=JSON.parse(raw);}catch{return;}
  const sig=JSON.stringify(data);
  if(last.get(key)===sig)return;
  const c=makeClient();
  const r=await c.from('b20_user_data').upsert({user_id:user.id,data_key:key,data,updated_at:new Date().toISOString()},{onConflict:'user_id,data_key'});
  if(r.error)throw r.error;
  last.set(key,sig);
}
async function pushAll(){for(const k of DATA_KEYS)await push(k);}
async function hydrateOrMigrate(){
  const rows=await cloudRows();
  if(rows.length){
    hydrating=true;
    try{
      for(const row of rows){
        if(!DATA_KEYS.includes(row.data_key))continue;
        localStorage.setItem(row.data_key,JSON.stringify(row.data));
        last.set(row.data_key,JSON.stringify(row.data));
      }
    }finally{hydrating=false;}
    status('Sesión recuperada · datos de Supabase cargados.','ok');
    return 'cloud';
  }
  await pushAll();
  status('Cuenta nueva · datos locales iniciales respaldados en Supabase.','ok');
  return 'local';
}
function ui(){
  if(document.getElementById('s19Auth'))return;
  const config=document.getElementById('config'),host=document.createElement('section');
  host.id='s19Auth';host.className='card';
  host.innerHTML=`<h2>Cuenta B20</h2>
  <p class="muted">La sesión se conserva automáticamente en este navegador. No es necesario borrar historial ni caché para volver a entrar.</p>
  <div id="s19Out"><div class="grid">
    <label>Correo electrónico<input id="s19Email" type="email" autocomplete="email"></label>
    <label>Contraseña<input id="s19Pass" type="password" autocomplete="current-password"></label>
  </div><div class="row">
    <button id="s19Login">Iniciar sesión</button><button id="s19Signup" class="secondary">Crear cuenta</button><button id="s19Reset" class="secondary">Recuperar contraseña</button>
  </div></div>
  <div id="s19Recovery" hidden>
    <h3>Crear nueva contraseña</h3>
    <p class="muted">El enlace de recuperación fue validado. Define una nueva contraseña para tu cuenta.</p>
    <div class="grid">
      <label>Nueva contraseña<input id="s19NewPass" type="password" autocomplete="new-password" minlength="6"></label>
      <label>Confirmar contraseña<input id="s19NewPass2" type="password" autocomplete="new-password" minlength="6"></label>
    </div>
    <div class="row"><button id="s19SavePass">Guardar nueva contraseña</button><button id="s19CancelRecovery" class="secondary">Cancelar</button></div>
  </div>
  <div id="s19In" hidden><div class="row"><strong id="s19User"></strong><button id="s19Logout" class="secondary">Cerrar sesión</button></div>
    <div class="row"><button id="s19Sync">Sincronizar ahora</button></div>
  </div>
  <div id="s19Status" class="muted"></div>`;
  config?.parentNode?.insertBefore(host,config);
  document.getElementById('s19Login').onclick=login;
  document.getElementById('s19Signup').onclick=signup;
  document.getElementById('s19Reset').onclick=reset;
  document.getElementById('s19SavePass').onclick=saveNewPassword;
  document.getElementById('s19CancelRecovery').onclick=cancelRecovery;
  document.getElementById('s19Logout').onclick=logout;
  document.getElementById('s19Sync').onclick=()=>pushAll().then(()=>status('Sincronización completada.','ok')).catch(e=>status(e.message,'error'));
}
function view(){
  const out=document.getElementById('s19Out'),inn=document.getElementById('s19In'),rec=document.getElementById('s19Recovery'),app=document.getElementById('app'),config=document.getElementById('config');
  if(!out||!inn||!rec)return;
  if(recoveryMode){
    out.hidden=true;inn.hidden=true;rec.hidden=false;
    if(app)app.hidden=true;if(config)config.hidden=true;
    return;
  }
  out.hidden=!!user;inn.hidden=!user;rec.hidden=true;
  if(user){document.getElementById('s19User').textContent=user.email||'Cuenta B20';if(app)app.hidden=false;if(config)config.hidden=true;}
  else{if(app)app.hidden=true;if(config)config.hidden=false;}
}
async function login(){
  try{
    const c=makeClient();if(!c)throw Error('Primero ingresa URL y Publishable Key en la conexión Supabase.');
    const email=document.getElementById('s19Email').value.trim(),password=document.getElementById('s19Pass').value;
    if(!email||!password)throw Error('Ingresa correo y contraseña.');
    const r=await c.auth.signInWithPassword({email,password});
    if(r.error)throw r.error;
    status('Inicio de sesión correcto.','ok');
  }catch(e){status(e.message,'error');}
}
async function signup(){
  try{
    const c=makeClient();if(!c)throw Error('Primero ingresa URL y Publishable Key.');
    const email=document.getElementById('s19Email').value.trim(),password=document.getElementById('s19Pass').value;
    if(!email||password.length<6)throw Error('Correo válido y contraseña de al menos 6 caracteres.');
    const r=await c.auth.signUp({email,password});
    if(r.error)throw r.error;
    if(r.data.session)status('Cuenta creada e iniciada.','ok');
    else status('Cuenta creada. Revisa el correo para confirmar la cuenta.','ok');
  }catch(e){status(e.message,'error');}
}
async function reset(){
  try{
    const c=makeClient();if(!c)throw Error('Primero configura Supabase.');
    const email=document.getElementById('s19Email').value.trim();
    if(!email)throw Error('Ingresa tu correo.');
    const r=await c.auth.resetPasswordForEmail(email,{redirectTo:REDIRECT_URL});
    if(r.error)throw r.error;
    status('Enlace de recuperación enviado al correo.','ok');
  }catch(e){status(e.message,'error');}
}
async function saveNewPassword(){
  if(authBusy)return;
  authBusy=true;
  try{
    const c=makeClient();if(!c)throw Error('No hay conexión con Supabase.');
    const p1=document.getElementById('s19NewPass').value,p2=document.getElementById('s19NewPass2').value;
    if(p1.length<6)throw Error('La nueva contraseña debe tener al menos 6 caracteres.');
    if(p1!==p2)throw Error('Las contraseñas no coinciden.');
    const r=await c.auth.updateUser({password:p1});
    if(r.error)throw r.error;
    recoveryMode=false;
    user=r.data.user||user;
    document.getElementById('s19NewPass').value='';
    document.getElementById('s19NewPass2').value='';
    view();
    status('Contraseña actualizada correctamente.','ok');
    await afterAuth();
  }catch(e){status(e.message,'error');}
  finally{authBusy=false;}
}
function showRecovery(){
  recoveryMode=true;
  view();
  status('Recuperación de contraseña activa. Define tu nueva contraseña.','ok');
}
function cancelRecovery(){
  recoveryMode=false;
  if(history.replaceState)history.replaceState({},document.title,REDIRECT_URL);
  view();
}
async function logout(){
  const c=makeClient();if(c)await c.auth.signOut();
  user=null;recoveryMode=false;if(timer)clearInterval(timer);
  view();location.reload();
}
async function afterAuth(){
  if(recoveryMode||!user)return;
  view();
  try{
    await hydrateOrMigrate();
    if(timer)clearInterval(timer);
    timer=setInterval(()=>pushAll().catch(()=>{}),3000);
  }catch(e){status('Sesión activa, pero falló la sincronización: '+e.message,'error');}
}
async function boot(){
  ui();
  const c=makeClient();
  if(!c){view();return;}
  c.auth.onAuthStateChange(async(event,s)=>{
    user=s?.user||null;
    if(event==='PASSWORD_RECOVERY'){showRecovery();return;}
    if(user){await afterAuth();}else{recoveryMode=false;view();}
  });
  try{
    await refreshUser();
    if(user && !recoveryMode)await afterAuth();else view();
  }catch(e){status(e.message,'error');view();}
}
window.B20_AUTH={get user(){return user;},get client(){return makeClient();},get recovery(){return recoveryMode;},sync:pushAll};
window.B20_AUTH_READY=boot();
})();