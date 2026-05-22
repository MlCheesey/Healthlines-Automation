import { buildInvoiceCycle } from "@/lib/invoices/buildInvoiceCycle";
import { generateInvoiceCycleExcel } from "@/lib/invoices/generateInvoiceCycleExcel";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const client = body.client || "davita";

    const cycle = buildInvoiceCycle(client);

    const flattenedRows = cycle.invoice_groups.flatMap((group: any) =>
      group.items.map((item: any) => ({
        client: group.client,
        location: group.location,
        po_number: group.po_number,
        dn_number: group.dn_number,
        dn_date: group.dn_date,
        mrn_number: group.mrn_number,
        mrn_status: group.mrn_status,
        invoice_number: group.invoice_number,
        invoice_package_id: group.invoice_package_id,
        item_code: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        unit: item.unit,
        rate: item.rate,
        batch: item.batch,
        expiry: item.expiry,
        vat_percent: item.vat_percent,
        taxability: item.taxability,
        tax_reason: item.tax_reason,
      }))
    );

    const excelPath =
      await generateInvoiceCycleExcel(
        flattenedRows
      );

    return Response.json({
      success: true,
      package_id: cycle.package_id,
      invoice_groups:
        cycle.invoice_groups,
      counts: cycle.counts,
      excelPath,
      mrn_pending:
        cycle.mrn_pending,
      mrn_overdue:
        cycle.mrn_overdue,
      missing_rates:
        cycle.missing_rates,
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error:
          error?.message ||
          String(error),
      },
      { status: 500 }
    );
  }
}