# Control de Trabajo V4

Flujo de jornada en dos etapas:
1. **Iniciar turno:** fecha actual, meta, horas planificadas, hora de inicio y km inicial. Se guarda inmediatamente en Supabase como `en_curso` y genera el plan proyectado.
2. **Terminar turno:** se completa hora fin, km final, viajes, ganancia bruta y opcionalmente combustible/comisión reales. Se guarda como `cerrada` y calcula el resultado real.

El panel **Resumen** muestra el estado de hoy y una comparación gráfica y tabular de meta/plan versus realidad. También mantiene resumen mensual, historial y calendario.
