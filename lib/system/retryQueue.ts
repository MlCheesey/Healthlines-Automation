import fs from "fs";
import path from "path";

const FILE = path.join(
  process.cwd(),
  "data",
  "retry-queue.json"
);

function read() {
  if (!fs.existsSync(FILE)) return [];

  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (error: any) {
    console.error(
      "Retry queue read failed:",
      error?.message || String(error)
    );

    return [];
  }
}

function write(rows: any[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2));
}

export function addRetryJob(row: any) {
  const rows = read();

  const record = {
    id: `RETRY-${Date.now()}`,
    attempts: 0,
    status: "Pending",
    created_at: new Date().toISOString(),
    ...row,
  };

  rows.push(record);
  write(rows);

  return record;
}

export function getRetryJobs() {
  return read().reverse();
}