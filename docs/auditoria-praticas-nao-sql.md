# Auditoria de conteúdo e práticas não-SQL

Data da auditoria: 22/06/2026
Branch: `codex/auditoria-conteudo-praticas-nao-sql`

## Resumo executivo

É possível criar o primeiro MVP não-SQL sem uma nova tabela de conteúdo: `learning_activities` pode ser o catálogo e seu `metadata` pode guardar o roteiro estruturado da prática. Entretanto, o banco atual não aceita `activity_type = 'guided_practice'`; o `CHECK` permite apenas `introduction` e `practice`. Para um MVP sem migration, deve-se usar `activity_type = 'practice'` e indicar o formato guiado em `metadata.format = 'guided_practice'`.

`user_learning_progress` é genérica e pode consolidar progresso de qualquer trilha. Já `user_practice_attempts`, `user_practice_notes` e `user_activity_feedback` não são genéricas na estrutura atual: exigem `exercise_id` de `sql_practice_exercises`; feedback ainda exige `source = 'sql_practice'`. Portanto, elas não podem receber uma prática não-SQL apenas com novos dados.

O menor MVP recomendado é **Indicadores e KPIs — Meta e resultado**, ligado ao primeiro passo da trilha por `learning_path_steps.metadata.activity_slug` e a uma nova página/controlador genérico de prática guiada. Conteúdo pode ficar em `learning_activities.metadata`; conclusão pode atualizar `user_learning_progress`. Para anotações, feedback e histórico de respostas oficiais, recomenda-se uma pequena generalização posterior das tabelas de interação ou uma tabela genérica de tentativas.

## 1. Estado atual

### Banco

Consultas somente leitura confirmaram:

| Estrutura | Total | Papel atual |
|---|---:|---|
| `learning_paths` | 6 | Catálogo de trilhas |
| `learning_path_steps` | 23 | Passos das trilhas e ponte para conteúdo |
| `learning_activities` | 6 | Catálogo de atividades; todas as linhas atuais são SQL |
| `sql_datasets` | 3 | Esquema, seed e amostras para execução SQL |
| `sql_practice_exercises` | 5 | Enunciado e validação dos exercícios SQL |
| `question_bank` | 128 | Questões do diagnóstico por área, nível e conceito |
| `diagnostic_recommendations` | 30 | Recomendações por área/nível/conceito |

Trilhas e passos:

| Trilha | Passos | Passos marcados como `practice` | Destinos em `content_url` |
|---|---:|---:|---:|
| Fundamentos de Dados | 3 | 1 | 0 |
| SQL Essencial | 5 | 4 | 0 |
| SQL Intermediário | 4 | 2 | 0 |
| Estatística para Dados | 4 | 2 | 0 |
| Indicadores e KPIs | 4 | 2 | 0 |
| Projetos Práticos | 3 | 1 | 0 |

As 6 atividades em `learning_activities` pertencem a `sql-essencial`: uma introdução e cinco práticas. As cinco práticas ativas têm exercício e dataset na view `vw_sql_practice_exercises_public`.

Há conteúdo diagnóstico para as quatro áreas investigadas:

- Estatística: 20 questões ativas e 6 recomendações.
- Indicadores: 20 questões ativas e 7 recomendações.
- Lógica de dados: 16 questões ativas e 6 recomendações.
- Excel: 16 questões ativas e 5 recomendações, além de 4 questões em `Excel/BI`.

Há uma lacuna importante: Excel possui perguntas e recomendações, mas não possui uma trilha em `learning_paths`. Estatística, Indicadores e Lógica de dados possuem trilhas e passos, mas não atividades executáveis. Nenhum passo não-SQL tem `content_url`, `activity_slug` ou `practice_slug`.

### Código

