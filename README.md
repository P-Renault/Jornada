# Control de Trabajo V19.2

Corrección de historial: ahora cada jornada muestra **Borrar jornada** y elimina el registro real de Supabase tras confirmación. Las jornadas en curso conservan **Terminar jornada**.

Flujo: iniciar jornada → guardar plan en Supabase → terminar jornada → completar cierre → cerrar día → guardar resultado → historial.

Ejecuta `supabase_jornadas.sql` en Supabase si necesitas asegurar la política y permiso DELETE.


V19.2 agrega borrado real de jornadas desde Historial, confirmación y validación de DELETE en Supabase, cálculo/guardado explícito de km_recorridos y horas_trabajadas al cerrar, y ganancias netas/brutas acumuladas de todas las jornadas cerradas en Resumen.
