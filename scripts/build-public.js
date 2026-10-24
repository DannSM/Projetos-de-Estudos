const fs = require("node:fs");
const path = require("node:path");

const REPOSITORY_ROOT = path.resolve(__dirname, "..");
const DIST_ROOT = path.join(REPOSITORY_ROOT, "dist");

const PUBLIC_FILES = Object.freeze([
  "analytics.html",
  "apple-touch-icon.png",
  "assets/header-logo.png",
  "assets/logo.png",
  "diagnostico.html",
  "favicon.ico",
  "favicon.png",
  "index.html",
  "meu-progresso.html",
  "missao.html",
  "pratica-guiada.html",
  "praticas-sql.html",
  "privacidade.html",
  "src/analytics-admin.js",
  "src/analytics-service.js",
  "src/app.js",
  "src/auth-modal.js",
  "src/auth-service.js",
  "src/challenges.js",
  "src/data/content.js",
  "src/diagnostic-account-link-service.js",
  "src/diagnostic-funnel-service.js",
  "src/diagnostic-v2-service.js",
  "src/diagnostic-v2-catalog.js",
  "src/diagnostic-v2-page.js",
  "src/diagnostic-v2-progress.js",
  "src/feedback-modal.js",
  "src/guided-practice-page.js",
  "src/guided-practice-service.js",
  "src/hero-preview.js",
  "src/kpi-guided-content.js",
  "src/learning-paths.js",
  "src/learning-progress-status.js",
  "src/mapia-session-guard.js",
  "src/personalized-learning-service.js",
  "src/progress-page.js",
  "src/project-01-content.js",
  "src/question-bank-service.js",
  "src/question-selector.js",
  "src/quiz.js",
  "src/recommendations.js",
  "src/sql-ai-tutor.js",
  "src/sql-mission-validation.js",
  "src/sql-poc-engine.js",
  "src/sql-practice-page.js",
  "src/sql-practice-privacy.js",
  "src/sql-practice-service.js",
  "src/state.js",
  "src/study-plan-content.js",
  "src/supabase-config.js",
  "src/supabase-service.js",
  "style.css",
  "styles/base.css",
  "styles/components.css",
  "styles/landing.css",
  "styles/layout.css",
  "styles/progress.css",
  "styles/responsive.css",
  "termos.html"
].sort());

const FORBIDDEN_PATH_PATTERNS = Object.freeze([
  /(^|\/)\.(?:git|codex)(\/|$)/i,
  /(^|\/)(?:docs|scripts|supabase|workers|functions|node_modules)(\/|$)/i,
  /(^|\/)(?:package(?:-lock)?\.json|vitest\..+|wrangler(?:\..+)?\.(?:jsonc?|toml))$/i,
  /(^|\/)(?:readme|agents)\.md$/i,
  /(^|\/)\.env(?:\..+)?$/i,
  /\.(?:sql|toml|ya?ml|md)$/i,
  /(?:^|\/)(?:test|tests)(?:\/|$)/i,
  /(?:\.test|\.spec)\.[^/]+$/i,
  /(?:~|\.bak|\.tmp|\.temp)$/i
]);

