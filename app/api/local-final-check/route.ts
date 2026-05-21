import fs from "fs";
import path from "path";

const REQUIRED_FILES = [
  "scripts/healthlines-worker.js",
  "app/api/analyze-email/route.ts",
  "app/api/process-email/route.ts",
  "app/api/mrn-watcher/route.ts",
  "app/api/invoice-package-worker/route.ts",
  "app/api/invoice-approval/route.ts",
  "app/api/regenerate-invoice-pdf/route.ts",
  "app/api/delivery-schedule/route.ts",
  "app/api/notifications/route.ts",
  "app/api/gmail-queue/route.ts",
  "app/api/final-readiness/route.ts",
  "components/dashboard/OperationsStatusBoard.tsx",
  "components/dashboard/InvoiceDraftEditorPanel.tsx",
  "components/dashboard/InvoiceCyclePanel.tsx",
  "components/dashboard/GmailQueuePanel.tsx",
  "components/dashboard/DeliverySchedulePanel.tsx",
  "components/dashboard/NotificationsPanel.tsx",
  "lib/operations/poRecorder.ts",
  "lib/operations/mrnSync.ts",
  "lib/invoices/buildInvoiceCycle.ts",
  "lib/invoices/generateInvoicePdf.ts",
  "lib/invoices/invoiceHtmlTemplate.ts",
  "lib/gmail/gmailQueue.ts",
];

export async function GET() {
  const checks = REQUIRED_FILES.map((file) => ({
    file,
    exists: fs.existsSync(path.join(process.cwd(), file)),
  }));

  const missing = checks.filter((c) => !c.exists);

  return Response.json({
    success: true,
    ready: missing.length === 0,
    missing,
    checks,
    remaining_external: ["Gmail OAuth", "Gmail real send", "Tally bridge", "Hosting"],
  });
}