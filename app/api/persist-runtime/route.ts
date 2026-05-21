import fs from "fs";
import path from "path";

export async function POST(
  req: Request
) {
  try {
    const body = await req.json();

    const persistPath =
      path.join(
        process.cwd(),
        "data",
        "runtime-backup.json"
      );

    fs.writeFileSync(
      persistPath,
      JSON.stringify(body, null, 2)
    );

    return Response.json({
      success: true,
      persistPath,
    });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error.message ||
          "Persistence failed",
      },
      { status: 500 }
    );
  }
}