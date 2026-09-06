# Control de Trabajo V10.0

Flujo de jornada en dos etapas:
1. Iniciar jornada: fecha actual, meta, horas planificadas, hora de inicio y km inicial. Se guarda inmediatamente en Supabase como `en_curso` y congela el plan proyectado.
2. Terminar jornada: abre el formulario de cierre sin guardar todavía. Se completan hora fin, km final, viajes, ganancia bruta y opcionalmente combustible/comisión/nota.
3. Cerrar día: guarda el cierre, cambia el estado a `cerrada`, conserva el plan original y muestra Meta vs Plan vs Real.
4. Historial: cada jornada cerrada queda acumulada por fecha; una jornada en curso se puede abrir para completar el cierre.
5. Resumen: muestra la jornada actual, comparación gráfica, costos y resumen mensual.
6. Versión visible: V10.0 en la cabecera y pie.

Ejecuta `supabase_jornadas.sql` en el SQL Editor de Supabase.
