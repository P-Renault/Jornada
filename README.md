# Control de Trabajo V19.9

Corrección de historial: ahora cada jornada muestra **Borrar jornada** y elimina el registro real de Supabase tras confirmación. Las jornadas en curso conservan **Terminar jornada**.

Flujo: iniciar jornada → guardar plan en Supabase → terminar jornada → completar cierre → cerrar día → guardar resultado → historial.

Ejecuta `supabase_jornadas.sql` en Supabase si necesitas asegurar la política y permiso DELETE.


V19.9 agrega borrado real de jornadas desde Historial, confirmación y validación de DELETE en Supabase, cálculo/guardado explícito de km_recorridos y horas_trabajadas al cerrar, y ganancias netas/brutas acumuladas de todas las jornadas cerradas en Resumen.


V19.9 corrige el cierre cuando km_recorridos u horas_trabajadas son columnas derivadas/generadas en instalaciones previas: primero guarda los datos editables y solo completa las columnas derivadas si la base de datos no las calculó.

V19.9 agrega en el Dashboard un gráfico de líneas de evolución diaria con Meta, Real neto y Gasto de combustible, con selector de últimos 7 o 30 días. Los datos se agregan por fecha y se consultan desde las jornadas cerradas almacenadas en Supabase.
