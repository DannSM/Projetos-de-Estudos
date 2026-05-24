# Plano tecnico e visual do Diagnostico 2.0

## 1) Objetivo

Evoluir a experiencia do diagnostico para que o aluno entenda claramente o que aconteceu em cada etapa, veja progresso antes do resultado final e receba recomendacoes premium conectadas aos dados ja validados no Supabase.

Esta etapa e somente planejamento. Nao altera frontend, SQL, JS, HTML, CSS, migrations ou regras atuais do diagnostico.

## 2) Contexto validado

Base atual considerada para o MVP:

- `diagnostic_recommendations` possui 30 recomendacoes ativas.
- `question_bank` possui 80 perguntas ativas de diagnostico.
- 80/80 perguntas possuem `skill_code`.
- 80/80 perguntas possuem `diagnostic_weight`.
- 44/80 perguntas possuem `recommendation_key`.
- Nao ha `recommendation_key` orfa.
- Cobertura por area esta equilibrada para MVP:
  - Estatistica: 8/16
  - Excel: 8/16
  - Indicadores: 11/16
  - Logica de dados: 8/16
  - SQL: 9/16

## 3) Fluxo ideal do diagnostico

O Diagnostico 2.0 deve ser percebido como uma jornada em tres etapas, e nao como uma sequencia solta de perguntas.

### Etapa 1: Nivel Basico

Objetivo da etapa:

- Confirmar fundamentos essenciais.
- Identificar se o aluno tem base suficiente para interpretar dados, tabelas, indicadores e consultas simples.
- Gerar um primeiro retorno util sem encerrar a experiencia.

Ao concluir o Basico:

- Mostrar resultado parcial.
- Explicar que o diagnostico ainda nao acabou.
- Destacar primeiras areas fortes e primeiras areas de atencao.
- Sinalizar que o nivel Intermediario vai medir aplicacao pratica e conexao entre conceitos.
- Registrar evento `concluiu_basico`.

### Etapa 2: Nivel Intermediario

Objetivo da etapa:

- Medir aplicacao em cenarios mais proximos do trabalho real.
- Confirmar se os fundamentos aparecem em decisoes praticas.
- Detectar lacunas mais confiaveis por area e por habilidade.

Ao concluir o Intermediario:

- Mostrar novo resultado parcial, acumulado com Basico.
- Explicar se o desempenho subiu, estabilizou ou revelou lacunas.
- Atualizar areas fortes, areas de atencao e recomendacoes preliminares.
- Sinalizar que o nivel Avancado vai medir autonomia, raciocinio e tomada de decisao.
- Registrar evento `concluiu_intermediario`.

### Etapa 3: Nivel Avancado

Objetivo da etapa:

- Medir autonomia analitica.
- Avaliar raciocinio sob ambiguidade, prioridade e interpretacao de negocio.
- Fechar uma leitura final do perfil do aluno.

Ao concluir o Avancado:

- Mostrar resultado final.
- Consolidar pontuacao ponderada por area.
- Exibir areas fortes, areas de atencao e recomendacoes premium.
- Gerar resumo didatico do perfil.
- Registrar eventos `concluiu_avancado` e `gerou_resultado_final`.

## 4) O que muda na experiencia do usuario

Hoje o risco principal e o aluno responder perguntas em sequencia e so entender o valor do diagnostico no final. O Diagnostico 2.0 reduz esse intervalo de incerteza.

Mudancas esperadas:

- O aluno recebe feedback apos cada nivel.
- Cada etapa explica o que mediu e por que a proxima etapa existe.
- O progresso vira parte da narrativa, nao apenas uma barra visual.
- O resultado parcial aumenta retencao porque mostra valor antes do final.
- O resultado final parece uma conclusao natural, nao uma tela isolada.
- As recomendacoes premium ficam ligadas a erros, habilidades e lacunas reais.

## 5) Resultado parcial

O resultado parcial deve ser curto, util e orientado a continuidade. Ele nao deve parecer um resultado final incompleto.

