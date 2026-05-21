export async function POST() {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const gmailRes = await fetch(`${baseUrl}/api/gmail/latest`);

    const gmailData = await gmailRes.json();

    if (!gmailRes.ok) {
      return Response.json(gmailData, { status: gmailRes.status });
    }

    const analyzeRes = await fetch(`${baseUrl}/api/analyze-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        combined_text: gmailData.combined_text,
      }),
    });

    const analysis = await analyzeRes.json();

    if (!analyzeRes.ok) {
      return Response.json(analysis, { status: analyzeRes.status });
    }

    const processRes = await fetch(`${baseUrl}/api/process-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(analysis),
    });

    const processResult = await processRes.json();

    if (!processRes.ok) {
      return Response.json(processResult, { status: processRes.status });
    }

    return Response.json({
      success: true,
      gmail: {
        from: gmailData.from,
        subject: gmailData.subject,
        attachments: gmailData.attachments,
      },
      analysis,
      process_result: processResult,
    });
  } catch (error: any) {
    return Response.json(
      {
        error: error.message || "Run latest email failed",
      },
      { status: 500 }
    );
  }
}