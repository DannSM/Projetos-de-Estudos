# Diagnóstico V2 — Marco 5: homologação preliminar do banco candidato

**Parecer: NO-GO para piloto fechado neste momento.** O banco de 40 itens funciona tecnicamente no PostgreSQL isolado em memória, mas nenhuma das 80 questões tem aprovação editorial humana. O pool de apenas 25 itens não sustenta as etapas adaptativas sem lacunas. A experiência visual com perguntas reais não foi testada localmente.

## Fonte, isolamento e alcance

- Fonte privada confirmada pelo responsável: `docs/planejamento-local/diagnostico_v2_80_questoes.json`, SHA-256 `17f8bab8111faf3a34ab3e8866ac4768172b99b86ba956cdaa53aec3534d92bc`. Este arquivo, enunciados, alternativas, gabaritos e relatórios sensíveis permanecem na pasta local ignorada pelo Git.
- O carregador [`run-private-bank-local.cjs`](../tests/diagnostic-v2-homologation/run-private-bank-local.cjs) aceita apenas `--isolated-pglite`, verifica caminho e hash da fonte e usa **PGlite em memória, sem URL ou conexão remota**. Foi executado `node tests/diagnostic-v2-homologation/run-private-bank-local.cjs --isolated-pglite` somente na máquina local. O conteúdo não foi enviado ao CI.
- Foram criados três bancos descartáveis: **80 itens** para compatibilidade com o schema e idempotência, **25 prioritários** para o cenário A, e **40 prioritários + reservas** para o cenário B. A inserção repetida da mesma versão foi idempotente; conteúdo divergente na mesma chave/versão é rejeitado. O campo `published_at` foi usado apenas para disponibilizar itens ao motor no banco isolado, sem equivaler a aprovação editorial.
- O relatório detalhado `MARCO5_HOMOLOGACAO_PRIVADA.json`, a matriz `MARCO5_MATRIZ_PROBLEMAS_PRIVADA.csv`, as cinco provas técnicas locais e uma cópia com ajuste **proposto** do item `003` estão em `docs/planejamento-local/`. Nenhum desses arquivos é versionado. A fonte confirmada foi preservada sem edições.

## Integridade e cobertura

O arquivo tem 80 chaves únicas `001`–`080`, 16 questões por área, todas com nível válido, competência reconhecida no catálogo, enunciado, quatro alternativas textualmente distintas, um gabarito A–D e explicação. As classificações são 25 `prioritario`, 15 `reserva` e 40 `fora_do_pool_inicial`. Os 80 registros continuam `PENDENTE_REVISAO_HUMANA`. A validação estrutural **não confirma** que cada distractor é plausível ou que há exatamente uma resposta tecnicamente defensável.

| Banco | Básico / Intermediário / Avançado por área | Competências distintas | Uso |
|---|---:|---:|---|
| 25 prioritários | 2 / 2 / 1 | 25 | Mapeamento possível; falta reserva básica e segundo avançado. |
| 40 com reservas | 3 / 3 / 2 | 38 | Seleção adaptativa tecnicamente viável nos perfis normais. |
| 80 candidatos | 5 / 7 / 4 | 64 | Expansão; todos inseridos apenas para teste de schema. |

Há 12 pares de itens na mesma combinação área–nível–competência. A independência pedagógica desses pares requer revisão humana; códigos diferentes tampouco provam competências dominadas com uma única resposta.

## Seleção efetiva: 25 versus 40

Foram aplicadas dez regras de resposta controladas em cada cenário. Nove são perfis normais; o perfil **I** retira itens básicos de SQL somente no banco de teste para provar o tratamento de falta de pool. O sorteio do motor usa identificadores de tentativa, portanto as frequências abaixo descrevem **esta execução sintética**, não distribuição esperada entre alunos.

