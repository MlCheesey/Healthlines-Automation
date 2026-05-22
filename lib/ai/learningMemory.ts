import fs from "fs";
import path from "path";

const FILE = path.join(
  process.cwd(),
  "data",
  "learning-memory.json"
);

function read() {
  if (!fs.existsSync(FILE)) return [];

  try {
    return JSON.parse(
      fs.readFileSync(FILE, "utf8")
    );
  } catch (error: any) {
    console.error(
      "Learning memory read failed:",
      error?.message || String(error)
    );

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

export function addLearningRule(
  row: any
) {
  const rows = read();

  const record = {
    id: `RULE-${Date.now()}`,
    created_at:
      new Date().toISOString(),

    category:
      row.category || "general",

    trigger:
      row.trigger || "",

    correction:
      row.correction || "",

    rule:
      row.rule || "",

    active: true,
  };

  rows.push(record);

  write(rows);

  return record;
}

export function getLearningMemory() {
  return read().reverse();
}

export function addLearningMemory(row: any) {
  return addLearningRule(row);
}