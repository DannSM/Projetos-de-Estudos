# Plano de missoes pos-diagnostico - piloto SQL Essencial

## 1) Decisao de produto

A experiencia pos-diagnostico do Data Skill Map nao deve abrir um curso generico. O proximo passo correto e uma acao concreta, curta, personalizada e mensuravel, conectada a uma lacuna real do diagnostico.

Modelo aprovado:

- missao ou microdesafio;
- explicacao curta;
- pratica ativa;
- feedback imediato;
- tentativa registrada;
- progresso atualizado por evidencia;
- proxima missao liberada com base em atividade realizada, nao em clique simples.

Este documento e planejamento tecnico e pedagogico. Ele nao aplica SQL, nao altera Supabase, nao muda RLS, nao altera policies, nao cria migrations aplicadas e nao modifica secrets ou configuracoes sensiveis.

Contexto consultado: a planilha `Data_Skill_Map_Acompanhamento_Melhorias_v9.xlsx` foi inspecionada a partir do caminho informado pelo usuario, especialmente as abas "Pos-Diagnostico" e "Fontes IA Pos-Diag". A consolidacao da planilha reforca que o produto deve vender correcao personalizada de lacunas, evolucao visivel e direcao continua, nao uma biblioteca de conteudo.

O plano abaixo segue a decisao consolidada informada pelo produto, a planilha de acompanhamento e os documentos ja versionados, principalmente:

- `docs/diagnostico-2-0-results-plan.md`;
- `docs/diagnostic-recommendations-plan.md`;
- `docs/supabase-learning-foundation.sql`;
- `docs/supabase-learning-seed-v2.sql`;
- `docs/design-system.md`.

## 2) O que descartar da branch anterior

A branch `codex/trilhas-avanco-e-diagnostico-anti-repeticao` nao deve ser mergeada na `main` e deve ser tratada apenas como rascunho tecnico.

Descartar como produto:

- `trilha.html` como tela de curso com passos concluiveis;
- botoes de concluir aula, pratica ou projeto sem atividade real;
- estado final `Nenhum passo ativo encontrado`;
- progresso baseado apenas em clique;
- `learning_path_steps` como prova de estudo;
- qualquer fluxo em que o usuario conclui uma etapa sem responder, praticar, submeter ou receber feedback.

O problema central nao e visual. Mesmo que header, footer, mobile e cards sejam corrigidos, a experiencia continuaria fraca se a conclusao puder acontecer sem evidencia de aprendizagem.

## 3) O que reaproveitar

Reaproveitar:

- autenticacao via Supabase Auth;
- modal de login/cadastro;
- Supabase client existente;
- estrutura de diagnostico com `diagnostic_sessions` e `diagnostic_answers`;
- recomendacoes persistentes em `learning_recommendations`;
- consolidado de habilidades em `user_skill_progress`;
- calculo de prioridade pos-diagnostico ja iniciado em `src/personalized-learning-service.js`;
- design system, header, footer, navegacao e padroes visuais das paginas estaveis;
- `learning_paths` como agrupador/catalogo de areas de estudo;
- `learning_path_steps` apenas como estrutura legada ou agrupadora, nunca como evidencia de conclusao.

## 4) Novo fluxo pos-diagnostico

Fluxo ideal:

1. Resultado do diagnostico: mostra leitura curta, score, areas fortes e lacunas.
2. Lacuna prioritaria: seleciona a habilidade com maior impacto usando `skill_code`, erros, peso e recomendacao.
3. Missao recomendada: abre uma acao curta, preferencialmente de 5 a 10 minutos, podendo chegar a 15 minutos quando a pratica exigir.
4. Conteudo curto: explica o conceito em linguagem pratica e com exemplo minimo.
5. Pratica ativa: o usuario responde, corrige uma query, escolhe a interpretacao correta ou submete uma atividade.
6. Feedback imediato: classifica como acertou, parcial ou errou, com explicacao e proximo ajuste.
7. Progresso: registra tentativa, resultado, feedback, timestamp e origem diagnostica.
8. Proxima missao: libera a proxima acao conforme evidencia salva.

Nome recomendado para a experiencia: `Missao recomendada` ou `Comece aqui`. Evitar `curso`, `aula longa` e linguagem de biblioteca de conteudo.

## 5) Modelo pedagogico

Sequencia recomendada:

- Conceito: uma ideia por missao, com exemplo curto.
- Pratica: tarefa objetiva e verificavel.
- Decisao: pergunta de negocio que exige interpretar o resultado.
- Projeto: somente quando a habilidade exigir integracao e entrega mais aberta.