### Conteudo minimo

- Titulo da etapa concluida.
- Frase de leitura do desempenho.
- Pontuacao parcial acumulada.
- Areas fortes identificadas ate agora.
- Areas de atencao identificadas ate agora.
- Uma ou mais recomendacoes preliminares quando houver `recommendation_key`.
- Explicacao da proxima etapa.
- CTA principal para continuar.

### Resultado parcial apos Basico

Hierarquia sugerida:

- Titulo: `Primeira leitura do seu diagnostico`
- Subtitulo: `Voce concluiu o nivel Basico. Agora ja da para identificar seus fundamentos mais consistentes e os pontos que merecem reforco.`
- Bloco de resumo:
  - `Fundamentos consolidados`
  - `Pontos que ainda podem limitar sua evolucao`
  - `O que sera medido no Intermediario`
- CTA: `Continuar para o Intermediario`

Texto sugerido:

> Ate aqui, o diagnostico avaliou fundamentos essenciais. O proximo nivel verifica se esses conceitos aparecem em situacoes mais proximas do trabalho real.

### Resultado parcial apos Intermediario

Hierarquia sugerida:

- Titulo: `Seu perfil esta ficando mais claro`
- Subtitulo: `Com Basico e Intermediario concluidos, o diagnostico ja consegue separar conhecimento conceitual de aplicacao pratica.`
- Bloco de resumo:
  - `Evolucao por area`
  - `Habilidades que se mantiveram fortes`
  - `Lacunas que apareceram em mais de uma etapa`
  - `O que sera medido no Avancado`
- CTA: `Ir para o Avancado`

Texto sugerido:

> Nesta etapa, o diagnostico observou como voce aplica conceitos em cenarios praticos. O nivel Avancado fecha a leitura avaliando autonomia, priorizacao e raciocinio analitico.

## 6) Resultado final

O resultado final deve funcionar como um mapa de estudo acionavel. Ele precisa explicar o desempenho, indicar prioridades e justificar recomendacoes.

### Conteudo minimo

- Titulo com leitura do perfil.
- Pontuacao geral ponderada.
- Nivel de prontidao ou faixa de maturidade.
- Areas fortes por `skill_code`.
- Areas de atencao por `skill_code`.
- Recomendacoes premium vindas de `diagnostic_recommendations`.
- Proximos passos priorizados.
- Resumo por nivel: Basico, Intermediario e Avancado.
- CTA para estudar, refazer futuramente ou acessar trilha recomendada.

### Logica de leitura

O resultado final deve combinar:

- Acertos e erros por pergunta.
- Peso de cada pergunta via `diagnostic_weight`.
- Agrupamento por habilidade via `skill_code`.
- Recomendacoes associadas via `recommendation_key`.
- Nivel da pergunta para diferenciar fundamento, aplicacao e autonomia.

## 7) Uso de `skill_code`, `diagnostic_weight` e `recommendation_key`

### `skill_code`

Usar `skill_code` como eixo principal para identificar habilidades fortes e habilidades de atencao.

Uso recomendado:

- Agrupar respostas por habilidade.
- Calcular desempenho ponderado por habilidade.
- Exibir cards de area forte quando o desempenho ponderado for alto.
- Exibir cards de atencao quando houver erro recorrente ou peso relevante.
- Evitar diagnostico generico por area ampla quando a habilidade especifica esta disponivel.

Exemplo de leitura:

- Area: SQL
- `skill_code`: filtros, agregacoes, joins ou interpretacao de consulta
- Mensagem: `Voce demonstrou boa leitura de consultas, mas ainda precisa reforcar criterios de agrupamento.`

### `diagnostic_weight`

Usar `diagnostic_weight` para dar mais importancia a perguntas que medem habilidades centrais.

Uso recomendado:

- Calcular pontuacao ponderada por etapa.
- Calcular pontuacao ponderada por `skill_code`.
- Priorizar lacunas de alto impacto.
- Evitar que varios erros leves escondam um acerto importante, ou que um erro critico pareca pequeno.