- `src/learning-paths.js` lê `learning_paths`, `learning_path_steps`, `user_learning_progress`, `learning_recommendations`, a view SQL e tentativas SQL para montar as trilhas da home.
- `src/personalized-learning-service.js` cruza `recommendation_key`, `skill_code` e área; escolhe uma trilha ativa, seleciona sempre seu primeiro passo e grava recomendação e progresso inicial.
- `src/study-plan-content.js` define a “Primeira ação recomendada” do Resultado v2. Apenas SQL aponta para prática real; Indicadores, Estatística, Lógica e Excel apontam para `index.html#trilhas`.
- `src/quiz.js` apenas renderiza o plano estático devolvido por `studyPlanContent`; a geração assíncrona da recomendação persistida não altera o CTA já renderizado.
- `src/progress-page.js` resolve uma prática por `step.metadata.practice_slug`, depois `activity_slug`, depois `content_url`; porém qualquer slug vira URL de `praticas-sql.html`. Esse resolvedor está acoplado a SQL.
- `praticas-sql.html`, `src/sql-practice-page.js` e `src/sql-practice-service.js` formam uma vertical SQL completa: carregam a view pública, inicializam PGlite, executam/validam a consulta, salvam execução, tentativa, progresso, anotação e feedback.
- A interface da Central SQL possui componentes conceituais reaproveitáveis: cenário/enunciado, apoio teórico, feedback imediato, navegação entre atividades, anotações e formulário de feedback. O controlador e o serviço, porém, estão fortemente acoplados a query, dataset e exercício SQL.

## 2. O que pode ser reaproveitado

### Reaproveitamento direto

- `learning_paths`: agrupamento e ordenação das trilhas.
- `learning_path_steps`: sequência, tipo visual, duração e ponte para atividade.
- `learning_activities`: identidade, slug, título, trilha, ordem, nível, duração, estado e conteúdo estruturado em `metadata`.
- `user_learning_progress`: progresso por trilha/passo, sem dependência de SQL.
- `learning_recommendations`: recomendação persistida por usuário.
- `question_bank`: fonte de conceitos, alternativas e explicações; deve ser curada, não copiada automaticamente para prática.
- `diagnostic_recommendations`: ponte por `recommendation_key`, `skill_code`, área e nível.
- Convenções já usadas no passo: `metadata.activity_slug`, `metadata.practice_slug`, `skill_code` e `recommendation_key`.
- Padrões visuais e funcionais da Central SQL: conceito antes da ação, cenário, feedback explicativo, utilitários e próxima etapa.

### Reaproveitamento após generalização mínima

- `user_practice_notes`: a intenção é genérica, mas `exercise_id` é obrigatório e referencia exercício SQL.
- `user_activity_feedback`: a intenção é genérica, mas `exercise_id` é obrigatório, a FK composta exige par atividade/exercício SQL e `source` só aceita `sql_practice`.
- `user_practice_attempts`: nome genérico, estrutura SQL; exige `exercise_id` SQL e foi desenhada em torno de validação/query run.

Essas tabelas não devem receber IDs artificiais, exercícios SQL “de fachada” ou outros atalhos. Isso contaminaria o domínio e dificultaria analytics e manutenção.

## 3. O que é específico de SQL

- `sql_datasets` e suas configurações de schema/seed.
- `sql_practice_exercises`, incluindo `solution_sql`, `validation_config` e `expected_result`.
- `vw_sql_practice_exercises_public`, que une atividade, exercício e dataset.
- `sql_query_runs` e seus campos de query, execução, resultado e erro.
- `user_practice_attempts` no schema atual.
- PGlite e `src/sql-poc-engine.js`.
- Validadores de query e resultado em `src/sql-mission-validation.js`.
- Tutor com contexto SQL.
- `src/sql-practice-service.js`, que recusa operações sem `exerciseId`.
- `src/progress-page.js`, que transforma todo `activity_slug` em `praticas-sql.html`.

## 4. Modelo recomendado para práticas não-SQL

### Conteúdo do MVP

Usar uma linha de `learning_activities` com:

- `activity_type = 'practice'` — valor permitido hoje;
- `track_slug = 'indicadores-e-kpis'`;
- `metadata.format = 'guided_practice'`;
- `metadata.skill_code` e `metadata.recommendation_key` iguais aos do passo;
- `metadata.content_version` para evolução controlada;
- `metadata.scenario`, `concept`, `question`, `response_schema`, `options`, `feedback_by_option` e `completion_rule`.

Exemplo conceitual de `metadata`:

```json
{
  "format": "guided_practice",
  "content_version": 1,
  "skill_code": "kpi.target.interpretation",
  "recommendation_key": "diag_rec_kpi_target_interpretation_basic_review_v1",
  "scenario": {
    "title": "Satisfação abaixo da meta",
    "context": "A meta mensal era 87% e o resultado foi 82%."
  },
  "concept": {
    "title": "Meta, resultado e desvio",
    "summary": "Resultado mostra o realizado; meta define o patamar desejado; desvio mostra a distância entre ambos."
  },
  "question": "Qual leitura orienta melhor a próxima decisão?",
  "response_schema": "single_choice",
  "options": [],
  "feedback_by_option": {},
  "completion_rule": "valid_response_and_feedback_viewed"
}
```

