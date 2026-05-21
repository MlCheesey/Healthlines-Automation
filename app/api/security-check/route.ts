export async function GET() {
  const checks = {
    worker_secret_configured: Boolean(process.env.WORKER_SECRET),
    login_user_configured: Boolean(process.env.HEALTHLINES_LOGIN_USER),
    login_password_configured: Boolean(process.env.HEALTHLINES_LOGIN_PASSWORD),
    default_client_configured: Boolean(process.env.DEFAULT_CLIENT),
    dev_tools_enabled: process.env.DEV_TOOLS_ENABLED === "true",
    app_url_configured: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    gemini_configured: Boolean(process.env.GEMINI_API_KEY),
    gmail_client_configured: Boolean(process.env.GOOGLE_CLIENT_ID),
    gmail_secret_configured: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    gmail_refresh_configured: Boolean(process.env.GOOGLE_REFRESH_TOKEN),
  };

  return Response.json({
    success: true,
    status: Object.values(checks).every(Boolean)
      ? "fully_configured"
      : "needs_attention",
    checks,
  });
}