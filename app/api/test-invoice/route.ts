import { generateInvoicePdf } from "@/lib/invoices/generateInvoicePdf";
import { blockDevRoute, devToolsAllowed } from "@/lib/system/devGuard";

export async function GET() {
  if (!devToolsAllowed()) {
    return blockDevRoute();
  }

  try {
    const pdfPath = await generateInvoicePdf({
      invoice_number: "TEST-INVOICE-001",
      client: "Davita Care KSA",
      location: "Majaridha",
      po_number: "PO/KSA/TEST/001",
      dn_number: "DN-TEST-001",
      dn_date: "18-Sep-25",
      mrn_number: "MRN-TEST-001",

      items: [
        {
          item_code: "HC-001",
          item_name: "AVF KIT with Sterile gloves, Gauze and drape",
          qty: 200,
          unit: "Each",
          rate: 10.5,
          batch: "Primary Batch",
          expiry: "31-Dec-29",
          extra_lines: [
            "GAUZE SWAB 10X10-200",
            "DRAPE SHEET-200",
            "GLOVE 6-4 BOX",
            "GLOVES 6.5-4 BOX",
          ],
        },
        {
          item_name: "Gauze Swab 10x10cm 16ply 2pcs/pkt-GT",
          qty: 500,
          unit: "Pack",
          rate: 0.32,
          batch: "20250320",
          expiry: "19-Mar-30",
        },
      ],
    });

    return Response.json({
      success: true,
      dev_only: true,
      pdfPath,
    });
  } catch (error: any) {
    return Response.json(
      {
        error: error.message || "Invoice test failed",
      },
      { status: 500 }
    );
  }
}