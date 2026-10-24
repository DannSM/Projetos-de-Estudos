-- Conteúdo inteiramente sintético. Executar apenas na stack isolada.
insert into private.diagnostic_v2_item_versions
  (item_key, version, area, level, skill_code, question_type, stem,
   options, correct_option_id, published_at)
select
  'synthetic-' || area.slug || '-' || level.slug || '-' || item.n,
  1, area.label, level.label,
  'synthetic.' || area.slug || '.' || level.slug || '.' || item.n,
  'multiple_choice',
  'Questão sintética ' || area.label || ' ' || level.label || ' ' || item.n,
  '[{"id":"a","text":"Alternativa A"},
    {"id":"b","text":"Alternativa B"},
    {"id":"c","text":"Alternativa C"},
    {"id":"d","text":"Alternativa D"}]'::jsonb,
  'a', now()
from (values
  ('SQL','sql'), ('Estatística','estatistica'), ('Excel','excel'),
  ('Lógica de dados','logica'), ('Indicadores','indicadores')
) area(label,slug)
cross join (values
  ('Básico','basico'), ('Intermediário','intermediario'),
  ('Avançado','avancado')
) level(label,slug)
cross join generate_series(1,4) item(n);

update private.diagnostic_v2_blueprints
set is_active = true
where version = 'v2-pilot-1';
