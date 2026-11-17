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

-- Validación en el servidor: aunque alguien use la API directamente con una sesión válida,
-- solo entran filas con forma de "registro de la app" y de tamaño razonable.
alter table public.sync_records drop constraint if exists sync_records_tbl_format;
alter table public.sync_records add constraint sync_records_tbl_format
  check (tbl ~ '^[a-z]+_[a-z0-9_]+$' and length(tbl) <= 64);
alter table public.sync_records drop constraint if exists sync_records_id_format;
alter table public.sync_records add constraint sync_records_id_format
  check (length(id) between 1 and 100 and id !~ '[[:cntrl:]]');
alter table public.sync_records drop constraint if exists sync_records_data_shape;
alter table public.sync_records add constraint sync_records_data_shape
  check (data is null or (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 65536));

-- La hora del cambio la pone siempre el servidor (no el reloj del móvil).
create or replace function public.sync_records_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.sync_records_touch() from public, anon, authenticated;

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

-- Calendario de Gastos fijos (suscripción desde Google Calendar).
-- Cada usuario tiene un enlace privado con un token aleatorio. La Edge Function
-- `calendar-feed` (sin sesión, la llama Google) usa el token para leer SOLO los gastos fijos,
-- a través de gastos_feed_items, que solo puede ejecutar service_role (no está en la API pública).
create table if not exists public.calendar_feeds (
  user_id    uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  token      text        not null unique check (length(token) >= 32),
  created_at timestamptz not null default now()
);

-- Solo tokens hexadecimales largos (los genera la app con crypto.getRandomValues).
alter table public.calendar_feeds drop constraint if exists calendar_feeds_token_format;
alter table public.calendar_feeds add constraint calendar_feeds_token_format
  check (token ~ '^[0-9a-f]{32,128}$');

alter table public.calendar_feeds enable row level security;

drop policy if exists "calendar_feeds: solo el dueño" on public.calendar_feeds;
create policy "calendar_feeds: solo el dueño" on public.calendar_feeds
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.calendar_feeds from anon;
grant select, insert, update, delete on public.calendar_feeds to authenticated;

-- Gastos fijos (no borrados) del dueño de un token. Solo la tabla gastos_expenses.
create or replace function public.gastos_feed_items(p_token text) returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select r.data
  from public.sync_records r
  join public.calendar_feeds f on f.user_id = r.user_id
  where f.token = p_token
    and p_token ~ '^[0-9a-f]{32,128}$'
    and r.tbl = 'gastos_expenses'
    and not r.deleted
    and r.data is not null;
$$;

-- No es pública: solo la llama la Edge Function calendar-feed con service_role.
revoke all on function public.gastos_feed_items(text) from public, anon, authenticated;
grant execute on function public.gastos_feed_items(text) to service_role;
