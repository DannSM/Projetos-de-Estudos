(function initDiagnosticV2Page(globalScope) {
  const service = globalScope.diagnosticV2Service;
  const catalog = globalScope.diagnosticV2Catalog;
  const mount = globalScope.document?.getElementById("quizMount");
  const resultMount = globalScope.document?.getElementById("resultMount");
  const resultSection = globalScope.document?.getElementById("resultado");
  if (!mount || !service || !catalog) return;

  let attempt = null;
  let currentItem = null;
  let busy = false;
  let started = false;
  let hasRenderedResult = false;

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function icons() { globalScope.lucide?.createIcons?.(); }
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
    currentItem = null;
    hasRenderedResult = false;
    resultSection.classList.add("hidden");
    resultMount.innerHTML = "";
    mount.innerHTML = `
      <div class="diagnostic-intro quiz-step diagnostic-v2">
        <div class="diagnostic-intro-heading">
          <span class="section-kicker">Prévia local · Diagnóstico V2</span>
          <h2>Descubra o que estudar a seguir.</h2>
          <p>Até 25 perguntas adaptativas em cinco áreas. O resultado descreve as evidências observadas em cada área, sem atribuir um nível geral.</p>
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
    currentItem = item;
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
      <p class="diagnostic-start-note">A correção é feita pelo servidor. O gabarito não é mostrado durante a avaliação.</p>
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
      await service.submit(attempt, currentItem.attempt_item_id, option.value);
      track("v2_answer_saved", { area: currentItem.area, stage: currentItem.stage });
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

  function renderResult(result) {
    if (!result || !Array.isArray(result.areas)) { showError(new Error("Resultado indisponível.")); return; }
    currentItem = null;
    mount.innerHTML = "";
    const areas = service.AREAS.map((name) => result.areas.find((area) => area.area === name))
      .filter(Boolean);
    const priority = [...areas].sort((a, b) => Number(a.priority) - Number(b.priority))[0];
    const destination = catalog.resolve(priority);
    resultMount.innerHTML = `<article class="result-hero-panel diagnostic-v2-result" aria-labelledby="v2ResultTitle">
      <span class="section-kicker">Resultado · Metodologia V2</span>
      <h2 id="v2ResultTitle">Seu mapa de aprendizagem por área</h2>
      <p>O desempenho observado resume estas respostas. O nível demonstrado depende também da quantidade e diversidade das evidências.</p>
      <div class="diagnostic-v2-result-summary"><strong>${areas.length} áreas avaliadas</strong><span>Até 25 perguntas · níveis independentes</span></div>
      <div class="diagnostic-v2-area-grid">${areas.map((area) => {
        const sufficient = area.evidence_sufficient === true;
        const skills = (area.skills || []).map((skill) => `<li><code>${escapeHtml(skill.skill_code)}</code> · ${Number(skill.correct) || 0}/${Number(skill.total) || 0} respostas observadas</li>`).join("");
        return `<section class="diagnostic-v2-area-card" aria-label="Resultado de ${escapeHtml(area.area)}">
          <h3>${escapeHtml(area.area)}</h3>
          <p><strong>${escapeHtml(area.demonstrated_level || "Indeterminado")}</strong> · confiança ${escapeHtml(area.confidence_band || "baixa")}</p>
          <p>${area.total || 0} respostas · ${area.correct || 0} acertos observados${area.score_percent == null ? "" : ` · ${escapeHtml(area.score_percent)}% de desempenho`}</p>
          <p>${sufficient ? "Evidência suficiente para esta leitura inicial." : "Evidência insuficiente para concluir domínio nesta área."}</p>
          ${skills ? `<details><summary>Competências observadas</summary><ul>${skills}</ul></details>` : ""}
          <p class="diagnostic-v2-guidance">${escapeHtml(catalog.describe(area.recommendation_code))}</p>
        </section>`;
      }).join("")}</div>
      <div class="diagnostic-v2-next"><h3>Prioridade de aprendizagem</h3>
        <p><strong>${escapeHtml(priority?.area || "A definir")}</strong> — ${escapeHtml(catalog.describe(priority?.recommendation_code))}</p>
        ${destination ? `<a class="submit-button" href="${escapeHtml(destination.href)}" data-v2-destination>${escapeHtml(destination.label)}</a>` : `<p>Este conteúdo ainda não tem um destino verificado para a competência observada. Use a orientação acima para estudar.</p>`}
        <a class="filter-button" href="meu-progresso.html?preview=v2">Ver Meu Progresso</a>
      </div>
      <p id="v2Status" class="diagnostic-v2-status" role="status" aria-live="polite"></p>
    </article>`;
    resultSection.classList.remove("hidden");
    if (!hasRenderedResult) {
      track("v2_completed", { area_count: areas.length, priority_area: priority?.area || null });
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
    const heroCopy = globalScope.document.querySelector(".diagnostic-hero-copy");
    if (heroCopy) heroCopy.textContent = "Responda até 25 perguntas e veja as evidências observadas em cada uma das cinco áreas.";
    globalScope.addEventListener("data-skill-map-auth-changed", () => { void restore(); });
    void restore();
    return true;
  }
  globalScope.diagnosticV2Page = { init };
})(window);
