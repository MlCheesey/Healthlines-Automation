import fs from "fs";
import path from "path";
import { DATA_ROOT } from "@/lib/config/storage";
import { addLearningRule } from "@/lib/ai/learningMemory";

const FILE = path.join(DATA_ROOT, "ai-feedback.json");

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

  const rows = read();

  const record = {
    id: `FB-${Date.now()}`,
    created_at: new Date().toISOString(),
    category: body.category || "general",
    message: body.message || "",
    correction: body.correction || "",
    status: "Open",
  };

  rows.push(record);
  write(rows);

  const learningRule = addLearningRule({
    category: body.category || "general",
    trigger: body.message || "",
    correction: body.correction || "",
    rule: `When similar workflow appears: ${body.correction}`,
  });

  return Response.json({
    success: true,
    record,
    learningRule,
  });
}