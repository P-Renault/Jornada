-- CONTROL DE TRABAJO V3
-- Migración para permitir iniciar una jornada con solo los datos iniciales.
-- No modifica tablas de la aplicación financiera.

alter table public.jornadas_trabajo add column if not exists horas_planificadas numeric(6,2);
alter table public.jornadas_trabajo add column if not exists estado text not null default 'cerrada';

alter table public.jornadas_trabajo alter column hora_fin drop not null;
alter table public.jornadas_trabajo alter column km_final drop not null;
alter table public.jornadas_trabajo alter column horas_trabajadas drop not null;
alter table public.jornadas_trabajo alter column km_recorridos drop not null;
alter table public.jornadas_trabajo alter column combustible drop not null;
alter table public.jornadas_trabajo alter column mantenimiento drop not null;
alter table public.jornadas_trabajo alter column ganancia_bruta drop not null;
alter table public.jornadas_trabajo alter column comision_app drop not null;
alter table public.jornadas_trabajo alter column ganancia_neta drop not null;

alter table public.jornadas_trabajo drop constraint if exists jornadas_trabajo_estado_check;
alter table public.jornadas_trabajo add constraint jornadas_trabajo_estado_check check (estado in ('en_curso','cerrada'));

create index if not exists jornadas_trabajo_fecha_idx on public.jornadas_trabajo(fecha desc);
create index if not exists jornadas_trabajo_estado_idx on public.jornadas_trabajo(estado);
