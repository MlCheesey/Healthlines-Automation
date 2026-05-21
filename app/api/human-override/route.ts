import { appendMasterRow } from "@/lib/operations/masterWorkbook";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.client) {
      return Response.json(
        { error: "client required" },
        { status: 400 }
      );
    }

    const override = {
      client: body.client,
      location: body.location || "",
      override_type:
        body.override_type || "General",
      target:
        body.target || "",
      previous_value:
        body.previous_value || "",
      new_value:
        body.new_value || "",
      reason:
        body.reason || "",
      approved_by:
        body.approved_by || "human",
      created_at:
        new Date().toISOString(),
    };

    appendMasterRow(
      body.client,
      "Human_Overrides",
      override
    );

    return Response.json({
      success: true,
      override,
    });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error.message ||
          "Human override failed",
      },
      { status: 500 }
    );
  }
}