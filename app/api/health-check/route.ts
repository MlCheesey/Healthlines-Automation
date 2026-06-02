import { DATA_ROOT } from "@/lib/config/storage";
import fs from "fs";
import path from "path";

export async function GET() {
  const checks = {
    data_folder: fs.existsSync(path.join(DATA_ROOT)),
    clients_folder: fs.existsSync(path.join(DATA_ROOT, "clients")),
    invoices_folder: fs.existsSync(path.join(DATA_ROOT, "invoices")),
    logs_folder: fs.existsSync(path.join(DATA_ROOT, "system-logs")),
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