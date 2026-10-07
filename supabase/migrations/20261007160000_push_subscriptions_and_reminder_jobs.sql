create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

create table public.reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schedule_key text not null,
  countdown_id text not null,
  occurrence_key text not null,
  title text not null,
  target_date date not null,
  reminder_days_before integer not null check (reminder_days_before >= 0),
  scheduled_for timestamptz not null,
  timezone text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, schedule_key)
);

create index reminder_jobs_pending_idx on public.reminder_jobs (user_id, status, scheduled_for);

create or replace function public.set_infrastructure_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute procedure public.set_infrastructure_updated_at();
create trigger reminder_jobs_updated_at
before update on public.reminder_jobs
for each row execute procedure public.set_infrastructure_updated_at();

alter table public.push_subscriptions enable row level security;
alter table public.reminder_jobs enable row level security;

create policy "Users manage their own push subscriptions" on public.push_subscriptions
for all using (auth.uid() = user_id)
with check (
  auth.uid() = user_id and exists (
    select 1 from public.devices
    where devices.id = device_id and devices.user_id = auth.uid()
  )
);

create policy "Users manage their own reminder jobs" on public.reminder_jobs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
