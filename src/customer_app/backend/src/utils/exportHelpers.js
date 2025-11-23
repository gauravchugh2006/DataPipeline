import ExcelJS from "exceljs";

const sanitizeFilename = (name) =>
  name
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

export const streamCsv = (res, filename, columns, rows) => {
  const safeName = sanitizeFilename(filename) || "export";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName}.csv"`
  );

  const headers = columns.map((column) => column.header);
  res.write(`\uFEFF${headers.join(",")}\n`);

  for (const row of rows) {
    const values = columns.map(({ key, formatter }) => {
      const value = formatter ? formatter(row[key], row) : row[key];
      if (value === undefined || value === null) {
        return "";
      }
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    res.write(`${values.join(",")}\n`);
  }

  res.end();
};

export const streamXlsx = async (res, filename, columns, rows) => {
  const safeName = sanitizeFilename(filename) || "export";
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName}.xlsx"`
  );

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data");

  worksheet.columns = columns.map(({ header, key, width }) => ({
    header,
    key,
    width: width || header.length + 4,
  }));

  rows.forEach((row) => {
    const prepared = {};
    columns.forEach(({ key, formatter }) => {
      const value = formatter ? formatter(row[key], row) : row[key];
      prepared[key] = value === undefined ? null : value;
    });
    worksheet.addRow(prepared);
  });

  await workbook.xlsx.write(res);
  res.end();
};

