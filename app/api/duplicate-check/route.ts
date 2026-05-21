import {
  buildDuplicateKey,
  isDuplicateKey,
} from "@/lib/operations/duplicateDetector";

export async function POST(req: Request) {
  const body = await req.json();

  const key = buildDuplicateKey({
    type: body.type || "generic",
    client: body.client || "",
    location: body.location || "",
    reference: body.reference || "",
  });

  const duplicate = isDuplicateKey(key);

  return Response.json({
    success: true,
    duplicate,
    key,
  });
}