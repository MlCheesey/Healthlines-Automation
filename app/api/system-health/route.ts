export async function GET() {
  return Response.json({
    status: "healthy",
    systems: {
      gmail: true,
      ai: true,
      dashboard: true,
      workflow_engine: true,
      approvals: true,
      invoices: true,
    },
    checked_at:
      new Date().toISOString(),
  });
}