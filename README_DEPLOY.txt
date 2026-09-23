B20 · S22 · HISTÓRICO OPERACIONAL CONSOLIDADO v2.0

OBJETIVO
Registrar el pasado de Uber/InDrive como CONSOLIDADOS, no como jornadas.
Una fila puede representar años completos de explotación.

EJEMPLO
InDrive | 2022-01-01 | 2025-12-31 | bruto 6.200.000 | comisión 1.200.000 | neto 5.000.000 | 1.850 viajes | 38.500 km | 2.100 h

1) SUPABASE
IMPORTANTE: S22 v2 cambia la estructura de S22 v1 (fecha -> periodo_desde/periodo_hasta).
Si ya ejecutaste S22 v1 y la tabla b20_historico_operacional está vacía, puedes eliminarla y ejecutar s22-historico-consolidado-v2.sql.
Si contiene datos que quieres conservar, NO la elimines: respáldalos antes y hacemos una migración separada.

2) GITHUB
Sube s22-historico-consolidado-v2.js al repositorio como:
s22-historico-consolidado-v2.js

Luego agrega al final de index.html, después de S21:
<script src="s22-historico-consolidado-v2.js?v=b20-s22-2.0"></script>

3) PUBLICAR
Commit en main y espera GitHub Pages.

4) VALIDACIÓN
Debe aparecer un botón "Histórico".
Al abrirlo debe decir "Histórico operacional consolidado" y el pie debe indicar:
B20 · Sprint S22 · histórico consolidado · v2.0

5) CARGA MANUAL
Ejemplo:
Desde: 2022-01-01
Hasta: 2025-12-31
Aplicación: InDrive
Ingreso bruto: 6200000
Comisión: 1200000
Neto: 5000000
Viajes: 1850
Km: 38500
Horas: 2100

6) CSV
Encabezado:
periodo_desde,periodo_hasta,fuente,ingreso_bruto,comision_app,ingreso_neto,km_recorridos,horas_trabajadas,viajes,combustible,mantenimiento,notas

NO RECONSTRUYE JORNADAS. NO MODIFICA jornadas_trabajo.
