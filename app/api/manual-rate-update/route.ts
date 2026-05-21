import { appendMasterRow } from "@/lib/operations/masterWorkbook";
import { updateDeliveryRate } from "@/lib/operations/updateDeliveryRate";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (
      !body.client ||
      !body.location ||
      !body.dn_number ||
      !body.item_name ||
      body.rate === undefined
    ) {
      return Response.json(
        {
          error: "client, location, dn_number, item_name and rate are required",
        },
        { status: 400 }
      );
    }

    const rate = Number(body.rate);

    if (Number.isNaN(rate) || rate < 0) {
      return Response.json(
        {
          error: "rate must be a valid number",
        },
        { status: 400 }
      );
    }

    const updateResult = updateDeliveryRate({
      client: body.client,
      location: body.location,
      dn_number: body.dn_number,
      item_name: body.item_name,
      rate,
    });

    appendMasterRow(body.client, "Pending_Actions", {
      client: body.client,
      location: body.location,
      dn_number: body.dn_number,
      item_name: body.item_name,
      rate,
      action_type: "Manual Unit Rate Filled",
      status: "Completed",
      notes: "Unit rate manually entered for invoice generation.",
    });

    return Response.json({
      success: true,
      message: "Manual rate updated. Invoice can be regenerated.",
      updateResult,
    });
  } catch (error: any) {
    return Response.json(
      {
        error: error.message || "Manual rate update failed",
      },
      { status: 500 }
    );
  }
}