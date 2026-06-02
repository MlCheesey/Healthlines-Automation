import fs from "fs";
import path from "path";
import { DATA_ROOT } from "@/lib/config/storage";

export async function GET() {
  const backupDir = path.join(DATA_ROOT, "backups");

  if (!fs.existsSync(backupDir)) {
    return Response.json({
      success: true,
      backups: [],
      count: 0,
    });
  }

  const backups = fs.readdirSync(backupDir).map((file) => ({
    file,
    path: path.join(backupDir, file),
  }));

  return Response.json({
    success: true,
    count: backups.length,
    backups,
  });
}