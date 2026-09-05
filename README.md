# Control de Trabajo V2

PWA móvil para registrar jornadas de conducción usando Supabase.

## V2
- Meta diaria ingresada antes de la jornada.
- Combustible estimado automáticamente: km recorridos / rendimiento x precio por litro.
- Mantenimiento estimado automáticamente: km recorridos x costo de mantenimiento/km.
- Comisión estimada automáticamente mediante porcentaje configurable (por defecto 20%).
- Posibilidad de reemplazar combustible o comisión por el valor real ingresado.
- Ganancia neta y diferencia contra la meta calculadas automáticamente.
- Resumen mensual y cumplimiento de metas.

## Instalación
1. Ejecuta `supabase_jornadas.sql` en SQL Editor de Supabase.
2. Publica esta carpeta en GitHub Pages.
3. Abre la app en el teléfono.
4. Introduce URL y Publishable Key de Supabase.
5. Configura vehículo, rendimiento, precio de combustible, mantenimiento/km y comisión %.
