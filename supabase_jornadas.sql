-- Control de Trabajo V2
-- Ejecuta este SQL en el mismo proyecto Supabase. No modifica las tablas financieras.
alter table public.jornadas_trabajo add column if not exists meta_dia numeric(12,0) not null default 0;
create index if not exists jornadas_trabajo_fecha_idx on public.jornadas_trabajo(fecha desc);
-- Si estás instalando desde cero, puedes usar el CREATE TABLE de V1 y luego este ALTER.
