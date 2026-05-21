import {
  getAttachments,
} from "@/lib/system/attachmentRegistry";

export async function GET() {
  return Response.json({
    success: true,
    rows: getAttachments(),
  });
}