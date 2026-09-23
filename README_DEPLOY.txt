B20 · S12 · Proyección Dinámica v2.2

OBJETIVO
S12 deja de usar solamente una meta fija y combina:
1) Histórico consolidado S22.
2) Jornadas cerradas actuales B20.

ESCENARIOS
- Histórico consolidado.
- Rendimiento actual.
- Escenario crítico = 80% del punto medio actual.

ESTADÍSTICA
- Promedio ponderado por volumen.
- Mediana.
- Punto medio = promedio entre ponderado y mediana.

JORNADAS
- 12 horas.
- 13 horas.

HORIZONTES
- 30 días.
- 60 días.
- 180 días.
- 365 días.

Cada horizonte usa una cantidad configurable de jornadas por 30 días (por defecto 22).

DATOS HISTÓRICOS
El campo de combustible histórico parte en $2.200.000, editable. No modifica S22.
Las horas históricas se usan cuando están disponibles. Si no, la referencia histórica horaria usa km/viaje y el ritmo horario actual.

DATOS ACTUALES
Se leen de jornadas_trabajo cerradas. El neto actual es el neto almacenado por B20, que ya incorpora los costos calculados por la jornada.

DESPLIEGUE
1. Reemplazar s12-proyeccion.js por s12-proyeccion-dinamica-v2.2.js.
2. En index.html cambiar la referencia a:
   <script type="module" src="s12-proyeccion-dinamica-v2.2.js?v=b20-s12-2.2"></script>
3. No ejecutar SQL.
4. No modificar jornadas_trabajo ni b20_historico_operacional.
