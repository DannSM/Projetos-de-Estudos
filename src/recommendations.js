function getProfile(percent, scoreByArea) {
  const sqlScore = getAreaPercent(scoreByArea.SQL);
  const lowAreas = Object.values(scoreByArea).filter((score) => getAreaPercent(score) < 0.45).length;
  const highAreas = Object.values(scoreByArea).filter((score) => getAreaPercent(score) >= 0.75).length;

  if (percent < 0.4 || lowAreas >= 3) {
    return {
      name: "Iniciante em Dados",
      description: "Sua base ainda esta em construcao. O melhor caminho e fortalecer fundamentos antes de acelerar para analises mais complexas."
    };
  }

  if (sqlScore < 0.5) {
    return {
      name: "Aprendiz de SQL",
      description: "Voce ja tem nocoes importantes, mas SQL ainda limita sua autonomia. Reforcar consultas, contagens e JOINs vai destravar o resto da trilha."
    };
  }

  if (percent < 0.68 || highAreas < 2) {
    return {
      name: "Analista em Formacao",
      description: "Voce ja entende parte do raciocinio de dados. Agora precisa conectar tecnica, contexto e pratica para ganhar consistencia."
    };
  }

  if (percent < 0.86) {
    return {
      name: "Analista Intermediario",
      description: "Voce tem boa leitura tecnica e ja pode praticar problemas mais proximos do trabalho real, com metricas, modelagem e investigacao."
    };
  }

  return {
    name: "Pronto para Projetos Reais",
    description: "Voce demonstrou maturidade para aplicar dados em cenarios praticos. O foco agora e projeto completo, narrativa analitica e validacao de hipoteses."
  };
}

function getAreaPercent(score) {
  return score.total ? score.correct / score.total : 0;
}

function buildAreaInsights(scoreByArea) {
  return Object.entries(scoreByArea)
    .filter(([, score]) => score.total > 0)
    .map(([area, score]) => {
      const ratio = getAreaPercent(score);
      const percent = Math.round(ratio * 100);
      const misses = [...new Set(score.misses)];
      const guide = areaGuides[area];
      let label = "Ponto forte";
      let statusClass = "status-strong";
      let message = `Voce mostrou boa seguranca. Continue praticando ${guide.next} para transformar esse dominio em repertorio aplicado.`;

      if (ratio < 0.45) {
        label = "Prioridade alta";
        statusClass = "status-low";
        message = `Reforce ${guide.next}. ${guide.why}`;
      } else if (ratio < 0.75) {
        label = "Em consolidacao";
        statusClass = "status-medium";
        message = misses.length
          ? `Voce esta perto de consolidar. Revise ${misses.join(", ")} e faca exercicios curtos com explicacao.`
          : `Voce esta no caminho certo. Faca mais pratica guiada em ${guide.next}.`;
      }

      return { area, correct: score.correct, total: score.total, percent, misses, label, statusClass, message };
    })
    .sort((a, b) => b.percent - a.percent);
}

function buildRecommendations(scoreByArea, profile, insights) {
  const priority = [...insights].reverse()[0];
  const secondPriority = [...insights].reverse()[1] || priority;
  const priorityGuide = areaGuides[priority.area];
  const missedConcepts = Object.values(scoreByArea).flatMap((score) => score.misses);
  const uniqueConcepts = [...new Set(missedConcepts)];
  const reviewText = uniqueConcepts.length
    ? `Revise ${uniqueConcepts.join(", ")}. Esses pontos apareceram como lacunas reais no seu diagnostico.`
    : "Voce nao deixou lacunas no diagnostico. Mantenha revisao espacada e avance para casos completos.";

  return {
    priority: {
      title: `${priority.area}: comece por ${priorityGuide.track}`,
      text: `${priority.message} Esta e a area com maior ganho potencial agora, entao ela deve vir antes de novos conteudos avancados.`
    },
    cards: [
      {
        level: "Agora",
        title: "Primeiro foco",
        text: `Estude ${priorityGuide.next}. ${priorityGuide.why}`,
        next: `Filtre os desafios por ${mapAreaToChallenge(priority.area)}.`
      },
      {
        level: "Revisao",
        title: "Conceitos para revisar",
        text: reviewText,
        next: "Refaca os cards em que voce errou antes de avancar."
      },
      {
        level: profile.name,
        title: "Trilha sugerida",
        text: getTrackSuggestion(profile.name, priority.area),
        next: "Depois faca um mini-projeto com SQL, KPI e uma conclusao de negocio."
      }
    ],
    plan: [
      `<strong>1. Base:</strong> faca 20 minutos de revisao em ${priorityGuide.next}.`,
      `<strong>2. Pratica:</strong> resolva desafios de ${mapAreaToChallenge(priority.area)} e ${mapAreaToChallenge(secondPriority.area)}.`,
      `<strong>3. Aplicacao:</strong> escolha uma base simples e responda 3 perguntas de negocio com numeros.`,
      `<strong>4. Comunicacao:</strong> escreva uma conclusao curta: o que mudou, onde mudou e qual acao voce recomenda.`
    ]
  };
}

function mapAreaToChallenge(area) {
  const map = {
    SQL: "SQL Basico ou SQL Intermediario",
    Estatistica: "Estatistica",
    "Excel/BI": "Indicadores e KPIs",
    "Logica de dados": "Raciocinio analitico",
    Indicadores: "Indicadores e KPIs"
  };

  return map[area] || "Todos";
}

function getTrackSuggestion(profileName, priorityArea) {
  const tracks = {
    "Iniciante em Dados": "Fundamentos de Dados -> SQL Essencial -> Indicadores basicos.",
    "Aprendiz de SQL": "SQL Essencial -> SQL Intermediario -> exercicios de contagem com JOIN.",
    "Analista em Formacao": "SQL Intermediario -> Estatistica para Dados -> Indicadores e KPIs.",
    "Analista Intermediario": "Projetos Praticos -> dashboard operacional -> validacao de hipoteses.",
    "Pronto para Projetos Reais": "Projeto completo com problema de negocio, analise, visualizacao e recomendacao final."
  };

  return `${tracks[profileName]} Como sua prioridade atual e ${priorityArea}, comece essa trilha por esse tema.`;
}
