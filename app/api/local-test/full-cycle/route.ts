import { recordPO } from "@/lib/operations/poRecorder";
import { blockDevRoute, devToolsAllowed } from "@/lib/system/devGuard";

export async function GET() {
  if (!devToolsAllowed()) {
    return blockDevRoute();
  }

  try {
    const poResult = recordPO({
      client: "davita",
      po_number: "PO-LOCAL-TEST-001",
      po_type: "Quarterly PO",
      location: "Test Location",
      items: [
        {
          item_code: "TEST-001",
          item_name: "Test Product",
          quantity: 500,
          unit: "pcs",
        },
      ],
      delivery_date: "2026-05-20",
      notes: "Local development test PO",
    });

    return Response.json({
      success: true,
      dev_only: true,
      message: "Local full-cycle seed created",
      poResult,
    });
  } catch (error: any) {
    return Response.json(
      {
        error: error.message || "Local test failed",
      },
      { status: 500 }
    );
  }
}