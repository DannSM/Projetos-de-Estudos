create schema if not exists private;

create or replace function private.claim_anonymous_diagnostic(
  p_attempt_id text,
  p_anonymous_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_user_id uuid;
  v_finished_at timestamptz;
  v_sessions integer := 0;
  v_answers integer := 0;
  v_events integer := 0;
  v_feedback integer := 0;
  v_status text := 'claimed';
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_attempt_id is null
    or p_attempt_id !~ '^diag_[A-Za-z0-9_-]+$'
    or p_anonymous_user_id is null
    or length(p_anonymous_user_id) > 200 then
    raise exception 'invalid diagnostic claim parameters' using errcode = '22023';
  end if;

  select user_id, coalesce(finished_at, created_at)
    into v_session_user_id, v_finished_at
  from public.diagnostic_sessions
  where attempt_id = p_attempt_id
    and anonymous_user_id = p_anonymous_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found', 'attempt_id', p_attempt_id);
  end if;

  if v_session_user_id is not null and v_session_user_id <> v_user_id then
    return jsonb_build_object('status', 'claimed_by_other', 'attempt_id', p_attempt_id);
  end if;

  if v_session_user_id = v_user_id then
    v_status := 'already_claimed';
  elsif v_finished_at < now() - interval '24 hours' then
    return jsonb_build_object('status', 'expired', 'attempt_id', p_attempt_id);
  end if;

  update public.diagnostic_sessions
  set user_id = v_user_id
  where attempt_id = p_attempt_id
    and anonymous_user_id = p_anonymous_user_id
    and user_id is null;
  get diagnostics v_sessions = row_count;

  update public.diagnostic_answers
  set user_id = v_user_id
  where attempt_id = p_attempt_id
    and anonymous_user_id = p_anonymous_user_id
    and user_id is null;
  get diagnostics v_answers = row_count;

  update public.diagnostic_funnel_events
  set user_id = v_user_id
  where attempt_id = p_attempt_id
    and anonymous_user_id = p_anonymous_user_id
    and user_id is null;
  get diagnostics v_events = row_count;

  update public.satisfaction_feedback
  set user_id = v_user_id
  where attempt_id = p_attempt_id
    and anonymous_user_id = p_anonymous_user_id
    and user_id is null;
  get diagnostics v_feedback = row_count;

  return jsonb_build_object(
    'status', v_status,
    'attempt_id', p_attempt_id,
    'diagnostic_sessions', v_sessions,
    'diagnostic_answers', v_answers,
    'diagnostic_funnel_events', v_events,
    'satisfaction_feedback', v_feedback
  );
end;
$$;

revoke all on function private.claim_anonymous_diagnostic(text, text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.claim_anonymous_diagnostic(text, text) to authenticated;

create or replace function public.claim_anonymous_diagnostic(
  p_attempt_id text,
  p_anonymous_user_id text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.claim_anonymous_diagnostic(p_attempt_id, p_anonymous_user_id);
$$;

revoke all on function public.claim_anonymous_diagnostic(text, text) from public, anon;
grant execute on function public.claim_anonymous_diagnostic(text, text) to authenticated;
