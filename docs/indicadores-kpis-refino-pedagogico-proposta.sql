-- PROPOSTA COMPLEMENTAR — NÃO EXECUTADA
-- Indicadores e KPIs — refinamento pedagógico antes e depois da resposta.
--
-- Atualiza somente scenario.title, scenario.context, indicator_title, indicator_description,
-- incorrect_feedback e thinking_steps das três práticas novas já existentes.
-- IDs, slugs, demais metadados, vínculos, tentativas e progresso dos usuários
-- permanecem preservados.

begin;

do $$
declare
  updated_activity_count integer;
begin
  with content_updates(
    activity_slug,
    scenario_title,
    scenario_context,
    indicator_title,
    indicator_description,
    thinking_steps
  ) as (
    values
      (
        'indicadores-definicao-consistente',
        'Duas equipes, critérios distintos',
        'As equipes Alfa e Beta publicaram taxas de satisfação para o mesmo período. As bases registram avaliações positivas, respostas válidas e total de atendimentos, mas os percentuais divulgados foram calculados com critérios diferentes.',
        'Compare somente métricas com a mesma definição',
        'Use os volumes apresentados para decidir quais registros representam o evento medido e a população comparável em cada equipe.',
        $json$
          [
            {"question": "O que a taxa pretende medir?", "answer": "Separe o evento contado da população que poderia produzi-lo."},
            {"question": "As bases são comparáveis?", "answer": "Confira definição, elegibilidade e período antes de calcular."},
            {"question": "A diferença é de desempenho ou método?", "answer": "Questione se a comparação mudaria com uma regra única."}
          ]
        $json$::jsonb
      ),
      (
        'indicadores-decomposicao-kpi',
        'Dois períodos, diferentes composições',
        'Chat e App registraram avaliações positivas e respostas válidas em dois períodos. A liderança quer comparar o resultado total e entender como a composição dos canais mudou.',
        'Compare os dois períodos por canal e no total',
        'Os canais têm volumes distintos em cada período. Considere os quatro pares de avaliações positivas e respostas válidas ao analisar o consolidado.',
        $json$
          [
            {"question": "Os grupos têm o mesmo peso?", "answer": "Observe os volumes antes de escolher como consolidar."},
            {"question": "Desempenho e participação mudaram?", "answer": "Compare as duas dimensões sem assumir qual canal explica o total."},
            {"question": "O dado observa ou explica?", "answer": "Diferencie sinal medido de hipótese causal."}
          ]
        $json$::jsonb
      ),
      (
        'indicadores-funil-conversao',
        'Onde investigar o funil do comércio eletrônico?',
        'Uma loja virtual registrou os volumes alcançados em cinco etapas, da visita à compra concluída, e quer decidir onde aprofundar a análise.',
        'Observe os volumes ao longo do funil',
        'Os valores mostram quantas pessoas chegaram a cada etapa. Compare as transições e diferencie a leitura entre etapas da visão do funil completo.',
        $json$
          [
            {"question": "Quem podia avançar nesta transição?", "answer": "Associe cada etapa ao grupo exposto à decisão seguinte."},
            {"question": "Você compara volume ou proporção?", "answer": "Defina o critério antes de apontar a maior perda."},
            {"question": "O funil observa ou explica?", "answer": "Use o padrão como ponto de partida para uma hipótese testável."}
          ]
        $json$::jsonb
      )
  ),
  feedback_updates(activity_slug, checkpoint_id, incorrect_feedback) as (
    values
      (
        'indicadores-definicao-consistente',
        'metodologia',
        'Volte à definição do indicador: identifique o evento medido e quem realmente teve oportunidade de responder antes de escolher o denominador.'
      ),
      (
        'indicadores-definicao-consistente',
        'calculo',
        'Refaça cada taxa com a definição escolhida no checkpoint anterior e confira se numerador, população elegível e período são comparáveis.'
      ),
      (
        'indicadores-definicao-consistente',
        'interpretacao',
        'Antes de concluir que uma equipe foi melhor, verifique se a diferença permanece quando as duas taxas seguem exatamente a mesma definição.'
      ),
      (
        'indicadores-decomposicao-kpi',
        'consolidado',
        'Evite tratar taxas de grupos com volumes diferentes como se tivessem o mesmo peso. Procure um cálculo que preserve a contribuição de cada grupo.'
      ),
      (
        'indicadores-decomposicao-kpi',
        'contribuicao',
        'Compare, para cada canal, duas dimensões ao mesmo tempo: mudança de desempenho e participação no volume total.'
      ),
      (
        'indicadores-decomposicao-kpi',
        'investigacao',
        'Separe o que os números observam do que ainda é hipótese. O próximo passo deve buscar evidências capazes de explicar o sinal.'
      ),
      (
        'indicadores-funil-conversao',
        'taxas',
        'Para cada percentual, identifique qual grupo realmente podia avançar para a etapa seguinte. Depois trate a conversão total como uma comparação distinta.'
      ),
      (
        'indicadores-funil-conversao',
        'perdas',
        'Calcule separadamente quantas pessoas saíram e qual fração não avançou; os dois critérios podem levar a leituras diferentes.'
      ),
      (
        'indicadores-funil-conversao',
        'recomendacao',
        'Escolha uma ação compatível com o que o funil observa: priorizar uma investigação é diferente de afirmar causa ou prometer impacto.'
      )
  ),
  rebuilt_checkpoints as (
    select
      activity.id,
      activity.slug,
      count(feedback.checkpoint_id) as matched_feedback_count,
      jsonb_agg(
        case
          when feedback.checkpoint_id is null then checkpoint.item
          else jsonb_set(
            checkpoint.item,
            '{incorrect_feedback}',
            to_jsonb(feedback.incorrect_feedback),
            true
          )
        end
        order by checkpoint.ordinality
      ) as checkpoints
    from public.learning_activities activity
    cross join lateral jsonb_array_elements(activity.metadata -> 'checkpoints')
      with ordinality as checkpoint(item, ordinality)
    left join feedback_updates feedback
      on feedback.activity_slug = activity.slug
     and feedback.checkpoint_id = checkpoint.item ->> 'id'
    where activity.track_slug = 'indicadores-e-kpis'
      and activity.slug in (
        'indicadores-definicao-consistente',
        'indicadores-decomposicao-kpi',
        'indicadores-funil-conversao'
      )
    group by activity.id, activity.slug
  ),
  updated as (
    update public.learning_activities activity
    set
      metadata = jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  activity.metadata,
                  '{checkpoints}',
                  rebuilt.checkpoints,
                  true
                ),
                '{thinking_steps}',
                content.thinking_steps,
                true
              ),
              '{scenario,title}',
              to_jsonb(content.scenario_title),
              true
            ),
            '{scenario,context}',
            to_jsonb(content.scenario_context),
            true
          ),
          '{indicator_title}',
          to_jsonb(content.indicator_title),
          true
        ),
        '{indicator_description}',
        to_jsonb(content.indicator_description),
        true
      ),
      updated_at = now()
    from rebuilt_checkpoints rebuilt, content_updates content
    where activity.id = rebuilt.id
      and content.activity_slug = rebuilt.slug
      and activity.track_slug = 'indicadores-e-kpis'
      and rebuilt.matched_feedback_count = 3
    returning activity.id
  )
  select count(*) into updated_activity_count from updated;

  if updated_activity_count <> 3 then
    raise exception
      'Esperadas 3 atividades com 3 checkpoints correspondentes; atualizadas: %',
      updated_activity_count;
  end if;
end
$$;

commit;
