-- PROPOSTA DE CARGA — NÃO EXECUTADA
-- Indicadores e KPIs — jornada completa
-- Revisar integralmente antes de aplicar em qualquer ambiente.
-- Este arquivo adiciona somente conteúdo e vínculos. Não altera schema, views,
-- RLS, policies, grants, Auth, dados de usuários ou a atividade original
-- indicadores-meta-resultado.
--
-- Duração proposta: 55 minutos (10 minutos da etapa existente + 15 minutos
-- para cada uma das três novas etapas). O valor substitui, após aprovação,
-- os 120 minutos hoje cadastrados para a trilha.

begin;

insert into public.learning_activities (
  slug, activity_type, title, subtitle, track_slug, track_title, step_order,
  status, level_label, estimated_minutes, is_active, metadata
)
values
  (
    'indicadores-definicao-consistente',
    'practice',
    'Definição consistente',
    'Prática guiada de definição de indicadores',
    'indicadores-e-kpis',
    'Indicadores e KPIs',
    2,
    'active',
    'Básico',
    15,
    true,
    $metadata$
    {
      "format": "guided_practice",
      "content_version": 1,
      "source": "indicadores_kpis_jornada_v1",
      "step_key": "indicadores-02-definicao-consistente",
      "response_schema": "checkpoint_sequence",
      "completion_rule": "all_required_checkpoints_correct",
      "completion_progress_percent": 50,
      "objective": "Definir numerador, denominador, população e período antes de comparar um indicador.",
      "scenario": {
        "title": "A mesma satisfação, duas metodologias",
        "context": "As equipes Alfa e Beta divulgaram taxas de satisfação do mesmo período, mas o relatório da Beta dividiu avaliações positivas por todos os atendimentos, enquanto a regra correta usa somente respostas válidas."
      },
      "indicator_title": "Compare somente métricas com a mesma definição",
      "indicator_description": "Avaliações positivas são o numerador. Respostas válidas, no mesmo período, formam o denominador elegível.",
      "indicator_data": [
        {"label": "Alfa", "value": "92 positivas / 115 válidas"},
        {"label": "Beta", "value": "96 positivas / 120 válidas"},
        {"label": "Atendimentos Alfa", "value": "150"},
        {"label": "Atendimentos Beta", "value": "160", "tone": "alert"}
      ],
      "checkpoints": [
        {
          "id": "metodologia",
          "title": "Defina a população elegível",
          "question": "Qual fórmula torna as duas equipes comparáveis?",
          "options": [
            {"id": "A", "text": "Avaliações positivas ÷ respostas válidas do mesmo período, para as duas equipes."},
            {"id": "B", "text": "Avaliações positivas ÷ todos os atendimentos, mesmo quando nem todos responderam."},
            {"id": "C", "text": "Respostas válidas ÷ avaliações positivas, porque o maior número deve ser o numerador."},
            {"id": "D", "text": "Usar uma fórmula diferente para cada equipe, desde que o percentual seja publicado."}
          ],
          "correct_option": "A",
          "correct_title": "Definição alinhada",
          "incorrect_title": "Revise numerador e população elegível",
          "correct_feedback": "A taxa de satisfação usa avaliações positivas como numerador e respostas válidas como denominador. Aplicar a mesma regra e o mesmo período torna a comparação defensável.",
          "incorrect_feedback": "Atendimentos sem resposta não pertencem à população elegível dessa taxa. As duas equipes precisam usar avaliações positivas divididas por respostas válidas no mesmo período.",
          "attention": "O denominador deve representar quem realmente podia contribuir para a medida calculada.",
          "required": true
        },
        {
          "id": "calculo",
          "title": "Corrija as taxas",
          "question": "Quais são as taxas comparáveis de Alfa e Beta?",
          "options": [
            {"id": "A", "text": "Alfa 61,3% e Beta 60%, usando todos os atendimentos."},
            {"id": "B", "text": "Alfa 80% e Beta 80%, usando respostas válidas."},
            {"id": "C", "text": "Alfa 92% e Beta 96%, usando apenas o numerador."},
            {"id": "D", "text": "Alfa 78,3% e Beta 80%, misturando respostas e atendimentos."}
          ],
          "correct_option": "B",
          "correct_title": "Cálculo consistente",
          "incorrect_title": "Use o mesmo denominador conceitual",
          "correct_feedback": "Alfa: 92 ÷ 115 = 80%. Beta: 96 ÷ 120 = 80%. O valor de 60% da Beta vem da fórmula inconsistente 96 ÷ 160.",
          "incorrect_feedback": "Aplique positivas ÷ respostas válidas: 92 ÷ 115 e 96 ÷ 120. Os dois resultados são 80%.",
          "attention": "Uma taxa matematicamente calculada ainda pode estar conceitualmente errada se usar a população inadequada.",
          "required": true
        },
        {
          "id": "interpretacao",
          "title": "Tome uma decisão coerente",
          "question": "Qual interpretação deve orientar o relatório?",
          "options": [
            {"id": "A", "text": "Beta está 20 p.p. abaixo de Alfa e deve copiar o processo da outra equipe."},
            {"id": "B", "text": "As equipes empataram em 80%; o relatório deve padronizar fórmula, população elegível e período antes de buscar diferenças de desempenho."},
            {"id": "C", "text": "Alfa é melhor porque teve menos atendimentos no período."},
            {"id": "D", "text": "Não é necessário documentar a metodologia quando o resultado parece plausível."}
          ],
          "correct_option": "B",
          "correct_title": "Comparação corrigida",
          "incorrect_title": "A diferença observada foi criada pela metodologia",
          "correct_feedback": "Com a definição padronizada, Alfa e Beta têm 80%. Não há evidência de diferença de satisfação nesse recorte; o primeiro ajuste é documentar e aplicar a mesma metodologia.",
          "incorrect_feedback": "O aparente 80% versus 60% compara denominadores diferentes. Corrigida a regra, as duas equipes ficam em 80%.",
          "attention": "Decisões baseadas em métricas inconsistentes podem premiar ou penalizar equipes sem evidência real.",
          "required": true
        }
      ],
      "thinking_steps": [
        {"question": "O que conta no numerador?", "answer": "Somente avaliações positivas."},
        {"question": "Quem é elegível no denominador?", "answer": "As respostas válidas do mesmo período."},
        {"question": "A comparação usa a mesma regra?", "answer": "Só depois de padronizar a metodologia."}
      ],
      "conclusion": "Você definiu um indicador comparável ao alinhar numerador, denominador, população elegível e período de referência.",
      "completion_title": "Definição do indicador validada",
      "next_action": {
        "href": "pratica-guiada.html?atividade=indicadores-decomposicao-kpi",
        "label": "Continuar para decomposição",
        "title": "Etapa 3 — Decomposição de KPI",
        "description": "A próxima prática mostra como pesos e volumes alteram um resultado consolidado."
      }
    }
    $metadata$::jsonb
  ),
  (
    'indicadores-decomposicao-kpi',
    'practice',
    'Decomposição de KPI',
    'Prática guiada de análise ponderada',
    'indicadores-e-kpis',
    'Indicadores e KPIs',
    3,
    'active',
    'Intermediário',
    15,
    true,
    $metadata$
    {
      "format": "guided_practice",
      "content_version": 1,
      "source": "indicadores_kpis_jornada_v1",
      "step_key": "indicadores-03-decomposicao-kpi",
      "response_schema": "checkpoint_sequence",
      "completion_rule": "all_required_checkpoints_correct",
      "completion_progress_percent": 75,
      "objective": "Decompor um indicador consolidado, considerar pesos e separar contribuição observada de causa comprovada.",
      "scenario": {
        "title": "O consolidado caiu, mas os canais divergiram",
        "context": "A satisfação combinada de Chat e App piorou entre dois períodos. O App melhorou, enquanto o Chat recebeu mais respostas e apresentou queda."
      },
      "indicator_title": "Use numeradores e denominadores no consolidado",
      "indicator_description": "A média simples das taxas ignora que o Chat passou de 100 para 200 respostas válidas.",
      "indicator_data": [
        {"label": "Chat anterior", "value": "80 / 100 = 80%"},
        {"label": "Chat atual", "value": "144 / 200 = 72%", "tone": "alert"},
        {"label": "App anterior", "value": "90 / 100 = 90%"},
        {"label": "App atual", "value": "95 / 100 = 95%", "tone": "success"}
      ],
      "checkpoints": [
        {
          "id": "consolidado",
          "title": "Calcule o resultado ponderado",
          "question": "Qual cálculo representa corretamente o consolidado dos dois períodos?",
          "options": [
            {"id": "A", "text": "Anterior 85%; atual 83,5%, pela média simples de 72% e 95%."},
            {"id": "B", "text": "Anterior 85% (170/200); atual 79,67% (239/300); variação de aproximadamente -5,33 p.p."},
            {"id": "C", "text": "Anterior 170%; atual 239%, somando os percentuais e os volumes."},
            {"id": "D", "text": "Anterior 80%; atual 72%, porque somente o maior canal deve entrar no indicador."}
          ],
          "correct_option": "B",
          "correct_title": "Consolidado ponderado corretamente",
          "incorrect_title": "Não use a média simples das taxas",
          "correct_feedback": "Some primeiro os numeradores e os denominadores: 170/200 = 85% e 239/300 ≈ 79,67%. A queda é de aproximadamente 5,33 pontos percentuais.",
          "incorrect_feedback": "O consolidado precisa respeitar os volumes: (80 + 90)/(100 + 100) e (144 + 95)/(200 + 100). A média simples atual, 83,5%, superestima o resultado.",
          "attention": "Taxas de grupos com tamanhos diferentes devem ser combinadas pelos seus numeradores e denominadores.",
          "required": true
        },
        {
          "id": "contribuicao",
          "title": "Localize a contribuição",
          "question": "Qual leitura explica melhor a variação observada?",
          "options": [
            {"id": "A", "text": "O App explica a queda, porque sua taxa é maior no período atual."},
            {"id": "B", "text": "O Chat caiu de 80% para 72% e passou de 50% para 66,7% das respostas; essa piora com maior peso contribuiu para a queda consolidada."},
            {"id": "C", "text": "Os dois canais pioraram na mesma proporção."},
            {"id": "D", "text": "A composição não importa quando existe uma taxa consolidada."}
          ],
          "correct_option": "B",
          "correct_title": "Peso e desempenho conectados",
          "incorrect_title": "Observe taxa e representatividade juntas",
          "correct_feedback": "O Chat perdeu 8 p.p. e dobrou seu volume, passando a representar dois terços das respostas atuais. O App melhorou 5 p.p., mas manteve 100 respostas.",
          "incorrect_feedback": "A queda está associada ao Chat: sua taxa piorou e sua participação no total aumentou. O App melhorou, portanto compensou parte da perda.",
          "attention": "Contribuir para a variação do consolidado não prova a causa operacional da piora no canal.",
          "required": true
        },
        {
          "id": "investigacao",
          "title": "Defina a investigação",
          "question": "Qual próximo passo é mais defensável?",
          "options": [
            {"id": "A", "text": "Concluir que o novo sistema do Chat causou a queda, mesmo sem dados sobre a mudança."},
            {"id": "B", "text": "Investigar o Chat por período, motivo e perfil de atendimento, verificando volume e estabilidade da amostra antes de atribuir uma causa."},
            {"id": "C", "text": "Ignorar o Chat e analisar apenas o App, porque ele melhorou."},
            {"id": "D", "text": "Tratar qualquer oscilação como ruído sem avaliar o tamanho da amostra."}
          ],
          "correct_option": "B",
          "correct_title": "Sinal priorizado sem inventar causalidade",
          "incorrect_title": "Separe evidência de hipótese",
          "correct_feedback": "Os dados localizam um sinal relevante no Chat, mas não identificam sua causa. Segmentar e verificar estabilidade, períodos e motivos transforma o sinal em uma investigação testável.",
          "incorrect_feedback": "O recorte mostra onde a queda se concentrou, não por que ocorreu. A próxima decisão deve investigar o Chat e considerar volume e possível ruído.",
          "attention": "Uma diferença observada orienta hipóteses; causalidade exige evidência adicional.",
          "required": true
        }
      ],
      "thinking_steps": [
        {"question": "Como consolidar?", "answer": "Some numeradores e denominadores antes de dividir."},
        {"question": "O peso mudou?", "answer": "O Chat passou a representar dois terços das respostas."},
        {"question": "O dado prova a causa?", "answer": "Não; ele localiza um sinal para investigação."}
      ],
      "conclusion": "Você calculou um KPI ponderado, identificou a contribuição do Chat e formulou uma investigação sem confundir associação com causalidade.",
      "completion_title": "Decomposição do KPI concluída",
      "next_action": {
        "href": "pratica-guiada.html?atividade=indicadores-funil-conversao",
        "label": "Continuar para o funil",
        "title": "Etapa 4 — Funil de conversão",
        "description": "A etapa final usa taxas condicionais para priorizar uma investigação de negócio."
      }
    }
    $metadata$::jsonb
  ),
  (
    'indicadores-funil-conversao',
    'practice',
    'Funil de conversão',
    'Indicadores e KPIs',
    'indicadores-e-kpis',
    'Indicadores e KPIs',
    4,
    'active',
    'Intermediário',
    15,
    true,
    $metadata$
    {
      "format": "guided_practice",
      "content_version": 1,
      "source": "indicadores_kpis_jornada_v1",
      "step_key": "indicadores-04-funil-conversao",
      "response_schema": "checkpoint_sequence",
      "completion_rule": "all_required_checkpoints_correct",
      "completion_progress_percent": 100,
      "objective": "Calcular taxas condicionais de um funil e recomendar uma investigação com base em perdas absolutas e proporcionais.",
      "scenario": {
        "title": "Onde investigar o funil do comércio eletrônico?",
        "context": "Uma loja virtual quer priorizar uma oportunidade de melhoria. O funil registra visitantes, visualizações de produto, carrinhos, checkouts e compras concluídas."
      },
      "indicator_title": "Cada etapa usa a anterior como denominador",
      "indicator_description": "Taxas condicionais mostram a passagem entre etapas; a conversão total compara visitantes e compras.",
      "indicator_data": [
        {"label": "Visitantes", "value": "10.000"},
        {"label": "Visualizaram produtos", "value": "4.000"},
        {"label": "Adicionaram ao carrinho", "value": "1.000", "tone": "alert"},
        {"label": "Checkout → compra", "value": "600 → 300"}
      ],
      "checkpoints": [
        {
          "id": "taxas",
          "title": "Calcule as taxas condicionais",
          "question": "Qual conjunto de taxas usa os denominadores corretos?",
          "options": [
            {"id": "A", "text": "40%, 25%, 60%, 50% e conversão total de 3%."},
            {"id": "B", "text": "40%, 10%, 6%, 3% e conversão total de 50%."},
            {"id": "C", "text": "4%, 25%, 60%, 30% e conversão total de 3%."},
            {"id": "D", "text": "40%, 40%, 10%, 6% e conversão total de 300%."}
          ],
          "correct_option": "A",
          "correct_title": "Denominadores aplicados corretamente",
          "incorrect_title": "Use a etapa imediatamente anterior",
          "correct_feedback": "As taxas são 4.000/10.000 = 40%, 1.000/4.000 = 25%, 600/1.000 = 60%, 300/600 = 50% e 300/10.000 = 3% no total.",
          "incorrect_feedback": "Em cada transição, divida o volume da etapa atual pelo volume da etapa anterior. Somente a conversão total usa visitantes como denominador.",
          "attention": "Usar visitantes como denominador em todas as etapas mistura conversão condicional com conversão acumulada.",
          "required": true
        },
        {
          "id": "perdas",
          "title": "Compare perdas diferentes",
          "question": "Qual leitura distingue corretamente perda absoluta e proporcional?",
          "options": [
            {"id": "A", "text": "Visitantes → visualização perde mais pessoas (6.000), enquanto visualização → carrinho tem a maior perda proporcional entre etapas (75%)."},
            {"id": "B", "text": "Checkout → compra tem a maior perda absoluta e proporcional."},
            {"id": "C", "text": "Visualização → carrinho perde 3.000 pessoas e apenas 25% proporcionalmente."},
            {"id": "D", "text": "Perda absoluta e proporcional sempre apontam para a mesma etapa."}
          ],
          "correct_option": "A",
          "correct_title": "Volume e proporção separados",
          "incorrect_title": "Compare quantidade perdida e taxa de perda",
          "correct_feedback": "A primeira transição perde 6.000 visitantes em volume. Já visualização → carrinho retém 25% e perde 75%, a maior perda proporcional do funil.",
          "incorrect_feedback": "Subtraia os volumes para a perda absoluta e calcule 1 menos a taxa de conversão para a perda proporcional. Os dois critérios podem indicar etapas diferentes.",
          "attention": "A maior perda absoluta não é automaticamente o melhor ponto de intervenção; alcance, intenção e custo também importam.",
          "required": true
        },
        {
          "id": "recomendacao",
          "title": "Priorize uma investigação",
          "question": "Qual recomendação é mais defensável com os dados disponíveis?",
          "options": [
            {"id": "A", "text": "Remover o checkout, porque metade dos usuários não conclui a compra."},
            {"id": "B", "text": "Investigar primeiro visualização → carrinho, cuja conversão é 25%, testando hipóteses sobre oferta e experiência sem afirmar causalidade ou impacto antes do experimento."},
            {"id": "C", "text": "Aumentar mídia imediatamente, pois mais visitantes garantem mais compras na mesma proporção."},
            {"id": "D", "text": "Concluir que o preço causou a perda, mesmo sem dados de preço ou comportamento."}
          ],
          "correct_option": "B",
          "correct_title": "Prioridade justificada com ressalvas",
          "incorrect_title": "Recomende uma investigação, não uma causa",
          "correct_feedback": "A passagem de visualização para carrinho tem a menor taxa condicional, 25%, e merece investigação. A ação correta é formular hipóteses e testar; o funil sozinho não prova causa nem impacto futuro.",
          "incorrect_feedback": "Os dados sustentam priorizar uma etapa para investigação, mas não autorizam atribuir causa, garantir impacto ou eliminar uma etapa do processo.",
          "attention": "Prioridade analítica combina taxa, volume e contexto de negócio; a melhoria precisa ser confirmada por teste.",
          "required": true
        }
      ],
      "thinking_steps": [
        {"question": "Qual é o denominador?", "answer": "O volume da etapa imediatamente anterior."},
        {"question": "Que perda está sendo comparada?", "answer": "Quantidade absoluta ou proporção da etapa."},
        {"question": "O funil prova a causa?", "answer": "Não; ele orienta uma investigação e um teste."}
      ],
      "conclusion": "Você concluiu a jornada de Indicadores e KPIs: interpretou meta e resultado, definiu métricas comparáveis, decompôs um consolidado e priorizou uma investigação de funil.",
      "completion_title": "Trilha Indicadores e KPIs concluída",
      "competencies": [
        "Interpretação de resultado, meta e desvio",
        "Definição consistente de indicadores",
        "Cálculo ponderado e decomposição de KPI",
        "Análise de funil e recomendação com ressalvas"
      ],
      "next_action": {
        "href": "meu-progresso.html",
        "label": "Ver competências em Meu Progresso",
        "title": "Jornada concluída",
        "description": "Confira os 100% da trilha e as competências demonstradas no seu histórico."
      }
    }
    $metadata$::jsonb
  )
