B20 · S13 v1.2 — despliegue correcto

1. Reemplazar en el repositorio P-Renault/Jornada el archivo EXISTENTE:
   s13-tablero-control.js
   usando el archivo s13-tablero-control-v1.2.js de este paquete.

2. En index.html cambiar:
   <script type="module" src="s13-tablero-control.js?v=b20-s13-1.0"></script>
   por:
   <script type="module" src="s13-tablero-control.js?v=b20-s13-1.2"></script>

3. Publicar/guardar ambos cambios.

4. En el navegador hacer recarga forzada o abrir una ventana incógnito para evitar caché.

5. El tablero debe mostrar, debajo de Control de cumplimiento:
   Descomposición del resultado operacional
   - Ingreso bruto
   - Comisión app
   - Combustible
   - Mantenimiento
   - Resultado por desglose
   - Neto almacenado en jornadas
   - Diferencia de conciliación

Importante: no modifica ni reconstruye jornadas_trabajo. Solo lee los registros existentes.
