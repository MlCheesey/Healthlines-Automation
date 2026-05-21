import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { backupFile } from "@/lib/system/backup";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";
import { appendMasterRow } from "@/lib/operations/masterWorkbook";

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

function getWorkbookPath(client: string, location: string) {
  return path.join(
    process.cwd(),
    "data",
    "clients",
    safeName(client),
    `${safeName(location)}.xlsx`
  );
}

export function markInvoiceGroupsPackaged({
  client,
  package_id,
  groups,
}: {
  client: string;
  package_id: string;
  groups: any[];
}) {
  try {
    const packagedAt = new Date().toISOString();
    const updatedFiles = new Set<string>();
    let updatedRows = 0;

    for (const group of groups) {
      const location = group.location || "general";
      const workbookPath = getWorkbookPath(client, location);

      if (!fs.existsSync(workbookPath)) {
        continue;
      }

      const workbook = XLSX.readFile(workbookPath);
      const rows = readRows(workbook, "Delivery_History");

      if (rows.length === 0) continue;

      let changed = false;

      const updated = rows.map((row: any) => {
        const sameDn =
          String(row.dn_number || "") === String(group.dn_number || "");

        const samePo =
          !group.po_number ||
          String(row.po_number || "") === String(group.po_number || "");

        if (!sameDn || !samePo) return row;

        changed = true;
        updatedRows += 1;

        return {
          ...row,
          invoice_number: group.invoice_number,
          invoice_status: "Packaged - Pending Approval",
          invoice_package_id: package_id,
          invoice_packaged_at: packagedAt,
        };
      });

      if (changed) {
        workbook.Sheets["Delivery_History"] = XLSX.utils.json_to_sheet(updated);
        backupFile(workbookPath);
        XLSX.writeFile(workbook, workbookPath);
        updatedFiles.add(workbookPath);

        appendMasterRow(client, "Invoice_Tracker", {
          client,
          location,
          po_number: group.po_number || "",
          dn_number: group.dn_number || "",
          invoice_number: group.invoice_number || "",
          mrn_number: group.mrn_number || "",
          mrn_status: group.mrn_status || "Pending",
          invoice_status: "Packaged - Pending Approval",
          invoice_package_id: package_id,
          invoice_packaged_at: packagedAt,
          status: "Pending Approval",
        });
      }
    }

    logSystemEvent(
      "invoice_groups_marked_packaged",
      "Invoice groups marked as packaged pending approval",
      {
        client,
        package_id,
        groups: groups.length,
        updated_rows: updatedRows,
        updated_files: Array.from(updatedFiles),
      }
    );

    return {
      success: true,
      package_id,
      updated_rows: updatedRows,
      updated_files: Array.from(updatedFiles),
    };
  } catch (error) {
    logSystemError("markInvoiceGroupsPackaged", error);
    throw error;
  }
}