import fs from "fs";
import path from "path";

const FILE = path.join(
  process.cwd(),
  "data",
  "notifications.json"
);

function read() {
  if (!fs.existsSync(FILE)) return [];

  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function write(rows: any[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2));
}

export function addWorkflowNotification({
  title,
  message,
  severity = "info",
  source = "system",
}: {
  title: string;
  message: string;
  severity?: "info" | "warning" | "critical";
  source?: string;
}) {
  const rows = read();

  const record = {
    id: `NOTIF-${Date.now()}`,
    title,
    message,
    severity,
    source,
    status: "Open",
    created_at: new Date().toISOString(),
  };

  rows.push(record);
  write(rows);

  return record;
}