# Integracao entre diagnostico, recomendacao e missoes

## Resumo executivo

A pagina `missao.html` ja existe e a publicacao atual responde em `/missao`. Ela e uma POC local de pratica guiada: usa conteudo e estado em memoria, executa SQL no navegador para a terceira missao, valida a resposta por resultado e estrutura minima, bloqueia comandos destrutivos e nao persiste tentativa, conclusao ou progresso real.

A missao ainda nao esta conectada ao fluxo oficial do produto. O diagnostico gera recomendacao de trilha e primeiro passo, salva registros em tabelas de aprendizado para usuario logado e direciona visualmente para `index.html#trilhas` ou `meu-progresso.html`. O `Meu Progresso` ja possui o melhor ponto tecnico de entrada, porque usa `learning_path_steps.content_url` como `href` do proximo passo quando esse campo existe. Em producao, porem, os passos ativos estao com `content_url = null`, entao o fallback atual continua sendo `index.html#trilhas`.

Decisao recomendada para a primeira versao publica: conectar a POC como uma pratica guiada a partir do card "Proxima etapa" do `Meu Progresso`, usando `learning_path_steps.content_url` apenas como destino de navegacao. Nao usar `content_url` como evidencia de conclusao, nao marcar progresso como concluido ao abrir a pagina e nao criar link solto na Home.

## Estado atual do fluxo pos-diagnostico

Hoje o diagnostico:

- coleta respostas em `diagnostic_answers`;
- salva a sessao final em `diagnostic_sessions`;
- monta `personalizedResultPayload` com tentativa, score, prioridade, area, nivel e respostas;
- chama `window.personalizedLearningService.generateFromDiagnosticResult(resultPayload)`;
- renderiza CTAs para `index.html#trilhas` e `meu-progresso.html`.

Para usuario logado, o servico de aprendizado personalizado tenta gravar:

- `user_learning_progress`, com `status` inicial `in_progress`, `progress_percent` 0 e `source_attempt_id` do diagnostico;
- `learning_recommendations`, com `recommendation_type = "path"` e metadados de mapeamento;
- `user_skill_progress`, como consolidado por area/habilidade.

O usuario nao e enviado diretamente para a missao apos concluir o diagnostico. A continuidade atual e:

1. Diagnostico mostra resultado.
2. CTA `Ver trilha recomendada` aponta para `index.html#trilhas`.
3. CTA `Meu Progresso` aponta para `meu-progresso.html`.
4. `Meu Progresso` monta o proximo passo a partir de `user_learning_progress`, `learning_recommendations`, `learning_paths` e `learning_path_steps`.

## Onde a recomendacao e gerada

Arquivos principais:

- `src/quiz.js`: fecha o diagnostico, salva a sessao e chama a ponte de aprendizado personalizado.
- `src/personalized-learning-service.js`: escolhe trilha, primeiro passo, recomendacao persistente e consolidado de progresso/habilidade.
- `src/progress-page.js`: consome recomendacao/progresso e renderiza o card de "Proxima etapa".
- `src/learning-paths.js`: renderiza trilhas e passos ativos na Home.

A recomendacao usa uma combinacao de sinais:

- `recommendation_key` das respostas fracas ou das recomendacoes diagnosticas;
- `skill_code` das respostas fracas ou das recomendacoes diagnosticas;
- area prioritaria calculada no resultado;
- nivel/faixa de compatibilidade;
- score geral para evitar recomendar trilha integradora cedo demais;
- metadados de `learning_paths`, especialmente `related_recommendation_keys`, `related_skill_codes`, `related_areas` e `related_levels`.

O servico busca `diagnostic_recommendations` primeiro por `recommendation_key`. Se nao houver chaves, busca por `skill_code`. Depois pontua trilhas por correspondencia com area, recomendacao, skill e nivel.

## Como `learning_path_steps` e consumido hoje

`learning_path_steps` e consumido em tres pontos relevantes:

- `src/personalized-learning-service.js`: busca o primeiro passo ativo da trilha recomendada e grava `step_id` em `user_learning_progress`.
- `src/progress-page.js`: busca o passo atual ou primeiro passo ativo da trilha e monta o proximo passo.
- `src/learning-paths.js`: lista ate tres passos por trilha na Home, mas hoje renderiza esses passos como texto, nao como links.

O campo `content_url` ja e usado como navegacao no `Meu Progresso`:

```js
href: step.content_url || "index.html#trilhas"
```

Importante: no codigo atual, `content_url` nao e usado como prova de conclusao. Ele apenas define o destino do link do card "Proxima etapa". A conclusao de progresso nao deve depender de abrir a URL.

Consulta Supabase somente leitura feita nesta analise confirmou que todos os passos ativos de `learning_path_steps` estao com `content_url = null`, incluindo:

