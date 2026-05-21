import { buildInvoiceCycle } from "@/lib/invoices/buildInvoiceCycle";
import { generateInvoiceCycleExcel } from "@/lib/invoices/generateInvoiceCycleExcel";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const client =
      body.client || "davita";

    const cycle =
      buildInvoiceCycle(client);

    const excelPath =
      await generateInvoiceCycleExcel(
        cycle.invoice_rows.map(
          (row: any) => ({
            client,
            location: row.location,
            po_number: row.po_number,
            dn_number: row.dn_number,
            mrn_number:
              row.mrn_number || "",
            invoice_number: `INV-${row.dn_number}`,
            qty: row.qty,
            amount:
              Number(row.qty || 0) *
              Number(row.rate || 0),
            status: row.status,
          })
        )
      );

    return Response.json({
      success: true,
      client,
      excelPath,
      total_rows:
        cycle.invoice_rows.length,
      missing_mrn:
        cycle.missing_mrn.length,
      missing_rates:
        cycle.missing_rates.length,
      cycle,
    });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error.message ||
          "Invoice cycle failed",
      },
      { status: 500 }
    );
  }
}