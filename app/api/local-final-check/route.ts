import fs from "fs";
import path from "path";
import { DATA_ROOT } from "@/lib/config/storage";

const REQUIRED_FILES = [
  // Worker / orchestration
  "scripts/healthlines-worker.js",

  // Core intake
  "app/api/gmail/process-new/route.ts",
  "app/api/gmail/message/[id]/route.ts",
  "app/api/analyze-email/route.ts",
  "app/api/process-email/route.ts",
  "app/api/analyze-attachment/route.ts",

  // MRN
  "app/api/mrn-watcher/route.ts",
  "app/api/mrn-ocr-test/route.ts",

  // Invoice cycle
  "app/api/invoice-package-worker/route.ts",
  "app/api/invoice-package-preview/route.ts",
  "app/api/invoice-package-test/route.ts",
  "app/api/invoice-approval/route.ts",
  "app/api/manual-rate-update/route.ts",
  "app/api/regenerate-invoice-pdf/route.ts",

  // Review / status
  "app/api/needs-review/route.ts",
  "app/api/automation-status/route.ts",
  "app/api/production-readiness/route.ts",
  "app/api/final-readiness/route.ts",
  "app/api/local-workflow-test/route.ts",

  // Dashboard panels
  "app/dashboard/page.tsx",
  "components/dashboard/Sidebar.tsx",
  "components/dashboard/OperationsStatusBoard.tsx",
  "components/dashboard/ProductionReadinessPanel.tsx",
  "components/dashboard/NeedsReviewPanel.tsx",
  "components/dashboard/MRNOCRTestPanel.tsx",
  "components/dashboard/InvoiceDraftEditorPanel.tsx",
  "components/dashboard/InvoiceCyclePanel.tsx",
  "components/dashboard/InvoicePackagePreviewPanel.tsx",
  "components/dashboard/GmailQueuePanel.tsx",
  "components/dashboard/DeliverySchedulePanel.tsx",
  "components/dashboard/NotificationsPanel.tsx",

  // Core libs
  "lib/operations/poRecorder.ts",
  "lib/operations/mrnSync.ts",
  "lib/operations/workflowProtection.ts",
  "lib/operations/updateDeliveryRate.ts",
  "lib/invoices/buildInvoiceCycle.ts",
  "lib/invoices/generateInvoiceCycleExcel.ts",
  "lib/invoices/generateInvoicePdf.ts",
  "lib/invoices/invoiceHtmlTemplate.ts",
  "lib/gmail/gmailQueue.ts",
  "lib/parsers/ocrParser.ts",
  "lib/parsers/pdfParser.ts",
  "lib/parsers/excelParser.ts",
  "lib/parsers/zipParser.ts",
  "lib/tally/tallyDeliveryNoteParser.ts",
];

const INDIA_DEV_ENV = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GEMINI_API_KEY"];

const SAUDI_PRODUCTION_ENV = ["DATA_ROOT", "GOOGLE_REFRESH_TOKEN"];

function checkFile(file: string) {
  const fullPath = path.join(process.cwd(), file);

  return {
    file,
    exists: fs.existsSync(fullPath),
  };
}

function checkEnv(name: string) {
  return {
    name,
    present: Boolean(process.env[name]),
  };
}

function folderExists(folderPath: string) {
  try {
    return fs.existsSync(folderPath);
  } catch {
    return false;
  }
}

function ensureLocalFolders() {
  const folders = [
    DATA_ROOT,
    path.join(DATA_ROOT, "clients"),
    path.join(DATA_ROOT, "invoices"),
    path.join(DATA_ROOT, "system-status"),
  ];

  for (const folder of folders) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  }
}

export async function GET() {
  ensureLocalFolders();

  const fileChecks = REQUIRED_FILES.map(checkFile);
  const missingFiles = fileChecks.filter((check) => !check.exists);

  const indiaEnvChecks = INDIA_DEV_ENV.map(checkEnv);
  const missingIndiaEnv = indiaEnvChecks.filter((check) => !check.present);

  const saudiEnvChecks = SAUDI_PRODUCTION_ENV.map(checkEnv);
  const missingSaudiEnv = saudiEnvChecks.filter((check) => !check.present);

  const storageChecks = {
    data_root: {
      path: DATA_ROOT,
      exists: folderExists(DATA_ROOT),
    },
    clients_folder: {
      path: path.join(DATA_ROOT, "clients"),
      exists: folderExists(path.join(DATA_ROOT, "clients")),
    },
    invoices_folder: {
      path: path.join(DATA_ROOT, "invoices"),
      exists: folderExists(path.join(DATA_ROOT, "invoices")),
    },
    system_status_folder: {
      path: path.join(DATA_ROOT, "system-status"),
      exists: folderExists(path.join(DATA_ROOT, "system-status")),
    },
  };

  const missingStorage = Object.values(storageChecks).filter(
    (check) => !check.exists
  );

  const codeReady =
    missingFiles.length === 0 &&
    missingIndiaEnv.length === 0 &&
    missingStorage.length === 0;

  const totalLocalChecks =
    fileChecks.length + indiaEnvChecks.length + Object.keys(storageChecks).length;

  const failedLocalChecks =
    missingFiles.length + missingIndiaEnv.length + missingStorage.length;

  return Response.json({
    success: true,

    code_ready_on_india_pc: codeReady,

    ready_for_saudi_pull: codeReady,

    status: codeReady
      ? "india_code_ready_for_saudi_pull"
      : failedLocalChecks <= 3
        ? "mostly_ready_attention_needed"
        : "not_ready",

    score: {
      passed: totalLocalChecks - failedLocalChecks,
      failed: failedLocalChecks,
      total: totalLocalChecks,
      percent: Math.round(
        ((totalLocalChecks - failedLocalChecks) / totalLocalChecks) * 100
      ),
    },

    files: {
      total: fileChecks.length,
      missing_count: missingFiles.length,
      missing: missingFiles,
      checks: fileChecks,
    },

    india_environment: {
      total: indiaEnvChecks.length,
      missing_count: missingIndiaEnv.length,
      missing: missingIndiaEnv,
      checks: indiaEnvChecks,
      note:
        "These are enough for India development/build checks. Gmail refresh token and Saudi shared DATA_ROOT can be validated later on Saudi PC.",
    },

    saudi_environment_later: {
      total: saudiEnvChecks.length,
      missing_count: missingSaudiEnv.length,
      missing: missingSaudiEnv,
      checks: saudiEnvChecks,
      note:
        "These are required for live Saudi production validation, but they should not block India code readiness.",
    },

    storage: storageChecks,

    next_actions: codeReady
      ? [
          "Run npm run build.",
          "Commit and push if there are changes.",
          "Continue India-side dashboard/smoke-test hardening.",
          "Later on Saudi PC: git pull, npm run build, restart PM2 app and worker.",
        ]
      : [
          "Fix missing code files if any.",
          "Fix missing India development env values if any.",
          "Run npm run build again.",
        ],

    remaining_external_validation: [
      "Real Gmail OAuth/token validation on Saudi PC",
      "Real Gmail inbox watcher on Saudi PC",
      "Real Tally delivery sync on Saudi PC",
      "Real shared folder workbook read/write on Saudi PC",
      "Real MRN watcher on Saudi PC",
      "Real invoice package/PDF generation on Saudi PC",
      "PM2 app and worker restart on Saudi PC",
    ],
  });
}