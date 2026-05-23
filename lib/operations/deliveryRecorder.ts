import { updateBalanceAfterDelivery } from "./balanceUpdater";
import { appendRowToSheet } from "./storage";
import { appendMasterRow } from "./masterWorkbook";
import { hasProcessedDN, markDNProcessed } from "./workflowProtection";

type DeliveryLine = {
  item_code?: string;
  item_name: string;
  delivered_qty: number;
  unit?: string;
  rate?: number | null;
  batch?: string;
  expiry?: string;
};

type DeliveryRecord = {
  client: string;
  location: string;
  po_number: string;
  dn_number: string;
  dn_date: string;
  mrn_number?: string;
  lines: DeliveryLine[];
  remarks?: string;
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

function normalizeDate(value: any) {
  const raw = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  const parsed = new Date(raw);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const safeDate = normalizeDate(dateString);
  const date = new Date(safeDate);

  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

export function recordDeliveryNote(delivery: DeliveryRecord) {
  const client = safeName(delivery.client || "davita");
  const location = safeName(delivery.location || "general");

  const dnDate = normalizeDate(delivery.dn_date);

  if (
    hasProcessedDN({
      client,
      location,
      dn_number: delivery.dn_number,
    })
  ) {
    return {
      success: false,
      duplicate: true,
      message: "Delivery note already processed",
      dn_number: delivery.dn_number,
    };
  }

  const mrnStatus = delivery.mrn_number ? "Received" : "Pending";
  const mrnDueDate = addDays(dnDate, 7);

  const rows = delivery.lines.map((line) => ({
    client,
    location,
    po_number: delivery.po_number,
    dn_number: delivery.dn_number,
    dn_date: dnDate,
    item_code: line.item_code || "",
    item_name: line.item_name,
    delivered_qty: Number(line.delivered_qty || 0),
    qty: Number(line.delivered_qty || 0),
    unit: line.unit || "",
    rate: line.rate ?? "",
    batch: line.batch || "",
    expiry: line.expiry || "",
    mrn_number: delivery.mrn_number || "",
    mrn_status: mrnStatus,
    mrn_due_date: mrnDueDate,
    invoice_status: "Not Invoiced",
    invoice_number: "",
    invoice_package_id: "",
    invoice_generated_at: "",
    remarks: delivery.remarks || "",
  }));

  for (const row of rows) {
    updateBalanceAfterDelivery({
      client,
      location,
      po_number: delivery.po_number,
      item_code: row.item_code,
      item_name: row.item_name,
      delivered_qty: Number(row.delivered_qty || 0),
    });

    appendRowToSheet(client, location, "Delivery_History", row);

    appendRowToSheet(client, location, "MRN_Log", {
      ...row,
      status: mrnStatus,
    });

    appendMasterRow(client, "MRN_Tracker", {
      ...row,
      status: mrnStatus,
    });

    appendMasterRow(client, "Invoice_Tracker", {
      ...row,
      status: "Not Invoiced",
    });

    appendMasterRow(client, "Pending_Actions", {
      client,
      location,
      po_number: delivery.po_number,
      dn_number: delivery.dn_number,
      action_type: mrnStatus === "Received" ? "Invoice Review" : "MRN Follow-up",
      pending_action:
        mrnStatus === "Received"
          ? "Review invoice eligibility"
          : `Follow up MRN before ${mrnDueDate}`,
      status: "Open",
      remarks: delivery.remarks || "",
    });
  }

  markDNProcessed({
    client,
    location,
    dn_number: delivery.dn_number,
  });

  return {
    success: true,
    client,
    location,
    dn_number: delivery.dn_number,
    rows_added: rows.length,
    mrn_status: mrnStatus,
    mrn_due_date: mrnDueDate,
    rows,
  };
}