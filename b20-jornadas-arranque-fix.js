/* B20 — Corrección de arranque de jornadas / S19
   Uso:
   1) Mantener el app.js actual.
   2) Cargar este archivo DESPUÉS de app.js en index.html.
   3) No modifica RLS ni la base de datos.

   Objetivo:
   - Esperar a que S19 recupere la sesión de Supabase.
   - Confirmar que existe un usuario autenticado.
   - Volver a ejecutar la conexión/carga de jornadas después de recuperar la sesión.
   - Evitar que el primer intento prematuro de app.js deje rows=[].
*/
(function () {
  'use strict';

  const WAIT_MS = 150;
  const MAX_WAIT_MS = 15000;

  function waitForConnectHandler() {
    return new Promise((resolve, reject) => {
      const started = Date.now();

      const timer = setInterval(() => {
        const connect = document.getElementById('connect');

        if (connect && typeof connect.onclick === 'function') {
          clearInterval(timer);
          resolve(connect);
          return;
        }

        if (Date.now() - started >= MAX_WAIT_MS) {
          clearInterval(timer);
          reject(new Error('No se encontró el botón de conexión de B20.'));
        }
      }, WAIT_MS);
    });
  }

  async function start() {
    try {
      // S19 debe terminar de recuperar la sesión antes de cargar jornadas.
      if (window.B20_AUTH_READY) {
        await window.B20_AUTH_READY;
      }

      const user = window.B20_AUTH?.user;

      if (!user) {
        console.warn('[B20] No hay usuario autenticado; no se fuerza la carga.');
        return;
      }

      const url = localStorage.getItem('b20s2_url');
      const key = localStorage.getItem('b20s2_key');

      if (!url || !key) {
        console.warn('[B20] Faltan las credenciales públicas de Supabase.');
        return;
      }

      const connect = await waitForConnectHandler();

      // Asegurar que el formulario tenga las credenciales guardadas.
      const urlInput = document.getElementById('url');
      const keyInput = document.getElementById('key');

      if (urlInput) urlInput.value = url;
      if (keyInput) keyInput.value = key;

      // app.js ya registró el handler. Ejecutamos nuevamente la carga,
      // ahora con la sesión autenticada disponible para RLS.
      await connect.onclick();

      console.info(
        '[B20] Jornadas cargadas después de recuperar sesión:',
        user.email
      );
    } catch (error) {
      console.error('[B20] Error en corrección de arranque:', error);

      const msg = document.getElementById('msg');
      if (msg) {
        msg.textContent =
          'No se pudo recuperar automáticamente el historial: ' +
          (error?.message || error);
      }
    }
  }

  // Ejecutar después de que el documento y los módulos tengan oportunidad
  // de registrar sus handlers.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(start, WAIT_MS);
    }, { once: true });
  } else {
    setTimeout(start, WAIT_MS);
  }
})();
