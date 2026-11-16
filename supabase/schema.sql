-- Mi Vida · esquema de Supabase para la sincronización.
-- Pégalo entero en Supabase → SQL Editor → Run. Se puede ejecutar varias veces sin romper nada.
--
-- Una sola tabla genérica: cada fila es un registro de una tabla local (IndexedDB) de la app.
-- Así los módulos nuevos se sincronizan solos, sin tocar este esquema.

create table if not exists public.sync_records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  tbl        text        not null,               -- tabla local, p. ej. 'gym_exercises'
  id         text        not null,               -- id del registro (UUID de la app)
  data       jsonb,                              -- el registro tal cual (null si está borrado)
  deleted    boolean     not null default false, -- borrado: se mantiene la marca para los otros dispositivos
  updated_at timestamptz not null default now(), -- hora del servidor del último cambio (cursor de descarga)
  primary key (user_id, tbl, id)
);

create index if not exists sync_records_user_updated on public.sync_records (user_id, updated_at);

-- La hora del cambio la pone siempre el servidor (no el reloj del móvil).
create or replace function public.sync_records_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sync_records_touch on public.sync_records;
create trigger sync_records_touch
  before insert or update on public.sync_records
  for each row execute function public.sync_records_touch();

-- Seguridad: cada usuario solo ve y modifica sus propias filas.
alter table public.sync_records enable row level security;

drop policy if exists "sync_records: solo el dueño" on public.sync_records;
create policy "sync_records: solo el dueño" on public.sync_records
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.sync_records from anon;
grant select, insert, update, delete on public.sync_records to authenticated;

-- Mantener el proyecto activo (el plan gratuito lo pausa tras ~7 días sin uso).
-- La llama cada 3 días .github/workflows/supabase-keepalive.yml. Solo devuelve la hora:
-- no lee ni expone ningún dato.
create or replace function public.keepalive() returns timestamptz
language sql stable set search_path = '' as $$
  select now();
$$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