- `sql-essencial-01-where`;
- `sql-essencial-02-contagens`;
- `sql-essencial-03-filtro-mais-agregacao`.

Por isso, mesmo que o codigo suporte o campo, o fluxo real ainda cai no fallback `index.html#trilhas`.

## Alternativas avaliadas

### 1. Conectar por `content_url` em `learning_path_steps`

Descricao: preencher `content_url` dos passos de SQL Essencial com URLs como `missao.html?missao=filtros-where` ou a rota limpa equivalente.

Pros:

- reaproveita contrato ja existente;
- exige pouca mudanca de frontend;
- conecta a missao ao "Proxima etapa" do `Meu Progresso`;
- preserva `learning_path_steps` como estrutura/catalogo;
- evita criar uma nova superficie visual antes da decisao de produto.

Contras:

- exige alteracao de dados no Supabase, preferencialmente via seed/migration versionada;
- se for usado sem cuidado, pode parecer que abrir link equivale a progresso;
- a Home/Trilhas ainda precisaria de ajuste se quisermos links visiveis nos cards de trilha.

Riscos:

- preencher `content_url` direto em producao sem registro versionado;
- usar o campo como criterio de conclusao;
- mandar todos os passos para a mesma URL sem preservar contexto da missao.

Recomendacao: usar nesta fase, mas apenas como navegacao, nunca como evidencia.

### 2. Card dedicado no `Meu Progresso`

Descricao: criar um card de "Missao recomendada" separado do card atual de proxima etapa.

Pros:

- comunica melhor que a missao e pratica guiada, nao aula generica;
- permite explicar lacuna, criterio de conclusao e status;
- fica no lugar certo da jornada: apos diagnostico e junto do progresso.

Contras:

- exige alteracao de UI/JS;
- sem nova estrutura de tentativas, ainda seria um card para uma POC sem progresso real;
- pode duplicar a funcao do card "Proxima etapa".

Riscos:

- virar CTA bonito sem persistencia;
- parecer progresso real antes de haver evidencia registrada.

Recomendacao: bom para a proxima iteracao de produto, depois de validar a entrada via `content_url`.

### 3. CTA direto no resultado do diagnostico

Descricao: apos gerar resultado, exibir botao "Comecar missao recomendada".

Pros:

- reduz atrito logo apos o diagnostico;
- reforca a promessa "diagnostico virou acao";
- aumenta chance de primeira pratica.

Contras:

- o resultado atual chama a geracao personalizada de modo assincrono;
- a missao ainda nao tem persistencia real;
- pode criar uma transicao brusca para uma POC local sem salvar conclusao.

Riscos:

- o usuario anonimo achar que progresso sera salvo;
- o CTA aparecer antes de existir recomendacao confiavel;
- misturar resultado do diagnostico com link hardcoded.

Recomendacao: nao usar como primeira conexao. Adiar ate haver contrato mais claro de missao recomendada ou ate o `Meu Progresso` estar conectando bem.

### 4. Link/card na pagina Trilhas

Descricao: renderizar `content_url` nos passos de trilha ou criar CTA dentro do card SQL Essencial.

Pros:

- torna a missao descoberta por quem navega na Home;
- aproveita a secao de trilhas ja existente;
- pode mostrar que alguns passos possuem pratica guiada.

Contras:

- a missao deixa de ser claramente pos-diagnostico;
- usuarios podem abrir a pratica sem contexto da lacuna;
- exige ajuste em `src/learning-paths.js`.

Riscos:

- virar link solto;
- competir com o fluxo recomendado pelo diagnostico;
- expor a POC como conteudo generico.

Recomendacao: nao priorizar. Pode virar entrada secundaria depois que a entrada pelo `Meu Progresso` estiver clara.

### 5. Nova estrutura `learning_missions`

Descricao: aplicar o modelo planejado em `docs/supabase-learning-missions-schema-plan.sql`, com missoes, conteudos, atividades, tentativas e eventos.

Pros:

- modelo correto para produto real;
- separa catalogo, atividade, tentativa e evidencia;
- permite progresso por tentativa real;
- evita expor respostas sensiveis diretamente;
- sustenta historico, analytics e proxima missao.

Contras:

- exige schema, RLS, grants, seeds e revisao de seguranca;
- aumenta escopo;
- pede validacao cuidadosa antes de publicar.

Riscos:

- aplicar schema antes da revisao pedagogica;
- expor `expected_answer` ou `validation_rules`;
- atualizar progresso sem tentativa;
- criar RLS permissiva demais.

Recomendacao: caminho correto para a versao completa, mas nao para a primeira conexao publica da POC.

## Decisao recomendada

Para a primeira versao publica, a opcao mais segura e:

