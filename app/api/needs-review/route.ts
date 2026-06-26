import { DATA_ROOT } from "@/lib/config/storage";
import { buildInvoiceCycle } from "@/lib/invoices/buildInvoiceCycle";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

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

function isReviewRow(row: any) {
  const status = String(row.status || "").toLowerCase();
  const actionType = String(row.action_type || "").toLowerCase();
  const emailType = String(row.email_type || "").toLowerCase();
  const issueType = String(row.issue_type || "").toLowerCase();
  const reason = String(row.reason || "").toLowerCase();
  const notes = String(row.notes || "").toLowerCase();
  const pendingAction = String(row.pending_action || "").toLowerCase();

  return (
    status.includes("review") ||
    status.includes("error") ||
    status.includes("duplicate") ||
    status.includes("blocked") ||
    status.includes("open") ||
    emailType === "other" ||
    issueType.includes("invoice") ||
    actionType.includes("review") ||
    actionType.includes("follow-up") ||
    reason.includes("no items") ||
    reason.includes("low confidence") ||
    reason.includes("not extracted") ||
    reason.includes("vat") ||
    reason.includes("missing rate") ||
    notes.includes("vat") ||
    notes.includes("missing rate") ||
    pendingAction.includes("mrn") ||
    pendingAction.includes("vat") ||
    pendingAction.includes("rate")
  );
}

function normalizeReviewSourceRow({
  source,
  client,
  row,
}: {
  source: string;
  client: string;
  row: any;
}) {
  const reason =
    row.reason ||
    row.pending_action ||
    row.recommended_action ||
    row.notes ||
    "Review manually.";

  return {
    id: [
      source,
      client,
      row.location || "general",
      row.source_email_id || "",
      row.dn_number || row.dn_numbers || "",
      row.item_name || "",
      reason,
    ]
      .join("__")
      .replace(/\s+/g, "_"),
    source,
    category: "Email / Workflow Review",
    priority: row.status === "Error" ? "High" : "Medium",
    client,
    location: row.location || "general",
    status: row.status || "Needs Review",
    subject: row.subject || row.pending_action || "Untitled email/action",
    from: row.from || "",
    email_type: row.email_type || row.issue_type || "",
    confidence: row.confidence ?? "",
    po_number: row.po_number || row.po_numbers || "",
    dn_number: row.dn_number || row.dn_numbers || "",
    mrn_number: row.mrn_number || row.mrn_numbers || "",
    item_code: row.item_code || "",
    item_name: row.item_name || "",
    qty: row.qty || row.delivered_qty || "",
    unit: row.unit || "",
    rate: row.rate ?? "",
    vat_percent: row.vat_percent ?? "",
    vat_amount: row.vat_amount ?? "",
    taxability: row.taxability || "",
    tax_reason: row.tax_reason || "",
    needs_vat_review: row.needs_vat_review || "",
    reason,
    notes: row.notes || "",
    created_at:
      row.email_time_logged ||
      row.created_at ||
      row.mrn_overdue_logged_at ||
      row.invoice_packaged_at ||
      "",
    raw: row,
  };
}

