import { getRetryJobs } from "@/lib/system/retryQueue";

export async function GET() {
  return Response.json({
    success: true,
    rows: getRetryJobs(),
  });
}