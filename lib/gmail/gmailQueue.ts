import fs from "fs";
import path from "path";

const FILE = path.join(
  process.cwd(),
  "data",
  "gmail-queue.json"
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
  fs.mkdirSync(path.dirname(FILE), {
    recursive: true,
  });

  fs.writeFileSync(
    FILE,
    JSON.stringify(rows, null, 2)
  );
}

export function addToGmailQueue(row: any) {
  const rows = read();

  rows.push({
    id: `MAIL-${Date.now()}`,
    status: "PENDING_DRAFT",
    created_at: new Date().toISOString(),
    ...row,
  });

  write(rows);

  return rows[rows.length - 1];
}

export function getGmailQueue() {
  return read().reverse();
}

export function updateGmailQueue(
  id: string,
  updates: any
) {
  const rows = read();

  const updated = rows.map((row: any) =>
    row.id === id
      ? {
          ...row,
          ...updates,
          updated_at:
            new Date().toISOString(),
        }
      : row
  );

  write(updated);

  return updated.find(
    (r: any) => r.id === id
  );
}