Proporcao recomendada pela planilha: 20% a 30% teoria e 70% a 80% pratica. No MVP, projeto nao deve ser a primeira entrega. A prioridade e provar que uma missao pequena consegue gerar valor real depois do diagnostico.

## 6) Regra de conclusao

Uma missao nunca deve ser concluida por clique simples.

Conclusao valida exige ao menos um destes sinais:

- tentativa enviada;
- resposta objetiva selecionada;
- query validada por regra;
- checklist verificavel preenchido;
- atividade submetida;
- feedback exibido e registrado.

Todo encerramento deve salvar:

- `user_id` quando autenticado;
- `anonymous_user_id` quando aplicavel;
- `source_attempt_id` do diagnostico;
- `mission_id`;
- `activity_id`;
- resposta do usuario;
- resultado (`correct`, `partial`, `incorrect` ou equivalente);
- feedback entregue;
- timestamp;
- metadados de origem e versao da atividade.

## 7) Schema proposto, sem aplicar

As tabelas atuais nao sao suficientes para uma experiencia real de estudo. Elas sustentam diagnostico, recomendacao e progresso agregado, mas nao registram conteudo de missao, atividade avaliavel, tentativa e eventos de progresso.

### `learning_missions`

Finalidade: unidade principal de estudo pos-diagnostico. Representa uma missao curta e personalizada, ligada a uma lacuna.

Campos principais:

- `id`;
- `slug`;
- `title`;
- `description`;
- `skill_area`;
- `skill_code`;
- `level`;
- `estimated_minutes`;
- `status`;
- `display_order`;
- `metadata`;
- `created_at`;
- `updated_at`.

Relacao com tabelas atuais:

- complementa `learning_paths`;
- pode ter referencia opcional a `learning_paths.id` no futuro;
- conecta com `diagnostic_recommendations` por `skill_code` e `recommendation_key`;
- nao substitui `diagnostic_sessions` nem `diagnostic_answers`.

RLS sugerida:

- `anon` e `authenticated` podem ler missoes `active`;
- escrita apenas admin via `admin_users` / `admin_is_authorized`;
- nenhuma escrita publica de catalogo.

Uso no frontend:

- buscar a missao recomendada apos o diagnostico;
- renderizar titulo, contexto da lacuna, duracao e estado;
- listar proximas missoes bloqueadas/liberadas.

Impacto no Meu Progresso:

- vira a unidade exibida como "missao em andamento" ou "missao concluida";
- progresso nao deve ser inferido por existencia da missao, mas por tentativas/eventos.

### `learning_mission_contents`

Finalidade: blocos curtos de conteudo dentro da missao.

Campos principais:

- `id`;
- `mission_id`;
- `content_type`;
- `title`;
- `body`;
- `example_payload`;
- `display_order`;
- `status`;
- `metadata`;
- `created_at`;
- `updated_at`.

Relacao com tabelas atuais:

- pertence a `learning_missions`;
- substitui descricoes longas e genericas de `learning_path_steps` para a experiencia ativa.

RLS sugerida:

- leitura publica apenas quando conteudo e missao estiverem `active`;
- escrita apenas admin.

Uso no frontend:

- renderizar explicacao curta;
- mostrar exemplo, tabela simulada, dica ou contexto da pratica;
- controlar ordem dos blocos.

Impacto no Meu Progresso:

- pode alimentar historico de conteudo visto, mas nao deve concluir missao sozinho.

### `learning_mission_activities`

Finalidade: atividades avaliaveis da missao.

Campos principais:

- `id`;
- `mission_id`;
- `activity_type`;
- `prompt`;
- `dataset_context`;
- `options`;
- `expected_answer`;
- `validation_rules`;
- `feedback_correct`;
- `feedback_partial`;
- `feedback_incorrect`;
- `max_attempts`;
- `display_order`;
- `status`;
- `metadata`;
- `created_at`;
- `updated_at`.

Relacao com tabelas atuais:

- pertence a `learning_missions`;
- mapeia `skill_code` e `recommendation_key`;
- gera tentativas em `learning_activity_attempts`.

RLS sugerida:

- leitura publica de atividades ativas;
- escrita apenas admin;
- cuidado com `expected_answer`: no MVP pode ser exposto para atividade objetiva simples, mas o caminho melhor para query/validacao mais sensivel e RPC ou Edge Function em fase posterior.

Uso no frontend:

- renderizar alternativas, campo de resposta, query curta, checklist ou decisao;
- validar localmente atividades simples;
- enviar tentativa antes de atualizar progresso.

Impacto no Meu Progresso:

- define quais evidencias contam para missao concluida.

### `learning_activity_attempts`

Finalidade: registrar evidencia real de estudo.

