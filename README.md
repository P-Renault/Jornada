# Control de Trabajo V18.2

PAQUETE DIRECTO PARA GITHUB PAGES.

IMPORTANTE: GitHub Pages no ejecuta un ZIP subido como archivo. Debes extraer/reemplazar los archivos en la carpeta publicada del repositorio. `index.html` debe quedar en la raíz de la carpeta que GitHub Pages publica.

Archivos principales:
- index.html
- app.js
- styles.css
- manifest.json

Flujo:
1. Iniciar jornada guarda los datos iniciales y el plan en Supabase.
2. El botón cambia a Terminar jornada y aparece el formulario de cierre.
3. Terminar jornada solo abre/focaliza el cierre.
4. Cerrar día actualiza el mismo registro a cerrada.
5. Se muestra Meta vs Plan vs Real y la jornada queda en Historial.
