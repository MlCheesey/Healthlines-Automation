import fs from "fs";
import path from "path";
import { DATA_ROOT } from "@/lib/config/storage";

function safeJsonRead(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function statusLevel({
  success,
  lastSuccess,
  lastError,
}: {
  success?: boolean;
  lastSuccess?: boolean;
  lastError?: any;
}) {
  if (success === false || lastSuccess === false || lastError) return "error";
  if (success === true || lastSuccess === true) return "ok";
  return "unknown";
}

export async function GET() {
  const statusPath = path.join(
    DATA_ROOT,
    "system-status",
    "automation-worker.json"
  );

  const data = safeJsonRead(statusPath);

  if (!data) {
    return Response.json({
      success: true,
      worker_running: false,
      health: "not_started",
      message: "No worker status found. Start worker using npm run worker or PM2.",
      status_path: statusPath,
      checks: {
        gmail_cycle: { level: "unknown" },
        mrn_watcher: { level: "unknown" },
        tally_delivery_sync: { level: "unknown" },
        invoice_cycle: { level: "unknown" },
      },
    });
  }

  const checks = {
    gmail_cycle: {
      level: statusLevel({
        lastSuccess: data.gmail_cycle_last_success,
        lastError: data.gmail_cycle_last_error,
      }),
      last_run_at: data.gmail_cycle_last_run_at || "",
      last_success: data.gmail_cycle_last_success ?? null,
      last_status: data.gmail_cycle_last_status ?? "",
      last_error: data.gmail_cycle_last_error || "",
      result_summary: data.gmail_cycle_last_result
        ? {
            checked: data.gmail_cycle_last_result.checked,
            processed: data.gmail_cycle_last_result.processed,
            skipped: data.gmail_cycle_last_result.skipped,
            errors: data.gmail_cycle_last_result.errors,
            force: data.gmail_cycle_last_result.force,
          }
        : null,
    },

    mrn_watcher: {
      level: statusLevel({
        lastSuccess: data.mrn_watcher_last_success,
        lastError: data.mrn_watcher_last_error,
      }),
      last_run_at: data.mrn_watcher_last_run_at || "",
      last_success: data.mrn_watcher_last_success ?? null,
      last_status: data.mrn_watcher_last_status ?? "",
      last_error: data.mrn_watcher_last_error || "",
      last_result: data.mrn_watcher_last_result || null,
    },

    tally_delivery_sync: {
      level: statusLevel({
        lastSuccess: data.tally_delivery_sync_last_success,
        lastError: data.tally_delivery_sync_last_error,
      }),
      last_run_at: data.tally_delivery_sync_last_run_at || "",
      last_success: data.tally_delivery_sync_last_success ?? null,
      last_status: data.tally_delivery_sync_last_status ?? "",
      last_error: data.tally_delivery_sync_last_error || "",
      result_summary: data.tally_delivery_sync_last_result
        ? {
            mode: data.tally_delivery_sync_last_result.mode,
            from: data.tally_delivery_sync_last_result.from,
            to: data.tally_delivery_sync_last_result.to,
            party: data.tally_delivery_sync_last_result.party,
            total_found: data.tally_delivery_sync_last_result.total_found,
            limited_to: data.tally_delivery_sync_last_result.limited_to,
          }
        : null,
    },

    invoice_cycle: {
      level: data.invoice_cycle_last_skip_at
        ? "waiting"
        : statusLevel({
            lastSuccess: data.invoice_cycle_last_success,
            lastError: data.invoice_cycle_last_error,
          }),
      last_run_at: data.invoice_cycle_last_run_at || "",
      last_success: data.invoice_cycle_last_success ?? null,
      last_status: data.invoice_cycle_last_status ?? "",
      last_error: data.invoice_cycle_last_error || "",
      last_skip_at: data.invoice_cycle_last_skip_at || "",
      skip_reason: data.invoice_cycle_skip_reason || "",
      last_result: data.invoice_cycle_last_result || null,
    },
  };

  const hasError = Object.values(checks).some((check: any) => check.level === "error");
  const hasUnknown = Object.values(checks).some((check: any) => check.level === "unknown");

  return Response.json({
    success: true,
    worker_running: data.status === "running",
    health: hasError ? "attention_required" : hasUnknown ? "partial" : "healthy",
    status: data,
    checks,
    status_path: statusPath,
  });
}