import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "processed-emails.json");

function ensureFile() {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]");
}

export function getProcessedEmailIds(): string[] {
  ensureFile();
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function markEmailProcessed(id: string) {
  const ids = getProcessedEmailIds();
  if (!ids.includes(id)) ids.push(id);
  fs.writeFileSync(filePath, JSON.stringify(ids, null, 2));
}