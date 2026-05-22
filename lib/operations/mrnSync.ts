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

function normalize(value: any) {
  return String(value || "").trim().toLowerCase();
}

function readRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
}

export function syncMrnReceivedToDeliveryHistory({
  client,
  location,
  dn_numbers = [],
  po_numbers = [],
  mrn_numbers = [],
}: {
  client: string;
  location: string;
  dn_numbers?: string[];
  po_numbers?: string[];
  mrn_numbers?: string[];
}) {
  try {
    const workbookPath = path.join(
      process.cwd(),
      "data",
      "clients",
      safeName(client),
      `${safeName(location)}.xlsx`
    );

    if (!fs.existsSync(workbookPath)) {
      return {
        success: false,
        updated_rows: 0,
        message: "Location workbook not found",
      };
    }

    const workbook = XLSX.readFile(workbookPath);
    const rows = readRows(workbook, "Delivery_History");

    if (rows.length === 0) {
      return {
        success: true,
        updated_rows: 0,
        message: "No Delivery_History rows found",
      };
    }

    const dnSet = new Set(dn_numbers.map(normalize).filter(Boolean));
    const poSet = new Set(po_numbers.map(normalize).filter(Boolean));
    const mrnValue = mrn_numbers.filter(Boolean).join(", ");

    let updatedRows = 0;

    const updated = rows.map((row: any) => {
      const rowDn = normalize(row.dn_number);
      const rowPo = normalize(row.po_number);

      const matchesDn = dnSet.size > 0 && dnSet.has(rowDn);
      const matchesPo = poSet.size > 0 && poSet.has(rowPo);

      if (!matchesDn && !matchesPo) return row;

      updatedRows += 1;

      return {
        ...row,
        mrn_number: mrnValue || row.mrn_number || "",
        mrn_status: "Received",
        mrn_received_at: new Date().toISOString(),
      };
    });

    if (updatedRows > 0) {
      workbook.Sheets["Delivery_History"] = XLSX.utils.json_to_sheet(updated);
      backupFile(workbookPath);
      XLSX.writeFile(workbook, workbookPath);

      logSystemEvent("mrn_synced_to_delivery_history", "MRN synced to delivery history", {
        client,
        location,
        dn_numbers,
        po_numbers,
        mrn_numbers,
        updated_rows: updatedRows,
      });
    }

    return {
      success: true,
      updated_rows: updatedRows,
    };
  } catch (error: any) {
    logSystemError("syncMrnReceivedToDeliveryHistory", error);

    return {
      success: false,
      updated_rows: 0,
      error: error?.message || String(error),
    };
  }
}

export function markMrnOverdueInDeliveryHistory({
  client,
  location,
  dn_number,
}: {
  client: string;
  location: string;
  dn_number: string;
}) {
  return syncMrnReceivedToDeliveryHistory({
    client,
    location,
    dn_numbers: [dn_number],
    po_numbers: [],
    mrn_numbers: [],
  });
}