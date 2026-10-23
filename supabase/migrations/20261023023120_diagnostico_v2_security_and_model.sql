-- Marco 2: hardening sem interromper os acessos de leitura/escrita da V1.
-- Revisar no ambiente de homologação antes de aplicar em produção.
begin;

revoke insert, update, delete, truncate, trigger, references, maintain
  on table public.question_bank from public, anon, authenticated;
revoke update, delete, truncate, trigger, references, maintain
  on table public.diagnostic_funnel_events from public, anon, authenticated;
revoke insert, update, delete, truncate, trigger, references, maintain
  on table public.diagnostic_recommendations from public, anon, authenticated;

-- A função é exclusivamente um trigger de auth.users; não é RPC pública.
revoke execute on function public.handle_new_auth_user_profile()
  from public, anon, authenticated;

-- O corpo usa apenas now() e NEW; não precisa de resolução dinâmica de nomes.
alter function public.set_updated_at() set search_path = '';

commit;
