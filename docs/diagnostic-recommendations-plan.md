# Plano da camada de recomendacoes premium do diagnostico

## Objetivo

Criar uma camada dedicada para recomendacoes premium do diagnostico, mantendo `question_bank` focada em perguntas e preparando a plataforma para o Diagnostico 2.0.

A decisao central e nao transformar `question_bank` em uma tabela "faz tudo". Ela deve continuar sendo a base confiavel de perguntas, respostas, alternativas, areas, niveis, conceitos e explicacoes. A nova camada deve concentrar textos didaticos, criterios de ativacao, proximos passos, trilhas sugeridas e inteligencia de lacunas.

## Mapa da estrutura atual da `question_bank`

A tabela atual e criada por `docs/supabase-question-bank.sql` e evoluida por `docs/supabase-question-bank-v2.sql`.

### Campos existentes

Identificacao:

- `id`: identificador UUID interno.
- `question_key`: chave unica e estavel da pergunta.

Classificacao:

- `mode`: tipo de uso, hoje restrito a `diagnostico` ou `desafio`.
- `area`: area de conhecimento avaliada.
- `category`: categoria complementar, mais usada em desafios.
- `level`: nivel da pergunta, como `Basico`, `Intermediario` ou `Avancado`.
- `concept`: conceito especifico avaliado pela pergunta.

Conteudo da pergunta:

- `question`: enunciado.
- `code`: trecho de codigo ou formula, quando aplicavel.
- `context`: contexto de negocio ou dados.
- `options`: alternativas em JSONB.
- `correct_index`: indice da alternativa correta.
- `explanation`: explicacao da resposta correta.
- `points`: pontuacao, mais relevante para desafios.

Operacao e curadoria:

- `is_active`: controla publicacao da pergunta.
- `display_order`: ordenacao base.
- `source`: origem do conteudo.
- `created_at`: data de criacao.
- `updated_at`: data de atualizacao.

Metadados v2:

- `difficulty_score`: dificuldade numerica de 1 a 5.
- `question_type`: tipo da pergunta, como `conceitual`, `cenario`, `codigo`, `interpretacao`, `negocio` ou `pegadinha`.
- `tags`: lista de tags para selecao e analytics.
- `estimated_time_seconds`: tempo estimado de resposta.
- `times_answered`: contador agregado de respostas.
- `correct_rate`: taxa agregada de acerto.

### O que a `question_bank` ja atende bem

- Armazenar perguntas versionaveis por chave unica.
- Separar diagnostico e desafios por `mode`.
- Classificar perguntas por area, nivel e conceito.
- Suportar selecao inteligente por nivel, area, dificuldade e tags.
- Permitir feedback imediato por pergunta via `explanation`.
- Servir tanto conteudo vindo do Supabase quanto fallback local.
- Fornecer base de analytics por pergunta, conceito, area e nivel.

### O que nao deve ser colocado diretamente nela

Nao devem entrar diretamente em `question_bank`:

- Recomendacoes longas e personalizadas de estudo.
- Textos de resultado parcial ou final do diagnostico.
- Trilhas sugeridas, proximos passos e planos de pratica.
- Regras de ativacao baseadas em historico do usuario.
- Mensagens diferentes por combinacao de erro, nivel, recorrencia e perfil.
- Campos de produto premium, como prioridade, tipo de card, tom da mensagem ou CTA.
- Analytics de lacunas recorrentes por usuario.
- Recomendacoes que dependem de multiplas perguntas ou multiplas tentativas.

Motivo: esses dados tem ciclo de vida, granularidade e logica diferentes das perguntas. Mistura-los na tabela de perguntas faria a curadoria ficar rigida, aumentaria risco de duplicacao textual e dificultaria o Diagnostico 2.0.

## Nova camada proposta: `diagnostic_recommendations`

### Papel da camada

`diagnostic_recommendations` deve ser uma biblioteca de recomendacoes didaticas reutilizaveis. Ela nao substitui `question_bank`; ela interpreta lacunas apontadas por `question_bank`.

