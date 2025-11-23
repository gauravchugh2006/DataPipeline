const ExcelJS = require("exceljs");
const { Readable } = require("stream");

const streamRowsAsCsv = (res, rows, columns, filename = "export.csv") => {
  const safeColumns = columns && columns.length ? columns : Object.keys(rows[0] || {});
  const header = `${safeColumns.join(",")}`;
  const csvRows = rows.map((row) =>
    safeColumns
      .map((column) => {
        const value = row[column];
        if (value === null || value === undefined) {
          return "";
        }
        const stringValue = String(value);
        return stringValue.includes(",") || stringValue.includes("\"")
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      })
      .join(",")
  );
  const payload = [header, ...csvRows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

  Readable.from([payload]).pipe(res);
};

const streamRowsAsWorkbook = async (res, rows, columns, filename = "export.xlsx") => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("data");

  const safeColumns = columns && columns.length ? columns : Object.keys(rows[0] || {});
  sheet.columns = safeColumns.map((column) => ({ header: column, key: column, width: 20 }));

  rows.forEach((row) => {
    sheet.addRow(row);
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  streamRowsAsCsv,
  streamRowsAsWorkbook
};
