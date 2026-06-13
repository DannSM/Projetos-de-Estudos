(function initSqlMissionValidation(globalScope) {
  function normalizeSql(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\u201c\u201d]/g, "\"")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/["`]/g, "'")
      .replace(/\s+/g, " ")
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s*;\s*$/g, "")
      .trim();
  }

  function hasDangerousSql(value) {
    return /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke)\b/.test(value);
  }

  function hasStatusPaidFilter(value) {
    return /\bstatus\s*=\s*'pago'(?=\s|$|;)/.test(value);
  }

  function hasJanuaryStartFilter(value) {
    return /\bdata_pedido\s*>=\s*'2026-01-01'(?=\s|$|;)/.test(value);
  }

  function hasJanuaryEndFilter(value) {
    return /\bdata_pedido\s*<\s*'2026-02-01'(?=\s|$|;)/.test(value);
  }

  function hasCountStar(value) {
    return /\bcount\s*\(\s*\*\s*\)/.test(value);
  }

  function indexOfToken(value, token) {
    const match = value.match(new RegExp("\\b" + token + "\\b"));
    return match ? match.index : -1;
  }

  function validateWhereJanuarySql(rawValue) {
    const value = normalizeSql(rawValue);
    const hasWhere = /\bwhere\b/.test(value);
    const hasStatusPaid = hasStatusPaidFilter(value);
    const hasStart = hasJanuaryStartFilter(value);
    const hasEnd = hasJanuaryEndFilter(value);

    if (hasWhere && hasStatusPaid && hasStart && hasEnd && !hasDangerousSql(value)) {
      return { status: "correct", checks: { hasWhere, hasStatusPaid, hasStart, hasEnd } };
    }

    const partialScore = [hasWhere, hasStatusPaid, hasStart, hasEnd].filter(Boolean).length;
    return {
      status: partialScore >= 2 ? "partial" : "incorrect",
      checks: { hasWhere, hasStatusPaid, hasStart, hasEnd }
    };
  }

  function validateCountRowsExpression(rawValue) {
    const value = normalizeSql(rawValue);
    const isCountStar = /^count\s*\(\s*\*\s*\)$/.test(value);
    const isColumnCount = /^count\s*\(\s*cliente_id\s*\)$/.test(value);
    const isDistinctCount = /^count\s*\(\s*distinct\s+cliente_id\s*\)$/.test(value);

    if (isCountStar) {
      return { status: "correct", checks: { isCountStar, isColumnCount, isDistinctCount } };
    }

    return {
      status: isColumnCount ? "partial" : "incorrect",
      checks: { isCountStar, isColumnCount, isDistinctCount }
    };
  }

  function validatePaidOrdersByCategorySql(rawValue) {
    const value = normalizeSql(rawValue);
    const selectIndex = indexOfToken(value, "select");
    const fromIndex = indexOfToken(value, "from");
    const whereIndex = indexOfToken(value, "where");
    const groupIndex = value.search(/\bgroup\s+by\b/);
    const selectList = selectIndex === 0 && fromIndex > selectIndex
      ? value.slice("select".length, fromIndex).trim()
      : "";

    const startsWithSelect = selectIndex === 0;
    const hasCategoria = /\bcategoria\b/.test(value);
    const hasSelectComma = /^categoria\s*,\s*count\s*\(\s*\*\s*\)$/.test(selectList);
    const hasFromPedidos = /\bfrom\s+pedidos\b/.test(value);
    const hasWhere = whereIndex > -1;
    const hasStatusPaid = hasStatusPaidFilter(value);
    const hasGroupByCategoria = /\bgroup\s+by\s+categoria\b/.test(value);
    const hasWhereBeforeGroupBy = hasWhere && groupIndex > whereIndex;
    const hasBrokenWhere = /\bwhere\s+group\s+by\b/.test(value);
    const hasInvalidClauseOrder = groupIndex > -1 && whereIndex > groupIndex;
    const isSelectOnly = startsWithSelect && !hasDangerousSql(value);
    const hasCorrectStructure = [
      startsWithSelect,
      hasSelectComma,
      hasCountStar(value),
      hasFromPedidos,
      hasWhere,
      hasStatusPaid,
      hasGroupByCategoria,
      hasWhereBeforeGroupBy,
      isSelectOnly
    ].every(Boolean);

    const checks = {
      startsWithSelect,
      hasCategoria,
      hasSelectComma,
      hasCountStar: hasCountStar(value),
      hasFromPedidos,
      hasWhere,
      hasStatusPaid,
      hasGroupByCategoria,
      hasWhereBeforeGroupBy,
      hasBrokenWhere,
      hasInvalidClauseOrder,
      isSelectOnly
    };

    if (hasCorrectStructure && !hasBrokenWhere && !hasInvalidClauseOrder) {
      return { status: "correct", checks };
    }

    if (hasBrokenWhere || hasInvalidClauseOrder || !startsWithSelect || hasDangerousSql(value)) {
      return { status: "incorrect", checks };
    }

    const partialScore = [
      hasCategoria,
      hasCountStar(value),
      hasFromPedidos,
      hasWhere,
      hasStatusPaid,
      hasGroupByCategoria
    ].filter(Boolean).length;

    return {
      status: partialScore >= 3 ? "partial" : "incorrect",
      checks
    };
  }

  function validateCountNullsDistinctsSql(rawValue) {
    const value = normalizeSql(rawValue);
    const startsWithSelect = /^select\b/.test(value);
    const hasFromPedidos = /\bfrom\s+pedidos\b/.test(value);
    const hasCountAll = /\bcount\s*\(\s*(?:\*|1|pedido_id)\s*\)/.test(value);
    const hasCountCoupon = /\bcount\s*\(\s*cupom\s*\)/.test(value);
    const hasDistinctCustomers = /\bcount\s*\(\s*distinct\s+cliente_id\s*\)/.test(value);
    const hasNullCount = (
      /\bcount\s*\(\s*(?:\*|1|pedido_id)\s*\)\s*-\s*count\s*\(\s*cupom\s*\)/.test(value)
      || /\bsum\s*\(\s*case\s+when\s+cupom\s+is\s+null\s+then\s+1\s+else\s+0\s+end\s*\)/.test(value)
      || /\bcount\s*\(\s*(?:\*|1|pedido_id)\s*\)\s+filter\s*\(\s*where\s+cupom\s+is\s+null\s*\)/.test(value)
      || /\bcount\s*\(\s*case\s+when\s+cupom\s+is\s+null\s+then\s+1\s+end\s*\)/.test(value)
    );
    const isSelectOnly = startsWithSelect && !hasDangerousSql(value);
    const checks = {
      startsWithSelect,
      hasFromPedidos,
      hasCountAll,
      hasCountCoupon,
      hasNullCount,
      hasDistinctCustomers,
      isSelectOnly
    };

    if (Object.values(checks).every(Boolean)) {
      return { status: "correct", checks };
    }

    if (!startsWithSelect || !hasFromPedidos || !isSelectOnly) {
      return { status: "incorrect", checks };
    }

    return {
      status: [hasCountAll, hasCountCoupon, hasNullCount, hasDistinctCustomers].filter(Boolean).length >= 2
        ? "partial"
        : "incorrect",
      checks
    };
  }

  function validatePaidOrdersSummarySql(rawValue) {
    const value = normalizeSql(rawValue);
    const startsWithSelect = /^select\b/.test(value);
    const hasFromPedidos = /\bfrom\s+(?:(?:public\.)?pedidos)\b/.test(value);
    const hasStatusPaid = /\b(?:\w+\.)?status\s*=\s*'pago'(?=\s|$|;)/.test(value);
    const hasCount = /\bcount\s*\(\s*(?:\*|1|(?:\w+\.)?pedido_id)\s*\)/.test(value);
    const hasSumValue = /\bsum\s*\(\s*(?:\w+\.)?valor\s*\)/.test(value);
    const isSelectOnly = startsWithSelect && !hasDangerousSql(value);
    const checks = {
      startsWithSelect,
      hasFromPedidos,
      hasStatusPaid,
      hasCount,
      hasSumValue,
      isSelectOnly
    };

    if (Object.values(checks).every(Boolean)) {
      return { status: "correct", checks };
    }

    return {
      status: startsWithSelect && hasFromPedidos && isSelectOnly
        && [hasStatusPaid, hasCount, hasSumValue].filter(Boolean).length >= 2
        ? "partial"
        : "incorrect",
      checks
    };
  }

  function validateOrdersByCategorySummarySql(rawValue) {
    const value = normalizeSql(rawValue);
    const startsWithSelect = /^select\b/.test(value);
    const hasFromPedidos = /\bfrom\s+(?:(?:public\.)?pedidos)\b/.test(value);
    const hasCategoria = /\b(?:\w+\.)?categoria\b/.test(value);
    const hasCount = /\bcount\s*\(\s*(?:\*|1|(?:\w+\.)?pedido_id)\s*\)/.test(value);
    const hasSumValue = /\bsum\s*\(\s*(?:\w+\.)?valor\s*\)/.test(value);
    const hasGroupByCategoria = /\bgroup\s+by\s+(?:\w+\.)?categoria\b/.test(value);
    const isSelectOnly = startsWithSelect && !hasDangerousSql(value);
    const checks = {
      startsWithSelect,
      hasFromPedidos,
      hasCategoria,
      hasCount,
      hasSumValue,
      hasGroupByCategoria,
      isSelectOnly
    };

    if (Object.values(checks).every(Boolean)) {
      return { status: "correct", checks };
    }

    return {
      status: startsWithSelect && hasFromPedidos && isSelectOnly
        && [hasCategoria, hasCount, hasSumValue, hasGroupByCategoria].filter(Boolean).length >= 3
        ? "partial"
        : "incorrect",
      checks
    };
  }

  function validatePaidOrdersWithCustomersSql(rawValue) {
    const value = normalizeSql(rawValue);
    const startsWithSelect = /^select\b/.test(value);
    const hasPedidos = /\bpedidos\b/.test(value);
    const hasClientes = /\bclientes\b/.test(value);
    const hasJoin = /\bjoin\b/.test(value);
    const hasCustomerJoin = /\bon\s+(?:\w+\.)?cliente_id\s*=\s*(?:\w+\.)?cliente_id\b/.test(value);
    const hasStatusPaid = /\b(?:\w+\.)?status\s*=\s*'pago'(?=\s|$|;)/.test(value);
    const hasPedidoId = /\b(?:\w+\.)?pedido_id\b/.test(value);
    const hasNome = /\b(?:\w+\.)?nome\b/.test(value);
    const hasValor = /\b(?:\w+\.)?valor\b/.test(value);
    const isSelectOnly = startsWithSelect && !hasDangerousSql(value);
    const checks = {
      startsWithSelect,
      hasPedidos,
      hasClientes,
      hasJoin,
      hasCustomerJoin,
      hasStatusPaid,
      hasPedidoId,
      hasNome,
      hasValor,
      isSelectOnly
    };

    if (Object.values(checks).every(Boolean)) {
      return { status: "correct", checks };
    }

    return {
      status: startsWithSelect && hasPedidos && hasClientes && isSelectOnly
        && [hasJoin, hasCustomerJoin, hasStatusPaid, hasPedidoId, hasNome, hasValor].filter(Boolean).length >= 4
        ? "partial"
        : "incorrect",
      checks
    };
  }

  function validateConfiguredSql(rawValue, validator) {
    const validators = {
      count_nulls_distincts: validateCountNullsDistinctsSql,
      orders_by_category_summary: validateOrdersByCategorySummarySql,
      paid_orders_by_category: validatePaidOrdersByCategorySql,
      paid_orders_summary: validatePaidOrdersSummarySql,
      paid_orders_with_customers: validatePaidOrdersWithCustomersSql
    };
    return (validators[validator] || validatePaidOrdersByCategorySql)(rawValue);
  }

  const api = {
    normalizeSql,
    validateWhereJanuarySql,
    validateCountRowsExpression,
    validatePaidOrdersByCategorySql,
    validateCountNullsDistinctsSql,
    validatePaidOrdersSummarySql,
    validateOrdersByCategorySummarySql,
    validatePaidOrdersWithCustomersSql,
    validateConfiguredSql
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.SqlMissionValidation = api;
})(typeof window !== "undefined" ? window : globalThis);
