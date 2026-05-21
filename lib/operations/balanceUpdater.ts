import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { backupFile } from "@/lib/system/backup";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

function safeName(value: string) {
  return String(value || "general")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "general";
}

function readRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
}

export function updateBalanceAfterDelivery({
  client,
  location,
  po_number,
  item_name,
  delivered_qty,
}: {
  client: string;
  location: string;
  po_number: string;
  item_name: string;
  delivered_qty: number;
}) {
  try {
    const workbookPath = path.join(
      process.cwd(),
      "data",
      "clients",
      safeName(client),
      `${safeName(location)}.xlsx`
    );

    if (!fs.existsSync(workbookPath)) return;

    const workbook = XLSX.readFile(workbookPath);
    const rows = readRows(workbook, "Active_Requirements");

    if (rows.length === 0) return;

    let changed = false;

    const updatedRows = rows.map((row: any) => {
      const samePO = String(row.po_number || "") === String(po_number || "");
      const sameItem =
        String(row.item_name || "").trim().toLowerCase() ===
        String(item_name || "").trim().toLowerCase();

      if (!samePO || !sameItem) return row;

      const requiredQty = Number(row.required_qty || 0);
      const existingDelivered = Number(row.delivered_qty || 0);
      const newDelivered = existingDelivered + Number(delivered_qty || 0);
      const newBalance = Math.max(0, requiredQty - newDelivered);

      changed = true;

      return {
        ...row,
        delivered_qty: newDelivered,
        balance_qty: newBalance,
        status: newBalance <= 0 ? "Completed" : "Partially Delivered",
        last_delivery_update_at: new Date().toISOString(),
      };
    });

    if (changed) {
      workbook.Sheets["Active_Requirements"] = XLSX.utils.json_to_sheet(updatedRows);
      backupFile(workbookPath);
      XLSX.writeFile(workbook, workbookPath);

      logSystemEvent("po_balance_updated", "PO balance updated after delivery", {
        client,
        location,
        po_number,
        item_name,
        delivered_qty,
      });
    }
  } catch (error) {
    logSystemError("updateBalanceAfterDelivery", error);
  }
}