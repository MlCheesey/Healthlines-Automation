import fs from "fs";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const filePath = url.searchParams.get("path");

  if (!filePath) {
    return Response.json(
      { error: "path required" },
      { status: 400 }
    );
  }

  if (!fs.existsSync(filePath)) {
    return Response.json(
      { error: "File not found" },
      { status: 404 }
    );
  }

  const file = fs.readFileSync(filePath);

  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filePath.split("\\").pop()}"`,
    },
  });
}