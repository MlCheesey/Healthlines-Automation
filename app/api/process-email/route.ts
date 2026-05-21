import { recordPO } from "@/lib/operations/poRecorder";
import { appendRowToSheet } from "@/lib/operations/storage";
import { appendMasterRow } from "@/lib/operations/masterWorkbook";
import {
  hasProcessedEmail,
  markEmailProcessed,
} from "@/lib/operations/workflowProtection";
import { syncMrnReceivedToDeliveryHistory } from "@/lib/operations/mrnSync";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";

function safeName(value: string) {
  return (
    String(value || "unknown")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unknown"
  );
}

function finishEmail(sourceEmailId?: string) {
  if (sourceEmailId) {
    markEmailProcessed(sourceEmailId);
  }
}

function firstDeliveryDate(analysis: any) {
  return analysis.delivery_dates?.[0] || analysis.delivery_date || "";
}

function normalizeItemsWithDeliveryDate(items: any[], deliveryDate: string) {
  return (items || []).map((item: any) => ({
    ...item,
    quantity: Number(item.quantity || item.qty || item.required_qty || 0),
    delivery_date: item.delivery_date || deliveryDate || "",
  }));
}

export async function POST(req: Request) {
  try {
    const analysis = await req.json();

    if (
      analysis.source_email_id &&
      hasProcessedEmail(analysis.source_email_id)
    ) {
      return Response.json({
        success: false,
        duplicate: true,
        message: "Email already processed",
      });
    }

    const client = safeName(analysis.client || DEFAULT_CLIENT_ID);
    const emailType = analysis.email_type || "Other";
    const deliveryDate = firstDeliveryDate(analysis);

    const baseLog = {
      client,
      email_type: emailType,
      confidence: analysis.confidence,
      urgency: analysis.urgency,
      recommended_action: analysis.recommended_action,
      human_required: analysis.human_required,
      delivery_date: deliveryDate,
      notes: analysis.notes || "",
    };

    if (emailType === "Quarterly PO" && Array.isArray(analysis.locations)) {
      const results = [];

      for (const locationBlock of analysis.locations) {
        const location = safeName(locationBlock.location || "general");

        const locationDeliveryDate =
          locationBlock.delivery_date || deliveryDate || "";

        const result = recordPO({
          client,
          po_number:
            analysis.po_numbers?.[0] || analysis.po_number || "UNKNOWN_PO",
          po_type: "Quarterly PO",
          location,
          items: normalizeItemsWithDeliveryDate(
            locationBlock.items || [],
            locationDeliveryDate
          ),
          delivery_date: locationDeliveryDate,
          source_email_id: analysis.source_email_id || "",
          notes: analysis.notes || "Quarterly PO recorded from AI analysis",
        });

        appendRowToSheet(client, location, "AI_Log", {
          ...baseLog,
          location,
          delivery_date: locationDeliveryDate,
        });

        results.push(result);
      }

      finishEmail(analysis.source_email_id);

      return Response.json({
        success: true,
        workflow: "Quarterly PO",
        client,
        locations_processed: results.length,
        delivery_date: deliveryDate,
        results,
      });
    }

    if (emailType === "Quarterly PO") {
      const location = safeName(analysis.location || "general");

      const result = recordPO({
        client,
        po_number:
          analysis.po_numbers?.[0] || analysis.po_number || "UNKNOWN_PO",
        po_type: "Quarterly PO",
        location,
        items: normalizeItemsWithDeliveryDate(
          analysis.items || [],
          deliveryDate
        ),
        delivery_date: deliveryDate,
        source_email_id: analysis.source_email_id || "",
        notes: analysis.notes || "Quarterly PO recorded from AI analysis",
      });

      appendRowToSheet(client, location, "AI_Log", {
        ...baseLog,
        location,
      });

      finishEmail(analysis.source_email_id);

      return Response.json({
        success: true,
        workflow: "Quarterly PO fallback",
        client,
        location,
        delivery_date: deliveryDate,
        result,
      });
    }

    if (emailType === "Additional PO") {
      const location = safeName(analysis.location || "general");

      const result = recordPO({
        client,
        po_number:
          analysis.po_numbers?.[0] || analysis.po_number || "UNKNOWN_PO",
        po_type: "Additional PO",
        location,
        items: normalizeItemsWithDeliveryDate(
          analysis.items || [],
          deliveryDate
        ),
        delivery_date: deliveryDate,
        source_email_id: analysis.source_email_id || "",
        notes: analysis.notes || "Additional PO recorded from AI analysis",
      });

      appendRowToSheet(client, location, "AI_Log", {
        ...baseLog,
        location,
      });

      finishEmail(analysis.source_email_id);

      return Response.json({
        success: true,
        workflow: "Additional PO",
        client,
        location,
        delivery_date: deliveryDate,
        result,
      });
    }

    if (
      emailType === "Delivery Instruction" ||
      emailType === "Delivery Date Query" ||
      emailType === "Delivery Reminder" ||
      emailType === "Partial Stock Reminder"
    ) {
      const location = safeName(analysis.location || "general");

      appendRowToSheet(client, location, "Active_Delivery_Tasks", {
        client,
        location,
        email_type: emailType,
        po_numbers: analysis.po_numbers?.join(", ") || "",
        delivery_dates: analysis.delivery_dates?.join(", ") || "",
        delivery_date: deliveryDate,
        action: analysis.recommended_action || "",
        status: "Pending Human Review",
        human_required: true,
        notes: analysis.notes || "",
      });

      appendMasterRow(client, "Pending_Actions", {
        client,
        location,
        email_type: emailType,
        po_numbers: analysis.po_numbers?.join(", ") || "",
        delivery_date: deliveryDate,
        pending_action: analysis.recommended_action || "",
        status: "Open",
        human_required: true,
        notes: analysis.notes || "",
      });

      appendRowToSheet(client, location, "AI_Log", {
        ...baseLog,
        location,
      });

      finishEmail(analysis.source_email_id);

      return Response.json({
        success: true,
        workflow: emailType,
        client,
        location,
        delivery_date: deliveryDate,
      });
    }

    if (emailType === "MRN") {
      const location = safeName(analysis.location || "general");

      appendRowToSheet(client, location, "MRN_Log", {
        client,
        location,
        mrn_numbers: analysis.mrn_numbers?.join(", ") || "",
        dn_numbers: analysis.dn_numbers?.join(", ") || "",
        po_numbers: analysis.po_numbers?.join(", ") || "",
        status: "Received",
        notes: analysis.notes || "",
      });

      appendMasterRow(client, "MRN_Tracker", {
        client,
        location,
        mrn_numbers: analysis.mrn_numbers?.join(", ") || "",
        dn_numbers: analysis.dn_numbers?.join(", ") || "",
        po_numbers: analysis.po_numbers?.join(", ") || "",
        status: "Received",
        notes: analysis.notes || "",
      });

      const syncResult = syncMrnReceivedToDeliveryHistory({
        client,
        location,
        dn_numbers: analysis.dn_numbers || [],
        po_numbers: analysis.po_numbers || [],
        mrn_numbers: analysis.mrn_numbers || [],
      });

      appendRowToSheet(client, location, "AI_Log", {
        ...baseLog,
        location,
      });

      finishEmail(analysis.source_email_id);

      return Response.json({
        success: true,
        workflow: "MRN",
        client,
        location,
        syncResult,
      });
    }

    if (emailType === "Query / Discrepancy" || emailType === "Invoice Issue") {
      const location = safeName(analysis.location || "general");

      appendRowToSheet(client, location, "Issues", {
        client,
        location,
        issue_type: emailType,
        urgency: analysis.urgency,
        status: "Open",
        human_required: true,
        notes: analysis.notes || "",
      });

      appendMasterRow(client, "Pending_Actions", {
        client,
        location,
        issue_type: emailType,
        pending_action: analysis.recommended_action || "Review issue",
        status: "Open",
        human_required: true,
        notes: analysis.notes || "",
      });

      appendRowToSheet(client, location, "AI_Log", {
        ...baseLog,
        location,
      });

      finishEmail(analysis.source_email_id);

      return Response.json({
        success: true,
        workflow: emailType,
        client,
        location,
      });
    }

    const location = safeName(analysis.location || "general");

    appendRowToSheet(client, location, "AI_Log", {
      ...baseLog,
      location,
      fallback: true,
    });

    appendMasterRow(client, "AI_Log", {
      ...baseLog,
      location,
      fallback: true,
    });

    finishEmail(analysis.source_email_id);

    return Response.json({
      success: true,
      workflow: "Logged only",
      client,
      location,
      emailType,
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Process email failed" },
      { status: 500 }
    );
  }
}
