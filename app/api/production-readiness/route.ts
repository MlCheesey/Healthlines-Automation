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

function exists(filePath: string) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function passFail(value: boolean, message: string, fix?: string) {
  return {
    ok: value,
    status: value ? "pass" : "attention_required",
    message,
    fix: value ? "" : fix || "",
  };
}

function envPresent(name: string) {
  return Boolean(process.env[name]);
}

export async function GET() {
  const statusPath = path.join(
    DATA_ROOT,
    "system-status",
    "automation-worker.json"
  );

  const workerStatus = safeJsonRead(statusPath);

  const clientsPath = path.join(DATA_ROOT, "clients");
  const davitaPath = path.join(clientsPath, "davita");
  const davitaMasterPath = path.join(davitaPath, "master.xlsx");
  const invoicesPath = path.join(DATA_ROOT, "invoices");

  const checks = {
    storage: {
      data_root: passFail(
        exists(DATA_ROOT),
        `DATA_ROOT exists: ${DATA_ROOT}`,
        "Check DATA_ROOT in .env.local and shared folder access."
      ),
      clients_folder: passFail(
        exists(clientsPath),
        "clients folder exists",
        "Run Gmail/Tally workflow once or create clients folder."
      ),
      davita_folder: passFail(
        exists(davitaPath),
        "DaVita client folder exists",
        "Run DaVita processing once."
      ),
      davita_master: passFail(
        exists(davitaMasterPath),
        "DaVita master.xlsx exists",
        "Run a DaVita workflow that writes to master workbook."
      ),
      invoices_folder: passFail(
        exists(invoicesPath),
        "invoices folder exists",
        "Run invoice package test/worker once."
      ),
    },

    environment: {
      gmail_client_id: passFail(
        envPresent("GOOGLE_CLIENT_ID"),
        "GOOGLE_CLIENT_ID present",
        "Add GOOGLE_CLIENT_ID to .env.local."
      ),
      gmail_client_secret: passFail(
        envPresent("GOOGLE_CLIENT_SECRET"),
        "GOOGLE_CLIENT_SECRET present",
        "Add GOOGLE_CLIENT_SECRET to .env.local."
      ),
      gmail_refresh_token: passFail(
        envPresent("GOOGLE_REFRESH_TOKEN"),
        "GOOGLE_REFRESH_TOKEN present",
        "Add fresh GOOGLE_REFRESH_TOKEN to .env.local."
      ),
      gemini_api_key: passFail(
        envPresent("GEMINI_API_KEY"),
        "GEMINI_API_KEY present",
        "Add GEMINI_API_KEY to .env.local for AI classification."
      ),
      data_root_env: passFail(
        envPresent("DATA_ROOT"),
        "DATA_ROOT env present",
        "Set DATA_ROOT to shared HealthLinesData folder."
      ),
    },

    automation: {
      worker_status_file: passFail(
        Boolean(workerStatus),
        "Worker status file readable",
        "Start worker with PM2 and confirm automation-worker.json is written."
      ),
      worker_running: passFail(
        workerStatus?.status === "running",
        "Worker status is running",
        "Restart healthlines-worker with PM2."
      ),
      gmail_cycle: passFail(
        workerStatus?.gmail_cycle_last_success === true,
        "Gmail cycle last run successful",
        workerStatus?.gmail_cycle_last_error ||
          "Check Gmail token and /api/gmail/process-new."
      ),
      mrn_watcher: passFail(
        workerStatus?.mrn_watcher_last_success === true,
        "MRN watcher last run successful",
        workerStatus?.mrn_watcher_last_error ||
          "Check MRN watcher shared workbook access."
      ),
      tally_sync: passFail(
        workerStatus?.tally_delivery_sync_last_success === true,
        "Tally delivery sync last run successful",
        workerStatus?.tally_delivery_sync_last_error ||
          "Check Tally connection and sync route."
      ),
      invoice_cycle: passFail(
        workerStatus?.invoice_cycle_last_success === true ||
          Boolean(workerStatus?.invoice_cycle_last_skip_at),
        "Invoice cycle either ran or correctly skipped because not due",
        workerStatus?.invoice_cycle_last_error ||
          "Check invoice package worker and 14-day schedule."
      ),
    },
  };

  const flatChecks = [
    ...Object.values(checks.storage),
    ...Object.values(checks.environment),
    ...Object.values(checks.automation),
  ];

  const passed = flatChecks.filter((check: any) => check.ok).length;
  const failed = flatChecks.length - passed;

  const nextActions = flatChecks
    .filter((check: any) => !check.ok)
    .map((check: any) => check.fix || check.message)
    .filter(Boolean);

  return Response.json({
    success: true,
    status:
      failed === 0
        ? "production_ready"
        : failed <= 3
          ? "mostly_ready_attention_needed"
          : "not_ready",
    score: {
      passed,
      failed,
      total: flatChecks.length,
      percent: Math.round((passed / flatChecks.length) * 100),
    },
    checks,
    automation_status: workerStatus
      ? {
          worker_started_at: workerStatus.worker_started_at || "",
          app_url: workerStatus.app_url || "",
          data_root: workerStatus.data_root || "",
          updated_at: workerStatus.updated_at || "",
          gmail_cycle_last_run_at: workerStatus.gmail_cycle_last_run_at || "",
          gmail_cycle_last_success: workerStatus.gmail_cycle_last_success ?? null,
          mrn_watcher_last_run_at: workerStatus.mrn_watcher_last_run_at || "",
          mrn_watcher_last_success: workerStatus.mrn_watcher_last_success ?? null,
          tally_delivery_sync_last_run_at:
            workerStatus.tally_delivery_sync_last_run_at || "",
          tally_delivery_sync_last_success:
            workerStatus.tally_delivery_sync_last_success ?? null,
          invoice_cycle_last_run_at: workerStatus.invoice_cycle_last_run_at || "",
          invoice_cycle_last_success:
            workerStatus.invoice_cycle_last_success ?? null,
          invoice_cycle_last_skip_at: workerStatus.invoice_cycle_last_skip_at || "",
          invoice_cycle_skip_reason: workerStatus.invoice_cycle_skip_reason || "",
        }
      : null,
    next_actions: nextActions,
    completed: [
      "Gmail automation",
      "Email classification",
      "Needs Review workflow",
      "Tally DN sync code",
      "VAT safety blocking",
      "MRN watcher skip protection",
      "Invoice package safety checks",
      "Manual rate/VAT review update",
      "Safe invoice package test route",
      "MRN OCR test route",
    ],
    remaining_validation_on_saudi: [
      "Validate Tally VAT output after parser fix",
      "Run MRN watcher against real shared workbooks",
      "Run invoice package test with real DaVita DN",
      "Validate generated invoice PDF layout and logo",
      "Confirm PM2 app/worker after git pull/build",
    ],
  });
}