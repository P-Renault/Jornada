# B20 S11 — Presupuesto financiero

## Funciones
- Meta de ingreso neto mensual.
- Presupuesto mensual por categoría.
- Registro de ingresos.
- Comparación presupuesto vs gasto real.
- Lectura automática de gastos S08 desde localStorage.
- Saldo proyectado y saldo real.
- Exportación/importación de datos S11.

## Persistencia de validación
- `b20s11_budget_lines`
- `b20s11_income_records`
- `b20s11_income_goal`

## SQL
No requiere SQL.

## Integración
Agregar en `index.html`, después de `app.js`:
`<script type="module" src="s11-presupuesto.js?v=b20-s11-1.0"></script>`
