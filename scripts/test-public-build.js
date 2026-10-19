const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  DIST_ROOT,
  PUBLIC_FILES,
  assertSafeSource,
  buildPublic,
  listFiles,
  validateDist
} = require("./build-public");

const REPOSITORY_ROOT = path.resolve(__dirname, "..");
// Snapshot independente da allowlist aprovada: qualquer novo ativo exige revisão explícita deste teste.
const APPROVED_PUBLIC_FILE_COUNT = 55;
const APPROVED_PUBLIC_FILES_SHA256 = "5026ffb07d93504bb9966e97ac1d648319320c22b17b8faa36be52fa3dae17d3";

function assertApprovedPublicFiles() {
  assert.equal(PUBLIC_FILES.length, APPROVED_PUBLIC_FILE_COUNT);
  const digest = crypto.createHash("sha256").update(JSON.stringify(PUBLIC_FILES)).digest("hex");
  assert.equal(digest, APPROVED_PUBLIC_FILES_SHA256, "A allowlist pública mudou sem revisão explícita.");
}

async function hashFile(filePath) {
  return crypto.createHash("sha256").update(await fs.promises.readFile(filePath)).digest("hex");
}

async function buildManifest() {
  const files = await listFiles(DIST_ROOT);
  return Promise.all(files.map(async (relativePath) => ({
    path: relativePath,
    hash: await hashFile(path.join(DIST_ROOT, ...relativePath.split("/")))
  })));
}

async function copyDist(temporaryRoot, directoryName) {
  const destination = path.join(temporaryRoot, directoryName);
  await fs.promises.cp(DIST_ROOT, destination, { recursive: true });
  return destination;
}

async function assertSecretRejected(temporaryRoot) {
  const unsafeDist = await copyDist(temporaryRoot, "secret-dist");
  const testCredential = "CLOUDFLARE_API_TOKEN=cf_test_only_not_a_real_token_1234567890";
  await fs.promises.appendFile(
    path.join(unsafeDist, "index.html"),
    `\n<!-- ${testCredential} -->\n`,
    "utf8"
  );
  await assert.rejects(
    validateDist(unsafeDist, PUBLIC_FILES),
    /Conteúdo proibido \(token Cloudflare\) encontrado em dist: index\.html/
  );
}

async function assertMissingFileRejected(temporaryRoot) {
  const incompleteDist = await copyDist(temporaryRoot, "missing-file-dist");
  await fs.promises.rm(path.join(incompleteDist, "index.html"));
  await assert.rejects(
    validateDist(incompleteDist, PUBLIC_FILES),
    /Arquivos públicos ausentes: index\.html/
  );
}

async function assertUnexpectedFileRejected(temporaryRoot) {
  const unsafeDist = await copyDist(temporaryRoot, "unexpected-file-dist");
  await fs.promises.mkdir(path.join(unsafeDist, "docs"), { recursive: true });
  await fs.promises.writeFile(path.join(unsafeDist, "docs", "internal.md"), "interno", "utf8");
  await assert.rejects(
    validateDist(unsafeDist, PUBLIC_FILES),
    /Arquivos inesperados em dist|Arquivo proibido encontrado em dist/
  );
}

async function assertSourceSymlinkRejectedWithoutFilesystemPrivilege() {
  const originalLstat = fs.promises.lstat;
  const publicSource = path.join(REPOSITORY_ROOT, "index.html");
  fs.promises.lstat = async (candidate) => {
    if (path.resolve(candidate) === publicSource) {
      return { isSymbolicLink: () => true };
    }
    return originalLstat(candidate);
  };

  try {
    await assert.rejects(
      assertSafeSource("index.html"),
      /A origem pública não pode conter link simbólico: index\.html/
    );
  } finally {
    fs.promises.lstat = originalLstat;
  }
}

async function assertPackageSymlinkRejectedWithoutFilesystemPrivilege(linkRoot) {
  const originalReaddir = fs.promises.readdir;
  fs.promises.readdir = async (candidate, options) => {
    if (path.resolve(candidate) === path.resolve(linkRoot)) {
      return [{
        name: "public-link.html",
        isSymbolicLink: () => true,
        isDirectory: () => false,
        isFile: () => false
      }];
    }
    return originalReaddir(candidate, options);
  };

  try {
    await assert.rejects(
      listFiles(linkRoot),
      /O pacote público não pode conter link simbólico: public-link\.html/
    );
  } finally {
    fs.promises.readdir = originalReaddir;
  }
}

async function assertPackageSymlinkRejected(temporaryRoot) {
  const linkRoot = path.join(temporaryRoot, "symlink-dist");
  const linkPath = path.join(linkRoot, "public-link.html");
  await fs.promises.mkdir(linkRoot, { recursive: true });

  try {
    await fs.promises.symlink(path.join(DIST_ROOT, "index.html"), linkPath, "file");
  } catch (error) {
    if (!["EACCES", "EPERM", "ENOTSUP", "UNKNOWN"].includes(error.code)) throw error;
    await assertPackageSymlinkRejectedWithoutFilesystemPrivilege(linkRoot);
    await assertSourceSymlinkRejectedWithoutFilesystemPrivilege();
    return `simulado (${error.code}: Windows sem privilégio para criar symlink)`;
  }

  await assert.rejects(
    listFiles(linkRoot),
    /O pacote público não pode conter link simbólico: public-link\.html/
  );
  await assertSourceSymlinkRejectedWithoutFilesystemPrivilege();
  return "nativo";
}

async function run() {
  assertApprovedPublicFiles();
  const first = await buildPublic();
  assert.equal(first.fileCount, APPROVED_PUBLIC_FILE_COUNT);
  assert.deepEqual(first.files, [...PUBLIC_FILES]);

  for (const relativePath of PUBLIC_FILES) {
    const sourceHash = await hashFile(path.join(REPOSITORY_ROOT, ...relativePath.split("/")));
    const builtHash = await hashFile(path.join(DIST_ROOT, ...relativePath.split("/")));
    assert.equal(builtHash, sourceHash, `conteúdo divergente no build: ${relativePath}`);
  }

  const firstManifest = await buildManifest();
  const second = await buildPublic();
  const secondManifest = await buildManifest();
  assert.equal(second.fileCount, APPROVED_PUBLIC_FILE_COUNT);
  assert.deepEqual(secondManifest, firstManifest, "duas execuções devem produzir o mesmo conjunto e conteúdo");

  const temporaryRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "data-skill-map-public-build-"));
  let symlinkTestMode;
  try {
    await assertSecretRejected(temporaryRoot);
    await assertMissingFileRejected(temporaryRoot);
    await assertUnexpectedFileRejected(temporaryRoot);
    symlinkTestMode = await assertPackageSymlinkRejected(temporaryRoot);
  } finally {
    await fs.promises.rm(temporaryRoot, { recursive: true, force: true });
  }

  const finalValidation = await validateDist(DIST_ROOT, PUBLIC_FILES);
  assert.equal(finalValidation.fileCount, APPROVED_PUBLIC_FILE_COUNT);
  console.log(
    `Public build tests passed: ${finalValidation.fileCount} files, `
    + `${finalValidation.totalBytes} bytes, symlink test: ${symlinkTestMode}`
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
