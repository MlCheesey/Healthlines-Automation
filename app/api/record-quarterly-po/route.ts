import { recordPO } from "@/lib/operations/poRecorder";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.po_number || !Array.isArray(body.locations)) {
      return Response.json(
        { error: "po_number and locations[] are required" },
        { status: 400 }
      );
    }

    const client = body.client || DEFAULT_CLIENT_ID;
    const results = [];

    for (const locationBlock of body.locations) {
      const location = locationBlock.location || "general";
      const items = Array.isArray(locationBlock.items)
        ? locationBlock.items
        : [];

      if (items.length === 0) {
        results.push({
          location,
          skipped: true,
          reason: "No items found for this location",
        });
        continue;
      }

      const result = recordPO({
        client,
        po_number: body.po_number,
        po_type: "Quarterly PO",
        location,
        items,
        delivery_date: locationBlock.delivery_date || body.delivery_date || "",
        source_email_id: body.source_email_id || "",
        notes: body.notes || "Quarterly PO split by location",
      });

      results.push(result);
    }

    return Response.json({
      success: true,
      client,
      po_number: body.po_number,
      total_locations_received: body.locations.length,
      locations_processed: results.filter((r: any) => !r.skipped).length,
      locations_skipped: results.filter((r: any) => r.skipped).length,
      results,
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Quarterly PO recording failed" },
      { status: 500 }
    );
  }
}