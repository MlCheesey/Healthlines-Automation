import fs from "fs";
import path from "path";

const POSSIBLE_FILES = [
  path.join(process.cwd(), "data", "system-log.json"),
  path.join(process.cwd(), "data", "system-events.json"),
  path.join(process.cwd(), "data", "logs", "system-log.json"),
];

function readJson(filePath: string) {
  if (!fs.existsSync(filePath)) return [];

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error: any) {
    console.error(
      "Audit timeline read failed:",
      error?.message || String(error)
    );

    return [];
  }
}

export async function GET() {
  let rows: any[] = [];

  for (const file of POSSIBLE_FILES) {
    rows = rows.concat(readJson(file));
  }

  rows.sort((a, b) => {
    const aDate = new Date(a.created_at || a.timestamp || 0).getTime();
    const bDate = new Date(b.created_at || b.timestamp || 0).getTime();

    return bDate - aDate;
  });

  return Response.json({
    success: true,
    rows,
  });
}