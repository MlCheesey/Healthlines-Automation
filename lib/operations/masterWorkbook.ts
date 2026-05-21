import { backupFile } from "@/lib/system/backup";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const MASTER_SHEETS = [
  "PO_Control",
  "Location_Summary",
  "Pending_Actions",
  "MRN_Tracker",
  "Invoice_Tracker",
  "AI_Log",
];

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function safeName(value: string) {
  return String(value || "general")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "general";
}

export function getMasterWorkbookPath(client: string) {
  const clientPath = path.join(process.cwd(), "data", "clients", safeName(client));
  ensureDir(clientPath);
  return path.join(clientPath, "master.xlsx");
}

function createBlankMasterWorkbook() {
  const workbook = XLSX.utils.book_new();

  MASTER_SHEETS.forEach((sheetName) => {
    const worksheet = XLSX.utils.aoa_to_sheet([["created_at"]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  return workbook;
}

function writeWorkbook(workbook: XLSX.WorkBook, filePath: string) {
  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  backupFile(filePath);
  
  fs.writeFileSync(filePath, buffer);
}

function readWorkbook(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  return XLSX.read(buffer, { type: "buffer" });
}

export function ensureMasterWorkbook(client: string) {
  const filePath = getMasterWorkbookPath(client);

  if (!fs.existsSync(filePath)) {
    const workbook = createBlankMasterWorkbook();
    writeWorkbook(workbook, filePath);
  }

  return filePath;
}

export function appendMasterRow(
  client: string,
  sheetName: string,
  row: Record<string, any>
) {
  const filePath = ensureMasterWorkbook(client);

  let workbook: XLSX.WorkBook;

  try {
    workbook = readWorkbook(filePath);
  } catch {
    workbook = createBlankMasterWorkbook();
  }

  let worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    worksheet = XLSX.utils.aoa_to_sheet([["created_at"]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  const existingData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: "",
  });

  existingData.push({
    ...row,
    created_at: new Date().toISOString(),
  });

  workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(existingData);
  writeWorkbook(workbook, filePath);

  return filePath;
}