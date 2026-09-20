# CHANGELOG S02

## v1.1
- Corregido el manejo de `localStorage`: `null` ya no se convierte en 0 mediante `Number(null)`.
- Restaurar valores base ahora recupera correctamente los defaults B20.
- Corregido título y pie para identificar S02.
- No requiere SQL ni cambios en Supabase.

## v1.0
- Parámetros locales con namespace `b20s2_`.
- Guardar/restaurar/exportar/importar.
