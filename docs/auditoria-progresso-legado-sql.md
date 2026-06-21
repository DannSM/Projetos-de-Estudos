# Auditoria read-only de progresso legado da SQL Essencial

Data da auditoria: 20 de junho de 2026

Projeto Supabase: `data-skill-map` (`njjyrahznnrfcnstiwlb`)

Branch Git: `codex/auditoria-progresso-legado-sql`

## 1. Resumo executivo

A auditoria confirmou uma inconsistência isolada em uma conta: `daniellysson@gmail.com` possui **3 registros** de `user_learning_progress` da trilha SQL Essencial marcados como `completed` e `progress_percent = 100`, sem qualquer registro correspondente em `user_practice_attempts`.

Esses três registros têm `metadata.source = active_learning_path_mvp`, `source_attempt_id = null` e foram criados em 5 de junho de 2026. O histórico Git contém o commit `d801d1b` (`feat: adiciona avanço real em trilhas e reforça anti-repetição`), existente apenas na branch `codex/trilhas-avanco-e-diagnostico-anti-repeticao`, cujo arquivo `src/active-learning-path.js` gravava `completed/100` ao concluir um passo em `trilha.html`, sem criar tentativa prática. Os horários dos dados são posteriores ao commit e a assinatura dos metadados coincide exatamente com esse código. A causa mais provável é, portanto, **dado legado de teste/uso do fluxo antigo de trilha**, e não diagnóstico, seed ou regra atual da Central SQL.

O frontend atual de Meu Progresso amplia o efeito: ele considera uma única linha com `status = completed` e `progress_percent = 100` como conclusão da trilha inteira, sem conferir todas as etapas nem `user_practice_attempts`. Assim, um registro de etapa legado é apresentado como “SQL Essencial concluída”.

Não é recomendado corrigir os dados automaticamente agora. A medida mais segura é primeiro endurecer a interpretação/exibição da conclusão, exigindo evidência coerente das práticas, e somente depois planejar um saneamento explícito e revisável dos três registros legados.

## 2. Escopo da auditoria

Foram inspecionados, somente em leitura:

- schema e dados das tabelas de diagnóstico, recomendação, trilhas, etapas, progresso e tentativas;
- os três usuários de teste conhecidos;
- demais usuários com e-mail mascarado;
- código atual de Meu Progresso, trilhas e Central SQL;
- histórico Git do fluxo que deixou a assinatura `active_learning_path_mvp`.

Não foram alterados banco, schema, migrations, Auth, RLS, policies, seeds, credenciais ou dados. Nenhuma correção visual ou funcional foi implementada.

## 3. Tabelas e arquivos analisados

Tabelas principais:

- `auth.users` e `profiles`;
- `user_learning_progress`;
- `user_practice_attempts` e `sql_query_runs`;
- `learning_paths`, `learning_path_steps` e `learning_activities`;
- `sql_practice_exercises`;
- `learning_recommendations`;
- `diagnostic_sessions` e `diagnostic_answers`.

Arquivos/histórico principais:

- `src/progress-page.js`;
- `src/learning-paths.js`;
- `src/sql-practice-service.js`;
- `src/personalized-learning-service.js`;
- `scripts/test-sql-practice-progress.js`;
- `docs/supabase-learning-foundation.sql`;
- `docs/supabase-sql-practice-foundation.sql`;
- commit histórico `d801d1b`, especialmente `src/active-learning-path.js`.

## 4. Consultas read-only executadas

Todas as consultas executadas foram `SELECT`. Nenhuma instrução de escrita ou DDL foi executada.

1. Inventário de colunas via `information_schema.columns` para as tabelas do escopo.
2. Listagem de progresso das trilhas com “sql” no slug/título, associando usuário, etapa, metadados e totais de tentativas.
3. Classificação de `source_attempt_id` por correspondência com:
   - `diagnostic_sessions.attempt_id`;
   - `user_practice_attempts.id::text`;
   - nulo;
   - sem correspondência.
4. Quantificação global e de SQL de linhas `completed` ou com `progress_percent = 100`, com e sem tentativa do usuário.
5. Agregação por usuário de progresso, tentativas, exercícios corretos, recomendações e diagnósticos.
6. Mapeamento das cinco etapas de SQL Essencial para `metadata.practice_slug`, `learning_activities.slug` e tentativas reais.
7. Distribuição das linhas de progresso por `metadata.source`, status, percentual e tipo de `source_attempt_id`.

Forma central da comparação:

```sql
select ulp.*, lp.slug, lps.step_key,
       count(upa.id) as attempts
from public.user_learning_progress ulp
join public.learning_paths lp on lp.id = ulp.path_id
left join public.learning_path_steps lps on lps.id = ulp.step_id
left join public.user_practice_attempts upa on upa.user_id = ulp.user_id
where (ulp.status = 'completed' or ulp.progress_percent = 100)
group by ulp.id, lp.slug, lps.step_key;
```

