-- Lista de invitados · Boda
-- Ejecutar en el SQL Editor de Supabase. Se puede volver a correr sin
-- borrar datos. Usa el prefijo boda_ para convivir con otros proyectos
-- (p. ej. los XV) dentro del mismo proyecto de Supabase.

create extension if not exists unaccent with schema extensions;

create table if not exists public.boda_invitados (
  id          bigint generated always as identity primary key,
  -- Código del enlace personal (?i=codigo) y del pase QR.
  codigo      text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  nombre      text not null,
  pases       int  not null default 1 check (pases between 1 and 30),
  telefono    text,
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'asiste', 'no_asiste')),
  asistentes  int  not null default 0 check (asistentes >= 0),
  mensaje     text,
  -- Nombres de quienes acompañan al invitado (sin contar al invitado).
  acompanantes text[] not null default '{}',
  -- lista = lo agregaron los novios · tarjeta = se anotó solo, sin enlace personal
  origen      text not null default 'lista' check (origen in ('lista', 'tarjeta')),
  ingresaron  int  not null default 0 check (ingresaron >= 0),
  -- Quiénes ingresaron: 0 = invitado, 1..n = acompañantes (en orden).
  presentes   int[] not null default '{}',
  creado      timestamptz not null default now(),
  respondido  timestamptz
);

-- Para bases creadas con una versión anterior de este archivo.
alter table public.boda_invitados add column if not exists acompanantes text[] not null default '{}';
alter table public.boda_invitados add column if not exists presentes int[] not null default '{}';

-- Nombres únicos: "Juan Pérez", "juan perez" y "Juan  Pérez " cuentan como el mismo.
create or replace function public.boda_clave(t text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select lower(regexp_replace(btrim(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, ''))), '\s+', ' ', 'g'));
$$;

do $$
begin
  create unique index if not exists boda_invitados_nombre_unico
    on public.boda_invitados (public.boda_clave(nombre));
exception when unique_violation then
  raise notice 'Hay nombres repetidos en boda_invitados. Corrígelos en el panel y vuelve a correr este archivo.';
end $$;

alter table public.boda_invitados enable row level security;

-- Solo el usuario marcado con app_metadata.panel = 'boda' entra al panel.
drop policy if exists "boda panel lee"    on public.boda_invitados;
drop policy if exists "boda panel agrega" on public.boda_invitados;
drop policy if exists "boda panel edita"  on public.boda_invitados;
drop policy if exists "boda panel borra"  on public.boda_invitados;
create policy "boda panel lee"    on public.boda_invitados for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'panel') = 'boda');
create policy "boda panel agrega" on public.boda_invitados for insert to authenticated with check ((auth.jwt() -> 'app_metadata' ->> 'panel') = 'boda');
create policy "boda panel edita"  on public.boda_invitados for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'panel') = 'boda');
create policy "boda panel borra"  on public.boda_invitados for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'panel') = 'boda');

-- ── Funciones públicas que usa la tarjeta (rol anon) ──────────────
-- La tabla no tiene policies para anon: solo se llega a ella por aquí.
-- Se borran antes porque cambiar parámetros o columnas devueltas
-- no se puede hacer con "create or replace".
drop function if exists public.boda_invitacion(text);
drop function if exists public.boda_responder(text, boolean, int, text);
drop function if exists public.boda_responder(text, boolean, int, text, text[]);
drop function if exists public.boda_registrar(text, boolean, int, text);
drop function if exists public.boda_registrar(text, boolean, int, text, text[]);
drop function if exists public.boda_registrar(text, boolean, int, text, text[], text);

-- Limpia la lista de acompañantes: sin vacíos, máx. 80 letras c/u y
-- como mucho p_max nombres.
create or replace function public.boda_limpiar_nombres(p_nombres text[], p_max int)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(
    (select (array_agg(left(regexp_replace(btrim(x), '\s+', ' ', 'g'), 80) order by o))[1:greatest(p_max, 0)]
       from unnest(coalesce(p_nombres, '{}'::text[])) with ordinality as t(x, o)
      where btrim(x) <> ''),
    '{}'::text[]);
$$;

-- 1) Abrir una invitación personal con su código.
create or replace function public.boda_invitacion(p_codigo text)
returns table (nombre text, pases int, estado text, asistentes int, mensaje text, acompanantes text[])
language sql
stable
security definer
set search_path = public
as $$
  select i.nombre, i.pases, i.estado, i.asistentes, i.mensaje, i.acompanantes
    from public.boda_invitados i
   where i.codigo = lower(btrim(coalesce(p_codigo, '')))
   limit 1;
$$;

-- 2) Responder una invitación personal (sí / no, cuántos, mensaje).
create or replace function public.boda_responder(
  p_codigo text, p_asiste boolean, p_asistentes int default null, p_mensaje text default null,
  p_acompanantes text[] default '{}')
