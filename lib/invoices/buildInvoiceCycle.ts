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

function shouldSkipWorkbook(file: string) {
  const lower = file.toLowerCase();

  if (!lower.endsWith(".xlsx")) return true;
  if (lower === "master.xlsx") return true;
  if (lower.startsWith("~$")) return true;

  return false;
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

function boolLike(value: any) {
  const text = String(value || "").toLowerCase().trim();
  return value === true || text === "yes" || text === "true" || text === "1";
}

function isMissingRate(value: any) {
  return (
    value === "" ||
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  );
}

function needsVatReview(row: any) {
  const explicitNeedsReview = boolLike(row.needs_vat_review);

  const vatPercentMissing =
    row.vat_percent === "" ||
    row.vat_percent === null ||
    row.vat_percent === undefined;

  const taxability = String(row.taxability || "").toLowerCase();
  const taxReason = String(row.tax_reason || "").toLowerCase();

  const reviewText =
    taxability.includes("review") ||
    taxReason.includes("review") ||
    taxReason.includes("did not contain a vat ledger") ||
    taxReason.includes("vat ledger") ||
    taxReason.includes("missing vat");

  return explicitNeedsReview || vatPercentMissing || reviewText;
}

function mrnBlockedStatus(value: any) {
  const status = String(value || "Pending").toLowerCase();

  if (status.includes("received")) return "";
  if (status.includes("overdue")) return "MRN overdue";
  if (status.includes("pending")) return "MRN pending";

  return "MRN status unclear";
}

function addBlockedReason(group: any, reason: string) {
  if (!reason) return;

  if (!Array.isArray(group.blocked_reasons)) {
    group.blocked_reasons = [];
  }

  if (!group.blocked_reasons.includes(reason)) {
    group.blocked_reasons.push(reason);
  }

  group.is_blocked = true;
}

function finalizeGroup(group: any) {
  group.has_vat_review = Boolean(group.has_vat_review);
  group.has_missing_rate = Boolean(group.has_missing_rate);
  group.is_blocked = Boolean(group.is_blocked || group.blocked_reasons?.length);

  group.invoice_readiness_status = group.is_blocked
    ? `Blocked - ${group.blocked_reasons.join(", ")}`
    : "Ready - Pending Approval";

  return group;
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
  const vatReview: any[] = [];
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
      vat_review: [],
      mrn_pending: [],
      mrn_overdue: [],
      skipped_already_packaged: [],
      read_errors: [],
      counts: {
        total_invoice_groups: 0,
        ready_invoice_groups: 0,
        blocked_invoice_groups: 0,
        missing_rates: 0,
        vat_review: 0,
        mrn_pending: 0,
        mrn_overdue: 0,
        skipped_already_packaged: 0,
      },
    };
  }

  const files = fs
    .readdirSync(clientPath)
    .filter((file) => !shouldSkipWorkbook(file));

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

      const key = groupKey(row);

      if (!invoiceGroupsMap.has(key)) {
        const mrnStatus = String(row.mrn_status || row.status || "Pending");
        const mrnBlockReason = mrnBlockedStatus(mrnStatus);

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
          has_vat_review: false,
          is_blocked: false,
          blocked_reasons: [],
          invoice_readiness_status: "",
          items: [],
          source_workbook: workbookPath,
        };

        if (mrnBlockReason) {
          addBlockedReason(group, mrnBlockReason);

          if (mrnBlockReason === "MRN pending") {
            mrnPending.push(group);
          }

          if (mrnBlockReason === "MRN overdue") {
            mrnOverdue.push(group);
          }
        }

        invoiceGroupsMap.set(key, group);
      }

      const group = invoiceGroupsMap.get(key);

      if (isMissingRate(row.rate)) {
        group.has_missing_rate = true;
        addBlockedReason(group, "Missing unit rate");

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
          reason: "Missing unit rate",
        });
      }

      if (needsVatReview(row)) {
        group.has_vat_review = true;
        addBlockedReason(group, "VAT review required");

        vatReview.push({
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
          vat_amount: row.vat_amount ?? "",
          vat_percent: row.vat_percent ?? "",
          taxability: row.taxability || "",
          tax_reason: row.tax_reason || "",
          needs_vat_review: row.needs_vat_review || "",
          reason: "VAT review required",
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

  const invoiceGroups = Array.from(invoiceGroupsMap.values()).map(finalizeGroup);

  const readyGroups = invoiceGroups.filter((group) => !group.is_blocked);
  const blockedGroups = invoiceGroups.filter((group) => group.is_blocked);

  return {
    success: true,
    client: safeClient,
    package_id: packageId,
    invoice_groups: invoiceGroups,
    ready_invoice_groups: readyGroups,
    blocked_invoice_groups: blockedGroups,
    missing_rates: missingRates,
    missing_rate_count: missingRates.length,
    vat_review: vatReview,
    vat_review_count: vatReview.length,
    mrn_pending: mrnPending,
    mrn_overdue: mrnOverdue,
    skipped_already_packaged: skippedAlreadyPackaged,
    read_errors: readErrors,
    counts: {
      total_invoice_groups: invoiceGroups.length,
      ready_invoice_groups: readyGroups.length,
      blocked_invoice_groups: blockedGroups.length,
      missing_rates: missingRates.length,
      vat_review: vatReview.length,
      mrn_pending: mrnPending.length,
      mrn_overdue: mrnOverdue.length,
      skipped_already_packaged: skippedAlreadyPackaged.length,
    },
  };
}