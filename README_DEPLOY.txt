B20 · S20 MÉTRICAS · 1.2

CORRECCIÓN SOLICITADA
La versión 1.1 dejaba visible el bloque antiguo de métricas y por eso aparecían indicadores repetidos.

La 1.2:
- oculta el bloque antiguo "Observación operacional B20";
- conserva los datos para que app.js siga funcionando;
- deja una sola presentación de Métricas;
- integra los dos gráficos de torta del sistema inicial:
  1. Meta alcanzada
  2. Horas cumplidas
- integra sus indicadores Real / Faltante / porcentaje;
- mantiene el gráfico temporal Meta / Real neto / Combustible;
- mantiene el análisis de productividad, eficiencia y cumplimiento.

DESPLIEGUE
1. Reemplazar s20-metricas-mejora.js por esta versión.
2. Mantener el mismo <script> en index.html, cambiando opcionalmente el query string a:
<script src="s20-metricas-mejora.js?v=b20-s20-1.2"></script>
3. No modificar S01-S19.
