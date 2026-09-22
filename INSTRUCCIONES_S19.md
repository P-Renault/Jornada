# INSTRUCCIONES S19 · DESPLIEGUE

## 1. Supabase

En Supabase > SQL Editor:
1. Abre `supabase/S19_produccion.sql`.
2. Ejecuta todo el script.
3. En Authentication > Providers verifica Email habilitado.
4. En Authentication > URL Configuration agrega la URL de producción de GitHub Pages como Site URL / Redirect URL si vas a usar recuperación de contraseña.

## 2. GitHub

En `index.html`, actualmente tienes:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script type="module" src="app.js?v=b20-s10-1.0"></script>
```

Debe quedar:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="s19-auth-persistencia.js?v=b20-s19-1.0"></script>
<script type="module" src="app.js?v=b20-s10-1.0"></script>
```

No elimines los scripts S11-S18.

## 3. Qué hace S19

- Al abrir la aplicación, intenta recuperar la sesión de Supabase.
- Si existe sesión, la conserva y carga los datos del usuario.
- Si no existe sesión, muestra Crear cuenta / Iniciar sesión / Recuperar contraseña.
- La sesión usa `persistSession` y `autoRefreshToken`.
- Los módulos S02-S11/S15 siguen funcionando con sus claves locales, pero S19 las respalda/sincroniza en `b20_user_data`.
- S01 (`jornadas_trabajo`) queda protegido por `user_id` y la capa S19 agrega automáticamente el `user_id` a nuevas jornadas y filtra las consultas del usuario autenticado.

## 4. Primera puesta en marcha

1. Configura URL + Publishable Key una sola vez.
2. Crea la cuenta.
3. Confirma el correo si Supabase lo exige.
4. Inicia sesión.
5. S19 cargará los datos cloud si existen; si la cuenta está vacía, subirá los datos locales existentes.
6. Comprueba que al recargar la página la sesión se recupera sin borrar caché/historial.
7. Registra una jornada de prueba y verifica que aparece en `jornadas_trabajo` con tu `user_id`.
8. Verifica en `b20_user_data` que aparecen las claves de los módulos utilizados.

## 5. Datos históricos de S01

El SQL deja las jornadas antiguas con `user_id = NULL` fuera de las cuentas nuevas por seguridad.

Si `jornadas_trabajo` contiene exclusivamente tus registros históricos, puedes asignarlos manualmente a tu cuenta con:

```sql
update public.jornadas_trabajo
set user_id = 'UUID-DE-TU-CUENTA'
where user_id is null;
```

Obtén tu UUID desde Supabase Authentication > Users.

No hagas esto si la tabla contiene información de otros usuarios.

## 6. Criterio de producción

La aplicación ya no depende de borrar historial/cache para mantener la sesión. Eso no significa que una sesión pueda sobrevivir a un borrado manual del almacenamiento del navegador: si el usuario borra los datos del sitio, Supabase deberá volver a autenticarlo.

## 7. S18

El repositorio actual ya contiene la corrección del auditor para `b20s11_income_goal` como valor escalar. Si el navegador sigue mostrando “Tipo de dato no esperado”, publica/actualiza `s18-auditoria-sistema.js` y fuerza recarga una vez.
