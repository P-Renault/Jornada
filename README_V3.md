# Control de Trabajo V3

Versión orientada a la operación diaria desde teléfono.

## Flujo
1. Al comenzar el día: fecha actual, meta, horas planificadas, hora de inicio y km inicial.
2. La app genera una proyección de horas necesarias, viajes, kilómetros, combustible, mantenimiento, bruto y neto.
3. La jornada puede guardarse inmediatamente como `en_curso`.
4. Al finalizar: editar la jornada y completar hora fin, km final, viajes y ganancia bruta. Combustible y comisión pueden dejarse vacíos para cálculo automático.
5. El Resumen compara plan vs realidad y entrega resultados mensuales.

## Proyección
- Con 3 o más jornadas cerradas, usa promedios históricos de neto/hora, viajes/hora y km/hora.
- Antes de tener suficiente historial, usa los valores configurados.
- Combustible: km proyectados / km/L × precio por litro.
- Mantenimiento: km × costo por km.
- Comisión: porcentaje de la ganancia bruta.

## Supabase
Ejecuta `supabase_jornadas.sql` en SQL Editor. Es una migración; no elimina tablas ni datos existentes.
