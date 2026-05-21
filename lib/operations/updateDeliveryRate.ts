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

export function updateDeliveryRate({
  client,
  location,
  dn_number,
  item_name,
  rate,
}: {
  client: string;
  location: string;
  dn_number: string;
  item_name: string;
  rate: number;
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
      throw new Error(`Workbook not found: ${workbookPath}`);
    }

    const workbook = XLSX.readFile(workbookPath);
    const sheet = workbook.Sheets["Delivery_History"];

    if (!sheet) {
      throw new Error("Delivery_History sheet not found");
    }

    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

    let updated = false;

    const updatedRows = rows.map((row) => {
      const sameDN = String(row.dn_number || "") === String(dn_number || "");
      const sameItem = String(row.item_name || "").trim() === String(item_name || "").trim();

      if (sameDN && sameItem) {
        updated = true;

        return {
          ...row,
          rate,
          rate_updated_at: new Date().toISOString(),
          rate_updated_by: "dashboard_user",
        };
      }

      return row;
    });

    if (!updated) {
      throw new Error("Matching DN/item row not found");
    }

    workbook.Sheets["Delivery_History"] = XLSX.utils.json_to_sheet(updatedRows);

    backupFile(workbookPath);
    XLSX.writeFile(workbook, workbookPath);

    logSystemEvent("manual_rate_updated", "Manual unit rate updated", {
      client,
      location,
      dn_number,
      item_name,
      rate,
    });

    return {
      success: true,
      workbookPath,
      dn_number,
      item_name,
      rate,
    };
  } catch (error) {
    logSystemError("updateDeliveryRate", error);
    throw error;
  }
}