returns table (nombre text, pases int, estado text, asistentes int, mensaje text, acompanantes text[])
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_id    bigint;
  v_pases int;
  v_cant  int;
begin
  select i.id, i.pases into v_id, v_pases
    from public.boda_invitados i
   where i.codigo = lower(btrim(coalesce(p_codigo, '')));
  if v_id is null then
    return;
  end if;

  v_cant := case when p_asiste then least(greatest(coalesce(p_asistentes, v_pases), 1), v_pases) else 0 end;

  update public.boda_invitados i
     set estado       = case when p_asiste then 'asiste' else 'no_asiste' end,
         asistentes   = v_cant,
         acompanantes = public.boda_limpiar_nombres(p_acompanantes, v_cant - 1),
         mensaje      = nullif(left(btrim(coalesce(p_mensaje, '')), 500), ''),
         respondido   = now()
   where i.id = v_id;

  return query
    select i.nombre, i.pases, i.estado, i.asistentes, i.mensaje, i.acompanantes
      from public.boda_invitados i where i.id = v_id;
end;
$$;

-- 3) Confirmar sin enlace personal (si la tarjeta lo permite).
--    El nombre no puede repetirse: si ya existe otro invitado con ese
--    nombre, falla con el mensaje 'ya_existe'. Quien ya se anotó desde la
--    tarjeta manda su código (p_codigo) para cambiar su respuesta.
--    Devuelve el código de su pase.
create or replace function public.boda_registrar(
  p_nombre text, p_asiste boolean default true, p_asistentes int default 1, p_mensaje text default null,
  p_acompanantes text[] default '{}', p_codigo text default null)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_nombre text := nullif(left(regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g'), 80), '');
  v_cant   int  := least(greatest(coalesce(p_asistentes, 1), 1), 10);
  v_msg    text := nullif(left(btrim(coalesce(p_mensaje, '')), 500), '');
  v_propio text := nullif(lower(btrim(coalesce(p_codigo, ''))), '');
  v_acomp  text[];
  v_codigo text;
begin
  if v_nombre is null then
    return null;
  end if;
  if not coalesce(p_asiste, true) then
    v_cant := 1;
  end if;
  v_acomp := case when p_asiste then public.boda_limpiar_nombres(p_acompanantes, v_cant - 1) else '{}'::text[] end;

  -- Su propio registro anterior (para cambiar la respuesta)
  if v_propio is not null then
    select i.codigo into v_codigo
      from public.boda_invitados i
     where i.codigo = v_propio and i.origen = 'tarjeta';
  end if;

  -- El nombre ya lo tiene otro invitado
  if exists (select 1 from public.boda_invitados i
              where public.boda_clave(i.nombre) = public.boda_clave(v_nombre)
                and (v_codigo is null or i.codigo <> v_codigo)) then
    raise exception 'ya_existe' using hint = 'Ya existe un invitado con ese nombre';
  end if;

  begin
    if v_codigo is not null then
      update public.boda_invitados
         set nombre       = v_nombre,
             estado       = case when p_asiste then 'asiste' else 'no_asiste' end,
             pases        = greatest(pases, v_cant),
             asistentes   = case when p_asiste then v_cant else 0 end,
             acompanantes = v_acomp,
             mensaje      = v_msg,
             respondido   = now()
       where codigo = v_codigo;
    else
      insert into public.boda_invitados (nombre, pases, estado, asistentes, acompanantes, mensaje, origen, respondido)
      values (v_nombre, v_cant,
              case when p_asiste then 'asiste' else 'no_asiste' end,
              case when p_asiste then v_cant else 0 end,
              v_acomp, v_msg, 'tarjeta', now())
      returning codigo into v_codigo;
    end if;
  exception when unique_violation then
    -- Dos personas con el mismo nombre al mismo tiempo
    raise exception 'ya_existe' using hint = 'Ya existe un invitado con ese nombre';
  end;

  return v_codigo;
end;
$$;

revoke execute on function public.boda_invitacion(text) from public;
revoke execute on function public.boda_responder(text, boolean, int, text, text[]) from public;
revoke execute on function public.boda_registrar(text, boolean, int, text, text[], text) from public;
grant execute on function public.boda_invitacion(text) to anon, authenticated;
grant execute on function public.boda_responder(text, boolean, int, text, text[]) to anon, authenticated;
grant execute on function public.boda_registrar(text, boolean, int, text, text[], text) to anon, authenticated;

-- ── Dar acceso al panel ───────────────────────────────────────────
-- 1. Authentication → Users → Add user (correo + contraseña, Auto Confirm).
-- 2. Corre esto con ese correo:
--
-- update auth.users
--    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"panel":"boda"}'
--  where email = 'correo-de-los-novios@ejemplo.com';
