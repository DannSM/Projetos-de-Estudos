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

const pages = [
  { name: "home", path: "/index.html", waitFor: "#home" },
  { name: "diagnostico", path: "/diagnostico.html", waitFor: ".diagnostic-intro" },
  {
    name: "meu-progresso",
    path: "/meu-progresso.html",
    waitFor: ".progress-gate-card, .progress-dashboard"
  },
  { name: "trilhas", path: "/index.html#trilhas", waitFor: "#trilhas" },
  {
    name: "central-sql-filtros-where",
    path: "/praticas-sql.html?pratica=sql-essencial-filtros-where",
    waitFor: ".sql-practice-workspace"
  },
  {
    name: "central-sql-count-nulos-distintos",
    path: "/praticas-sql.html?pratica=sql-essencial-count-nulos-distintos",
    waitFor: ".sql-practice-workspace"
  },
  {
    name: "redirect-legado-missao",
    path: "/missao.html?missao=sql-essencial-filtros-where",
    waitFor: ".sql-practice-workspace",
    expectedPath: "/praticas-sql.html"
  }
];

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
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
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
    await page.waitForTimeout(500);

    if (pageConfig.expectedPath && new URL(page.url()).pathname !== pageConfig.expectedPath) {
      throw new Error(`redirect terminou em ${page.url()}, esperado ${pageConfig.expectedPath}`);
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

    await page.screenshot({ path: screenshotPath, fullPage: true });
    const screenshot = await fs.promises.stat(screenshotPath);
    if (!screenshot.isFile() || screenshot.size === 0) {
      throw new Error("screenshot nao foi gerado");
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
