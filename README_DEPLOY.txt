B20 · S21 · CALENDARIO 2.0

OBJETIVO
Agregar un calendario operacional al B20 y convertir cada fecha en una ficha diaria de análisis.

INCLUYE
- Calendario mensual móvil.
- Navegación mes anterior/siguiente.
- Marcado de días con jornadas cerradas.
- Neto visible en los días con datos.
- Selección táctil de una fecha.
- Ficha diaria consolidada.

FICHA DIARIA
Resultado:
- Meta
- Neto real
- % de cumplimiento
- Brecha

Productividad:
- Horas
- Neto/hora
- Bruto/hora
- Viajes
- Km
- Neto/km

Costos:
- Combustible
- Comisión
- Mantención
- Costo operativo
- Costo/km
- Costo/viaje

Lectura automática del día.

DATOS
Lee directamente jornadas_trabajo mediante la sesión autenticada B20.
No crea tablas, no modifica RLS y no modifica jornadas.

DESPLIEGUE
1. Subir s21-calendario-2.js al repositorio P-Renault/Jornada.
2. En index.html agregar al final de los scripts:
<script src="s21-calendario-2.js?v=b20-s21-2.0"></script>
3. No eliminar S01-S20.
4. Publicar GitHub Pages.
5. El botón Calendario aparecerá automáticamente en la navegación.

NOTA
La escritura directa al repositorio no se pudo completar por HTTP 403 del conector. El paquete está preparado para despliegue manual.
