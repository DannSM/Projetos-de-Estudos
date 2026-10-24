(function initDiagnosticV2Catalog(globalScope) {
  const destinations = Object.freeze({
    "sql.filtering.where_logic": {
      href: "praticas-sql.html?pratica=sql-essencial-filtros-where",
      label: "Praticar filtros com WHERE", type: "Prática"
    }
  });
  const guidance = Object.freeze({
    collect_more_evidence: "Há poucas evidências nesta área. Retome os fundamentos e faça um novo diagnóstico quando houver mais conteúdo disponível.",
    review_fundamentals: "Revise os fundamentos desta área antes de avançar.",
    study_intermediate: "Consolide os conceitos intermediários com exemplos e exercícios.",
    deepen_advanced: "Continue praticando em situações mais complexas. O nível avançado ainda é provisório."
  });

  function resolve(areaResult) {
    if (areaResult?.recommendation_code === "collect_more_evidence") return null;
    const gap = (areaResult?.skills || []).find((skill) =>
      Number(skill.total) > Number(skill.correct) && destinations[skill.skill_code]);
    return gap ? { ...destinations[gap.skill_code], skillCode: gap.skill_code } : null;
  }
  function describe(code) { return guidance[code] || "Continue estudando esta área."; }
  const api = { resolve, describe };
  globalScope.diagnosticV2Catalog = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
