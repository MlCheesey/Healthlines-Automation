import fs from "fs";
import path from "path";

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
      path.join(
        process.cwd(),
        "data",
        "notifications.json"
      )
    );

  const retries =
    read(
      path.join(
        process.cwd(),
        "data",
        "retry-queue.json"
      )
    );

  const attachments =
    read(
      path.join(
        process.cwd(),
        "data",
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