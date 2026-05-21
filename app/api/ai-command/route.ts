import {
  updateTask,
} from "@/lib/operations/runtime-store";

export async function POST(
  req: Request
) {
  try {
    const body = await req.json();

    const command =
      body.command?.toLowerCase() || "";

    let result = null;

    // Example:
    // "mark task 1 complete"

    if (
      command.includes("complete")
    ) {
      result = updateTask(1, {
        status: "Completed",
      });
    }

    if (
      command.includes("partial")
    ) {
      result = updateTask(1, {
        status:
          "Partial Delivery",
      });
    }

    return Response.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error.message ||
          "AI command failed",
      },
      { status: 500 }
    );
  }
}