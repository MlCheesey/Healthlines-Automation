import { DATA_ROOT } from "@/lib/config/storage";
import fs from "fs";
import path from "path";

function readLog(fileName: string) {
  const filePath = path.join(DATA_ROOT, "system-logs", fileName);

  if (!fs.existsSync(filePath)) return [];

  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    })
    .reverse();
}

export async function GET() {
  return Response.json({
    success: true,
    errors: readLog("errors.log"),
    events: readLog("events.log"),
  });
}