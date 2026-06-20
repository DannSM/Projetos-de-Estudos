const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "artifacts", "visual");
const host = "127.0.0.1";
const port = Number(process.env.VISUAL_PORT || 4173);
const baseUrl = process.env.VISUAL_BASE_URL || `http://${host}:${port}`;
const timeoutMs = Number(process.env.VISUAL_TIMEOUT_MS || 20000);
const validateSqlSteps35 = process.env.VISUAL_SQL_STEPS_3_5 !== "0";

const pages = [
  {
    name: "home",
    path: "/",
    waitFor: "#home",
    readyFor: ".learning-paths-summary",
    activeNav: "home",
    learningPathCtas: true
  },
  { name: "diagnostico", path: "/diagnostico", waitFor: ".diagnostic-intro", activeNav: "diagnostico" },
  {
    name: "meu-progresso",
    path: "/meu-progresso",
    waitFor: ".progress-gate-card, .progress-dashboard",
    activeNav: "progresso",
    anonymousGate: true
  },
  { name: "trilhas", path: "/#trilhas", waitFor: "#trilhas", activeNav: "trilhas" },
  {
    name: "central-sql-filtros-where",
    path: "/praticas-sql?pratica=sql-essencial-filtros-where",
    waitFor: ".sql-practice-workspace",
    activeNav: "praticas-sql",
    sidebarSteps: [
      "sql-essencial-count-nulos-distintos",
      "sql-essencial-filtro-antes-agregacao",
      "sql-essencial-group-by",
      "sql-essencial-join"
    ]
  },
  {
    name: "central-sql-count-nulos-distintos",
    path: "/praticas-sql?pratica=sql-essencial-count-nulos-distintos",
    waitFor: ".sql-practice-workspace",
    finalEvidence: true,
    supportTabs: [
      { name: "conceito", id: "concept" },
      { name: "dados", id: "data" },
      { name: "tutora-ia", id: "tutor" }
    ]
  },
  {
    name: "redirect-legado-missao",
    path: "/missao.html?missao=sql-essencial-filtros-where",
    waitFor: ".sql-practice-workspace",
    expectedPath: "/praticas-sql.html"
  }
];

if (validateSqlSteps35) {
  pages.push(
    {
      name: "central-sql-etapa-3-filtro-agregacao",
      path: "/praticas-sql?pratica=sql-essencial-filtro-antes-agregacao",
      waitFor: ".sql-practice-workspace",
      practiceEvidence: {
        title: "Filtro antes da agregação",
        tableText: "Tabela: pedidos",
        conceptTitle: "WHERE filtra antes do resumo",
        schemaTitle: "pedidos"
      },
      supportTabs: [
        { name: "conceito", id: "concept" },
        { name: "dados", id: "data" },
        { name: "tutora-ia", id: "tutor" }
      ]
    },
    {
      name: "central-sql-etapa-4-group-by",
      path: "/praticas-sql?pratica=sql-essencial-group-by",
      waitFor: ".sql-practice-workspace",
      practiceEvidence: {
        title: "Agrupamentos com GROUP BY",
        tableText: "Tabela: pedidos",
        conceptTitle: "GROUP BY cria um resumo por grupo",
        schemaTitle: "pedidos"
      },
      supportTabs: [
        { name: "conceito", id: "concept" },
        { name: "dados", id: "data" },
        { name: "tutora-ia", id: "tutor" }
      ]
    },
    {
      name: "central-sql-etapa-5-join",
      path: "/praticas-sql?pratica=sql-essencial-join",
      waitFor: ".sql-practice-workspace",
      practiceEvidence: {
        title: "Relacionando tabelas com JOIN",
        tableText: "Tabelas: clientes, pedidos",
        conceptTitle: "JOIN conecta informações de tabelas diferentes",
        schemaTitle: "clientes + pedidos"
      },
      supportTabs: [
        { name: "conceito", id: "concept" },
        { name: "dados", id: "data" },
        { name: "tutora-ia", id: "tutor" }
      ]
    }
  );
}

const pageFilter = String(process.env.VISUAL_PAGE_FILTER || "").trim();
if (pageFilter) {
  const filteredPages = pages.filter((page) => page.name.includes(pageFilter));
  pages.splice(0, pages.length, ...filteredPages);
}

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 }
];

// Keep this list small and limited to errors that are proven harmless.
const ignoredConsoleErrors = [];

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".webp": "image/webp"
};

