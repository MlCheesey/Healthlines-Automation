import fs from "fs";
import path from "path";

export async function GET() {
  const statusPath = path.join(
    process.cwd(),
    "data",
    "system-status",
    "automation-worker.json"
  );

  if (!fs.existsSync(statusPath)) {
    return Response.json({
      success: true,
      worker_running: false,
      message: "No worker status found. Start worker using npm run worker.",
    });
  }

  try {
    const data = JSON.parse(fs.readFileSync(statusPath, "utf8"));

    return Response.json({
      success: true,
      worker_running: data.status === "running",
      status: data,
    });
  } catch {
    return Response.json({
      success: false,
      worker_running: false,
      message: "Worker status file could not be read.",
    });
  }
}