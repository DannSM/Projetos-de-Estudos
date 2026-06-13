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

  function assertSafeIdentifier(value) {
    const identifier = String(value || "");
    if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
      throw new Error("O dataset possui um identificador SQL invalido.");
    }
    return identifier;
  }

  function serializeSqlValue(value) {
    if (value === null || value === undefined) return "null";
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("O dataset possui um numero invalido.");
      return String(value);
    }
    if (typeof value === "boolean") return value ? "true" : "false";
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  function hasSafeColumnConstraints(value) {
    return /^(?:(?:primary key|not null)(?:\s+|$))*(?:references\s+[a-z_][a-z0-9_]*\s*\(\s*[a-z_][a-z0-9_]*\s*\))?$/i
      .test(value);
  }

  function buildTableSetupSql(schema, rows) {
    const table = assertSafeIdentifier(schema.table || schema.name);
    const columns = schema.columns.map((column) => {
      const name = assertSafeIdentifier(column.name);
      const type = String(column.type || "").trim();
      const constraints = String(column.constraints || "").trim();
      if (!/^[a-z0-9_(),\s]+$/i.test(type) || !hasSafeColumnConstraints(constraints)) {
        throw new Error("O schema do dataset possui uma definicao invalida.");
      }
      return `${name} ${type}${constraints ? ` ${constraints}` : ""}`;
    });
    const columnNames = schema.columns.map((column) => assertSafeIdentifier(column.name));
    const values = rows.map((row) => `(${columnNames.map((name) => serializeSqlValue(row[name])).join(", ")})`);

    return `
      create table ${table} (${columns.join(", ")});
      ${values.length ? `insert into ${table} (${columnNames.join(", ")}) values ${values.join(", ")};` : ""}
    `;
  }

  function buildSetupSql(datasetConfig) {
    const schema = datasetConfig?.schemaConfig;
    const seedData = datasetConfig?.seedData;
    if (!schema || !Array.isArray(seedData)) {
      return SETUP_SQL;
    }

    if (Array.isArray(schema.tables) && schema.tables.length) {
      return schema.tables.map((tableSchema) => {
        const tableName = tableSchema.table || tableSchema.name;
        const tableSeed = seedData.find((entry) => entry?.table === tableName);
        if (!Array.isArray(tableSchema.columns) || !Array.isArray(tableSeed?.rows)) {
          throw new Error("O dataset com multiplas tabelas possui uma definicao invalida.");
        }
        return buildTableSetupSql(tableSchema, tableSeed.rows);
      }).join("\n");
    }

    if (!Array.isArray(schema.columns)) {
      return SETUP_SQL;
    }

    return buildTableSetupSql(schema, seedData);
  }

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

  function normalizeMissionResult(result, expectedRows = EXPECTED_RESULT) {
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    const columns = getColumns({ ...result, rows });

    if (columns.length !== 2 || rows.length !== expectedRows.length) {
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

  function validateMissionResult(result, query = result?.query, expectedRows = EXPECTED_RESULT) {
    const normalized = normalizeMissionResult(result, expectedRows);
    const structure = validateMissionQueryStructure(query);

    if (!normalized || !structure.hasCorrectStructure) {
      return false;
    }

    const normalizedExpected = [...expectedRows].sort((left, right) =>
      String(left[0]).localeCompare(String(right[0]), "pt-BR")
    );
    return JSON.stringify(normalized) === JSON.stringify(normalizedExpected);
  }

  function validateConfiguredResult(result, query, validationConfig, expectedResult) {
    if (validationConfig?.validator === "paid_orders_by_category") {
      const expectedRows = Array.isArray(expectedResult?.rows) ? expectedResult.rows : EXPECTED_RESULT;
      return validateMissionResult(result, query, expectedRows);
    }

    if (validationConfig?.validator === "count_nulls_distincts") {
      return validateCountNullsDistinctsResult(result, query, expectedResult?.metrics);
    }

    if (validationConfig?.validator === "paid_orders_summary") {
      return validatePaidOrdersSummaryResult(result, query, expectedResult?.rows);
    }

    if (validationConfig?.validator === "orders_by_category_summary") {
      return validateOrdersByCategorySummaryResult(result, query, expectedResult?.rows);
    }

    if (validationConfig?.validator === "paid_orders_with_customers") {
      return validatePaidOrdersWithCustomersResult(result, query, expectedResult?.rows);
    }

    return false;
  }

  function normalizeSqlForValidation(query) {
    return stripSqlComments(query)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/;\s*$/, "")
      .trim();
  }

  function hasFabricatedRows(value) {
    return /\bvalues\s*\(|\bunion(?:\s+all)?\b/.test(value);
  }

  function normalizeComparableRows(result) {
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    const columns = getColumns({ ...result, rows });
    return rows.map((row) => columns.map((column) => {
      const value = row[column];
      const numericValue = Number(value);
      return value !== null && value !== "" && Number.isFinite(numericValue)
        ? numericValue
        : String(value);
    }));
  }

  function compareRowsIgnoringOrder(actualRows, expectedRows) {
    const canonicalize = (rows) => rows
      .map((row) => [...row].sort((left, right) => String(left).localeCompare(String(right), "pt-BR")))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), "pt-BR"));
    return JSON.stringify(canonicalize(actualRows)) === JSON.stringify(canonicalize(expectedRows));
  }

  function validatePaidOrdersSummaryResult(result, query, expectedRows) {
    const value = normalizeSqlForValidation(query);
    const rows = normalizeComparableRows(result);
    const hasCorrectStructure = [
      /\bfrom\s+(?:(?:"?public"?\.)?"?pedidos"?)(?=\s|$)/.test(value),
      /\bwhere\b[\s\S]*\b(?:\w+\.)?status\s*=\s*'pago'/.test(value),
      /\bcount\s*\(\s*(?:\*|1|(?:\w+\.)?pedido_id)\s*\)/.test(value),
      /\bsum\s*\(\s*(?:\w+\.)?valor\s*\)/.test(value),
      !hasFabricatedRows(value)
    ].every(Boolean);
    return rows.length === 1
      && rows[0].length === 2
      && hasCorrectStructure
      && compareRowsIgnoringOrder(rows, expectedRows || [[5, 517.7]]);
  }

  function validateOrdersByCategorySummaryResult(result, query, expectedRows) {
    const value = normalizeSqlForValidation(query);
    const rows = normalizeComparableRows(result);
    const hasCorrectStructure = [
      /\bfrom\s+(?:(?:"?public"?\.)?"?pedidos"?)(?=\s|$)/.test(value),
      /\b(?:\w+\.)?categoria\b/.test(value),
      /\bcount\s*\(\s*(?:\*|1|(?:\w+\.)?pedido_id)\s*\)/.test(value),
      /\bsum\s*\(\s*(?:\w+\.)?valor\s*\)/.test(value),
      /\bgroup\s+by\s+(?:\w+\.)?categoria\b/.test(value),
      !hasFabricatedRows(value)
    ].every(Boolean);
    return rows.length === 3
      && rows.every((row) => row.length === 3)
      && hasCorrectStructure
      && compareRowsIgnoringOrder(rows, expectedRows || [
        ["casa", 1, 78.3],
        ["eletrônicos", 3, 438.4],
        ["livros", 3, 135.5]
      ]);
  }

  function validatePaidOrdersWithCustomersResult(result, query, expectedRows) {
    const value = normalizeSqlForValidation(query);
    const rows = normalizeComparableRows(result);
    const hasCorrectStructure = [
      /\bpedidos\b/.test(value),
      /\bclientes\b/.test(value),
      /\bjoin\b/.test(value),
      /\bon\s+(?:\w+\.)?cliente_id\s*=\s*(?:\w+\.)?cliente_id\b/.test(value),
      /\bwhere\b[\s\S]*\b(?:\w+\.)?status\s*=\s*'pago'/.test(value),
      /\b(?:\w+\.)?pedido_id\b/.test(value),
      /\b(?:\w+\.)?nome\b/.test(value),
      /\b(?:\w+\.)?valor\b/.test(value),
      !hasFabricatedRows(value)
    ].every(Boolean);
    return rows.length === 4
      && rows.every((row) => row.length === 3)
      && hasCorrectStructure
      && compareRowsIgnoringOrder(rows, expectedRows || [
        [101, "Ana", 120],
        [103, "Bruno", 250],
        [104, "Carla", 90],
        [106, "Bruno", 150]
      ]);
  }

  function validateCountNullsDistinctsQueryStructure(query) {
    const value = stripSqlComments(query)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/;\s*$/, "")
      .trim();
    const hasFromPedidos = /\bfrom\s+(?:(?:"?public"?\.)?"?pedidos"?)(?=\s|$)/.test(value);
    const hasCountAll = /\bcount\s*\(\s*(?:\*|1|(?:\w+\.)?pedido_id)\s*\)/.test(value);
    const hasCountCoupon = /\bcount\s*\(\s*(?:\w+\.)?cupom\s*\)/.test(value);
    const hasDistinctCustomers = /\bcount\s*\(\s*distinct\s+(?:\w+\.)?cliente_id\s*\)/.test(value);
    const hasNullCount = (
      /\bcount\s*\(\s*(?:\*|1|(?:\w+\.)?pedido_id)\s*\)\s*-\s*count\s*\(\s*(?:\w+\.)?cupom\s*\)/.test(value)
      || /\bsum\s*\(\s*case\s+when\s+(?:\w+\.)?cupom\s+is\s+null\s+then\s+1\s+else\s+0\s+end\s*\)/.test(value)
      || /\bcount\s*\(\s*(?:\*|1|(?:\w+\.)?pedido_id)\s*\)\s+filter\s*\(\s*where\s+(?:\w+\.)?cupom\s+is\s+null\s*\)/.test(value)
      || /\bcount\s*\(\s*case\s+when\s+(?:\w+\.)?cupom\s+is\s+null\s+then\s+1\s+end\s*\)/.test(value)
    );
    const hasFabricatedRows = /\bvalues\s*\(|\bunion(?:\s+all)?\b/.test(value);

    return {
      hasCorrectStructure: [
        hasFromPedidos,
        hasCountAll,
        hasCountCoupon,
        hasNullCount,
        hasDistinctCustomers,
        !hasFabricatedRows
      ].every(Boolean),
      checks: {
        hasFromPedidos,
        hasCountAll,
        hasCountCoupon,
        hasNullCount,
        hasDistinctCustomers,
        hasFabricatedRows
      }
    };
  }

  function validateCountNullsDistinctsResult(result, query, expectedMetrics) {
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    const columns = getColumns({ ...result, rows });
    const structure = validateCountNullsDistinctsQueryStructure(query);
    if (rows.length !== 1 || columns.length !== 4 || !structure.hasCorrectStructure) {
      return false;
    }

    const values = columns.map((column) => Number(rows[0][column]));
    if (values.some((value) => !Number.isFinite(value))) {
      return false;
    }

    const metrics = expectedMetrics || {
      total_pedidos: 8,
      pedidos_com_cupom: 3,
      pedidos_sem_cupom: 5,
      clientes_distintos: 5
    };
    const expectedValues = Object.values(metrics).map(Number).sort((left, right) => left - right);
    return JSON.stringify(values.sort((left, right) => left - right)) === JSON.stringify(expectedValues);
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

  async function createWorkbench(PGliteClass, datasetConfig) {
    const setupSql = buildSetupSql(datasetConfig);
    const db = new PGliteClass("memory://");
    await db.waitReady;
    await db.exec(setupSql);

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

  async function createBrowserWorkbench(datasetConfig) {
    const { PGlite } = await import(PGLITE_CDN_URL);
    return createWorkbench(PGlite, datasetConfig);
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
    validateCountNullsDistinctsQueryStructure,
    validateCountNullsDistinctsResult,
    validatePaidOrdersSummaryResult,
    validateOrdersByCategorySummaryResult,
    validatePaidOrdersWithCustomersResult,
    validateConfiguredResult,
    validateMissionQueryStructure,
    validateMissionResult
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.SqlPocEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