function isIgnoredConsoleError(message) {
  return ignoredConsoleErrors.some((pattern) => pattern.test(message));
}

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, baseUrl).pathname);
  const routePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const relativePath = path.extname(routePath) ? routePath : `${routePath}.html`;
  const filePath = path.resolve(projectRoot, relativePath);
  const relativeToRoot = path.relative(projectRoot, filePath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return filePath;
}

function createStaticServer() {
  return http.createServer((request, response) => {
    const filePath = resolveRequestPath(request.url || "/");

    if (!filePath) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    fs.stat(filePath, (statError, stats) => {
      if (statError || !stats.isFile()) {
        response.writeHead(404).end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      fs.createReadStream(filePath).pipe(response);
    });
  });
}

function probeServer() {
  return new Promise((resolve) => {
    const request = http.get(`${baseUrl}/index.html`, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.setTimeout(1500, () => request.destroy());
    request.on("error", () => resolve(false));
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
}

function closeServer(server) {
  if (!server) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections?.();
  });
}

async function ensureServer() {
  if (await probeServer()) {
    console.log(`Servidor existente reutilizado em ${baseUrl}`);
    return null;
  }

  if (process.env.VISUAL_BASE_URL) {
    throw new Error(`VISUAL_BASE_URL nao respondeu com HTTP 200: ${baseUrl}`);
  }

  const server = createStaticServer();
  await listen(server);
  console.log(`Servidor estatico iniciado em ${baseUrl}`);
  return server;
}

async function validatePage(browser, pageConfig, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height }
  });
  const page = await context.newPage();
  const errors = [];
  const screenshotPath = path.join(outputDir, `${pageConfig.name}-${viewport.name}.png`);

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && !isIgnoredConsoleError(message.text())) {
      errors.push(`console.error: ${message.text()}`);
    }
  });
  await page.route("**/api/sql-tutor", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        answer: "Comece comparando COUNT(*) com COUNT(cupom). Depois observe como os valores nulos afetam cada contagem.",
        provider: "visual-smoke",
        model: "mock",
        durationMs: 420
      })
    });
  });

  try {
    const response = await page.goto(`${baseUrl}${pageConfig.path}`, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs
    });

    if (!response || !response.ok()) {
      throw new Error(`carregamento HTTP falhou (${response ? response.status() : "sem resposta"})`);
    }

    await page.locator(pageConfig.waitFor).first().waitFor({
      state: "visible",
      timeout: timeoutMs
    });
    if (pageConfig.readyFor) {
      await page.locator(pageConfig.readyFor).first().waitFor({
        state: "visible",
        timeout: timeoutMs
      });
    }
    await page.waitForTimeout(500);

    if (pageConfig.learningPathCtas) {
      const ctaEvidence = await page.evaluate(() => {
        const summary = document.querySelector(".learning-paths-summary");
        const actions = summary?.querySelector(".learning-paths-summary-actions");
        const buttons = [...(actions?.querySelectorAll("a") || [])];
        const summaryRect = summary?.getBoundingClientRect();
        const actionsRect = actions?.getBoundingClientRect();
        const buttonRects = buttons.map((button) => button.getBoundingClientRect());
        return {
          looseCtaCount: document.querySelectorAll(".tracks-heading-actions a").length,
          labels: buttons.map((link) => link.textContent.trim()),
          hrefs: buttons.map((link) => link.getAttribute("href")),
          stacked: buttonRects.length === 2 && buttonRects[1].top > buttonRects[0].bottom,
          equalWidths: buttonRects.length === 2 && Math.abs(buttonRects[0].width - buttonRects[1].width) <= 1,
          mobileSideGaps: summaryRect && actionsRect
            ? [actionsRect.left - summaryRect.left, summaryRect.right - actionsRect.right]
            : []
        };
      });
      if (
        ctaEvidence.looseCtaCount !== 0
        || ctaEvidence.labels.join("|") !== "Fazer diagnóstico|Explorar práticas SQL"
        || ctaEvidence.hrefs[1] !== "praticas-sql.html?pratica=sql-essencial-filtros-where"
        || !ctaEvidence.stacked
        || !ctaEvidence.equalWidths
        || (viewport.width <= 620 && ctaEvidence.mobileSideGaps.some((gap) => gap < 10 || gap > 20))
      ) {
        throw new Error(`CTAs de Trilhas fora da hierarquia esperada: ${JSON.stringify(ctaEvidence)}`);
      }
    }

    if (pageConfig.anonymousGate) {
      const gateEvidence = await page.evaluate(() => ({
        gateVisible: Boolean(document.querySelector(".progress-gate-card")),
        dashboardCount: document.querySelectorAll(".progress-dashboard").length,
        loginCta: document.querySelector(".progress-gate-card [data-progress-auth-open]")?.textContent.trim() || ""
      }));
      if (
        !gateEvidence.gateVisible
        || gateEvidence.dashboardCount !== 0
        || gateEvidence.loginCta !== "Entrar / Criar conta"
      ) {
        throw new Error(`gate anônimo de Meu Progresso inválido: ${JSON.stringify(gateEvidence)}`);
      }
    }

    if (pageConfig.activeNav) {
      const activeNavKeys = await page.locator("[data-global-nav='desktop'] [data-nav-key].is-active")
        .evaluateAll((links) => links.map((link) => link.dataset.navKey));
      if (activeNavKeys.length !== 1 || activeNavKeys[0] !== pageConfig.activeNav) {
        throw new Error(`menu ativo incorreto: ${JSON.stringify(activeNavKeys)}, esperado ${pageConfig.activeNav}`);
      }
    }

    if (pageConfig.expectedPath && new URL(page.url()).pathname !== pageConfig.expectedPath) {
      throw new Error(`redirect terminou em ${page.url()}, esperado ${pageConfig.expectedPath}`);
    }

    if (pageConfig.practiceEvidence) {
      const practiceEvidence = await page.evaluate(() => ({
        title: document.querySelector(".sql-practice-workspace__title h2")?.textContent.trim(),
        prompt: document.querySelector(".sql-practice-brief h1")?.textContent.trim(),
        tags: document.querySelector(".sql-practice-tags")?.textContent.replace(/\s+/g, " ").trim(),
        conceptTitle: document.querySelector(".sql-support-concept h3")?.textContent.trim(),
        hint: document.querySelector(".sql-support-tip p")?.textContent.trim(),
        source: document.querySelector(".sql-practice-source")?.textContent.trim()
      }));
      const expected = pageConfig.practiceEvidence;
      if (
        practiceEvidence.title !== expected.title
        || !practiceEvidence.prompt
        || !practiceEvidence.tags?.includes(expected.tableText)
        || practiceEvidence.conceptTitle !== expected.conceptTitle
        || !practiceEvidence.hint
        || practiceEvidence.source !== "Dados da prática"
      ) {
        throw new Error(`conteudo oficial incompleto: ${JSON.stringify(practiceEvidence)}`);
      }
    }

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));

    if (dimensions.scrollWidth > dimensions.clientWidth + 1) {
      throw new Error(
        `overflow horizontal: scrollWidth=${dimensions.scrollWidth}, clientWidth=${dimensions.clientWidth}`
      );
    }

    if (pageConfig.finalEvidence) {
      const finalLayout = await page.evaluate(() => {
        const brief = document.querySelector(".sql-practice-brief");
        const tags = document.querySelector(".sql-practice-tags");
        const titleWrap = document.querySelector(".sql-practice-workspace__title");

        return {
          briefKickers: brief?.querySelectorAll(".section-kicker").length,
          tagColumns: getComputedStyle(tags).gridTemplateColumns.split(" ").filter(Boolean).length,
          titleKickers: titleWrap?.querySelectorAll(".section-kicker").length,
          titleText: titleWrap?.textContent.trim()
        };
      });

      if (finalLayout.briefKickers !== 0) {
        throw new Error("o chip interno do enunciado ainda esta presente");
      }
      if (finalLayout.tagColumns !== 2) {
        throw new Error(`metadados do enunciado nao formam grade 2x2: ${finalLayout.tagColumns} coluna(s)`);
      }
      if (
        finalLayout.titleKickers !== 0
        || finalLayout.titleText !== "COUNT, nulos e distintos"
      ) {
        throw new Error(`cabecalho da pratica ainda contem chip ou texto inesperado: "${finalLayout.titleText}"`);
      }
    }

    await page.screenshot({ path: screenshotPath, fullPage: true });
    const screenshot = await fs.promises.stat(screenshotPath);
    if (!screenshot.isFile() || screenshot.size === 0) {
      throw new Error("screenshot nao foi gerado");
    }

    if (pageConfig.finalEvidence) {
      const finalScreenshotPath = path.join(
        outputDir,
        `${pageConfig.name}-ajuste-final-${viewport.name}.png`
      );
      await page.screenshot({ path: finalScreenshotPath, fullPage: true });
      console.log(`OK ${pageConfig.name} / final / ${viewport.name} -> ${finalScreenshotPath}`);
    }

    if (pageConfig.supportTabs) {
      for (const supportTab of pageConfig.supportTabs) {
        const tab = page.locator(`[data-support-tab="${supportTab.id}"]`);
        await tab.click();
        await page.locator(`#sql-support-panel-${supportTab.id}`).waitFor({
          state: "visible",
          timeout: timeoutMs
        });

        const layout = await page.evaluate(() => {
          const tabList = document.querySelector(".sql-support-tabs");
          const tabs = [...document.querySelectorAll(".sql-support-tab")];
          const body = document.querySelector(".sql-support-panel__body");
          const header = document.querySelector(".sql-support-panel__header");
          const app = document.querySelector(".sql-practice-app");
          const sidebar = document.querySelector(".sql-practice-sidebar");
          const footer = document.querySelector(".sql-practice-sidebar__footer");
          const rect = (element) => element?.getBoundingClientRect();
          const tabHeights = tabs.map((element) => rect(element).height);
          const tabListRect = rect(tabList);
          const bodyRect = rect(body);
          const headerRect = rect(header);
          const appRect = rect(app);
          const sidebarRect = rect(sidebar);

          return {
            tabListHeight: tabListRect?.height,
            tabHeights,
            tabBodyGap: bodyRect && tabListRect ? bodyRect.top - tabListRect.bottom : null,
            headerHeight: headerRect?.height,
            headerKickerCount: header?.querySelectorAll(".section-kicker").length,
            appBottom: appRect?.bottom,
            sidebarBottom: sidebarRect?.bottom,
            sidebarBackground: sidebar ? getComputedStyle(sidebar).backgroundColor : null,
            footerBackground: footer ? getComputedStyle(footer).backgroundColor : null
          };
        });

        if (layout.tabListHeight < 44 || layout.tabListHeight > 56) {
          throw new Error(`altura da barra de abas fora do esperado: ${layout.tabListHeight}px`);
        }
        if (layout.tabHeights.some((height) => height < 34 || height > 42)) {
          throw new Error(`altura de aba fora do esperado: ${layout.tabHeights.join(", ")}px`);
        }
        if (new Set(layout.tabHeights.map((height) => Math.round(height))).size !== 1) {
          throw new Error(`abas com alturas diferentes: ${layout.tabHeights.join(", ")}px`);
        }
        if (layout.tabBodyGap === null || layout.tabBodyGap > 1) {
          throw new Error(`espaco inesperado entre abas e conteudo: ${layout.tabBodyGap}px`);
        }
        if (layout.headerHeight > 60 || layout.headerKickerCount !== 0) {
          throw new Error(
            `cabecalho do apoio nao esta compacto: height=${layout.headerHeight}, kickers=${layout.headerKickerCount}`
          );
        }
        if (viewport.width > 1100) {
          if (Math.abs(layout.appBottom - layout.sidebarBottom) > 1) {
            throw new Error(
              `sidebar nao acompanha a pagina: appBottom=${layout.appBottom}, sidebarBottom=${layout.sidebarBottom}`
            );
          }
          if (layout.sidebarBackground !== layout.footerBackground) {
            throw new Error(
              `rodape da sidebar com fundo divergente: ${layout.footerBackground} != ${layout.sidebarBackground}`
            );
          }
        }

        if (supportTab.id === "tutor") {
          if (await page.locator(".sql-support-chat__intro").count()) {
            throw new Error("cabecalho duplicado ainda existe dentro da aba Tutora IA");
          }

          const initialTutorLayout = await page.evaluate(() => {
            const welcome = document.querySelector(".sql-support-chat__welcome");
            const messages = document.querySelector(".sql-support-chat__messages");
            const actions = [...document.querySelectorAll("[data-ai-quick-action]")]
              .map((button) => button.textContent.trim());
            const welcomeRect = welcome?.getBoundingClientRect();
            const messagesRect = messages?.getBoundingClientRect();

            return {
              title: welcome?.querySelector("strong")?.textContent.trim(),
              subtitle: welcome?.querySelector("small")?.textContent.trim(),
              heading: welcome?.querySelector("h3")?.textContent.trim(),
              description: welcome?.querySelector("p")?.textContent.trim(),
              actions,
              centered: welcomeRect && messagesRect
                ? Math.abs(
                  (welcomeRect.left + welcomeRect.width / 2)
                  - (messagesRect.left + messagesRect.width / 2)
                ) <= 2
                : false
            };
          });
          const expectedInitialActions = [
            "Por onde devo começar?",
            "Não entendi o enunciado",
            "Que comandos SQL preciso usar?",
            "Me dê uma dica, sem entregar a resposta"
          ];
          if (
            initialTutorLayout.title !== "MapIA · Tutora SQL"
            || initialTutorLayout.subtitle !== "Responde só sobre esta questão"
            || initialTutorLayout.heading !== "Pergunte qualquer coisa sobre este exercício"
            || initialTutorLayout.description
              !== "A IA orienta o raciocínio, sem entregar a resposta pronta."
            || JSON.stringify(initialTutorLayout.actions) !== JSON.stringify(expectedInitialActions)
            || !initialTutorLayout.centered
          ) {
            throw new Error(
              `estado inicial da MapIA invalido: ${JSON.stringify(initialTutorLayout)}`
            );
          }

          const initialTutorScreenshotPath = path.join(
            outputDir,
            `${pageConfig.name}-mapia-inicial-${viewport.name}.png`
          );
          await page.screenshot({ path: initialTutorScreenshotPath, fullPage: true });

          await page.locator("[data-ai-quick-action]").first().click();
          const loading = page.locator(".sql-support-chat__loading");
          await loading.waitFor({ state: "visible", timeout: timeoutMs });
          const loadingText = (await loading.textContent()).trim();
          if (loadingText !== "Pensando") {
            throw new Error(`loading redundante ou inesperado: "${loadingText}"`);
          }

          const loadingScreenshotPath = path.join(
            outputDir,
            `${pageConfig.name}-tutora-ia-loading-${viewport.name}.png`
          );
          await page.screenshot({ path: loadingScreenshotPath, fullPage: true });

          await loading.waitFor({ state: "hidden", timeout: timeoutMs });
          await page.locator(".sql-support-chat__message.is-assistant").waitFor({
            state: "visible",
            timeout: timeoutMs
          });

          const chatLayout = await page.evaluate(() => {
            const history = document.querySelector(".sql-support-chat__messages");
            const messages = [...document.querySelectorAll(".sql-support-chat__message")];
            const getMetrics = (element) => {
              const styles = getComputedStyle(element);
              return {
                height: element.getBoundingClientRect().height,
                clientHeight: element.clientHeight,
                scrollHeight: element.scrollHeight,
                overflowY: styles.overflowY
              };
            };

            return {
              history: getMetrics(history),
              messages: messages.map(getMetrics),
              studentHeight: document.querySelector(".sql-support-chat__message.is-student")
                ?.getBoundingClientRect().height,
              assistantHeight: document.querySelector(".sql-support-chat__message.is-assistant")
                ?.getBoundingClientRect().height
            };
          });

          if (chatLayout.studentHeight > 72 || chatLayout.assistantHeight > 150) {
            throw new Error(
              `baloes com altura artificial: estudante=${chatLayout.studentHeight}, tutora=${chatLayout.assistantHeight}`
            );
          }
          if (chatLayout.messages.some((message) => message.scrollHeight > message.clientHeight + 1)) {
            throw new Error("um balao da conversa criou scrollbar propria");
          }
          if (chatLayout.history.scrollHeight > chatLayout.history.clientHeight + 1) {
            throw new Error("historico curto criou scroll interno desnecessario");
          }

          if (pageConfig.name === "central-sql-etapa-5-join") {
            for (let index = 0; index < 5; index += 1) {
              const assistantCount = await page.locator(".sql-support-chat__message.is-assistant").count();
              await page.locator("[data-ai-quick-action]").first().click();
              await page.locator(".sql-support-chat__message.is-assistant").nth(assistantCount).waitFor({
                state: "visible",
                timeout: timeoutMs
              });
            }

            const query = [
              "select",
              "  p.pedido_id,",
              "  c.nome,",
              "  p.valor",
              "from pedidos p",
              "join clientes c",
              "  on c.cliente_id = p.cliente_id",
              "where p.status = 'pago';"
            ].join("\n");
            await page.locator("[data-query-answer]").fill(query);
            await page.evaluate(() => new Promise((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(resolve));
            }));
            const scrollBeforeExecute = await page.evaluate(() => {
              const messages = document.querySelector("[data-ai-tutor-messages]");
              const target = Math.max(1, Math.floor((messages.scrollHeight - messages.clientHeight) / 2));
              messages.scrollTop = target;
              return messages.scrollTop;
            });

            await page.locator("[data-execute-query]").click();
            await page.locator("[data-validate-query]").waitFor({ state: "visible", timeout: timeoutMs });
            await page.waitForFunction(() => {
              const button = document.querySelector("[data-validate-query]");
              return button && !button.disabled;
            });
            await page.waitForTimeout(100);
            await page.evaluate(() => new Promise((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(resolve));
            }));
            const scrollAfterExecute = await page.evaluate(() => {
              const messages = document.querySelector("[data-ai-tutor-messages]");
              return {
                scrollTop: messages?.scrollTop || 0,
                maxScrollTop: Math.max(0, (messages?.scrollHeight || 0) - (messages?.clientHeight || 0))
              };
            });
            const expectedAfterExecute = Math.min(
              scrollBeforeExecute,
              scrollAfterExecute.maxScrollTop
            );
            if (Math.abs(scrollAfterExecute.scrollTop - expectedAfterExecute) > 2) {
              throw new Error(
                `executar SQL alterou scroll da MapIA: ${scrollBeforeExecute} -> ${JSON.stringify(scrollAfterExecute)}`
              );
            }

            await page.locator("[data-validate-query]").click();
            await page.locator(".mission-feedback--correct").waitFor({
              state: "visible",
              timeout: timeoutMs
            });
            await page.waitForTimeout(100);
            await page.evaluate(() => new Promise((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(resolve));
            }));
            const scrollAfterValidation = await page.evaluate(() => {
              const messages = document.querySelector("[data-ai-tutor-messages]");
              return {
                scrollTop: messages?.scrollTop || 0,
                maxScrollTop: Math.max(0, (messages?.scrollHeight || 0) - (messages?.clientHeight || 0))
              };
            });
            const expectedAfterValidation = Math.min(
              scrollBeforeExecute,
              scrollAfterValidation.maxScrollTop
            );
            if (Math.abs(scrollAfterValidation.scrollTop - expectedAfterValidation) > 2) {
              throw new Error(
                `validar SQL alterou scroll da MapIA: ${scrollBeforeExecute} -> ${JSON.stringify(scrollAfterValidation)}`
              );
            }

            const assistantCount = await page.locator(".sql-support-chat__message.is-assistant").count();
            await page.locator("[data-ai-quick-action]").first().click();
            await page.locator(".sql-support-chat__message.is-assistant").nth(assistantCount).waitFor({
              state: "visible",
              timeout: timeoutMs
            });
            await page.evaluate(() => new Promise((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(resolve));
            }));
            const chatScroll = await page.evaluate(() => {
              const messages = document.querySelector("[data-ai-tutor-messages]");
              return {
                scrollTop: messages.scrollTop,
                bottom: messages.scrollHeight - messages.clientHeight
              };
            });
            if (Math.abs(chatScroll.bottom - chatScroll.scrollTop) > 2) {
              throw new Error(
                `nova mensagem nao levou ao fim da conversa: ${JSON.stringify(chatScroll)}`
              );
            }
          }

          const conversationScreenshotPath = path.join(
            outputDir,
            `${pageConfig.name}-mapia-conversa-${viewport.name}.png`
          );
          await page.screenshot({ path: conversationScreenshotPath, fullPage: true });
          const tutorFinalScreenshotPath = path.join(
            outputDir,
            `${pageConfig.name}-tutora-final-${viewport.name}.png`
          );
          await page.screenshot({ path: tutorFinalScreenshotPath, fullPage: true });
          console.log(
            `OK ${pageConfig.name} / tutora-ia-conversa / ${viewport.name} -> ${conversationScreenshotPath}`
          );
        }

        if (supportTab.id === "data") {
          const expectedSchemaTitle = pageConfig.practiceEvidence?.schemaTitle || "pedidos";
          const dataLayout = await page.evaluate(() => {
            const row = document.querySelector(".sql-support-data__heading");
            const label = row?.querySelector(".section-kicker");
            const title = row?.querySelector("h3");
            const count = row?.querySelector("small");
            const labelRect = label?.getBoundingClientRect();
            const titleRect = title?.getBoundingClientRect();
            return {
              rowExists: Boolean(row),
              countExists: Boolean(count),
              labelText: label?.textContent.trim(),
              titleText: title?.textContent.trim(),
              labelCenter: labelRect ? labelRect.top + labelRect.height / 2 : null,
              titleCenter: titleRect ? titleRect.top + titleRect.height / 2 : null
            };
          });
          if (
            !dataLayout.rowExists
            || dataLayout.countExists
            || dataLayout.labelText !== "Schema da prática"
            || dataLayout.titleText !== expectedSchemaTitle
            || Math.abs(dataLayout.labelCenter - dataLayout.titleCenter) > 3
          ) {
            throw new Error(
              `identificacao do schema invalida: ${JSON.stringify(dataLayout)}`
            );
          }

          const dataFinalScreenshotPath = path.join(
            outputDir,
            `${pageConfig.name}-dados-ajuste-final-${viewport.name}.png`
          );
          await page.screenshot({ path: dataFinalScreenshotPath, fullPage: true });
        }

        const supportScreenshotPath = path.join(
          outputDir,
          `${pageConfig.name}-${supportTab.name}-${viewport.name}.png`
        );
        await page.screenshot({ path: supportScreenshotPath, fullPage: true });
        const supportScreenshot = await fs.promises.stat(supportScreenshotPath);
        if (!supportScreenshot.isFile() || supportScreenshot.size === 0) {
          throw new Error(`screenshot da aba ${supportTab.name} nao foi gerado`);
        }
        console.log(
          `OK ${pageConfig.name} / ${supportTab.name} / ${viewport.name} -> ${supportScreenshotPath}`
        );
      }
    }

    if (pageConfig.sidebarSteps && viewport.name === "desktop") {
      for (const slug of pageConfig.sidebarSteps) {
        const targetIndex = await page.evaluate((targetSlug) => {
          const buttons = [...document.querySelectorAll("[data-select-practice]")];
          const slugs = [
            "sql-introducao",
            "sql-essencial-filtros-where",
            "sql-essencial-count-nulos-distintos",
            "sql-essencial-filtro-antes-agregacao",
            "sql-essencial-group-by",
            "sql-essencial-join"
          ];
          return buttons.findIndex((button) => Number(button.dataset.selectPractice) === slugs.indexOf(targetSlug));
        }, slug);
        if (targetIndex < 0) {
          throw new Error(`etapa ausente na sidebar: ${slug}`);
        }
        await page.locator("[data-select-practice]").nth(targetIndex).click();
        await page.waitForFunction((targetSlug) => (
          new URL(window.location.href).searchParams.get("pratica") === targetSlug
          && document.querySelector(".sql-practice-source")?.textContent.trim() === "Dados da prática"
          && Boolean(document.querySelector(".sql-practice-brief h1")?.textContent.trim())
          && Boolean(document.querySelector(".sql-support-concept h3")?.textContent.trim())
          && Boolean(document.querySelector(".sql-support-tip p")?.textContent.trim())
          && Boolean(document.querySelector(".sql-practice-tags")?.textContent.trim())
        ), slug, { timeout: timeoutMs });
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join("\n"));
    }

    console.log(`OK ${pageConfig.name} / ${viewport.name} -> ${screenshotPath}`);
  } catch (error) {
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch {
      // The original failure is more useful when the page or browser is already closed.
    }
    throw new Error(`${pageConfig.name} / ${viewport.name}: ${error.message}`);
  } finally {
    await context.close();
  }
}

async function main() {
  await fs.promises.mkdir(outputDir, { recursive: true });

  let server;
  let browser;
  const failures = [];

  try {
    server = await ensureServer();
    browser = await chromium.launch({ headless: true });

    for (const pageConfig of pages) {
      for (const viewport of viewports) {
        try {
          await validatePage(browser, pageConfig, viewport);
        } catch (error) {
          failures.push(error.message);
          console.error(`FALHA ${error.message}`);
        }
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    await closeServer(server);
  }

  if (failures.length > 0) {
    throw new Error(`Smoke visual falhou:\n- ${failures.join("\n- ")}`);
  }

  console.log(`Smoke visual concluido. Evidencias: ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
