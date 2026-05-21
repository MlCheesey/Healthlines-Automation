import fs from "fs";
import path from "path";

export async function GET() {
  const backupDir = path.join(process.cwd(), "data", "backups");

  if (!fs.existsSync(backupDir)) {
    return Response.json({
      success: true,
      backups: [],
    });
  }

  const backups = fs
    .readdirSync(backupDir)
    .map((file) => {
      const fullPath = path.join(backupDir, file);
      const stat = fs.statSync(fullPath);

      return {
        file,
        path: fullPath,
        size: stat.size,
        modified_at: stat.mtime.toISOString(),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.modified_at).getTime() -
        new Date(a.modified_at).getTime()
    );

  return Response.json({
    success: true,
    count: backups.length,
    backups,
  });
}