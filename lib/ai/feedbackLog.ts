import fs from "fs";
import path from "path";

const FILE = path.join(
  process.cwd(),
  "data",
  "ai-feedback.json"
);

function read() {
  if (!fs.existsSync(FILE))
    return [];

  try {
    return JSON.parse(
      fs.readFileSync(FILE, "utf8")
    );
  } catch {
    return [];
  }
}

function write(rows: any[]) {
  fs.mkdirSync(
    path.dirname(FILE),
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    FILE,
    JSON.stringify(rows, null, 2)
  );
}

export function recordAIFeedback(
  row: any
) {
  const rows = read();

  rows.push({
    id: `FB-${Date.now()}`,

    ...row,

    created_at:
      new Date().toISOString(),
  });

  write(rows);

  return rows[rows.length - 1];
}