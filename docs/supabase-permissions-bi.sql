-- Data Skill Map - permissoes BI para Metabase Cloud
-- Execute apos recriar as views analiticas.

-- Opcional/manual, se permitido no ambiente:
-- create role dsm_dashboard_reader login password 'trocar_por_senha_forte';

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'dsm_dashboard_reader') then
    grant usage on schema public to dsm_dashboard_reader;

    grant select on public.vw_platform_activity_daily to dsm_dashboard_reader;
    grant select on public.vw_user_activity_daily to dsm_dashboard_reader;
    grant select on public.vw_satisfaction_feedback_daily to dsm_dashboard_reader;

    -- Nao conceder:
    -- grant select on public.vw_satisfaction_comments_admin to dsm_dashboard_reader;

    revoke all on public.diagnostic_sessions from dsm_dashboard_reader;
    revoke all on public.diagnostic_answers from dsm_dashboard_reader;
    revoke all on public.challenge_attempts from dsm_dashboard_reader;
    revoke all on public.satisfaction_feedback from dsm_dashboard_reader;
  else
    raise notice 'Role dsm_dashboard_reader nao existe. Criar role manualmente e reexecutar este script.';
  end if;
end $$;

revoke all on public.vw_platform_activity_daily from anon, authenticated;
revoke all on public.vw_user_activity_daily from anon, authenticated;
revoke all on public.vw_satisfaction_feedback_daily from anon, authenticated;
revoke all on public.vw_satisfaction_comments_admin from anon, authenticated;
