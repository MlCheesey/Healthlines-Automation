export function devToolsAllowed() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.DEV_TOOLS_ENABLED === "true"
  );
}

export function blockDevRoute() {
  return Response.json(
    {
      error: "This test route is disabled in production.",
    },
    { status: 403 }
  );
}