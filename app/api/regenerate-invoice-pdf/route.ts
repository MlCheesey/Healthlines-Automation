import { registerPdf } from "@/lib/invoices/pdfRegistry";
import { buildInvoiceCycle } from "@/lib/invoices/buildInvoiceCycle";
import { generateInvoicePdf } from "@/lib/invoices/generateInvoicePdf";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const client =
      body.client || DEFAULT_CLIENT_ID;

    const dn_number =
      body.dn_number;

    const location =
      body.location;

    if (!dn_number || !location) {
      return Response.json(
        {
          error:
            "dn_number and location are required",
        },
        { status: 400 }
      );
    }

    const cycle =
      buildInvoiceCycle(client);

    const group =
      cycle.invoice_groups.find(
        (g: any) =>
          String(
            g.dn_number || ""
          ) ===
            String(
              dn_number || ""
            ) &&
          String(
            g.location || ""
          ) ===
            String(
              location || ""
            )
      );

    if (!group) {
      return Response.json(
        {
          error:
            "Invoice draft group not found",
        },
        { status: 404 }
      );
    }

    if (
      group.has_missing_rate
    ) {
      return Response.json(
        {
          error:
            "Cannot regenerate PDF. Missing unit rate exists.",
        },
        { status: 400 }
      );
    }

    const pdfPath =
      await generateInvoicePdf({
        invoice_number:
          group.invoice_number,

        client:
          group.client,

        location:
          group.location,

        po_number:
          group.po_number,

        dn_number:
          group.dn_number,

        dn_date:
          group.dn_date,

        mrn_number:
          group.mrn_number ||
          "",

        mrn_status:
          group.mrn_status ||
          "Pending",

        items:
          group.items.map(
            (item: any) => ({
              item_code:
                item.item_code ||
                "",

              item_name:
                item.item_name,

              qty: Number(
                item.qty || 0
              ),

              unit:
                item.unit || "",

              rate: Number(
                item.rate
              ),

              batch:
                item.batch || "",

              expiry:
                item.expiry || "",

              vat_percent:
                item.vat_percent ===
                  "" ||
                item.vat_percent ===
                  undefined
                  ? undefined
                  : Number(
                      item.vat_percent
                    ),

              taxability:
                item.taxability ||
                "",

              tax_reason:
                item.tax_reason ||
                "",
            })
          ),
      });

    const registry =
      registerPdf({
        client,
        location,
        dn_number,

        invoice_number:
          group.invoice_number,

        pdfPath,
      });

    logSystemEvent(
      "invoice_pdf_regenerated",
      "Invoice PDF regenerated",
      {
        client,
        location,
        dn_number,

        invoice_number:
          group.invoice_number,

        pdfPath,
      }
    );

    return Response.json({
      success: true,

      invoice_number:
        group.invoice_number,

      pdfPath,

      registry,
    });
  } catch (error: any) {
    logSystemError(
      "regenerate-invoice-pdf-api",
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          "Regenerate invoice PDF failed",
      },
      { status: 500 }
    );
  }
}