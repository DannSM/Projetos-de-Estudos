(function initKpiGuidedContent(globalScope) {
  const TRACK_SLUG = "indicadores-e-kpis";
  const TRACK_TITLE = "Indicadores e KPIs";

  const GUIDED_ACTIVITIES = Object.freeze({
    "indicadores-definicao-consistente": {
      id: null,
      slug: "indicadores-definicao-consistente",
      activityType: "practice",
      title: "Definição consistente",
      subtitle: "Prática guiada de definição de indicadores",
      trackSlug: TRACK_SLUG,
      trackTitle: TRACK_TITLE,
      stepKey: "indicadores-02-definicao-consistente",
      level: "Básico",
      estimatedMinutes: 15,
      objective: "Definir numerador, denominador, população e período antes de comparar um indicador.",
      contentVersion: 1,
      responseSchema: "checkpoint_sequence",
      completionProgressPercent: 50,
      scenario: {
        title: "Duas equipes, critérios distintos",
        context: "As equipes Alfa e Beta publicaram taxas de satisfação para o mesmo período. As bases registram avaliações positivas, respostas válidas e total de atendimentos, mas os percentuais divulgados foram calculados com critérios diferentes."
      },
      indicatorTitle: "Compare somente métricas com a mesma definição",
      indicatorDescription: "Use os volumes apresentados para decidir quais registros representam o evento medido e a população comparável em cada equipe.",
      indicatorData: [
        { label: "Alfa", value: "92 positivas / 115 válidas" },
        { label: "Beta", value: "96 positivas / 120 válidas" },
        { label: "Atendimentos Alfa", value: "150" },
        { label: "Atendimentos Beta", value: "160", tone: "alert" }
      ],
      checkpoints: [
        {
          id: "metodologia",
          title: "Defina a população elegível",
          question: "Qual fórmula torna as duas equipes comparáveis?",
          options: [
            { id: "A", text: "Avaliações positivas ÷ respostas válidas do mesmo período, para as duas equipes." },
            { id: "B", text: "Avaliações positivas ÷ todos os atendimentos, mesmo quando nem todos responderam." },
            { id: "C", text: "Respostas válidas ÷ avaliações positivas, porque o maior número deve ser o numerador." },
            { id: "D", text: "Usar uma fórmula diferente para cada equipe, desde que o percentual seja publicado." }
          ],
          correctOption: "A",
          correctTitle: "Definição alinhada",
          incorrectTitle: "Revise numerador e população elegível",
          correctFeedback: "A taxa de satisfação usa avaliações positivas como numerador e respostas válidas como denominador. Aplicar a mesma regra e o mesmo período torna a comparação defensável.",
          incorrectFeedback: "Volte à definição do indicador: identifique o evento medido e quem realmente teve oportunidade de responder antes de escolher o denominador.",
          attention: "O denominador deve representar quem realmente podia contribuir para a medida calculada."
        },
        {
          id: "calculo",
          title: "Corrija as taxas",
          question: "Quais são as taxas comparáveis de Alfa e Beta?",
          options: [
            { id: "A", text: "Alfa 61,3% e Beta 60%, usando todos os atendimentos." },
            { id: "B", text: "Alfa 80% e Beta 80%, usando respostas válidas." },
            { id: "C", text: "Alfa 92% e Beta 96%, usando apenas o numerador." },
            { id: "D", text: "Alfa 78,3% e Beta 80%, misturando respostas e atendimentos." }
          ],
          correctOption: "B",
          correctTitle: "Cálculo consistente",
          incorrectTitle: "Use o mesmo denominador conceitual",
          correctFeedback: "Alfa: 92 ÷ 115 = 80%. Beta: 96 ÷ 120 = 80%. O valor de 60% da Beta vem da fórmula inconsistente 96 ÷ 160.",
          incorrectFeedback: "Refaça cada taxa com a definição escolhida no checkpoint anterior e confira se numerador, população elegível e período são comparáveis.",
          attention: "Uma taxa matematicamente calculada ainda pode estar conceitualmente errada se usar a população inadequada."
        },
        {
          id: "interpretacao",
          title: "Tome uma decisão coerente",
          question: "Qual interpretação deve orientar o relatório?",
          options: [
            { id: "A", text: "Beta está 20 p.p. abaixo de Alfa e deve copiar o processo da outra equipe." },
            { id: "B", text: "As equipes empataram em 80%; o relatório deve padronizar fórmula, população elegível e período antes de buscar diferenças de desempenho." },
            { id: "C", text: "Alfa é melhor porque teve menos atendimentos no período." },
            { id: "D", text: "Não é necessário documentar a metodologia quando o resultado parece plausível." }
          ],
          correctOption: "B",
          correctTitle: "Comparação corrigida",
          incorrectTitle: "A diferença observada foi criada pela metodologia",
          correctFeedback: "Com a definição padronizada, Alfa e Beta têm 80%. Não há evidência de diferença de satisfação nesse recorte; o primeiro ajuste é documentar e aplicar a mesma metodologia.",
          incorrectFeedback: "Antes de concluir que uma equipe foi melhor, verifique se a diferença permanece quando as duas taxas seguem exatamente a mesma definição.",
          attention: "Decisões baseadas em métricas inconsistentes podem premiar ou penalizar equipes sem evidência real."
        }
      ],
      thinkingSteps: [
        ["O que a taxa pretende medir?", "Separe o evento contado da população que poderia produzi-lo."],
        ["As bases são comparáveis?", "Confira definição, elegibilidade e período antes de calcular."],
        ["A diferença é de desempenho ou método?", "Questione se a comparação mudaria com uma regra única."]
      ],
      conclusion: "Você definiu um indicador comparável ao alinhar numerador, denominador, população elegível e período de referência.",
      completionTitle: "Definição do indicador validada",
      nextAction: {
        href: "pratica-guiada.html?atividade=indicadores-decomposicao-kpi",
        label: "Continuar para decomposição",
        title: "Etapa 3 — Decomposição de KPI",
        description: "A próxima prática mostra como pesos e volumes alteram um resultado consolidado."
      }
    },
    "indicadores-decomposicao-kpi": {
      id: null,
      slug: "indicadores-decomposicao-kpi",
      activityType: "practice",
      title: "Decomposição de KPI",
      subtitle: "Prática guiada de análise ponderada",
      trackSlug: TRACK_SLUG,
      trackTitle: TRACK_TITLE,
      stepKey: "indicadores-03-decomposicao-kpi",
      level: "Intermediário",
      estimatedMinutes: 15,
      objective: "Decompor um indicador consolidado, considerar pesos e separar contribuição observada de causa comprovada.",
      contentVersion: 1,
      responseSchema: "checkpoint_sequence",
      completionProgressPercent: 75,
      scenario: {
        title: "Dois períodos, diferentes composições",
        context: "Chat e App registraram avaliações positivas e respostas válidas em dois períodos. A liderança quer comparar o resultado total e entender como a composição dos canais mudou."
      },
      indicatorTitle: "Compare os dois períodos por canal e no total",
      indicatorDescription: "Os canais têm volumes distintos em cada período. Considere os quatro pares de avaliações positivas e respostas válidas ao analisar o consolidado.",
      indicatorData: [
        { label: "Chat anterior", value: "80 / 100 = 80%" },
        { label: "Chat atual", value: "144 / 200 = 72%", tone: "alert" },
        { label: "App anterior", value: "90 / 100 = 90%" },
        { label: "App atual", value: "95 / 100 = 95%", tone: "success" }
      ],
      checkpoints: [
        {
          id: "consolidado",
          title: "Calcule o resultado ponderado",
          question: "Qual cálculo representa corretamente o consolidado dos dois períodos?",
          options: [
            { id: "A", text: "Anterior 85%; atual 83,5%, pela média simples de 72% e 95%." },
            { id: "B", text: "Anterior 85% (170/200); atual 79,67% (239/300); variação de aproximadamente -5,33 p.p." },
            { id: "C", text: "Anterior 170%; atual 239%, somando os percentuais e os volumes." },
            { id: "D", text: "Anterior 80%; atual 72%, porque somente o maior canal deve entrar no indicador." }
          ],
          correctOption: "B",
          correctTitle: "Consolidado ponderado corretamente",
          incorrectTitle: "Não use a média simples das taxas",
          correctFeedback: "Some primeiro os numeradores e os denominadores: 170/200 = 85% e 239/300 ≈ 79,67%. A queda é de aproximadamente 5,33 pontos percentuais.",
          incorrectFeedback: "Evite tratar taxas de grupos com volumes diferentes como se tivessem o mesmo peso. Procure um cálculo que preserve a contribuição de cada grupo.",
          attention: "Taxas de grupos com tamanhos diferentes devem ser combinadas pelos seus numeradores e denominadores."
        },
        {
          id: "contribuicao",
          title: "Localize a contribuição",
          question: "Qual leitura explica melhor a variação observada?",
          options: [
            { id: "A", text: "O App explica a queda, porque sua taxa é maior no período atual." },
            { id: "B", text: "O Chat caiu de 80% para 72% e passou de 50% para 66,7% das respostas; essa piora com maior peso contribuiu para a queda consolidada." },
            { id: "C", text: "Os dois canais pioraram na mesma proporção." },
            { id: "D", text: "A composição não importa quando existe uma taxa consolidada." }
          ],
          correctOption: "B",
          correctTitle: "Peso e desempenho conectados",
          incorrectTitle: "Observe taxa e representatividade juntas",
          correctFeedback: "O Chat perdeu 8 p.p. e dobrou seu volume, passando a representar dois terços das respostas atuais. O App melhorou 5 p.p., mas manteve 100 respostas.",
          incorrectFeedback: "Compare, para cada canal, duas dimensões ao mesmo tempo: mudança de desempenho e participação no volume total.",
          attention: "Contribuir para a variação do consolidado não prova a causa operacional da piora no canal."
        },
        {
          id: "investigacao",
          title: "Defina a investigação",
          question: "Qual próximo passo é mais defensável?",
          options: [
            { id: "A", text: "Concluir que o novo sistema do Chat causou a queda, mesmo sem dados sobre a mudança." },
            { id: "B", text: "Investigar o Chat por período, motivo e perfil de atendimento, verificando volume e estabilidade da amostra antes de atribuir uma causa." },
            { id: "C", text: "Ignorar o Chat e analisar apenas o App, porque ele melhorou." },
            { id: "D", text: "Tratar qualquer oscilação como ruído sem avaliar o tamanho da amostra." }
          ],
          correctOption: "B",
          correctTitle: "Sinal priorizado sem inventar causalidade",
          incorrectTitle: "Separe evidência de hipótese",
          correctFeedback: "Os dados localizam um sinal relevante no Chat, mas não identificam sua causa. Segmentar e verificar estabilidade, períodos e motivos transforma o sinal em uma investigação testável.",
          incorrectFeedback: "Separe o que os números observam do que ainda é hipótese. O próximo passo deve buscar evidências capazes de explicar o sinal.",
          attention: "Uma diferença observada orienta hipóteses; causalidade exige evidência adicional."
        }
      ],
      thinkingSteps: [
        ["Os grupos têm o mesmo peso?", "Observe os volumes antes de escolher como consolidar."],
        ["Desempenho e participação mudaram?", "Compare as duas dimensões sem assumir qual canal explica o total."],
        ["O dado observa ou explica?", "Diferencie sinal medido de hipótese causal."]
      ],
      conclusion: "Você calculou um KPI ponderado, identificou a contribuição do Chat e formulou uma investigação sem confundir associação com causalidade.",
      completionTitle: "Decomposição do KPI concluída",
      nextAction: {
        href: "pratica-guiada.html?atividade=indicadores-funil-conversao",
        label: "Continuar para o funil",
        title: "Etapa 4 — Funil de conversão",
        description: "A etapa final usa taxas condicionais para priorizar uma investigação de negócio."
      }
    },
    "indicadores-funil-conversao": {
      id: null,
      slug: "indicadores-funil-conversao",
      activityType: "practice",
      title: "Funil de conversão",
      subtitle: "Indicadores e KPIs",
      trackSlug: TRACK_SLUG,
      trackTitle: TRACK_TITLE,
      stepKey: "indicadores-04-funil-conversao",
      level: "Intermediário",
      estimatedMinutes: 15,
      objective: "Calcular taxas condicionais de um funil e recomendar uma investigação com base em perdas absolutas e proporcionais.",
      contentVersion: 1,
      responseSchema: "checkpoint_sequence",
      completionProgressPercent: 100,
      scenario: {
        title: "Onde investigar o funil do comércio eletrônico?",
        context: "Uma loja virtual registrou os volumes alcançados em cinco etapas, da visita à compra concluída, e quer decidir onde aprofundar a análise."
      },
      indicatorTitle: "Observe os volumes ao longo do funil",
      indicatorDescription: "Os valores mostram quantas pessoas chegaram a cada etapa. Compare as transições e diferencie a leitura entre etapas da visão do funil completo.",
      indicatorData: [
        { label: "Visitantes", value: "10.000" },
        { label: "Visualizaram produtos", value: "4.000" },
        { label: "Adicionaram ao carrinho", value: "1.000", tone: "alert" },
        { label: "Checkout → compra", value: "600 → 300" }
      ],
      checkpoints: [
        {
          id: "taxas",
          title: "Calcule as taxas condicionais",
          question: "Qual conjunto de taxas usa os denominadores corretos?",
          options: [
            { id: "A", text: "40%, 25%, 60%, 50% e conversão total de 3%." },
            { id: "B", text: "40%, 10%, 6%, 3% e conversão total de 50%." },
            { id: "C", text: "4%, 25%, 60%, 30% e conversão total de 3%." },
            { id: "D", text: "40%, 40%, 10%, 6% e conversão total de 300%." }
          ],
          correctOption: "A",
          correctTitle: "Denominadores aplicados corretamente",
          incorrectTitle: "Use a etapa imediatamente anterior",
          correctFeedback: "As taxas são 4.000/10.000 = 40%, 1.000/4.000 = 25%, 600/1.000 = 60%, 300/600 = 50% e 300/10.000 = 3% no total.",
          incorrectFeedback: "Para cada percentual, identifique qual grupo realmente podia avançar para a etapa seguinte. Depois trate a conversão total como uma comparação distinta.",
          attention: "Usar visitantes como denominador em todas as etapas mistura conversão condicional com conversão acumulada."
        },
        {
          id: "perdas",
          title: "Compare perdas diferentes",
          question: "Qual leitura distingue corretamente perda absoluta e proporcional?",
          options: [
            { id: "A", text: "Visitantes → visualização perde mais pessoas (6.000), enquanto visualização → carrinho tem a maior perda proporcional entre etapas (75%)." },
            { id: "B", text: "Checkout → compra tem a maior perda absoluta e proporcional." },
            { id: "C", text: "Visualização → carrinho perde 3.000 pessoas e apenas 25% proporcionalmente." },
            { id: "D", text: "Perda absoluta e proporcional sempre apontam para a mesma etapa." }
          ],
          correctOption: "A",
          correctTitle: "Volume e proporção separados",
          incorrectTitle: "Compare quantidade perdida e taxa de perda",
          correctFeedback: "A primeira transição perde 6.000 visitantes em volume. Já visualização → carrinho retém 25% e perde 75%, a maior perda proporcional do funil.",
          incorrectFeedback: "Calcule separadamente quantas pessoas saíram e qual fração não avançou; os dois critérios podem levar a leituras diferentes.",
          attention: "A maior perda absoluta não é automaticamente o melhor ponto de intervenção; alcance, intenção e custo também importam."
        },
        {
          id: "recomendacao",
          title: "Priorize uma investigação",
          question: "Qual recomendação é mais defensável com os dados disponíveis?",
          options: [
            { id: "A", text: "Remover o checkout, porque metade dos usuários não conclui a compra." },
            { id: "B", text: "Investigar primeiro visualização → carrinho, cuja conversão é 25%, testando hipóteses sobre oferta e experiência sem afirmar causalidade ou impacto antes do experimento." },
            { id: "C", text: "Aumentar mídia imediatamente, pois mais visitantes garantem mais compras na mesma proporção." },
            { id: "D", text: "Concluir que o preço causou a perda, mesmo sem dados de preço ou comportamento." }
          ],
          correctOption: "B",
          correctTitle: "Prioridade justificada com ressalvas",
          incorrectTitle: "Recomende uma investigação, não uma causa",
          correctFeedback: "A passagem de visualização para carrinho tem a menor taxa condicional, 25%, e merece investigação. A ação correta é formular hipóteses e testar; o funil sozinho não prova causa nem impacto futuro.",
          incorrectFeedback: "Escolha uma ação compatível com o que o funil observa: priorizar uma investigação é diferente de afirmar causa ou prometer impacto.",
          attention: "Prioridade analítica combina taxa, volume e contexto de negócio; a melhoria precisa ser confirmada por teste."
        }
      ],
      thinkingSteps: [
        ["Quem podia avançar nesta transição?", "Associe cada etapa ao grupo exposto à decisão seguinte."],
        ["Você compara volume ou proporção?", "Defina o critério antes de apontar a maior perda."],
        ["O funil observa ou explica?", "Use o padrão como ponto de partida para uma hipótese testável."]
      ],
      conclusion: "Você concluiu a jornada de Indicadores e KPIs: interpretou meta e resultado, definiu métricas comparáveis, decompôs um consolidado e priorizou uma investigação de funil.",
      completionTitle: "Trilha Indicadores e KPIs concluída",
      competencies: [
        "Interpretação de resultado, meta e desvio",
        "Definição consistente de indicadores",
        "Cálculo ponderado e decomposição de KPI",
        "Análise de funil e recomendação com ressalvas"
      ],
      nextAction: {
        href: "meu-progresso.html",
        label: "Ver competências em Meu Progresso",
        title: "Jornada concluída",
        description: "Confira os 100% da trilha e as competências demonstradas no seu histórico."
      }
    }
  });

  const api = Object.freeze({ TRACK_SLUG, TRACK_TITLE, GUIDED_ACTIVITIES });
  globalScope.KpiGuidedContent = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
