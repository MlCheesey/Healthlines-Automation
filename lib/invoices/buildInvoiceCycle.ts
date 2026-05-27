import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { DATA_ROOT } from "@/lib/config/storage";

function safeName(value: string) {
  return (
    String(value || "general")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "general"
  );
}

function readSheet(filePath: string, sheetName: string) {
  try {
    if (!fs.existsSync(filePath)) return [];

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) return [];

    return XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
  } catch {
    return [];
  }
}

function isAlreadyInvoiced(row: any) {
  const status = String(row.invoice_status || "").toLowerCase();

  if (row.invoice_package_id || row.invoice_number) return true;
  if (status.includes("packaged")) return true;
  if (status.includes("approved")) return true;
  if (status.includes("drafted")) return true;
  if (status.includes("sent")) return true;
  if (status.includes("paid")) return true;

  return false;
}

function buildInvoiceNumber(dnNumber: string) {
  const safeDn = String(dnNumber || "UNKNOWN-DN").replace(
    /[^a-zA-Z0-9-_]/g,
    "-"
  );

  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);

  return `INV-${safeDn}-${stamp}`;
}

function groupKey(row: any) {
  return [
    safeName(row.client || ""),
    safeName(row.location || ""),
    String(row.dn_number || ""),
  ].join("__");
}

export function buildInvoiceCycle(client: string) {
  const safeClient = safeName(client || "davita");

  const clientPath = path.join(DATA_ROOT, "clients", safeClient);

  const packageId = `PKG-${new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14)}`;

  const invoiceGroupsMap = new Map<string, any>();
  const missingRates: any[] = [];
  const mrnPending: any[] = [];
  const mrnOverdue: any[] = [];
  const skippedAlreadyPackaged: any[] = [];
  const readErrors: any[] = [];

  if (!fs.existsSync(clientPath)) {
    return {
      success: true,
      client: safeClient,
      package_id: packageId,
      invoice_groups: [],
      missing_rates: [],
      mrn_pending: [],
      mrn_overdue: [],
      skipped_already_packaged: [],
      read_errors: [],
      counts: {
        total_invoice_groups: 0,
        ready_invoice_groups: 0,
        blocked_invoice_groups: 0,
        mrn_pending: 0,
        mrn_overdue: 0,
        skipped_already_packaged: 0,
      },
    };
  }

  const files = fs
    .readdirSync(clientPath)
    .filter((file) => file.endsWith(".xlsx") && file !== "master.xlsx");

  for (const file of files) {
    const workbookPath = path.join(clientPath, file);

    let rows: any[] = [];

    try {
      rows = readSheet(workbookPath, "Delivery_History");
    } catch (error: any) {
      readErrors.push({
        file: workbookPath,
        error: error?.message || String(error),
      });
      continue;
    }

    for (const row of rows) {
      if (isAlreadyInvoiced(row)) {
        skippedAlreadyPackaged.push(row);
        continue;
      }

      const deliveredQty = Number(row.delivered_qty || row.qty || 0);

      if (deliveredQty <= 0) continue;

      const rateRaw = row.rate;
      const hasMissingRate =
        rateRaw === "" ||
        rateRaw === null ||
        rateRaw === undefined ||
        Number.isNaN(Number(rateRaw));

      const key = groupKey(row);

      if (!invoiceGroupsMap.has(key)) {
        const mrnStatus = String(row.mrn_status || "Pending");

        const group = {
          client: row.client || safeClient,
          location: row.location || file.replace(".xlsx", ""),
          po_number: row.po_number || "",
          dn_number: row.dn_number || "",
          dn_date: row.dn_date || "",
          mrn_number: row.mrn_number || "",
          mrn_status: mrnStatus,
          invoice_number: buildInvoiceNumber(row.dn_number || ""),
          invoice_package_id: packageId,
          has_missing_rate: false,
          items: [],
          source_workbook: workbookPath,
        };

        invoiceGroupsMap.set(key, group);

        if (mrnStatus.toLowerCase().includes("pending")) {
          mrnPending.push(group);
        }

        if (mrnStatus.toLowerCase().includes("overdue")) {
          mrnOverdue.push(group);
        }
      }

      const group = invoiceGroupsMap.get(key);

      if (hasMissingRate) {
        group.has_missing_rate = true;

        missingRates.push({
          client: row.client || safeClient,
          location: row.location || file.replace(".xlsx", ""),
          po_number: row.po_number || "",
          dn_number: row.dn_number || "",
          item_code: row.item_code || "",
          item_name: row.item_name || "",
          delivered_qty: deliveredQty,
          qty: deliveredQty,
          unit: row.unit || "",
          rate: row.rate ?? "",
        });
      }

      group.items.push({
        item_code: row.item_code || "",
        item_name: row.item_name || "",
        qty: deliveredQty,
        delivered_qty: deliveredQty,
        unit: row.unit || "",
        rate: row.rate ?? "",
        batch: row.batch || "",
        expiry: row.expiry || "",
        taxable_amount: row.taxable_amount ?? "",
        vat_amount: row.vat_amount ?? "",
        vat_percent: row.vat_percent ?? "",
        taxability: row.taxability || "",
        tax_reason: row.tax_reason || "",
        needs_vat_review: row.needs_vat_review || "",
      });
    }
  }

  const invoiceGroups = Array.from(invoiceGroupsMap.values());

  return {
    success: true,
    client: safeClient,
    package_id: packageId,
    invoice_groups: invoiceGroups,
    missing_rates: missingRates,
    missing_rate_count: missingRates.length,
    mrn_pending: mrnPending,
    mrn_overdue: mrnOverdue,
    skipped_already_packaged: skippedAlreadyPackaged,
    read_errors: readErrors,
    counts: {
      total_invoice_groups: invoiceGroups.length,
      ready_invoice_groups: invoiceGroups.filter((g) => !g.has_missing_rate)
        .length,
      blocked_invoice_groups: invoiceGroups.filter((g) => g.has_missing_rate)
        .length,
      mrn_pending: mrnPending.length,
      mrn_overdue: mrnOverdue.length,
      skipped_already_packaged: skippedAlreadyPackaged.length,
    },
  };
}