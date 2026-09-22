# B20 · S19 Producción

Este paquete implementa la fase final sin agregar otro sprint funcional:
1. Cuenta B20 con email/contraseña.
2. Sesión persistente con Supabase Auth.
3. Renovación automática de sesión.
4. Recuperación de contraseña.
5. RLS por usuario para `b20_user_data` y S01.
6. Persistencia de los módulos locales S02–S11/S15 en Supabase.
7. Sincronización periódica cada 3 segundos.
8. Compatibilidad con el `app.js` actual mediante una capa de compatibilidad para `jornadas_trabajo`.

## Archivos

- `s19-auth-persistencia.js`
- `supabase/S19_produccion.sql`
- `INSTRUCCIONES_S19.md`

## Importante

No se utiliza service_role key en el navegador. Solo la URL del proyecto y la Publishable/anon key.

El script S19 debe cargarse DESPUÉS del CDN de Supabase y ANTES de `app.js`.
