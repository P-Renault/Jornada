# Control de Trabajo V7

Corrige el inicio de jornada: el INSERT ya no envía valores NULL a campos de cierre.

Flujo:
1. Iniciar jornada: fecha, meta, horas planificadas, hora inicio y km inicial.
2. Se guarda en Supabase como en_curso.
3. Al finalizar se completan hora fin, km final, viajes, ganancia bruta y opcionales.
4. Terminar jornada actualiza el registro y calcula el resultado real.
5. Resumen compara meta, plan y realidad.

Ejecutar `supabase_jornadas.sql` una vez en Supabase.
