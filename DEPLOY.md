# DESPLIEGUE B20 S01

## Paquete
`B20_S01_Jornadas_v1.0.zip`

## Pasos
1. Descomprimir el ZIP.
2. Publicar el contenido en GitHub Pages (o hosting estático).
3. Abrir la URL publicada.
4. Ingresar la misma URL de Supabase y Publishable Key usadas por la línea base.
5. Confirmar lectura del historial.
6. Probar inicio y cierre de una jornada controlada.
7. Confirmar que los registros históricos permanecen intactos.

## Rollback
Si S01 presenta un problema, retirar el despliegue S01 y volver a la URL/commit de V19/V20.3. Como S01 no ejecuta SQL ni altera el esquema, no requiere rollback de base de datos.
