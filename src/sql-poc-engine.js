(function initSqlPocEngine(globalScope) {
  const PGLITE_CDN_URL = "https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.4.5/dist/index.js";
  const MAX_RESULT_ROWS = 100;

  const PEDIDOS_SCHEMA = [
    { name: "pedido_id", type: "integer" },
    { name: "status", type: "text" },
    { name: "categoria", type: "text" },
    { name: "valor", type: "numeric(10,2)" }
  ];

  const PEDIDOS_SAMPLE = [
    { pedido_id: 1, status: "pago", categoria: "eletrônicos", valor: 129.9 },
    { pedido_id: 2, status: "pendente", categoria: "eletrônicos", valor: 89.5 },
    { pedido_id: 3, status: "pago", categoria: "livros", valor: 54.0 },
    { pedido_id: 4, status: "pago", categoria: "eletrônicos", valor: 219.0 },
    { pedido_id: 5, status: "cancelado", categoria: "livros", valor: 45.0 },
    { pedido_id: 6, status: "pago", categoria: "casa", valor: 78.3 },
    { pedido_id: 7, status: "pago", categoria: "livros", valor: 36.5 }
  ];

  const EXPECTED_RESULT = [
    ["casa", 1],
    ["eletrônicos", 2],
    ["livros", 2]
  ];

  const SETUP_SQL = `
    create table pedidos (
      pedido_id integer primary key,
      status text not null,
      categoria text not null,
      valor numeric(10, 2) not null
    );

    insert into pedidos (pedido_id, status, categoria, valor) values
      (1, 'pago', 'eletrônicos', 129.90),
      (2, 'pendente', 'eletrônicos', 89.50),
      (3, 'pago', 'livros', 54.00),
      (4, 'pago', 'eletrônicos', 219.00),
      (5, 'cancelado', 'livros', 45.00),
      (6, 'pago', 'casa', 78.30),
      (7, 'pago', 'livros', 36.50);
  `;

  function stripSqlComments(value) {
    return String(value || "")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/--.*$/gm, " ");
  }

  function hasMultipleStatements(value) {
    let quote = "";

    for (let index = 0; index < value.length; index += 1) {
      const character = value[index];
      const nextCharacter = value[index + 1];

      if (quote) {
        if (character === quote && nextCharacter === quote) {
          index += 1;
        } else if (character === quote) {
          quote = "";
        }
        continue;
      }

      if (character === "'" || character === "\"") {
        quote = character;
        continue;
      }

      if (character === ";" && value.slice(index + 1).trim()) {
        return true;
      }
    }

    return false;
  }

  function assertReadOnlySelect(query) {
    const normalized = stripSqlComments(query).trim();
    const withoutTrailingSemicolon = normalized.replace(/;\s*$/, "").trim();

    if (!withoutTrailingSemicolon) {
      throw new Error("Digite uma consulta antes de executar.");
    }

    if (/^s(?:e(?:l(?:e(?:c(?:t)?)?)?)?)?$/i.test(withoutTrailingSemicolon)) {
      throw new Error("Sua consulta está incompleta. Comece com SELECT e indique os campos que deseja consultar.");
    }

    if (!/^(select|with)\b/i.test(withoutTrailingSemicolon)) {
      throw new Error("A bancada permite apenas consultas SELECT.");
    }

    if (hasMultipleStatements(normalized)) {
      throw new Error("Execute apenas uma consulta por vez.");
    }

    if (/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|call|do)\b/i.test(withoutTrailingSemicolon)) {
      throw new Error("A bancada permite apenas leitura dos dados sintéticos.");
    }

    return withoutTrailingSemicolon;
  }

  function validateMissionQueryStructure(query) {
    const value = stripSqlComments(query)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/;\s*$/, "")
      .trim();
    const fromPedidosMatch = value.match(/\bfrom\s+(?:(?:"?public"?\.)?"?pedidos"?)(?=\s|$)/);
    const fromPedidosIndex = fromPedidosMatch?.index ?? -1;
    const whereOffset = fromPedidosIndex > -1
      ? value.slice(fromPedidosIndex + fromPedidosMatch[0].length).search(/\bwhere\b/)
      : -1;
    const whereIndex = whereOffset > -1
      ? fromPedidosIndex + fromPedidosMatch[0].length + whereOffset
      : -1;
    const groupByIndex = value.search(/\bgroup\s+by\b/);
    const hasFromPedidos = fromPedidosIndex > -1;
    const whereClause = whereIndex > -1
      ? value.slice(whereIndex, groupByIndex > whereIndex ? groupByIndex : undefined)
      : "";
    const hasStatusPaid = /\b(?:\w+\.)?status\s*=\s*'pago'(?=\s|$|\))/.test(whereClause);
    const hasCount = /\bcount\s*\(\s*(?:\*|1|(?:\w+\.)?pedido_id)\s*\)/.test(value);
    const hasGroupByCategoria = /\bgroup\s+by\s+(?:\w+\.)?categoria\b/.test(value);
    const hasWhereBeforeGroupBy = whereIndex > -1 && groupByIndex > whereIndex;
    const hasFabricatedRows = /\bvalues\s*\(|\bunion(?:\s+all)?\b/.test(value);
    const hasCorrectStructure = [
      hasFromPedidos,
      hasStatusPaid,
      hasCount,
      hasGroupByCategoria,
      hasWhereBeforeGroupBy,
      !hasFabricatedRows
    ].every(Boolean);

    return {
      hasCorrectStructure,
      checks: {
        hasFromPedidos,
        hasStatusPaid,
        hasCount,
        hasGroupByCategoria,
        hasWhereBeforeGroupBy,
        hasFabricatedRows
      }
    };
  }

  function getColumns(result) {
    if (Array.isArray(result.fields) && result.fields.length) {
      return result.fields.map((field) => field.name);
    }

    return result.rows[0] ? Object.keys(result.rows[0]) : [];
  }

  function normalizeMissionResult(result) {
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    const columns = getColumns({ ...result, rows });

    if (columns.length !== 2 || rows.length !== EXPECTED_RESULT.length) {
      return null;
    }

    const normalizedRows = rows.map((row) => {
      const values = columns.map((column) => row[column]);
      const category = values.find((value) => typeof value === "string");
      const countValue = values.find((value) => {
        const number = Number(value);
        return value !== null && value !== "" && Number.isFinite(number);
      });

      if (typeof category !== "string" || countValue === undefined) {
        return null;
      }

      return [category, Number(countValue)];
    });

    if (normalizedRows.some((row) => row === null)) {
      return null;
    }

    return normalizedRows.sort((left, right) => left[0].localeCompare(right[0], "pt-BR"));
  }

  function validateMissionResult(result, query = result?.query) {
    const normalized = normalizeMissionResult(result);
    const structure = validateMissionQueryStructure(query);

    if (!normalized || !structure.hasCorrectStructure) {
      return false;
    }

    return JSON.stringify(normalized) === JSON.stringify(EXPECTED_RESULT);
  }

  function isEvaluableResult(result) {
    return Boolean(
      result &&
      Array.isArray(result.columns) &&
      result.columns.length > 0 &&
      Array.isArray(result.rows) &&
      result.rows.length > 0
    );
  }

  function canValidateExecution(execution, executionQuery, currentQuery) {
    return Boolean(
      isEvaluableResult(execution) &&
      String(executionQuery || "").trim() === String(currentQuery || "").trim()
    );
  }

  async function createWorkbench(PGliteClass) {
    const db = new PGliteClass("memory://");
    await db.waitReady;
    await db.exec(SETUP_SQL);

    return {
      async execute(query) {
        const safeQuery = assertReadOnlySelect(query);
        const result = await db.query(safeQuery);
        const rows = Array.isArray(result.rows) ? result.rows : [];
        return {
          columns: getColumns(result),
          rows: rows.slice(0, MAX_RESULT_ROWS),
          totalRows: rows.length,
          truncated: rows.length > MAX_RESULT_ROWS,
          query: safeQuery
        };
      },
      close() {
        return typeof db.close === "function" ? db.close() : undefined;
      }
    };
  }

  async function createBrowserWorkbench() {
    const { PGlite } = await import(PGLITE_CDN_URL);
    return createWorkbench(PGlite);
  }

  const api = {
    PEDIDOS_SCHEMA,
    PEDIDOS_SAMPLE,
    MAX_RESULT_ROWS,
    assertReadOnlySelect,
    createBrowserWorkbench,
    createWorkbench,
    canValidateExecution,
    isEvaluableResult,
    normalizeMissionResult,
    validateMissionQueryStructure,
    validateMissionResult
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.SqlPocEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
