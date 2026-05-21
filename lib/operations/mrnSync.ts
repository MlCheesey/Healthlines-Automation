import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { backupFile } from "@/lib/system/backup";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

function safeName(value: string) {
  return (
    String(value || "general")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "general"
  );
}

function readRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
}

function normalizeList(value: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((v) => String(v || "").trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function getLocationWorkbookPaths(client: string, location?: string) {
  const clientPath = path.join(
    process.cwd(),
    "data",
    "clients",
    safeName(client)
  );

  if (!fs.existsSync(clientPath)) return [];

  if (location && safeName(location) !== "general") {
    const exactPath = path.join(clientPath, `${safeName(location)}.xlsx`);

    if (fs.existsSync(exactPath)) {
      return [exactPath];
    }
  }

  return fs
    .readdirSync(clientPath)
    .filter((file) => file.endsWith(".xlsx") && file !== "master.xlsx")
    .map((file) => path.join(clientPath, file));
}

function rowMatches(row: any, dnNumbers: string[], poNumbers: string[]) {
  const rowDn = String(row.dn_number || row.dn_numbers || "").trim();
  const rowPo = String(row.po_number || row.po_numbers || "").trim();

  const dnMatch = dnNumbers.length > 0 && dnNumbers.includes(rowDn);
  const poMatch = poNumbers.length > 0 && poNumbers.includes(rowPo);

  return dnMatch || poMatch;
}

export function syncMrnReceivedToDeliveryHistory({
  client,
  location,
  dn_numbers,
  po_numbers,
  mrn_numbers,
}: {
  client: string;
  location?: string;
  dn_numbers?: string[] | string;
  po_numbers?: string[] | string;
  mrn_numbers?: string[] | string;
}) {
  try {
    const dnNumbers = normalizeList(dn_numbers);
    const poNumbers = normalizeList(po_numbers);
    const mrnNumbers = normalizeList(mrn_numbers);
    const mrnValue = mrnNumbers.join(", ");

    if (!mrnValue) {
      return {
        success: false,
        reason: "no_mrn_number_supplied",
        updated_rows: 0,
      };
    }

    if (dnNumbers.length === 0 && poNumbers.length === 0) {
      return {
        success: false,
        reason: "no_dn_or_po_reference_supplied",
        updated_rows: 0,
      };
    }

    const workbookPaths = getLocationWorkbookPaths(client, location);

    let updatedRows = 0;
    const updatedFiles: string[] = [];

    for (const workbookPath of workbookPaths) {
      let workbook: XLSX.WorkBook;

      try {
        workbook = XLSX.readFile(workbookPath);
      } catch (error) {
        logSystemError("syncMrnReceived_readWorkbook", {
          workbookPath,
          error,
        });
        continue;
      }

      let changed = false;

      for (const sheetName of ["Delivery_History", "MRN_Log"]) {
        const rows = readRows(workbook, sheetName);
        if (rows.length === 0) continue;

        const updated = rows.map((row: any) => {
          if (!rowMatches(row, dnNumbers, poNumbers)) return row;

          changed = true;
          updatedRows += 1;

          return {
            ...row,
            mrn_number: mrnValue,
            mrn_numbers: mrnValue,
            mrn_status: "Received",
            status:
              sheetName === "MRN_Log"
                ? "Received"
                : row.status || "MRN Received",
            mrn_received_at: new Date().toISOString(),
          };
        });

        workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(updated);
      }

      if (changed) {
        backupFile(workbookPath);
        XLSX.writeFile(workbook, workbookPath);
        updatedFiles.push(workbookPath);
      }
    }

    logSystemEvent(
      "mrn_received_synced",
      "MRN received synced into delivery history",
      {
        client,
        location: location || "",
        dn_numbers: dnNumbers,
        po_numbers: poNumbers,
        mrn_numbers: mrnNumbers,
        updated_rows: updatedRows,
        updated_files: updatedFiles,
      }
    );

    return {
      success: true,
      updated_rows: updatedRows,
      updated_files: updatedFiles,
    };
  } catch (error) {
    logSystemError("syncMrnReceivedToDeliveryHistory", error);
    throw error;
  }
}

export function markMrnOverdueInDeliveryHistory({
  client,
  location,
  dn_number,
  po_number,
}: {
  client: string;
  location?: string;
  dn_number?: string;
  po_number?: string;
}) {
  try {
    const dnNumbers = normalizeList(dn_number);
    const poNumbers = normalizeList(po_number);

    if (dnNumbers.length === 0 && poNumbers.length === 0) {
      return {
        success: false,
        reason: "no_dn_or_po_reference_supplied",
        updated_rows: 0,
      };
    }

    const workbookPaths = getLocationWorkbookPaths(client, location);

    let updatedRows = 0;
    const updatedFiles: string[] = [];

    for (const workbookPath of workbookPaths) {
      let workbook: XLSX.WorkBook;

      try {
        workbook = XLSX.readFile(workbookPath);
      } catch (error) {
        logSystemError("markMrnOverdue_readWorkbook", {
          workbookPath,
          error,
        });
        continue;
      }

      const rows = readRows(workbook, "Delivery_History");
      if (rows.length === 0) continue;

      let changed = false;

      const updated = rows.map((row: any) => {
        if (!rowMatches(row, dnNumbers, poNumbers)) return row;

        const mrnNumber = String(row.mrn_number || row.mrn_numbers || "").trim();

        if (mrnNumber) return row;

        changed = true;
        updatedRows += 1;

        return {
          ...row,
          mrn_status: "Overdue",
          status: row.status || "MRN Overdue",
          mrn_overdue_at: row.mrn_overdue_at || new Date().toISOString(),
        };
      });

      if (changed) {
        workbook.Sheets["Delivery_History"] = XLSX.utils.json_to_sheet(updated);
        backupFile(workbookPath);
        XLSX.writeFile(workbook, workbookPath);
        updatedFiles.push(workbookPath);
      }
    }

    logSystemEvent(
      "mrn_overdue_synced",
      "MRN overdue synced into delivery history",
      {
        client,
        location: location || "",
        dn_number,
        po_number,
        updated_rows: updatedRows,
        updated_files: updatedFiles,
      }
    );

    return {
      success: true,
      updated_rows: updatedRows,
      updated_files: updatedFiles,
    };
  } catch (error) {
    logSystemError("markMrnOverdueInDeliveryHistory", error);
    throw error;
  }
}