Na consulta efetivamente usada, a trilha foi filtrada pelo schema real, os totais foram calculados em CTEs para evitar multiplicação de linhas e os usuários fora da lista autorizada foram mascarados.

## 5. Achados principais

### 5.1 Quantificação

| Métrica | Resultado |
|---|---:|
| Linhas totais em `user_learning_progress` | 18 |
| Linhas `completed` ou com percentual 100 | 8 |
| Linhas `completed`/100 sem nenhuma tentativa do usuário | **3** |
| Usuários afetados por linhas sem tentativa | **1** |
| Linhas SQL `completed`/100 | 8 |
| Linhas SQL `completed`/100 sem tentativa | **3** |
| Usuários com SQL concluída sem tentativa | **1** |

Os três casos inconsistentes pertencem a `daniellysson@gmail.com` e correspondem às etapas 1, 2 e 3 da SQL Essencial. Todos têm `completed/100`, `source_attempt_id = null` e origem `active_learning_path_mvp`.

### 5.2 Comparação dos usuários conhecidos

| Usuário | Progresso SQL | Tentativas | Evidência |
|---|---|---:|---|
| `daniellysson@gmail.com` | 3 etapas `completed/100` | 0 | Inconsistente; origem legada de `trilha.html` |
| `admin.trilhadedados@gmail.com` | 5 etapas concluídas; evolução até 100% | 9 (8 corretas, 5 exercícios corretos) | Coerente com as cinco práticas |
| `daniellysson08@gmail.com` | Nenhuma conclusão SQL | 1 tentativa parcial/incorreta | Coerente; progresso recomendado em outra área |

Não foi encontrado outro usuário com conclusão SQL sem tentativas.

### 5.3 Origem de `source_attempt_id`

Das 18 linhas de progresso:

- 11 apontam para `diagnostic_sessions.attempt_id`;
- 7 têm `source_attempt_id` nulo;
- 0 apontam para `user_practice_attempts.id`;
- 0 possuem valor não reconhecido.

Logo, no schema e implementação atuais, `source_attempt_id` em `user_learning_progress` é usado como **origem do diagnóstico/recomendação**, não como chave de evidência de prática. A evidência prática é indireta: usuário + etapa/mapeamento de slug + atividade/exercício, além de `metadata.source = sql_practice_completion`.

Uma linha do admin iniciou como recomendação de diagnóstico e depois foi atualizada pela prática; ela preservou o `source_attempt_id` do diagnóstico e recebeu metadados de conclusão prática. Isso confirma que o campo identifica a origem da jornada, não necessariamente o evento que concluiu a etapa.

### 5.4 Diagnóstico, recomendação e prática são estados distintos

- O diagnóstico cria/atualiza progresso com `status = in_progress`, percentual 0 e `source_attempt_id` do diagnóstico.
- A recomendação fica em `learning_recommendations`, também ligada ao `attempt_id` do diagnóstico.
- A prática validada cria `user_practice_attempts` e o serviço atual atualiza o progresso agregado da etapa/trilha.
- O fluxo histórico `active_learning_path_mvp` marcava uma etapa como `completed/100` pelo botão da página de trilha, sem tentativa SQL.

Portanto, `user_learning_progress` é um agregado de jornada, não uma fonte primária e autossuficiente de evidência prática.

### 5.5 Interpretação do frontend atual

`src/progress-page.js` diferencia recomendação e progresso em andamento, mas **não diferencia com segurança uma etapa 100% de uma trilha 100%**:

- busca qualquer linha do usuário com `status = completed` e `progress_percent = 100`;
- limita o resultado a uma linha;
- usa o `path_id` dessa linha;
- renderiza “Trilha concluída”, “todas as práticas” e “100% da trilha concluída”.

Não há nessa decisão uma consulta a `user_practice_attempts`, contagem das cinco etapas ativas ou validação da origem. A regra funciona para a progressão sequencial atual, na qual a quinta prática recebe 100%, mas também aceita os registros legados de etapa criados com 100% individual.

`src/learning-paths.js` também escolhe uma linha representativa (`linha sem step_id` ou primeira linha) em vez de calcular sempre o agregado de todas as etapas. O modelo de dados não possui atualmente uma separação rígida entre “progresso da trilha” e “progresso da etapa”; ambos usam a mesma tabela e são distinguidos apenas por `step_id`.

## 6. Causa provável

Probabilidade alta:

