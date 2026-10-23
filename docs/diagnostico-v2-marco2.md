# Diagnóstico V2 — Marco 2: implementação para homologação

**Base:** `c998f4b1fe2d80dc45c3e83ad0e4200c95f51809`. A especificação e a auditoria das 80 questões continuam em `docs/planejamento-local/`, preservadas localmente. **As migrações deste marco não foram aplicadas ao Supabase remoto.** Consultas ao projeto remoto foram somente leitura.

## Estado e limites

| Entrega | Estado | Evidência ou limite |
|---|---|---|
| Remover grants públicos de escrita/manutenção sem uso legítimo | IMPLEMENTADO, MAS NÃO HOMOLOGADO | Migração `20261023023120`; permissões verificadas em PGlite; produção ainda mantém grants antigos. |
| Corrigir busca dinâmica de `set_updated_at` e execução direta do trigger de perfil | IMPLEMENTADO, MAS NÃO HOMOLOGADO | Mesmo SQL; sem alterar Auth, RLS ou RPC administrativa. |
| Banco privado V2, correção no servidor e RPCs com token | IMPLEMENTADO, MAS NÃO HOMOLOGADO | Migração `20261023023220`; teste isolado executa 25 itens. Blueprint começa inativo e sem questões. |
| Identidade, posse, reenvio idempotente, retomada | CONCLUÍDO E TESTADO | Teste PGlite de acesso negado, claim, reenvio e retomada sequencial. JWT real, concorrência entre conexões e expiração permanecem pendentes em homologação. |
| Integração com quiz, recomendações, trilhas, progresso e Analytics | PENDENTE | Há contrato V2 abaixo. Nenhum módulo V1 foi alterado nem passou a consumir V2. |
| Curadoria e importação de itens aprovados | PENDENTE | Nenhum gabarito ou item V1 foi copiado; o piloto não pode ser ativado com esta entrega. |
| Teste com clientes anon/authenticated reais | BLOQUEADO | Não há ambiente de homologação isolado aprovado; nenhum teste gravou na produção. |

## Segurança: estado anterior, mudança e efeito

Consultas somente leitura ao banco remoto confirmaram RLS ativo e grants efetivos. `anon` e `authenticated` tinham `TRUNCATE`, `TRIGGER`, `REFERENCES`, `MAINTAIN` e DML de escrita em `question_bank`; tinham `TRUNCATE` e manutenção em `diagnostic_funnel_events` e `diagnostic_recommendations`. RLS não protege `TRUNCATE`. A migração remove apenas os grants sem dependência legítima identificada. Conserva `SELECT` do banco de questões para a V1, `INSERT` de eventos e `SELECT` das recomendações existentes. A função privada de claim da V1 conserva seus grants. As funções administrativas não foram modificadas: as verificadas conferem `auth.uid()` e autorização administrativa. A view `vw_sql_practice_exercises_public` exige uma revisão funcional separada antes de trocar seu modo de segurança.

**Risco residual crítico:** a V1 ainda seleciona `correct_index` no navegador; o endpoint público continua a oferecer o gabarito até a substituição integral do fluxo. A migração reduz privilégios perigosos, mas não fecha a exposição do gabarito V1. O Security Advisor pode continuar alertando sobre a view, as RPCs administrativas e a proteção de senha vazada do Auth; cada alerta precisa de teste de explorabilidade e decisão separada.

## Arquitetura V2 implementada

O schema `private` guarda blueprint, versões de itens, tentativas, itens apresentados/respostas, recomendações por área e eventos. As tabelas têm RLS ligado e nenhuma policy nem grant direto a `anon`/`authenticated`. A versão publicada de item não aceita `UPDATE` ou `DELETE`. Cada apresentação preserva `item_version_id`, posição e ordem de alternativas. A função `next` devolve somente enunciado, contexto, código, nível, competência e alternativas, sem gabarito/explicação. `submit` recebe apenas token, ID do item, ID da alternativa e chave de idempotência; calcula acerto no banco. Pontuação ou `is_correct` enviados pelo navegador não fazem parte da assinatura RPC.

As funções `SECURITY DEFINER` estão no schema não exposto `private`, com `search_path=''` e nomes qualificados. Os wrappers públicos são `SECURITY INVOKER`; `EXECUTE` é concedido individualmente. Tokens de tentativa/claim têm 256 bits construídos de dois UUIDs aleatórios e são armazenados apenas como SHA-256. A posse do token autoriza a sessão anônima; após claim, `auth.uid()` também deve coincidir. O claim expira em 24 horas. Tentativas autenticadas têm limite de cinco inícios por 24 horas. **Ainda falta controle de taxa anônima na borda** antes de ativar o blueprint. Também falta verificar o comportamento com JWT inválido/expirado no gateway real.

O algoritmo local segue o teto de 25: 15 posições de mapeamento (duas básicas e uma intermediária por área), até cinco de validação e até cinco avançadas. Cada área é avaliada separadamente. Nível usa acertos em competências distintas; dois acertos avançados ainda produzem apenas `Avançado provisório`. Alternativas têm ordem determinística por tentativa. A seleção prefere competências não apresentadas e versões não vistas na conta. Em falta de pool, registra `pool_gap` e continua. O algoritmo é uma primeira implementação determinística; a elegibilidade editorial e a regra detalhada de prioridade da especificação ainda exigem revisão antes do piloto.

