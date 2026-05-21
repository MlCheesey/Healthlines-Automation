import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";

function safeName(value: string) {
  return String(value || "general")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "general";
}

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const client = safeName(url.searchParams.get("client") || DEFAULT_CLIENT_ID);

  const clientPath = path.join(process.cwd(), "data", "clients", client);

  if (!fs.existsSync(clientPath)) {
    return Response.json({
      success: true,
      client,
      rows: [],
    });
  }

  const rows: any[] = [];

  const files = fs
    .readdirSync(clientPath)
    .filter((file) => file.endsWith(".xlsx") && file !== "master.xlsx");

  for (const file of files) {
    const workbookPath = path.join(clientPath, file);
    const scheduleRows = readSheet(workbookPath, "Delivery_Schedule");

    rows.push(...scheduleRows);
  }

  rows.sort((a, b) =>
    String(a.delivery_date || "").localeCompare(String(b.delivery_date || ""))
  );

  return Response.json({
    success: true,
    client,
    count: rows.length,
    rows,
  });
}