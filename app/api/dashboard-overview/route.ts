import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

function readSheet(filePath: string, sheetName: string) {
  if (!fs.existsSync(filePath)) return [];

  const workbook = XLSX.readFile(filePath);

  const sheet = workbook.Sheets[sheetName];

  if (!sheet) return [];

  return XLSX.utils.sheet_to_json<any>(sheet, {
    defval: "",
  });
}

export async function GET() {
  try {
    const clientsPath = path.join(
      process.cwd(),
      "data",
      "clients"
    );

    const summary = {
      pending_actions: [],
      invoice_tracker: [],
      mrn_tracker: [],
      delivery_tasks: [],
      approvals: [],
      ai_logs: [],
    };

    if (!fs.existsSync(clientsPath)) {
      return Response.json({
        success: true,
        summary,
      });
    }

    for (const client of fs.readdirSync(
      clientsPath
    )) {
      const masterPath = path.join(
        clientsPath,
        client,
        "master.xlsx"
      );

      if (!fs.existsSync(masterPath))
        continue;

      summary.pending_actions.push(
        ...readSheet(
          masterPath,
          "Pending_Actions"
        )
      );

      summary.invoice_tracker.push(
        ...readSheet(
          masterPath,
          "Invoice_Tracker"
        )
      );

      summary.mrn_tracker.push(
        ...readSheet(
          masterPath,
          "MRN_Tracker"
        )
      );

      summary.delivery_tasks.push(
        ...readSheet(
          masterPath,
          "Delivery_Plans"
        )
      );

      summary.approvals.push(
        ...readSheet(
          masterPath,
          "Approval_Actions"
        )
      );

      summary.ai_logs.push(
        ...readSheet(masterPath, "AI_Log")
      );
    }

    return Response.json({
      success: true,
      counts: {
        pending_actions:
          summary.pending_actions.length,
        invoice_tracker:
          summary.invoice_tracker.length,
        mrn_tracker:
          summary.mrn_tracker.length,
        delivery_tasks:
          summary.delivery_tasks.length,
        approvals:
          summary.approvals.length,
        ai_logs:
          summary.ai_logs.length,
      },
      summary,
    });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error.message ||
          "Dashboard overview failed",
      },
      { status: 500 }
    );
  }
}