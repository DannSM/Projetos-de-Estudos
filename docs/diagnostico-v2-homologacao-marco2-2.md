# Diagnóstico V2 — Marco 2.2: homologação técnica isolada

**Data:** 24/10/2026. **Branch:** `codex/diagnostico-v2-marco-2`. **Produção:** nenhuma migration, configuração ou dado alterado. O workflow executa somente `supabase start` e `supabase stop` contra um projeto local descartável no runner GitHub Actions; não recebe project-ref, access token, senha remota ou service-role de produção.

## Ambiente e reconstrução

- GitHub Actions `ubuntu-latest` (na execução observada: Ubuntu 24.04.5), Node 22, Supabase CLI 2.101.0, PostgreSQL 17, Auth e PostgREST locais. Gatilho `push` restrito à feature branch e aos arquivos do teste; `GITHUB_TOKEN` com `contents: read`.
- Cinco migrations aplicadas em ordem no projeto isolado: `20260622000000_synthetic_v1_dependencies.sql` (fixture), `20260622004102_claim_anonymous_diagnostic.sql` (V1 real), `20261023023120_diagnostico_v2_security_and_model.sql`, `20261023023220_diagnostico_v2_private_engine.sql` e `20261023023320_synthetic_v2_items.sql` (fixture). O blueprint da migration V2 nasce inativo; a última fixture inclui 60 itens sintéticos e o ativa somente neste runner.
- A baseline V1 em `tests/diagnostic-v2-homologation/fixtures/v1-dependencies.sql` é **parcial**: reproduz as tabelas/colunas, policies e grants necessários ao claim V1 e às migrations V2, mais um item público V1 e um RPC invocador de teste para tentar `TRUNCATE`. Não reconstrói todo o produto, dados reais, catálogo, progresso, Analytics ou configuração remota de Auth. A regressão V1 end-to-end, inclusive páginas e navegação, continua pendente.
- `private` não está na lista de schemas expostos no `config.toml`. Logs de inicialização ficam no diretório temporário do runner, têm saída filtrada em caso de falha e são apagados no encerramento. O teste HTTP imprime contagens e erros curtos, sem corpos de resposta, senhas ou tokens; não há upload de artefatos.

## Evidência de execução

| Execução | Resultado observado |
|---|---|
| [#1](https://github.com/DannSM/Projetos-de-Estudos/actions/runs/40090314368) | Stack e migrations iniciaram; falha no caminho da fixture de itens. |
| [#2](https://github.com/DannSM/Projetos-de-Estudos/actions/runs/40090557343) | Stack iniciou; `db query --file` recusou múltiplas instruções preparadas. A carga passou à última migration local. |
| [#3](https://github.com/DannSM/Projetos-de-Estudos/actions/runs/40090680289) | Cinco migrations aplicadas; teste HTTP encontrou formato `INSERT 0 1` do CLI e o parser foi corrigido. |
| [#4](https://github.com/DannSM/Projetos-de-Estudos/actions/runs/40090794371) | **Sucesso:** 524 verificações no gateway, com Auth, PostgREST, JWT, concorrência e perfis pedagógicos. |
| [#5](https://github.com/DannSM/Projetos-de-Estudos/actions/runs/40090983179) | Ampliação para dez perfis; uma asserção usava `Lógica` em vez do rótulo canônico `Lógica de dados`. Motor não foi alterado. |
| [#6](https://github.com/DannSM/Projetos-de-Estudos/actions/runs/40091119278) | **Sucesso final:** 679 verificações no gateway, dez perfis pedagógicos, zero falhas; stack encerrada. |

O teste do gateway usa quatro contas sintéticas por execução e conexões HTTP simultâneas via `Promise.all`. Conferiu grants por consulta SQL local; `SELECT` V1 e `INSERT` legítimo de evento; `TRUNCATE` negado; schema/tabelas/funções privadas inacessíveis por PostgREST; JWT inválido e JWT assinado expirado; tentativa sem token ou token incorreto; `start`, `next`, `submit`, `result` e `claim`; retomada, claim concorrente, posse entre contas, expiração da janela anônima, exclusão de conta, reenvio idêntico após conclusão, resposta conflitante, ausência de gabarito e recusa de parâmetros de pontuação. Também verificou `next` e `submit` simultâneos, chave de início repetida e teto de cinco inícios por conta em 24 horas. As asserções consultam o estado persistido após as corridas.

Os perfis pedagógicos do gateway cobrem todas as áreas fracas, força apenas em SQL, força apenas em Indicadores, acertos até Intermediário, avanço parcial em SQL, acerto isolado, retomada, todos os itens corretos, força apenas em Estatística e força apenas em Excel. Uma execução separada testa falta de pool, nível indeterminado, evidência insuficiente e teto de 25 itens. Os casos com banco real usam conteúdo **sintético**; coerência editorial das questões e destinos de recomendação exigem validação humana antes do piloto.

## Correções e verificações complementares

- `response_ms` foi alterado de `integer` para `bigint` na migration V2 ainda não aplicada remotamente. O teste PGlite confirmou overflow após 30 dias no tipo anterior e persistência acima de 2.147.483.647 ms com o novo tipo; o gateway repetiu a retomada autenticada de 30 dias.
- Em GitHub Actions passaram `npm ci`, a cadeia de migrations/fixtures em PGlite, `test:diagnostic-v2-migrations`, `test:diagnostic-link`, `test:auth-session`, `test:progress-next-practice` e `test:public-build` antes do teste HTTP. Localmente passaram `node --check` dos scripts alterados e de 34 arquivos JS em `src`, `git diff --check`, os mesmos testes e `npm run build`/`check:dist` (55 arquivos). No Windows, o teste de symlink do build público foi simulado por falta de privilégio; no runner Ubuntu foi nativo.
- A fixture exercita o claim V1 real, mas a baseline parcial não autoriza concluir que diagnóstico, recomendações, progresso, UI ou Analytics V1 funcionem ponta a ponta. Nenhum teste visual foi necessário: este marco não alterou UI.

## Critérios e riscos residuais

A homologação técnica do motor e do gateway está demonstrada **somente no ambiente isolado sintético**. A produção ainda mantém grants antigos, a V1 expõe `correct_index` pelo cliente, e a configuração real de schemas da Data API precisa ser confirmada antes de aplicar migrations. Os dez perfis sintéticos não substituem revisão pedagógica dos 80 itens, cobertura de catálogo, acessibilidade, dispositivos ou métricas de abandono. O limite de cinco inícios autenticados foi validado; falta definir e testar rate limit anônimo na borda Cloudflare, com atenção a IPs compartilhados e falsos positivos. Nenhuma configuração Cloudflare foi alterada.

**Próximo marco:** revisar a baseline e ACLs reais por consultas somente leitura; curar itens e destinos; aprovar um ambiente de homologação representativo para regressão V1 completa; definir limite anônimo; só então integrar UI/Analytics V2 e validar desktop/mobile. Não ativar o blueprint nem fazer merge/deploy com esta entrega.
