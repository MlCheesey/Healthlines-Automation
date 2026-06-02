import { DATA_ROOT } from "@/lib/config/storage";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

function readSheet(filePath: string, sheetName: string): any[] {
  try {
    if (!fs.existsSync(filePath)) return [];

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) return [];

    return XLSX.utils.sheet_to_json<any>(sheet, {
      defval: "",
    });
  } catch {
    return [];
  }
}

export async function GET() {
  const clientsDir = path.join(DATA_ROOT, "clients");

  const summary: {
    pending_actions: any[];
    mrn_tracker: any[];
    invoice_tracker: any[];
    issues: any[];
  } = {
    pending_actions: [],
    mrn_tracker: [],
    invoice_tracker: [],
    issues: [],
  };

  if (fs.existsSync(clientsDir)) {
    const clients = fs
      .readdirSync(clientsDir)
      .filter((client) =>
        fs.statSync(path.join(clientsDir, client)).isDirectory()
      );

    for (const client of clients) {
      const masterPath = path.join(clientsDir, client, "master.xlsx");

      summary.pending_actions.push(
        ...readSheet(masterPath, "Pending_Actions")
      );

      summary.mrn_tracker.push(
        ...readSheet(masterPath, "MRN_Tracker")
      );

      summary.invoice_tracker.push(
        ...readSheet(masterPath, "Invoice_Tracker")
      );

      summary.issues.push(
        ...readSheet(masterPath, "Issues")
      );
    }
  }

  return Response.json({
    success: true,
    counts: {
      pending_actions: summary.pending_actions.length,
      mrn_tracker: summary.mrn_tracker.length,
      invoice_tracker: summary.invoice_tracker.length,
      issues: summary.issues.length,
    },
    summary,
  });
}