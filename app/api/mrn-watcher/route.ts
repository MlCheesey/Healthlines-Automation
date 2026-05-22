import { markMrnOverdueInDeliveryHistory } from "@/lib/operations/mrnSync";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { appendMasterRow } from "@/lib/operations/masterWorkbook";
import { backupFile } from "@/lib/system/backup";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

function readRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
}

function isPastDue(dateString: string) {
  if (!dateString) return false;

  const due = new Date(dateString);
  const today = new Date();

  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return today.getTime() > due.getTime();
}

function daysOverdue(dateString: string) {
  const due = new Date(dateString);
  const today = new Date();

  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.max(
    0,
    Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  );
}

export async function GET() {
  try {
    const clientsPath = path.join(process.cwd(), "data", "clients");

    if (!fs.existsSync(clientsPath)) {
      return Response.json({
        success: true,
        overdue_count: 0,
        overdue: [],
      });
    }

    const overdueByDn = new Map<string, any>();

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
        const dnLoggedThisWorkbook = new Set<string>();

        const updatedRows = rows.map((row: any) => {
          const location = row.location || locationFromFile;
          const dnNumber = row.dn_number || "";
          const mrnNumber = String(row.mrn_number || row.mrn_numbers || "").trim();
          const status = String(row.mrn_status || row.status || "").toLowerCase();

          const isPending = !mrnNumber && !status.includes("received");
          const alreadyOverdue = status.includes("overdue");
          const alreadyLogged = Boolean(row.mrn_overdue_logged_at);
          const dueDate = row.mrn_due_date;

          if (isPending && isPastDue(dueDate)) {
            const key = `${client}__${location}__${dnNumber}`;

            overdueByDn.set(key, {
              client,
              location,
              po_number: row.po_number || "",
              dn_number: dnNumber,
              mrn_due_date: dueDate,
              overdue_days: daysOverdue(dueDate),
              invoice_allowed_with_mrn_pending: true,
              required_action: "Follow up MRN. Invoice may show MRN Pending.",
            });

            if (!alreadyOverdue || !alreadyLogged) {
              changed = true;

              if (!alreadyLogged && !dnLoggedThisWorkbook.has(key)) {
                dnLoggedThisWorkbook.add(key);

                markMrnOverdueInDeliveryHistory({
  client,
  location,
  dn_number: dnNumber,
});

                appendMasterRow(client, "Pending_Actions", {
                  client,
                  location,
                  dn_number: dnNumber,
                  action_type: "MRN Overdue",
                  pending_action:
                    "MRN is overdue. Follow up with customer. Invoice can still be prepared with MRN Pending.",
                  status: "Open",
                  mrn_due_date: dueDate,
                  overdue_days: daysOverdue(dueDate),
                });
              }

              return {
                ...row,
                mrn_status: "Overdue",
                status: "Overdue",
                mrn_overdue_logged_at:
                  row.mrn_overdue_logged_at || new Date().toISOString(),
              };
            }
          }

          return row;
        });

        if (changed) {
          workbook.Sheets["MRN_Log"] = XLSX.utils.json_to_sheet(updatedRows);
          backupFile(filePath);
          XLSX.writeFile(workbook, filePath);
        }
      }
    }

    const overdue = Array.from(overdueByDn.values());

    logSystemEvent("mrn_watcher_completed", "MRN watcher completed", {
      overdue_count: overdue.length,
    });

    return Response.json({
      success: true,
      overdue_count: overdue.length,
      overdue,
    });
  } catch (error: any) {
    logSystemError("mrn-watcher-api", error);

    return Response.json(
      { error: error.message || "MRN watcher failed" },
      { status: 500 }
    );
  }
}