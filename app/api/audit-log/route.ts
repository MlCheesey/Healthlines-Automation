export async function GET() {
  return Response.json({
    logs: [
      {
        timestamp:
          new Date().toISOString(),
        actor: "AI",
        action:
          "Created delivery proposal",
      },
      {
        timestamp:
          new Date().toISOString(),
        actor: "Human",
        action:
          "Approved delivery modification",
      },
    ],
  });
}