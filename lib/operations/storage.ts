import { backupFile } from "@/lib/system/backup";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const SHEETS = [
  "Active_Requirements",
  "Active_Delivery_Tasks",
  "Delivery_History",
  "MRN_Log",
  "Issues",
  "AI_Log",
  "Delivery_Schedule",
];

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeName(value: string) {
  return String(value || "general")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "general";
}

export function getClientPath(client: string) {
  return path.join(process.cwd(), "data", "clients", safeName(client));
}

export function getWorkbookPath(client: string, location: string) {
  return path.join(getClientPath(client), `${safeName(location)}.xlsx`);
}

function createBlankWorkbook() {
  const workbook = XLSX.utils.book_new();

  SHEETS.forEach((sheetName) => {
    const worksheet = XLSX.utils.aoa_to_sheet([["created_at"]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  return workbook;
}

function writeWorkbook(workbook: XLSX.WorkBook, workbookPath: string) {
  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  // Create backup before overwriting existing workbook
  backupFile(workbookPath);

  fs.writeFileSync(workbookPath, buffer);
}

function readWorkbook(workbookPath: string) {
  const buffer = fs.readFileSync(workbookPath);

  return XLSX.read(buffer, {
    type: "buffer",
  });
}

export function createLocationWorkbook(client: string, location: string) {
  const clientPath = getClientPath(client);
  ensureDir(clientPath);

  const workbookPath = getWorkbookPath(client, location);

  if (!fs.existsSync(workbookPath)) {
    const workbook = createBlankWorkbook();
    writeWorkbook(workbook, workbookPath);
  }

  return workbookPath;
}

export function appendRowToSheet(
  client: string,
  location: string,
  sheetName: string,
  row: Record<string, any>
) {
  const workbookPath = createLocationWorkbook(client, location);

  let workbook: XLSX.WorkBook;

  try {
    workbook = readWorkbook(workbookPath);
  } catch {
    workbook = createBlankWorkbook();
  }

  let worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    worksheet = XLSX.utils.aoa_to_sheet([["created_at"]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  const existingData = XLSX.utils.sheet_to_json<Record<string, any>>(
    worksheet,
    { defval: "" }
  );

  existingData.push({
    ...row,
    created_at: new Date().toISOString(),
  });

  workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(existingData);

  writeWorkbook(workbook, workbookPath);

  return workbookPath;
}