/* B20 · S21 · Fix de activación del módulo Calendario
   Corrige la navegación dinámica del botón agregado por S21.
   Debe cargarse DESPUÉS de s21-calendario-2.js.
*/
(function () {
  'use strict';

  function activateCalendar() {
    const section = document.getElementById('s21calendario');
    const button = document.querySelector('nav button[data-tab="s21calendario"]');
    if (!section || !button) return false;

    document.querySelectorAll('.tab').forEach(tab => {
      tab.hidden = tab.id !== 's21calendario';
    });

    document.querySelectorAll('nav button').forEach(btn => {
      btn.classList.toggle('active', btn === button);
    });

    const badge = document.getElementById('appBadge');
    const layer = document.getElementById('appLayer');
    const footer = document.getElementById('footerLabel');

    if (badge) badge.textContent = 'B20 · S21';
    if (layer) layer.textContent = 'Capa 21 · calendario operativo';
    if (footer) footer.textContent = 'B20 · Sprint S21 · calendario operativo · v1.0';

    button.onclick = activateCalendar;
    return true;
  }

  function install() {
    if (activateCalendar()) return;
    setTimeout(install, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
