import { parseAttachmentFile } from "@/lib/attachments/attachmentParser";
import { blockDevRoute, devToolsAllowed } from "@/lib/system/devGuard";

export async function POST(req: Request) {
  if (!devToolsAllowed()) {
    return blockDevRoute();
  }

  const body = await req.json();

  if (!body.filePath) {
    return Response.json(
      { error: "filePath is required" },
      { status: 400 }
    );
  }

  const result = await parseAttachmentFile(body.filePath);

  return Response.json({
    success: true,
    result,
  });
}