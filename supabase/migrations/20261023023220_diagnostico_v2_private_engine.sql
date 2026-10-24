-- Motor V2 isolado. Nenhuma questão/gabarito é copiada da V1.
-- Sem itens publicados, o motor não inicia uma avaliação.
begin;

create schema if not exists private;

create table private.diagnostic_v2_blueprints (
  version text primary key,
  algorithm_version text not null,
  max_items integer not null check (max_items = 25),
  rules jsonb not null check (rules =
    '{"mapping_per_area":{"basic":2,"intermediate":1},"validation_per_area":1,"advanced_max":5}'::jsonb),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  check (version = 'v2-pilot-1' and algorithm_version = 'deterministic-1')
);

insert into private.diagnostic_v2_blueprints
  (version, algorithm_version, max_items, rules, is_active)
values
  ('v2-pilot-1', 'deterministic-1', 25,
   '{"mapping_per_area":{"basic":2,"intermediate":1},"validation_per_area":1,"advanced_max":5}'::jsonb,
   false);

create or replace function private.diagnostic_v2_guard_blueprint()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'blueprint definition is immutable' using errcode = '23514';
  end if;
  if (to_jsonb(new) - 'is_active') is distinct from
    (to_jsonb(old) - 'is_active') then
    raise exception 'blueprint definition is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger diagnostic_v2_blueprint_guard
before update or delete on private.diagnostic_v2_blueprints
for each row execute function private.diagnostic_v2_guard_blueprint();

create table private.diagnostic_v2_item_versions (
  id uuid primary key default gen_random_uuid(),
  item_key text not null,
  version integer not null check (version > 0),
  area text not null check (area in
    ('SQL', 'Estatística', 'Excel', 'Lógica de dados', 'Indicadores')),
  level text not null check (level in ('Básico', 'Intermediário', 'Avançado')),
  skill_code text not null,
  question_type text not null,
  stem text not null,
  context text,
  code text,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_option_id text not null,
  explanation text,
  editorial_difficulty integer check (editorial_difficulty between 1 and 5),
  estimated_seconds integer check (estimated_seconds > 0),
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  unique (item_key, version),
  check (length(btrim(item_key)) > 0),
  check (length(btrim(skill_code)) > 0),
  check (length(btrim(stem)) > 0),
  check (retired_at is null or published_at is not null)
);
create index diagnostic_v2_item_pool_idx
  on private.diagnostic_v2_item_versions (area, level, published_at)
  where retired_at is null;

create or replace function private.diagnostic_v2_guard_item_version()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_count integer;
  v_distinct integer;
begin
  if tg_op = 'DELETE' and old.published_at is not null then
    raise exception 'published item versions are immutable' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.published_at is not null then
    if (to_jsonb(new) - 'retired_at') is distinct from
       (to_jsonb(old) - 'retired_at')
       or old.retired_at is not null
       or new.retired_at is null
       or new.retired_at < old.published_at
       or new.retired_at > now() then
      raise exception 'published item versions are immutable except retirement'
        using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  v_count := jsonb_array_length(new.options);
  if v_count <> 4 then
    raise exception 'exactly four options required' using errcode = '23514';
  end if;
  select count(distinct value->>'id') into v_distinct
  from jsonb_array_elements(new.options);
  if v_distinct <> 4
    or exists (
      select 1 from jsonb_array_elements(new.options)
      where coalesce(value->>'id','') = ''
        or coalesce(value->>'text','') = ''
    )
    or not exists (
      select 1 from jsonb_array_elements(new.options)
      where value->>'id' = new.correct_option_id
    ) then
    raise exception 'invalid option IDs or correct option' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger diagnostic_v2_item_version_guard
before insert or update or delete on private.diagnostic_v2_item_versions
for each row execute function private.diagnostic_v2_guard_item_version();

