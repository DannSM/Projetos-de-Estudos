(function initDiagnosticV2Page(globalScope) {
  const service = globalScope.diagnosticV2Service;
  const catalog = globalScope.diagnosticV2Catalog;
  const mount = globalScope.document?.getElementById("quizMount");
  const resultMount = globalScope.document?.getElementById("resultMount");
  const resultSection = globalScope.document?.getElementById("resultado");
  const hero = globalScope.document?.querySelector(".diagnostic-hero");
  if (!mount || !service || !catalog) return;

  let attempt = null;
  let currentItem = null;
  let busy = false;
  let started = false;
  let hasRenderedResult = false;
  let questionPresentedAt = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function icons() { globalScope.lucide?.createIcons?.(); }
  function setJourneyState(state) {
    globalScope.document.body.dataset.v2State = state;
    if (!hero) return;
    const title = hero.querySelector("#diagnosticHeroTitle");
    const copy = hero.querySelector(".diagnostic-hero-copy");
    const kicker = hero.querySelector(".section-kicker");
    if (state === "question") {
      title.innerHTML = 'Cada resposta ajuda a <span class="diagnostic-title-accent">revelar seu caminho.</span>';
      copy.textContent = "Continue explorando suas habilidades. Ao final, você verá o que já demonstrou e o que merece mais atenção.";
      kicker.textContent = "Sua jornada está em andamento";
    } else if (state === "result") {
      title.innerHTML = 'Seu mapa está <span class="diagnostic-title-accent">pronto.</span>';
      copy.textContent = "Veja suas evidências por área, identifique suas prioridades e descubra como continuar evoluindo.";
      kicker.textContent = "Diagnóstico concluído";
    } else if (state === "intro") {
      title.innerHTML = 'Descubra seu nível em dados e <span class="diagnostic-title-accent">seus próximos passos.</span>';
      copy.textContent = "Responda até 25 perguntas e descubra seus pontos fortes, suas oportunidades de melhoria e por onde continuar aprendendo.";
      kicker.textContent = "Diagnóstico gratuito";
    } else {
      title.textContent = "Preparando seu diagnóstico";
      copy.textContent = "Estamos recuperando sua etapa com segurança.";
      kicker.textContent = "Diagnóstico V2";
    }
  }
  function status(message) {
    const node = globalScope.document.getElementById("v2Status");
    if (node) node.textContent = message || "";
  }
  function track(eventType, metadata = {}) {
    if (!attempt?.attempt_id) return;
    const safe = { methodology_version: "v2.0", ...metadata };
    void globalScope.diagnosticFunnelService?.trackEvent?.({
      attempt_id: attempt.attempt_id, event_type: eventType,
      question_index: Number.isInteger(currentItem?.position) ? currentItem.position : null,
      total_questions_answered: Number.isInteger(currentItem?.position) ? currentItem.position - 1 : null,
      metadata: safe
    });
  }
  function errorText(error) {
    const message = String(error?.message || "");
    return /expired|forbidden|invalid attempt token|claim forbidden/i.test(message)
      ? "O acesso a esta tentativa expirou ou pertence a outra conta. Inicie um novo diagnóstico."
      : "A conexão falhou. Sua resposta não foi descartada; tente novamente.";
  }
  function showError(error, canRetry = true) {
    status(errorText(error));
    if (/expired|forbidden|invalid attempt token|claim forbidden/i.test(String(error?.message || ""))) {
      service.clearAttempt();
      attempt = null;
      mount.querySelector("[data-v2-restart]")?.classList.remove("hidden");
    } else if (canRetry) {
      mount.querySelector("[data-v2-retry]")?.classList.remove("hidden");
    }
  }

  function renderIntro() {
    setJourneyState("intro");
    currentItem = null;
    hasRenderedResult = false;
    resultSection.classList.add("hidden");
    resultMount.innerHTML = "";
    mount.innerHTML = `
      <div class="diagnostic-intro quiz-step diagnostic-v2">
        <div class="diagnostic-intro-heading">
          <span class="section-kicker">Prévia local · Diagnóstico V2</span>
          <h2>Descubra o que estudar a seguir.</h2>
          <p>Até 25 perguntas adaptativas em cinco áreas. A estimativa editorial é de 30 a 50 minutos; você pode pausar e retomar nesta sessão. O resultado descreve as evidências observadas em cada área, sem atribuir um nível geral.</p>
        </div>
        <div class="diagnostic-intro-areas"><strong>Áreas avaliadas</strong>
          <div class="diagnostic-area-chips">${service.AREAS.map((area) => `<span>${escapeHtml(area)}</span>`).join("")}</div>
        </div>
        <div class="diagnostic-intro-action">
          <button class="submit-button" type="button" data-v2-start>Começar diagnóstico <i data-lucide="arrow-right" aria-hidden="true"></i></button>
          <p class="diagnostic-start-note">Você pode continuar sem login. Entre para vincular o resultado à sua conta.</p>
        </div>
        <p id="v2Status" class="diagnostic-v2-status" role="status" aria-live="polite"></p>
      </div>`;
    mount.querySelector("[data-v2-start]").addEventListener("click", start);
    icons();
  }

  function confirmAnonymous() {
    return new Promise((resolve) => {
      const previousFocus = globalScope.document.activeElement;
      const overlay = globalScope.document.createElement("div");
      overlay.className = "anonymous-diagnostic-modal-overlay";
      overlay.innerHTML = `<div class="anonymous-diagnostic-modal-sheet" role="dialog" aria-modal="true" aria-labelledby="v2AnonTitle">
        <h2 id="v2AnonTitle">Salve seu progresso</h2>
        <p>Entre na sua conta para acompanhar este diagnóstico em Meu Progresso. Você também pode continuar sem login.</p>
        <div class="anonymous-diagnostic-modal-actions">
          <button class="filter-button" type="button" data-v2-anon>Continuar sem login</button>
          <button class="submit-button" type="button" data-v2-login>Entrar ou criar conta</button>
        </div></div>`;
      const close = (continueWithoutLogin) => {
        overlay.remove();
        previousFocus?.focus?.();
        resolve(continueWithoutLogin);
      };
      globalScope.document.body.appendChild(overlay);
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") { event.preventDefault(); close(false); }
        if (event.key === "Tab") {
          const buttons = [...overlay.querySelectorAll("button")];
          if (event.shiftKey && globalScope.document.activeElement === buttons[0]) {
            event.preventDefault(); buttons.at(-1).focus();
          } else if (!event.shiftKey && globalScope.document.activeElement === buttons.at(-1)) {
            event.preventDefault(); buttons[0].focus();
          }
        }
      });
      overlay.querySelector("[data-v2-anon]").addEventListener("click", () => close(true));
      overlay.querySelector("[data-v2-login]").addEventListener("click", () => {
        close(false);
        globalScope.authModal?.openAuthModal?.();
      });
      overlay.querySelector("[data-v2-anon]").focus();
    });
  }

  async function start() {
    if (busy) return;
    busy = true;
    const button = mount.querySelector("[data-v2-start]");
    if (button) button.disabled = true;
    try {
      const userId = await service.currentUserId();
      if (!userId && !(await confirmAnonymous())) return;
      attempt = await service.start(userId);
      track("v2_started", { device_class: globalScope.matchMedia("(max-width: 680px)").matches ? "mobile" : "desktop" });
      await advance();
    } catch (error) { showError(error); }
    finally { busy = false; if (button) button.disabled = false; }
  }

  function renderQuestion(item) {
    setJourneyState("question");
    currentItem = item;
    questionPresentedAt = globalScope.performance?.now?.() ?? Date.now();
    const position = Math.min(Math.max(Number(item.position) || 1, 1), 25);
    const percent = Math.round((position - 1) * 100 / 25);
    resultSection.classList.add("hidden");
    mount.innerHTML = `<div class="quiz-step diagnostic-v2">
      <div class="diagnostic-session-strip"><span>${escapeHtml(item.area)} · ${escapeHtml(item.level)}</span><span>Pergunta ${position} de até 25</span></div>
      <div class="progress-line" role="progressbar" aria-label="Progresso do diagnóstico" aria-valuemin="0" aria-valuemax="25" aria-valuenow="${position - 1}"><span style="width:${percent}%"></span></div>
      <p class="diagnostic-v2-stage">${item.stage === "mapping" ? "Mapeamento" : item.stage === "validation" ? "Validação" : "Aprofundamento"} · ${escapeHtml(item.area)}</p>
      <h2 class="question-title" id="v2Question">${escapeHtml(item.question)}</h2>
      ${item.context ? `<p class="diagnostic-v2-context">${escapeHtml(item.context)}</p>` : ""}
      ${item.code ? `<pre class="diagnostic-v2-code"><code>${escapeHtml(item.code)}</code></pre>` : ""}
      <fieldset class="diagnostic-v2-options" aria-labelledby="v2Question"><legend class="sr-only">Escolha uma alternativa</legend>
        ${(item.options || []).map((option, index) => `<label class="diagnostic-v2-option"><input type="radio" name="v2Answer" value="${escapeHtml(option.id)}"><span><strong>${String.fromCharCode(65 + index)})</strong> ${escapeHtml(option.text)}</span></label>`).join("")}
      </fieldset>
      <button class="submit-button" type="button" data-v2-submit disabled>Registrar resposta</button>
      <button class="filter-button hidden" type="button" data-v2-retry>Tentar novamente</button>
      <button class="filter-button hidden" type="button" data-v2-restart>Novo diagnóstico</button>
      <p id="v2Status" class="diagnostic-v2-status" role="status" aria-live="polite"></p>
      <p class="diagnostic-v2-continuity">${position > 1 ? "Resposta anterior registrada. " : ""}Você pode retomar a avaliação nesta etapa.</p>
    </div>`;
    mount.querySelectorAll('input[name="v2Answer"]').forEach((radio) => radio.addEventListener("change", () => {
      mount.querySelector("[data-v2-submit]").disabled = false;
    }));
    mount.querySelector("[data-v2-submit]").addEventListener("click", submit);
    mount.querySelector("[data-v2-retry]").addEventListener("click", advance);
    mount.querySelector("[data-v2-restart]").addEventListener("click", () => { renderIntro(); });
    track("v2_question_presented", { area: item.area, stage: item.stage });
    mount.querySelector("#v2Question").setAttribute("tabindex", "-1");
    mount.querySelector("#v2Question").focus();
  }

  async function submit() {
    if (busy || !attempt || !currentItem) return;
    const option = mount.querySelector('input[name="v2Answer"]:checked');
    if (!option) { status("Escolha uma alternativa."); return; }
    busy = true;
    mount.querySelector("[data-v2-submit]").disabled = true;
    status("Salvando sua resposta…");
    try {
      const responseSeconds = Math.min(3600, Math.max(0, Math.round(
        ((globalScope.performance?.now?.() ?? Date.now()) - questionPresentedAt) / 1000)));
      await service.submit(attempt, currentItem.attempt_item_id, option.value);
      track("v2_answer_saved", { area: currentItem.area, stage: currentItem.stage,
        skill_code: currentItem.skill_code, response_seconds: responseSeconds });
      attempt.pending_answer = null;
      service.saveAttempt(attempt);
      await advance();
    } catch (error) {
      showError(error);
      if (attempt) mount.querySelector("[data-v2-submit]").disabled = false;
    } finally { busy = false; }
  }

  async function advance() {
    if (!attempt) return;
    status("Carregando próxima etapa…");
    try {
      const next = await service.next(attempt);
      if (next?.status === "active") { renderQuestion(next); return; }
      if (["completed", "insufficient_pool"].includes(next?.status)) {
        renderResult(next.result);
        return;
      }
      throw new Error("Resposta inesperada do diagnóstico.");
    } catch (error) { showError(error); }
  }

  function renderSkillSummary(skills, area, isGap) {
    if (!skills.length) return "";
    const named = skills.filter((skill) => catalog.hasSkillName(skill.skill_code));
    const unnamed = skills.filter((skill) => !catalog.hasSkillName(skill.skill_code));
    const namedItems = named.map((skill) => `<li>${escapeHtml(catalog.skillName(skill.skill_code, area))} · ${isGap
      ? `${Number(skill.total) - Number(skill.correct)} resposta(s) a revisar`
      : `${Number(skill.correct)}/${Number(skill.total)} acertos observados`}</li>`).join("");
    const unnamedCount = unnamed.reduce((total, skill) => total + (isGap
      ? Number(skill.total) - Number(skill.correct) : Number(skill.correct)), 0);
    const unnamedItem = unnamed.length ? `<li>${unnamedCount} ${isGap
      ? "resposta(s) a revisar em competências"
      : "acerto(s) observado(s) em competências"} ainda sem nome editorial nesta área.</li>` : "";
    return `<div class="diagnostic-v2-skill-group"><h4>${isGap
      ? "Oportunidades de revisão" : "Sinais positivos observados"}</h4><ul>${namedItems}${unnamedItem}</ul></div>`;
  }

  function renderResult(result) {
    if (!result || !Array.isArray(result.areas)) { showError(new Error("Resultado indisponível.")); return; }
    currentItem = null;
    setJourneyState("result");
    mount.innerHTML = "";
    const areas = service.AREAS.map((name) => result.areas.find((area) => area.area === name))
      .filter(Boolean);
    const priority = [...areas].sort((a, b) => Number(a.priority) - Number(b.priority))[0];
    const destination = catalog.resolve(priority);
    resultMount.innerHTML = `<article class="result-hero-panel diagnostic-v2-result" aria-labelledby="v2ResultTitle">
      <span class="section-kicker">Resultado · Metodologia V2</span>
      <h2 id="v2ResultTitle">Suas evidências por área</h2>
      <p>O desempenho observado resume estas respostas. O nível demonstrado depende também da quantidade e diversidade das evidências.</p>
      <div class="diagnostic-v2-result-summary"><strong>${areas.length} áreas avaliadas</strong><span>Até 25 perguntas · níveis independentes</span></div>
      <div class="diagnostic-v2-next"><h3>Por onde começar</h3>
        <p><strong>${escapeHtml(priority?.area || "A definir")}</strong> — ${escapeHtml(catalog.describe(priority?.recommendation_code))}</p>
        ${destination ? `<a class="submit-button" href="${escapeHtml(destination.href)}" data-v2-destination>${escapeHtml(destination.label)}</a>` : `<p>Ainda não há uma prática vinculada a esta competência. Siga a orientação de estudo acima.</p>`}
        <a class="filter-button" href="meu-progresso.html?preview=v2">Ver Meu Progresso</a>
      </div>
      <div class="diagnostic-v2-area-grid">${areas.map((area) => {
        const sufficient = area.evidence_sufficient === true;
        const signals = (area.skills || []).filter((skill) => Number(skill.correct) > 0);
        const gaps = (area.skills || []).filter((skill) => Number(skill.total) > Number(skill.correct));
        return `<section class="diagnostic-v2-area-card" aria-label="Resultado de ${escapeHtml(area.area)}">
          <h3>${escapeHtml(area.area)}</h3>
          <p><strong>${escapeHtml(area.demonstrated_level || "Indeterminado")}</strong> · confiança ${escapeHtml(area.confidence_band || "baixa")}</p>
          <p>${area.total || 0} respostas · ${area.correct || 0} acertos observados${area.score_percent == null ? "" : ` · ${escapeHtml(area.score_percent)}% de desempenho`}</p>
          <p>${sufficient ? "Evidência suficiente para esta leitura inicial." : "Evidência insuficiente para concluir domínio nesta área."}</p>
          ${catalog.advancedEvidenceText(area.advanced_evidence_status) ? `<p>${escapeHtml(catalog.advancedEvidenceText(area.advanced_evidence_status))}</p>` : ""}
          ${renderSkillSummary(signals, area.area, false)}
          ${renderSkillSummary(gaps, area.area, true)}
          <p class="diagnostic-v2-guidance">${escapeHtml(catalog.describe(area.recommendation_code))}</p>
        </section>`;
      }).join("")}</div>
      <p id="v2Status" class="diagnostic-v2-status" role="status" aria-live="polite"></p>
    </article>`;
    resultSection.classList.remove("hidden");
    if (!hasRenderedResult) {
      track("v2_completed", { area_count: areas.length, priority_area: priority?.area || null });
      areas.forEach((area) => track("v2_area_result", {
        area: area.area, demonstrated_level: area.demonstrated_level,
        confidence_band: area.confidence_band,
        evidence_sufficient: area.evidence_sufficient === true,
        score_percent: area.score_percent,
        difficulties: (area.skills || []).filter((skill) => Number(skill.total) > Number(skill.correct))
          .map((skill) => ({ skill_code: skill.skill_code,
            missed: Number(skill.total) - Number(skill.correct) }))
      }));
      track("v2_recommendation_shown", { area: priority?.area || null, destination_ready: Boolean(destination) });
      hasRenderedResult = true;
    }
    resultMount.querySelector("[data-v2-destination]")?.addEventListener("click", () =>
      track("v2_recommended_practice_started", { area: priority?.area || null, skill_code: destination.skillCode }));
    resultMount.querySelector("#v2ResultTitle").setAttribute("tabindex", "-1");
    resultMount.querySelector("#v2ResultTitle").focus();
    icons();
  }

  async function restore() {
    attempt = service.readAttempt();
    const userId = await service.currentUserId();
    if (attempt?.owner_id && attempt.owner_id !== userId) {
      service.clearAttempt(); attempt = null;
    }
    if (!attempt) { renderIntro(); return; }
    try {
      if (userId && !attempt.owner_id && attempt.claim_token) await service.claim(attempt, userId);
      track("v2_returned", {});
      await advance();
    } catch (error) { renderIntro(); showError(error, false); }
  }

  function init() {
    if (!service.isLocalPreview() || started) return false;
    started = true;
    globalScope.document.body.classList.add("diagnostic-v2-ui");
    setJourneyState("loading");
    globalScope.addEventListener("data-skill-map-auth-changed", () => { void restore(); });
    void restore();
    return true;
  }
  globalScope.diagnosticV2Page = { init };
})(window);
