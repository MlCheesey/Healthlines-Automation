import fs from "fs";
import path from "path";

export async function GET() {
  const checks = {
    data_folder: fs.existsSync(path.join(process.cwd(), "data")),
    clients_folder: fs.existsSync(path.join(process.cwd(), "data", "clients")),
    invoices_folder: fs.existsSync(path.join(process.cwd(), "data", "invoices")),
    logs_folder: fs.existsSync(path.join(process.cwd(), "data", "system-logs")),
    env_app_url: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    env_gemini: Boolean(process.env.GEMINI_API_KEY),
    env_gmail_client: Boolean(process.env.GOOGLE_CLIENT_ID),
    env_gmail_secret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    env_gmail_refresh: Boolean(process.env.GOOGLE_REFRESH_TOKEN),
  };

  return Response.json({
    success: true,
    status: Object.values(checks).every(Boolean) ? "healthy" : "needs_attention",
    checks,
    checked_at: new Date().toISOString(),
  });
}