-- Data Skill Map - permissao temporaria para analytics interno no frontend
-- Necessario quando o painel analytics.html usa anonKey no browser.
-- Atencao: esta abordagem e temporaria.

grant select on public.vw_platform_activity_daily to anon;
grant select on public.vw_user_activity_daily to anon;
grant select on public.vw_satisfaction_feedback_daily to anon;

-- manter bloqueado:
revoke all on public.vw_satisfaction_comments_admin from anon;