Campos principais:

- `id`;
- `user_id`;
- `anonymous_user_id`;
- `mission_id`;
- `activity_id`;
- `attempt_number`;
- `answer_payload`;
- `result_status`;
- `is_correct`;
- `score_percent`;
- `feedback`;
- `source_attempt_id`;
- `created_at`;
- `metadata`.

Relacao com tabelas atuais:

- usa `source_attempt_id` de `diagnostic_sessions`;
- complementa `user_learning_progress`;
- alimenta `user_skill_progress`;
- pode atualizar ou justificar `learning_recommendations.status`.

RLS sugerida:

- usuario autenticado insere e le apenas suas tentativas;
- admin le tudo;
- anonimo pode inserir tentativa apenas se o produto permitir pratica anonima, mas sem historico permanente garantido;
- updates devem ser restritos ou evitados; preferir tentativas imutaveis.

Uso no frontend:

- salvar cada tentativa enviada;
- exibir feedback com base no resultado salvo;
- impedir conclusao sem tentativa.

Impacto no Meu Progresso:

- fonte principal para missao concluida, acerto na primeira tentativa e historico recente.

### `learning_progress_events`

Finalidade: log de eventos de aprendizagem para progresso, auditoria e metricas.

Campos principais:

- `id`;
- `user_id`;
- `anonymous_user_id`;
- `event_type`;
- `mission_id`;
- `activity_id`;
- `attempt_id`;
- `source_attempt_id`;
- `occurred_at`;
- `metadata`.

Relacao com tabelas atuais:

- complementa `diagnostic_funnel_events`;
- complementa `user_learning_progress`;
- permite medir retorno e abandono pos-diagnostico.

RLS sugerida:

- usuario autenticado insere eventos proprios;
- usuario le eventos proprios quando necessario;
- admin le tudo;
- anonimo pode inserir eventos limitados, se houver missao anonima.

Uso no frontend:

- registrar `mission_started`;
- registrar `content_viewed`;
- registrar `activity_submitted`;
- registrar `feedback_viewed`;
- registrar `mission_completed`;
- registrar `next_mission_opened`.

Impacto no Meu Progresso:

- sustenta linha do tempo, ultima atividade e metricas como retorno D7.

## 8) Como fica `learning_path_steps` e `user_learning_progress`

`learning_path_steps`:

- fica como legado/catalogo/agrupador;
- nao deve ser usado como prova de estudo;
- pode apontar para uma colecao de missoes no futuro, mas nao deve concluir progresso sozinho.

`user_learning_progress`:

- pode continuar como tabela agregada de progresso;
- deve ser atualizado somente depois de tentativa/evento valido;
- metadata deve guardar `mission_id`, `activity_attempt_id`, `completion_rule` e `source_attempt_id`;
- nao deve ser escrito por um botao generico de concluir.

## 9) MVP piloto SQL Essencial

Area: SQL Essencial.

Lacunas piloto:

1. `sql.filtering.where_logic`
   - Missao: filtrar exatamente o recorte pedido.
   - Atividade 1: escolher o `WHERE` correto para uma pergunta de negocio.
   - Atividade 2: corrigir uma query com filtro amplo ou invertido.

2. `sql.aggregation.counting`
   - Missao: contar registros considerando nulos.
   - Atividade 1: decidir entre `COUNT(*)`, `COUNT(coluna)` e contagem distinta simples.
   - Atividade 2: interpretar por que dois totais diferem.

3. `sql.filtering.where_logic` + agregacao simples
   - Missao: filtrar antes de resumir.
   - Atividade 1: montar consulta curta com filtro e contagem.
   - Atividade 2: escolher a conclusao sustentada pela consulta.

Alternativa de escopo se a revisao de produto preferir SQL Intermediario: usar lacunas de JOINs, `GROUP BY`/`HAVING` e agregacoes, porque a planilha destaca esses temas como comuns e demonstraveis. A recomendacao inicial permanece SQL Essencial para reduzir risco do primeiro vertical slice.

Feedback MVP:

- `correct`: reforca o raciocinio e libera proxima atividade/missao.
- `partial`: mostra o que esta certo e pede ajuste especifico.
- `incorrect`: explica o erro principal e permite nova tentativa.

Metricas:

- tentativa enviada;
- missao concluida;
- acerto na primeira tentativa;
- quantidade de tentativas ate conclusao;
- retorno D7;
- abertura do Meu Progresso apos concluir missao.

Regra freemium recomendada:

- gratuito: diagnostico, prioridade principal e 1 ou 2 atividades para sentir valor;
- premium: continuidade, historico longitudinal, trilha completa, revisoes recorrentes e feedback mais profundo;
- nao bloquear o primeiro avanco antes de o usuario perceber valor.

