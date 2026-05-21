import {
  updateTask,
} from "@/lib/operations/runtime-store";

export async function POST(
  req: Request
) {
  try {
    const body = await req.json();

    const updatedTask =
      updateTask(body.id, {
        status:
          body.status ||
          "Approved",
      });

    return Response.json({
      success: true,
      updatedTask,
    });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error.message ||
          "Approval execution failed",
      },
      { status: 500 }
    );
  }
}