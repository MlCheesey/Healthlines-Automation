import { buildInvoiceCycle } from "@/lib/invoices/buildInvoiceCycle";
import { generateInvoiceCycleExcel } from "@/lib/invoices/generateInvoiceCycleExcel";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const client = url.searchParams.get("client") || DEFAULT_CLIENT_ID;

    const cycle = buildInvoiceCycle(client);

    if (cycle.read_errors?.length > 0) {
  return Response.json(
    {
      success: false,
      blocked: true,
      reason: "workbook_access_error",
      message:
        "Invoice cycle blocked because one or more Excel workbooks could not be accessed. Close any open Excel files and try again.",
      read_errors: cycle.read_errors,
    },
    { status: 423 }
  );
}

    const excelPath = await generateInvoiceCycleExcel(
      cycle.invoice_rows.map((row: any) => ({
        client,
        location: row.location || "",
        po_number: row.po_number || "",
        dn_number: row.dn_number || "",
        mrn_number: row.mrn_number || "",
        mrn_status: row.mrn_status || "Pending",
        invoice_number: row.dn_number ? `INV-${row.dn_number}` : "",
        qty: Number(row.qty || 0),
        amount:
          row.rate === ""
            ? 0
            : Number(row.qty || 0) * Number(row.rate || 0),
        status: row.status || "Pending Review",
      }))
    );

    logSystemEvent("invoice_cycle_generated", "Invoice cycle generated", {
      client,
      total_delivery_rows: cycle.invoice_rows.length,
      invoice_groups: cycle.invoice_groups.length,
      mrn_received: cycle.mrn_received.length,
      mrn_pending: cycle.mrn_pending.length,
      mrn_overdue: cycle.mrn_overdue.length,
      missing_rates: cycle.missing_rates.length,
      excelPath,
    });

    return Response.json({
      success: true,
      invoice_cycle: {
        generated_at: new Date().toISOString(),
        client,
        excelPath,
        total_delivery_rows: cycle.invoice_rows.length,
        invoice_groups: cycle.invoice_groups.length,
        mrn_received: cycle.mrn_received.length,
        mrn_pending: cycle.mrn_pending.length,
        mrn_overdue: cycle.mrn_overdue.length,
        missing_unit_rates: cycle.missing_rates.length,
        locations: [
          ...new Set(
            cycle.invoice_rows.map((row: any) => row.location || "unknown")
          ),
        ],
      },
      cycle,
    });
  } catch (error: any) {
    logSystemError("generate-invoice-cycle-api", error);

    return Response.json(
      {
        error: error.message || "Invoice cycle failed",
      },
      { status: 500 }
    );
  }
}