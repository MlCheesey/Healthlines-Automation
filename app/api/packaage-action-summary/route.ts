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

      for (const file of fs.readdirSync(clientPath)) {
        if (!file.endsWith(".xlsx") || file === "master.xlsx") continue;

        const workbookPath = path.join(clientPath, file);
        const deliveryRows = readSheet(workbookPath, "Delivery_History");

        rows.push(
          ...deliveryRows
            .filter((row: any) => row.invoice_status)
            .map((row: any) => ({
              client,
              location: row.location || file.replace(".xlsx", ""),
              po_number: row.po_number || "",
              dn_number: row.dn_number || "",
              invoice_number: row.invoice_number || "",
              invoice_status: row.invoice_status || "",
              mrn_status: row.mrn_status || "",
              invoice_package_id: row.invoice_package_id || "",
            }))
        );
      }
    }
  }

  return Response.json({
    success: true,
    count: rows.length,
    rows: rows.reverse(),
  });
}