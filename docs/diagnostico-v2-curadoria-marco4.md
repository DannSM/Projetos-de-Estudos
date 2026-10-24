# Diagnóstico V2 — Marco 4: pacote editorial para revisão humana

**Estado:** proposta editorial, sem item aprovado para importação. Fonte: 80 itens `diagnostico_v1_001`–`080` de `public.question_bank`, consultados em 24/10/2026 **somente para leitura**, auditoria CSV e especificação V2 locais. A matriz pública por identificador está em [`diagnostico-v2-marco4-matriz-publica.csv`](diagnostico-v2-marco4-matriz-publica.csv). Enunciados, alternativas, gabaritos, explicações e as 50 reescritas estão apenas em `docs/planejamento-local/MARCO4_REVISAO_HUMANA_PRIVADA.md` e `MARCO4_MATRIZ_EDITORIAL_PRIVADA.json`, pasta ignorada pelo Git. Nenhum conteúdo real foi importado na V2.

## Parecer revisado

| Parecer preliminar | Itens | Decisão de trabalho |
|---|---:|---|
| MANTER | 30 | Conservar como candidato original, revisar de novo correção, nível, quatro distratores e explicação. Não equivale a aprovação. |
| REESCREVER | 50 | Uma versão `v2-rascunho-1` completa foi proposta para cada item, com quatro alternativas, gabarito proposto, explicação e motivo da mudança. |

Os três casos críticos continuam **bloqueados para uso sem revisão dupla**: `002` confunde `NULL` e texto vazio no gabarito original; `050` não definia qual perda do funil medir; `078` permitia vários artefatos úteis para rastrear divergência. As propostas delimitam, respectivamente, normalização de e-mail, perda proporcional por etapa e visão de linhagem ponta a ponta. Os itens `039`, `045`, `047` e `048` também tiveram premissas/cálculo reescritos. `030` propõe remapear a competência para relacionamentos do Modelo de Dados, código ainda inexistente no catálogo e fora do pool inicial. `052` propõe comparação de taxas por unidade e `053` propõe sinal e ruído, ambos códigos já existentes. Nenhum remapeamento está aprovado.

## Cobertura do estoque e risco de inferência

| Área | Básico: total / MANTER preliminar / no pool | Intermediário | Avançado | Competências propostas |
|---|---:|---:|---:|---:|
| SQL | 5 / 0 / 3 | 7 / 2 / 3 | 4 / 1 / 2 | 13 |
| Estatística | 5 / 2 / 3 | 7 / 3 / 3 | 4 / 0 / 2 | 13 |
| Excel | 5 / 3 / 3 | 7 / 3 / 3 | 4 / 0 / 2 | 14 |
| Lógica de dados | 5 / 3 / 3 | 7 / 5 / 3 | 4 / 1 / 2 | 14 |
| Indicadores | 5 / 2 / 3 | 7 / 5 / 3 | 4 / 0 / 2 | 11 |

São **65 competências propostas** em 80 itens; 52 têm apenas um item. Os 40 candidatos ao banco do piloto cobrem 38 competências, portanto **não sustentam domínio por competência fina**. Relatar sinais observados e nível por área somente quando o motor encontrar evidência suficiente. Entre os 20 itens originalmente avançados, 18 pediam reescrita; a dificuldade aparente da auditoria é 2 em cinco, 3 em treze e 4 em dois. A versão proposta precisa de validação com especialistas e piloto antes de ser tratada como dificuldade empírica. Preservar `indeterminado` quando houver pouca evidência e `Avançado provisório` quando os critérios técnicos forem alcançados; não apresentar certificação.

## Banco candidato e limite de 25 por tentativa

O teto de **25 questões é por tentativa**, não o tamanho recomendado do banco. A proposta reserva 40 itens (8 por área: 3 básicos, 3 intermediários e 2 avançados) para permitir seleção e substituição sem repetir item na sessão. Os 25 prioritários incluem, em cada área, 2 básicos, 2 intermediários e 1 avançado; os outros 15 são reservas (1 por nível e área). Todos dependem de aprovação humana, sobretudo SQL básico e os críticos `002`/`050`.

| Área | 25 prioritários: básico · intermediário · avançado | 15 reservas: básico · intermediário · avançado |
|---|---|---|
| SQL | `001 002` · `006 009` · `014` | `005` · `011` · `015` |
| Estatística | `033 034` · `038 039` · `045` | `036` · `040` · `047` |
| Excel | `017 020` · `022 024` · `029` | `021` · `027` · `031` |
| Lógica de dados | `065 066` · `070 072` · `077` | `068` · `073` · `079` |
| Indicadores | `049 050` · `054 055` · `061` | `051` · `060` · `062` |

