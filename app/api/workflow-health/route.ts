import fs from "fs";
import path from "path";

function exists(filePath: string) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

export async function GET() {
  const checks = {
    worker_status_file: exists("data/system-status/automation-worker.json"),
    notifications_file: exists("data/notifications.json"),
    gmail_queue_file: exists("data/gmail-queue.json"),
    retry_queue_file: exists("data/retry-queue.json"),
    attachment_registry_file: exists("data/attachment-registry.json"),
    pdf_registry_file: exists("data/invoice-pdf-registry.json"),
    clients_folder: exists("data/clients"),
    backups_folder: exists("data/backups"),
  };

  return Response.json({
    success: true,
    status: Object.values(checks).every(Boolean)
      ? "healthy"
      : "needs_attention",
    checks,
  });
}