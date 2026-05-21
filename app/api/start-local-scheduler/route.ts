export async function GET() {
  return Response.json(
    {
      success: false,
      disabled: true,
      message:
        "Manual scheduler start is disabled. Use npm run worker for real automation.",
    },
    { status: 410 }
  );
}