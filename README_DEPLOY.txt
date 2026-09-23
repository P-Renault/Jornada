B20 · S21 Calendario 2.0 — FIX DE NAVEGACIÓN

Problema corregido:
El botón Calendario se agregaba al menú, pero al hacer clic no abría el módulo porque
la versión S21 tenía una referencia a una función `show()` inexistente.

Este fix NO modifica Supabase ni las jornadas.

DEPLOY:
1. Sube `s21-calendario-fix.js` al repositorio P-Renault/Jornada.
2. En index.html, deja el script S21 existente:
   <script src="s21-calendario-2.js?v=b20-s21-2.0"></script>
3. Inmediatamente después agrega:
   <script src="s21-calendario-fix.js?v=b20-s21-fix-1.0"></script>
4. Publica GitHub Pages.
5. Recarga la aplicación con caché actualizado.

No es necesario cambiar la base de datos ni ejecutar SQL.
