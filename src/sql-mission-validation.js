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

  const api = {
    normalizeSql,
    validateWhereJanuarySql,
    validateCountRowsExpression,
    validatePaidOrdersByCategorySql
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.SqlMissionValidation = api;
})(typeof window !== "undefined" ? window : globalThis);