create table private.diagnostic_v2_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  ever_authenticated boolean not null default false,
  anonymous_access_expires_at timestamptz not null default (now() + interval '24 hours'),
  start_idempotency_key uuid not null unique,
  attempt_token_hash bytea not null unique,
  claim_token_hash bytea not null unique,
  blueprint_version text not null references private.diagnostic_v2_blueprints(version),
  algorithm_version text not null,
  methodology_version text not null default 'v2.0'
    check (methodology_version = 'v2.0'),
  status text not null default 'active'
    check (status in ('active','completed','insufficient_pool')),
  device_class text check (device_class in ('desktop','mobile','tablet','unknown')),
  selection_cursor integer not null default 0
    check (selection_cursor between 0 and 25),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  claimed_at timestamptz,
  result_json jsonb,
  check (status = 'active' or completed_at is not null),
  check (user_id is null or ever_authenticated)
);
create index diagnostic_v2_attempt_owner_idx
  on private.diagnostic_v2_attempts (user_id, started_at desc);

create table private.diagnostic_v2_attempt_items (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references private.diagnostic_v2_attempts(id) on delete cascade,
  item_version_id uuid not null references private.diagnostic_v2_item_versions(id),
  position integer not null check (position between 1 and 25),
  stage text not null check (stage in ('mapping','validation','deepening')),
  option_order jsonb not null check (jsonb_typeof(option_order) = 'array'),
  presented_at timestamptz not null default now(),
  answered_at timestamptz,
  selected_option_id text,
  is_correct boolean,
  response_ms bigint check (response_ms >= 0),
  idempotency_key uuid,
  unique (attempt_id, position),
  unique (attempt_id, item_version_id),
  unique (attempt_id, idempotency_key),
  check ((answered_at is null and selected_option_id is null and is_correct is null)
    or (answered_at is not null and selected_option_id is not null and is_correct is not null))
);
create index diagnostic_v2_item_statistics_idx
  on private.diagnostic_v2_attempt_items (item_version_id, answered_at)
  where answered_at is not null;

create table private.diagnostic_v2_events (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references private.diagnostic_v2_attempts(id) on delete cascade,
  attempt_item_id uuid references private.diagnostic_v2_attempt_items(id),
  event_type text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object')
);
create index diagnostic_v2_events_attempt_idx
  on private.diagnostic_v2_events (attempt_id, created_at);

create table private.diagnostic_v2_recommendations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references private.diagnostic_v2_attempts(id) on delete cascade,
  area text not null check (area in
    ('SQL', 'Estatística', 'Excel', 'Lógica de dados', 'Indicadores')),
  recommendation_code text not null check (recommendation_code in
    ('collect_more_evidence','review_fundamentals','study_intermediate','deepen_advanced')),
  priority integer not null check (priority between 1 and 4),
  methodology_version text not null default 'v2.0',
  created_at timestamptz not null default now(),
  unique (attempt_id, area)
);

alter table private.diagnostic_v2_blueprints enable row level security;
alter table private.diagnostic_v2_item_versions enable row level security;
alter table private.diagnostic_v2_attempts enable row level security;
alter table private.diagnostic_v2_attempt_items enable row level security;
alter table private.diagnostic_v2_events enable row level security;
alter table private.diagnostic_v2_recommendations enable row level security;
revoke all on table private.diagnostic_v2_blueprints,
  private.diagnostic_v2_item_versions, private.diagnostic_v2_attempts,
  private.diagnostic_v2_attempt_items, private.diagnostic_v2_events,
  private.diagnostic_v2_recommendations
  from public, anon, authenticated;
revoke all on sequence private.diagnostic_v2_events_id_seq
  from public, anon, authenticated;

-- Mesmo a função interna revalida o token e a propriedade da tentativa.
create or replace function private.diagnostic_v2_check_attempt(
  p_attempt_token text, p_lock boolean default true
)
returns private.diagnostic_v2_attempts
language plpgsql security definer set search_path = '' as $$
declare
  v_attempt private.diagnostic_v2_attempts;
begin
  if p_attempt_token is null or length(p_attempt_token) < 60 then
    raise exception 'invalid attempt token' using errcode = '42501';
  end if;
  if p_lock then
    select * into v_attempt from private.diagnostic_v2_attempts
    where attempt_token_hash = sha256(convert_to(p_attempt_token,'UTF8'))
    for update;
  else
    select * into v_attempt from private.diagnostic_v2_attempts
    where attempt_token_hash = sha256(convert_to(p_attempt_token,'UTF8'));
  end if;
  if v_attempt.id is null
    or (v_attempt.ever_authenticated and
      (v_attempt.user_id is null or v_attempt.user_id is distinct from auth.uid()))
    or (not v_attempt.ever_authenticated and
      v_attempt.anonymous_access_expires_at <= now()) then
    raise exception 'attempt not found or forbidden' using errcode = '42501';
  end if;
  return v_attempt;
