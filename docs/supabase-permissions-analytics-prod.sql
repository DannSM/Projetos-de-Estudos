-- Data Skill Map - permissoes de producao para analytics interno seguro
-- Execute apos:
-- 1) docs/supabase-analytics-hardening.sql
-- 2) Validar login admin + RPC funcionando em analytics.html

-- Remover permissao temporaria de leitura direta por anon
revoke all on public.vw_platform_activity_daily from anon;
revoke all on public.vw_user_activity_daily from anon;
revoke all on public.vw_satisfaction_feedback_daily from anon;
revoke all on public.vw_satisfaction_comments_admin from anon;

-- Manter authenticated sem SELECT direto nas views (acesso somente via RPC)
revoke all on public.vw_platform_activity_daily from authenticated;
revoke all on public.vw_user_activity_daily from authenticated;
revoke all on public.vw_satisfaction_feedback_daily from authenticated;
revoke all on public.vw_satisfaction_comments_admin from authenticated;

-- Tabelas base continuam bloqueadas para anon/authenticated
revoke all on public.diagnostic_sessions from anon, authenticated;
revoke all on public.diagnostic_answers from anon, authenticated;
revoke all on public.challenge_attempts from anon, authenticated;
revoke all on public.satisfaction_feedback from anon, authenticated;