const FORBIDDEN_CONTENT_PATTERNS = Object.freeze([
  { label: "chave privada", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { label: "Supabase secret key", pattern: /sb_secret_[A-Za-z0-9_-]{12,}/i },
  { label: "JWT potencialmente privilegiado", pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { label: "token Cloudflare", pattern: /CLOUDFLARE_API_TOKEN\s*[=:]\s*[^\s<\[]+/i },
  { label: "Supabase service role", pattern: /SUPABASE_SERVICE_ROLE(?:_KEY)?\s*[=:]\s*[^\s<\[]+/i }
]);

function normalizeRelative(filePath) {
  return filePath.split(path.sep).join("/");
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function assertSafeSource(relativePath) {
  const segments = relativePath.split("/");
  let current = REPOSITORY_ROOT;

  for (const segment of segments) {
    current = path.join(current, segment);
    const stat = await fs.promises.lstat(current);
    if (stat.isSymbolicLink()) {
      throw new Error(`A origem pública não pode conter link simbólico: ${relativePath}`);
    }
  }

  const [realRepositoryRoot, realSource] = await Promise.all([
    fs.promises.realpath(REPOSITORY_ROOT),
    fs.promises.realpath(current)
  ]);
  const stat = await fs.promises.stat(realSource);
  if (!stat.isFile() || !isPathInside(realRepositoryRoot, realSource)) {
    throw new Error(`Origem pública inválida ou fora do repositório: ${relativePath}`);
  }

  return realSource;
}

async function listFiles(root, current = root) {
  const entries = await fs.promises.readdir(current, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    const relativePath = normalizeRelative(path.relative(root, absolutePath));
    if (entry.isSymbolicLink()) {
      throw new Error(`O pacote público não pode conter link simbólico: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, absolutePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      throw new Error(`Tipo de entrada não permitido no pacote: ${relativePath}`);
    }
  }

  return files.sort();
}

function isExternalReference(reference) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(reference);
}

function cleanReference(reference) {
  const withoutQuery = reference.split(/[?#]/, 1)[0].trim();
  if (!withoutQuery) return "";
  try {
    return decodeURIComponent(withoutQuery);
  } catch (error) {
    return withoutQuery;
  }
}

async function assertReferenceExists(distRoot, sourceFile, reference, { documentRelative = true } = {}) {
  if (!reference || isExternalReference(reference)) return;
  const cleaned = cleanReference(reference);
  if (!cleaned || cleaned.includes("${")) return;

  const base = documentRelative ? path.dirname(sourceFile) : distRoot;
  const target = cleaned.startsWith("/")
    ? path.resolve(distRoot, `.${cleaned}`)
    : path.resolve(base, cleaned);

  if (!isPathInside(distRoot, target)) {
    throw new Error(`Referência sai do pacote público em ${normalizeRelative(path.relative(distRoot, sourceFile))}: ${reference}`);
  }

  try {
    const stat = await fs.promises.stat(target);
    if (!stat.isFile()) throw new Error("não é arquivo");
  } catch (error) {
    throw new Error(`Referência local ausente em ${normalizeRelative(path.relative(distRoot, sourceFile))}: ${reference}`);
  }
}

async function validateReferences(distRoot, files) {
  for (const relativePath of files) {
    const absolutePath = path.join(distRoot, ...relativePath.split("/"));
    const extension = path.extname(relativePath).toLowerCase();
    if (![".html", ".css", ".js"].includes(extension)) continue;

    const source = await fs.promises.readFile(absolutePath, "utf8");
    if (extension === ".html") {
      const attributePattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
      for (const match of source.matchAll(attributePattern)) {
        await assertReferenceExists(distRoot, absolutePath, match[1]);
      }
    }

    if (extension === ".css") {
      const urlPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
      for (const match of source.matchAll(urlPattern)) {
        await assertReferenceExists(distRoot, absolutePath, match[1]);
      }
    }

    if (extension === ".js") {
      const pagePattern = /["'`]([^"'`]*?\.html(?:[?#][^"'`]*)?)["'`]/g;
      for (const match of source.matchAll(pagePattern)) {
        await assertReferenceExists(distRoot, absolutePath, match[1], { documentRelative: false });
      }
    }
  }
}

async function validateDist(distRoot = DIST_ROOT, expectedFiles = PUBLIC_FILES) {
  const absoluteDistRoot = path.resolve(distRoot);
  const stat = await fs.promises.lstat(absoluteDistRoot);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("dist deve ser um diretório real, nunca um link simbólico.");
  }

  const actualFiles = await listFiles(absoluteDistRoot);
  const expected = [...expectedFiles].sort();
  const expectedSet = new Set(expected);
  const actualSet = new Set(actualFiles);
  const missing = expected.filter((file) => !actualSet.has(file));
  const unexpected = actualFiles.filter((file) => !expectedSet.has(file));

  if (missing.length || unexpected.length) {
    throw new Error([
      missing.length ? `Arquivos públicos ausentes: ${missing.join(", ")}` : "",
      unexpected.length ? `Arquivos inesperados em dist: ${unexpected.join(", ")}` : ""
    ].filter(Boolean).join("\n"));
  }

  for (const relativePath of actualFiles) {
    if (FORBIDDEN_PATH_PATTERNS.some((pattern) => pattern.test(relativePath))) {
      throw new Error(`Arquivo proibido encontrado em dist: ${relativePath}`);
    }

    if ([".html", ".css", ".js", ".json", ".txt"].includes(path.extname(relativePath).toLowerCase())) {
      const source = await fs.promises.readFile(path.join(absoluteDistRoot, ...relativePath.split("/")), "utf8");
      const forbidden = FORBIDDEN_CONTENT_PATTERNS.find(({ pattern }) => pattern.test(source));
      if (forbidden) {
        throw new Error(`Conteúdo proibido (${forbidden.label}) encontrado em dist: ${relativePath}`);
      }
    }
  }

  await validateReferences(absoluteDistRoot, actualFiles);
  const sizes = await Promise.all(actualFiles.map(async (relativePath) => (
    await fs.promises.stat(path.join(absoluteDistRoot, ...relativePath.split("/")))
  ).size));

  return {
    files: actualFiles,
    fileCount: actualFiles.length,
    totalBytes: sizes.reduce((sum, size) => sum + size, 0)
  };
}

async function buildPublic() {
  const resolvedDist = path.resolve(DIST_ROOT);
  if (resolvedDist !== path.join(REPOSITORY_ROOT, "dist")) {
    throw new Error("Destino de build inesperado.");
  }

  try {
    const existing = await fs.promises.lstat(resolvedDist);
    if (existing.isSymbolicLink()) {
      throw new Error("dist não pode ser um link simbólico.");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await fs.promises.rm(resolvedDist, { recursive: true, force: true });
  await fs.promises.mkdir(resolvedDist, { recursive: true });

  for (const relativePath of PUBLIC_FILES) {
    const source = await assertSafeSource(relativePath);
    const destination = path.join(resolvedDist, ...relativePath.split("/"));
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    await fs.promises.copyFile(source, destination);
  }

  return validateDist(resolvedDist, PUBLIC_FILES);
}

async function runCli() {
  const checkOnly = process.argv.slice(2).includes("--check");
  const result = checkOnly
    ? await validateDist(DIST_ROOT, PUBLIC_FILES)
    : await buildPublic();
  const action = checkOnly ? "validado" : "gerado e validado";
  process.stdout.write(`Pacote público ${action}: ${result.fileCount} arquivos, ${result.totalBytes} bytes.\n`);
}

if (require.main === module) {
  runCli().catch((error) => {
    process.stderr.write(`Build público falhou: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  DIST_ROOT,
  PUBLIC_FILES,
  assertSafeSource,
  buildPublic,
  listFiles,
  validateDist,
  validateReferences
};
