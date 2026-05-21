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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { client, location, dn_number, items } = body;

    if (!client || !location || !dn_number || !Array.isArray(items)) {
      return Response.json(
        { error: "client, location, dn_number and items[] are required" },
        { status: 400 }
      );
    }

    const workbookPath = path.join(
      process.cwd(),
      "data",
      "clients",
      safeName(client),
      `${safeName(location)}.xlsx`
    );

    if (!fs.existsSync(workbookPath)) {
      return Response.json({ error: "Location workbook not found" }, { status: 404 });
    }

    const workbook = XLSX.readFile(workbookPath);
    const rows = readRows(workbook, "Delivery_History");

    let updatedRows = 0;

    const updated = rows.map((row: any) => {
      if (String(row.dn_number || "") !== String(dn_number || "")) return row;

      const match = items.find(
        (item: any) =>
          String(item.item_name || "").trim().toLowerCase() ===
          String(row.item_name || "").trim().toLowerCase()
      );

      if (!match) return row;

      updatedRows += 1;

      return {
        ...row,
        qty: match.qty ?? row.qty,
        delivered_qty: match.qty ?? row.delivered_qty,
        unit: match.unit ?? row.unit,
        rate: match.rate ?? row.rate,
        vat_percent: match.vat_percent ?? row.vat_percent,
        taxability: match.taxability ?? row.taxability,
        tax_reason: match.tax_reason ?? row.tax_reason,
        invoice_status: "Draft Edited - Needs Regeneration",
        invoice_draft_edited_at: new Date().toISOString(),
      };
    });

    workbook.Sheets["Delivery_History"] = XLSX.utils.json_to_sheet(updated);

    backupFile(workbookPath);
    XLSX.writeFile(workbook, workbookPath);

    logSystemEvent("invoice_draft_updated", "Invoice draft data updated", {
      client,
      location,
      dn_number,
      updatedRows,
    });

    return Response.json({
      success: true,
      updatedRows,
      message: "Invoice draft updated. Regenerate package/PDF next.",
    });
  } catch (error: any) {
    logSystemError("invoice-draft-update-api", error);

    return Response.json(
      { error: error.message || "Invoice draft update failed" },
      { status: 500 }
    );
  }
}