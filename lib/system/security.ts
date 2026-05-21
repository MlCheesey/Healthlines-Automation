export function requireWorkerSecret(req: Request) {
  const expected = process.env.WORKER_SECRET;

  if (!expected) {
    return false;
  }

  return req.headers.get("x-worker-secret") === expected;
}

export function requireDevToolsEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.DEV_TOOLS_ENABLED === "true"
  );
}

export function safeError(error: any) {
  return {
    message: error?.message || "Unexpected error",
  };
}