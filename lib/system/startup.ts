import fs from "fs";
import path from "path";

export function initializeSystemFolders() {
  const folders = [
    "data",
    "data/backups",
    "data/clients",
    "data/system-status",
    "data/generated",
    "data/generated/invoices",
    "data/generated/excel",
  ];

  for (const folder of folders) {
    fs.mkdirSync(
      path.join(process.cwd(), folder),
      {
        recursive: true,
      }
    );
  }
}