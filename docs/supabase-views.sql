-- Data Skill Map - camada analitica externa (Supabase + Metabase Cloud)
-- Execute no SQL Editor do Supabase.
-- Regra de data local: America/Sao_Paulo.

drop view if exists public.vw_platform_activity_daily;
drop view if exists public.vw_satisfaction_feedback_daily;
drop view if exists public.vw_satisfaction_comments_admin;
drop view if exists public.vw_user_activity_daily;

create view public.vw_user_activity_daily as
with
diagnostic_sessions_daily as (
  select
    date_trunc('day', finished_at at time zone 'America/Sao_Paulo')::date as activity_date,
    anonymous_user_id,
    count(*) as diagnostics_count,
    avg(score_percent)::numeric(5,2) as diagnostic_avg_score_percent
  from public.diagnostic_sessions
  group by 1, 2
),
diagnostic_answers_daily as (
  select
    date_trunc('day', answered_at at time zone 'America/Sao_Paulo')::date as activity_date,
    anonymous_user_id,
    count(*) as diagnostic_answers_count,
    sum(case when is_correct then 1 else 0 end) as diagnostic_answers_correct
  from public.diagnostic_answers
  group by 1, 2
),
challenge_attempts_daily as (
  select
    date_trunc('day', answered_at at time zone 'America/Sao_Paulo')::date as activity_date,
    anonymous_user_id,
    count(*) as challenge_attempts_count,
    sum(case when is_correct then 1 else 0 end) as challenge_correct_count
  from public.challenge_attempts
  group by 1, 2
),
satisfaction_daily as (
  select
    date_trunc('day', created_at at time zone 'America/Sao_Paulo')::date as activity_date,
    anonymous_user_id,
    count(*) as satisfaction_count,
    avg(rating)::numeric(5,2) as satisfaction_avg_rating,
    avg(case when context = 'diagnostico_resultado' then rating end)::numeric(5,2) as satisfaction_diagnostic_avg_rating,
    avg(case when context = 'desafios_sessao' then rating end)::numeric(5,2) as satisfaction_challenge_avg_rating,
    sum(case when comment is not null and btrim(comment) <> '' then 1 else 0 end) as satisfaction_comments_count
  from public.satisfaction_feedback
  group by 1, 2
),
activity_keys as (
  select activity_date, anonymous_user_id from diagnostic_sessions_daily
  union
  select activity_date, anonymous_user_id from diagnostic_answers_daily
  union
  select activity_date, anonymous_user_id from challenge_attempts_daily
  union
  select activity_date, anonymous_user_id from satisfaction_daily
)
select
  k.activity_date,
  k.anonymous_user_id,
  coalesce(ds.diagnostics_count, 0) as diagnostics_count,
  coalesce(ds.diagnostic_avg_score_percent, 0)::numeric(5,2) as diagnostic_avg_score_percent,
  coalesce(da.diagnostic_answers_count, 0) as diagnostic_answers_count,
  coalesce(da.diagnostic_answers_correct, 0) as diagnostic_answers_correct,
  case
    when coalesce(da.diagnostic_answers_count, 0) = 0 then 0
    else round((da.diagnostic_answers_correct::numeric / nullif(da.diagnostic_answers_count, 0)) * 100, 2)
  end as diagnostic_answers_accuracy_percent,
  coalesce(ca.challenge_attempts_count, 0) as challenge_attempts_count,
  coalesce(ca.challenge_correct_count, 0) as challenge_correct_count,
  case
    when coalesce(ca.challenge_attempts_count, 0) = 0 then 0
    else round((ca.challenge_correct_count::numeric / nullif(ca.challenge_attempts_count, 0)) * 100, 2)
  end as challenge_accuracy_percent,
  coalesce(sf.satisfaction_count, 0) as satisfaction_count,
  coalesce(sf.satisfaction_comments_count, 0) as satisfaction_comments_count,
  sf.satisfaction_avg_rating,
  sf.satisfaction_diagnostic_avg_rating,
  sf.satisfaction_challenge_avg_rating
