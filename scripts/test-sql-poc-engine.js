const assert = require("assert");
const { PGlite } = require("@electric-sql/pglite");
const {
  canValidateExecution,
  createWorkbench,
  isEvaluableResult,
  MAX_RESULT_ROWS,
  validateConfiguredResult,
  validateMissionQueryStructure,
  validateMissionResult
} = require("../src/sql-poc-engine");

async function run() {
  const workbench = await createWorkbench(PGlite);

  try {
    await assert.rejects(
      () => workbench.execute(""),
      /Digite uma consulta/i
    );

    await assert.rejects(
      () => workbench.execute("sele"),
      /consulta está incompleta/i
    );

    await assert.rejects(
      () => workbench.execute("select"),
      /consulta está incompleta/i
    );

    await assert.rejects(
      () => workbench.execute("select categoria count(*) from pedidos"),
      /syntax error/i
    );

    await assert.rejects(
      () => workbench.execute("select categoria, count(*)"),
      /does not exist|missing FROM-clause/i
    );

    const withoutWhere = await workbench.execute(
      "select categoria, count(*) from pedidos group by categoria"
    );
    assert.strictEqual(validateMissionResult(withoutWhere), false);

    const expectedWithoutWhereClause = await workbench.execute(
      "select categoria, count(*) filter (where status = 'pago') from pedidos group by categoria"
    );
    assert.strictEqual(validateMissionResult(expectedWithoutWhereClause), false);

    await assert.rejects(
      () => workbench.execute(
        "select categoria, count(*) from pedidos where status = 'pago'"
      ),
      /must appear in the GROUP BY/i
    );

    await assert.rejects(
      () => workbench.execute(
        "select categoria, count(*) from pedidos group by categoria where status = 'pago'"
      ),
      /syntax error/i
    );

    const categoryOnly = await workbench.execute("select categoria from pedidos");
    assert.strictEqual(validateMissionResult(categoryOnly), false);
    assert.strictEqual(isEvaluableResult(categoryOnly), true);

    const wrong = await workbench.execute(
      "select categoria, count(*) from pedidos where status = 'pendente' group by categoria"
    );
    assert.strictEqual(validateMissionResult(wrong), false);

    const correct = await workbench.execute(
      "select categoria, count(*) from pedidos where status = 'pago' group by categoria"
    );
    assert.strictEqual(validateMissionResult(correct), true);

    const multiline = await workbench.execute(`select
      categoria,
      count(*)
    from pedidos
    where status = 'pago'
    group by categoria`);
    assert.strictEqual(validateMissionResult(multiline), true);

    const aliased = await workbench.execute(
      "select categoria as grupo, count(*) as total from pedidos where status = 'pago' group by categoria"
    );
    assert.strictEqual(validateMissionResult(aliased), true);

    const fabricatedUnion = await workbench.execute(
      "select 'casa' as categoria, 1 as total union all select 'eletrônicos', 2 union all select 'livros', 2"
    );
    assert.strictEqual(validateMissionResult(fabricatedUnion), false);

    const fabricatedValues = await workbench.execute(
      "select * from (values ('casa', 1), ('eletrônicos', 2), ('livros', 2)) as resposta(categoria, total)"
    );
    assert.strictEqual(validateMissionResult(fabricatedValues), false);

    const fabricatedCte = await workbench.execute(`
      with resposta(categoria, total) as (
        values ('casa', 1), ('eletrônicos', 2), ('livros', 2)
      )
      select categoria, total from resposta
    `);
    assert.strictEqual(validateMissionResult(fabricatedCte), false);

    assert.strictEqual(
      validateMissionQueryStructure(
        "select categoria, count(*) from pedidos where status = 'pago' group by categoria"
      ).hasCorrectStructure,
      true
    );
    assert.strictEqual(
      validateMissionQueryStructure(
        "select categoria, count(*) from pedidos group by categoria"
      ).hasCorrectStructure,
      false
    );

    const limited = await workbench.execute(
      "select a.pedido_id from pedidos a cross join pedidos b cross join pedidos c"
    );
    assert.strictEqual(limited.rows.length, MAX_RESULT_ROWS);
    assert.strictEqual(limited.totalRows, 343);
    assert.strictEqual(limited.truncated, true);

    assert.strictEqual(
      canValidateExecution(correct, "select original", "select original"),
      true
    );
    assert.strictEqual(
      canValidateExecution(correct, "select original", "select alterado"),
      false
    );

    await assert.rejects(
      () => workbench.execute("select * from pedidos; select * from pedidos"),
      /apenas uma consulta/i
    );
    await assert.rejects(
      () => workbench.execute("select * from pedidos; delete from pedidos"),
      /apenas uma consulta/i
    );
    const semicolonInLiteral = await workbench.execute("select ';' as texto");
    assert.strictEqual(semicolonInLiteral.rows[0].texto, ";");

    for (const command of [
      "delete from pedidos",
      "update pedidos set status = 'pago'",
      "drop table pedidos",
      "alter table pedidos add column teste text",
      "insert into pedidos values (8, 'pago', 'casa', 10)"
    ]) {
      await assert.rejects(
        () => workbench.execute(command),
        /apenas consultas SELECT/i
      );
    }
  } finally {
    await workbench.close();
  }

  const configuredWorkbench = await createWorkbench(PGlite, {
    schemaConfig: {
      table: "pedidos",
      columns: [
        { name: "pedido_id", type: "integer", constraints: "primary key" },
        { name: "status", type: "text", constraints: "not null" },
        { name: "categoria", type: "text", constraints: "not null" },
        { name: "valor", type: "numeric(10,2)", constraints: "not null" }
      ]
    },
    seedData: [
      { pedido_id: 1, status: "pago", categoria: "eletrônicos", valor: 129.9 },
      { pedido_id: 2, status: "pendente", categoria: "eletrônicos", valor: 89.5 },
      { pedido_id: 3, status: "pago", categoria: "livros", valor: 54 },
      { pedido_id: 4, status: "pago", categoria: "eletrônicos", valor: 219 },
      { pedido_id: 5, status: "cancelado", categoria: "livros", valor: 45 },
      { pedido_id: 6, status: "pago", categoria: "casa", valor: 78.3 },
      { pedido_id: 7, status: "pago", categoria: "livros", valor: 36.5 }
    ]
  });

  try {
    const configuredResult = await configuredWorkbench.execute(
      "select categoria, count(*) from pedidos where status = 'pago' group by categoria"
    );
    assert.strictEqual(
      validateConfiguredResult(
        configuredResult,
        configuredResult.query,
        { validator: "paid_orders_by_category" },
        { rows: [["casa", 1], ["eletrônicos", 2], ["livros", 2]] }
      ),
      true
    );
  } finally {
    await configuredWorkbench.close();
  }

  await assert.rejects(
    () => createWorkbench(PGlite, {
      schemaConfig: {
        table: "pedidos; drop table profiles",
        columns: [{ name: "id", type: "integer" }]
      },
      seedData: []
    }),
    /identificador SQL invalido/i
  );

  console.log("SQL POC execution tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