Formula conceitual:

```text
score_ponderado = soma(peso das respostas corretas) / soma(peso das perguntas respondidas)
```

### `recommendation_key`

Usar `recommendation_key` como ponte entre uma pergunta respondida e uma recomendacao premium.

Uso recomendado:

- Considerar apenas perguntas erradas ou parcialmente problematicas, se houver esse estado no futuro.
- Coletar `recommendation_key` das perguntas com baixo desempenho.
- Remover chaves duplicadas.
- Buscar recomendacoes ativas em `diagnostic_recommendations`.
- Ordenar por relevancia, prioridade e frequencia da lacuna.
- Exibir no maximo 3 a 5 recomendacoes por resultado para manter foco.

Cuidados:

- Nem toda pergunta precisa ter recomendacao.
- A ausencia de `recommendation_key` nao deve quebrar resultado.
- Recomendacoes devem ser explicadas como proximos passos, nao como punicao por erro.

## 8) Busca de recomendacoes em `diagnostic_recommendations`

Fluxo conceitual:

1. Ao fechar uma etapa, mapear perguntas respondidas.
2. Filtrar perguntas com erro.
3. Extrair `recommendation_key` preenchidas.
4. Remover duplicatas.
5. Consultar `diagnostic_recommendations` com:
   - `recommendation_key in (...)`
   - `is_active = true`
6. Ordenar pelas regras da propria camada premium, quando existirem.
7. Exibir recomendacoes conectadas ao contexto do resultado.

Exemplo conceitual de query futura:

```sql
select *
from diagnostic_recommendations
where is_active = true
  and recommendation_key = any(:recommendation_keys)
order by priority asc, display_order asc;
```

Observacao: esta query e apenas referencia de implementacao futura. Este documento nao cria nem altera SQL.

## 9) Registro de inicio, abandono e continuacao

O Diagnostico 2.0 deve medir funil por etapa para identificar onde a experiencia perde usuarios.

### Eventos obrigatorios

- `iniciou`
- `concluiu_basico`
- `concluiu_intermediario`
- `concluiu_avancado`
- `gerou_resultado_final`

### Metrica de diagnostico iniciado, mas nao finalizado

Definicao:

```text
diagnosticos_iniciados_nao_finalizados = iniciou - gerou_resultado_final
```

Essa metrica deve considerar uma janela de tempo. Exemplo: diagnosticos iniciados ha mais de 24 horas sem resultado final podem ser classificados como nao finalizados.

### Abandono por etapa

Metricas sugeridas:

```text
abandono_antes_basico = iniciou - concluiu_basico
abandono_apos_basico = concluiu_basico - concluiu_intermediario
abandono_apos_intermediario = concluiu_intermediario - concluiu_avancado
abandono_apos_avancado = concluiu_avancado - gerou_resultado_final
```

Leitura esperada:

- Se ha abandono antes de concluir Basico, revisar tempo de entrada, primeira pergunta e friccao inicial.
- Se ha abandono apos Basico, melhorar clareza do primeiro resultado parcial e CTA.
- Se ha abandono apos Intermediario, revisar fadiga, quantidade de perguntas e valor percebido.
- Se ha abandono apos Avancado, revisar geracao de resultado, performance ou clareza da transicao final.

### Continuidade

O diagnostico deve permitir retomada quando possivel.

Dados conceituais para salvar no futuro:

- Identificador da sessao de diagnostico.
- Usuario, quando autenticado.
- Etapa atual.
- Perguntas ja respondidas.
- Timestamp do ultimo progresso.
- Resultado parcial calculado.
- Estado do funil mais recente.

## 10) Estrutura visual dos cards de resultado

O visual deve ser premium, didatico e especifico para aprendizagem em dados. Evitar cards genericos que apenas mostram porcentagens.

### Card de resumo da etapa

Conteudo:

- Nome da etapa concluida.
- Pontuacao ponderada.
- Status curto: `Base consistente`, `Em evolucao`, `Precisa de reforco` ou equivalente.
- Texto de uma frase explicando a leitura.

