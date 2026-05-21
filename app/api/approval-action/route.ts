import { appendMasterRow } from "@/lib/operations/masterWorkbook";
import { appendRowToSheet } from "@/lib/operations/storage";

function safeName(value: string) {
  return String(value || "unknown")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const client = safeName(body.client || "unknown_client");
    const location = safeName(body.location || "general");

    const actionRecord = {
      client,
      location,
      action_type: body.action_type || "Workflow Approval",
      reference_number: body.reference_number || "",
      po_number: body.po_number || "",
      dn_number: body.dn_number || "",
      mrn_number: body.mrn_number || "",
      invoice_number: body.invoice_number || "",
      decision: body.decision || "Logged",
      remarks: body.remarks || "",
      approved_by: body.approved_by || "dashboard_user",
      status: body.decision || "Logged",
      created_at: new Date().toISOString(),
    };

    appendMasterRow(client, "Approval_Actions", actionRecord);
    appendRowToSheet(client, location, "Approval_Actions", actionRecord);

    if (actionRecord.action_type.includes("Invoice")) {
      appendMasterRow(client, "Invoice_Tracker", {
        ...actionRecord,
        invoice_status:
          actionRecord.decision === "Approved" ? "Approved" : "Rejected",
      });
    }

    if (actionRecord.action_type.includes("MRN")) {
      appendMasterRow(client, "MRN_Tracker", {
        ...actionRecord,
        mrn_status:
          actionRecord.decision === "Approved" ? "Resolved" : "Pending",
      });
    }

    appendMasterRow(client, "Pending_Actions", {
      ...actionRecord,
      action_type: "Approval Decision",
      pending_action: `${actionRecord.action_type} ${actionRecord.decision}`,
      status: "Completed",
    });

    return Response.json({
      success: true,
      actionRecord,
    });
  } catch (error: any) {
    return Response.json(
      {
        error: error.message || "Approval action failed",
      },
      { status: 500 }
    );
  }
}