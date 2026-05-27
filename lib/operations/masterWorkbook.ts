import { backupFile } from "@/lib/system/backup";
import { DATA_ROOT } from "@/lib/config/storage";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const MASTER_SHEETS = [
  "Master_PO",
  "MRN_Tracker",
  "Invoice_Tracker",
  "Pending_Actions",
  "Invoice_Approvals",
  "Issues",
  "AI_Log",
];

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeName(value: string) {
  return (
    String(value || "general")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "general"
  );
}

export function getMasterWorkbookPath(client: string) {
  return path.join(DATA_ROOT, "clients", safeName(client), "master.xlsx");
}

function createBlankMasterWorkbook() {
  const workbook = XLSX.utils.book_new();

  MASTER_SHEETS.forEach((sheetName) => {
    const worksheet = XLSX.utils.aoa_to_sheet([["created_at"]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  return workbook;
}

function writeWorkbook(workbook: XLSX.WorkBook, workbookPath: string) {
  ensureDir(path.dirname(workbookPath));

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  backupFile(workbookPath);
  fs.writeFileSync(workbookPath, buffer);
}

function readWorkbook(workbookPath: string) {
  const buffer = fs.readFileSync(workbookPath);

  return XLSX.read(buffer, {
    type: "buffer",
  });
}

export function createMasterWorkbook(client: string) {
  const workbookPath = getMasterWorkbookPath(client);

  ensureDir(path.dirname(workbookPath));

  if (!fs.existsSync(workbookPath)) {
    const workbook = createBlankMasterWorkbook();
    writeWorkbook(workbook, workbookPath);
  }

  return workbookPath;
}

export function appendMasterRow(
  client: string,
  sheetName: string,
  row: Record<string, any>
) {
  const workbookPath = createMasterWorkbook(client);

  let workbook: XLSX.WorkBook;

  try {
    workbook = readWorkbook(workbookPath);
  } catch {
    workbook = createBlankMasterWorkbook();
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