alter table public.reminder_jobs
  drop constraint reminder_jobs_status_check,
  add constraint reminder_jobs_status_check
    check (status in ('pending', 'processing', 'sent', 'cancelled')),
  add column claim_token uuid,
  add column claimed_at timestamptz,
  add column attempt_count integer not null default 0 check (attempt_count >= 0),
  add column sent_at timestamptz,
  add column is_recurring boolean not null default false;

create index reminder_jobs_claimable_idx
on public.reminder_jobs (status, scheduled_for, claimed_at);

create table public.reminder_job_deliveries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.reminder_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'permanent_failure')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, subscription_id)
);

create index reminder_job_deliveries_job_idx
on public.reminder_job_deliveries (job_id, status);

create trigger reminder_job_deliveries_updated_at
before update on public.reminder_job_deliveries
for each row execute procedure public.set_infrastructure_updated_at();

create or replace function public.validate_reminder_delivery_subscription()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.push_subscriptions
    where id = new.subscription_id and user_id = new.user_id
  ) then
    raise exception 'Reminder delivery subscription must belong to its user';
  end if;
  return new;
end;
$$;

create trigger reminder_job_deliveries_subscription_owner
before insert or update of user_id, subscription_id on public.reminder_job_deliveries
for each row execute procedure public.validate_reminder_delivery_subscription();

alter table public.reminder_job_deliveries enable row level security;
create policy "Users manage their own reminder deliveries"
on public.reminder_job_deliveries for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.claim_due_reminder_jobs(
  p_claim_token uuid,
  p_limit integer default 20
)
returns setof public.reminder_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select id
    from public.reminder_jobs
    where scheduled_for <= now()
      and (
        status = 'pending'
        or (status = 'processing' and claimed_at < now() - interval '15 minutes')
      )
    order by scheduled_for, id
    for update skip locked
    limit greatest(1, least(p_limit, 50))
  )
  update public.reminder_jobs as jobs
  set status = 'processing',
      claim_token = p_claim_token,
      claimed_at = now(),
      attempt_count = jobs.attempt_count + 1
  from candidates
  where jobs.id = candidates.id
  returning jobs.*;
end;
$$;

revoke all on function public.claim_due_reminder_jobs(uuid, integer) from public;
revoke all on function public.claim_due_reminder_jobs(uuid, integer) from anon, authenticated;
grant execute on function public.claim_due_reminder_jobs(uuid, integer) to service_role;

-- pg_net and Vault must be enabled before this function is used. The actual
-- production URL and CRON_SECRET are created manually in Vault, never here.
create or replace function public.invoke_countdown_delivery()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery_url text;
  cron_secret text;
begin
  select decrypted_secret into delivery_url
  from vault.decrypted_secrets
  where name = 'countdown_delivery_url';
  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'countdown_cron_secret';
  if delivery_url is null or cron_secret is null then
    raise exception 'COUNT//DOWN delivery Vault secrets are not configured';
  end if;
  perform net.http_get(
    url := rtrim(delivery_url, '/') || '/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret),
    timeout_milliseconds := 5000
  );
end;
$$;

revoke all on function public.invoke_countdown_delivery() from public;
revoke all on function public.invoke_countdown_delivery() from anon, authenticated, service_role;
grant execute on function public.invoke_countdown_delivery() to postgres;
