const fs = require("fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.writeFileSync(file, text);
  console.log("fixed:", file);
}

function ensureImport(text, importLine) {
  if (text.includes(importLine)) return text;
  return text.replace(/^(import .+\n)/, `$1${importLine}\n`);
}

function fixDataRootFile(file) {
  let text = read(file);

  text = ensureImport(
    text,
    `import { DATA_ROOT } from "@/lib/config/storage";`
  );

  text = text
    .split(`path.join(process.cwd(), "data"`)
    .join(`path.join(DATA_ROOT`);

  write(file, text);
}

[
  "lib/system/logger.ts",
  "lib/gmail/gmailQueue.ts",
  "lib/invoices/pdfRegistry.ts",
  "lib/operations/duplicateDetector.ts",
  "lib/operations/workflowNotifications.ts",
  "lib/system/retryQueue.ts",
  "lib/system/attachmentRegistry.ts",
  "lib/ai/feedbackLog.ts",
  "lib/ai/learningMemory.ts",
  "lib/operations/updateDeliveryRate.ts",
  "app/api/invoice-approval/route.ts",
  "app/api/invoice-draft-update/route.ts",
  "app/api/invoice-approved-packages/route.ts",
  "app/api/invoice-send-status/route.ts",
  "app/api/notifications/route.ts",
  "app/api/notification-close/route.ts",
  "app/api/automation-status/route.ts",
  "app/api/operations-status/route.ts",
  "app/api/workflow-history/route.ts"
].forEach(fixDataRootFile);