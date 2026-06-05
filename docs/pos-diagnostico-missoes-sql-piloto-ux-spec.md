# Especificacao UX/funcional - missoes pos-diagnostico SQL piloto

## 1) Objetivo da experiencia

Depois de concluir o diagnostico, o usuario deve receber uma `Missao recomendada`: uma proxima acao concreta, curta, personalizada e mensuravel, conectada a lacuna prioritaria detectada.

A experiencia deve:

- parecer uma bancada de pratica, nao um curso generico;
- usar 70% a 80% pratica e 20% a 30% teoria;
- explicar rapidamente a lacuna e por que ela importa;
- exigir uma atividade real antes de qualquer conclusao;
- gerar feedback imediato;
- atualizar progresso apenas com evidencia;
- sugerir a proxima missao de forma clara.

A missao nao pode ser concluida por clique vazio. O usuario precisa responder, tentar, submeter, corrigir ou registrar uma atividade verificavel.

## 2) Jornada principal

Fluxo desejado:

1. O usuario conclui o diagnostico.
2. O resultado identifica uma lacuna prioritaria por area, habilidade e impacto.
3. A plataforma recomenda uma missao curta de SQL Essencial.
4. A tela explica por que aquela missao apareceu.
5. O usuario le um conteudo curto, suficiente para tentar.
6. O usuario faz uma atividade pratica.
7. O usuario envia uma tentativa.
8. A plataforma mostra feedback imediato: correto, parcial ou incorreto.
9. A tentativa e o feedback sao registrados quando o usuario esta logado.
10. O progresso e atualizado com base na evidencia.
11. A proxima missao e liberada ou sugerida.

O usuario nao deve precisar escolher entre varias trilhas logo apos o diagnostico. A tela deve responder: "comece por aqui".

## 3) Estados da missao

`not_started` / nao iniciada:

- Missao recomendada existe, mas o usuario ainda nao abriu ou iniciou.
- CTA principal: `Comece aqui`.

`in_progress` / em andamento:

- Missao aberta.
- Conteudo e atividade estao disponiveis.
- Ainda nao ha tentativa enviada.

`content_viewed` / conteudo visto:

- Usuario visualizou o bloco curto de conceito/exemplo.
- Este estado nao conclui nada sozinho.

`activity_started` / atividade iniciada:

- Usuario interagiu com opcoes, campo de query, checklist ou decisao.
- Ainda nao ha evidencia suficiente para progresso.

`attempt_submitted` / tentativa enviada:

- Usuario enviou resposta.
- Deve gerar registro em `learning_activity_attempts` quando logado.
- Deve gerar evento `activity_submitted`.

`correct` / correta:

- Tentativa atende a regra da atividade.
- Feedback reforca o raciocinio certo.
- Pode liberar proxima atividade ou concluir a missao se todos os criterios forem cumpridos.

`partial` / parcial:

- Tentativa tem parte correta, mas falta criterio importante.
- Feedback deve indicar exatamente o que ajustar.
- Pode permitir nova tentativa.

`incorrect` / incorreta:

- Tentativa nao atende ao objetivo.
- Feedback deve explicar o erro principal sem tom punitivo.
- Deve permitir nova tentativa se `max_attempts` permitir.

`completed` / concluida:

- Missao possui tentativa registrada e feedback gerado.
- Progresso pode ser atualizado.
- CTA: `Continuar para proxima missao` e link para `Meu Progresso`.

`locked` / bloqueada:

- Missao futura aparece como proxima, mas depende de concluir missao anterior ou salvar progresso.
- Deve mostrar requisito objetivo, nao bloquear de forma vaga.

`next_available` / proxima missao disponivel:

- Existe missao seguinte sugerida.
- CTA deve deixar claro o ganho: continuar praticando a proxima lacuna.

## 4) Usuario anonimo

Comportamento recomendado:

- Pode visualizar uma previa da missao recomendada.
- Pode entender a lacuna, a promessa e o tipo de pratica.
- Deve sentir valor antes de cadastro.
- Pode ver conteudo curto e, se o MVP permitir, responder 1 atividade anonima.

Decisao pendente para o MVP:

- Opcao A: permitir uma tentativa anonima limitada.
- Opcao B: permitir visualizacao anonima, mas exigir login para enviar tentativa.

Se tentativa anonima for permitida:

- Mostrar aviso: `Voce pode praticar agora, mas seu historico nao fica garantido sem login.`
- Registrar `anonymous_user_id` quando disponivel.
- Nao prometer historico permanente.
- CTA apos feedback: `Salvar meu progresso`.

Se tentativa anonima nao for permitida:

- Mostrar preview da atividade.
- CTA: `Entrar para responder e salvar progresso`.
- A missao continua util como demonstracao de valor, mas progresso persistente exige login.

## 5) Usuario logado

Comportamento esperado:

- Missao recomendada fica vinculada ao diagnostico por `source_attempt_id`.
- Tentativa e salva em `learning_activity_attempts`.
- Evento e salvo em `learning_progress_events`.
- Feedback fica associado a tentativa.
- Progresso por habilidade e missao e refletido no `Meu Progresso`.
- Proxima missao pode ser liberada com base na evidencia.

O usuario logado deve perceber continuidade: diagnostico, missao e progresso falam da mesma lacuna.

## 6) Layout desktop

Estrutura visual:

- Header padrao do projeto.
- Bloco superior com lacuna diagnosticada e `Missao recomendada`.
- Area principal tipo bancada de pratica.
- Conteudo curto acima ou na coluna esquerda.
- Atividade pratica como foco principal da tela.
- Lateral com progresso, tempo estimado, criterio de conclusao e proximas missoes.
- Estado final com CTA para proxima missao e `Meu Progresso`.
- Footer padrao do projeto.

Hierarquia sugerida:

1. `Missao recomendada`.
2. Motivo: `Esta missao apareceu porque...`.
3. Objetivo em uma frase.
4. Conteudo curto.
5. Atividade.
6. Feedback.
7. Progresso e proxima missao.

A atividade deve ser o centro da tela. A lateral serve para orientacao, nao para competir com a pratica.

## 7) Layout mobile

Estrutura:

- Uma coluna.
- Primeiro: missao e motivo.
- Depois: conteudo curto.
- Depois: atividade.
- Depois: feedback.
- Depois: progresso e proxima missao.
- Footer padrao, sem corte.

Regras mobile:

- Sem barra horizontal.
- Sem texto dependendo de hover.
- Sem cards vazios.
- CTA principal sempre claro.
- Opcoes de resposta com area de toque confortavel.
- Feedback visivel logo apos o envio.
- Progresso abaixo da pratica, sem esconder o feedback.

## 8) Componentes necessarios

`MissionHero`:

- Mostra titulo da missao, objetivo, tempo estimado e CTA principal.
- Deve usar linguagem de acao: `Comece aqui`.

`DiagnosticGapCard`:

- Explica a lacuna detectada.
- Mostra area, habilidade e motivo da recomendacao.

`MissionContentBlock`:

- Exibe explicacao curta, exemplo minimo ou dica.
- Nao deve parecer aula longa.

`MissionActivityCard`:

- Container principal da pratica.
- Mostra enunciado, contexto e controle de envio.

`AnswerOptions`:

- Usado para multipla escolha ou decisao.
- Deve deixar claro qual opcao foi selecionada antes do envio.

`QueryInput` simples:

- Campo textual para completar ou corrigir query curta.
- Nao e editor SQL avancado nesta fase.

`FeedbackCard`:

- Mostra resultado: correto, parcial ou incorreto.
- Explica o raciocinio e o proximo ajuste.

`MissionProgressCard`:

- Mostra status da missao, tentativas, tempo estimado e criterio de conclusao.

`NextMissionCard`:

- Mostra proxima missao disponivel ou bloqueada.
- Explica o requisito para liberar quando bloqueada.

`LoginSaveProgressCTA`:

- Convida anonimo a entrar/criar conta.
- Deve aparecer apos valor percebido, especialmente depois do feedback ou antes de salvar tentativa.

## 9) Microcopy

Textos principais:

- `Missao recomendada`
- `Comece aqui`
- `Por que esta missao?`
- `Pratique agora`
- `Enviar resposta`
- `Ver feedback`
- `Continuar para proxima missao`
- `Salvar meu progresso`
- `Ver no Meu Progresso`

Mensagem de motivo:

```text
Esta missao apareceu porque o diagnostico encontrou uma lacuna em filtros com SQL. Corrigir isso ajuda voce a responder perguntas de negocio sem trazer dados fora do recorte.
```

Mensagem de acerto:

```text
Correto. Voce aplicou o raciocinio certo para esta lacuna. Seu progresso foi registrado.
```