Visual:

- Card principal com maior largura.
- Indicador de progresso por nivel.
- Uso moderado de cor funcional:
  - sucesso para pontos fortes.
  - alerta para atencao.
  - azul/ciano para progresso e continuidade.

### Card de area forte

Conteudo:

- Area.
- `skill_code` traduzido para linguagem humana.
- Evidencia: nivel ou tipo de pergunta em que o aluno foi bem.
- Mensagem curta de reforco.

Texto sugerido:

> Voce mostrou consistencia em leitura de indicadores e interpretacao de contexto. Isso ajuda a transformar numeros em decisoes.

### Card de area de atencao

Conteudo:

- Area.
- Habilidade afetada.
- Impacto pratico da lacuna.
- Acao recomendada.

Texto sugerido:

> Esta lacuna pode dificultar analises mais completas, principalmente quando voce precisa comparar grupos, periodos ou criterios.

### Card de recomendacao premium

Conteudo:

- Titulo da recomendacao.
- Motivo pelo qual apareceu.
- Proximo passo pratico.
- CTA para trilha, aula, desafio ou conteudo premium.

Visual:

- Diferenciar de area forte e area de atencao.
- Nao parecer anuncio solto.
- Mostrar vinculo com o diagnostico: `Recomendado porque voce teve dificuldade em...`

### Card de progresso por nivel

Conteudo:

- Basico: concluido e leitura curta.
- Intermediario: concluido ou proximo.
- Avancado: concluido ou proximo.

Uso:

- Nos resultados parciais, mostra caminho restante.
- No resultado final, mostra retrospectiva da jornada.

## 11) Textos e hierarquia visual

### Principios de texto

- Explicar o que foi medido.
- Evitar tom punitivo.
- Traduzir habilidade tecnica para impacto pratico.
- Separar diagnostico de recomendacao.
- Usar frases curtas e acionaveis.

### Hierarquia sugerida

1. Titulo interpretativo.
2. Subtitulo explicando a etapa.
3. Pontuacao e progresso.
4. Leitura por areas e habilidades.
5. Recomendacoes premium.
6. Proxima acao.

### Exemplos de titulos

- `Primeira leitura do seu diagnostico`
- `Seu perfil esta ficando mais claro`
- `Seu mapa de evolucao em dados`
- `Pontos fortes para aproveitar agora`
- `Habilidades que merecem reforco`
- `Recomendacoes para sua proxima etapa`

### Exemplos de microcopy

- `Este resultado ainda e parcial. As proximas etapas refinam a leitura do seu perfil.`
- `A recomendacao abaixo apareceu por causa das habilidades avaliadas nas perguntas que voce respondeu.`
- `Sua pontuacao considera o peso de cada pergunta, nao apenas a quantidade de acertos.`
- `Continue para obter uma leitura mais precisa das suas prioridades de estudo.`

## 12) Layout responsivo

### Desktop

Layout sugerido:

- Coluna principal com resultado e recomendacoes.
- Coluna lateral com progresso por nivel, resumo de pontuacao e proximos passos.
- Cards em grid de 2 colunas para areas fortes e atencao.
- Recomendacoes premium com destaque abaixo da leitura principal.

### Tablet

Layout sugerido:

- Resultado principal em largura total.
- Cards em grid de 2 colunas quando houver espaco.
- Coluna lateral vira bloco abaixo do resumo.
- CTA fixo somente se nao cobrir conteudo.

### Mobile

Layout sugerido:

- Fluxo em uma coluna.
- Pontuacao e status logo apos o titulo.
- Cards empilhados.
- CTA visivel apos o resumo e repetido ao final quando necessario.
- Evitar tabelas largas; preferir listas compactas.

Cuidados:

- Nenhum texto deve depender de hover.
- Cards precisam manter leitura confortavel em telas pequenas.
- Evitar excesso de metricas simultaneas no mobile.
- Recomendacoes devem aparecer depois da explicacao do motivo.

