# Diagnóstico V2 — visão editorial para revisão

Fonte: auditoria local das 80 questões V1 em `docs/planejamento-local/DIAGNOSTICO_V2_AUDITORIA_QUESTOES.csv` e especificação do Marco 1. Esta visão não contém enunciados, alternativas ou gabaritos. A matriz original permanece local e não foi copiada para o repositório publicado.

| Parecer da auditoria | Quantidade | Significado para o piloto |
|---|---:|---|
| MANTER | 30 | Aproveitável como evidência limitada; requer revisão e aprovação humana antes de importar. |
| REESCREVER | 50 | Enunciado, premissas, distratores ou aplicação precisam de revisão. |
| Prioridade crítica | 3 | Itens `diagnostico_v1_002`, `diagnostico_v1_050` e `diagnostico_v1_078`; todos estão em REESCREVER. |

Cada uma das cinco áreas tem 16 itens (5 básicos, 7 intermediários e 4 avançados). Há 64 `skill_code` distintos; a maioria das competências finas não tem duas evidências independentes. A regra de até 25 perguntas exige pool editorialmente aprovado por área/nível, com pelo menos duas competências básicas distintas e uma intermediária por área, mais reservas de validação e aprofundamento. **A auditoria não confere essa aprovação.** As 60 questões da homologação são sintéticas e não integram o conteúdo de lançamento.

Destinos verificados no código: a prática SQL Essencial de filtros `praticas-sql.html?pratica=sql-essencial-filtros-where` corresponde a `sql.filtering.where_logic`. A interface só oferece esse CTA se a competência aparecer como lacuna no resultado. Há prática de Indicadores em `pratica-guiada.html?atividade=indicadores-meta-resultado`, mas a auditoria ainda não estabeleceu uma correspondência inequívoca com um `skill_code` específico; por isso ela não foi ligada automaticamente. Estatística e Lógica têm passos ativos sem URL de conteúdo confirmado; Excel não tem trilha ativa. Nesses casos a V2 mostra orientação textual.

Próxima revisão humana: analisar os 30 itens marcados MANTER e os 50 marcados REESCREVER, decidir elegibilidade e versão de cada item, criar itens paralelos para competências com evidência única, validar os destinos no catálogo e aprovar um pacote privado de importação. Nenhum conteúdo real foi importado ou publicado neste marco.
