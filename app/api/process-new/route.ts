import { google } from "googleapis";
import { getProcessedEmailIds, markEmailProcessed } from "@/lib/operations/processedEmails";

export async function GET() {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10,
      q: "in:inbox",
    });

    const processed = getProcessedEmailIds();
    const messages = list.data.messages || [];
    const newMessages = messages.filter((m) => m.id && !processed.includes(m.id));

    const results = [];

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    for (const message of newMessages) {
      const latestRes = await fetch(`${baseUrl}/api/gmail/latest`);
      const latestData = await latestRes.json();

      if (!latestRes.ok) {
        results.push({ id: message.id, error: latestData.error });
        continue;
      }

      const analyzeRes = await fetch(`${baseUrl}/api/analyze-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combined_text: latestData.combined_text }),
      });

      const analysis = await analyzeRes.json();

      if (!analyzeRes.ok) {
        results.push({ id: message.id, error: analysis.error });
        continue;
      }

      const processRes = await fetch(`${baseUrl}/api/process-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysis),
      });

      const processResult = await processRes.json();

      if (message.id) markEmailProcessed(message.id);

      results.push({
        id: message.id,
        subject: latestData.subject,
        analysis,
        processResult,
      });
    }

    return Response.json({
      success: true,
      processed_count: results.length,
      results,
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Process new emails failed" },
      { status: 500 }
    );
  }
}