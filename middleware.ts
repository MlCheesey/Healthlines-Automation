import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api/");
}

function isWorkerAuthorized(req: NextRequest) {
  const workerSecret = process.env.WORKER_SECRET;

  if (!workerSecret) return false;

  return req.headers.get("x-worker-secret") === workerSecret;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLoggedIn =
    req.cookies.get("healthlines_auth")?.value === "logged_in";

  if (isLoggedIn) {
    return NextResponse.next();
  }

  if (isWorkerAuthorized(req)) {
    return NextResponse.next();
  }

  if (isApiRoute(pathname)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Login or worker secret required.",
      },
      { status: 401 }
    );
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: [
    "/dashboard/:path*",

    "/api/analyze-email/:path*",
    "/api/process-email/:path*",
    "/api/record-po/:path*",
    "/api/record-quarterly-po/:path*",

    "/api/dashboard-overview/:path*",
    "/api/dashboard-data/:path*",
    "/api/workflow-history/:path*",

    "/api/automation-cycle/:path*",
    "/api/automation-status/:path*",

    "/api/gmail/process-new/:path*",
    "/api/gmail/message/:path*",
    "/api/gmail/create-draft/:path*",
    "/api/gmail/draft-invoice-email/:path*",

    "/api/approval-action/:path*",
    "/api/human-override/:path*",

    "/api/invoice-package/:path*",
    "/api/invoice-package-worker/:path*",
    "/api/generate-invoice-cycle/:path*",
    "/api/manual-rate-update/:path*",

    "/api/mrn-watcher/:path*",

    "/api/system-logs/:path*",
    "/api/backup-status/:path*",
    "/api/health-check/full/:path*",
    "/api/security-check/:path*",
  ],
};