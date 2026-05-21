import { getLearningMemory } from "@/lib/ai/learningMemory";

export async function GET() {
  const memory = getLearningMemory();

  const grouped: Record<string, number> = {};

  for (const row of memory) {
    const category = row.category || "general";
    grouped[category] = (grouped[category] || 0) + 1;
  }

  return Response.json({
    success: true,
    total: memory.length,
    grouped,
    latest: memory.slice(0, 10),
  });
}