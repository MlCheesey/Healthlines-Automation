import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const STATUS_FILE = path.join(
  process.cwd(),
  "data",
  "system-status",
  "automation-worker.json"
);

const GMAIL_QUEUE_FILE = path.join(
  process.cwd(),
  "data",
  "gmail-queue.json"
);

function readJson(filePath: string, fallback: any = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function readSheet(filePath: string, sheetName: string) {
  try {
    if (!fs.existsSync(filePath)) return [];

    const workbook = XLSX.readFile(filePath);

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) return [];

    return XLSX.utils.sheet_to_json<any>(sheet, {
      defval: "",
    });
  } catch {
    return [];
  }
}

export async function GET() {
  const worker = readJson(STATUS_FILE, {});

  const gmailQueue = readJson(
    GMAIL_QUEUE_FILE,
    []
  );

  const clientsDir = path.join(
    process.cwd(),
    "data",
    "clients"
  );

  let pendingActions = 0;
  let blockedInvoices = 0;
  let approvedPackages = 0;
  let rejectedPackages = 0;
  let mrnPending = 0;
  let mrnOverdue = 0;
  let invoiceReady = 0;
  let draftedPackages = 0;
  let sentPackages = 0;
  let scheduledDeliveries = 0;

  const approvedPackageRows: any[] = [];

  if (fs.existsSync(clientsDir)) {
    const clients = fs
      .readdirSync(clientsDir)
      .filter((f) =>
        fs
          .statSync(path.join(clientsDir, f))
          .isDirectory()
      );

    for (const client of clients) {
      const masterPath = path.join(
        clientsDir,
        client,
        "master.xlsx"
      );

      const actions = readSheet(
        masterPath,
        "Pending_Actions"
      );

      pendingActions += actions.filter(
        (r: any) =>
          String(
            r.status || ""
          ).toLowerCase() !==
          "completed"
      ).length;

      const approvals = readSheet(
        masterPath,
        "Invoice_Approvals"
      );

      const approved = approvals.filter(
        (r: any) =>
          String(r.decision || "") ===
          "Approved"
      );

      const rejected = approvals.filter(
        (r: any) =>
          String(r.decision || "") ===
          "Rejected"
      );

      approvedPackages += approved.length;
      rejectedPackages += rejected.length;

      approvedPackageRows.push(
        ...approved.map((row: any) => ({
          ...row,
          client,
        }))
      );

      const files = fs
        .readdirSync(
          path.join(clientsDir, client)
        )
        .filter(
          (f) =>
            f.endsWith(".xlsx") &&
            f !== "master.xlsx"
        );

      for (const file of files) {
        const workbookPath = path.join(
          clientsDir,
          client,
          file
        );

        const deliveryRows = readSheet(
          workbookPath,
          "Delivery_History"
        );

        const deliveryScheduleRows =
          readSheet(
            workbookPath,
            "Delivery_Schedule"
          );

        scheduledDeliveries +=
          deliveryScheduleRows.length;

        for (const row of deliveryRows) {
          const invoiceStatus = String(
            row.invoice_status || ""
          ).toLowerCase();

          const mrnStatus = String(
            row.mrn_status || ""
          ).toLowerCase();

          if (
            invoiceStatus.includes(
              "missing rate"
            )
          ) {
            blockedInvoices += 1;
          }

          if (
            invoiceStatus.includes(
              "ready"
            ) ||
            invoiceStatus.includes(
              "approved"
            )
          ) {
            invoiceReady += 1;
          }

          if (
            invoiceStatus.includes(
              "drafted"
            )
          ) {
            draftedPackages += 1;
          }

          if (
            invoiceStatus === "sent" ||
            invoiceStatus.includes(
              "sent"
            )
          ) {
            sentPackages += 1;
          }

          if (
            mrnStatus.includes(
              "pending"
            )
          ) {
            mrnPending += 1;
          }

          if (
            mrnStatus.includes(
              "overdue"
            )
          ) {
            mrnOverdue += 1;
          }
        }
      }
    }
  }

  return Response.json({
    success: true,

    worker: {
      running:
        worker.status === "running",

      updated_at:
        worker.updated_at || "",

      gmail_last_run:
        worker.gmail_cycle_last_run_at ||
        "",

      invoice_last_run:
        worker.invoice_cycle_last_run_at ||
        "",

      mrn_last_run:
        worker.mrn_watcher_last_run_at ||
        "",
    },

    operations: {
      pending_actions:
        pendingActions,

      blocked_invoices:
        blockedInvoices,

      approved_packages:
        approvedPackages,

      rejected_packages:
        rejectedPackages,

      drafted_packages:
        draftedPackages,

      sent_packages:
        sentPackages,

      mrn_pending:
        mrnPending,

      mrn_overdue:
        mrnOverdue,

      invoice_ready:
        invoiceReady,

      scheduled_deliveries:
        scheduledDeliveries,

      gmail_queue_pending:
        gmailQueue.filter(
          (r: any) =>
            String(
              r.status || ""
            ).toUpperCase() !==
            "SENT"
        ).length,
    },

    approved_packages:
      approvedPackageRows.reverse(),

    gmail_queue:
      gmailQueue.reverse(),
  });
}