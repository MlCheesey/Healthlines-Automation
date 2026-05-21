import fs from "fs";
import path from "path";

function exists(relativePath: string) {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

export async function GET() {
  const checks = {
    dashboard: exists("app/dashboard/page.tsx"),
    worker: exists("scripts/healthlines-worker.js"),
    invoice_cycle: exists("app/api/invoice-package-worker/route.ts"),
    invoice_editor: exists("components/dashboard/InvoiceDraftEditorPanel.tsx"),
    gmail_queue: exists("lib/gmail/gmailQueue.ts"),
    mrn_sync: exists("lib/operations/mrnSync.ts"),
    delivery_schedule: exists("app/api/delivery-schedule/route.ts"),
    notifications: exists("app/api/notifications/route.ts"),
    audit_timeline: exists("app/api/audit-timeline/route.ts"),
    retry_queue: exists("lib/system/retryQueue.ts"),
    pdf_registry: exists("lib/invoices/pdfRegistry.ts"),
    attachment_registry: exists("lib/system/attachmentRegistry.ts"),
    backup_restore: exists("app/api/restore-backup/route.ts"),
  };

  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);

  return Response.json({
    success: true,
    status: missing.length === 0 ? "local_workflow_ready" : "missing_files",
    missing,
    checks,
    remaining_major_external_items: ["Gmail OAuth", "Tally bridge", "Hosting"],
  });
}