A relacao principal deve ser por chaves semanticas:

- `recommendation_key`: identifica a recomendacao premium.
- `skill_code`: identifica a habilidade granular avaliada ou recomendada.
- `area`, `level`, `concept` e `tags`: ajudam no fallback e em buscas.
- Opcionalmente, `question_key`: permite vinculo direto com perguntas especificas quando fizer sentido.

### Campos recomendados

Campos de identificacao:

- `id uuid primary key`
- `recommendation_key text unique not null`
- `skill_code text not null`
- `version integer not null default 1`
- `is_active boolean not null default true`

Campos de classificacao:

- `area text not null`
- `level text null`
- `concept text null`
- `recommendation_type text not null`
- `severity text not null`
- `audience_profile text null`
- `tags text[] null`

Campos de conteudo premium:

- `title text not null`
- `diagnosis_text text not null`
- `why_it_matters text null`
- `common_cause text null`
- `study_guidance text not null`
- `next_step text not null`
- `practice_prompt text null`
- `avoid_text text null`
- `positive_reinforcement text null`

Campos de ativacao:

- `trigger_level text null`
- `min_miss_count integer null`
- `max_score_percent integer null`
- `min_score_percent integer null`
- `recurrence_window_days integer null`
- `requires_blocked_level boolean not null default false`

Campos de produto e UI:

- `priority integer not null default 0`
- `display_slot text null`
- `cta_label text null`
- `cta_target text null`
- `premium_only boolean not null default true`

Campos de governanca:

