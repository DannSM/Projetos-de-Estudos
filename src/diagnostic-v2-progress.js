(function initDiagnosticV2Progress(globalScope) {
  const service = globalScope.diagnosticV2Service;
  const catalog = globalScope.diagnosticV2Catalog;
  if (!service || !catalog) return;
  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function skillSummary(area) {
    const skills = area.skills || [];
    if (!skills.length) return "";
    const named = skills.filter((skill) => catalog.hasSkillName(skill.skill_code));
    const unnamedCount = skills.length - named.length;
    return `<details><summary>Competências observadas</summary><ul>${named.map((skill) =>
      `<li>${escapeHtml(catalog.skillName(skill.skill_code, area.area))} · ${Number(skill.correct) || 0}/${Number(skill.total) || 0} acertos observados</li>`).join("")}
      ${unnamedCount ? `<li>${unnamedCount} competência(s) ainda sem nome editorial nesta área.</li>` : ""}</ul></details>`;
  }
  async function renderForUser(user) {
    const dashboard = globalScope.document.querySelector(".progress-dashboard");
    const attempt = service.readAttempt();
    if (!dashboard || !service.isLocalPreview() || !user?.id) return;
    if (attempt && !attempt.owner_id && attempt.claim_token) {
      try { await service.claim(attempt, user.id); } catch (_) { /* Histórico próprio ainda pode ser consultado. */ }
    }
    try {
      const response = await service.myResults();
      if (await service.currentUserId() !== user.id) return;
      const results = (response?.results || []).filter((entry) =>
        entry?.result && Array.isArray(entry.result.areas));
      dashboard.querySelector(".diagnostic-v2-history")?.remove();
      if (!results.length) return;
      const section = globalScope.document.createElement("section");
      section.className = "progress-detail-card diagnostic-v2-history";
      section.setAttribute("aria-label", "Diagnóstico V2 por área");
      section.innerHTML = `<span class="progress-panel-label">Histórico · Diagnóstico V2</span>
        <p>Metodologia V2: desempenho e evidência por área. Os percentuais da avaliação anterior usam outra metodologia.</p>
        ${results.map((entry, index) => `<details class="diagnostic-v2-attempt" ${index === 0 ? "open" : ""}>
          <summary>Diagnóstico de ${escapeHtml(new Date(entry.completed_at).toLocaleDateString("pt-BR"))}</summary>
          <div class="diagnostic-v2-area-grid">${entry.result.areas.map((area) => `<article class="diagnostic-v2-area-card">
          <h3>${escapeHtml(area.area)}</h3>
          <p><strong>${escapeHtml(area.demonstrated_level || "Indeterminado")}</strong> · confiança ${escapeHtml(area.confidence_band || "baixa")}</p>
          <p>${Number(area.correct) || 0}/${Number(area.total) || 0} acertos observados${area.score_percent == null ? "" : ` · ${escapeHtml(area.score_percent)}%`}</p>
          <p>${area.evidence_sufficient ? "Evidência suficiente para esta leitura inicial." : "Evidência insuficiente para concluir domínio."}</p>
          ${catalog.advancedEvidenceText(area.advanced_evidence_status) ? `<p>${escapeHtml(catalog.advancedEvidenceText(area.advanced_evidence_status))}</p>` : ""}
          ${skillSummary(area)}
        </article>`).join("")}</div></details>`).join("")}`;
      dashboard.appendChild(section);
    } catch (_) {
      // A V1 permanece disponível quando a consulta V2 está indisponível.
    }
  }
  globalScope.diagnosticV2Progress = { renderForUser };
})(window);
