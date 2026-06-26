import fs from "fs";
import path from "path";
import { DATA_ROOT } from "@/lib/config/storage";

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export async function GET() {
  const statusPath = path.join(
    DATA_ROOT,
    "system-status",
    "automation-worker.json"
  );

  return Response.json({
    success: true,
    route: "/api/worker-status-reset",
    safe: true,
    message:
      "Use POST to archive stale automation-worker.json and write a clean reset status.",
    status_path: statusPath,
    does_not_do: [
      "does not restart PM2",
      "does not process Gmail",
      "does not call Tally",
      "does not edit invoices",
      "does not approve or send anything",
    ],
  });
}

export async function POST() {
  try {
    const statusDir = path.join(DATA_ROOT, "system-status");
    ensureDir(statusDir);

    const statusPath = path.join(statusDir, "automation-worker.json");

    let backupPath = "";

    if (fs.existsSync(statusPath)) {
      backupPath = path.join(
        statusDir,
        `automation-worker-reset-backup-${Date.now()}.json`
      );

      fs.copyFileSync(statusPath, backupPath);
    }

    const resetStatus = {
      status: "reset",
      updated_at: new Date().toISOString(),
      reset_at: new Date().toISOString(),
      reset_reason:
        "Manual reset from dashboard/API. This clears stale local worker status display only.",
      worker_running: false,
      note:
        "Restart the worker to create a fresh running status. This reset does not process Gmail, Tally, MRN, or invoices.",
    };

    fs.writeFileSync(statusPath, JSON.stringify(resetStatus, null, 2), "utf8");

    return Response.json({
      success: true,
      message: "Worker status reset completed.",
      status_path: statusPath,
      backup_path: backupPath,
      status: resetStatus,
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error?.message || "Worker status reset failed",
      },
      { status: 500 }
    );
  }
}