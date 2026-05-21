import fs from "fs";
import path from "path";
import { logSystemEvent, logSystemError } from "./logger";

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function backupFile(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return null;

    const backupDir = path.join(process.cwd(), "data", "backups");
    ensureDir(backupDir);

    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const backupPath = path.join(backupDir, `${timestamp}-${fileName}`);

    fs.copyFileSync(filePath, backupPath);

    logSystemEvent("file_backup_created", "Backup created before file write", {
      original: filePath,
      backup: backupPath,
    });

    return backupPath;
  } catch (error) {
    logSystemError("backupFile", error);
    return null;
  }
}