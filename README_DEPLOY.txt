B20 · S13 TABLERO CORREGIDO · v1.1

PROBLEMA:
La versión anterior de S13 calculaba "Ingreso registrado" exclusivamente desde
localStorage: b20s11_income_records.

Las siete jornadas reales están en Supabase, tabla jornadas_trabajo. Por eso el
tablero mostraba $0 aunque Historial/S20 sí podían leer las jornadas.

CORRECCIÓN:
S13 v1.1 usa jornadas_trabajo como fuente operacional para:
- jornadas cerradas
- ingreso bruto
- comisión app
- ingreso neto
- metas diarias acumuladas

Mantiene:
- meta mensual desde S11
- presupuesto desde S11
- gastos desde S08
- créditos desde S10

NO requiere SQL.

DEPLOY MANUAL:
1. Reemplazar en P-Renault/Jornada el archivo:
   s13-tablero-control.js
   por este archivo corregido.
2. Mantener en index.html:
   <script type="module" src="s13-tablero-control.js?v=b20-s13-1.0"></script>
   o cambiar la versión a:
   <script type="module" src="s13-tablero-control.js?v=b20-s13-1.1"></script>
3. Publicar GitHub Pages.
4. Recargar la página.

NOTA:
El botón Tablero existente será recreado por la versión corregida y sus datos
operacionales vendrán directamente de Supabase.
