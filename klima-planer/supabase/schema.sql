-- Klima-Planer: Datenbankstruktur für Supabase.
-- Im Supabase-Dashboard unter "SQL Editor" einmal komplett ausführen.

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('innen_wand','innen_kassette','innen_truhe','aussen')),
  image_path text not null,
  aspect numeric not null default 0.4,
  install_hours numeric not null default 4,
  material_price numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_name text not null,
  address text not null default '',
  notes text not null default '',
  photo_path text,
  placements jsonb not null default '[]'::jsonb,
  team_size int not null default 2,
  start_date date,
  created_at timestamptz not null default now()
);

alter table public.settings enable row level security;
alter table public.devices enable row level security;
alter table public.projects enable row level security;

create policy "eigene Einstellungen" on public.settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "eigene Geräte" on public.devices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "eigene Projekte" on public.projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Private Speicherbereiche für Fotos und Gerätebilder.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false), ('devices', 'devices', false)
on conflict (id) do nothing;

-- Dateien liegen immer unter "<user-id>/..." und gehören nur dieser Person.
create policy "eigene Dateien lesen" on storage.objects
  for select using (bucket_id in ('photos','devices') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigene Dateien anlegen" on storage.objects
  for insert with check (bucket_id in ('photos','devices') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigene Dateien ändern" on storage.objects
  for update using (bucket_id in ('photos','devices') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigene Dateien löschen" on storage.objects
  for delete using (bucket_id in ('photos','devices') and (storage.foldername(name))[1] = auth.uid()::text);

-- Konto löschen (für die Store-Vorgabe "Konto in der App löschbar").
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth, storage as $$
begin
  delete from storage.objects where bucket_id in ('photos','devices') and (storage.foldername(name))[1] = auth.uid()::text;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
