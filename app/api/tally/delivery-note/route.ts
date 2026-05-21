import { recordDeliveryNote } from "@/lib/operations/deliveryRecorder";

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-bridge-key");

    if (apiKey !== process.env.TALLY_BRIDGE_KEY) {
      return Response.json({ error: "Unauthorized bridge request" }, { status: 401 });
    }

    const body = await req.json();

    if (!body.client || !body.location || !body.po_number || !body.dn_number || !body.dn_date) {
      return Response.json(
        { error: "client, location, po_number, dn_number, and dn_date are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return Response.json({ error: "lines[] is required" }, { status: 400 });
    }

    const result = recordDeliveryNote({
      client: body.client,
      location: body.location,
      po_number: body.po_number,
      dn_number: body.dn_number,
      dn_date: body.dn_date,
      mrn_number: body.mrn_number || "",
      lines: body.lines,
      remarks: body.remarks || "Imported from Tally bridge",
    });

    return Response.json({
      success: true,
      source: "tally_bridge",
      result,
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Tally delivery note import failed" },
      { status: 500 }
    );
  }
}