## 13) Plano de implementacao em fases

### Fase 1: Modelagem de experiencia

- Definir estados de tela: inicio, em andamento, parcial Basico, parcial Intermediario e final.
- Definir textos finais de cada etapa.
- Definir regras de exibicao para areas fortes, areas de atencao e recomendacoes.
- Validar como o resultado atual sera preservado durante a transicao.

### Fase 2: Calculo de resultado

- Criar funcao de agregacao por etapa.
- Calcular score ponderado com `diagnostic_weight`.
- Agrupar desempenho por `skill_code`.
- Coletar `recommendation_key` a partir das perguntas com baixo desempenho.
- Garantir fallback quando nao houver recomendacao associada.

### Fase 3: Recomendacoes premium

- Integrar busca em `diagnostic_recommendations`.
- Definir ordenacao e limite de exibicao.
- Conectar recomendacao ao motivo.
- Testar ausencia, duplicidade e recomendacoes inativas.

### Fase 4: Analytics de funil

- Registrar `iniciou`.
- Registrar conclusao de cada nivel.
- Registrar geracao de resultado final.
- Criar leitura de abandono por etapa.
- Definir janela para diagnostico iniciado e nao finalizado.

### Fase 5: Interface e responsividade

- Implementar resultados parciais.
- Implementar resultado final premium.
- Adaptar layout desktop, tablet e mobile.
- Validar acessibilidade basica, hierarquia visual e clareza dos CTAs.

### Fase 6: Validacao e rollout

- Comparar resultado antigo e novo em cenarios controlados.
- Testar com usuarios anonimos e autenticados, se ambos existirem.
- Monitorar abandono por etapa.
- Ajustar textos, quantidade de cards e limite de recomendacoes.
- Liberar primeiro como MVP controlado.

## 14) Riscos e cuidados

### Nao quebrar o diagnostico atual

Cuidados:

- Preservar o fluxo atual ate o novo estar validado.
- Implementar o 2.0 por tras de feature flag ou caminho controlado, se possivel.
- Manter fallback para perguntas sem `recommendation_key`.
- Nao assumir que toda habilidade tera recomendacao premium.
- Nao alterar contratos existentes sem mapear dependencias.

### Risco de excesso de informacao

O resultado pode ficar pesado se tentar mostrar tudo de uma vez.

Mitigacao:

- Limitar recomendacoes principais.
- Priorizar habilidades de maior impacto.
- Separar leitura, evidencia e acao.
- Usar texto curto nos cards e detalhes apenas quando necessario.

### Risco de recomendacao parecer generica

Mitigacao:

- Sempre mostrar o motivo da recomendacao.
- Relacionar com `skill_code`, area ou pergunta.
- Evitar textos como `estude mais SQL` sem contexto.

### Risco de abandono aumentar

Mitigacao:

- Resultado parcial deve reforcar valor e continuidade.
- CTA deve explicar a proxima etapa.
- Manter tempo total previsivel.
- Monitorar abandono apos cada resultado parcial.

### Risco de leitura injusta

Mitigacao:

- Usar `diagnostic_weight` para reduzir distorcoes.
- Evitar conclusoes fortes com poucas perguntas respondidas.
- Diferenciar resultado parcial de resultado final.
- Indicar que a leitura fica mais precisa a cada etapa.

## 15) Decisoes recomendadas para o MVP

- Exibir resultado parcial apos Basico e Intermediario.
- Exibir resultado final somente apos Avancado.
- Usar `skill_code` como base de areas fortes e areas de atencao.
- Usar `diagnostic_weight` em todas as pontuacoes relevantes.
- Usar `recommendation_key` apenas como gatilho de recomendacoes premium.
- Limitar recomendacoes premium a 3 no resultado parcial e 5 no final.
- Medir funil com os cinco eventos obrigatorios.
- Tratar diagnostico iniciado e nao finalizado com janela minima de 24 horas.
- Manter o diagnostico atual intacto ate a implementacao do 2.0 estar validada.