- `source text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### Campos essenciais do MVP e evolucao futura

Para evitar uma primeira versao grande demais, a tabela deve nascer com os campos necessarios para entregar recomendacoes premium alinhadas ao diagnostico atual. Campos ligados a personalizacao fina, recorrencia historica, CTA e empacotamento premium podem ficar para uma segunda fase.

Campos essenciais para o MVP:

- `id`
- `recommendation_key`
- `skill_code`
- `area`
- `level`
- `concept`
- `recommendation_type`
- `severity`
- `title`
- `diagnosis_text`
- `study_guidance`
- `next_step`
- `trigger_level`
- `priority`
- `is_active`
- `source`
- `created_at`
- `updated_at`

Campos para segunda fase:

- `version`
- `audience_profile`
- `tags`
- `why_it_matters`
- `common_cause`
- `practice_prompt`
- `avoid_text`
- `positive_reinforcement`
- `min_miss_count`
- `max_score_percent`
- `min_score_percent`
- `recurrence_window_days`
- `requires_blocked_level`
- `display_slot`
- `cta_label`
- `cta_target`
- `premium_only`

### Relacao com `question_bank`

Existem tres niveis de relacao possiveis:

1. Relacao direta por pergunta:
   - `question_bank.question_key` aponta para uma recomendacao especifica quando a pergunta representa uma lacuna muito clara.
   - Pode ser feita no futuro com uma coluna `recommendation_key` em `question_bank` ou por uma tabela de ligacao.

2. Relacao semantica por habilidade:
   - `question_bank.tags`, `concept`, `area`, `level` e futuro `skill_code` apontam para uma habilidade.
   - A recomendacao e escolhida quando o usuario erra perguntas associadas ao mesmo `skill_code`.

3. Relacao agregada por lacuna:
   - O diagnostico calcula lacunas por area, nivel, conceito e recorrencia.
   - A camada de recomendacoes retorna mensagens por padrao de desempenho, nao por pergunta isolada.

Para o Diagnostico 2.0, a relacao semantica por `skill_code` deve ser a mais importante.

## Estrategia de `recommendation_key`

`recommendation_key` deve ser estavel, legivel e independente do texto final.

Formato sugerido:

```text
diag_rec_{area_slug}_{skill_slug}_{level_slug}_{intent}_{version}
```

Exemplos:

- `diag_rec_sql_join_granularity_intermediate_review_v1`
- `diag_rec_excel_lookup_key_quality_intermediate_review_v1`
- `diag_rec_stats_sampling_bias_intermediate_review_v1`
- `diag_rec_data_logic_null_semantics_intermediate_review_v1`
- `diag_rec_kpi_funnel_conversion_intermediate_next_step_v1`

Regras:

- Nao reutilizar a mesma chave para mensagens com significado diferente.
- Versionar quando a recomendacao muda de criterio ou promessa didatica.
- Manter a chave em ingles tecnico ou slug ASCII para evitar problemas de integracao.
- Usar `is_active = false` para aposentar recomendacoes antigas sem apagar historico.

## Estrategia de `skill_code`

`skill_code` deve ser a unidade granular de competencia. Ele deve sobreviver a mudancas de pergunta e permitir analytics historico.

Formato sugerido:

```text
{domain}.{topic}.{skill}
```

Exemplos:

- `sql.join.granularity`
- `sql.aggregation.having`
- `excel.lookup.key_quality`
- `excel.model.structured_table`
- `stats.sampling.bias`
- `stats.inference.ab_test`
- `data_logic.nulls.semantics`
- `data_logic.keys.referential_integrity`
- `kpi.funnel.conversion_rate`
- `kpi.metric_definition.north_star`

Regras:

- Um `skill_code` pode aparecer em varias perguntas.
- Uma pergunta deve preferencialmente avaliar um skill principal.
- Tags continuam uteis, mas `skill_code` vira o eixo de recomendacao e progresso.
- O mesmo `skill_code` pode ter recomendacoes diferentes por nivel, severidade e recorrencia.

## Exemplos de recomendacoes premium por area

### SQL

`skill_code`: `sql.join.granularity`

Voce demonstrou dificuldade em granularidade de JOINs. Isso costuma acontecer quando a consulta mistura pedidos e itens sem entender o nivel da tabela. Antes de avancar para queries analiticas, revise cardinalidade 1:N, contagens distintas e validacoes de duplicidade apos cada juncao.

Proximo passo: resolver desafios que comparem `COUNT(*)`, `COUNT(DISTINCT pedido_id)` e soma de receita antes/depois do JOIN.

### Excel

`skill_code`: `excel.lookup.key_quality`

Voce teve dificuldade em buscas por chave no Excel. Esse erro normalmente aparece quando a formula esta correta, mas as chaves tem espacos invisiveis, tipos diferentes ou intervalos incompletos. Antes de trocar a funcao, valide a qualidade da chave e padronize os dados de entrada.

Proximo passo: praticar um caso com `PROCX`, tratamento de espacos, conversao de tipo e conferencia de chaves sem correspondencia.

### Estatistica

`skill_code`: `stats.sampling.bias`

Voce demonstrou fragilidade ao avaliar representatividade da amostra. Isso pode levar a conclusoes fortes com dados que representam apenas um recorte do publico. Antes de interpretar percentuais, verifique quem ficou fora da amostra, como os respondentes foram selecionados e qual decisao sera tomada com o resultado.

Proximo passo: revisar vies de selecao, tamanho de amostra e diferenca entre sinal exploratorio e evidencia para decisao.

### Logica de dados

`skill_code`: `data_logic.nulls.semantics`

Voce mostrou dificuldade com a semantica de valores nulos. Em dados reais, nulo pode significar ausencia de informacao, evento inexistente ou falha de integracao. Tratar tudo como zero pode distorcer indicadores e esconder problemas de origem.

Proximo passo: montar uma regra explicita para nulos antes de calcular KPI, separando "sem desconto", "desconto desconhecido" e "registro incompleto".

### Indicadores

`skill_code`: `kpi.funnel.conversion_rate`

Voce teve dificuldade em interpretar gargalos de funil. Olhar apenas o volume total pode esconder onde as oportunidades estao sendo perdidas. Para diagnosticar o problema, compare taxas de conversao por etapa, volume absoluto e tempo medio de passagem.

Proximo passo: praticar uma leitura de funil com queda por etapa e escrever uma recomendacao operacional curta.

## Uso no Diagnostico 2.0

### Resultado parcial apos Basico

O resultado parcial apos o nivel Basico deve responder:

- O usuario tem fundamento minimo para continuar?
- Quais areas basicas bloqueiam progresso?
- Qual habilidade deve ser revisada antes do nivel Intermediario?

Uso da camada:

- Se o usuario nao atingir a meta do Basico, buscar recomendacoes com `trigger_level = 'Basico'`, `requires_blocked_level = true` e maior prioridade.
- Exibir uma recomendacao principal e ate duas recomendacoes secundarias.
- Evitar mensagens genericas como "revise SQL"; preferir lacunas como `sql.filter.where_date` ou `excel.data_type.date`.

### Resultado parcial apos Intermediario

O resultado parcial apos Intermediario deve responder:

- O usuario consegue conectar tecnica com contexto?
- As lacunas sao de sintaxe, modelagem, interpretacao ou decisao?
- O usuario deve avancar para Avancado ou consolidar habilidades?

Uso da camada:

- Combinar erros por `skill_code`, area e `question_type`.
- Priorizar lacunas de alto impacto, como granularidade, qualidade de chave, vies de amostra e definicao de KPI.
- Mostrar recomendacoes com causa comum, risco pratico e exercicio direcionado.

### Resultado final

O resultado final deve consolidar:

- Perfil geral.
- Nivel atingido.
- Areas fortes.
- Areas de atencao.
- Lacunas por habilidade.
- Proximos passos recomendados.

Uso da camada:

- Buscar recomendacoes por skills com maior numero de erros.
- Cruzar desempenho por area com nivel concluido.
- Se nao houver lacunas fortes, exibir recomendacoes de aprofundamento e projeto pratico.
- Registrar quais `recommendation_key` foram exibidas para analytics futuro.

### Areas fortes

Areas fortes nao devem receber apenas elogio. Devem indicar como transformar dominio em aplicacao.

Exemplo:

Voce mostrou boa seguranca em Indicadores. Agora use essa base para escrever hipoteses melhores: sempre conecte metrica, contexto, decisao e risco de interpretacao.

### Areas de atencao

Areas de atencao devem ser priorizadas por impacto, nao apenas por menor percentual.

Criterios sugeridos:

- Erro recorrente no mesmo `skill_code`.
- Erro em nivel Basico que bloqueia nivel Intermediario.
- Erro em habilidade transversal, como granularidade, nulos, chaves ou definicao de metrica.
- Baixo desempenho combinado com alto tempo de resposta, quando esse dado existir.

### Proximos passos recomendados

Os proximos passos devem ter tres camadas:

- Agora: revisao curta e objetiva.
- Pratica: desafio recomendado por area ou skill.
- Aplicacao: tarefa pequena com dados, pergunta de negocio e conclusao escrita.

## Apoio ao Meu Progresso

A camada de recomendacoes permite transformar o historico em orientacao continua.

### Recomendacoes por historico

O Meu Progresso pode mostrar recomendacoes baseadas nas ultimas tentativas, nao apenas no ultimo resultado.

Exemplo:

- "Granularidade de JOIN apareceu em 3 tentativas nos ultimos 30 dias."
- "Voce melhorou em filtros e agregacoes, mas ainda erra contagens distintas."

### Lacunas recorrentes

Para lacunas recorrentes, a recomendacao deve mudar de tom:

- Primeira ocorrencia: revisao didatica.
- Segunda ocorrencia: pratica guiada.
- Terceira ocorrencia: trilha obrigatoria ou mini-projeto focado.

### Proxima trilha sugerida

O Meu Progresso pode mapear `skill_code` para trilhas:

- `sql.join.granularity` -> SQL Intermediario + Modelagem relacional.
- `excel.lookup.key_quality` -> Excel para analise + Qualidade de dados.
- `stats.sampling.bias` -> Estatistica aplicada + Interpretacao de resultados.
- `kpi.funnel.conversion_rate` -> Indicadores e KPIs + Analise de funil.

### Desafios recomendados

As recomendacoes podem apontar para desafios por:

- Area.
- Nivel.
- `skill_code`.
- Tags.
- Tipo de pergunta.
- Historico de erro.

No curto prazo, se desafios ainda nao tiverem `skill_code`, o mapeamento pode usar `tags`, `area`, `category` e `concept`.

## Plano de implementacao em etapas

### Etapa 1: modelagem e migration SQL

- Criar migration para `public.diagnostic_recommendations`.
- Definir constraints de `recommendation_type`, `severity`, `priority` e `premium_only`.
- Criar indices por `skill_code`, `area`, `level`, `is_active`, `recommendation_key` e `tags`.
- Definir RLS de leitura para recomendacoes ativas.
- Decidir se o conteudo premium sera publico para `anon` ou protegido por autenticacao.

### Etapa 2: seed inicial

- Criar seed pequeno com recomendacoes premium para as cinco areas principais.
- Cobrir primeiro skills de alto impacto:
  - `sql.join.granularity`
  - `excel.lookup.key_quality`
  - `stats.sampling.bias`
  - `data_logic.nulls.semantics`
  - `kpi.funnel.conversion_rate`
- Marcar `source` com versao editorial.

### Etapa 3: ligacao com `question_bank`

- Adicionar `skill_code` como campo futuro em `question_bank`, ou criar tabela de ligacao `question_skill_map`.
- Avaliar `recommendation_key` direto em perguntas apenas quando a pergunta tiver recomendacao especifica.
- Manter `tags` como apoio, nao como fonte unica de verdade.
- Atualizar seeds de perguntas em etapa separada, sem misturar com a migration da camada de recomendacoes.

### Etapa 4: consumo no frontend

- Criar servico de leitura de recomendacoes ativas.
- No diagnostico, calcular lacunas por `skill_code`, area, nivel e recorrencia.
- Selecionar recomendacoes por prioridade e contexto:
  - parcial Basico;
  - parcial Intermediario;
  - resultado final.
- Prever fallback local ou mensagem simples caso a camada premium esteja indisponivel.

### Etapa 5: analytics por lacuna e conceito

- Registrar `recommendation_key` exibida em cada tentativa.
- Medir quais recomendacoes aparecem mais.
- Medir se usuarios que recebem uma recomendacao melhoram no mesmo `skill_code`.
- Criar visoes agregadas por area, nivel, conceito, skill e recomendacao.
- Alimentar Meu Progresso com historico de lacunas recorrentes.

## Riscos e pontos de atencao

- Risco de granularidade excessiva: muitos `skill_code` podem dificultar curadoria. Comecar com poucos skills de alto impacto.
- Risco de texto generico: cada recomendacao deve citar causa comum, risco pratico e proximo passo concreto.
- Risco de acoplamento com pergunta especifica: priorizar `skill_code` para permitir trocar perguntas sem perder historico.
- Risco de expor conteudo premium: definir cedo se `diagnostic_recommendations` sera lida por `anon` ou apenas por usuarios autenticados/premium.
- Risco de recomendacao injusta com pouca amostra: evitar conclusoes fortes com apenas uma pergunta respondida por area ou skill.
- Risco de conflito entre tags e skill_code: documentar que `skill_code` e a unidade principal; tags sao auxiliares.
- Risco de historico quebrado por renomeacao: nunca renomear `skill_code` sem tabela de alias ou migracao de historico.

## Proxima etapa recomendada

Validar este plano editorial e tecnico antes de qualquer migration. Depois disso, a primeira etapa deve ser mapear a `question_bank` atual com `skill_code` e possiveis `recommendation_key`, para evitar criar uma tabela bem estruturada, mas desalinhada com as perguntas reais.

Ordem recomendada:

1. Mapear `question_bank` com `skill_code` e `recommendation_key`.
2. Criar migration SQL da tabela `diagnostic_recommendations`.
3. Criar seed inicial com 10 a 15 recomendacoes fortes.
4. Conectar a camada ao Diagnostico 2.0.
5. Depois conectar ao Meu Progresso.