1. Manter `/missao` como pagina de pratica guiada.
2. Conectar a missao pelo `Meu Progresso`, no card "Proxima etapa".
3. Usar `learning_path_steps.content_url` apenas como URL de navegacao.
4. Popular `content_url` por seed/migration versionada, apos aprovacao explicita.
5. Nao alterar `user_learning_progress` como conclusao da missao.
6. Nao alterar `learning_recommendations.status` para `completed`.
7. Nao criar link solto na Home.
8. Nao prometer salvamento de tentativa/conclusao enquanto a POC nao persistir evidencia.

Essa decisao tem o menor risco porque o frontend ja conhece o campo `content_url`, o `Meu Progresso` ja e a tela de retomada do pos-diagnostico e a alteracao de dados pode ser pequena, revisavel e reversivel.

## Recomendacao explicita sobre `content_url`

Usar `content_url` nesta fase: sim, mas com limites.

Uso permitido:

- destino de navegacao do proximo passo;
- ponte entre `learning_path_steps` e a POC de missao;
- URL versionada e revisavel, preferencialmente via seed/migration.

Uso proibido:

- prova de conclusao;
- criterio para aumentar `progress_percent`;
- gatilho automatico para marcar passo, trilha, recomendacao ou missao como concluida;
- substituto de tentativa real.

Formato sugerido para SQL Essencial, sujeito a validacao dos slugs reais da POC:

- `sql-essencial-01-where` -> `missao.html?missao=filtros-where`;
- `sql-essencial-02-contagens` -> `missao.html?missao=contagens-nulos`;
- `sql-essencial-03-filtro-mais-agregacao` -> `missao.html?missao=filtro-antes-agregacao`.

Se a POC usar slugs diferentes, a seed deve seguir os slugs aceitos por `src/learning-mission-page.js`.

## Onde o usuario deve encontrar a missao

Entrada principal recomendada:

- `Meu Progresso` -> card "Proxima etapa" -> link do passo recomendado.

Entrada secundaria futura:

- resultado do diagnostico, somente depois que a geracao personalizada conseguir oferecer uma URL confiavel de missao recomendada;
- Home/Trilhas, somente como indicacao de "pratica guiada disponivel" e sem vender isso como fluxo principal.

Nao recomendado nesta fase:

- link fixo na navegacao global;
- CTA solto na Home;
- botao hardcoded no resultado para `/missao` sem mapeamento por lacuna;
- card visual novo que pareca salvar progresso antes de existir persistencia real de tentativa.

## Proposta de primeira versao

Escopo proposto apos aprovacao:

1. Criar uma seed/migration versionada pequena preenchendo `content_url` apenas para os passos de SQL Essencial que ja correspondem as tres missoes da POC.
2. Manter `status` e `progress_percent` inalterados.
3. Atualizar, se necessario, a microcopy do card em `Meu Progresso` para deixar claro que e "Praticar agora" ou "Comecar missao", sem mudar regra de progresso.
4. Validar anonimo, usuario comum e admin quando aplicavel.
5. Validar que abrir `/missao` nao grava conclusao nem altera Supabase.

Opcional, se houver ajuste minimo de codigo aprovado:

- em `src/learning-paths.js`, renderizar link apenas quando `step.content_url` existir, com label discreto como `Abrir pratica`, sem transformar todos os passos em CTAs.

## Proposta futura

A evolucao correta e aplicar, apos revisao explicita, uma estrutura propria de missoes:

- `learning_missions`;
- `learning_mission_contents`;
- `learning_mission_activities`;
- `learning_activity_attempts`;
- `learning_progress_events`;
- view publica ou RPC/Edge Function para atividades sem expor respostas sensiveis.

Nesse modelo:

- o diagnostico recomenda uma missao por `skill_code`, `recommendation_key`, area, nivel e score;
- a missao exibe conteudo curto e atividade;
- a tentativa e registrada;
- o feedback e associado a tentativa;
- o progresso so muda depois de evidencia real;
- `user_learning_progress` vira agregado, nao fonte primaria de verdade;
- `user_skill_progress` consolida evolucao por habilidade.

## Inspiracao externa aplicavel

Da referencia externa de plataforma de estudos de dados, faz sentido aproveitar agora:

- clareza de jornada: "diagnostico -> prioridade -> missao -> progresso";
- roadmap por nivel, mas sem abrir uma biblioteca generica logo apos o diagnostico;
- checklist curto de skills, usando `skill_code` como unidade estavel;
- pratica guiada como proximo passo;
- acompanhamento de progresso como retomada, nao como tela administrativa;
- explicacao de erros comuns dentro do feedback da missao.

Deixar para depois:

- metas de consistencia e streaks;
- simulados;
- IA de entrevista;
- trilhas longas completas;
- certificados;
- ranking ou gamificacao pesada;
- recomendacoes premium profundas antes de medir a primeira pratica guiada.