from activity_keys k
left join diagnostic_sessions_daily ds
  on ds.activity_date = k.activity_date and ds.anonymous_user_id = k.anonymous_user_id
left join diagnostic_answers_daily da
  on da.activity_date = k.activity_date and da.anonymous_user_id = k.anonymous_user_id
left join challenge_attempts_daily ca
  on ca.activity_date = k.activity_date and ca.anonymous_user_id = k.anonymous_user_id
left join satisfaction_daily sf
  on sf.activity_date = k.activity_date and sf.anonymous_user_id = k.anonymous_user_id
order by k.activity_date desc, k.anonymous_user_id;

create view public.vw_platform_activity_daily as
select
  activity_date,
  count(distinct anonymous_user_id) as active_users,
  sum(diagnostics_count) as diagnostics_count,
  coalesce(round(avg(nullif(diagnostic_avg_score_percent, 0)), 2), 0)::numeric(5,2) as diagnostic_avg_score_percent,
  sum(diagnostic_answers_count) as diagnostic_answers_count,
  sum(diagnostic_answers_correct) as diagnostic_answers_correct,
  round(
    case
      when sum(diagnostic_answers_count) = 0 then 0
      else (sum(diagnostic_answers_correct)::numeric / nullif(sum(diagnostic_answers_count), 0)) * 100
    end
  , 2) as diagnostic_answers_accuracy_percent,
  sum(challenge_attempts_count) as challenge_attempts_count,
  sum(challenge_correct_count) as challenge_correct_count,
  round(
    case
      when sum(challenge_attempts_count) = 0 then 0
      else (sum(challenge_correct_count)::numeric / nullif(sum(challenge_attempts_count), 0)) * 100
    end
  , 2) as challenge_accuracy_percent,
  sum(satisfaction_count) as satisfaction_count,
  sum(satisfaction_comments_count) as satisfaction_comments_count,
  round(avg(satisfaction_avg_rating), 2) as satisfaction_avg_rating,
  round(avg(satisfaction_diagnostic_avg_rating), 2) as satisfaction_diagnostic_avg_rating,
  round(avg(satisfaction_challenge_avg_rating), 2) as satisfaction_challenge_avg_rating
from public.vw_user_activity_daily
group by activity_date
order by activity_date desc;

create view public.vw_satisfaction_feedback_daily as
select
  date_trunc('day', created_at at time zone 'America/Sao_Paulo')::date as activity_date,
  context as context_type,
  case when context = 'desafios_sessao' then attempt_id end as challenge_id,
  case when context = 'diagnostico_resultado' then attempt_id end as diagnostic_id,
  count(*) as total_feedbacks,
  avg(rating)::numeric(5,2) as avg_rating,
  sum(case when rating = 1 then 1 else 0 end) as rating_1,
  sum(case when rating = 2 then 1 else 0 end) as rating_2,
  sum(case when rating = 3 then 1 else 0 end) as rating_3,
  sum(case when rating = 4 then 1 else 0 end) as rating_4,
  sum(case when rating = 5 then 1 else 0 end) as rating_5,
  sum(case when comment is not null and btrim(comment) <> '' then 1 else 0 end) as comments_count
from public.satisfaction_feedback
group by 1, 2, 3, 4
order by activity_date desc, context_type;

create view public.vw_satisfaction_comments_admin as
select
  date_trunc('day', created_at at time zone 'America/Sao_Paulo')::date as activity_date,
  created_at as feedback_created_at,
  context as context_type,
  anonymous_user_id,
  rating,
  comment,
  attempt_id,
  case when context = 'desafios_sessao' then attempt_id end as challenge_id,
  case when context = 'diagnostico_resultado' then attempt_id end as diagnostic_id
from public.satisfaction_feedback
where comment is not null and btrim(comment) <> ''
order by feedback_created_at desc;
