# Sprint S02 — Parámetros y configuración B20

## Objetivo
Centralizar y proteger los parámetros que utiliza el motor de planificación de jornadas, sin modificar el esquema de Supabase.

## Alcance
- Namespace local independiente `b20s2_`.
- Validación de parámetros.
- Guardado local explícito.
- Restauración de valores base.
- Exportación JSON.
- Importación JSON validada.
- Resumen de parámetros activos.
- Fecha/hora del último guardado.
- Integración directa con el motor de planificación S01.

## Seguridad de transición
Este sprint no crea tablas ni ejecuta SQL. No modifica `jornadas_trabajo`.

## Criterios de aceptación
1. Los parámetros S01 siguen calculando correctamente.
2. Un cambio de parámetros se conserva al recargar el navegador.
3. Valores inválidos son rechazados.
4. Exportar genera un JSON válido.
5. Importar un JSON válido restaura los parámetros.
6. Restaurar valores base recupera los defaults.
7. Una jornada ya iniciada conserva su plan almacenado.

## Siguiente paso
S03 — vehículo, kilometraje y combustible, sujeto a validación de S02.
