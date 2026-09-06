# Control de Trabajo V6

Versión orientada al flujo real de una jornada:

1. **Iniciar jornada**: fecha actual, meta, horas planificadas, hora de inicio y km inicial. Se guarda inmediatamente en Supabase con estado `en_curso`.
2. **Plan proyectado**: calcula horas necesarias para la meta, viajes, km, combustible, mantenimiento y ganancias proyectadas.
3. **Terminar jornada**: completa hora fin, km final, viajes, ganancia bruta y opcionalmente combustible/comisión reales. Calcula los costos y la ganancia neta, guarda el cierre y cambia el estado a `cerrada`.
4. **Análisis**: muestra Meta vs Plan vs Real en la pantalla de jornada y en el primer panel de Resumen.
5. Mantiene historial, calendario, configuración y acumulados mensuales.

No requiere una tabla nueva si ya se ejecutó la migración V3/V4 de `jornadas_trabajo`.
