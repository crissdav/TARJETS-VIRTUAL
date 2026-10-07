-- Panel de confirmaciones · XV Grecia Peña
-- Ejecutar en el SQL Editor de Supabase. Se puede volver a correr
-- sin borrar nada (todo es "if not exists" / "or replace").

create extension if not exists unaccent with schema extensions;

create table if not exists public.confirmaciones (
  id                    bigint generated always as identity primary key,
  nombre                text not null,
  acompanante           text,
  fecha                 timestamptz not null default now(),
  confirmado_invitado   boolean not null default false,
  confirmado_acompanante boolean not null default false
);

alter table public.confirmaciones enable row level security;

-- Solo el panel autenticado puede leer o modificar.
drop policy if exists "panel lee"   on public.confirmaciones;
drop policy if exists "panel edita" on public.confirmaciones;
drop policy if exists "panel borra" on public.confirmaciones;
create policy "panel lee"   on public.confirmaciones for select to authenticated using (true);
create policy "panel edita" on public.confirmaciones for update to authenticated using (true);
create policy "panel borra" on public.confirmaciones for delete to authenticated using (true);

-- No hay policy de insert: nadie inserta directo.
-- La tarjeta escribe con esta función (security definer) vía RPC anon.
create or replace function public.anotar(p_nombre text, p_acompanante text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_nombre  text := nullif(regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g'), '');
  v_acomp   text := nullif(regexp_replace(btrim(coalesce(p_acompanante, '')), '\s+', ' ', 'g'), '');
  v_clave   text;
begin
  if v_nombre is null then
    return;
  end if;

  v_clave := lower(unaccent(v_nombre));

  if exists (select 1 from public.confirmaciones
             where lower(unaccent(regexp_replace(nombre, '\s+', ' ', 'g'))) = v_clave) then
    update public.confirmaciones
       set acompanante = v_acomp,
           confirmado_acompanante = case
             when v_acomp is null then false
             else confirmado_acompanante
           end,
           fecha = now()
     where lower(unaccent(regexp_replace(nombre, '\s+', ' ', 'g'))) = v_clave;
  else
    insert into public.confirmaciones (nombre, acompanante)
    values (v_nombre, v_acomp);
  end if;
end;
$$;

revoke execute on function public.anotar from public;
grant execute on function public.anotar to anon;