on conflict (slug) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  subtitle = excluded.subtitle,
  track_slug = excluded.track_slug,
  track_title = excluded.track_title,
  step_order = excluded.step_order,
  status = excluded.status,
  level_label = excluded.level_label,
  estimated_minutes = excluded.estimated_minutes,
  is_active = excluded.is_active,
  metadata = excluded.metadata,
  updated_at = now();

do $link_steps$
declare
  target_path_id uuid;
  original_step_count integer;
  linked_step_count integer;
begin
  select id
    into target_path_id
  from public.learning_paths
  where slug = 'indicadores-e-kpis'
    and status = 'active';

  if target_path_id is null then
    raise exception 'Trilha ativa indicadores-e-kpis não encontrada; nenhuma etapa foi alterada.';
  end if;

  update public.learning_paths
  set
    estimated_minutes = 55,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'duration_source', 'indicadores_kpis_jornada_v1',
      'previous_estimated_minutes', 120,
      'estimated_minutes_breakdown', jsonb_build_array(10, 15, 15, 15)
    ),
    updated_at = now()
  where id = target_path_id
    and slug = 'indicadores-e-kpis';

  update public.learning_path_steps
  set
    content_type = 'practice',
    estimated_minutes = 10,
    updated_at = now()
  where path_id = target_path_id
    and step_key = 'indicadores-01-meta-resultado';

  get diagnostics original_step_count = row_count;
  if original_step_count <> 1 then
    raise exception 'Esperada a etapa original da trilha indicadores-e-kpis; encontradas %.', original_step_count;
  end if;

  update public.learning_path_steps
  set
    content_type = 'practice',
    content_url = case step_key
      when 'indicadores-02-definicao-consistente' then 'pratica-guiada.html?atividade=indicadores-definicao-consistente'
      when 'indicadores-03-decomposicao-kpi' then 'pratica-guiada.html?atividade=indicadores-decomposicao-kpi'
      when 'indicadores-04-funil-conversao' then 'pratica-guiada.html?atividade=indicadores-funil-conversao'
    end,
    estimated_minutes = 15,
    metadata = coalesce(metadata, '{}'::jsonb) || case step_key
      when 'indicadores-02-definicao-consistente' then jsonb_build_object(
        'activity_slug', 'indicadores-definicao-consistente',
        'format', 'guided_practice'
      )
      when 'indicadores-03-decomposicao-kpi' then jsonb_build_object(
        'activity_slug', 'indicadores-decomposicao-kpi',
        'format', 'guided_practice'
      )
      when 'indicadores-04-funil-conversao' then jsonb_build_object(
        'activity_slug', 'indicadores-funil-conversao',
        'format', 'guided_practice'
      )
    end,
    updated_at = now()
  where path_id = target_path_id
    and step_key in (
      'indicadores-02-definicao-consistente',
      'indicadores-03-decomposicao-kpi',
      'indicadores-04-funil-conversao'
    );

  get diagnostics linked_step_count = row_count;
  if linked_step_count <> 3 then
    raise exception 'Esperadas 3 etapas da trilha indicadores-e-kpis; encontradas %.', linked_step_count;
  end if;
end
$link_steps$;

-- Verificações de revisão antes de qualquer aplicação:
-- 1. A atividade indicadores-meta-resultado não é inserida nem atualizada aqui.
-- 2. Os IDs das quatro etapas existentes permanecem inalterados.
-- 3. Cada nova atividade deve aparecer em vw_guided_practice_activities_public.
-- 4. A duração proposta da trilha passa de 120 para 55 minutos.
-- 5. Nenhuma tabela de tentativas ou progresso é alterada por esta carga.

commit;
