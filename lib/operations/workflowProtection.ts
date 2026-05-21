import fs from "fs";
import path from "path";

const DATA_DIR = path.join(
  process.cwd(),
  "data",
  "workflow-protection"
);

const EMAIL_FILE = path.join(DATA_DIR, "processed-emails.json");
const DN_FILE = path.join(DATA_DIR, "processed-dns.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson(filePath: string) {
  ensureDir();

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

function writeJson(filePath: string, data: any) {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function hasProcessedEmail(emailId: string) {
  const processed = readJson(EMAIL_FILE);
  return processed.includes(emailId);
}

export function markEmailProcessed(emailId: string) {
  const processed = readJson(EMAIL_FILE);

  if (!processed.includes(emailId)) {
    processed.push(emailId);
    writeJson(EMAIL_FILE, processed);
  }
}

function buildDnKey({
  client,
  location,
  dn_number,
}: {
  client: string;
  location: string;
  dn_number: string;
}) {
  return [
    String(client || "").trim().toLowerCase(),
    String(location || "").trim().toLowerCase(),
    String(dn_number || "").trim().toLowerCase(),
  ].join("__");
}

export function hasProcessedDN({
  client,
  location,
  dn_number,
}: {
  client: string;
  location: string;
  dn_number: string;
}) {
  const processed = readJson(DN_FILE);

  const key = buildDnKey({
    client,
    location,
    dn_number,
  });

  return processed.includes(key);
}

export function markDNProcessed({
  client,
  location,
  dn_number,
}: {
  client: string;
  location: string;
  dn_number: string;
}) {
  const processed = readJson(DN_FILE);

  const key = buildDnKey({
    client,
    location,
    dn_number,
  });

  if (!processed.includes(key)) {
    processed.push(key);
    writeJson(DN_FILE, processed);
  }
}