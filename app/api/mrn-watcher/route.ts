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

function shouldSkipWorkbook(file: string) {
  const lower = file.toLowerCase();

  if (!lower.endsWith(".xlsx")) return true;
  if (lower === "master.xlsx") return true;
  if (lower.startsWith("~$")) return true;

  return false;
}

function safeLocationFromFile(file: string) {
  return (
    file
      .replace(/\.xlsx$/i, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "general"
  );
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
        skipped_files: [],
        message: "Clients folder does not exist yet.",
      });
    }

    const overdue: any[] = [];
    const draftResults: any[] = [];
    const skippedFiles: any[] = [];
    const scannedFiles: string[] = [];

    for (const client of fs.readdirSync(clientsPath)) {
      const clientPath = path.join(clientsPath, client);

      if (!fs.existsSync(clientPath)) continue;
      if (!fs.statSync(clientPath).isDirectory()) continue;

      const files = fs.readdirSync(clientPath).filter((file) => !shouldSkipWorkbook(file));

      for (const file of files) {
        const locationFromFile = safeLocationFromFile(file);
        const filePath = path.join(clientPath, file);

        if (!fs.existsSync(filePath)) {
          skippedFiles.push({
            client,
            file,
            filePath,
            reason: "Workbook path does not exist",
          });
          continue;
        }

        let workbook: XLSX.WorkBook;

        try {
          workbook = XLSX.readFile(filePath);
        } catch (error: any) {
          skippedFiles.push({
            client,
            file,
            filePath,
            reason: error?.message || "Could not read workbook",
          });

          logSystemError("mrn-watcher-workbook-read-skip", {
            client,
            file,
            filePath,
            error: error?.message || String(error),
          });

          continue;
        }

        scannedFiles.push(filePath);

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

          try {
            markMrnOverdueInDeliveryHistory({
              client,
              location,
              dn_number: dnNumber,
            });
          } catch (error: any) {
            skippedFiles.push({
              client,
              file,
              filePath,
              reason: `Could not mark DN overdue in Delivery_History: ${
                error?.message || String(error)
              }`,
            });
          }

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
          try {
            workbook.Sheets["MRN_Log"] = XLSX.utils.json_to_sheet(updatedRows);
            backupFile(filePath);
            XLSX.writeFile(workbook, filePath);
          } catch (error: any) {
            skippedFiles.push({
              client,
              file,
              filePath,
              reason: error?.message || "Could not write updated workbook",
            });

            logSystemError("mrn-watcher-workbook-write-skip", {
              client,
              file,
              filePath,
              error: error?.message || String(error),
            });
          }
        }
      }
    }

    for (const item of overdue) {
      try {
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
      } catch (error: any) {
        skippedFiles.push({
          client: item.client,
          location: item.location,
          dn_number: item.dn_number,
          reason: `Could not append Pending_Actions row: ${
            error?.message || String(error)
          }`,
        });
      }

      const draftResult = await createMrnFollowupDraft(item);

      draftResults.push({
        ...item,
        draftResult,
      });

      if (draftResult.success) {
        try {
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
        } catch (error: any) {
          skippedFiles.push({
            client: item.client,
            location: item.location,
            dn_number: item.dn_number,
            reason: `Could not append Gmail draft Pending_Actions row: ${
              error?.message || String(error)
            }`,
          });
        }
      }
    }

    logSystemEvent("mrn_watcher_completed", "MRN watcher completed", {
      overdue_count: overdue.length,
      draft_count: draftResults.filter((r) => r.draftResult?.success).length,
      scanned_files: scannedFiles.length,
      skipped_files: skippedFiles.length,
    });

    return Response.json({
      success: true,
      overdue_count: overdue.length,
      overdue,
      draftResults,
      scanned_files: scannedFiles,
      skipped_files: skippedFiles,
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