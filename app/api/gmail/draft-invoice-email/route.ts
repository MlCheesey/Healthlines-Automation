export async function POST(req: Request) {
  try {
    const body = await req.json();

    return Response.json({
      success: true,
      mode: "draft_preview_only",
      subject: body.subject || "Invoice Submission",
      body:
        body.body ||
        `Dear Team,

Please find attached the invoice package for your review and processing.

Best regards,
HealthLines Medical Supply Co.`,
      attachments_to_include: body.attachments || [],
      note: "Actual Gmail attachment draft creation will be completed after deployment/storage decision.",
    });
  } catch (error: any) {
    return Response.json({ error: error.message || "Draft invoice email failed" }, { status: 500 });
  }
}