| Métrica da execução | 25 prioritários | 40 com reservas |
|---|---:|---:|
| Itens apresentados nas dez tentativas | 178 | 219 |
| Itens distintos apresentados | 23 de 25 | 38 de 40 |
| Tentativas concluídas / falta de pool provocada | 9 / 1 | 9 / 1 |
| Eventos `pool_gap` nos nove perfis normais | **46** | **0** |
| Eventos `pool_gap` no perfil I provocado | 6 | 2 |
| Reservas nas 149 posições de mapeamento | indisponíveis | **50** |
| Tempo total estimado pelas fichas | 24–38 min | 32–50 min |

Com 25, o perfil iniciante recebe 15 questões, enquanto com 40 recebe 20: não existe terceira básica por área para validação no banco de 25. No perfil de acerto alto, 25 itens disponíveis produziram 21 perguntas porque há somente uma avançada por área; com 40, o percurso chegou a 25. Os tempos são **estimativas editoriais**, não medições de alunos. O item `003` não tem duração cadastrada, mas não foi sorteado nestes dois pools.

**Prioridade editorial:** no cenário de 40, 50/149 perguntas de mapeamento vieram das reservas. O motor não possui ordenação pelo rótulo `prioritario`; a seleção considera área, nível, competência já vista, histórico do usuário e desempate por hash. Assim, `prioritario` é uma decisão de curadoria para compor o pool, não uma preferência automática do algoritmo. Não alteramos o motor sem uma decisão de produto sobre essa regra.

## Dez perfis simulados

Ordem dos cinco resultados em cada célula: **SQL / Estatística / Excel / Lógica de dados / Indicadores**. `R` = fundamentos a revisar; `B` = fundamentos demonstrados; `I` = intermediário demonstrado; `AP` = avançado provisório; `?` = indeterminado.

| Perfil e regra | 25: perguntas; resultados | 40: perguntas; resultados |
|---|---|---|
| A. Todas incorretas | 15; R/R/R/R/R | 20; R/R/R/R/R |
| B. Só básicas corretas | 20; B/B/B/B/B | 20; B/B/B/B/B |
| C. Básicas e intermediárias corretas | 21; I/I/I/I/I | 25; I/I/I/I/I |
| D. SQL forte, Estatística fraca | 17; I/R/R/R/R | 22; AP/R/R/R/R |
| E. Excel forte, Indicadores fracos | 17; R/R/I/R/R | 22; R/R/AP/R/R |
| F. Lógica forte, SQL fraco | 17; R/R/R/I/R | 22; R/R/R/AP/R |
| G. Todas corretas | 21; I/I/I/I/I | 25; AP/AP/I/I/I |
| H. Acertos alternados por posição | 15; ?/?/?/?/? | 20; B/R/B/R/B |
| I. Básicas SQL retiradas no teste | 14; ?/R/R/R/R; `insufficient_pool` | 18; ?/R/R/R/R; `insufficient_pool` |
| J. Interrupção e retomada | 21; I/I/I/I/I | 25; I/I/I/I/I |

Para os 20 percursos, o teste confrontou respostas registradas com acertos, total, competências distintas, nível, suficiência declarada por área, código e prioridade de recomendação. Nenhuma questão se repetiu dentro de uma tentativa. A chamada de retomada devolveu o mesmo item e a mesma ordem de opções. A resposta pública de `next` não continha gabarito nem explicação. O perfil G ilustra que **100% de acertos não implica avançado nas cinco áreas** sob o teto global de 25 questões.

## Achados por questão e validação de conteúdo

