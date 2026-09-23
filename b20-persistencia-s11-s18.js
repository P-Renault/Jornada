/* B20 · Persistencia unificada S11–S18 · 1.0
   Complementa S19 sin cambiar RLS ni estructura de tablas.
   Fuentes persistentes:
   - S11 presupuesto/meta/ingresos
   - S12 configuración de proyección
   - S15 acciones
   S13/S14/S16/S18 son módulos derivados/auditoría y se refrescan desde esas fuentes.
*/
(function(){
  'use strict';

  const KEYS=[
    'b20s11_budget_lines',
    'b20s11_income_records',
    'b20s11_income_goal',
    'b20s12_projection_config',
    'b20s15_action_items'
  ];

  let timer=null;
  let ready=false;
  let lastRefresh=0;

  function relevant(k){return KEYS.includes(k);}

  function refreshActiveModule(){
    const now=Date.now();
    if(now-lastRefresh<250)return;
    lastRefresh=now;
    setTimeout(()=>{
      const active=document.querySelector('nav button.active');
      if(active && typeof active.onclick==='function'){
        try{active.onclick();}catch(e){console.warn('[B20 Persistencia] refresco de módulo:',e);}
      }
    },120);
  }

  function queueSync(){
    clearTimeout(timer);
    timer=setTimeout(async()=>{
      try{
        if(window.B20_AUTH?.sync) await window.B20_AUTH.sync();
        refreshActiveModule();
      }catch(e){
        console.warn('[B20 Persistencia S11-S18] sincronización pendiente:',e?.message||e);
      }
    },180);
  }

  async function start(){
    try{
      if(window.B20_AUTH_READY) await window.B20_AUTH_READY;
      ready=!!window.B20_AUTH?.user;
      if(!ready)return;

      /* S19 ya hidrata los datos desde Supabase antes de resolver B20_AUTH_READY.
         Aquí forzamos una sincronización final y refrescamos el módulo visible. */
      if(window.B20_AUTH?.sync) await window.B20_AUTH.sync();
      refreshActiveModule();

      const nativeSet=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        const result=nativeSet.call(this,key,value);
        if(this===localStorage && relevant(key) && ready)queueSync();
        return result;
      };

      const nativeRemove=Storage.prototype.removeItem;
      Storage.prototype.removeItem=function(key){
        const result=nativeRemove.call(this,key);
        if(this===localStorage && relevant(key) && ready)queueSync();
        return result;
      };

      window.addEventListener('storage',e=>{
        if(e.storageArea===localStorage && relevant(e.key))refreshActiveModule();
      });
    }catch(e){
      console.warn('[B20 Persistencia S11-S18] arranque:',e);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();
