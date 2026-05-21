export async function POST(req: Request) {
  try {
    const body = await req.json();

    const type = body.type || "general";

    let draft = "";

    if (type === "delivery") {
      draft = `
Dear Team,

Please note that the delivery is scheduled as discussed.

Best regards,
HealthLines Medical
`;
    }

    if (type === "invoice") {
      draft = `
Dear Team,

Please find attached the invoice summary and supporting documents.

Best regards,
HealthLines Medical
`;
    }

    return Response.json({
      success: true,
      draft,
    });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error.message ||
          "Draft generation failed",
      },
      { status: 500 }
    );
  }
}