| Itens | Status | Evidência e ação |
|---|---|---|
| `002`, `050`, `078` | **PENDENTE DE APROVAÇÃO HUMANA / revisão dupla** | Os três críticos permanecem identificados; `002` e `050` estão entre os 25 prioritários. Participaram apenas de simulação interna. A revisão dupla deve confirmar correção, nível e unicidade da resposta. |
| `003` | **CORREÇÃO NECESSÁRIA** | Faltam duração estimada e anotação de validação técnica. Há uma cópia privada com proposta de 90 s e verificação de ordenação com empate, **não aplicada à fonte**. O valor proposto é editorial e requer aceite. |
| `030`, `052`, `053` | **PENDENTE DE APROVAÇÃO HUMANA** | A matriz de origem sinaliza remapeamentos e revisão de nível. O catálogo reconhece os códigos atuais, mas a adequação pedagógica depende de decisão humana. |
| `077` e outros itens longos | **NÃO TESTADO visualmente com conteúdo real** | Maior alternativa tem 195 caracteres; conferir quebra, foco e leitura em 390 px antes de piloto. |
| Demais itens | **PENDENTE DE APROVAÇÃO HUMANA** | Estrutura/schema validados; cálculo, linguagem, nível e distractores ainda não receberam checagem independente completa. |

Cinco verificações locais selecionadas passaram: filtros de período e contagem com vazios em PostgreSQL isolado (`001`, `002`), cálculo de taxa agregada (`039`), conversão por etapa (`050`) e primeira transição divergente (`078`). As outras 75 questões **não tiveram execução técnica independente individual neste marco**. Fórmulas de Excel e Power Query exigem ambiente e revisão representativos; não inferir validade delas a partir de PGlite. A classificação técnica já presente no arquivo de entrada é evidência anterior, não aprovação nova.

## Experiência e limites dos testes

O teste exercitou a API SQL do motor e seu contrato com questões reais em banco isolado, incluindo salvamento, retomada, resultado das cinco áreas e ausência de gabarito em `next`. **Não houve teste da interface com conteúdo real.** Este ambiente não dispõe de Docker, `psql` nem navegador Playwright instalado; a CLI Supabase local não iniciou por bloqueio de escrita em sua telemetria. Nenhum screenshot com conteúdo privado foi gerado. As capturas sintéticas do Marco 3.1 não substituem esse teste. Antes do piloto, conferir desktop/mobile, código SQL/fórmulas, alternativas longas, nomes de competências, Meu Progresso e console em ambiente isolado com acesso controlado.

## Checklist para reconsiderar o piloto fechado

- [ ] Aprovação editorial humana das questões selecionadas, com dois revisores nos itens `002`, `050` e `078`; registrar versão, justificativa e gabarito conferido.
- [ ] Corrigir/aceitar os metadados de `003` sem sobrescrever a fonte de forma silenciosa; resolver remapeamentos e níveis sinalizados.
- [ ] Escolher banco de ao menos 40 itens aprovados **ou** alterar formalmente blueprint/seleção após novo teste; não usar o pool de 25 como se garantisse validação e aprofundamento.
- [ ] Decidir se reservas podem ser sorteadas desde o início. Se não, especificar prioridade editorial no algoritmo e homologar novamente.
- [ ] Executar as questões SQL/cálculos/fórmulas ainda não verificados, testar casos de borda e revisar os 12 pares de competência repetida.
- [ ] Validar UI desktop/mobile e histórico com o banco privado em ambiente controlado, sem artefatos públicos; verificar que resultados com `insufficient_pool` não sejam comunicados como domínio.
- [ ] Recolher respostas humanas para estimar duração, dificuldade, discriminação e funcionamento dos distractores. Simulações não fornecem validade psicométrica.

**Status final:** importação/schema e perfis do banco de 40: **APROVADO TECNICAMENTE NO AMBIENTE ISOLADO**; pool de 25 e metadados de `003`: **CORREÇÃO NECESSÁRIA**; experiência visual real e análise empírica: **NÃO TESTADO**; 80 itens: **PENDENTE DE APROVAÇÃO HUMANA**. Sem aprovação e verificações restantes, o piloto fechado permanece **NO-GO**. Nenhum dado remoto, V1, migration, RLS, policy, Auth, frontend ou MapIA foi alterado; não houve merge nem deploy.
