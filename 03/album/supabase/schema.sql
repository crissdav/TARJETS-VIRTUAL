/* ============================================================
   ÁLBUM XV — GRECIA PEÑA · Noche de Máscaras
   Ejecutar una sola vez en Supabase → SQL Editor → Run.

   Qué hace:
   1. Crea la tabla public.fotos (metadatos de cada foto).
   2. Crea el bucket privado "fotos" en Supabase Storage.
   3. Permite a los invitados (anon) SUBIR, pero solo la
      quinceañera (authenticated) puede VER o BORRAR.

   La landing "subir" usa la anon key → puede insertar.
   La landing "galeria" requiere login → puede leer y firmar URLs.
   ============================================================ */

-- ── 1. Tabla de fotos ───────────────────────────────────────
create table if not exists public.fotos (
  id      uuid primary key default gen_random_uuid(),
  archivo text not null,
  autor   text not null,
  fecha   timestamptz not null default now()
);

alter table public.fotos enable row level security;

drop policy if exists "invitados suben fotos" on public.fotos;
create policy "invitados suben fotos"
  on public.fotos for insert
  to anon, authenticated
  with check (char_length(autor) between 1 and 60);

drop policy if exists "quinceañera ve fotos" on public.fotos;
create policy "quinceañera ve fotos"
  on public.fotos for select
  to authenticated
  using (true);

drop policy if exists "quinceañera borra fotos" on public.fotos;
create policy "quinceañera borra fotos"
  on public.fotos for delete
  to authenticated
  using (true);

-- Realtime: que la galería se entere de fotos nuevas al instante.
do $$
begin
  alter publication supabase_realtime add table public.fotos;
exception when duplicate_object then null;
end $$;

-- ── 2. Bucket privado de imágenes ──────────────────────────
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

drop policy if exists "invitados suben imagenes" on storage.objects;
create policy "invitados suben imagenes"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'fotos'
    and storage.filename(name) ~* '\.(jpg|jpeg|png|gif|webp)$'
  );

drop policy if exists "quinceañera ve imagenes" on storage.objects;
create policy "quinceañera ve imagenes"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'fotos');

drop policy if exists "quinceañera borra imagenes" on storage.objects;
create policy "quinceañera borra imagenes"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotos');
