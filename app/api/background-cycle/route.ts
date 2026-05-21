export async function GET() {
  try {
    return Response.json({
      success: true,
      cycles: [
        "gmail_scan",
        "mrn_watch",
        "invoice_cycle",
        "audit_cleanup",
      ],
      timestamp:
        new Date().toISOString(),
    });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error.message ||
          "Background cycle failed",
      },
      { status: 500 }
    );
  }
}