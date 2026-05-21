import fs from "fs";
import path from "path";

const logsDir = path.join(
  process.cwd(),
  "data",
  "system-logs"
);

function ensureDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, {
      recursive: true,
    });
  }
}

export function logSystemEvent(
  type: string,
  message: string,
  details?: any
) {
  ensureDir();

  const filePath = path.join(
    logsDir,
    "events.log"
  );

  const payload = {
    timestamp:
      new Date().toISOString(),
    type,
    message,
    details,
  };

  fs.appendFileSync(
    filePath,
    JSON.stringify(payload) + "\n"
  );
}

export function logSystemError(
  source: string,
  error: any
) {
  ensureDir();

  const filePath = path.join(
    logsDir,
    "errors.log"
  );

  const payload = {
    timestamp:
      new Date().toISOString(),
    source,
    error:
      error?.message ||
      String(error),
    stack:
      error?.stack || "",
  };

  fs.appendFileSync(
    filePath,
    JSON.stringify(payload) + "\n"
  );
}