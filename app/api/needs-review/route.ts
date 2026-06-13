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

function isReviewRow(row: any) {
  const status = String(row.status || "").toLowerCase();
  const actionType = String(row.action_type || "").toLowerCase();
  const emailType = String(row.email_type || "").toLowerCase();
  const reason = String(row.reason || "").toLowerCase();

  return (
    status.includes("review") ||
    status.includes("error") ||
    status.includes("duplicate") ||
    emailType === "other" ||
    actionType.includes("review") ||
    reason.includes("no items") ||
    reason.includes("low confidence") ||
    reason.includes("not extracted")
  );
}

export async function GET() {
  const clientsDir = path.join(DATA_ROOT, "clients");
  const rows: any[] = [];

  if (!fs.existsSync(clientsDir)) {
    return Response.json({ success: true, count: 0, rows: [] });
  }

  for (const client of fs.readdirSync(clientsDir)) {
    const clientPath = path.join(clientsDir, client);

    if (!fs.statSync(clientPath).isDirectory()) continue;

    const masterPath = path.join(clientPath, "master.xlsx");

    const emailAudit = readSheet(masterPath, "Email_Audit");
    const pendingActions = readSheet(masterPath, "Pending_Actions");
    const aiLog = readSheet(masterPath, "AI_Log");

    rows.push(
      ...emailAudit.filter(isReviewRow).map((row: any) => ({
        source: "Email_Audit",
        client,
        location: row.location || "general",
        ...row,
      }))
    );

    rows.push(
      ...pendingActions.filter(isReviewRow).map((row: any) => ({
        source: "Pending_Actions",
        client,
        location: row.location || "general",
        ...row,
      }))
    );

    rows.push(
      ...aiLog.filter(isReviewRow).map((row: any) => ({
        source: "AI_Log",
        client,
        location: row.location || "general",
        ...row,
      }))
    );
  }

  return Response.json({
    success: true,
    count: rows.length,
    rows: rows.reverse(),
  });
}