(function initAnalyticsAdmin(globalScope) {
  const DEFAULT_RANGE_DAYS = 30;
  const USER_TABLE_PAGE_SIZE = 10;

  const uiState = {
    currentPage: 1,
    aggregatedUsers: [],
    rawUserRowsTruncated: false,
    lastFilters: null,
    currentAdminEmail: null
  };

  function getDomRefs() {
    return {
      gate: document.getElementById("adminAccessGate"),
      content: document.getElementById("analyticsContent"),
      status: document.getElementById("analyticsStatus"),
      periodPresetSelect: document.getElementById("periodPresetSelect"),
      startDateInput: document.getElementById("startDateInput"),
      endDateInput: document.getElementById("endDateInput"),
      userFilterInput: document.getElementById("userFilterInput"),
      applyFiltersButton: document.getElementById("applyFiltersButton"),
      logoutButton: document.getElementById("adminLogoutButton"),
      platformKpis: document.getElementById("platformKpis"),
      activityTrendChart: document.getElementById("activityTrendChart"),
      accuracySummary: document.getElementById("accuracySummary"),
      userTableWrap: document.getElementById("userActivityTableWrap"),
      usersPrevButton: document.getElementById("usersPrevButton"),
      usersNextButton: document.getElementById("usersNextButton"),
      usersPageInfo: document.getElementById("usersPageInfo"),
      satisfactionTrendChart: document.getElementById("satisfactionTrendChart"),
      ratingDistribution: document.getElementById("ratingDistribution"),
      satisfactionByContext: document.getElementById("satisfactionByContext"),
      satisfactionByTarget: document.getElementById("satisfactionByTarget")
    };
  }

  function formatNumber(value) {
    const number = Number(value) || 0;
    return new Intl.NumberFormat("pt-BR").format(number);
  }

  function formatPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return `${number.toFixed(1)}%`;
  }

  function formatRating(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return "--";
    return number.toFixed(2);
  }

  function toIsoDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function shiftDays(isoDate, deltaDays) {
    const current = new Date(`${isoDate}T00:00:00`);
    current.setDate(current.getDate() + deltaDays);
    return toIsoDate(current);
  }

  function getTodayIso() {
    return toIsoDate(new Date());
  }

  function ensureIcons() {
    if (globalScope.lucide && typeof globalScope.lucide.createIcons === "function") {
      globalScope.lucide.createIcons();
    }
  }

  function setAuthenticatedState(dom, isAuthenticated) {
    dom.gate.classList.toggle("hidden", isAuthenticated);
    dom.content.classList.toggle("hidden", !isAuthenticated);
    dom.gate.setAttribute("aria-hidden", String(isAuthenticated));
    dom.content.setAttribute("aria-hidden", String(!isAuthenticated));
    document.body.classList.toggle("analytics-auth-locked", !isAuthenticated);
  }

  function renderAccessGate(dom, options = {}) {
    const mode = options.mode || "login";
    const message = options.message || "";

    let helperText = "Entre com seu usuário administrador.";
    if (mode === "forbidden") {
      helperText = "Usuário autenticado sem permissão admin para analytics.";
    }

    dom.gate.innerHTML = `
      <div class="analytics-gate-layout">
        <article class="analytics-panel analytics-gate-visual" aria-hidden="true">
          <div class="analytics-gate-visual-icon-wrap">
            <i class="analytics-gate-visual-icon" data-lucide="shield-check"></i>
          </div>
          <h2>Ambiente protegido</h2>
          <p>Visualize os principais indicadores da plataforma em um só lugar.</p>
          <ul class="analytics-gate-bullets">
            <li>Dados apresentados de forma resumida</li>
            <li>Acompanhamento por período</li>
            <li>Acesso exclusivo da administração</li>
          </ul>
        </article>

        <article class="analytics-panel analytics-gate-card" role="dialog" aria-labelledby="analyticsGateTitle">
          <h2 id="analyticsGateTitle">Acesso admin</h2>
          <p>${helperText}</p>
          <form id="adminAccessForm" class="analytics-gate-form">
            <label for="adminEmailInput">E-mail admin</label>
            <input id="adminEmailInput" type="email" autocomplete="username" required ${mode === "forbidden" ? "disabled" : ""}>
            <label for="adminPasswordInput">Senha</label>
            <input id="adminPasswordInput" type="password" autocomplete="current-password" required ${mode === "forbidden" ? "disabled" : ""}>
            <button type="submit" class="submit-button" ${mode === "forbidden" ? "disabled" : ""}>Entrar no painel</button>
            <p class="analytics-gate-help">Seu acesso será validado para liberar o painel.</p>
            <p id="adminAccessError" class="analytics-error-text ${message ? "" : "hidden"}">${message || ""}</p>
          </form>
        </article>
      </div>
    `;

    setAuthenticatedState(dom, false);
    renderStatus(dom, "", "info");
    ensureIcons();

    if (mode === "forbidden") {
      return;
    }

    const form = document.getElementById("adminAccessForm");
    const emailInput = document.getElementById("adminEmailInput");
    const passwordInput = document.getElementById("adminPasswordInput");
    const errorText = document.getElementById("adminAccessError");
    if (emailInput) emailInput.focus();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorText.classList.add("hidden");
      errorText.textContent = "";

      const email = (emailInput.value || "").trim();
      const password = passwordInput.value || "";
      if (!email || !password) {
        errorText.textContent = "Informe e-mail e senha.";
        errorText.classList.remove("hidden");
        return;
      }

      const signInResult = await globalScope.analyticsService.signInAdmin(email, password);
      if (!signInResult.ok) {
        errorText.textContent = "Falha no login. Verifique credenciais.";
        errorText.classList.remove("hidden");
        return;
      }

      await bootstrapAuthenticatedAdmin(dom);
    });
  }

  function renderStatus(dom, message, type) {
    if (!message) {
      dom.status.className = "analytics-panel analytics-status hidden";
      dom.status.textContent = "";
      return;
    }
    const statusType = type || "info";
    dom.status.className = `analytics-panel analytics-status ${statusType}`;
    dom.status.textContent = message;
  }

  function getFilterState(dom) {
    return {
      startDate: dom.startDateInput.value,
      endDate: dom.endDateInput.value,
      userFilter: dom.userFilterInput.value.trim()
    };
  }

  function isValidDateRange(filters) {
    if (!filters.startDate || !filters.endDate) return false;
    return filters.startDate <= filters.endDate;
  }

  function normalizeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function computePlatformMetrics(rows) {
    if (!rows.length) {
      return {
        activeUsersLatest: 0,
        diagnosticsTotal: 0,
        challengesTotal: 0,
        feedbackTotal: 0,
        commentsTotal: 0,
        diagnosticAccuracy: 0,
        challengeAccuracy: 0,
        satisfactionAverage: 0
      };
    }

    const latest = rows[rows.length - 1];
    let diagnosticsTotal = 0;
    let challengesTotal = 0;
    let feedbackTotal = 0;
    let commentsTotal = 0;
    let totalDiagAnswers = 0;
    let totalDiagCorrect = 0;
    let totalChallengeAnswers = 0;
    let totalChallengeCorrect = 0;
    let weightedSatisfactionSum = 0;
    let weightedSatisfactionCount = 0;

    rows.forEach((row) => {
      diagnosticsTotal += normalizeNumber(row.diagnostics_count);
      challengesTotal += normalizeNumber(row.challenge_attempts_count);
      feedbackTotal += normalizeNumber(row.satisfaction_count);
      commentsTotal += normalizeNumber(row.satisfaction_comments_count);
      totalDiagAnswers += normalizeNumber(row.diagnostic_answers_count);
      totalDiagCorrect += normalizeNumber(row.diagnostic_answers_correct);
      totalChallengeAnswers += normalizeNumber(row.challenge_attempts_count);
      totalChallengeCorrect += normalizeNumber(row.challenge_correct_count);

      const satisfactionCount = normalizeNumber(row.satisfaction_count);
      const satisfactionAvg = normalizeNumber(row.satisfaction_avg_rating);
      if (satisfactionCount > 0 && satisfactionAvg > 0) {
        weightedSatisfactionSum += satisfactionAvg * satisfactionCount;
        weightedSatisfactionCount += satisfactionCount;
      }
    });

    return {
      activeUsersLatest: normalizeNumber(latest.active_users),
      diagnosticsTotal,
      challengesTotal,
      feedbackTotal,
      commentsTotal,
      diagnosticAccuracy: totalDiagAnswers > 0 ? (totalDiagCorrect / totalDiagAnswers) * 100 : 0,
      challengeAccuracy: totalChallengeAnswers > 0 ? (totalChallengeCorrect / totalChallengeAnswers) * 100 : 0,
      satisfactionAverage: weightedSatisfactionCount > 0 ? weightedSatisfactionSum / weightedSatisfactionCount : 0
    };
  }

  function renderPlatformKpis(dom, metrics) {
    dom.platformKpis.innerHTML = `
      <article class="analytics-kpi-card"><span>Usuários ativos (último dia)</span><strong>${formatNumber(metrics.activeUsersLatest)}</strong></article>
      <article class="analytics-kpi-card"><span>Diagnósticos realizados</span><strong>${formatNumber(metrics.diagnosticsTotal)}</strong></article>
      <article class="analytics-kpi-card"><span>Desafios respondidos</span><strong>${formatNumber(metrics.challengesTotal)}</strong></article>
      <article class="analytics-kpi-card"><span>Acurácia diagnóstico</span><strong>${formatPercent(metrics.diagnosticAccuracy)}</strong></article>
      <article class="analytics-kpi-card"><span>Acurácia desafios</span><strong>${formatPercent(metrics.challengeAccuracy)}</strong></article>
      <article class="analytics-kpi-card"><span>Satisfação média</span><strong>${formatRating(metrics.satisfactionAverage)}</strong></article>
      <article class="analytics-kpi-card"><span>Total de avaliações</span><strong>${formatNumber(metrics.feedbackTotal)}</strong></article>
      <article class="analytics-kpi-card"><span>Comentários preenchidos</span><strong>${formatNumber(metrics.commentsTotal)}</strong></article>
    `;
  }

  function renderActivityTrend(dom, rows) {
    if (!rows.length) {
      dom.activityTrendChart.innerHTML = `<p class="analytics-empty">Sem dados para o período selecionado.</p>`;
      return;
    }

    const lastRows = rows.slice(-30);
    let maxValue = 1;
    lastRows.forEach((row) => {
      maxValue = Math.max(maxValue, normalizeNumber(row.diagnostics_count), normalizeNumber(row.challenge_attempts_count), normalizeNumber(row.satisfaction_count));
    });

    const bars = lastRows.map((row) => {
      const diagnostics = normalizeNumber(row.diagnostics_count);
      const challenges = normalizeNumber(row.challenge_attempts_count);
      const feedback = normalizeNumber(row.satisfaction_count);
      const diagnosticsHeight = Math.max((diagnostics / maxValue) * 100, diagnostics > 0 ? 6 : 0);
      const challengesHeight = Math.max((challenges / maxValue) * 100, challenges > 0 ? 6 : 0);
      const feedbackHeight = Math.max((feedback / maxValue) * 100, feedback > 0 ? 6 : 0);
      return `
        <div class="analytics-chart-group" title="${row.activity_date} | D:${diagnostics} C:${challenges} F:${feedback}">
          <div class="analytics-chart-bars">
            <span class="analytics-bar diagnostics" style="height:${diagnosticsHeight}%"></span>
            <span class="analytics-bar challenges" style="height:${challengesHeight}%"></span>
            <span class="analytics-bar feedback" style="height:${feedbackHeight}%"></span>
          </div>
          <span class="analytics-chart-label">${row.activity_date.slice(5)}</span>
        </div>
      `;
    }).join("");

    const sparseClass = lastRows.length <= 7 ? " sparse" : "";
    dom.activityTrendChart.innerHTML = `
      <div class="analytics-chart-legend">
        <span><i class="dot diagnostics"></i>Diagnósticos</span>
        <span><i class="dot challenges"></i>Desafios</span>
        <span><i class="dot feedback"></i>Avaliacoes</span>
      </div>
      <div class="analytics-chart-scroll"><div class="analytics-chart-track${sparseClass}">${bars}</div></div>
    `;
  }

  function renderAccuracySummary(dom, metrics) {
    dom.accuracySummary.innerHTML = `
      <div class="analytics-stat-list">
        <div><span>Acurácia média de diagnóstico</span><strong>${formatPercent(metrics.diagnosticAccuracy)}</strong></div>
        <div><span>Acurácia média de desafios</span><strong>${formatPercent(metrics.challengeAccuracy)}</strong></div>
        <div><span>Nota média de satisfação</span><strong>${formatRating(metrics.satisfactionAverage)}</strong></div>
      </div>
    `;
  }

  function aggregateUsers(rows) {
    const grouped = new Map();
    rows.forEach((row) => {
      const userId = row.anonymous_user_id || "sem_id";
      if (!grouped.has(userId)) {
        grouped.set(userId, {
          anonymous_user_id: userId,
          diagnostics_count: 0,
          challenge_attempts_count: 0,
          satisfaction_count: 0,
          satisfaction_weighted_sum: 0,
          diagnostic_answers_count: 0,
          diagnostic_answers_correct: 0,
          challenge_correct_count: 0,
          last_activity: row.activity_date
        });
      }
      const current = grouped.get(userId);
      current.diagnostics_count += normalizeNumber(row.diagnostics_count);
      current.challenge_attempts_count += normalizeNumber(row.challenge_attempts_count);
      current.satisfaction_count += normalizeNumber(row.satisfaction_count);
      current.diagnostic_answers_count += normalizeNumber(row.diagnostic_answers_count);
      current.diagnostic_answers_correct += normalizeNumber(row.diagnostic_answers_correct);
      current.challenge_correct_count += normalizeNumber(row.challenge_correct_count);
      current.satisfaction_weighted_sum += normalizeNumber(row.satisfaction_avg_rating) * normalizeNumber(row.satisfaction_count);
      if (row.activity_date > current.last_activity) current.last_activity = row.activity_date;
    });

    return Array.from(grouped.values())
      .map((user) => ({
        ...user,
        diagnostic_accuracy_percent: user.diagnostic_answers_count > 0 ? (user.diagnostic_answers_correct / user.diagnostic_answers_count) * 100 : 0,
        challenge_accuracy_percent: user.challenge_attempts_count > 0 ? (user.challenge_correct_count / user.challenge_attempts_count) * 100 : 0,
        satisfaction_avg_rating: user.satisfaction_count > 0 ? user.satisfaction_weighted_sum / user.satisfaction_count : null
      }))
      .sort((a, b) => (a.last_activity === b.last_activity ? b.challenge_attempts_count - a.challenge_attempts_count : (a.last_activity > b.last_activity ? -1 : 1)));
  }

  function renderUserTable(dom) {
    const totalItems = uiState.aggregatedUsers.length;
    if (!totalItems) {
      dom.userTableWrap.innerHTML = `<p class="analytics-empty">Nenhum usuário encontrado no recorte selecionado.</p>`;
      dom.usersPageInfo.textContent = "Página 0 de 0";
      dom.usersPrevButton.disabled = true;
      dom.usersNextButton.disabled = true;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / USER_TABLE_PAGE_SIZE));
    if (uiState.currentPage > totalPages) uiState.currentPage = totalPages;
    const startIndex = (uiState.currentPage - 1) * USER_TABLE_PAGE_SIZE;
    const pagedRows = uiState.aggregatedUsers.slice(startIndex, startIndex + USER_TABLE_PAGE_SIZE);

    const rowsHtml = pagedRows.map((row) => `
      <tr>
        <td><code>${row.anonymous_user_id}</code></td>
        <td>${formatNumber(row.diagnostics_count)}</td>
        <td>${formatNumber(row.challenge_attempts_count)}</td>
        <td>${formatPercent(row.diagnostic_accuracy_percent)}</td>
        <td>${formatPercent(row.challenge_accuracy_percent)}</td>
        <td>${formatRating(row.satisfaction_avg_rating)}</td>
        <td>${row.last_activity || "--"}</td>
      </tr>
    `).join("");

    dom.userTableWrap.innerHTML = `
      ${uiState.rawUserRowsTruncated ? `<p class="analytics-warning">Amostra limitada por volume. Reduza período ou filtre usuário.</p>` : ""}
      <div class="analytics-table-scroll">
        <table class="analytics-table">
          <thead>
            <tr>
              <th>anonymous_user_id</th>
              <th>Diagnósticos</th>
              <th>Desafios</th>
              <th>Acurácia diag.</th>
              <th>Acurácia desaf.</th>
              <th>Satisfação</th>
              <th>Última atividade</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    dom.usersPageInfo.textContent = `Página ${uiState.currentPage} de ${totalPages}`;
    dom.usersPrevButton.disabled = uiState.currentPage <= 1;
    dom.usersNextButton.disabled = uiState.currentPage >= totalPages;
  }

  function renderSatisfactionTrend(dom, rows) {
    if (!rows.length) {
      dom.satisfactionTrendChart.innerHTML = `<p class="analytics-empty">Sem dados de satisfação no período.</p>`;
      return;
    }
    const groupedByDate = new Map();
    rows.forEach((row) => {
      const key = row.activity_date;
      if (!groupedByDate.has(key)) groupedByDate.set(key, { feedbacks: 0, weightedSum: 0 });
      const current = groupedByDate.get(key);
      const feedbacks = normalizeNumber(row.total_feedbacks);
      current.feedbacks += feedbacks;
      current.weightedSum += normalizeNumber(row.avg_rating) * feedbacks;
    });
    const timeline = Array.from(groupedByDate.entries())
      .map(([activityDate, values]) => ({ activityDate, avgRating: values.feedbacks > 0 ? values.weightedSum / values.feedbacks : 0 }))
      .sort((a, b) => (a.activityDate > b.activityDate ? 1 : -1))
      .slice(-30);

    const points = timeline.map((item) => {
      const height = Math.max((item.avgRating / 5) * 100, item.avgRating > 0 ? 6 : 0);
      return `
        <div class="analytics-chart-group" title="${item.activityDate} | Nota média ${item.avgRating.toFixed(2)}">
          <div class="analytics-chart-bars single"><span class="analytics-bar rating" style="height:${height}%"></span></div>
          <span class="analytics-chart-label">${item.activityDate.slice(5)}</span>
        </div>
      `;
    }).join("");

    const sparseClass = timeline.length <= 7 ? " sparse" : "";
    dom.satisfactionTrendChart.innerHTML = `<div class="analytics-chart-scroll"><div class="analytics-chart-track${sparseClass}">${points}</div></div>`;
  }

  function renderRatingDistribution(dom, rows) {
    const totals = { total: 0, rating1: 0, rating2: 0, rating3: 0, rating4: 0, rating5: 0, comments: 0 };
    rows.forEach((row) => {
      totals.total += normalizeNumber(row.total_feedbacks);
      totals.rating1 += normalizeNumber(row.rating_1);
      totals.rating2 += normalizeNumber(row.rating_2);
      totals.rating3 += normalizeNumber(row.rating_3);
      totals.rating4 += normalizeNumber(row.rating_4);
      totals.rating5 += normalizeNumber(row.rating_5);
      totals.comments += normalizeNumber(row.comments_count);
    });
    if (!totals.total) {
      dom.ratingDistribution.innerHTML = `<p class="analytics-empty">Sem avaliações no período.</p>`;
      return;
    }

    const rowsHtml = [
      { label: "Nota 1", value: totals.rating1 },
      { label: "Nota 2", value: totals.rating2 },
      { label: "Nota 3", value: totals.rating3 },
      { label: "Nota 4", value: totals.rating4 },
      { label: "Nota 5", value: totals.rating5 }
    ].map((item) => `
      <div class="analytics-progress-row">
        <span>${item.label}</span>
        <div class="analytics-progress-track"><i style="width:${(item.value / totals.total) * 100}%"></i></div>
        <strong>${formatNumber(item.value)}</strong>
      </div>
    `).join("");

    dom.ratingDistribution.innerHTML = `
      <div class="analytics-stat-list compact">
        <div><span>Total de avaliações</span><strong>${formatNumber(totals.total)}</strong></div>
        <div><span>Comentários preenchidos</span><strong>${formatNumber(totals.comments)}</strong></div>
      </div>
      <div class="analytics-progress-list">${rowsHtml}</div>
    `;
  }

  function renderSatisfactionByContext(dom, rows) {
    if (!rows.length) {
      dom.satisfactionByContext.innerHTML = `<p class="analytics-empty">Sem dados de contexto para o período.</p>`;
      return;
    }
    const contextMap = new Map();
    rows.forEach((row) => {
      const context = row.context_type || "desconhecido";
      if (!contextMap.has(context)) contextMap.set(context, { total: 0, weightedSum: 0, comments: 0 });
      const current = contextMap.get(context);
      const feedbacks = normalizeNumber(row.total_feedbacks);
      current.total += feedbacks;
      current.weightedSum += normalizeNumber(row.avg_rating) * feedbacks;
      current.comments += normalizeNumber(row.comments_count);
    });

    const items = Array.from(contextMap.entries())
      .map(([context, values]) => ({
        context,
        total: values.total,
        comments: values.comments,
        avg: values.total > 0 ? values.weightedSum / values.total : 0
      }))
      .sort((a, b) => b.total - a.total);

    dom.satisfactionByContext.innerHTML = `
      <div class="analytics-stat-list">
        ${items.map((item) => `
          <div>
            <span>${item.context}</span>
            <strong>${formatRating(item.avg)} (n=${formatNumber(item.total)})</strong>
            <small>${formatNumber(item.comments)} comentários preenchidos</small>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderSatisfactionByTarget(dom, rows) {
    if (!rows.length) {
      dom.satisfactionByTarget.innerHTML = `<p class="analytics-empty">Sem dados de desafio/diagnóstico no período.</p>`;
      return;
    }
    const targetMap = new Map();
    rows.forEach((row) => {
      const targetId = row.challenge_id || row.diagnostic_id;
      if (!targetId) return;
      const targetType = row.challenge_id ? "Desafio" : "Diagnóstico";
      const key = `${targetType}:${targetId}`;
      if (!targetMap.has(key)) targetMap.set(key, { targetType, targetId, total: 0, weightedSum: 0, comments: 0 });
      const current = targetMap.get(key);
      const feedbacks = normalizeNumber(row.total_feedbacks);
      current.total += feedbacks;
      current.weightedSum += normalizeNumber(row.avg_rating) * feedbacks;
      current.comments += normalizeNumber(row.comments_count);
    });
    const targets = Array.from(targetMap.values())
      .map((item) => ({ ...item, avg: item.total > 0 ? item.weightedSum / item.total : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    if (!targets.length) {
      dom.satisfactionByTarget.innerHTML = `<p class="analytics-empty">Sem identificadores de desafio/diagnóstico no período.</p>`;
      return;
    }

    const tableRows = targets.map((item) => `
      <tr>
        <td>${item.targetType}</td>
        <td><code>${item.targetId}</code></td>
        <td>${formatNumber(item.total)}</td>
        <td>${formatRating(item.avg)}</td>
        <td>${formatNumber(item.comments)}</td>
      </tr>
    `).join("");

    dom.satisfactionByTarget.innerHTML = `
      <div class="analytics-table-scroll">
        <table class="analytics-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Identificador</th>
              <th>Avaliações</th>
              <th>Nota média</th>
              <th>Comentários (contagem)</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
  }

  async function loadAnalyticsData(dom) {
    if (!globalScope.analyticsService) {
      renderStatus(dom, "Serviço de analytics indisponível.", "error");
      return;
    }
    const filters = getFilterState(dom);
    uiState.lastFilters = filters;
    if (!isValidDateRange(filters)) {
      renderStatus(dom, "Período inválido. Ajuste data inicial e data final.", "error");
      return;
    }

    renderStatus(dom, "Carregando dados analíticos...", "loading");

    const [platformResult, userResult, satisfactionResult] = await Promise.all([
      globalScope.analyticsService.fetchPlatformDaily({ startDate: filters.startDate, endDate: filters.endDate }),
      globalScope.analyticsService.fetchUserActivityDaily({ startDate: filters.startDate, endDate: filters.endDate, userFilter: filters.userFilter }),
      globalScope.analyticsService.fetchSatisfactionDaily({ startDate: filters.startDate, endDate: filters.endDate })
    ]);

    const hasAnyError = !platformResult.ok || !userResult.ok || !satisfactionResult.ok;
    if (hasAnyError) {
      const message = platformResult.error?.message || userResult.error?.message || satisfactionResult.error?.message || "Falha ao carregar analytics.";
      renderStatus(dom, message, "error");
    } else {
      renderStatus(dom, "Dados atualizados com sucesso.", "success");
    }

    const platformRows = platformResult.data || [];
    const userRows = userResult.data || [];
    const satisfactionRows = satisfactionResult.data || [];

    const metrics = computePlatformMetrics(platformRows);
    renderPlatformKpis(dom, metrics);
    renderActivityTrend(dom, platformRows);
    renderAccuracySummary(dom, metrics);

    uiState.rawUserRowsTruncated = Boolean(userResult.truncated);
    uiState.aggregatedUsers = aggregateUsers(userRows);
    renderUserTable(dom);

    renderSatisfactionTrend(dom, satisfactionRows);
    renderRatingDistribution(dom, satisfactionRows);
    renderSatisfactionByContext(dom, satisfactionRows);
    renderSatisfactionByTarget(dom, satisfactionRows);
  }

  function bindEvents(dom) {
    dom.periodPresetSelect.addEventListener("change", () => {
      const days = Number(dom.periodPresetSelect.value) || DEFAULT_RANGE_DAYS;
      const endDate = dom.endDateInput.value || getTodayIso();
      dom.endDateInput.value = endDate;
      dom.startDateInput.value = shiftDays(endDate, -(days - 1));
    });

    dom.applyFiltersButton.addEventListener("click", () => {
      uiState.currentPage = 1;
      loadAnalyticsData(dom);
    });

    dom.logoutButton.addEventListener("click", async () => {
      await globalScope.analyticsService.signOutAdmin();
      uiState.currentAdminEmail = null;
      renderAccessGate(dom, { mode: "login", message: "Sessão encerrada." });
    });

    dom.usersPrevButton.addEventListener("click", () => {
      if (uiState.currentPage > 1) {
        uiState.currentPage -= 1;
        renderUserTable(dom);
      }
    });

    dom.usersNextButton.addEventListener("click", () => {
      const totalPages = Math.max(1, Math.ceil(uiState.aggregatedUsers.length / USER_TABLE_PAGE_SIZE));
      if (uiState.currentPage < totalPages) {
        uiState.currentPage += 1;
        renderUserTable(dom);
      }
    });
  }

  function setDefaultDates(dom) {
    const endDate = getTodayIso();
    const startDate = shiftDays(endDate, -(DEFAULT_RANGE_DAYS - 1));
    dom.endDateInput.value = endDate;
    dom.startDateInput.value = startDate;
  }

  async function bootstrapAuthenticatedAdmin(dom) {
    const authCheck = await globalScope.analyticsService.checkAdminAuthorization();
    const isAuthorized = authCheck.ok && Array.isArray(authCheck.data) && authCheck.data[0] && authCheck.data[0].is_authorized === true;

    if (!isAuthorized) {
      await globalScope.analyticsService.signOutAdmin();
      renderAccessGate(dom, {
        mode: "login",
        message: "Usuário autenticado sem permissão admin para analytics."
      });
      return;
    }

    setAuthenticatedState(dom, true);
    await loadAnalyticsData(dom);
  }

  async function init() {
    const dom = getDomRefs();
    if (!dom.gate || !dom.content) return;
    if (!globalScope.analyticsService) {
      renderAccessGate(dom, { mode: "login", message: "Serviço de autenticação não inicializado." });
      return;
    }

    setDefaultDates(dom);
    bindEvents(dom);

    const sessionResult = await globalScope.analyticsService.getCurrentSession();
    if (!sessionResult.ok || !sessionResult.session) {
      renderAccessGate(dom, { mode: "login" });
      return;
    }

    await bootstrapAuthenticatedAdmin(dom);
  }

  init();
})(window);
