B20 — PAQUETE UNIFICADO DE PERSISTENCIA S11–S18
=================================================

OBJETIVO
--------
Dejar estabilizada la persistencia de la etapa S11–S18 antes de continuar
desarrollando módulos pendientes.

QUÉ SE MODIFICA
---------------
1. s11-presupuesto.js
   - Meta mensual -> sincronización inmediata.
   - Presupuesto por categoría -> sincronización inmediata.
   - Ingresos -> sincronización inmediata.
   - Importación/eliminación -> sincronización.
   - Refresco cuando los datos se recuperan desde Supabase.

2. s19-auth-persistencia.js
   - Incorpora b20s12_projection_config al conjunto de datos persistentes.
   - S19 continúa siendo el motor central de autenticación, hidratación
     y sincronización.

3. b20-persistencia-s11-s18.js
   - Complementa S19.
   - Fuerza sincronización inmediata cuando S11, S12 o S15 modifican
     localStorage.
   - Refresca el módulo visible después de sincronizar.
   - No modifica RLS ni crea tablas.

ARQUITECTURA
------------
S11 = fuente de datos financieros.
S12 = configuración de escenarios; queda persistente.
S13 = tablero derivado de S08/S10/S11.
S14 = alertas derivadas de S05/S06/S08/S09/S10/S11.
S15 = acciones; S19 ya persiste b20s15_action_items.
S16 = cierre diario derivado de registros existentes.
S17 = respaldo/restauración de datos locales (el archivo JSON sigue siendo
     deliberadamente un respaldo local; no se convierte en una tabla).
S18 = auditoría de los datos locales; no necesita almacenar resultados.

IMPORTANTE
----------
No es necesario reemplazar S12, S13, S14, S15, S16, S17 ni S18 en esta fase.
Sus datos de negocio se obtienen de las fuentes persistentes anteriores.

ARCHIVOS A REEMPLAZAR EN GITHUB
--------------------------------
P-Renault/Jornada/
  s11-presupuesto.js
  s19-auth-persistencia.js

ARCHIVO NUEVO
-------------
P-Renault/Jornada/
  b20-persistencia-s11-s18.js

CARGA DEL ARCHIVO NUEVO
-----------------------
En index.html, después de s19-auth-persistencia.js y después de app.js
(o al final de los scripts S11–S18), agregar:

<script src="b20-persistencia-s11-s18.js?v=b20-persistencia-1.0"></script>

No eliminar los scripts existentes S11–S18.

PRUEBA DE ACEPTACIÓN
--------------------
A) S11:
   - seleccionar 2026-09
   - guardar una meta
   - registrar varias categorías
   - registrar un ingreso
   - recargar
   - cerrar/abrir sesión

B) S12:
   - cambiar jornadas/neto/variación
   - guardar
   - recargar
   - comprobar que permanecen

C) S13:
   - verificar que refleja S11/S08/S10

D) S14:
   - verificar alertas generadas por los datos reales

E) S15:
   - crear acción
   - cambiar estado
   - recargar y volver a entrar

F) S16:
   - comprobar el cierre con los ingresos/gastos del día

G) S17:
   - generar respaldo
   - comprobar que contiene los datos alimentados

H) S18:
   - ejecutar auditoría
   - comprobar que no hay falsos positivos por la meta escalar

CRITERIO DE SALIDA
------------------
No continuar con módulos pendientes hasta comprobar:
- los datos permanecen después de recargar;
- los datos aparecen en otro navegador con la misma cuenta;
- S12 mantiene su configuración;
- S15 mantiene sus acciones;
- S13/S14/S16 reflejan los datos de S11;
- S17 puede generar un respaldo;
- S18 audita sin alterar datos.
