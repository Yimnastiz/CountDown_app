-- auth.users is the managed User model. This table identifies an app installation.
create table if not exists public.devices (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists devices_user_id_idx on public.devices (user_id);

create or replace function public.set_devices_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists devices_updated_at on public.devices;
create trigger devices_updated_at
before update on public.devices
for each row execute procedure public.set_devices_updated_at();

alter table public.devices enable row level security;

create policy "Users can view their own devices"
on public.devices for select
using (auth.uid() = user_id);

create policy "Users can register their own devices"
on public.devices for insert
with check (auth.uid() = user_id);

create policy "Users can update their own devices"
on public.devices for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