function blockedInvoiceItemRows(client: string) {
  const rows: any[] = [];

  const cycle = buildInvoiceCycle(client);

  for (const group of cycle.invoice_groups || []) {
    if (!group.is_blocked) continue;

    const blockedReasons = Array.isArray(group.blocked_reasons)
      ? group.blocked_reasons
      : [];

    for (const item of group.items || []) {
      const itemNeedsRate =
        item.rate === "" ||
        item.rate === null ||
        item.rate === undefined ||
        Number.isNaN(Number(item.rate));

      const itemNeedsVat =
        item.needs_vat_review === true ||
        String(item.needs_vat_review || "").toLowerCase() === "yes" ||
        String(item.needs_vat_review || "").toLowerCase() === "true" ||
        String(item.taxability || "").toLowerCase().includes("review") ||
        String(item.tax_reason || "").toLowerCase().includes("review") ||
        item.vat_percent === "" ||
        item.vat_percent === null ||
        item.vat_percent === undefined;

      const itemIsRelevant =
        itemNeedsRate ||
        itemNeedsVat ||
        blockedReasons.some((reason: string) =>
          String(reason || "").toLowerCase().includes("mrn")
        );

      if (!itemIsRelevant) continue;

      rows.push({
        id: [
          "invoice-block",
          client,
          group.location || "general",
          group.dn_number || "",
          item.item_name || "",
        ]
          .join("__")
          .replace(/\s+/g, "_"),
        source: "Invoice_Cycle",
        category: "Invoice Block",
        priority: blockedReasons.some((reason: string) =>
          String(reason).toLowerCase().includes("overdue")
        )
          ? "High"
          : "Medium",
        client,
        location: group.location || "general",
        status: group.invoice_readiness_status || "Blocked",
        subject: `Invoice blocked - DN ${group.dn_number || "-"}`,
        from: "",
        email_type: "Invoice Block",
        confidence: "",
        po_number: group.po_number || "",
        dn_number: group.dn_number || "",
        mrn_number: group.mrn_number || "",
        mrn_status: group.mrn_status || "",
        invoice_number: group.invoice_number || "",
        invoice_package_id: group.invoice_package_id || "",
        item_code: item.item_code || "",
        item_name: item.item_name || "",
        qty: item.qty || item.delivered_qty || "",
        unit: item.unit || "",
        rate: item.rate ?? "",
        taxable_amount: item.taxable_amount ?? "",
        vat_percent: item.vat_percent ?? "",
        vat_amount: item.vat_amount ?? "",
        taxability: item.taxability || "",
        tax_reason: item.tax_reason || "",
        needs_vat_review: item.needs_vat_review || "",
        reason: blockedReasons.join(", ") || "Invoice review required",
        notes: item.tax_reason || "",
        created_at: "",
        can_manual_update: true,
        needs_rate_update: itemNeedsRate,
        needs_vat_update: itemNeedsVat,
        raw: {
          group,
          item,
        },
      });
    }
  }

  return rows;
}

export async function GET() {
  const clientsDir = path.join(DATA_ROOT, "clients");
  const rows: any[] = [];

  if (!fs.existsSync(clientsDir)) {
    return Response.json({
      success: true,
      count: 0,
      rows: [],
      summary: {
        total: 0,
        invoice_blocks: 0,
        workflow_reviews: 0,
        high_priority: 0,
      },
    });
  }

  for (const client of fs.readdirSync(clientsDir)) {
    const clientPath = path.join(clientsDir, client);

    if (!fs.existsSync(clientPath)) continue;
    if (!fs.statSync(clientPath).isDirectory()) continue;

    rows.push(...blockedInvoiceItemRows(client));

    const masterPath = path.join(clientPath, "master.xlsx");

    const emailAudit = readSheet(masterPath, "Email_Audit");
    const pendingActions = readSheet(masterPath, "Pending_Actions");
    const aiLog = readSheet(masterPath, "AI_Log");

    rows.push(
      ...emailAudit.filter(isReviewRow).map((row: any) =>
        normalizeReviewSourceRow({
          source: "Email_Audit",
          client,
          row,
        })
      )
    );

    rows.push(
      ...pendingActions.filter(isReviewRow).map((row: any) =>
        normalizeReviewSourceRow({
          source: "Pending_Actions",
          client,
          row,
        })
      )
    );

    rows.push(
      ...aiLog.filter(isReviewRow).map((row: any) =>
        normalizeReviewSourceRow({
          source: "AI_Log",
          client,
          row,
        })
      )
    );
  }

  const uniqueRows = new Map<string, any>();

  for (const row of rows) {
    uniqueRows.set(row.id, row);
  }

  const finalRows = Array.from(uniqueRows.values()).reverse();

  return Response.json({
    success: true,
    count: finalRows.length,
    rows: finalRows,
    summary: {
      total: finalRows.length,
      invoice_blocks: finalRows.filter((row) => row.category === "Invoice Block")
        .length,
      workflow_reviews: finalRows.filter(
        (row) => row.category !== "Invoice Block"
      ).length,
      high_priority: finalRows.filter((row) => row.priority === "High").length,
      missing_rate: finalRows.filter((row) => row.needs_rate_update).length,
      vat_review: finalRows.filter((row) => row.needs_vat_update).length,
    },
  });
}