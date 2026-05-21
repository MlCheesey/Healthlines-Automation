import { detectDiscrepancies } from "@/lib/operations/discrepancyChecker";

export async function POST(req: Request) {
  const body = await req.json();

  const result = detectDiscrepancies({
    po_qty: body.po_qty,
    delivered_qty: body.delivered_qty,
    invoiced_qty: body.invoiced_qty,
  });

  return Response.json({
    success: true,
    result,
  });
}