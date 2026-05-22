import { google } from "googleapis";
import {
  hasProcessedEmail,
  markEmailProcessed,
} from "@/lib/operations/workflowProtection";
import { internalFetch } from "@/lib/system/internalFetch";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

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

    const allMessages: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const list: any= await gmail.users.messages.list({
        userId: "me",
        maxResults: 25,
        pageToken,
        q: "in:inbox newer_than:30d",
      });

      allMessages.push(...(list.data.messages || []));
      pageToken = list.data.nextPageToken || undefined;
    } while (pageToken && allMessages.length < 100);

    const results = [];

    for (const msg of allMessages) {
      if (!msg.id) continue;

      if (hasProcessedEmail(msg.id)) {
        results.push({
          id: msg.id,
          skipped: true,
          reason: "already_processed",
        });
        continue;
      }

      const readRes = await internalFetch(`/api/gmail/message/${msg.id}`);
      const emailData = await readRes.json();

      if (!readRes.ok) {
        results.push({ id: msg.id, error: emailData.error });
        continue;
      }

      const analyzeRes = await internalFetch("/api/analyze-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          combined_text: emailData.combined_text,
          source_email_id: msg.id,
        }),
      });

      const analysis = await analyzeRes.json();

      if (!analyzeRes.ok) {
        results.push({ id: msg.id, error: analysis.error });
        continue;
      }

      const processRes = await internalFetch("/api/process-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...analysis,
          source_email_id: msg.id,
        }),
      });

      const processResult = await processRes.json();

      if (processRes.ok) {
        markEmailProcessed(msg.id);
      }

      results.push({
        id: msg.id,
        subject: emailData.subject,
        analysis,
        processResult,
      });
    }

    logSystemEvent("gmail_process_new_completed", "Gmail processing completed", {
      checked: allMessages.length,
      processed: results.filter((r: any) => !r.skipped && !r.error).length,
      skipped: results.filter((r: any) => r.skipped).length,
    });

    return Response.json({
      success: true,
      checked: allMessages.length,
      results,
    });
  } catch (error: any) {
    logSystemError("gmail-process-new", error);

    return Response.json(
      { error: error.message || "Process new Gmail emails failed" },
      { status: 500 }
    );
  }
}