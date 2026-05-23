require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const path = require("path");

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const WORKER_SECRET = process.env.WORKER_SECRET;

const STATUS_DIR = path.join(process.cwd(), "data", "system-status");
const STATUS_FILE = path.join(STATUS_DIR, "automation-worker.json");
const INVOICE_SCHEDULE_FILE = path.join(
  STATUS_DIR,
  "invoice-cycle-schedule.json"
);

const GMAIL_INTERVAL_MS = 2 * 60 * 1000;
const MRN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const INVOICE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const INVOICE_CYCLE_DAYS = 14;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJson(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function writeStatus(update) {
  ensureDir(STATUS_DIR);

  const current = readJson(STATUS_FILE, {});

  writeJson(STATUS_FILE, {
    ...current,
    ...update,
    updated_at: new Date().toISOString(),
  });
}

function daysSince(dateString) {
  if (!dateString) return Infinity;

  const then = new Date(dateString).getTime();
  const now = Date.now();

  return (now - then) / (1000 * 60 * 60 * 24);
}

function invoiceCycleDue() {
  const state = readJson(INVOICE_SCHEDULE_FILE, {});
  return daysSince(state.last_success_at) >= INVOICE_CYCLE_DAYS;
}

function markInvoiceCycleSuccess(result) {
  const current = readJson(INVOICE_SCHEDULE_FILE, {});

  writeJson(INVOICE_SCHEDULE_FILE, {
    ...current,
    last_success_at: new Date().toISOString(),
    last_result: result,
  });
}

async function callEndpoint(name, url) {
  const startedAt = new Date().toISOString();

  try {
    console.log(`[${startedAt}] Running ${name}`);

    const res = await fetch(url, {
      headers: {
        "x-worker-secret": WORKER_SECRET || "",
      },
    });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        raw_response: text.slice(0, 500),
      };
    }

    writeStatus({
      [`${name}_last_run_at`]: startedAt,
      [`${name}_last_success`]: res.ok,
      [`${name}_last_status`]: res.status,
      [`${name}_last_result`]: data,
    });

    console.log(`[${new Date().toISOString()}] Finished ${name}`, res.status);

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (error) {
    writeStatus({
      [`${name}_last_run_at`]: startedAt,
      [`${name}_last_success`]: false,
      [`${name}_last_error`]: error.message || String(error),
    });

    console.error(`[${new Date().toISOString()}] Failed ${name}`, error);

    return {
      ok: false,
      error: error.message || String(error),
    };
  }
}

async function runGmailCycle() {
  await callEndpoint("gmail_cycle", `${APP_URL}/api/gmail/process-new`);
}

async function runMrnWatcher() {
  await callEndpoint("mrn_watcher", `${APP_URL}/api/mrn-watcher`);
}

async function runInvoiceCycleIfDue() {
  if (!invoiceCycleDue()) {
    writeStatus({
      invoice_cycle_last_skip_at: new Date().toISOString(),
      invoice_cycle_skip_reason: "14-day cycle not due yet",
    });

    return;
  }

  const result = await callEndpoint(
    "invoice_cycle",
    `${APP_URL}/api/invoice-package-worker`
  );

  if (result.ok) {
    markInvoiceCycleSuccess(result.data);
  }
}

async function start() {
  if (!WORKER_SECRET) {
    console.error("WORKER_SECRET is missing in .env.local");
    process.exit(1);
  }

  writeStatus({
    worker_started_at: new Date().toISOString(),
    app_url: APP_URL,
    status: "running",
  });

  console.log("HealthLines AI Worker started");
  console.log("APP_URL:", APP_URL);

  await runGmailCycle();
  await runMrnWatcher();
  await runTallyDeliverySync();
  await runInvoiceCycleIfDue();

  setInterval(runGmailCycle, GMAIL_INTERVAL_MS);
  setInterval(runMrnWatcher, MRN_INTERVAL_MS);
  setInterval(runInvoiceCycleIfDue, INVOICE_CHECK_INTERVAL_MS);
  setInterval(
  runTallyDeliverySync,
  60 * 60 * 1000
);
}

start().catch((error) => {
  writeStatus({
    status: "crashed",
    crash_error: error.message || String(error),
    crashed_at: new Date().toISOString(),
  });

  console.error(error);
  process.exit(1);
});

async function runTallyDeliverySync() {
  return callEndpoint(
    "tally_delivery_sync",
    `${APP_URL}/api/tally/sync-delivery-notes`
  );
}