Não usar `question_bank` como runtime da prática no primeiro MVP. Ela é fonte diagnóstica e sua semântica é de questão isolada. O conteúdo pode ser inspirado e alinhado por `skill_code`, mas deve ganhar cenário, encadeamento e feedback próprios.

### Ligação catálogo → passo → página

1. `learning_path_steps.metadata.activity_slug` aponta para a atividade.
2. Um resolvedor genérico consulta a atividade e decide a página pelo `metadata.format`.
3. Prática SQL continua em `praticas-sql.html`.
4. Prática guiada não-SQL abre uma página própria e genérica, por exemplo `pratica-guiada.html?atividade=<slug>`.
5. `content_url` pode ser usado como destino explícito, mas não como evidência de conclusão.

Não se recomenda adaptar `praticas-sql.html` com vários `if` de área. O shell visual pode ser reaproveitado; o motor e o serviço devem permanecer separados por tipo de interação.

### Progresso e evidência

No MVP, uma resposta válida seguida da exibição do feedback pode concluir o passo em `user_learning_progress`, com `metadata.source = 'guided_practice_completion'`, `activity_slug`, `content_version` e um resumo não sensível da resposta. Abrir a página nunca conclui o passo.

Para escala, auditoria de tentativas e analytics, criar depois `user_activity_attempts` genérica, referenciada por `activity_id`, com `response jsonb`, `validation_status`, `validation_details`, `attempt_number` e versão do conteúdo. Esta tabela vira a fonte de verdade; `user_learning_progress` permanece consolidado.

### Anotações e feedback

Há duas opções seguras:

1. **MVP estrito sem migration:** salvar anotações e feedback apenas localmente e deixar isso explícito ao usuário; progresso autenticado continua remoto.
2. **MVP de produto completo:** migration pequena para tornar `exercise_id` opcional em notas/feedback, criar unicidade por usuário + atividade para registros não-SQL e permitir `source = 'guided_practice'`. Exige revisão de RLS e compatibilidade SQL.

A opção 2 entrega a experiência pedida, mas precisa de tarefa própria e autorização explícita para banco. Não é correto afirmar que notas e feedback remotos já funcionam para não-SQL.

## 5. Primeiro MVP recomendado

**Área:** Indicadores e KPIs

**Tema:** Meta e resultado

**Trilha/passo:** `indicadores-e-kpis` / `indicadores-01-meta-resultado`

**Skill:** `kpi.target.interpretation`
**Duração alvo:** 8–10 minutos

Fluxo:

1. Cenário curto: meta de satisfação de 87%, resultado de 82% e dados complementares mínimos.
2. Conceito antes da prática: diferença entre indicador, meta, resultado, desvio absoluto e pontos percentuais.
3. Pergunta guiada: escolher a leitura de negócio mais correta.
4. Segunda ação estruturada curta: selecionar qual investigação vem primeiro entre opções plausíveis.
5. Feedback explicativo por alternativa, mostrando por que a leitura é ou não acionável.
6. Resumo final: “resultado 5 p.p. abaixo da meta; investigar causas antes de atribuir causalidade”.
7. Conclusão registrada apenas após resposta válida e feedback visto.
8. Feedback do usuário e anotação pessoal conforme uma das opções de persistência da seção anterior.

Não deve parecer quiz solto: cenário, conceito, decisão e explicação formam uma pequena missão de análise.

## 6. Integração com Resultado v2

Hoje o Resultado v2 usa mapa estático de área em `src/study-plan-content.js`; apenas SQL tem URL real. Para Indicadores, o menor ajuste futuro é trocar o plano estático por:

- `actionTitle = 'Praticar: Meta e resultado'`;
- `actionMeta = 'Indicadores e KPIs · 8 min · Prática guiada'`;
- `href = 'pratica-guiada.html?atividade=indicadores-meta-resultado'`.

O ajuste robusto é o CTA receber o `step`/`activity_slug` resolvido pelo `personalized-learning-service`, evitando duplicar slugs no JavaScript. Como a persistência atual é assíncrona e ocorre depois do cálculo da tela, a implementação deve resolver a ação antes de renderizar ou atualizar o card ao receber `data-skill-map-learning-updated`.

