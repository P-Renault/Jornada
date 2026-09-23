B20 S22 v2.2 — Planificación operacional con combustible histórico

DESPLIEGUE
1. Reemplazar el archivo actual s22-historico-consolidado-v2.js por s22-historico-consolidado-v2.2.js.
2. En index.html cambiar la referencia del script a:
   <script src="s22-historico-consolidado-v2.2.js?v=b20-s22-2.2"></script>
3. No ejecutar SQL nuevo si la tabla b20_historico_operacional ya existe.
4. No modificar jornadas_trabajo.

MEJORAS
- S22 ocupa todo el ancho disponible.
- Planificador basado en meta neta.
- Incorpora combustible histórico de referencia, editable (por defecto $2.200.000).
- Calcula bruto requerido, comisión, combustible, resultado después de combustible, km y viajes.
- Muestra productividad histórica por km y por viaje.
- Horas requeridas aparecen cuando se ingresen horas actuales/históricas válidas.
- Distingue resultado después de combustible de resultado final de explotación.
- Mantiene manual, CSV, exportación y resumen.

NOTA
El valor $2.200.000 es una referencia histórica aproximada introducida en el planificador. No modifica los registros consolidados ni los convierte en un costo por jornada. Puede ajustarse cuando se disponga de un dato histórico más preciso.
