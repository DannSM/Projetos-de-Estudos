-- Baseline sintética parcial. Reproduz apenas dependências das migrations
-- V1 claim + V2 e os grants V1 relevantes; não representa todo o produto.
create schema if not exists private;

create table public.question_bank (
  id integer generated always as identity primary key,
  is_active boolean not null default true,
  question_text text not null,
  correct_index integer not null
);
alter table public.question_bank enable row level security;
create policy question_bank_public_active on public.question_bank
  for select to anon, authenticated using (is_active);
grant select, insert, update, delete, truncate, trigger, references, maintain
  on public.question_bank to anon, authenticated;

create table public.diagnostic_funnel_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id text,
  anonymous_user_id text,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null
);
alter table public.diagnostic_funnel_events enable row level security;
create policy diagnostic_funnel_events_insert on public.diagnostic_funnel_events
  for insert to anon, authenticated with check
    (user_id is null or user_id = (select auth.uid()));
create policy diagnostic_funnel_events_select_own on public.diagnostic_funnel_events
  for select to authenticated using (user_id = (select auth.uid()));
grant insert, truncate, trigger, references, maintain
  on public.diagnostic_funnel_events to anon;
grant select, insert, truncate, trigger, references, maintain
  on public.diagnostic_funnel_events to authenticated;

create table public.diagnostic_recommendations (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default true,
  title text not null
);
alter table public.diagnostic_recommendations enable row level security;
create policy diagnostic_recommendations_public_active
  on public.diagnostic_recommendations
  for select to anon, authenticated using (is_active);
grant select, truncate, trigger, references, maintain
  on public.diagnostic_recommendations to anon, authenticated;

create table public.diagnostic_sessions (
  attempt_id text primary key,
  anonymous_user_id text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create table public.diagnostic_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id text not null,
  anonymous_user_id text,
  user_id uuid references auth.users(id) on delete set null
);
create table public.satisfaction_feedback (
  id uuid primary key default gen_random_uuid(),
  attempt_id text not null,
  anonymous_user_id text,
  user_id uuid references auth.users(id) on delete set null
);

create function public.handle_new_auth_user_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  return new;
end;
$$;
grant execute on function public.handle_new_auth_user_profile()
  to public, anon, authenticated;

create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

insert into public.question_bank (question_text, correct_index)
values ('Questão V1 sintética para verificar SELECT legado', 2);
insert into public.diagnostic_recommendations (title)
values ('Recomendação V1 sintética');

-- Função de teste exclusiva desta baseline: permite exercitar TRUNCATE
-- pelo gateway com SECURITY INVOKER, sem conceder privilégios adicionais.
create function public.test_v2_probe_truncate_question_bank()
returns void language sql security invoker set search_path = '' as $$
  truncate public.question_bank;
$$;
grant execute on function public.test_v2_probe_truncate_question_bank()
  to anon, authenticated;
