import fs from "fs";
import path from "path";
import { DATA_ROOT } from "@/lib/config/storage";

const STALE_AFTER_MINUTES = 30;

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

function envPresent(name: string) {
  return Boolean(process.env[name]);
}

function minutesSince(value: any) {
  const date = new Date(String(value || ""));

  if (Number.isNaN(date.getTime())) return null;

  return Math.round((Date.now() - date.getTime()) / 60000);
}

function isStale(updatedAt: any) {
  const age = minutesSince(updatedAt);

  if (age === null) return true;

  return age > STALE_AFTER_MINUTES;
}

function check({
  ok,
  status,
  message,
  fix = "",
  scope = "india",
}: {
  ok: boolean;
  status?: string;
  message: string;
  fix?: string;
  scope?: "india" | "saudi" | "shared";
}) {
  return {
    ok,
    status: status || (ok ? "pass" : "attention_required"),
    message,
    fix: ok ? "" : fix,
    scope,
  };
}

function pendingSaudi(message: string, fix: string) {
  return check({
    ok: false,
    status: "pending_saudi_validation",
    message,
    fix,
    scope: "saudi",
  });
}

function staleCheck(message: string, fix: string) {
  return check({
    ok: false,
    status: "stale_status",
    message,
    fix,
    scope: "saudi",
  });
}

function scoreFromChecks(checks: any[]) {
  const passed = checks.filter((item) => item.ok).length;
  const failed = checks.length - passed;

  return {
    passed,
    failed,
    total: checks.length,
    percent: checks.length ? Math.round((passed / checks.length) * 100) : 0,
  };
}

function workerCycleCheck({
  workerStatus,
  key,
  label,
  stale,
}: {
  workerStatus: any;
  key: string;
  label: string;
  stale: boolean;
}) {
  const successKey = `${key}_last_success`;
  const errorKey = `${key}_last_error`;
  const resultKey = `${key}_last_result`;
  const runKey = `${key}_last_run_at`;

  if (!workerStatus) {
    return pendingSaudi(
      `${label} not validated yet`,
      `Validate ${label} on Saudi PC after PM2 worker restart.`
    );
  }

  if (stale) {
    return staleCheck(
      `${label} has only stale local status`,
      `Restart worker on Saudi PC and validate ${label}.`
    );
  }

  if (workerStatus[successKey] === true) {
    return check({
      ok: true,
      message: `${label} last run successful`,
      scope: "saudi",
    });
  }

  const error =
    workerStatus[errorKey] ||
    workerStatus[resultKey]?.error ||
    `Validate ${label} on Saudi PC.`;

  return check({
    ok: false,
    status: "attention_required",
    message: `${label} needs validation`,
    fix: error,
    scope: "saudi",
  });
}

