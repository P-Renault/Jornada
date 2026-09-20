# B20 S01 v1.1

- Corrección del cierre de jornada para instalaciones donde `km_recorridos` y/o `horas_trabajadas` son columnas generadas/calculadas.
- El primer UPDATE solo escribe campos editables.
- Las columnas derivadas se intentan completar únicamente si Supabase las devuelve vacías.
- Cache-bust actualizado a `b20-s01-1.1`.
- No requiere SQL.
- No elimina ni migra registros.

# Changelog

## B20 S01 1.0.0 — 2026-09-20
- Primer módulo desplegable.
- No requiere SQL.
- Preserva `jornadas_trabajo`.
- Añade motor de planificación neta corregido.
- Añade métricas de observación.
- Elimina del flujo S01 la eliminación física de jornadas.
