import {
  getRegisteredPdfs,
} from "@/lib/invoices/pdfRegistry";

export async function GET() {
  return Response.json({
    success: true,
    rows:
      getRegisteredPdfs(),
  });
}