A correspondência deve usar `recommendation_key` e `skill_code`, com área apenas como fallback. Para prioridade em Indicadores e lacuna `kpi.target.interpretation`, a atividade “Meta e resultado” torna-se a primeira ação real.

## 7. Integração com Meu Progresso

O `Meu Progresso` já encontra o passo em andamento a partir de `user_learning_progress`. Falta tornar o resolvedor polimórfico:

- buscar `activity_slug` do passo;
- carregar `learning_activities.activity_type/metadata.format` ou usar `content_url` explícito;
- mapear SQL para `praticas-sql.html` e prática guiada para `pratica-guiada.html`;
- trocar CTA fixo “Abrir Práticas SQL” por “Abrir prática”.

Ao concluir, atualizar a linha do passo atual e criar/marcar o próximo passo como `in_progress`, preservando a lógica consolidada já usada pelo SQL. A porcentagem deve considerar todos os passos ativos da trilha, e conclusão precisa de evidência de resposta — nunca apenas navegação.

## 8. Riscos e controles

- **Estrutura paralela desnecessária:** usar `learning_activities` como catálogo único.
- **Duplicar progresso:** manter `user_learning_progress` como consolidado e uma única fonte de tentativas quando ela existir.
- **Quebrar SQL:** não alterar a view ou o serviço SQL para acomodar conteúdo não-SQL; cobrir migrations de interação com testes regressivos.
- **Misturar trilha com prática:** passo organiza a jornada; atividade contém a experiência; tentativa prova execução.
- **Criar conteúdo sem validação:** revisar pedagogia, regra de conclusão, alternativas e feedback com exemplos reais.
- **Transformar diagnóstico em quiz:** não reutilizar pergunta isolada sem cenário e encadeamento.
- **Acoplamento por URL:** resolver destino pelo tipo/formato da atividade, não pela presença genérica de slug.
- **Progresso sem evidência:** não concluir ao abrir ou clicar; exigir resposta válida e feedback visto.
- **Metadados sem contrato:** versionar e validar o JSON antes de renderizar.
- **Layout ruim:** validar desktop 1440px e mobile 390px, sem scroll horizontal, com cards alinhados, texto escaneável e CTA evidente, no padrão visual da Central SQL/Resultado v2.
- **Excel sem trilha:** não publicar prática de Excel antes de decidir onde ela aparece na jornada e como será recomendada.

## 9. O que deve ficar para depois

- Respostas abertas com correção semântica ou IA.
- Editor de planilha embutido para Excel e upload de arquivos.
- Simulações estatísticas interativas complexas.
- Banco amplo de cenários e randomização.
- Gamificação, certificados, plano Pro e recursos ainda não implementados.
- Analytics avançado de alternativa, abandono e tempo por etapa.
- Autor/editor de conteúdo administrativo.
- Generalização de tentativas antes de existir uma segunda prática que realmente a exija.
- Trilha própria de Excel, que precisa de decisão de produto e conteúdo.

## 10. Próximo prompt sugerido

> Implemente o MVP local da prática guiada não-SQL “Indicadores e KPIs — Meta e resultado” conforme `docs/auditoria-praticas-nao-sql.md`. Antes de alterar arquivos, atualize a feature branch a partir da `main` e apresente o escopo técnico. Use `learning_activities` como catálogo com `activity_type = 'practice'` e `metadata.format = 'guided_practice'`; crie um renderer/serviço genérico separado da Central SQL; ligue o passo `indicadores-01-meta-resultado`, o Resultado v2 e o Meu Progresso à nova atividade. Não aplique migration, seed, RLS ou alteração remota sem autorização explícita. Se notas/feedback remotos forem obrigatórios, pare e apresente primeiro a migration mínima e seus impactos. Preserve a experiência SQL e adicione testes determinísticos. Valide desktop 1440px, mobile 390px e console.

## Registro da auditoria

- Supabase: somente consultas `SELECT` de tabelas, colunas, contagens, trilhas/passos, atividades, exercícios, questões, recomendações e constraints.
- Supabase remoto: nenhum dado ou schema alterado.
- Auth, RLS, policies, migrations e seeds: não alterados.
- Arquivos de produção: não alterados.
- Arquivo criado: somente esta documentação.
- Validação visual: não aplicável nesta auditoria documental; nenhuma UI foi modificada.
