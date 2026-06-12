const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadService(window) {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "src", "sql-practice-service.js"),
    "utf8"
  );
  vm.runInNewContext(source, { window, console, Date, Map, Set });
  return window.sqlPracticeService;
}

function createAnonymousWindow() {
  return {
    authService: {
      getClient() {
        return {
          auth: {
            async getSession() {
              return { data: { session: null }, error: null };
            }
          }
        };
      }
    }
  };
}

function createQuery(table, tables) {
  const filters = [];
  let operation = "select";
  let payload = null;
  let orderColumn = null;

  const query = {
    select() {
      operation = "select";
      return query;
    },
    eq(column, value) {
      filters.push([column, value]);
      return query;
    },
    order(column) {
      orderColumn = column;
      return query;
    },
    maybeSingle() {
      return execute(true);
    },
    update(value) {
      operation = "update";
      payload = value;
      return query;
    },
    insert(value) {
      operation = "insert";
      payload = value;
      return execute(false);
    },
    then(resolve, reject) {
      return execute(false).then(resolve, reject);
    }
  };

  async function execute(single) {
    const rows = tables[table];
    const matches = (row) => filters.every(([column, value]) => row[column] === value);

    if (operation === "insert") {
      rows.push({ id: `${table}-${rows.length + 1}`, ...payload });
      return { data: null, error: null };
    }

    if (operation === "update") {
      rows.filter(matches).forEach((row) => Object.assign(row, payload));
      return { data: null, error: null };
    }

    const selected = rows.filter(matches);
    if (orderColumn) {
      selected.sort((a, b) => Number(a[orderColumn]) - Number(b[orderColumn]));
    }
    return { data: single ? selected[0] || null : selected, error: null };
  }

  return query;
}

function createAuthenticatedWindow() {
  const tables = {
    learning_paths: [
      { id: "path-sql", slug: "sql-essencial", title: "SQL Essencial", status: "active" }
    ],
    learning_path_steps: [
      { id: "step-1", path_id: "path-sql", step_key: "sql-essencial-01-where", display_order: 1, status: "active" },
      { id: "step-2", path_id: "path-sql", step_key: "sql-essencial-02-contagens", display_order: 2, status: "active" },
      { id: "step-3", path_id: "path-sql", step_key: "sql-essencial-03-filtro-mais-agregacao", display_order: 3, status: "active" }
    ],
    user_learning_progress: [
      {
        id: "progress-1",
        user_id: "user-1",
        path_id: "path-sql",
        step_id: "step-1",
        status: "in_progress",
        progress_percent: 0,
        started_at: "2026-06-01T00:00:00.000Z",
        completed_at: null,
        metadata: { source: "diagnostic_personalized_learning_bridge" }
      }
    ]
  };
  const client = {
    auth: {
      async getSession() {
        return { data: { session: { user: { id: "user-1" } } }, error: null };
      }
    },
    from(table) {
      return createQuery(table, tables);
    }
  };

  return {
    tables,
    window: {
      authService: {
        getClient() {
          return client;
        }
      }
    }
  };
}

async function run() {
  const anonymousService = loadService(createAnonymousWindow());
  assert.strictEqual(anonymousService.getProgressPercent(1, 3), 33.33);
  assert.strictEqual(anonymousService.getProgressPercent(3, 3), 100);

  const anonymousResult = await anonymousService.savePracticeProgress({
    slug: "sql-essencial-filtros-where"
  });
  assert.strictEqual(anonymousResult.skipped, true);
  assert.strictEqual(anonymousResult.authenticated, false);

  const authenticated = createAuthenticatedWindow();
  const authenticatedService = loadService(authenticated.window);
  const practice = { slug: "sql-essencial-filtros-where" };
  const firstResult = await authenticatedService.savePracticeProgress(practice);
  const secondResult = await authenticatedService.savePracticeProgress(practice);
  const rows = authenticated.tables.user_learning_progress;

  assert.strictEqual(firstResult.ok, true);
  assert.strictEqual(firstResult.progressPercent, 33.33);
  assert.strictEqual(secondResult.ok, true);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows.find((row) => row.step_id === "step-1").status, "completed");
  assert.strictEqual(rows.find((row) => row.step_id === "step-2").status, "in_progress");
  assert.strictEqual(rows.find((row) => row.step_id === "step-2").progress_percent, 33.33);

  console.log("SQL practice progress tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
