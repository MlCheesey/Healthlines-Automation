import { DATA_ROOT } from "@/lib/config/storage";
import { appendMasterRow } from "@/lib/operations/masterWorkbook";
import { backupFile } from "@/lib/system/backup";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

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

function numberOrNull(value: any) {
  if (value === "" || value === null || value === undefined) return null;

  const num = Number(value);

  return Number.isNaN(num) ? null : num;
}

function sameText(a: any, b: any) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function calculateTaxableAmount(row: any, rate: number | null) {
  const qty = Number(row.delivered_qty || row.qty || 0);

  if (rate === null || Number.isNaN(qty)) {
    return numberOrNull(row.taxable_amount);
  }

  return Number((qty * rate).toFixed(2));
}

function calculateVatAmount(taxableAmount: number | null, vatPercent: number | null) {
  if (taxableAmount === null || vatPercent === null) return null;

  return Number((taxableAmount * (vatPercent / 100)).toFixed(2));
}

function updateDeliveryHistory({
  client,
  location,
  dnNumber,
  itemName,
  rate,
  vatPercent,
  vatAmount,
  resolveVatReview,
  taxability,
  taxReason,
}: {
  client: string;
  location: string;
  dnNumber: string;
  itemName: string;
  rate: number | null;
  vatPercent: number | null;
  vatAmount: number | null;
  resolveVatReview: boolean;
  taxability: string;
  taxReason: string;
}) {
  const safeClient = safeName(client);
  const safeLocation = safeName(location);

  const workbookPath = path.join(
    DATA_ROOT,
    "clients",
    safeClient,
    `${safeLocation}.xlsx`
  );

  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }

  const workbook = XLSX.readFile(workbookPath);
  const rows = readRows(workbook, "Delivery_History");

  let updatedCount = 0;

  const updatedRows = rows.map((row: any) => {
    const sameDn = sameText(row.dn_number, dnNumber);
    const sameItem = sameText(row.item_name, itemName);

    if (!sameDn || !sameItem) return row;

    const finalRate = rate !== null ? rate : numberOrNull(row.rate);
    const taxableAmount = calculateTaxableAmount(row, finalRate);

    const finalVatPercent =
      vatPercent !== null ? vatPercent : numberOrNull(row.vat_percent);

    const finalVatAmount =
      vatAmount !== null
        ? vatAmount
        : calculateVatAmount(taxableAmount, finalVatPercent);

    updatedCount += 1;

    return {
      ...row,
      rate: finalRate ?? row.rate ?? "",
      taxable_amount: taxableAmount ?? row.taxable_amount ?? "",
      vat_percent: finalVatPercent ?? row.vat_percent ?? "",
      vat_amount: finalVatAmount ?? row.vat_amount ?? "",
      taxability:
        taxability ||
        (resolveVatReview ? "Manually confirmed" : row.taxability || ""),
      tax_reason:
        taxReason ||
        (resolveVatReview
          ? "Rate/VAT manually reviewed and confirmed for invoice generation."
          : row.tax_reason || ""),
      needs_vat_review: resolveVatReview ? "No" : row.needs_vat_review || "",
      manual_review_updated_at: new Date().toISOString(),
      invoice_status:
        String(row.invoice_status || "").toLowerCase().includes("blocked")
          ? "Not Invoiced"
          : row.invoice_status || "Not Invoiced",
    };
  });

  if (updatedCount === 0) {
    throw new Error(
      `No Delivery_History row found for DN ${dnNumber} and item ${itemName}`
    );
  }

  workbook.Sheets["Delivery_History"] = XLSX.utils.json_to_sheet(updatedRows);

  backupFile(workbookPath);
  XLSX.writeFile(workbook, workbookPath);

  return {
    workbookPath,
    updatedCount,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.client || !body.location || !body.dn_number || !body.item_name) {
      return Response.json(
        {
          success: false,
          error: "client, location, dn_number and item_name are required",
        },
        { status: 400 }
      );
    }

    const rate = numberOrNull(body.rate);
    const vatPercent = numberOrNull(body.vat_percent);
    const vatAmount = numberOrNull(body.vat_amount);

    const hasAnyUpdate =
      rate !== null ||
      vatPercent !== null ||
      vatAmount !== null ||
      body.resolve_vat_review === true;

    if (!hasAnyUpdate) {
      return Response.json(
        {
          success: false,
          error:
            "At least one update is required: rate, vat_percent, vat_amount, or resolve_vat_review",
        },
        { status: 400 }
      );
    }

    if (rate !== null && rate < 0) {
      return Response.json(
        {
          success: false,
          error: "rate must be a valid positive number",
        },
        { status: 400 }
      );
    }

    if (vatPercent !== null && (vatPercent < 0 || vatPercent > 20)) {
      return Response.json(
        {
          success: false,
          error: "vat_percent must be between 0 and 20",
        },
        { status: 400 }
      );
    }

    if (vatAmount !== null && vatAmount < 0) {
      return Response.json(
        {
          success: false,
          error: "vat_amount must be a valid positive number",
        },
        { status: 400 }
      );
    }

    const updateResult = updateDeliveryHistory({
      client: body.client,
      location: body.location,
      dnNumber: body.dn_number,
      itemName: body.item_name,
      rate,
      vatPercent,
      vatAmount,
      resolveVatReview: body.resolve_vat_review === true,
      taxability: String(body.taxability || "").trim(),
      taxReason: String(body.tax_reason || "").trim(),
    });

    appendMasterRow(body.client, "Pending_Actions", {
      client: body.client,
      location: body.location,
      dn_number: body.dn_number,
      item_name: body.item_name,
      rate: rate ?? "",
      vat_percent: vatPercent ?? "",
      vat_amount: vatAmount ?? "",
      resolve_vat_review: body.resolve_vat_review === true ? "Yes" : "No",
      action_type: "Manual Invoice Line Updated",
      status: "Completed",
      notes:
        "Invoice line rate/VAT information manually updated for invoice generation.",
      updated_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      message: "Manual invoice line updated. Re-run invoice package preview/test.",
      updateResult,
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error.message || "Manual rate/VAT update failed",
      },
      { status: 500 }
    );
  }
}