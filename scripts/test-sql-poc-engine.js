const assert = require("assert");
const { PGlite } = require("@electric-sql/pglite");
const {
  canValidateExecution,
  createWorkbench,
  isEvaluableResult,
  validateMissionResult
} = require("../src/sql-poc-engine");

async function run() {
  const workbench = await createWorkbench(PGlite);

  try {
    await assert.rejects(
      () => workbench.execute(""),
      /Digite uma consulta/i
    );

    const selectOnly = await workbench.execute("select");
    assert.strictEqual(validateMissionResult(selectOnly), false);
    assert.strictEqual(isEvaluableResult(selectOnly), false);
    assert.strictEqual(canValidateExecution(selectOnly, "select", "select"), false);

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

    assert.strictEqual(
      canValidateExecution(correct, "select original", "select original"),
      true
    );
    assert.strictEqual(
      canValidateExecution(correct, "select original", "select alterado"),
      false
    );

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

  console.log("SQL POC execution tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
