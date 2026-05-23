 import { testTallyConnection } from "@/lib/tally/tallyClient";

export async function GET() {
  try {
    const raw = await testTallyConnection();

    return Response.json({
      success: true,
      connected: true,
      raw,
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        connected: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}