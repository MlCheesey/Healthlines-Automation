import { recordPO } from "@/lib/operations/poRecorder";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.po_number || !body.items || !Array.isArray(body.items)) {
      return Response.json(
        { error: "po_number and items[] are required" },
        { status: 400 }
      );
    }

    const result = recordPO({
      client: body.client || DEFAULT_CLIENT_ID,
      po_number: body.po_number,
      po_type: body.po_type || "Additional PO",
      location: body.location || "general",
      items: body.items,
      delivery_date: body.delivery_date,
      source_email_id: body.source_email_id,
      notes: body.notes,
    });

    return Response.json(result);
  } catch (error: any) {
    return Response.json(
      { error: error.message || "PO recording failed" },
      { status: 500 }
    );
  }
}