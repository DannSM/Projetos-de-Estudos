const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const {
  validateWhereJanuarySql,
  validateCountRowsExpression,
  validatePaidOrdersByCategorySql,
  validateCountNullsDistinctsSql,
  validatePaidOrdersSummarySql,
  validateOrdersByCategorySummarySql,
  validatePaidOrdersWithCustomersSql,
  validateConfiguredSql
} = require("../src/sql-mission-validation");

function expectStatus(label, actual, expected) {
  assert.strictEqual(actual.status, expected, `${label}: expected ${expected}, got ${actual.status}`);
}

function expectNotCorrect(label, actual) {
  assert.notStrictEqual(actual.status, "correct", `${label}: expected not correct`);
}

const browserWindow = {};
const browserSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "sql-mission-validation.js"),
  "utf8"
);
vm.runInNewContext(browserSource, { window: browserWindow });
assert.strictEqual(
  typeof browserWindow.SqlMissionValidation?.validateCountNullsDistinctsSql,
  "function",
  "Contrato do navegador deve expor validateCountNullsDistinctsSql"
);

expectStatus(
  "Missão 1 aceita filtro completo",
  validateWhereJanuarySql("where status = 'pago' and data_pedido >= '2026-01-01' and data_pedido < '2026-02-01'"),
  "correct"
);
expectNotCorrect("Missão 1 rejeita só status", validateWhereJanuarySql("where status = 'pago'"));
expectNotCorrect("Missão 1 rejeita só data", validateWhereJanuarySql("where data_pedido >= '2026-01-01'"));
expectNotCorrect(
  "Missão 1 rejeita data incompleta",
  validateWhereJanuarySql("where status = 'pago' and data_pedido >= '2026-01-01'")
);

expectStatus("Missão 2 aceita count(*)", validateCountRowsExpression("count(*)"), "correct");
expectNotCorrect("Missão 2 rejeita count(cliente_id)", validateCountRowsExpression("count(cliente_id)"));
expectNotCorrect(
  "Missão 2 rejeita count(distinct cliente_id)",
  validateCountRowsExpression("count(distinct cliente_id)")
);

expectStatus(
  "Missão 3 aceita query correta",
  validatePaidOrdersByCategorySql("select categoria, count(*) from pedidos where status = 'pago' group by categoria"),
  "correct"
);
expectStatus(
  "Missão 3 aceita query correta com quebras",
  validatePaidOrdersByCategorySql(`select
  categoria,
  count(*)
from pedidos
where status = 'pago'
group by categoria`),
  "correct"
);
expectNotCorrect(
  "Missão 3 rejeita query sem vírgula",
  validatePaidOrdersByCategorySql("select categoria count(*) from pedidos where status = 'pago' group by categoria")
);
expectNotCorrect(
  "Missão 3 rejeita query sem where",
  validatePaidOrdersByCategorySql("select categoria, count(*) from pedidos group by categoria")
);
expectNotCorrect(
  "Missão 3 rejeita query sem group by",
  validatePaidOrdersByCategorySql("select categoria, count(*) from pedidos where status = 'pago'")
);
expectNotCorrect(
  "Missão 3 rejeita where depois do group by",
  validatePaidOrdersByCategorySql("select categoria, count(*) from pedidos group by categoria where status = 'pago'")
);
expectNotCorrect(
  "Missão 3 rejeita group by categ",
  validatePaidOrdersByCategorySql("select categoria, count(*) from pedidos where status = 'pago' group by categ")
);
expectNotCorrect(
  "Missão 3 rejeita texto incompleto",
  validatePaidOrdersByCategorySql("select categoria, count(*) from pedidos where group by categoria")
);

expectStatus(
  "Etapa 2 aceita contagens completas",
  validateCountNullsDistinctsSql(`
    select
      count(*) as total_pedidos,
      count(cupom) as pedidos_com_cupom,
      count(*) - count(cupom) as pedidos_sem_cupom,
      count(distinct cliente_id) as clientes_distintos
    from pedidos
  `),
  "correct"
);
expectNotCorrect(
  "Etapa 2 rejeita apenas count total",
  validateCountNullsDistinctsSql("select count(*) from pedidos")
);
expectNotCorrect(
  "Etapa 2 rejeita consulta sem clientes distintos",
  validateCountNullsDistinctsSql("select count(*), count(cupom), count(*) - count(cupom) from pedidos")
);
expectNotCorrect(
  "Etapa 2 rejeita select estrela",
  validateCountNullsDistinctsSql("select * from pedidos")
);

expectStatus(
  "Etapa 3 aceita filtro antes das agregacoes",
  validatePaidOrdersSummarySql(
    "select count(*) as total, sum(valor) as valor_total from pedidos where status = 'pago'"
  ),
  "correct"
);
expectNotCorrect(
  "Etapa 3 rejeita resumo sem filtro",
  validatePaidOrdersSummarySql("select count(*), sum(valor) from pedidos")
);

expectStatus(
  "Etapa 4 aceita resumo por categoria",
  validateOrdersByCategorySummarySql(
    "select categoria, count(*) as total, sum(valor) as valor_total from pedidos group by categoria"
  ),
  "correct"
);
expectNotCorrect(
  "Etapa 4 rejeita resumo sem group by",
  validateOrdersByCategorySummarySql("select categoria, count(*), sum(valor) from pedidos")
);

expectStatus(
  "Etapa 5 aceita join de pedidos e clientes",
  validatePaidOrdersWithCustomersSql(`
    select p.pedido_id, c.nome, p.valor
    from pedidos p
    join clientes c on c.cliente_id = p.cliente_id
    where p.status = 'pago'
  `),
  "correct"
);
expectNotCorrect(
  "Etapa 5 rejeita join sem filtro de pagos",
  validatePaidOrdersWithCustomersSql(
    "select p.pedido_id, c.nome, p.valor from pedidos p join clientes c on c.cliente_id = p.cliente_id"
  )
);
expectStatus(
  "Dispatcher usa o validator configurado",
  validateConfiguredSql(
    "select count(*), sum(valor) from pedidos where status = 'pago'",
    "paid_orders_summary"
  ),
  "correct"
);

console.log("SQL mission validation tests passed");
