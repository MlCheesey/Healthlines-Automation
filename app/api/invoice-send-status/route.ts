import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { backupFile } from "@/lib/system/backup";
import {
import { DATA_ROOT } from "@/lib/config/storage";
  logSystemEvent,
  logSystemError,
} from "@/lib/system/logger";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      client,
      package_id,
      status,
    } = body;

    if (
      !client ||
      !package_id ||
      !status
    ) {
      return Response.json(
        {
          error:
            "client, package_id and status required",
        },
        { status: 400 }
      );
    }

    const allowed = [
      "Drafted",
      "Sent",
    ];

    if (!allowed.includes(status)) {
      return Response.json(
        {
          error:
            "status must be Drafted or Sent",
        },
        { status: 400 }
      );
    }

    const clientPath = path.join(DATA_ROOT,
      "clients",
      safeName(client)
    );

    if (!fs.existsSync(clientPath)) {
      return Response.json(
        {
          error:
            "Client directory not found",
        },
        { status: 404 }
      );
    }

    const files = fs
      .readdirSync(clientPath)
      .filter(
        (f) =>
          f.endsWith(".xlsx") &&
          f !== "master.xlsx"
      );

    let updatedRows = 0;

    for (const file of files) {
      const workbookPath = path.join(
        clientPath,
        file
      );

      let workbook: XLSX.WorkBook;

      try {
        workbook =
          XLSX.readFile(workbookPath);
      } catch {
        continue;
      }

      const rows = readRows(
        workbook,
        "Delivery_History"
      );

      if (rows.length === 0) continue;

      let changed = false;

      const updated = rows.map(
        (row: any) => {
          const samePackage =
            String(
              row.invoice_package_id || ""
            ) ===
            String(package_id);

          if (!samePackage)
            return row;

          changed = true;
          updatedRows += 1;

          return {
            ...row,

            invoice_status:
              status === "Drafted"
                ? "Drafted - Pending Send"
                : "Sent",

            invoice_drafted_at:
              status === "Drafted"
                ? new Date().toISOString()
                : row.invoice_drafted_at || "",

            invoice_sent_at:
              status === "Sent"
                ? new Date().toISOString()
                : row.invoice_sent_at || "",
          };
        }
      );

      if (changed) {
        workbook.Sheets[
          "Delivery_History"
        ] =
          XLSX.utils.json_to_sheet(
            updated
          );

        backupFile(workbookPath);

        XLSX.writeFile(
          workbook,
          workbookPath
        );
      }
    }

    logSystemEvent(
      "invoice_send_status_updated",
      "Invoice package send status updated",
      {
        client,
        package_id,
        status,
        updated_rows: updatedRows,
      }
    );

    return Response.json({
      success: true,
      client,
      package_id,
      status,
      updated_rows: updatedRows,
    });
  } catch (error: any) {
    logSystemError(
      "invoice-send-status-api",
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          "Failed to update send status",
      },
      { status: 500 }
    );
  }
}