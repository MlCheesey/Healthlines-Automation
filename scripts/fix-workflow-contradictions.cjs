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

function replace(file, from, to) {
  let text = read(file);

  if (!text.includes(from)) {
    console.log("skip/already changed:", file);
    return;
  }

  text = text.replace(from, to);
  write(file, text);
}

function replaceAll(file, from, to) {
  let text = read(file);
  const before = text;

  text = text.split(from).join(to);

  if (text === before) {
    console.log("skip/already changed:", file);
    return;
  }

  write(file, text);
}

/**
 * 1. Master workbook contradiction:
 * masterWorkbook creates Master_PO, but poRecorder writes PO_Control.
 */
replace(
  "lib/operations/poRecorder.ts",
  `appendMasterRow(client, "PO_Control", row);`,
  `appendMasterRow(client, "Master_PO", row);`
);

/**
 * 2. Old processed email path contradiction:
 * legacy process-new uses process.cwd()/data instead of DATA_ROOT.
 */
{
  const file = "lib/operations/processedEmails.ts";
  let text = read(file);
  text = ensureImport(text, `import { DATA_ROOT } from "@/lib/config/storage";`);
  text = text.replace(
    `const filePath = path.join(process.cwd(), "data", "processed-emails.json");`,
    `const filePath = path.join(DATA_ROOT, "processed-emails.json");`
  );
  write(file, text);
}

/**
 * 3. Legacy /api/process-new contradiction:
 * old route reads /gmail/latest repeatedly instead of the actual message id.
 * It should simply delegate to the real worker route.
 */
write(
  "app/api/process-new/route.ts",
  `import { internalFetch } from "@/lib/system/internalFetch";

export async function GET() {
  const res = await internalFetch("/api/gmail/process-new");
  const data = await res.json();

  return Response.json(data, {
    status: res.status,
  });
}
`
);

/**
 * 4. DATA_ROOT contradictions in dashboard / status routes.
 */
const dataRootFiles = [
  "app/api/backup-restore-list/route.ts",
  "app/api/backup-status/route.ts",
  "app/api/dashboard-data/route.ts",
  "app/api/dashboard-overview/route.ts",
  "app/api/delivery-schedule/route.ts",
  "app/api/health-check/route.ts",
  "app/api/open-actions/route.ts",
  "app/api/packaage-action-summary/route.ts",
  "app/api/system-logs/route.ts",
  "app/api/audit-timeline/route.ts",
];

for (const file of dataRootFiles) {
  let text = read(file);
  text = ensureImport(text, `import { DATA_ROOT } from "@/lib/config/storage";`);
  text = text.split(`path.join(process.cwd(), "data"`).join(`path.join(DATA_ROOT`);
  write(file, text);
}

/**
 * 5. Invoice PDF output contradiction:
 * PDF was saved to app-local data instead of DATA_ROOT.
 */
{
  const file = "lib/invoices/generateInvoicePdf.ts";
  let text = read(file);
  text = ensureImport(text, `import { DATA_ROOT } from "@/lib/config/storage";`);
  text = text.replace(
    `const invoicesDir = path.join(process.cwd(), "data", "invoices");`,
    `const invoicesDir = path.join(DATA_ROOT, "invoices");`
  );
  write(file, text);
}

/**
 * 6. Invoice status updater contradiction:
 * status updater looked in app-local data instead of DATA_ROOT.
 */
{
  const file = "lib/invoices/invoiceStatusUpdater.ts";
  let text = read(file);
  text = ensureImport(text, `import { DATA_ROOT } from "@/lib/config/storage";`);

  text = text.replace(
`function getWorkbookPath(client: string, location: string) {
  return path.join(
    process.cwd(),
    "data",
    "clients",
    safeName(client),
    \`\${safeName(location)}.xlsx\`
  );
}`,
`function getWorkbookPath(client: string, location: string) {
  return path.join(
    DATA_ROOT,
    "clients",
    safeName(client),
    \`\${safeName(location)}.xlsx\`
  );
}`
  );

  write(file, text);
}

/**
 * 7. Tally location contradiction:
 * Tally DN sync was forcing all delivery notes into "general".
 * This adds safe basic inference from narration/party/PO/DN text.
 */
{
  const file = "app/api/tally/sync-delivery-notes/route.ts";
  let text = read(file);

  if (!text.includes("function inferTallyLocation")) {
    text = text.replace(
`function writeState(data: any) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
}`,
`function writeState(data: any) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
}

function safeName(value: string) {
  return (
    String(value || "general")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "general"
  );
}

function inferTallyLocation(dn: any) {
  const text = [
    dn.location,
    dn.delivery_location,
    dn.destination,
    dn.remarks,
    dn.party_name,
    dn.po_number,
    dn.dn_number,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const knownLocations: Record<string, string[]> = {
    kfh_al_ahsa: ["kfh", "al ahsa", "al-ahsa", "king faisal"],
    sgh_makkah: ["sgh", "makkah", "makka"],
    riyadh: ["riyadh"],
    jeddah: ["jeddah"],
    makkah: ["makkah", "makka"],
    madinah: ["madinah", "medina"],
    dammam: ["dammam"],
    khobar: ["khobar"],
  };

  for (const [location, keywords] of Object.entries(knownLocations)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return location;
    }
  }

  return safeName(dn.location || dn.delivery_location || dn.destination || "general");
}`
    );
  }

  text = text.replace(
    `location: "general",`,
    `location: inferTallyLocation(dn),`
  );

  write(file, text);
}