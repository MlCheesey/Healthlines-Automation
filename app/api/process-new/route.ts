import { internalFetch } from "@/lib/system/internalFetch";

export async function GET() {
  const res = await internalFetch("/api/gmail/process-new");
  const data = await res.json();

  return Response.json(data, {
    status: res.status,
  });
}
