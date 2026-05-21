import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

function readSheet(filePath: string, sheetName: string) {
  if (!fs.existsSync(filePath)) return [];

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) return [];

  return XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
}

export async function GET() {
  try {
    const clientsPath = path.join(process.cwd(), "data", "clients");

    const tasks: any[] = [];
    const issues: any[] = [];
    const logs: any[] = [];
    const mrns: any[] = [];

    if (!fs.existsSync(clientsPath)) {
      return Response.json({
        tasks,
        issues,
        logs,
        mrns,
        stats: {
          pending_deliveries: 0,
          open_issues: 0,
          ai_logs: 0,
          mrn_records: 0,
        },
      });
    }

    for (const client of fs.readdirSync(clientsPath)) {
      const clientPath = path.join(clientsPath, client);

      if (!fs.statSync(clientPath).isDirectory()) continue;

      const files = fs
        .readdirSync(clientPath)
        .filter((file) => file.endsWith(".xlsx") && file !== "master.xlsx");

      for (const file of files) {
        const location = file.replace(".xlsx", "");
        const filePath = path.join(clientPath, file);

        tasks.push(
          ...readSheet(filePath, "Active_Delivery_Tasks").map((row) => ({
            ...row,
            client,
            location: row.location || location,
          }))
        );

        issues.push(
          ...readSheet(filePath, "Issues").map((row) => ({
            ...row,
            client,
            location: row.location || location,
          }))
        );

        logs.push(
          ...readSheet(filePath, "AI_Log").map((row) => ({
            ...row,
            client,
            location: row.location || location,
          }))
        );

        mrns.push(
          ...readSheet(filePath, "MRN_Log").map((row) => ({
            ...row,
            client,
            location: row.location || location,
          }))
        );
      }
    }

    return Response.json({
      tasks,
      issues,
      logs,
      mrns,
      stats: {
        pending_deliveries: tasks.length,
        open_issues: issues.length,
        ai_logs: logs.length,
        mrn_records: mrns.length,
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        error: error.message || "Dashboard data failed",
      },
      { status: 500 }
    );
  }
}