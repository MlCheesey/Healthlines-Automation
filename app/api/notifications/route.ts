import { addWorkflowNotification } from "@/lib/operations/workflowNotifications";
import fs from "fs";
import path from "path";
import { DATA_ROOT } from "@/lib/config/storage";

const FILE = path.join(DATA_ROOT,
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

export async function GET() {
  return Response.json({
    success: true,
    rows: read().reverse(),
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  const record = addWorkflowNotification({
    title: body.title || "Notification",
    message: body.message || "",
    severity: body.severity || "info",
    source: body.source || "dashboard",
  });

  return Response.json({
    success: true,
    record,
  });
}

export async function PATCH(req: Request) {
  const body = await req.json();

  if (!body.id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const rows = read();

  const updated = rows.map((row: any) =>
    row.id === body.id
      ? {
          ...row,
          status: body.status || row.status,
          updated_at: new Date().toISOString(),
        }
      : row
  );

  write(updated);

  return Response.json({
    success: true,
  });
}