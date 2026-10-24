# Diagnóstico V2 — visão editorial para revisão

Fonte: auditoria local das 80 questões V1 em `docs/planejamento-local/DIAGNOSTICO_V2_AUDITORIA_QUESTOES.csv` e especificação do Marco 1. Esta visão não contém enunciados, alternativas ou gabaritos. A matriz original permanece local e não foi copiada para o repositório publicado.

| Parecer da auditoria | Quantidade | Significado para o piloto |
|---|---:|---|
| MANTER | 30 | Aproveitável como evidência limitada; requer revisão e aprovação humana antes de importar. |
| REESCREVER | 50 | Enunciado, premissas, distratores ou aplicação precisam de revisão. |
| Prioridade crítica | 3 | Itens `diagnostico_v1_002`, `diagnostico_v1_050` e `diagnostico_v1_078`; todos estão em REESCREVER. |

Cada uma das cinco áreas tem 16 itens (5 básicos, 7 intermediários e 4 avançados). Há 64 `skill_code` distintos; a maioria das competências finas não tem duas evidências independentes. A regra de até 25 perguntas exige pool editorialmente aprovado por área/nível, com pelo menos duas competências básicas distintas e uma intermediária por área, mais reservas de validação e aprofundamento. **A auditoria não confere essa aprovação.** As 60 questões da homologação são sintéticas e não integram o conteúdo de lançamento.

## Cobertura preliminar dos itens marcados MANTER

| Área | Básico | Intermediário | Avançado | Lacuna imediata |
|---|---:|---:|---:|---|
| SQL | 0 | 2 | 1 | Nenhum item básico aproveitável sem reescrita. |
| Estatística | 2 | 3 | 0 | Avançado depende de reescrita e revisão. |
| Excel | 3 | 3 | 0 | Avançado depende de reescrita e revisão. |
| Lógica de dados | 3 | 5 | 1 | Ampliar evidência independente por competência. |
| Indicadores | 2 | 5 | 0 | Avançado depende de reescrita e revisão. |

Esses 30 itens ainda não compõem um pool aprovado: `MANTER` é somente um parecer inicial. Para o piloto, a equipe editorial deve validar quatro alternativas, contexto, nível, competência e versão de cada item; depois completar pelo menos o mapeamento básico/intermediário de cada área com reservas para validação e conferir a distribuição do pool antes da importação privada. Os nomes amigáveis das 64 competências no frontend foram derivados da coluna `conceito` da matriz local; qualquer nome novo deve passar pela mesma revisão humana.

Destinos verificados no código: a prática SQL Essencial de filtros `praticas-sql.html?pratica=sql-essencial-filtros-where` corresponde a `sql.filtering.where_logic`. A prática SQL de contagens, nulos e distintos `praticas-sql.html?pratica=sql-essencial-count-nulos-distintos` corresponde a `sql.aggregation.counting` e `sql.aggregation.distinct_entities`; seu objetivo e exercício cobrem explicitamente `COUNT(*)`, `COUNT(coluna)` e `COUNT(DISTINCT coluna)`. A interface só oferece esses CTAs se a competência aparecer como lacuna na área prioritária. Há prática de Indicadores em `pratica-guiada.html?atividade=indicadores-meta-resultado`, mas a auditoria ainda não estabeleceu uma correspondência inequívoca com um `skill_code` específico; por isso ela não foi ligada automaticamente. Estatística e Lógica têm passos ativos sem URL de conteúdo confirmado; Excel não tem trilha ativa. Nesses casos a V2 mostra orientação textual.

Próxima revisão humana: analisar os 30 itens marcados MANTER e os 50 marcados REESCREVER, decidir elegibilidade e versão de cada item, criar itens paralelos para competências com evidência única, validar os destinos no catálogo e aprovar um pacote privado de importação. Nenhum conteúdo real foi importado ou publicado neste marco.
