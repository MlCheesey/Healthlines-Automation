import { internalFetch } from "@/lib/system/internalFetch";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "true";

  const res = await internalFetch(
    force ? "/api/gmail/process-new?force=true" : "/api/gmail/process-new"
  );

  const data = await res.json();

  return Response.json(data, {
    status: res.status,
  });
}