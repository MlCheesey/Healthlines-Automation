import { updateBalanceAfterDelivery } from "./balanceUpdater";
import { appendRowToSheet } from "./storage";
import { appendMasterRow } from "./masterWorkbook";
import {
  hasProcessedDN,
  markDNProcessed,
} from "./workflowProtection";

type DeliveryLine = {
  item_code?: string;
  item_name: string;
  delivered_qty: number;
  unit?: string;
  rate?: number | null;
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
  return String(value || "general")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "general";
}

function addDays(
  dateString: string,
  days: number
) {
  const date = new Date(dateString);

  date.setDate(date.getDate() + days);

  return date
    .toISOString()
    .slice(0, 10);
}

export function recordDeliveryNote(
  delivery: DeliveryRecord
) {
  const client = safeName(
    delivery.client || "davita"
  );

  const location = safeName(
    delivery.location || "general"
  );

  if (
    hasProcessedDN(
      delivery.dn_number
    )
  ) {
    return {
      success: false,
      duplicate: true,
      message:
        "Delivery note already processed",
      dn_number:
        delivery.dn_number,
    };
  }

  const mrnStatus =
    delivery.mrn_number
      ? "Received"
      : "Pending";

  const mrnDueDate = addDays(
    delivery.dn_date,
    7
  );

  const rows = delivery.lines.map(
    (line) => ({
      client,
      location,
      po_number:
        delivery.po_number,
      dn_number:
        delivery.dn_number,
      dn_date:
        delivery.dn_date,
      item_code:
        line.item_code || "",
      item_name:
        line.item_name,
      delivered_qty:
        line.delivered_qty,
      qty:
        line.delivered_qty,
      unit:
        line.unit || "",
      rate:
        line.rate ?? "",
      mrn_number:
        delivery.mrn_number ||
        "",
      mrn_status:
        mrnStatus,
      mrn_due_date:
        mrnDueDate,
      invoice_status:
        "Not Invoiced",
      remarks:
        delivery.remarks || "",
    })
  );

  for (const row of rows) {

    updateBalanceAfterDelivery({
  client,
  location,
  po_number: delivery.po_number,
  item_name: row.item_name,
  delivered_qty: Number(row.delivered_qty || row.qty || 0),
});

    appendRowToSheet(
      client,
      location,
      "Delivery_History",
      row
    );

    appendRowToSheet(
      client,
      location,
      "MRN_Log",
      {
        ...row,
        status:
          mrnStatus,
      }
    );

    appendMasterRow(
      client,
      "MRN_Tracker",
      {
        ...row,
        status:
          mrnStatus,
      }
    );

    appendMasterRow(
      client,
      "Invoice_Tracker",
      {
        ...row,
        status:
          "Not Invoiced",
      }
    );

    appendMasterRow(
      client,
      "Pending_Actions",
      {
        client,
        location,
        po_number:
          delivery.po_number,
        dn_number:
          delivery.dn_number,
        action_type:
          mrnStatus ===
          "Received"
            ? "Invoice Review"
            : "MRN Follow-up",
        pending_action:
          mrnStatus ===
          "Received"
            ? "Review invoice eligibility"
            : `Follow up MRN before ${mrnDueDate}`,
        status: "Open",
        remarks:
          delivery.remarks ||
          "",
      }
    );
  }

  markDNProcessed(
    delivery.dn_number
  );

  return {
    success: true,
    client,
    location,
    dn_number:
      delivery.dn_number,
    rows_added:
      rows.length,
    mrn_status:
      mrnStatus,
    mrn_due_date:
      mrnDueDate,
    rows,
  };
} 