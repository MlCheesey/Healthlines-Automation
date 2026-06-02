import { addToGmailQueue } from "@/lib/gmail/gmailQueue";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

import { appendMasterRow } from "@/lib/operations/masterWorkbook";
import { backupFile } from "@/lib/system/backup";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";
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

function readRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) return [];

  return XLSX.utils.sheet_to_json<any>(sheet, {
    defval: "",
  });
}

function updateDeliveryHistoryStatuses({
  client,
  package_id,
  decision,
}: {
  client: string;
  package_id: string;
  decision: "Approved" | "Rejected";
}) {
  const clientPath = path.join(DATA_ROOT,
    "clients",
    safeName(client)
  );

  if (!fs.existsSync(clientPath)) {
    return {
      updated_rows: 0,
      updated_files: [],
      package_files: [],
    };
  }

  const files = fs
    .readdirSync(clientPath)
    .filter((file) => file.endsWith(".xlsx") && file !== "master.xlsx");

  let updatedRows = 0;
  const updatedFiles: string[] = [];
  const packageFiles: string[] = [];

  for (const file of files) {
    const workbookPath = path.join(clientPath, file);

    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.readFile(workbookPath);
    } catch {
      continue;
    }

    const rows = readRows(workbook, "Delivery_History");

    if (rows.length === 0) continue;

    let changed = false;

    const updated = rows.map((row: any) => {
      const samePackage =
        String(row.invoice_package_id || "") === String(package_id || "");

      if (!samePackage) return row;

      changed = true;
      updatedRows += 1;

      if (row.invoice_number) {
        packageFiles.push(String(row.invoice_number));
      }

      return {
        ...row,
        invoice_status:
          decision === "Approved"
            ? "Approved - Ready to Send"
            : "Rejected - Requires Review",

        invoice_approved_at:
          decision === "Approved" ? new Date().toISOString() : "",

        invoice_rejected_at:
          decision === "Rejected" ? new Date().toISOString() : "",
      };
    });

    if (changed) {
      workbook.Sheets["Delivery_History"] = XLSX.utils.json_to_sheet(updated);

      backupFile(workbookPath);
      XLSX.writeFile(workbook, workbookPath);

      updatedFiles.push(workbookPath);
    }
  }

  return {
    updated_rows: updatedRows,
    updated_files: updatedFiles,
    package_files: [...new Set(packageFiles)],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.client || !body.package_id || !body.decision) {
      return Response.json(
        {
          error: "client, package_id and decision are required",
        },
        { status: 400 }
      );
    }

    const decision = String(body.decision);

    if (!["Approved", "Rejected"].includes(decision)) {
      return Response.json(
        {
          error: "decision must be Approved or Rejected",
        },
        { status: 400 }
      );
    }

    const statusUpdate = updateDeliveryHistoryStatuses({
      client: body.client,
      package_id: body.package_id,
      decision: decision as "Approved" | "Rejected",
    });

    const record = {
      client: body.client,
      package_id: body.package_id,
      decision,
      remarks: body.remarks || "",
      approved_by: body.approved_by || "dashboard_user",
      status:
        decision === "Approved"
          ? "Ready to Draft/Send"
          : "Rejected - Requires Review",
      updated_rows: statusUpdate.updated_rows,
      created_at: new Date().toISOString(),
    };

    appendMasterRow(body.client, "Invoice_Approvals", record);

    appendMasterRow(body.client, "Pending_Actions", {
      client: body.client,
      package_id: body.package_id,
      action_type: "Invoice Package Approval",
      pending_action:
        decision === "Approved"
          ? "Invoice package approved. Added to Gmail draft queue."
          : "Invoice package rejected. Review blocked or incorrect invoices.",
      status: decision === "Approved" ? "Completed" : "Open",
      remarks: body.remarks || "",
    });

    let gmailQueueRecord = null;

    if (decision === "Approved") {
      gmailQueueRecord = addToGmailQueue({
        client: body.client,
        package_id: body.package_id,
        subject: `Invoice Submission - ${body.client}`,
        body: `Dear Team,

Please find attached the approved invoice package for your review and processing.

Best regards,
Health Lines Medical Supply Co.`,
        recipient: "",
        attachments: statusUpdate.package_files || [],
      });
    }

    logSystemEvent(
      "invoice_package_approval",
      "Invoice package decision saved",
      {
        ...record,
        updated_files: statusUpdate.updated_files,
        gmail_queue_id: gmailQueueRecord?.id || "",
      }
    );

    return Response.json({
      success: true,
      approval: record,
      statusUpdate,
      gmailQueueRecord,
    });
  } catch (error: any) {
    logSystemError("invoice-approval-api", error);

    return Response.json(
      {
        error: error.message || "Invoice approval failed",
      },
      { status: 500 }
    );
  }
}