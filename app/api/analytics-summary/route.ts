import fs from "fs";
import path from "path";
import { DATA_ROOT } from "@/lib/config/storage";

function read(file: string) {
  if (!fs.existsSync(file))
    return [];

  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch {
    return [];
  }
}

export async function GET() {
  const notifications =
    read(
      path.join(DATA_ROOT,
        "notifications.json"
      )
    );

  const retries =
    read(
      path.join(DATA_ROOT,
        "retry-queue.json"
      )
    );

  const attachments =
    read(
      path.join(DATA_ROOT,
        "attachment-registry.json"
      )
    );

  return Response.json({
    success: true,

    notifications:
      notifications.length,

    retry_jobs:
      retries.length,

    attachments:
      attachments.length,

    failed_jobs:
      retries.filter(
        (r: any) =>
          r.status === "Failed"
      ).length,
  });
}