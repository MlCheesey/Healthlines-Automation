export async function internalFetch(path: string, init: RequestInit = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const workerSecret = process.env.WORKER_SECRET || "";

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      "x-worker-secret": workerSecret,
    },
  });
}