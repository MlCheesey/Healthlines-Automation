import fs from "fs";
import path from "path";

const FILE = path.join(
  process.cwd(),
  "data",
  "duplicate-detector.json"
);

function read() {
  if (!fs.existsSync(FILE)) return [];

  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function write(rows: string[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2));
}

export function buildDuplicateKey({
  type,
  client,
  location,
  reference,
}: {
  type: string;
  client: string;
  location?: string;
  reference: string;
}) {
  return [
    type,
    client || "",
    location || "",
    reference || "",
  ]
    .map((v) => String(v).trim().toLowerCase())
    .join("__");
}

export function isDuplicateKey(key: string) {
  if (!key) return false;

  const rows = read();

  if (rows.includes(key)) return true;

  rows.push(key);
  write(rows);

  return false;
}