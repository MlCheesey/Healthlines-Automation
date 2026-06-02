import fs from "fs";
import path from "path";
import { DATA_ROOT } from "@/lib/config/storage";
import { backupFile } from "@/lib/system/backup";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

function isInsideData(filePath: string) {
  const resolved = path.resolve(filePath);
  const dataRoot = path.resolve(DATA_ROOT);

  return resolved.startsWith(dataRoot);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.backup_path || !body.restore_to) {
      return Response.json(
        {
          error: "backup_path and restore_to are required",
        },
        { status: 400 }
      );
    }

    if (!isInsideData(body.backup_path) || !isInsideData(body.restore_to)) {
      return Response.json(
        {
          error: "Unsafe file path",
        },
        { status: 400 }
      );
    }

    if (!fs.existsSync(body.backup_path)) {
      return Response.json(
        {
          error: "Backup file not found",
        },
        { status: 404 }
      );
    }

    if (fs.existsSync(body.restore_to)) {
      backupFile(body.restore_to);
    }

    fs.copyFileSync(body.backup_path, body.restore_to);

    logSystemEvent("backup_restored", "Backup restored successfully", {
      backup_path: body.backup_path,
      restore_to: body.restore_to,
    });

    return Response.json({
      success: true,
      backup_path: body.backup_path,
      restore_to: body.restore_to,
    });
  } catch (error: any) {
    logSystemError("restore-backup-api", error);

    return Response.json(
      {
        error: error.message || "Backup restore failed",
      },
      { status: 500 }
    );
  }
}