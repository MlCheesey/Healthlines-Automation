import { recordPO } from "@/lib/operations/poRecorder";
import { appendRowToSheet } from "@/lib/operations/storage";
import { appendMasterRow } from "@/lib/operations/masterWorkbook";
import {
  hasProcessedEmail,
  markEmailProcessed,
} from "@/lib/operations/workflowProtection";
import { syncMrnReceivedToDeliveryHistory } from "@/lib/operations/mrnSync";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";
import { auditEmail } from "@/lib/operations/emailAudit";

function safeName(value: string) {
  return (
    String(value || "general")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "general"
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
  return (items || [])
    .map((item: any) => ({
      ...item,
      item_code: item.item_code || item.code || "",
      item_name: item.item_name || item.name || item.description || "",
      quantity: Number(item.quantity || item.qty || item.required_qty || 0),
      unit: item.unit || "",
      rate:
        item.rate === undefined || item.rate === null || item.rate === ""
          ? null
          : Number(item.rate),
      delivery_date: item.delivery_date || deliveryDate || "",
    }))
    .filter((item: any) => item.item_name || item.quantity);
}

function allItemsFromAnalysis(analysis: any, deliveryDate: string) {
  const directItems = normalizeItemsWithDeliveryDate(
    analysis.items || [],
    deliveryDate
  );

  const locationItems = Array.isArray(analysis.locations)
    ? analysis.locations.flatMap((locationBlock: any) =>
        normalizeItemsWithDeliveryDate(
          locationBlock.items || [],
          locationBlock.delivery_date || deliveryDate
        )
      )
    : [];

  return [...directItems, ...locationItems];
}

function createHumanReviewAction({
  client,
  location,
  analysis,
  reason,
}: {
  client: string;
  location: string;
  analysis: any;
  reason: string;
}) {
  const deliveryDate = firstDeliveryDate(analysis);

  const row = {
    client,
    location,
    source_email_id: analysis.source_email_id || "",
    subject: analysis.subject || "",
    from: analysis.source_email_from || analysis.from || "",
    email_type: analysis.email_type || "Other",
    po_numbers: Array.isArray(analysis.po_numbers)
      ? analysis.po_numbers.join(", ")
      : analysis.po_number || "",
    dn_numbers: Array.isArray(analysis.dn_numbers)
      ? analysis.dn_numbers.join(", ")
      : "",
    mrn_numbers: Array.isArray(analysis.mrn_numbers)
      ? analysis.mrn_numbers.join(", ")
      : "",
    delivery_date: deliveryDate,
    pending_action:
      analysis.recommended_action ||
      "Review email manually and update workflow",
    action_type: "Email Needs Human Review",
    reason,
    status: "Open",
    human_required: true,
    notes: analysis.notes || "",
  };

  appendRowToSheet(client, location, "Pending_Actions", row);
  appendMasterRow(client, "Pending_Actions", row);

  return row;
}

function logAI({
  client,
  location,
  analysis,
  extra,
}: {
  client: string;
  location: string;
  analysis: any;
  extra?: Record<string, any>;
}) {
  appendRowToSheet(client, location, "AI_Log", {
    client,
    location,
    source_email_id: analysis.source_email_id || "",
    subject: analysis.subject || "",
    from: analysis.source_email_from || analysis.from || "",
    email_type: analysis.email_type || "Other",
    confidence: analysis.confidence,
    urgency: analysis.urgency,
    recommended_action: analysis.recommended_action,
    human_required: analysis.human_required,
    delivery_date: firstDeliveryDate(analysis),
    notes: analysis.notes || "",
    ...extra,
  });

  appendMasterRow(client, "AI_Log", {
    client,
    location,
    source_email_id: analysis.source_email_id || "",
    subject: analysis.subject || "",
    from: analysis.source_email_from || analysis.from || "",
    email_type: analysis.email_type || "Other",
    confidence: analysis.confidence,
    urgency: analysis.urgency,
    recommended_action: analysis.recommended_action,
    human_required: analysis.human_required,
    delivery_date: firstDeliveryDate(analysis),
    notes: analysis.notes || "",
    ...extra,
  });
}

function audit({
  client,
  location,
  analysis,
  status,
  reason,
  workflow,
  rowsAdded,
  itemsFound,
}: {
  client: string;
  location: string;
  analysis: any;
  status: "Processed" | "Ignored" | "Duplicate" | "Needs Human Review" | "Error";
  reason?: string;
  workflow?: string;
  rowsAdded?: number;
  itemsFound?: number;
}) {
  return auditEmail({
    client,
    location,
    source_email_id: analysis.source_email_id || "",
    subject: analysis.subject || "",
    from: analysis.source_email_from || analysis.from || "",
    email_type: analysis.email_type || "Other",
    status,
    reason,
    workflow,
    confidence: analysis.confidence,
    delivery_date: firstDeliveryDate(analysis),
    po_numbers: analysis.po_numbers || analysis.po_number || "",
    dn_numbers: analysis.dn_numbers || "",
    mrn_numbers: analysis.mrn_numbers || "",
    items_found: itemsFound,
    rows_added: rowsAdded,
    recommended_action: analysis.recommended_action || "",
    notes: analysis.notes || "",
  });
}

export async function POST(req: Request) {
  let analysis: any = {};

  try {
    analysis = await req.json();

    const forceProcess = analysis.force_process === true;

    if (
      analysis.source_email_id &&
      hasProcessedEmail(analysis.source_email_id) &&
      !forceProcess
    ) {
      const client = safeName(analysis.client || DEFAULT_CLIENT_ID);
      const location = safeName(analysis.location || "general");

      audit({
        client,
        location,
        analysis,
        status: "Duplicate",
        reason: "Email was already processed and force_process was not enabled.",
        workflow: "Duplicate Guard",
        rowsAdded: 0,
        itemsFound: 0,
      });

      return Response.json({
        success: false,
        duplicate: true,
        message: "Email already processed",
      });
    }

    const client = safeName(analysis.client || DEFAULT_CLIENT_ID);
    const emailType = analysis.email_type || "Other";
    const deliveryDate = firstDeliveryDate(analysis);
    const defaultLocation = safeName(analysis.location || "general");

    if (emailType === "Quarterly PO" && Array.isArray(analysis.locations)) {
      const results = [];
      let totalRowsAdded = 0;
      let totalItemsFound = 0;

      for (const locationBlock of analysis.locations) {
        const location = safeName(locationBlock.location || "general");
        const locationDeliveryDate =
          locationBlock.delivery_date || deliveryDate || "";

        const items = normalizeItemsWithDeliveryDate(
          locationBlock.items || [],
          locationDeliveryDate
        );

        totalItemsFound += items.length;

        if (items.length === 0) {
          createHumanReviewAction({
            client,
            location,
            analysis,
            reason:
              "Quarterly PO detected, but no item rows were extracted for this location.",
          });

          logAI({
            client,
            location,
            analysis,
            extra: {
              workflow: "Quarterly PO",
              status: "Needs Human Review",
              reason: "No items extracted",
            },
          });

          results.push({
            success: false,
            location,
            rows_added: 0,
            reason: "No items extracted",
          });

          continue;
        }

        const result = recordPO({
          client,
          po_number:
            analysis.po_numbers?.[0] || analysis.po_number || "UNKNOWN_PO",
          po_type: "Quarterly PO",
          location,
          items,
          delivery_date: locationDeliveryDate,
          source_email_id: analysis.source_email_id || "",
          notes: analysis.notes || "Quarterly PO recorded from AI analysis",
        });

        totalRowsAdded += result.rows_added || 0;

        logAI({
          client,
          location,
          analysis,
          extra: {
            workflow: "Quarterly PO",
            status: "Processed",
            rows_added: result.rows_added,
          },
        });

        results.push(result);
      }

      audit({
        client,
        location: defaultLocation,
        analysis,
        status: totalRowsAdded > 0 ? "Processed" : "Needs Human Review",
        reason:
          totalRowsAdded > 0
            ? "Quarterly PO recorded into Excel."
            : "Quarterly PO detected but no Excel requirement rows were created.",
        workflow: "Quarterly PO",
        rowsAdded: totalRowsAdded,
        itemsFound: totalItemsFound,
      });

      finishEmail(analysis.source_email_id);

      return Response.json({
        success: true,
        workflow: "Quarterly PO",
        client,
        locations_processed: results.length,
        rows_added: totalRowsAdded,
        items_found: totalItemsFound,
        delivery_date: deliveryDate,
        results,
      });
    }

    if (emailType === "Quarterly PO" || emailType === "Additional PO") {
      const location = defaultLocation;
      const items = normalizeItemsWithDeliveryDate(
        analysis.items || [],
        deliveryDate
      );

      if (items.length === 0) {
        createHumanReviewAction({
          client,
          location,
          analysis,
          reason: `${emailType} detected, but no item rows were extracted.`,
        });

        logAI({
          client,
          location,
          analysis,
          extra: {
            workflow: emailType,
            status: "Needs Human Review",
            reason: "No items extracted",
          },
        });

        audit({
          client,
          location,
          analysis,
          status: "Needs Human Review",
          reason: `${emailType} detected but no item rows were extracted.`,
          workflow: emailType,
          rowsAdded: 0,
          itemsFound: 0,
        });

        finishEmail(analysis.source_email_id);

        return Response.json({
          success: true,
          workflow: emailType,
          client,
          location,
          delivery_date: deliveryDate,
          human_review_created: true,
          result: {
            success: false,
            rows_added: 0,
            reason: "No items extracted",
          },
        });
      }

      const result = recordPO({
        client,
        po_number:
          analysis.po_numbers?.[0] || analysis.po_number || "UNKNOWN_PO",
        po_type: emailType,
        location,
        items,
        delivery_date: deliveryDate,
        source_email_id: analysis.source_email_id || "",
        notes: analysis.notes || `${emailType} recorded from AI analysis`,
      });

      logAI({
        client,
        location,
        analysis,
        extra: {
          workflow: emailType,
          status: "Processed",
          rows_added: result.rows_added,
        },
      });

      audit({
        client,
        location,
        analysis,
        status: "Processed",
        reason: `${emailType} recorded into Excel.`,
        workflow: emailType,
        rowsAdded: result.rows_added,
        itemsFound: items.length,
      });

      finishEmail(analysis.source_email_id);

      return Response.json({
        success: true,
        workflow: emailType,
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
      const location = defaultLocation;
      const items = allItemsFromAnalysis(analysis, deliveryDate);

      const deliveryTaskRow = {
        client,
        location,
        source_email_id: analysis.source_email_id || "",
        subject: analysis.subject || "",
        from: analysis.source_email_from || analysis.from || "",
        email_type: emailType,
        po_numbers: Array.isArray(analysis.po_numbers)
          ? analysis.po_numbers.join(", ")
          : "",
        delivery_dates: Array.isArray(analysis.delivery_dates)
          ? analysis.delivery_dates.join(", ")
          : "",
        delivery_date: deliveryDate,
        items_found: items.length,
        items_summary: items
          .map((item: any) => `${item.item_name || ""} ${item.quantity || ""}`)
          .join(" | "),
        action: analysis.recommended_action || "Review delivery follow-up",
        status: "Pending Human Review",
        human_required: true,
        notes:
          items.length > 0
            ? analysis.notes || ""
            : `${analysis.notes || ""} No item rows were extracted from the email body/attachment.`,
      };

      appendRowToSheet(client, location, "Active_Delivery_Tasks", deliveryTaskRow);
      appendMasterRow(client, "Pending_Actions", {
        ...deliveryTaskRow,
        pending_action:
          analysis.recommended_action || "Review delivery follow-up",
        action_type: "Delivery Follow-up",
        status: "Open",
      });

      if (items.length === 0) {
        createHumanReviewAction({
          client,
          location,
          analysis,
          reason:
            "Delivery follow-up detected, but item table/details were not extracted.",
        });
      }

      logAI({
        client,
        location,
        analysis,
        extra: {
          workflow: emailType,
          status: items.length ? "Processed" : "Needs Human Review",
          items_found: items.length,
        },
      });

      audit({
        client,
        location,
        analysis,
        status: items.length ? "Processed" : "Needs Human Review",
        reason: items.length
          ? "Delivery follow-up logged into Excel."
          : "Delivery follow-up logged, but item details were not extracted.",
        workflow: emailType,
        rowsAdded: 1,
        itemsFound: items.length,
      });

      finishEmail(analysis.source_email_id);

      return Response.json({
        success: true,
        workflow: emailType,
        client,
        location,
        delivery_date: deliveryDate,
        items_found: items.length,
        human_review_created: items.length === 0,
      });
    }

    if (emailType === "MRN") {
      const location = defaultLocation;

      appendRowToSheet(client, location, "MRN_Log", {
        client,
        location,
        source_email_id: analysis.source_email_id || "",
        subject: analysis.subject || "",
        from: analysis.source_email_from || analysis.from || "",
        mrn_numbers: Array.isArray(analysis.mrn_numbers)
          ? analysis.mrn_numbers.join(", ")
          : "",
        dn_numbers: Array.isArray(analysis.dn_numbers)
          ? analysis.dn_numbers.join(", ")
          : "",
        po_numbers: Array.isArray(analysis.po_numbers)
          ? analysis.po_numbers.join(", ")
          : "",
        status: "Received",
        notes: analysis.notes || "",
      });

      appendMasterRow(client, "MRN_Tracker", {
        client,
        location,
        source_email_id: analysis.source_email_id || "",
        subject: analysis.subject || "",
        from: analysis.source_email_from || analysis.from || "",
        mrn_numbers: Array.isArray(analysis.mrn_numbers)
          ? analysis.mrn_numbers.join(", ")
          : "",
        dn_numbers: Array.isArray(analysis.dn_numbers)
          ? analysis.dn_numbers.join(", ")
          : "",
        po_numbers: Array.isArray(analysis.po_numbers)
          ? analysis.po_numbers.join(", ")
          : "",
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

      logAI({
        client,
        location,
        analysis,
        extra: {
          workflow: "MRN",
          status: "Processed",
        },
      });

      audit({
        client,
        location,
        analysis,
        status: "Processed",
        reason: "MRN email logged and sync attempted.",
        workflow: "MRN",
        rowsAdded: 1,
        itemsFound: 0,
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
      const location = defaultLocation;

      appendRowToSheet(client, location, "Issues", {
        client,
        location,
        source_email_id: analysis.source_email_id || "",
        subject: analysis.subject || "",
        from: analysis.source_email_from || analysis.from || "",
        issue_type: emailType,
        urgency: analysis.urgency,
        status: "Open",
        human_required: true,
        notes: analysis.notes || "",
      });

      appendMasterRow(client, "Pending_Actions", {
        client,
        location,
        source_email_id: analysis.source_email_id || "",
        subject: analysis.subject || "",
        from: analysis.source_email_from || analysis.from || "",
        issue_type: emailType,
        pending_action: analysis.recommended_action || "Review issue",
        action_type: "Issue Review",
        status: "Open",
        human_required: true,
        notes: analysis.notes || "",
      });

      logAI({
        client,
        location,
        analysis,
        extra: {
          workflow: emailType,
          status: "Needs Human Review",
        },
      });

      audit({
        client,
        location,
        analysis,
        status: "Needs Human Review",
        reason: `${emailType} logged for human review.`,
        workflow: emailType,
        rowsAdded: 1,
        itemsFound: 0,
      });

      finishEmail(analysis.source_email_id);

      return Response.json({
        success: true,
        workflow: emailType,
        client,
        location,
      });
    }

    const location = defaultLocation;

    createHumanReviewAction({
      client,
      location,
      analysis,
      reason: "Email type was Other or not actionable by automation.",
    });

    logAI({
      client,
      location,
      analysis,
      extra: {
        fallback: true,
        workflow: "Logged only",
        status: "Needs Human Review",
      },
    });

    audit({
      client,
      location,
      analysis,
      status: "Needs Human Review",
      reason: "Email was logged only and requires human review.",
      workflow: "Logged only",
      rowsAdded: 1,
      itemsFound: allItemsFromAnalysis(analysis, deliveryDate).length,
    });

    finishEmail(analysis.source_email_id);

    return Response.json({
      success: true,
      workflow: "Logged only",
      client,
      location,
      emailType,
      human_review_created: true,
    });
  } catch (error: any) {
    try {
      const client = safeName(analysis.client || DEFAULT_CLIENT_ID);
      const location = safeName(analysis.location || "general");

      auditEmail({
        client,
        location,
        source_email_id: analysis.source_email_id || "",
        subject: analysis.subject || "",
        from: analysis.source_email_from || analysis.from || "",
        email_type: analysis.email_type || "",
        status: "Error",
        reason: error.message || "Process email failed",
        notes: analysis.notes || "",
      });
    } catch {}

    return Response.json(
      { error: error.message || "Process email failed" },
      { status: 500 }
    );
  }
}