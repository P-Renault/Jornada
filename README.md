# Control de Trabajo V14.0

Versión definitiva del flujo en dos etapas:
1. Iniciar jornada guarda inmediatamente los datos iniciales y el plan proyectado en Supabase.
2. Terminar jornada abre el formulario de cierre sin cerrar la jornada.
3. Cerrar día guarda los datos reales, cierra la jornada y muestra META vs PLAN vs REAL.
4. Cada jornada cerrada permanece en Historial, Calendario y Resumen mensual.

Sube todos los archivos de esta carpeta a GitHub Pages y ejecuta `supabase_jornadas.sql` en Supabase.


## Corrección V14.0

Flujo definitivo: Iniciar jornada guarda inmediatamente en Supabase y cambia la interfaz a jornada en curso; el formulario de cierre aparece debajo del plan proyectado. Terminar jornada solo abre/focaliza el cierre. Cerrar día actualiza el mismo registro a cerrada y genera el análisis Meta/Plan/Real. El estado se sincroniza al cargar la aplicación para que una jornada en curso no vuelva a mostrar el botón Iniciar. El botón Terminar jornada del Historial abre la jornada específica y su formulario de cierre.
