import { buildInvoiceCycle } from "@/lib/invoices/buildInvoiceCycle";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const client = url.searchParams.get("client") || DEFAULT_CLIENT_ID;

  const cycle = buildInvoiceCycle(client);

  return Response.json({
    success: true,
    client,
    drafts: cycle.invoice_groups,
    missing_rates: cycle.missing_rates,
    read_errors: cycle.read_errors || [],
  });
}