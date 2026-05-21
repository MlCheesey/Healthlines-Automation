import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

function readSheet(
  filePath: string,
  sheetName: string
) {
  try {
    if (!fs.existsSync(filePath))
      return [];

    const workbook =
      XLSX.readFile(filePath);

    const sheet =
      workbook.Sheets[sheetName];

    if (!sheet) return [];

    return XLSX.utils.sheet_to_json<any>(
      sheet,
      {
        defval: "",
      }
    );
  } catch {
    return [];
  }
}

export function checkDeliverySchedules(
  workbookPath: string
) {
  const rows = readSheet(
    workbookPath,
    "Delivery_Schedule"
  );

  const today = new Date();

  let overdue = 0;

  for (const row of rows) {
    if (!row.delivery_date)
      continue;

    const date = new Date(
      row.delivery_date
    );

    if (
      !isNaN(date.getTime()) &&
      date < today &&
      String(
        row.status || ""
      ).toLowerCase() !==
        "completed"
    ) {
      overdue += 1;
    }
  }

  return {
    overdue,
    total: rows.length,
  };
}