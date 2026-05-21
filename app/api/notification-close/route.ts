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

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const rows = read();

  const updated = rows.map((row: any) =>
    row.id === body.id
      ? {
          ...row,
          status: "Closed",
          closed_at: new Date().toISOString(),
        }
      : row
  );

  write(updated);

  return Response.json({
    success: true,
  });
}