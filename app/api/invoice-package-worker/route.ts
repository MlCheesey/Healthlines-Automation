import fs from "fs";
import * as XLSX from "xlsx";
import { buildInvoiceCycle } from "@/lib/invoices/buildInvoiceCycle";
import { generateInvoiceCycleExcel } from "@/lib/invoices/generateInvoiceCycleExcel";
import { backupFile } from "@/lib/system/backup";

function readRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
}

function isAlreadyPackaged(row: any) {
  const status = String(row.invoice_status || "").toLowerCase();

  if (row.invoice_package_id || row.invoice_number) return true;
  if (status.includes("packaged")) return true;
  if (status.includes("approved")) return true;
  if (status.includes("sent")) return true;
  if (status.includes("paid")) return true;

  return false;
}

function markRowsPackaged(cycle: any) {
  const updatedWorkbooks = new Set<string>();

  for (const group of cycle.invoice_groups || []) {
    if (group.has_missing_rate) continue;

    const workbookPath = group.source_workbook;

    if (!workbookPath || !fs.existsSync(workbookPath)) continue;

    const workbook = XLSX.readFile(workbookPath);
    const rows = readRows(workbook, "Delivery_History");

    let changed = false;

    const updatedRows = rows.map((row: any) => {
      const sameDn =
        String(row.dn_number || "") === String(group.dn_number || "");

      const samePo =
        !group.po_number ||
        String(row.po_number || "") === String(group.po_number || "");

      if (!sameDn || !samePo || isAlreadyPackaged(row)) return row;

      changed = true;

      return {
        ...row,
        invoice_status: "Packaged - Pending Approval",
        invoice_package_id: group.invoice_package_id,
        invoice_number: group.invoice_number,
        invoice_packaged_at: new Date().toISOString(),
      };
    });

    if (changed) {
      workbook.Sheets["Delivery_History"] =
        XLSX.utils.json_to_sheet(updatedRows);

      backupFile(workbookPath);
      XLSX.writeFile(workbook, workbookPath);
      updatedWorkbooks.add(workbookPath);
    }
  }

  return Array.from(updatedWorkbooks);
}

async function runInvoicePackageWorker(client = "davita") {
  const cycle = buildInvoiceCycle(client);

  const flattenedRows = cycle.invoice_groups.flatMap((group: any) =>
    group.items.map((item: any) => ({
      client: group.client,
      location: group.location,
      po_number: group.po_number,
      dn_number: group.dn_number,
      dn_date: group.dn_date,
      mrn_number: group.mrn_number,
      mrn_status: group.mrn_status,
      invoice_number: group.invoice_number,
      invoice_package_id: group.invoice_package_id,
      item_code: item.item_code,
      item_name: item.item_name,
      qty: item.qty,
      unit: item.unit,
      rate: item.rate,
      amount:
        Number(item.qty || 0) *
        (Number.isNaN(Number(item.rate)) ? 0 : Number(item.rate || 0)),
      batch: item.batch,
      expiry: item.expiry,
      taxable_amount: item.taxable_amount,
      vat_amount: item.vat_amount,
      vat_percent: item.vat_percent,
      taxability: item.taxability,
      tax_reason: item.tax_reason,
      needs_vat_review: item.needs_vat_review,
      status: group.has_missing_rate
        ? "Blocked - Missing Rate"
        : "Packaged - Pending Approval",
    }))
  );

  const excelPath = await generateInvoiceCycleExcel(flattenedRows);

  const updatedWorkbooks = markRowsPackaged(cycle);

  return {
    success: true,
    package_id: cycle.package_id,
    invoice_groups: cycle.invoice_groups,
    counts: cycle.counts,
    excelPath,
    updatedWorkbooks,
    mrn_pending: cycle.mrn_pending,
    mrn_overdue: cycle.mrn_overdue,
    missing_rates: cycle.missing_rates,
    note: "Invoice package drafted only. Sending still requires human approval.",
  };
}

export async function GET() {
  try {
    const result = await runInvoicePackageWorker("davita");
    return Response.json(result);
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const client = body.client || "davita";

    const result = await runInvoicePackageWorker(client);

    return Response.json(result);
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}