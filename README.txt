B20 S19 - corrección de recuperación de contraseña

Reemplazar en el repositorio P-Renault/Jornada:
s19-auth-persistencia.js

Esta versión agrega:
- detección del evento PASSWORD_RECOVERY de Supabase;
- pantalla Crear nueva contraseña;
- confirmación de contraseña;
- actualización mediante auth.updateUser({ password });
- redirect de producción fijo a https://p-renault.github.io/Jornada/;
- conserva sesión persistente y sincronización existentes.

Después de reemplazar el archivo, hacer commit y esperar el despliegue de GitHub Pages.

No es necesario borrar caché ni historial.
