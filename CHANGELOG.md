# CHANGELOG S02

## v1.1
- Corregido el manejo de `localStorage`: `null` ya no se convierte en 0 mediante `Number(null)`.
- Restaurar valores base ahora recupera correctamente los defaults B20.
- Corregido título y pie para identificar S02.
- No requiere SQL ni cambios en Supabase.

## v1.0
- Parámetros locales con namespace `b20s2_`.
- Guardar/restaurar/exportar/importar.

- v1.2: auto-recuperación de valores cero heredados de S02 v1.0/v1.1 y visualización de mantenimiento con 2 decimales.

## v1.3
- Corrige la migración de valores cero heredados en localStorage.
- La fuente activa src/app.js ahora aplica recuperación automática de valores base.
- Incrementa cache-busting a b20-s02-1.3.
- No requiere SQL.
