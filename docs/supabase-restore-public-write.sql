-- Data Skill Map - restaurar escrita publica minima do app
-- Use este script se algum hardening/revoke removeu INSERT do role anon
-- nas tabelas transacionais da plataforma.

-- RLS habilitado
alter table if exists public.diagnostic_sessions enable row level security;
alter table if exists public.diagnostic_answers enable row level security;
alter table if exists public.challenge_attempts enable row level security;
alter table if exists public.satisfaction_feedback enable row level security;

-- Policies de INSERT para anon
drop policy if exists "anon_insert_diagnostic_sessions" on public.diagnostic_sessions;
create policy "anon_insert_diagnostic_sessions"
on public.diagnostic_sessions
for insert
to anon
with check (true);

drop policy if exists "anon_insert_diagnostic_answers" on public.diagnostic_answers;
create policy "anon_insert_diagnostic_answers"
on public.diagnostic_answers
for insert
to anon
with check (true);

drop policy if exists "anon_insert_challenge_attempts" on public.challenge_attempts;
create policy "anon_insert_challenge_attempts"
on public.challenge_attempts
for insert
to anon
with check (true);

drop policy if exists "anon_insert_satisfaction_feedback" on public.satisfaction_feedback;
create policy "anon_insert_satisfaction_feedback"
on public.satisfaction_feedback
for insert
to anon
with check (true);

-- Grants minimos de escrita (sem SELECT em tabelas base)
grant usage on schema public to anon;
grant insert on table public.diagnostic_sessions to anon;
grant insert on table public.diagnostic_answers to anon;
grant insert on table public.challenge_attempts to anon;
grant insert on table public.satisfaction_feedback to anon;
grant usage, select on all sequences in schema public to anon;