## Contrato de resultado e integração

`diagnostic_v2_start` retorna `attempt_id`, `attempt_token`, `claim_token`, `methodology_version`, `blueprint_version`. O cliente deve guardar tokens em armazenamento de sessão protegido e nunca registrá-los em Analytics ou URLs. `next` é reentrante: devolve o mesmo item pendente até resposta válida. `submit` confirma aceitação/idempotência, sem revelar correção imediata. `result` retorna `status` (`active`, `completed`, `insufficient_pool`) e `result` apenas após conclusão. `claim` associa a tentativa anônima à conta autenticada mediante token exclusivo.

`result.areas[]` tem `area`, `correct`, `total`, `score_percent`, `demonstrated_level`, `confidence_band`, `distinct_skills`, `skills[]` (`skill_code`, `correct`, `total`, `evidence_sufficient`), `evidence_sufficient`, `recommendation_code` e `priority`. O topo contém `methodology_version='v2.0'`, `algorithm_version` e `completed_at`. O código de recomendação é uma **intenção pedagógica**, sem link/CTA: `collect_more_evidence`, `review_fundamentals`, `study_intermediate`, `deepen_advanced`. Só a integração com catálogo validado poderá gerar um destino acessível. Recomendações persistidas ficam em `private.diagnostic_v2_recommendations`.

| Módulo atual | Contrato de migração necessário | Estado |
|---|---|---|
| `src/quiz.js` e `src/question-bank-service.js` | Fluxo V2 via `start/next/submit/result`; não consultar `question_bank` nem calcular acerto no cliente | PENDENTE |
| `src/personalized-learning-service.js` | Projetar áreas/competências V2 sem somar respostas V1; resolver `recommendation_code` contra destino verificado | PENDENTE |
| `src/progress-page.js`, `src/learning-paths.js` | Exibir histórico V1 como “Diagnóstico anterior” e V2 por área; não equiparar percentuais ou níveis | PENDENTE |
| `src/diagnostic-account-link-service.js` | Guardar/consumir `claim_token` da V2; preservar RPC de claim V1 | PENDENTE |
| `src/analytics-service.js` | Agregar por `methodology_version`, eventos sem token/gabarito e contagens separadas V1/V2 | PENDENTE |

Os registros V1 e `user_skill_progress` não são reescritos. A V2 usa estruturas separadas para evitar alterar histórico. Não há IRT ou uso de `correct_rate` como dificuldade calibrada.

## Rollback e ordem de homologação

1. Antes de aplicar em homologação, capturar snapshot de ACLs, policies, assinaturas de função, `pg_get_functiondef` e contagens. Comparar com os pressupostos acima. Aplicar migrations na ordem numérica em transação; executar testes com clientes reais anon/authenticated e conta comum/admin.
2. A migração de grants pode ser revertida com os `GRANT` inversos **exatos do snapshot**, não com `GRANT ALL` genérico. `ALTER FUNCTION public.set_updated_at() RESET search_path` restaura a configuração anterior se era nula; `GRANT EXECUTE` do trigger de perfil deve reproduzir apenas o estado capturado. Reverter grants amplia novamente a superfície de risco; preferir corrigir regressões pontuais.
3. Para reverter o motor V2 antes de ativá-lo, confirmar zero tentativas e blueprint inativo, então remover apenas os cinco wrappers `public.diagnostic_v2_*`, as oito funções `private.diagnostic_v2_*` e as seis tabelas V2 em ordem de FKs. **Nunca usar `DROP SCHEMA private CASCADE`**, pois há funções V1 nesse schema. Depois de registrar tentativas, preservar dados e fazer rollback funcional desativando o blueprint (`is_active=false`), com aprovação explícita no ambiente correspondente.

## Checklist para homologação

- [ ] Ambiente isolado com cópia sem dados pessoais ou contas de teste; snapshot de grants e rollback revisado.
- [ ] Repetir permissões reais de `anon`, `authenticated`, usuário comum e admin; testar `TRUNCATE` negado e INSERT de evento permitido.
- [ ] Verificar que a V1 inteira permanece funcional, inclusive login, diagnóstico, recomendações e Meu Progresso.
- [ ] Popular apenas itens V2 editorialmente aprovados, com quatro alternativas, competências e versões; simular pool suficiente por área/faixa.
- [ ] Ativar blueprint só em homologação e testar sessão anônima, retomada, claim e conta diferente.
- [ ] Testar JWT inválido/expirado, token vazado, acesso direto às tabelas e tentativa de obter gabarito.
- [ ] Testar duas requisições simultâneas, duplo clique, reenvio, falha de rede e retomada após login.
- [ ] Confrontar níveis/recomendações com casos pedagógicos, conteúdo disponível e lacunas Excel/Estatística/Lógica.
- [ ] Medir tempo, abandono, acessibilidade e dispositivos; definir limite de taxa anônima antes de produção.
- [ ] Integrar e testar UI/Analytics de V1+V2, inclusive visual desktop/mobile, antes de qualquer merge/deploy.

**Decisão de publicação:** não é seguro fazer merge/deploy da V2 neste marco. O blueprint permanece inativo; a exposição do gabarito da V1 e as integrações acima continuam pendentes.
