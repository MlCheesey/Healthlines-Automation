import { generateInvoicePdf } from "@/lib/invoices/generateInvoicePdf";
import { calculateInvoice } from "@/lib/invoices/invoiceRules";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const check = calculateInvoice(body.lines || body.items || []);

    if (!check.can_generate) {
      return Response.json({
        success: false,
        approval_required: true,
        reason: "missing_unit_rates",
        ...check,
      });
    }

    const pdfPath = await generateInvoicePdf({
      invoice_number: body.invoice_number,
      client: body.client,
      location: body.location,
      po_number: body.po_number,
      dn_number: body.dn_number,
      mrn_number: body.mrn_number,
      mrn_pending: body.mrn_pending,
      items: (body.lines || body.items).map((line: any) => ({
        item_name: line.item_name,
        qty: Number(line.qty),
        rate: Number(line.rate),
      })),
    });

    return Response.json({
      success: true,
      pdfPath,
      totals: check,
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Invoice generation failed" },
      { status: 500 }
    );
  }
}