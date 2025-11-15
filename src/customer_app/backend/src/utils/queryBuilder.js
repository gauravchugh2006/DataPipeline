const buildWhereClause = (filters = {}, allowedMap = {}) => {
  const entries = Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== "");
  const conditions = [];
  const values = [];

  entries.forEach(([key, value]) => {
    const column = allowedMap[key];
    if (!column) {
      return;
    }

    if (Array.isArray(value)) {
      const placeholders = value.map((_, index) => `$${values.length + index + 1}`);
      conditions.push(`${column} = ANY(ARRAY[${placeholders.join(",")}])`);
      values.push(...value);
      return;
    }

    const placeholder = `$${values.length + 1}`;
    if (typeof value === "string" && value.includes("%")) {
      conditions.push(`${column} LIKE ${placeholder}`);
    } else {
      conditions.push(`${column} = ${placeholder}`);
    }
    values.push(value);
  });

  if (!conditions.length) {
    return { where: "", values: [] };
  }

  return {
    where: ` WHERE ${conditions.join(" AND ")}`,
    values
  };
};

const buildSortClause = (sortBy, allowedColumns = []) => {
  if (!sortBy) {
    return "";
  }

  const [columnKey, direction = "asc"] = sortBy.split(":");
  const column = allowedColumns.find((allowed) => allowed === columnKey);
  if (!column) {
    return "";
  }

  const normalizedDirection = direction.toLowerCase() === "desc" ? "DESC" : "ASC";
  return ` ORDER BY ${column} ${normalizedDirection}`;
};

const buildPagination = (page = 1, pageSize = 25) => {
  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedPageSize = Math.min(200, Math.max(1, Number(pageSize) || 25));
  const offset = (normalizedPage - 1) * normalizedPageSize;
  return {
    limit: normalizedPageSize,
    offset,
    clause: ` LIMIT ${normalizedPageSize} OFFSET ${offset}`
  };
};

module.exports = {
  buildWhereClause,
  buildSortClause,
  buildPagination
};
