# CONTROL DE TRABAJO B20 — SPRINT S01

## Módulo
Capa 1 — Recolección y observación de jornadas.

## Estrategia
Paquete autónomo desplegable en GitHub Pages o cualquier hosting estático.

## Compatibilidad
- Reutiliza `public.jornadas_trabajo` existente.
- No modifica el esquema.
- No ejecuta DELETE.
- No requiere autenticación nueva.
- Mantiene V19/V20.3 intacto.

## Incluye
- Planificación de jornada.
- Cálculo corregido de bruto necesario para alcanzar meta neta.
- Inicio y cierre de jornada.
- Cálculo de métricas de observación.
- Historial mensual.
- Parámetros locales versionados por prefijo `b20s1_`.

## Fórmula crítica
`bruto requerido = (meta neta + combustible estimado + mantenimiento estimado) / (1 - comisión)`

## Despliegue
1. Descomprimir.
2. Publicar el contenido del paquete como sitio estático.
3. Abrir `index.html`.
4. Conectar la misma URL y Publishable Key de Supabase.
5. Verificar que aparezcan jornadas existentes.
6. Crear una jornada de prueba y cerrarla.
7. Confirmar que V19/V20.3 sigue operativo por separado.

## Criterio de aceptación S01
- Lectura de jornadas existentes.
- Inicio de jornada.
- Cierre de jornada.
- Métricas calculadas.
- Cero cambios de esquema.
- Cero eliminación de registros.
