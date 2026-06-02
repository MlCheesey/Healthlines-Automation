import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";
import { DATA_ROOT } from "@/lib/config/storage";

function safeName(value: string) {
  return String(value || "general")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "general";
}

function readSheet(filePath: string, sheetName: string) {
  if (!fs.existsSync(filePath)) return [];

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) return [];

  return XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const client = safeName(url.searchParams.get("client") || DEFAULT_CLIENT_ID);

  const masterPath = path.join(DATA_ROOT,
    "clients",
    client,
    "master.xlsx"
  );

  const approvals = readSheet(masterPath, "Invoice_Approvals");

  const approved = approvals.filter(
    (row: any) => String(row.decision || "") === "Approved"
  );

  return Response.json({
    success: true,
    client,
    count: approved.length,
    packages: approved.reverse(),
  });
}