export async function GET() {
  const statusPath = path.join(
    DATA_ROOT,
    "system-status",
    "automation-worker.json"
  );

  const workerStatus = safeJsonRead(statusPath);
  const workerStale = workerStatus ? isStale(workerStatus.updated_at) : true;
  const workerAgeMinutes = workerStatus ? minutesSince(workerStatus.updated_at) : null;

  const clientsPath = path.join(DATA_ROOT, "clients");
  const davitaPath = path.join(clientsPath, "davita");
  const davitaMasterPath = path.join(davitaPath, "master.xlsx");
  const invoicesPath = path.join(DATA_ROOT, "invoices");
  const systemStatusPath = path.join(DATA_ROOT, "system-status");

  const indiaChecks = {
    storage: {
      data_root: check({
        ok: exists(DATA_ROOT),
        message: `Local DATA_ROOT exists: ${DATA_ROOT}`,
        fix: "Check local data folder.",
      }),
      clients_folder: check({
        ok: exists(clientsPath),
        message: "Local clients folder exists",
        fix: "Create data/clients folder.",
      }),
      davita_folder: check({
        ok: exists(davitaPath),
        message: "Local DaVita folder exists",
        fix: "Run local workflow or create data/clients/davita.",
      }),
      davita_master: check({
        ok: exists(davitaMasterPath),
        message: "Local DaVita master.xlsx exists",
        fix: "Run local workflow test or DaVita processing once.",
      }),
      invoices_folder: check({
        ok: exists(invoicesPath),
        message: "Local invoices folder exists",
        fix: "Create data/invoices folder.",
      }),
      system_status_folder: check({
        ok: exists(systemStatusPath),
        message: "Local system-status folder exists",
        fix: "Create data/system-status folder.",
      }),
    },

    environment: {
      gmail_client_id: check({
        ok: envPresent("GOOGLE_CLIENT_ID"),
        message: "GOOGLE_CLIENT_ID present for India development",
        fix: "Add GOOGLE_CLIENT_ID to .env.local.",
      }),
      gmail_client_secret: check({
        ok: envPresent("GOOGLE_CLIENT_SECRET"),
        message: "GOOGLE_CLIENT_SECRET present for India development",
        fix: "Add GOOGLE_CLIENT_SECRET to .env.local.",
      }),
      gemini_api_key: check({
        ok: envPresent("GEMINI_API_KEY"),
        message: "GEMINI_API_KEY present for AI classification",
        fix: "Add GEMINI_API_KEY to .env.local.",
      }),
    },
  };

  const saudiChecks = {
    environment: {
      gmail_refresh_token: envPresent("GOOGLE_REFRESH_TOKEN")
        ? check({
            ok: true,
            message: "GOOGLE_REFRESH_TOKEN present",
            scope: "saudi",
          })
        : pendingSaudi(
            "GOOGLE_REFRESH_TOKEN pending Saudi validation",
            "Add/confirm fresh GOOGLE_REFRESH_TOKEN on Saudi PC .env.local."
          ),

      data_root_env: envPresent("DATA_ROOT")
        ? check({
            ok: true,
            message: "DATA_ROOT env present",
            scope: "saudi",
          })
        : pendingSaudi(
            "Saudi shared DATA_ROOT pending validation",
            "Set DATA_ROOT to \\\\SERVER\\Shared Folder\\HealthLinesData on Saudi PC."
          ),
    },

    automation: {
      worker_status_file: workerStatus
        ? check({
            ok: true,
            message: "Worker status file readable",
            scope: "shared",
          })
        : pendingSaudi(
            "Worker status file not created yet",
            "Restart healthlines-worker on Saudi PC with PM2."
          ),

      worker_fresh: workerStatus
        ? workerStale
          ? staleCheck(
              "Worker status is stale, not a current failure",
              "Restart worker on Saudi PC to create fresh status."
            )
          : check({
              ok: true,
              message: "Worker status is fresh",
              scope: "saudi",
            })
        : pendingSaudi(
            "Worker has not been validated",
            "Restart worker on Saudi PC."
          ),

      worker_running:
        workerStatus && !workerStale && workerStatus.status === "running"
          ? check({
              ok: true,
              message: "Worker is running",
              scope: "saudi",
            })
          : pendingSaudi(
              "Worker running status pending Saudi validation",
              "Use PM2 on Saudi PC to confirm healthlines-worker is online."
            ),

      gmail_cycle: workerCycleCheck({
        workerStatus,
        key: "gmail_cycle",
        label: "Gmail cycle",
        stale: workerStale,
      }),

      mrn_watcher: workerCycleCheck({
        workerStatus,
        key: "mrn_watcher",
        label: "MRN watcher",
        stale: workerStale,
      }),

      tally_sync: workerCycleCheck({
        workerStatus,
        key: "tally_delivery_sync",
        label: "Tally delivery sync",
        stale: workerStale,
      }),

      invoice_cycle:
        workerStatus && !workerStale && workerStatus.invoice_cycle_last_skip_at
          ? check({
              ok: true,
              status: "waiting",
              message: "Invoice cycle correctly skipped because not due",
              scope: "saudi",
            })
          : workerCycleCheck({
              workerStatus,
              key: "invoice_cycle",
              label: "Invoice cycle",
              stale: workerStale,
            }),
    },
  };

  const indiaFlatChecks = [
    ...Object.values(indiaChecks.storage),
    ...Object.values(indiaChecks.environment),
  ];

  const saudiFlatChecks = [
    ...Object.values(saudiChecks.environment),
    ...Object.values(saudiChecks.automation),
  ];

  const indiaScore = scoreFromChecks(indiaFlatChecks);
  const saudiScore = scoreFromChecks(saudiFlatChecks);

  const indiaReady = indiaScore.failed === 0;
  const saudiReady = saudiScore.failed === 0;

  const saudiPendingItems = saudiFlatChecks
    .filter((item: any) => !item.ok)
    .map((item: any) => item.fix || item.message)
    .filter(Boolean);

  return Response.json({
    success: true,

    status: indiaReady
      ? saudiReady
        ? "production_ready"
        : "india_ready_saudi_pending"
      : "india_attention_required",

    headline: indiaReady
      ? "India code is ready. Saudi live validation is pending."
      : "India code needs attention before Saudi pull.",

    india_code_readiness: {
      ready: indiaReady,
      status: indiaReady ? "ready_for_saudi_pull" : "attention_required",
      score: indiaScore,
      checks: indiaChecks,
    },

    saudi_live_readiness: {
      ready: saudiReady,
      status: saudiReady ? "production_ready" : "pending_saudi_validation",
      score: saudiScore,
      checks: saudiChecks,
      worker_status_age_minutes: workerAgeMinutes,
      worker_stale: workerStale,
      stale_after_minutes: STALE_AFTER_MINUTES,
    },

    checks: {
      india_storage: indiaChecks.storage,
      india_environment: indiaChecks.environment,
      saudi_environment: saudiChecks.environment,
      saudi_automation: saudiChecks.automation,
    },

    automation_status: workerStatus
      ? {
          worker_started_at: workerStatus.worker_started_at || "",
          app_url: workerStatus.app_url || "",
          status: workerStatus.status || "",
          data_root: workerStatus.data_root || "",
          updated_at: workerStatus.updated_at || "",
          stale: workerStale,
          age_minutes: workerAgeMinutes,
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

    next_actions: indiaReady
      ? [
          "India code is ready.",
          "No Saudi live error can be fully cleared until Saudi PC access.",
          "Later on Saudi PC: git pull, npm run build, restart PM2 app and worker.",
        ]
      : [
          "Fix India local checks first.",
          "Run npm run build.",
          "Commit and push.",
        ],

    saudi_pending_actions: saudiPendingItems,

    completed: [
      "Gmail automation code",
      "Email classification",
      "Needs Review workflow",
      "Tally DN sync code",
      "Tally VAT safety blocking",
      "MRN watcher skip protection",
      "Invoice package safety checks",
      "Manual rate/VAT review update",
      "Safe invoice package test route",
      "MRN OCR test route",
      "Attachment analysis integration",
      "Saudi validation checklist",
      "Local final check",
    ],

    remaining_validation_on_saudi: [
      "Add/confirm GOOGLE_REFRESH_TOKEN on Saudi PC",
      "Set/confirm DATA_ROOT shared folder on Saudi PC",
      "Validate Tally VAT output after parser fix",
      "Run MRN watcher against real shared workbooks",
      "Run invoice package test with real DaVita DN",
      "Validate generated invoice PDF layout and logo",
      "Confirm PM2 app/worker after git pull/build",
    ],
  });
}