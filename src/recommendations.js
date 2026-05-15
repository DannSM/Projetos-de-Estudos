function getProfile(percent, scoreByArea) {
  const sqlScore = getAreaPercent(scoreByArea.SQL);
  const lowAreas = Object.values(scoreByArea).filter((score) => getAreaPercent(score) < 0.45).length;
  const highAreas = Object.values(scoreByArea).filter((score) => getAreaPercent(score) >= 0.75).length;

  if (percent < 0.4 || lowAreas >= 3) {
    return {
      name: "Iniciante em Dados",
      description: "Sua base ainda está em construção. O melhor caminho é fortalecer fundamentos antes de acelerar para análises mais complexas."
    };
  }

  if (sqlScore < 0.5) {
    return {
      name: "Aprendiz de SQL",
      description: "Você já tem noções importantes, mas SQL ainda limita sua autonomia. Reforçar consultas, contagens e JOINs vai destravar o resto da trilha."
    };
  }

  if (percent < 0.68 || highAreas < 2) {
    return {
      name: "Analista em Formação",
      description: "Você já entende parte do raciocínio de dados. Agora precisa conectar técnica, contexto e prática para ganhar consistência."
    };
  }

  if (percent < 0.86) {
    return {
      name: "Analista Intermediário",
      description: "Você tem boa leitura técnica e já pode praticar problemas mais próximos do trabalho real, com métricas, modelagem e investigação."
    };
  }

  return {
    name: "Pronto para Projetos Reais",
    description: "Você demonstrou maturidade para aplicar dados em cenários práticos. O foco agora é projeto completo, narrativa analítica e validação de hipóteses."
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
      let message = `Você mostrou boa segurança. Continue praticando ${guide.next} para transformar esse domínio em repertório aplicado.`;

      if (ratio < 0.45) {
        label = "Prioridade alta";
        statusClass = "status-low";
        message = `Reforce ${guide.next}. ${guide.why}`;
      } else if (ratio < 0.75) {
        label = "Em consolidação";
        statusClass = "status-medium";
        message = misses.length
          ? `Você está perto de consolidar. Revise ${misses.join(", ")} e faça exercícios curtos com explicação.`
          : `Você está no caminho certo. Faça mais prática guiada em ${guide.next}.`;
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
    ? `Revise ${uniqueConcepts.join(", ")}. Esses pontos apareceram como lacunas reais no seu diagnóstico.`
    : "Você não deixou lacunas no diagnóstico. Mantenha revisão espaçada e avance para casos completos.";

  return {
    priority: {
      title: `${priority.area}: comece por ${priorityGuide.track}`,
      text: `${priority.message} Esta é a área com maior ganho potencial agora, então ela deve vir antes de novos conteúdos avançados.`
    },
    cards: [
      {
        level: "Agora",
        title: "Primeiro foco",
        text: `Estude ${priorityGuide.next}. ${priorityGuide.why}`,
        next: `Filtre os desafios por ${mapAreaToChallenge(priority.area)}.`
      },
      {
        level: "Revisão",
        title: "Conceitos para revisar",
        text: reviewText,
        next: "Refaça os cards em que você errou antes de avançar."
      },
      {
        level: profile.name,
        title: "Trilha sugerida",
        text: getTrackSuggestion(profile.name, priority.area),
        next: "Depois faça um mini-projeto com SQL, KPI e uma conclusão de negócio."
      }
    ],
    plan: [
      `<strong>1. Base:</strong> faça 20 minutos de revisão em ${priorityGuide.next}.`,
      `<strong>2. Prática:</strong> resolva desafios de ${mapAreaToChallenge(priority.area)} e ${mapAreaToChallenge(secondPriority.area)}.`,
      "<strong>3. Aplicação:</strong> escolha uma base simples e responda 3 perguntas de negócio com números.",
      "<strong>4. Comunicação:</strong> escreva uma conclusão curta: o que mudou, onde mudou e qual ação você recomenda."
    ]
  };
}

function mapAreaToChallenge(area) {
  const map = {
    SQL: "SQL Básico ou SQL Intermediário",
    "Estatística": "Estatística",
    Excel: "Excel e BI",
    "Lógica de dados": "Raciocínio analítico",
    Indicadores: "Indicadores e KPIs"
  };

  return map[area] || "Todos";
}

function getTrackSuggestion(profileName, priorityArea) {
  const tracks = {
    "Iniciante em Dados": "Fundamentos de Dados -> SQL Essencial -> Indicadores básicos.",
    "Aprendiz de SQL": "SQL Essencial -> SQL Intermediário -> exercícios de contagem com JOIN.",
    "Analista em Formação": "SQL Intermediário -> Estatística para Dados -> Indicadores e KPIs.",
    "Analista Intermediário": "Projetos Práticos -> dashboard operacional -> validação de hipóteses.",
    "Pronto para Projetos Reais": "Projeto completo com problema de negócio, análise, visualização e recomendação final."
  };

  return `${tracks[profileName]} Como sua prioridade atual é ${priorityArea}, comece essa trilha por esse tema.`;
}
