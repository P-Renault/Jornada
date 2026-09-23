# B20 — Menú uniforme y responsive

Esta mejora hace que todas las pestañas del menú permanezcan dentro del área
de trabajo, sin desplazamiento horizontal.

## Archivos

- `src/menu-uniforme.css`
- Este README

## Integración

Agregar en `index.html`, después de `src/styles.css`:

```html
<link rel="stylesheet" href="src/menu-uniforme.css?v=b20-menu-1.0">
```

## Distribución

- Pantalla amplia: 6 columnas.
- Pantalla intermedia: 4 columnas.
- Teléfono: 3 columnas.
- Teléfono angosto: 2 columnas.

Los botones tienen ancho uniforme y los nombres largos pueden ocupar dos líneas.

No modifica la lógica de S01–S18, Supabase ni autenticación.
