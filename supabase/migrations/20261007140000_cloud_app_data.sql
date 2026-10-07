create table public.countdowns (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  description text,
  due_at timestamptz not null,
  due_date date,
  all_day boolean not null,
  category_id text,
  reminder_days integer[] not null default '{}',
  repeat text,
  recurrence jsonb not null,
  important boolean not null default false,
  notes text,
  status text not null,
  completed_at timestamptz,
  archived_at timestamptz,
  recurrence_stopped_at date,
  recurrence_exceptions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id)
);

create index countdowns_user_due_at_idx on public.countdowns (user_id, due_at);
create index countdowns_user_updated_at_idx on public.countdowns (user_id, updated_at);

create table public.categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  icon text not null,
  color text not null,
  is_default boolean not null default false,
  kind text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id)
);

create index categories_user_updated_at_idx on public.categories (user_id, updated_at);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_reminder_days integer[] not null default '{7,1}',
  default_reminder_time text not null default '09:00',
  theme text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_settings_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger user_settings_updated_at
before update on public.user_settings
for each row execute procedure public.set_user_settings_updated_at();

alter table public.countdowns enable row level security;
alter table public.categories enable row level security;
alter table public.user_settings enable row level security;

create policy "Users manage their own countdowns" on public.countdowns
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own categories" on public.categories
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own settings" on public.user_settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
