import fs from "fs";
import path from "path";

const REQUIRED = [
  "data",
  "data/clients",
  "data/backups",
  "data/generated",
  "data/generated/invoices",
  "data/system-status",
  "data/notifications.json",
  "data/retry-queue.json",
  "data/attachment-registry.json",
  "data/invoice-pdf-registry.json",
  "data/gmail-queue.json",
];

function exists(relativePath: string) {
  return fs.existsSync(
    path.join(process.cwd(), relativePath)
  );
}

export async function GET() {
  const checks = REQUIRED.map((item) => ({
    item,
    exists: exists(item),
  }));

  const failed = checks.filter(
    (c) => !c.exists
  );

  return Response.json({
    success: true,
    ready: failed.length === 0,
    failed,
    checks,
  });
}