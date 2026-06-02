import { DATA_ROOT } from "@/lib/config/storage";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

function readSheet(filePath: string, sheetName: string) {
  try {
    if (!fs.existsSync(filePath)) return [];

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) return [];

    return XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
  } catch {
    return [];
  }
}

export async function GET() {
  const clientsDir = path.join(DATA_ROOT, "clients");
  const rows: any[] = [];

  if (fs.existsSync(clientsDir)) {
    for (const client of fs.readdirSync(clientsDir)) {
      const clientPath = path.join(clientsDir, client);

      if (!fs.statSync(clientPath).isDirectory()) continue;

      const masterPath = path.join(clientPath, "master.xlsx");
      const actions = readSheet(masterPath, "Pending_Actions");

      rows.push(
        ...actions
          .filter(
            (row: any) =>
              String(row.status || "").toLowerCase() !== "completed"
          )
          .map((row: any) => ({
            ...row,
            client,
          }))
      );
    }
  }

  return Response.json({
    success: true,
    count: rows.length,
    rows: rows.reverse(),
  });
}