1. O commit histórico `d801d1b` introduziu `src/active-learning-path.js` com payload explícito `status: completed`, `progress_percent: 100`, `metadata.source: active_learning_path_mvp` e `completed_from: trilha_html`.
2. Esse commit não pertence à `main`; está apenas na branch `codex/trilhas-avanco-e-diagnostico-anti-repeticao`.
3. Os três registros foram criados cerca de 30 minutos após esse commit e contêm exatamente a mesma assinatura.
4. A conta afetada não tem qualquer tentativa prática.

A explicação mais consistente é que a feature branch foi testada contra o projeto Supabase de produção e deixou dados legados. Não há evidência de que diagnóstico, seed, migration ou a regra atual da Central SQL tenham criado esses três registros.

O problema visível resulta da combinação de:

- **dados legados de teste** do fluxo antigo;
- **semântica sobrecarregada** em `user_learning_progress` (etapa e trilha na mesma estrutura);
- **ausência de vínculo explícito** entre progresso e tentativa prática;
- **interpretação permissiva no frontend**, que promove uma linha de etapa 100% a conclusão da trilha.

## 7. Riscos de correção automática

- Apagar `completed/100` apenas por ausência de `source_attempt_id` removeria também progresso válido atual, pois quatro linhas válidas do admin têm o campo nulo.
- Usar somente `metadata.source` é frágil e não substitui evidência relacional.
- Recalcular tudo a partir de tentativas pode ignorar outros tipos legítimos de conteúdo (Aula, Prática e Projeto) e regras futuras.
- Alterar os três registros sem preservar histórico pode apagar evidência útil da origem do defeito.
- Atualização em massa pode conflitar com RLS, progresso recomendado e etapas iniciadas pelo diagnóstico.
- O frontend e os serviços atuais usam percentuais cumulativos em linhas de etapa; um saneamento ingênuo pode quebrar a próxima etapa recomendada.

## 8. Recomendações

### Recomendação imediata

Não alterar dados ainda. Em uma tarefa separada, ajustar a regra de leitura/exibição para só declarar uma trilha concluída quando houver evidência coerente para todas as suas etapas práticas ativas. Para SQL Essencial hoje, isso significa cinco exercícios corretamente validados/mapeados, ou um agregado calculado a partir dessas evidências.

O ajuste deve também separar conceitualmente:

- trilha recomendada: recomendação ativa e/ou progresso 0;
- trilha iniciada: alguma atividade real, sem todos os requisitos;
- prática concluída: tentativa correta vinculada à atividade/etapa;
- trilha concluída: todas as etapas obrigatórias atendidas.

### Saneamento futuro

Depois de implantar e validar a regra de leitura:

1. preparar uma query read-only de candidatos restrita à assinatura `active_learning_path_mvp`;
2. revisar manualmente os três registros;
3. definir se serão arquivados, corrigidos ou mantidos como legado documentado;
4. executar qualquer mutação apenas com autorização explícita, backup lógico/registro dos IDs e query reversível.

Não se recomenda uma rotina genérica de limpeza neste momento. Se houver saneamento, ele deve ser cirúrgico e restrito aos dados de teste confirmados.

## 9. Respostas objetivas às perguntas da auditoria

1. **Usuários com SQL Essencial concluída sem tentativas:** 1.
2. **Registros `completed`/100 sem prática real:** 3.
3. **Diagnóstico apresentado como conclusão:** não nos três casos suspeitos; eles vieram do fluxo antigo de trilha. Há, porém, linhas de prática que preservam o `source_attempt_id` do diagnóstico.
4. **Natureza de `source_attempt_id`:** diagnóstico em 11 linhas; tentativa prática em 0; nulo em 7.
5. **Diferença de estados:** existe no processo, mas não está rigidamente representada no schema nem validada integralmente no frontend.
6. **Inconsistência isolada:** sim, apenas `daniellysson@gmail.com` no conjunto atual.
7. **Origem provável:** dado legado de teste de uma regra antiga em feature branch, potencializado pela ausência de vínculo e pela interpretação do frontend.
8. **Frontend diferencia corretamente:** parcialmente; recomendação/início sim, prática/trilha concluída não com evidência suficiente.
9. **Risco de correção automática:** alto sem regra de reconciliação por etapa e tipo de conteúdo.
10. **Ação segura:** ajustar primeiro a regra de exibição/leitura; depois avaliar saneamento cirúrgico dos três registros.

## 10. Próximo passo sugerido

Abrir uma tarefa separada, sem mutação inicial de dados, para especificar e testar uma função única de “trilha concluída” baseada nas cinco etapas ativas e nas tentativas corretas. Essa função deve alimentar Meu Progresso em desktop/mobile e receber testes para os três cenários conhecidos. Só após essa proteção deve ser proposta a limpeza dos três registros legados.