Mensagem parcial:

```text
Quase la. Voce acertou parte do raciocinio, mas ainda falta ajustar um criterio importante antes de concluir a missao.
```

Mensagem de erro:

```text
Ainda nao. Esta resposta deixa passar um problema comum. Veja o feedback, ajuste o raciocinio e tente novamente.
```

Mensagem para anonimo:

```text
Voce pode ver como a missao funciona agora. Para salvar tentativa, feedback e progresso, entre ou crie uma conta.
```

Mensagem de conclusao:

```text
Missao concluida com evidencia registrada. Agora voce pode seguir para a proxima missao ou revisar seu progresso.
```

## 10) Regras de conclusao

Regras obrigatorias:

- Missao nao conclui por clique.
- Conteudo visto nao conclui missao.
- Botao de continuar nao conclui missao sozinho.
- Precisa existir tentativa registrada.
- Precisa existir feedback gerado.
- Progresso so atualiza apos evidencia.
- `user_learning_progress` nao deve ser atualizado sozinho.
- `learning_recommendations.status` nao deve mudar para concluido sem evidencia.

Evidencias aceitas:

- resposta objetiva enviada;
- query curta submetida;
- checklist verificavel submetido;
- atividade textual enviada;
- tentativa classificada como `correct`, `partial` ou `incorrect`;
- evento de progresso associado a tentativa.

Conclusao recomendada para MVP:

- 1 atividade correta conclui uma missao simples;
- atividade parcial nao conclui, mas registra progresso de tentativa;
- atividade incorreta nao conclui, mas registra tentativa e feedback.

## 11) Contrato de dados esperado

Leituras futuras do frontend:

- `learning_missions`: buscar missao recomendada, status, objetivo, skill e tempo.
- `learning_mission_contents`: buscar conteudo curto ativo da missao.
- `vw_learning_mission_activities_public`: buscar atividade sem expor resposta ou regra sensivel.
- `learning_activity_attempts`: buscar tentativas do usuario logado e salvar novas tentativas.
- `learning_progress_events`: registrar eventos e alimentar linha do tempo.

Escritas futuras esperadas:

- `learning_activity_attempts`: ao enviar resposta.
- `learning_progress_events`: ao iniciar missao, ver conteudo, enviar atividade, ver feedback, concluir missao e abrir proxima missao.
- `user_learning_progress`: somente depois de tentativa/evidencia valida.
- `user_skill_progress`: consolidado posterior por habilidade, nao evento visual imediato sem base.

Seguranca de dados:

- O frontend nao deve ler `expected_answer`.
- O frontend nao deve ler `validation_rules` sensiveis.
- O frontend deve consumir a view publica ou endpoint controlado.
- Validacao sensivel deve migrar para RPC/Edge Function quando necessario.

## 12) Criterios de aceite visual

Checklist:

- Desktop alinhado ao padrao da Home, Diagnostico e Meu Progresso.
- Mobile sem quebra visual.
- Header padronizado.
- Footer padronizado e sem corte.
- CTA principal claro.
- Atividade e o centro da tela.
- Conteudo curto nao vira aula longa.
- Feedback fica visivel apos envio.
- Progresso aparece depois de evidencia.
- Nenhum card vazio.
- Nenhum estado `Nenhum passo ativo encontrado`.
- Nenhuma conclusao por clique simples.
- Nenhuma resposta correta exposta no frontend.
- Sem links quebrados.
- Sem barra horizontal no mobile.
- Sem referencias a Desafios/Praticar como frente ativa.

## 13) Fora de escopo desta fase

Esta fase nao inclui:

- implementar UI;
- alterar JavaScript;
- aplicar schema no Supabase;
- executar migration;
- alterar RLS/policies aplicadas;
- criar editor SQL avancado;
- criar IA tutora;
- criar paywall;
- criar certificado;
- expandir todas as trilhas;
- publicar seeds reais;
- criar painel admin de curadoria;
- refatorar Meu Progresso agora.

## 14) Sequencia recomendada apos aprovacao

1. Revisar esta especificacao.
2. Definir se anonimo pode enviar uma tentativa limitada.
3. Definir se validacao inicial sera local simples, RPC ou Edge Function.
4. Implementar vertical slice com dados controlados.
5. Validar desktop e mobile.
6. Integrar persistencia somente apos schema aprovado e aplicado.