## Riscos

- Criar link publico sem contexto e reduzir a missao a uma pagina escondida.
- Usar `learning_path_steps` como prova de estudo.
- Atualizar `user_learning_progress` sem tentativa real.
- Marcar `learning_recommendations` como concluida sem evidencia.
- Expor resposta correta ou regra sensivel no frontend.
- Misturar a POC local com promessa de progresso persistente.
- Alterar banco em producao sem seed/migration versionada e revisada.
- Fazer o resultado do diagnostico depender de uma chamada assincrona que pode falhar.
- Criar uma nova UI antes de decidir o contrato de dados.

## Checklist de aceite

- `/missao` continua acessivel diretamente.
- `missao.html?missao=<slug>` abre a missao esperada.
- Diagnostico logado continua salvando `diagnostic_sessions` e `diagnostic_answers`.
- `learning_recommendations` continua guardando recomendacao ativa.
- `user_learning_progress` continua agregado/inicial, sem conclusao automatica.
- `Meu Progresso` mostra a missao como proxima etapa quando `content_url` existir.
- Abrir a missao nao marca progresso como concluido.
- Concluir a POC local nao altera Supabase enquanto nao houver persistencia aprovada.
- Home nao recebe CTA solto para `/missao`.
- Usuario anonimo nao recebe promessa de historico salvo.
- Nenhuma referencia a Desafios/Praticar aparece como frente ativa.
- Validacoes deterministicas passam: `git diff --check` e `node --check` nos JS alterados quando houver JS.
- Qualquer mudanca de banco futura tem aprovacao explicita.

## Fora de escopo

Esta rodada nao inclui:

- alterar UI;
- alterar CSS;
- alterar JavaScript;
- alterar Supabase;
- aplicar migration;
- executar seed;
- mudar RLS, policies, grants ou secrets;
- criar tabelas `learning_missions`;
- persistir tentativas da POC;
- alterar diagnostico real;
- alterar progresso real;
- fazer commit ou push.

## O que nao fazer

- Nao colocar `/missao` na navegacao global agora.
- Nao criar CTA solto na Home.
- Nao trocar o CTA principal da landing para a missao.
- Nao marcar passo como concluido por clique.
- Nao usar `content_url` como prova de estudo.
- Nao atualizar `user_learning_progress.progress_percent` ao abrir a missao.
- Nao alterar `learning_recommendations.status` para `completed` sem tentativa.
- Nao aplicar o schema futuro sem revisao de seguranca e autorizacao explicita.
- Nao prometer plano Pro, certificado, preco ou recurso nao implementado.

## Arquivos analisados

- `docs/pos-diagnostico-bancada-sql-poc.md`
- `docs/pos-diagnostico-validacao-sql-real.md`
- `docs/pos-diagnostico-missoes-layout-review.md`
- `docs/pos-diagnostico-missoes-sql-piloto-plan.md`
- `docs/pos-diagnostico-missoes-sql-piloto-ux-spec.md`
- `docs/supabase-learning-missions-schema-plan.sql`
- `docs/supabase-learning-foundation.sql`
- `docs/supabase-learning-seed-v2.sql`
- `docs/diagnostic-recommendations-plan.md`
- `docs/diagnostico-2-0-results-plan.md`
- `docs/supabase-schema.sql`
- `src/learning-mission-page.js`
- `src/sql-poc-engine.js`
- `src/personalized-learning-service.js`
- `src/progress-page.js`
- `src/learning-paths.js`
- `src/quiz.js`
- `src/recommendations.js`
- `src/diagnostic-funnel-service.js`
- `diagnostico.html`
- `meu-progresso.html`
- `missao.html`

## Validacoes feitas nesta analise

- `git status --short`
- `git branch --show-current`
- `git log --oneline -5`
- busca local com `rg "missao|missao|content_url|learning_path_steps|learning_recommendations|user_learning_progress|skill_code|recommendation_key" .`
- leitura dos documentos e arquivos listados acima
- HTTP publico somente leitura:
  - `https://trilhadedados.com.br/` -> `200`
  - `https://trilhadedados.com.br/diagnostico` -> `200`
  - `https://trilhadedados.com.br/meu-progresso` -> `200`
  - `https://trilhadedados.com.br/missao` -> `200`
- HTTP local somente leitura:
  - `http://127.0.0.1:4173/missao` -> `404` no servidor local atual, provavelmente sem rewrite de rota limpa
  - `http://127.0.0.1:4173/missao.html` -> `200`
- Supabase MCP somente leitura:
  - consulta de passos ativos em `learning_path_steps`;
  - confirmado `content_url = null` para todos os passos ativos retornados.
