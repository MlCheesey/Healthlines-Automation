import fs from "fs";
import path from "path";

const FILE = path.join(
  process.cwd(),
  "data",
  "attachment-registry.json"
);

function read() {
  if (!fs.existsSync(FILE)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (error: any) {
    console.error(
      "Attachment registry read failed:",
      error?.message || String(error)
    );

    return [];
  }
}

function write(rows: any[]) {
  try {
    fs.mkdirSync(path.dirname(FILE), {
      recursive: true,
    });

    fs.writeFileSync(
      FILE,
      JSON.stringify(rows, null, 2)
    );
  } catch (error: any) {
    console.error(
      "Attachment registry write failed:",
      error?.message || String(error)
    );

    throw error;
  }
}

export function registerAttachment(row: any) {
  const rows = read();

  const record = {
    id: `ATT-${Date.now()}`,
    created_at: new Date().toISOString(),
    filename: row.filename || "",
    type: row.type || row.mime_type || "",
    source_email_id: row.source_email_id || "",
    parser_status: row.parser_status || "",
    notes: row.notes || "",
    path: row.path || "",
    ...row,
  };

  rows.push(record);

  write(rows);

  return record;
}

export function getAttachments() {
  return read().reverse();
}