## 10) UX desejada

A tela deve parecer uma bancada de pratica, nao um curso generico.

Desktop:

- header e footer iguais ao padrao atual;
- coluna principal com missao ativa;
- topo com motivo da recomendacao: "Esta missao apareceu porque...";
- CTA primario com linguagem de proxima acao, como `Comece aqui`;
- bloco curto de conceito;
- bloco de pratica ativa;
- feedback logo apos envio;
- lateral com lacuna diagnosticada, progresso e proximas missoes;
- CTA final para proxima missao ou Meu Progresso.

Mobile:

- uma coluna;
- missao e motivo aparecem primeiro;
- conteudo curto vem antes da pratica;
- feedback aparece imediatamente apos a tentativa;
- progresso e proximas missoes aparecem abaixo;
- nenhum elemento depende de hover;
- footer nao pode ficar cortado.

Estados:

- em andamento: conteudo + atividade + botao `Enviar resposta`;
- bloqueado: mostra requisito concreto, por exemplo "envie a atividade anterior";
- concluido: mostra resposta enviada, feedback e aprendizado registrado;
- final da missao: resumo do que foi praticado e proxima acao;
- final do piloto: resumo de missoes concluidas, lacunas trabalhadas e CTA para Meu Progresso.

## 11) Integracao com Meu Progresso

Meu Progresso deve exibir:

- proxima missao recomendada;
- missoes em andamento;
- missoes concluidas por evidencia;
- tentativas recentes;
- habilidade relacionada;
- status da lacuna: em revisao, praticada, consolidando.

Fonte preferencial:

- `learning_activity_attempts` para evidencia;
- `learning_progress_events` para linha do tempo;
- `user_skill_progress` para consolidado por area/habilidade;
- `learning_recommendations` para recomendacao ativa;
- `user_learning_progress` apenas como agregado, nao como fonte primaria de evidencia.

## 12) Bug de anti-repeticao da branch anterior

Na branch anterior, o erro `ReferenceError: recentQuestionKeys is not defined` aconteceu porque a funcao de selecao de perguntas usava `recentQuestionKeys` e `recentQuestionSignatures` dentro de `buildBalancedDiagnosticSets`, mas esses nomes nao estavam declarados no escopo da funcao nem recebidos na desestruturacao de parametros.

Regra para esta branch:

- nao portar esse bug;
- se a anti-repeticao remota for portada, fazer em commit separado;
- validar diagnostico anonimo;
- validar diagnostico logado;
- rodar `node --check` nos JS alterados;
- rodar `git diff --check`;
- confirmar que ausencia de historico remoto cai para fallback local.

## 13) Plano de implementacao por fases

Fase 0: documentacao e decisao

- criar este plano;
- nao implementar experiencia completa;
- nao aplicar SQL.

Fase 1: bugfix isolado do diagnostico, se aprovado

- corrigir anti-repeticao sem misturar com missoes;
- validar logado e anonimo;
- manter commit separado.

Fase 2: schema proposto, sem aplicar

- transformar esta proposta em SQL revisavel;
- revisar RLS com cuidado;
- aprovar antes de executar no Supabase.

Fase 3: vertical slice local/controlado

- criar servico frontend de missoes;
- criar UI de bancada de pratica;
- usar conteudo piloto de SQL Essencial;
- impedir conclusao sem tentativa.

Fase 4: persistencia real

- apos aprovacao, aplicar schema;
- gravar tentativas e eventos;
- atualizar agregados de progresso;
- refletir em Meu Progresso.

Fase 5: validacao e rollout

- desktop e mobile;
- anonimo, usuario comum e admin quando aplicavel;
- console sem erros relevantes;
- metricas de tentativa, conclusao, primeira tentativa e D7.

## 14) Riscos

- expor resposta correta no frontend antes de existir validacao server-side;
- atualizar `user_learning_progress` sem tentativa real;
- misturar tela antiga de trilha com nova tela de missao;
- RLS permitir leitura/escrita indevida em tentativas;
- MVP crescer demais antes de provar SQL Essencial;
- Meu Progresso virar painel de cliques em vez de evidencias;
- ausencia da planilha no repo causar divergencia entre documentacao versionada e acompanhamento externo.

## 15) Proximos passos recomendados

1. Revisar e aprovar este plano.
2. Decidir se o bug de anti-repeticao sera corrigido antes do schema.
3. Criar proposta SQL revisavel, ainda sem aplicar.
4. Definir textos e atividades exatas das 6 atividades do piloto SQL.
5. Implementar vertical slice somente apos aprovacao explicita.
