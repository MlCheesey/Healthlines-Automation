import {
  addLearningMemory,
  getLearningMemory,
} from "@/lib/ai/learningMemory";

export async function GET() {
  return Response.json({
    success: true,
    memory: getLearningMemory(),
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  const record = addLearningMemory({
    category: body.category || "general",
    rule: body.rule || "",
    example_input: body.example_input || "",
    correction: body.correction || "",
    notes: body.notes || "",
  });

  return Response.json({
    success: true,
    record,
  });
}