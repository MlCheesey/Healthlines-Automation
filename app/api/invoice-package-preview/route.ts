import { buildInvoiceCycle } from "@/lib/invoices/buildInvoiceCycle";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const client = url.searchParams.get("client") || DEFAULT_CLIENT_ID;

  const cycle = buildInvoiceCycle(client);

  const ready = cycle.invoice_groups.filter(
    (group: any) => !group.has_missing_rate
  );

  const blocked = cycle.invoice_groups.filter(
    (group: any) => group.has_missing_rate
  );

  return Response.json({
    success: true,
    client,
    summary: {
      ready_groups: ready.length,
      blocked_groups: blocked.length,
      missing_rates: cycle.missing_rates.length,
      mrn_pending: cycle.mrn_pending.length,
      mrn_overdue: cycle.mrn_overdue.length,
      skipped_already_packaged: cycle.skipped_already_packaged?.length || 0,
    },
    ready,
    blocked,
    missing_rates: cycle.missing_rates,
    read_errors: cycle.read_errors || [],
  });
}