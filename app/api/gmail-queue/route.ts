import {
  addToGmailQueue,
  getGmailQueue,
  updateGmailQueue,
} from "@/lib/gmail/gmailQueue";

export async function GET() {
  return Response.json({
    success: true,
    queue: getGmailQueue(),
  });
}

export async function POST(
  req: Request
) {
  const body = await req.json();

  const record =
    addToGmailQueue({
      client:
        body.client || "",
      package_id:
        body.package_id || "",
      subject:
        body.subject || "",
      body:
        body.body || "",
      recipient:
        body.recipient || "",
      attachments:
        body.attachments || [],
    });

  return Response.json({
    success: true,
    record,
  });
}

export async function PATCH(
  req: Request
) {
  const body = await req.json();

  if (!body.id) {
    return Response.json(
      {
        error:
          "Queue id required",
      },
      { status: 400 }
    );
  }

  const updated =
    updateGmailQueue(
      body.id,
      body.updates || {}
    );

  return Response.json({
    success: true,
    updated,
  });
}