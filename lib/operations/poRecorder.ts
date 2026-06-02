import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";
import { appendRowToSheet } from "./storage";
import { appendMasterRow } from "./masterWorkbook";

type POItem = {
  item_code?: string;
  item_name: string;
  quantity: number;
  unit?: string;
  rate?: number | null;
  delivery_date?: string;
};

type PORecord = {
  client: string;
  po_number: string;
  po_type: "Quarterly PO" | "Additional PO";
  location: string;
  items: POItem[];
  delivery_date?: string;
  source_email_id?: string;
  notes?: string;
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

export function recordPO(po: PORecord) {
  const client = safeName(po.client || DEFAULT_CLIENT_ID);
  const location = safeName(po.location || "general");

  const results = [];

  for (const item of po.items) {
    const itemDeliveryDate =
      item.delivery_date || po.delivery_date || "";

    const row = {
      client,
      location,
      po_number: po.po_number,
      po_type: po.po_type,
      item_code: item.item_code || "",
      item_name: item.item_name,
      required_qty: item.quantity,
      delivered_qty: 0,
      balance_qty: item.quantity,
      unit: item.unit || "",
      rate: item.rate ?? "",
      delivery_date: itemDeliveryDate,
      status: itemDeliveryDate
        ? "Pending - Delivery Date Scheduled"
        : "Pending",
      mrn_status: "Not Started",
      invoice_status: "Not Invoiced",
      source_email_id: po.source_email_id || "",
      notes: po.notes || "",
    };

    appendRowToSheet(client, location, "Active_Requirements", row);
    appendMasterRow(client, "Master_PO", row);

    appendMasterRow(client, "Pending_Actions", {
      client,
      location,
      po_number: po.po_number,
      item_name: item.item_name,
      delivery_date: itemDeliveryDate,
      action_type: itemDeliveryDate
        ? "PO Requirement Added With Delivery Date"
        : "PO Requirement Added",
      pending_action: itemDeliveryDate
        ? `Prepare delivery for ${itemDeliveryDate}`
        : "Track delivery and balance",
      status: "Open",
      notes: po.notes || "",
    });

    if (itemDeliveryDate) {
      appendRowToSheet(client, location, "Delivery_Schedule", {
        client,
        location,
        po_number: po.po_number,
        po_type: po.po_type,
        item_code: item.item_code || "",
        item_name: item.item_name,
        required_qty: item.quantity,
        unit: item.unit || "",
        delivery_date: itemDeliveryDate,
        status: "Scheduled",
        source_email_id: po.source_email_id || "",
        notes: po.notes || "",
      });

      appendMasterRow(client, "Delivery_Schedule", {
        client,
        location,
        po_number: po.po_number,
        po_type: po.po_type,
        item_code: item.item_code || "",
        item_name: item.item_name,
        required_qty: item.quantity,
        unit: item.unit || "",
        delivery_date: itemDeliveryDate,
        status: "Scheduled",
        source_email_id: po.source_email_id || "",
        notes: po.notes || "",
      });
    }

    results.push(row);
  }

  return {
    success: true,
    client,
    location,
    rows_added: results.length,
    delivery_dates_found: results.filter((r) => r.delivery_date).length,
    rows: results,
  };
}