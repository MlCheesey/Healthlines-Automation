import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";
import { logSystemError } from "@/lib/system/logger";

type DeliveryRow = {
  client: string;
  location: string;
  po_number: string;
  dn_number: string;
  dn_date: string;
  mrn_number: string;
  mrn_status: "Received" | "Pending" | "Overdue";
  item_code?: string;
  item_name: string;
  qty: number;
  unit: string;
  rate: number | "";
  batch?: string;
  expiry?: string;
  vat_percent?: number;
  taxability?: string;
  tax_reason?: string;
  invoice_status?: string;
  status: string;
};

function safeName(value: string) {
  return (
    String(value || "general")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "general"
  );
}

function isMissingRate(value: any) {
  return (
    value === "" ||
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  );
}

function isPastDue(dateString: string) {
  if (!dateString) return false;

  const due = new Date(dateString);
  const today = new Date();

  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return today.getTime() > due.getTime();
}

function getMrnStatus(row: any): "Received" | "Pending" | "Overdue" {
  const rawStatus = String(row.mrn_status || row.status || "").toLowerCase();
  const mrnNumber = String(row.mrn_number || row.mrn_numbers || "").trim();

  if (mrnNumber || rawStatus.includes("received")) {
    return "Received";
  }

  if (rawStatus.includes("overdue") || isPastDue(row.mrn_due_date)) {
    return "Overdue";
  }

  return "Pending";
}

function shouldSkipAlreadyPackaged(row: any) {
  const status = String(row.invoice_status || "").toLowerCase();

  if (!status) return false;

  if (status.includes("rejected")) return false;

  return (
    status.includes("packaged") ||
    status.includes("approved") ||
    status.includes("sent") ||
    status.includes("invoiced")
  );
}

function buildInvoiceNumber(dnNumber: string) {
  const safeDn = String(dnNumber || "UNKNOWN-DN").replace(
    /[^a-zA-Z0-9-_]/g,
    "-"
  );

  return `INV-${safeDn}`;
}

function safeReadWorkbook(workbookPath: string) {
  try {
    const buffer = fs.readFileSync(workbookPath);

    return XLSX.read(buffer, {
      type: "buffer",
    });
  } catch (error: any) {
    logSystemError("buildInvoiceCycle_readWorkbook", {
      message: error.message,
      workbookPath,
    });

    return null;
  }
}

export function buildInvoiceCycle(client: string = DEFAULT_CLIENT_ID) {
  const safeClient = safeName(client || DEFAULT_CLIENT_ID);

  const clientPath = path.join(process.cwd(), "data", "clients", safeClient);

  const readErrors: any[] = [];

  if (!fs.existsSync(clientPath)) {
    return {
      success: true,
      client: safeClient,
      invoice_rows: [],
      invoice_groups: [],
      skipped_already_packaged: [],
      missing_rates: [],
      missing_mrn: [],
      mrn_received: [],
      mrn_pending: [],
      mrn_overdue: [],
      read_errors: readErrors,
    };
  }

  const files = fs
    .readdirSync(clientPath)
    .filter((file) => file.endsWith(".xlsx") && file !== "master.xlsx");

  const invoiceRows: DeliveryRow[] = [];
  const skippedAlreadyPackaged: any[] = [];

  for (const file of files) {
    const locationFromFile = file.replace(".xlsx", "");
    const workbookPath = path.join(clientPath, file);

    const workbook = safeReadWorkbook(workbookPath);

    if (!workbook) {
      readErrors.push({
        file,
        location: locationFromFile,
        path: workbookPath,
        issue:
          "Workbook could not be accessed. It may be open in Excel or locked.",
      });

      continue;
    }

    const deliverySheet = workbook.Sheets["Delivery_History"];

    if (!deliverySheet) continue;

    const rows = XLSX.utils.sheet_to_json<any>(deliverySheet, { defval: "" });

    for (const row of rows) {
      if (shouldSkipAlreadyPackaged(row)) {
        skippedAlreadyPackaged.push({
          client: safeClient,
          location: row.location || locationFromFile,
          po_number: row.po_number || "",
          dn_number: row.dn_number || "",
          invoice_status: row.invoice_status || "",
          invoice_number: row.invoice_number || "",
        });

        continue;
      }

      const mrnStatus = getMrnStatus(row);
      const rateMissing = isMissingRate(row.rate);

      const status = rateMissing
        ? "Blocked - Missing Rate"
        : mrnStatus === "Received"
        ? "Ready - MRN Received"
        : "Ready - MRN Pending";

      invoiceRows.push({
        client: safeClient,
        location: row.location || locationFromFile,
        po_number: row.po_number || "",
        dn_number: row.dn_number || "",
        dn_date: row.dn_date || "",
        mrn_number: row.mrn_number || "",
        mrn_status: mrnStatus,
        item_code: row.item_code || "",
        item_name: row.item_name || "",
        qty: Number(row.qty || row.delivered_qty || 0),
        unit: row.unit || "",
        rate: rateMissing ? "" : Number(row.rate),
        batch: row.batch || "",
        expiry: row.expiry || "",
        vat_percent:
          row.vat_percent === "" || row.vat_percent === undefined
            ? undefined
            : Number(row.vat_percent),
        taxability: row.taxability || "",
        tax_reason: row.tax_reason || "",
        invoice_status: row.invoice_status || "",
        status,
      });
    }
  }

  const grouped = new Map<string, any>();

  for (const row of invoiceRows) {
    const key = [row.client, row.location, row.po_number, row.dn_number].join(
      "__"
    );

    if (!grouped.has(key)) {
      grouped.set(key, {
        client: row.client,
        location: row.location,
        po_number: row.po_number,
        dn_number: row.dn_number,
        dn_date: row.dn_date,
        mrn_number: row.mrn_number,
        mrn_status: row.mrn_status,
        invoice_number: buildInvoiceNumber(row.dn_number),
        has_missing_rate: false,
        items: [],
      });
    }

    const group = grouped.get(key);

    if (!group.mrn_number && row.mrn_number) {
      group.mrn_number = row.mrn_number;
      group.mrn_status = "Received";
    }

    if (row.mrn_status === "Overdue" && group.mrn_status !== "Received") {
      group.mrn_status = "Overdue";
    }

    if (row.rate === "") {
      group.has_missing_rate = true;
    }

    group.items.push({
      item_code: row.item_code,
      item_name: row.item_name,
      qty: row.qty,
      unit: row.unit,
      rate: row.rate,
      batch: row.batch,
      expiry: row.expiry,
      vat_percent: row.vat_percent,
      taxability: row.taxability,
      tax_reason: row.tax_reason,
    });
  }

  const invoiceGroups = Array.from(grouped.values());

  const missingRates = invoiceRows.filter((row) => row.rate === "");
  const mrnReceived = invoiceRows.filter(
    (row) => row.mrn_status === "Received"
  );
  const mrnPending = invoiceRows.filter(
    (row) => row.mrn_status === "Pending"
  );
  const mrnOverdue = invoiceRows.filter(
    (row) => row.mrn_status === "Overdue"
  );

  return {
    success: readErrors.length === 0,
    client: safeClient,
    invoice_rows: invoiceRows,
    invoice_groups: invoiceGroups,
    skipped_already_packaged: skippedAlreadyPackaged,
    missing_rates: missingRates,
    missing_mrn: [...mrnPending, ...mrnOverdue],
    mrn_received: mrnReceived,
    mrn_pending: mrnPending,
    mrn_overdue: mrnOverdue,
    read_errors: readErrors,
  };
}