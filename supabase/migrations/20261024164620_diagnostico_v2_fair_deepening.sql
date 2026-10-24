-- Fair area selection and explicit advanced evidence status. No table/RLS changes.
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
  v_advanced_attempted integer;
  v_advanced_status text;
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
      count(distinct iv.skill_code) filter (where iv.level='Avançado')::integer,
      count(distinct iv.skill_code)::integer
    into v_total,v_correct,v_basic,v_basic_wrong,v_intermediate,v_advanced,v_advanced_attempted,v_skills
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
    v_advanced_status := case
      when v_advanced_attempted < 2 then 'insufficient_evidence'
      when v_advanced >= 2 then 'provisional_demonstrated'
      else 'not_demonstrated' end;
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
      'demonstrated_level',v_level,'advanced_evidence_status',v_advanced_status,
      'advanced_distinct_items_answered',v_advanced_attempted,
      'confidence_band',v_confidence,
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
            count(distinct iv.skill_code) filter (where iv.level='Avançado' and ai.is_correct) advanced_hits,
            count(*) filter (where ai.id is not null and iv.level='Avançado') advanced_count
          from (values ('SQL'),('Estatística'),('Excel'),('Lógica de dados'),('Indicadores')) a(area)
          left join private.diagnostic_v2_item_versions iv on iv.area=a.area
          left join private.diagnostic_v2_attempt_items ai
            on ai.item_version_id=iv.id and ai.attempt_id=v_attempt.id
          group by a.area
        ) candidate
        where candidate.basic_hits>=2 and candidate.intermediate_hits>=2
          and candidate.advanced_count<2
        order by candidate.basic_hits + candidate.intermediate_hits + candidate.advanced_hits desc,
          candidate.advanced_count desc,
          md5(v_attempt.id::text || ':' || candidate.area)
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