end;
$$;

create or replace function private.diagnostic_v2_finish(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_area text;
  v_areas jsonb := '[]'::jsonb;
  v_total integer;
  v_correct integer;
  v_basic integer;
  v_basic_wrong integer;
  v_intermediate integer;
  v_advanced integer;
  v_skills integer;
  v_level text;
  v_confidence text;
  v_recommendation text;
  v_priority integer;
  v_skills_json jsonb;
  v_blueprint_version text;
  v_algorithm_version text;
  v_mapping_answered integer;
  v_result jsonb;
begin
  select blueprint_version,algorithm_version
    into v_blueprint_version,v_algorithm_version
  from private.diagnostic_v2_attempts where id=p_attempt_id;
  select count(*)::integer into v_mapping_answered
  from private.diagnostic_v2_attempt_items
  where attempt_id=p_attempt_id and stage='mapping' and answered_at is not null;
  foreach v_area in array array['SQL','Estatística','Excel','Lógica de dados','Indicadores'] loop
    select count(*)::integer,
      count(*) filter (where ai.is_correct)::integer,
      count(distinct iv.skill_code) filter (where iv.level='Básico' and ai.is_correct)::integer,
      count(*) filter (where iv.level='Básico' and not ai.is_correct)::integer,
      count(distinct iv.skill_code) filter (where iv.level='Intermediário' and ai.is_correct)::integer,
      count(distinct iv.skill_code) filter (where iv.level='Avançado' and ai.is_correct)::integer,
      count(distinct iv.skill_code)::integer
    into v_total,v_correct,v_basic,v_basic_wrong,v_intermediate,v_advanced,v_skills
    from private.diagnostic_v2_attempt_items ai
    join private.diagnostic_v2_item_versions iv on iv.id=ai.item_version_id
    where ai.attempt_id=p_attempt_id and ai.answered_at is not null and iv.area=v_area;
    v_level := case
      when v_basic >= 2 and v_intermediate >= 2 and v_advanced >= 2 then 'Avançado provisório'
      when v_basic >= 2 and v_intermediate >= 2 then 'Intermediário demonstrado'
      when v_basic >= 2 then 'Fundamentos demonstrados'
      when v_basic_wrong >= 2 then 'Fundamentos a revisar'
      else 'Indeterminado'
    end;
    v_confidence := case
      when v_basic >= 2 and v_total >= 3 and v_skills >= 2 then 'moderada'
      else 'baixa'
    end;
    select coalesce(jsonb_agg(jsonb_build_object(
      'skill_code',skill_code,'correct',correct,'total',total,
      'evidence_sufficient',total >= 2) order by skill_code),'[]'::jsonb)
    into v_skills_json from (
      select iv.skill_code, count(*)::integer total,
        count(*) filter (where ai.is_correct)::integer correct
      from private.diagnostic_v2_attempt_items ai
      join private.diagnostic_v2_item_versions iv on iv.id=ai.item_version_id
      where ai.attempt_id=p_attempt_id and ai.answered_at is not null and iv.area=v_area
      group by iv.skill_code
    ) skill_evidence;
    v_recommendation := case
      when v_level = 'Indeterminado' then 'collect_more_evidence'
      when v_basic < 2 then 'review_fundamentals'
      when v_intermediate < 2 then 'study_intermediate'
      else 'deepen_advanced'
    end;
    v_priority := case v_recommendation
      when 'review_fundamentals' then 1
      when 'study_intermediate' then 2
      when 'collect_more_evidence' then 3
      else 4 end;
    insert into private.diagnostic_v2_recommendations
      (attempt_id,area,recommendation_code,priority)
    values (p_attempt_id,v_area,v_recommendation,v_priority);
    v_areas := v_areas || jsonb_build_array(jsonb_build_object(
      'area',v_area,'correct',v_correct,'total',v_total,
      'score_percent',case when v_total=0 then null
        else round(v_correct::numeric*100/v_total,1) end,
      'demonstrated_level',v_level,'confidence_band',v_confidence,
      'distinct_skills',v_skills,'skills',v_skills_json,
      'evidence_sufficient',v_total>=2 and v_skills>=2,
      'recommendation_code',v_recommendation,'priority',v_priority));
  end loop;
  v_result := jsonb_build_object(
    'methodology_version','v2.0','algorithm_version',v_algorithm_version,
    'blueprint_version',v_blueprint_version,
    'areas',v_areas,'completed_at',now());
  update private.diagnostic_v2_attempts
  set status=case when v_mapping_answered < 15 then 'insufficient_pool' else 'completed' end,
      completed_at=now(),result_json=v_result
  where id=p_attempt_id and status='active';
  insert into private.diagnostic_v2_events(attempt_id,event_type)
  values (p_attempt_id,'completed');
  return v_result;
end;
$$;

create or replace function private.diagnostic_v2_start(
  p_device_class text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_token text := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  v_claim text := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  v_attempt_id uuid;
  v_blueprint private.diagnostic_v2_blueprints;
  v_existing private.diagnostic_v2_attempts;
begin
  if p_idempotency_key is null then
    raise exception 'start idempotency key required' using errcode = '22023';
  end if;
  if p_device_class not in ('desktop','mobile','tablet','unknown') then
    raise exception 'invalid device class' using errcode = '22023';
  end if;
  select * into v_blueprint from private.diagnostic_v2_blueprints
  where is_active=true order by created_at desc limit 1;
  if v_blueprint.version is null then
    raise exception 'diagnostic v2 unavailable' using errcode = 'P0001';
  end if;
  if not exists (select 1 from private.diagnostic_v2_item_versions
    where published_at <= now() and retired_at is null) then
    raise exception 'diagnostic v2 item pool unavailable' using errcode = 'P0001';
  end if;
  -- Serializa inícios da mesma conta e reenvios anônimos da mesma chave.
  perform pg_advisory_xact_lock(hashtextextended(
    coalesce(auth.uid()::text, p_idempotency_key::text), 0));
  select * into v_existing from private.diagnostic_v2_attempts
    where start_idempotency_key=p_idempotency_key;
  if v_existing.id is not null then
    if (v_existing.ever_authenticated and
      v_existing.user_id is distinct from auth.uid()) or
      (not v_existing.ever_authenticated and
        v_existing.anonymous_access_expires_at<=now()) then
      raise exception 'start key already used' using errcode = '42501';
    end if;
    -- Tokens não são guardados em texto puro; o cliente conserva a primeira resposta.
    return jsonb_build_object('status','already_started','attempt_id',v_existing.id);
  end if;
  if auth.uid() is not null and (
    select count(*) from private.diagnostic_v2_attempts
    where user_id=auth.uid() and started_at>now()-interval '24 hours'
  ) >= 5 then
    raise exception 'diagnostic rate limit' using errcode = 'P0001';
  end if;
  insert into private.diagnostic_v2_attempts
    (user_id,ever_authenticated,start_idempotency_key,
     attempt_token_hash,claim_token_hash,blueprint_version,algorithm_version,device_class)
  values
    (auth.uid(),auth.uid() is not null,p_idempotency_key,
     sha256(convert_to(v_token,'UTF8')),sha256(convert_to(v_claim,'UTF8')),
     v_blueprint.version,v_blueprint.algorithm_version,p_device_class)
  returning id into v_attempt_id;
  insert into private.diagnostic_v2_events(attempt_id,event_type)
  values (v_attempt_id,'started');
  return jsonb_build_object('status','started','attempt_id',v_attempt_id,'attempt_token',v_token,
    'claim_token',case when auth.uid() is null then v_claim else null end,
    'methodology_version','v2.0',
    'blueprint_version',v_blueprint.version);
end;
$$;

create or replace function private.diagnostic_v2_next(p_attempt_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_attempt private.diagnostic_v2_attempts;
  v_blueprint private.diagnostic_v2_blueprints;
  v_current private.diagnostic_v2_attempt_items;
  v_item private.diagnostic_v2_item_versions;
  v_position integer;
  v_area text;
  v_level text;
  v_stage text;
  v_basic_correct integer;
  v_order jsonb;
  v_public_options jsonb;
begin
  v_attempt := private.diagnostic_v2_check_attempt(p_attempt_token,true);
  select * into v_blueprint from private.diagnostic_v2_blueprints
    where version=v_attempt.blueprint_version;
  if v_attempt.status <> 'active' then
    return jsonb_build_object('status',v_attempt.status,'result',v_attempt.result_json);
  end if;
  select * into v_current from private.diagnostic_v2_attempt_items
  where attempt_id=v_attempt.id and answered_at is null
  order by position desc limit 1;
  if v_current.id is not null then
    select * into v_item from private.diagnostic_v2_item_versions
    where id=v_current.item_version_id;
  else
    while v_attempt.selection_cursor < v_blueprint.max_items loop
      v_position := v_attempt.selection_cursor + 1;
      v_attempt.selection_cursor := v_position;
      update private.diagnostic_v2_attempts
        set selection_cursor=v_position where id=v_attempt.id;
      v_area := (array['SQL','Estatística','Excel','Lógica de dados','Indicadores'])
        [((v_position-1) % 5)+1];
      if v_position <= 10 then
        v_level := 'Básico'; v_stage := 'mapping';
      elsif v_position <= 15 then
        v_level := 'Intermediário'; v_stage := 'mapping';
      elsif v_position <= 20 then
        select count(distinct iv.skill_code)::integer into v_basic_correct
        from private.diagnostic_v2_attempt_items ai
        join private.diagnostic_v2_item_versions iv on iv.id=ai.item_version_id
        where ai.attempt_id=v_attempt.id and iv.area=v_area
          and iv.level='Básico' and ai.is_correct;
        v_level := case when v_basic_correct>=2 then 'Intermediário' else 'Básico' end;
        v_stage := 'validation';
      else
        select candidate.area into v_area from (
          select a.area,
            count(distinct iv.skill_code) filter (where iv.level='Básico' and ai.is_correct) basic_hits,
            count(distinct iv.skill_code) filter (where iv.level='Intermediário' and ai.is_correct) intermediate_hits,
            count(*) filter (where ai.id is not null and iv.level='Avançado') advanced_count
          from (values ('SQL'),('Estatística'),('Excel'),('Lógica de dados'),('Indicadores')) a(area)
          left join private.diagnostic_v2_item_versions iv on iv.area=a.area
          left join private.diagnostic_v2_attempt_items ai
            on ai.item_version_id=iv.id and ai.attempt_id=v_attempt.id
          group by a.area
        ) candidate
        where candidate.basic_hits>=2 and candidate.intermediate_hits>=2
          and candidate.advanced_count<2
        order by candidate.advanced_count desc,
          array_position(array['SQL','Estatística','Excel','Lógica de dados','Indicadores'],
            candidate.area)
        limit 1;
        if v_area is null then exit; end if;
        v_level := 'Avançado'; v_stage := 'deepening';
      end if;
      select * into v_item from private.diagnostic_v2_item_versions iv
      where iv.area=v_area and iv.level=v_level
        and iv.published_at <= now() and iv.retired_at is null
        and not exists (select 1 from private.diagnostic_v2_attempt_items ai
          where ai.attempt_id=v_attempt.id and ai.item_version_id=iv.id)
      order by
        exists (select 1 from private.diagnostic_v2_attempt_items ai
          join private.diagnostic_v2_item_versions seen on seen.id=ai.item_version_id
          where ai.attempt_id=v_attempt.id and seen.area=iv.area
            and seen.skill_code=iv.skill_code),
        (select max(ai.answered_at) from private.diagnostic_v2_attempt_items ai
          join private.diagnostic_v2_attempts aa on aa.id=ai.attempt_id
          where ai.item_version_id=iv.id and aa.user_id=v_attempt.user_id) asc nulls first,
        md5(iv.id::text || v_attempt.id::text)
      limit 1;
      if v_item.id is null then
        insert into private.diagnostic_v2_events(attempt_id,event_type,metadata)
        values (v_attempt.id,'pool_gap',jsonb_build_object('area',v_area,'level',v_level));
        continue;
      end if;
      select jsonb_agg(value->>'id' order by
        md5((value->>'id') || v_item.id::text || v_attempt.id::text))
        into v_order from jsonb_array_elements(v_item.options);
      insert into private.diagnostic_v2_attempt_items
        (attempt_id,item_version_id,position,stage,option_order)
      values (v_attempt.id,v_item.id,v_position,v_stage,v_order)
      returning * into v_current;
      insert into private.diagnostic_v2_events(attempt_id,attempt_item_id,event_type)
      values (v_attempt.id,v_current.id,'item_presented');
      exit;
    end loop;
  end if;
  if v_current.id is null then
    perform private.diagnostic_v2_finish(v_attempt.id);
    select * into v_attempt from private.diagnostic_v2_attempts where id=v_attempt.id;
    return jsonb_build_object('status',v_attempt.status,'result',v_attempt.result_json);
  end if;
  select jsonb_agg(jsonb_build_object('id',o.value->>'id','text',o.value->>'text')
    order by ord.ordinality) into v_public_options
  from jsonb_array_elements_text(v_current.option_order) with ordinality ord(option_id,ordinality)
  join jsonb_array_elements(v_item.options) o
    on o.value->>'id'=ord.option_id;
  return jsonb_build_object('status','active','attempt_item_id',v_current.id,
    'position',v_current.position,'stage',v_current.stage,'area',v_item.area,
    'level',v_item.level,'skill_code',v_item.skill_code,
    'question',v_item.stem,'context',v_item.context,'code',v_item.code,
    'options',v_public_options,'methodology_version','v2.0');
end;
$$;

create or replace function private.diagnostic_v2_submit(
  p_attempt_token text,p_attempt_item_id uuid,p_selected_option_id text,
  p_idempotency_key uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_attempt private.diagnostic_v2_attempts;
  v_presented private.diagnostic_v2_attempt_items;
  v_item private.diagnostic_v2_item_versions;
begin
  if p_idempotency_key is null or p_attempt_item_id is null
    or p_selected_option_id is null then
    raise exception 'missing answer fields' using errcode = '22023';
  end if;
  v_attempt := private.diagnostic_v2_check_attempt(p_attempt_token,true);
  select * into v_presented from private.diagnostic_v2_attempt_items
  where id=p_attempt_item_id and attempt_id=v_attempt.id for update;
  if v_presented.id is null then
    raise exception 'item not presented in this attempt' using errcode = '42501';
  end if;
  if v_presented.answered_at is not null then
    if v_presented.idempotency_key=p_idempotency_key
      and v_presented.selected_option_id=p_selected_option_id then
      return jsonb_build_object('status','accepted','attempt_item_id',v_presented.id,
        'idempotent',true);
    end if;
    raise exception 'item already answered' using errcode = '23505';
  end if;
  if v_attempt.status <> 'active' then
    raise exception 'attempt already finished' using errcode = '23514';
  end if;
  select * into v_item from private.diagnostic_v2_item_versions
  where id=v_presented.item_version_id;
  if not exists (select 1 from jsonb_array_elements(v_item.options)
    where value->>'id'=p_selected_option_id) then
    raise exception 'option not presented' using errcode = '22023';
  end if;
  update private.diagnostic_v2_attempt_items
  set selected_option_id=p_selected_option_id,
      is_correct=(p_selected_option_id=v_item.correct_option_id),
      answered_at=now(),
      response_ms=greatest(0,(extract(epoch from now()-presented_at)*1000)::bigint),
      idempotency_key=p_idempotency_key
  where id=v_presented.id;
  insert into private.diagnostic_v2_events(attempt_id,attempt_item_id,event_type)
  values (v_attempt.id,v_presented.id,'item_answered');
  return jsonb_build_object('status','accepted','attempt_item_id',v_presented.id,
    'idempotent',false);
end;
$$;

create or replace function private.diagnostic_v2_result(p_attempt_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_attempt private.diagnostic_v2_attempts;
begin
  v_attempt := private.diagnostic_v2_check_attempt(p_attempt_token,false);
  return jsonb_build_object('status',v_attempt.status,'result',v_attempt.result_json);
end;
$$;

create or replace function private.diagnostic_v2_claim(p_claim_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_attempt private.diagnostic_v2_attempts;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or p_claim_token is null or length(p_claim_token)<60 then
    raise exception 'authentication and claim token required' using errcode = '42501';
  end if;
  select * into v_attempt from private.diagnostic_v2_attempts
  where claim_token_hash=sha256(convert_to(p_claim_token,'UTF8')) for update;
  if v_attempt.id is null then
    raise exception 'claim not found' using errcode = '42501';
  end if;
  if v_attempt.user_id=v_user_id then
    return jsonb_build_object('status','already_claimed','attempt_id',v_attempt.id);
  end if;
  if v_attempt.user_id is not null or v_attempt.ever_authenticated
    or v_attempt.anonymous_access_expires_at<=now() then
    raise exception 'claim forbidden or expired' using errcode = '42501';
  end if;
  update private.diagnostic_v2_attempts
  set user_id=v_user_id,ever_authenticated=true,claimed_at=now() where id=v_attempt.id;
  insert into private.diagnostic_v2_events(attempt_id,event_type)
  values (v_attempt.id,'claimed');
  return jsonb_build_object('status','claimed','attempt_id',v_attempt.id);
end;
$$;

-- Funções SECURITY DEFINER permanecem no schema private (confirmar na
-- homologação que ele não está exposto na Data API). Wrappers
-- públicos são SECURITY INVOKER e não recebem privilégios nas tabelas.
revoke all on function private.diagnostic_v2_guard_blueprint(),
  private.diagnostic_v2_guard_item_version(),
  private.diagnostic_v2_check_attempt(text,boolean),
  private.diagnostic_v2_finish(uuid), private.diagnostic_v2_start(text,uuid),
  private.diagnostic_v2_next(text),
  private.diagnostic_v2_submit(text,uuid,text,uuid),
  private.diagnostic_v2_result(text), private.diagnostic_v2_claim(text)
  from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.diagnostic_v2_start(text,uuid) to anon, authenticated;
grant execute on function private.diagnostic_v2_next(text) to anon, authenticated;
grant execute on function private.diagnostic_v2_submit(text,uuid,text,uuid)
  to anon, authenticated;
grant execute on function private.diagnostic_v2_result(text) to anon, authenticated;
grant execute on function private.diagnostic_v2_claim(text) to authenticated;

create or replace function public.diagnostic_v2_start(
  p_device_class text, p_idempotency_key uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.diagnostic_v2_start(p_device_class,p_idempotency_key);
$$;
create or replace function public.diagnostic_v2_next(p_attempt_token text)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.diagnostic_v2_next(p_attempt_token);
$$;
create or replace function public.diagnostic_v2_submit(
  p_attempt_token text,p_attempt_item_id uuid,p_selected_option_id text,
  p_idempotency_key uuid
)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.diagnostic_v2_submit(
    p_attempt_token,p_attempt_item_id,p_selected_option_id,p_idempotency_key);
$$;
create or replace function public.diagnostic_v2_result(p_attempt_token text)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.diagnostic_v2_result(p_attempt_token);
$$;
create or replace function public.diagnostic_v2_claim(p_claim_token text)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.diagnostic_v2_claim(p_claim_token);
$$;

revoke all on function public.diagnostic_v2_start(text,uuid) from public, anon, authenticated;
revoke all on function public.diagnostic_v2_next(text) from public, anon, authenticated;
revoke all on function public.diagnostic_v2_submit(text,uuid,text,uuid)
  from public, anon, authenticated;
revoke all on function public.diagnostic_v2_result(text) from public, anon, authenticated;
revoke all on function public.diagnostic_v2_claim(text) from public, anon, authenticated;
grant execute on function public.diagnostic_v2_start(text,uuid) to anon, authenticated;
grant execute on function public.diagnostic_v2_next(text) to anon, authenticated;
grant execute on function public.diagnostic_v2_submit(text,uuid,text,uuid)
  to anon, authenticated;
grant execute on function public.diagnostic_v2_result(text) to anon, authenticated;
grant execute on function public.diagnostic_v2_claim(text) to authenticated;

commit;