O blueprint atual usa 15 itens de mapeamento (2 básicos e 1 intermediário por área), até 5 de validação e até 5 de aprofundamento. Três básicos e três intermediários distintos por área dão uma reserva para a validação. Dois avançados por área permitem aprofundamento onde houver espaço, mas o limite global de cinco perguntas avançadas **não permite confirmação avançada das cinco áreas na mesma tentativa**. Validar com o motor a seleção efetiva e os resultados por perfil após aprovação do conteúdo. O pool é candidato, não pronto para importação.

## Conteúdos existentes e lacunas

| Lacuna avaliada | Destino verificado | Estado editorial |
|---|---|---|
| `sql.filtering.where_logic` | `praticas-sql.html?pratica=sql-essencial-filtros-where` | Prática ativa; filtro antes da agregação corresponde aos itens `001`/`004`. |
| `sql.aggregation.counting`, `sql.aggregation.distinct_entities` | `praticas-sql.html?pratica=sql-essencial-count-nulos-distintos` | Prática ativa; cobre `COUNT(*)`, `COUNT(coluna)` e `COUNT(DISTINCT)`; relevante a `002`/`008`. |
| `kpi.target.interpretation` | `pratica-guiada.html?atividade=indicadores-meta-resultado` | Prática guiada existente de resultado versus meta; correspondência direta ao `049`, ainda sem ligação automática da V2. |
| Demais competências | Sem prática direta verificada | Manter orientação textual. Não converter existência de trilha sem URL ou tema parecido em CTA específico. |

Estatística e Lógica têm trilhas/passos, mas sem URL de atividade confirmada para as lacunas da matriz. Excel não tem trilha ativa. SQL intermediário/avançado e Indicadores além de meta/resultado carecem de destino diretamente comprovado. Essas lacunas de conteúdo não impedem perguntar no piloto, mas impedem prometer uma prática vinculada para cada resultado. Qualquer destino novo exige conteúdo existente e correspondência revisada, sem inventar URLs.

## Aceite humano por item

1. Dois revisores, sendo ao menos um da área, resolvem o item **sem ver o gabarito**; divergências são registradas e corrigidas antes de aprovação.
2. O enunciado explicita fonte, grão, período, denominador, premissas e dialeto quando necessários. Há exatamente uma alternativa defensável; as outras três representam erros reais plausíveis e têm extensão/forma comparável.
3. Gabarito e explicação são recalculados ou executados quando aplicável (SQL, fórmulas, taxas, decomposições). A explicação também informa por que os distratores falham e quais premissas limitam a conclusão.
4. O nível é confirmado por tarefa efetivamente exigida, não pela dificuldade cadastrada. Competência e pré-requisitos correspondem à tarefa; remapeamentos exigem aprovação do catálogo.
5. Versão, autor, revisores, data, decisão e motivo ficam registrados. Item aprovado é imutável; nova correção gera nova versão. Não reutilizar a versão original como prova de item respondido historicamente.
6. Rodar piloto fechado para observar tempo, omissões, distribuição de respostas, discriminação, comportamento de distratores e resultados por área. Só depois ajustar dificuldade e cortar itens ruins. Não usar `correct_rate` legado como calibração.

## Pendências para seleção do piloto

- Revisão dupla dos 80 originais e das 50 propostas. Os 30 itens preliminarmente MANTER ainda têm alternativas por vezes fáceis e não foram aprovados automaticamente.
- Aprovar ou substituir os básicos de SQL: **zero dos cinco** recebeu parecer preliminar MANTER. Sem pelo menos dois básicos distintos validados e um terceiro de reserva, não liberar o pool SQL.
- Resolver os itens críticos `002`, `050` e `078`; `078` está fora dos 40 candidatos, mas sua decisão editorial continua necessária.
- Confirmar os remapeamentos `030`/`052`/`053`, completar evidências paralelas para competências finas se o produto quiser inferi-las, e decidir escopo de conteúdo sem destino.
- Revisar acessibilidade linguística, tempo de resposta e qualidade dos distratores com alunos reais; registrar aprovação humana antes de qualquer importação privada.

**Segurança e escopo:** nenhuma migration, seed, policy, RLS, Auth, dado remoto, frontend, V1, MapIA, merge ou deploy foi alterado por este marco. A consulta Supabase foi somente leitura. O pacote público contém apenas identificadores/metadados; textos e gabaritos permanecem locais e privados.
