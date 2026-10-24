begin;

-- Consulta de leitura para resultados concluídos da identidade autenticada.
-- Não recebe user_id nem devolve tokens, respostas individuais ou gabaritos.
create function public.diagnostic_v2_my_results()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_results jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'attempt_id', owned.id,
    'started_at', owned.started_at,
    'completed_at', owned.completed_at,
    'result', owned.result_json
  ) order by owned.completed_at desc, owned.id desc), '[]'::jsonb)
  into v_results
  from (
    select a.id, a.started_at, a.completed_at, a.result_json
    from private.diagnostic_v2_attempts a
    where a.user_id = v_user_id
      and a.ever_authenticated = true
      and a.status in ('completed', 'insufficient_pool')
      and a.result_json is not null
    order by a.completed_at desc, a.id desc
    limit 10
  ) owned;

  return jsonb_build_object('methodology_version', 'v2.0', 'results', v_results);
end;
$$;

revoke all on function public.diagnostic_v2_my_results() from public, anon, authenticated;
grant execute on function public.diagnostic_v2_my_results() to authenticated;

commit;
