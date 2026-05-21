import fs from "fs";
import path from "path";

export async function GET() {
  const backupDir = path.join(process.cwd(), "data", "backups");

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