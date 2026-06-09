import { appendRowToSheet } from "@/lib/operations/storage";
import { appendMasterRow } from "@/lib/operations/masterWorkbook";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";

function safeName(value: string) {
  return (
    String(value || "general")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "general"
  );
}

export type EmailAuditStatus =
  | "Processed"
  | "Ignored"
  | "Duplicate"
  | "Needs Human Review"
  | "Error";

export function auditEmail(event: {
  client?: string;
  location?: string;
  source_email_id?: string;
  subject?: string;
  from?: string;
  email_type?: string;
  status: EmailAuditStatus;
  reason?: string;
  workflow?: string;
  confidence?: any;
  delivery_date?: string;
  po_numbers?: any;
  dn_numbers?: any;
  mrn_numbers?: any;
  items_found?: number;
  rows_added?: number;
  recommended_action?: string;
  notes?: string;
}) {
  const client = safeName(event.client || DEFAULT_CLIENT_ID);
  const location = safeName(event.location || "general");

  const row = {
    email_time_logged: new Date().toISOString(),
    source_email_id: event.source_email_id || "",
    subject: event.subject || "",
    from: event.from || "",
    client,
    location,
    email_type: event.email_type || "",
    workflow: event.workflow || "",
    status: event.status,
    reason: event.reason || "",
    confidence: event.confidence ?? "",
    delivery_date: event.delivery_date || "",
    po_numbers: Array.isArray(event.po_numbers)
      ? event.po_numbers.join(", ")
      : event.po_numbers || "",
    dn_numbers: Array.isArray(event.dn_numbers)
      ? event.dn_numbers.join(", ")
      : event.dn_numbers || "",
    mrn_numbers: Array.isArray(event.mrn_numbers)
      ? event.mrn_numbers.join(", ")
      : event.mrn_numbers || "",
    items_found: event.items_found ?? "",
    rows_added: event.rows_added ?? "",
    recommended_action: event.recommended_action || "",
    notes: event.notes || "",
  };

  appendRowToSheet(client, location, "Email_Audit", row);
  appendMasterRow(client, "Email_Audit", row);

  return row;
}