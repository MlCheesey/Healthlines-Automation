import { markMrnOverdueInDeliveryHistory } from "@/lib/operations/mrnSync";
import { appendMasterRow } from "@/lib/operations/masterWorkbook";
import { DATA_ROOT } from "@/lib/config/storage";
import { internalFetch } from "@/lib/system/internalFetch";
import { backupFile } from "@/lib/system/backup";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

function readRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
}

function isPastDue(dateString: string) {
  if (!dateString) return false;

  const due = new Date(dateString);
  const today = new Date();

  if (Number.isNaN(due.getTime())) return false;

  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return today.getTime() > due.getTime();
}

function daysOverdue(dateString: string) {
  const due = new Date(dateString);
  const today = new Date();

  if (Number.isNaN(due.getTime())) return 0;

  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.max(
    0,
    Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function mrnDraftKey(client: string, location: string, dnNumber: string) {
  return `${client}__${location}__${dnNumber}`;
}

async function createMrnFollowupDraft(item: any) {
  const to = process.env.DAVITA_MRN_FOLLOWUP_TO || "";

  if (!to) {
    return {
      success: false,
      skipped: true,
      reason: "DAVITA_MRN_FOLLOWUP_TO missing in .env.local",
    };
  }

  const subject = `MRN Pending Follow-up - DN ${item.dn_number}`;

  const body = `Dear Team,

Kindly share the MRN for the below delivery note:

Client: ${item.client}
Location: ${item.location}
PO Number: ${item.po_number || "-"}
Delivery Note: ${item.dn_number}
DN Date: ${item.dn_date || "-"}
MRN Due Date: ${item.mrn_due_date || "-"}
Overdue Days: ${item.overdue_days}

This is required for our invoice processing.

Best regards,
HealthLines Medical Supply Co.`;

  const res = await internalFetch("/api/gmail/create-draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      subject,
      body,
      attachments: [],
    }),
  });

  const data = await res.json();

  return {
    success: res.ok,
    ...data,
  };
}

export async function GET() {
  try {
    const clientsPath = path.join(DATA_ROOT, "clients");

    if (!fs.existsSync(clientsPath)) {
      return Response.json({
        success: true,
        overdue_count: 0,
        overdue: [],
      });
    }

    const overdue: any[] = [];
    const draftResults: any[] = [];

    for (const client of fs.readdirSync(clientsPath)) {
      const clientPath = path.join(clientsPath, client);

      if (!fs.statSync(clientPath).isDirectory()) continue;

      const files = fs
        .readdirSync(clientPath)
        .filter((file) => file.endsWith(".xlsx") && file !== "master.xlsx");

      for (const file of files) {
        const locationFromFile = file.replace(".xlsx", "");
        const filePath = path.join(clientPath, file);

        const workbook = XLSX.readFile(filePath);
        const rows = readRows(workbook, "MRN_Log");

        if (rows.length === 0) continue;

        let changed = false;

        const updatedRows = rows.map((row: any) => {
          const location = row.location || locationFromFile;
          const dnNumber = row.dn_number || "";
          const mrnNumber = String(row.mrn_number || row.mrn_numbers || "").trim();
          const status = String(row.mrn_status || row.status || "").toLowerCase();

          const isPending = !mrnNumber && !status.includes("received");
          const alreadyOverdue = status.includes("overdue");
          const alreadyDrafted = Boolean(row.mrn_followup_draft_id);
          const dueDate = row.mrn_due_date;

          if (!isPending || !isPastDue(dueDate)) return row;

          const item = {
            client,
            location,
            po_number: row.po_number || "",
            dn_number: dnNumber,
            dn_date: row.dn_date || "",
            mrn_due_date: dueDate,
            overdue_days: daysOverdue(dueDate),
            draft_key: mrnDraftKey(client, location, dnNumber),
          };

          overdue.push(item);
          markMrnOverdueInDeliveryHistory({
            client,
            location,
            dn_number: dnNumber,
          });

          if (alreadyDrafted) {
            return {
              ...row,
              mrn_status: "Overdue",
              status: "Overdue",
              mrn_overdue_logged_at:
                row.mrn_overdue_logged_at || new Date().toISOString(),
            };
          }

          changed = true;

          return {
            ...row,
            mrn_status: alreadyOverdue ? row.mrn_status : "Overdue",
            status: "Overdue",
            mrn_overdue_logged_at:
              row.mrn_overdue_logged_at || new Date().toISOString(),
            mrn_followup_draft_status: "Pending Draft Creation",
          };
        });

        if (changed) {
          workbook.Sheets["MRN_Log"] = XLSX.utils.json_to_sheet(updatedRows);
          backupFile(filePath);
          XLSX.writeFile(workbook, filePath);
        }
      }
    }

    for (const item of overdue) {
      appendMasterRow(item.client, "Pending_Actions", {
        client: item.client,
        location: item.location,
        po_number: item.po_number,
        dn_number: item.dn_number,
        action_type: "MRN Follow-up",
        pending_action: `MRN overdue. Review Gmail draft follow-up for DN ${item.dn_number}`,
        status: "Open",
        human_required: true,
        mrn_due_date: item.mrn_due_date,
        overdue_days: item.overdue_days,
      });

      const draftResult = await createMrnFollowupDraft(item);

      draftResults.push({
        ...item,
        draftResult,
      });

      if (draftResult.success) {
        appendMasterRow(item.client, "Pending_Actions", {
          client: item.client,
          location: item.location,
          po_number: item.po_number,
          dn_number: item.dn_number,
          action_type: "MRN Gmail Draft Created",
          pending_action: `Gmail MRN follow-up draft created for DN ${item.dn_number}. Human review required before sending.`,
          status: "Open",
          human_required: true,
          gmail_draft_id: draftResult.draft_id || "",
        });
      }
    }

    logSystemEvent("mrn_watcher_completed", "MRN watcher completed", {
      overdue_count: overdue.length,
      draft_count: draftResults.filter((r) => r.draftResult?.success).length,
    });

    return Response.json({
      success: true,
      overdue_count: overdue.length,
      overdue,
      draftResults,
    });
  } catch (error: any) {
    logSystemError("mrn-watcher", error);

    return Response.json(
      {
        success: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}