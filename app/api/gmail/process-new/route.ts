import { google } from "googleapis";
import {
  hasProcessedEmail,
  markEmailProcessed,
} from "@/lib/operations/workflowProtection";
import { internalFetch } from "@/lib/system/internalFetch";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

const ALLOWED_DOMAINS = [
  "davita.com",
  "davita.sa",
];

const ALLOWED_SENDERS = [
  "info.hlines@gmail.com",

  // Add exact DaVita sender emails here later if needed:
  // "procurement.person@davita.com",
];

function extractEmailAddress(value: string) {
  const raw = String(value || "").trim().toLowerCase();
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

function isAllowedSender(from: string) {
  const email = extractEmailAddress(from);
  const domain = email.split("@")[1] || "";

  return (
    ALLOWED_SENDERS.includes(email) ||
    ALLOWED_DOMAINS.some(
      (allowed) => domain === allowed || domain.endsWith(`.${allowed}`)
    )
  );
}

function pickEmailText(emailData: any) {
  const candidates = [
    emailData?.combined_text,
    emailData?.text,
    emailData?.body,
    emailData?.plainText,
    emailData?.snippet,
    emailData?.subject,
  ];

  return (
    candidates
      .map((v) => String(v || "").trim())
      .find((v) => v.length > 0) || ""
  );
}

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

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const allMessages: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const list: any = await gmail.users.messages.list({
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
        results.push({
          id: msg.id,
          error: emailData.error || "Failed to read email",
        });
        continue;
      }

      const from = emailData.from || emailData.sender || "";

      if (!isAllowedSender(from)) {
        results.push({
          id: msg.id,
          subject: emailData.subject || "",
          from,
          skipped: true,
          reason: "sender_not_allowed",
        });

        markEmailProcessed(msg.id);
        continue;
      }

      const safeText = pickEmailText(emailData);

      if (!safeText.trim()) {
        results.push({
          id: msg.id,
          subject: emailData.subject || "",
          from,
          skipped: true,
          reason: "empty_email_text",
        });

        markEmailProcessed(msg.id);
        continue;
      }

      const analyzeRes = await internalFetch("/api/analyze-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          combined_text: safeText,
          text: safeText,
          subject: emailData.subject || "",
          from,
          source_email_id: msg.id,
        }),
      });

      const analysis = await analyzeRes.json();

      if (!analyzeRes.ok) {
        results.push({
          id: msg.id,
          subject: emailData.subject || "",
          from,
          error: analysis.error || "Analyze email failed",
        });
        continue;
      }

      const processRes = await internalFetch("/api/process-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...analysis,
          source_email_id: msg.id,
          source_email_from: from,
        }),
      });

      const processResult = await processRes.json();

      if (processRes.ok) {
        markEmailProcessed(msg.id);
      }

      results.push({
        id: msg.id,
        subject: emailData.subject || "",
        from,
        analysis,
        processResult,
      });
    }

    const processed = results.filter((r: any) => !r.skipped && !r.error).length;
    const skipped = results.filter((r: any) => r.skipped).length;
    const errors = results.filter((r: any) => r.error).length;

    logSystemEvent(
      "gmail_process_new_completed",
      "Gmail processing completed",
      {
        checked: allMessages.length,
        processed,
        skipped,
        errors,
      }
    );

    return Response.json({
      success: true,
      checked: allMessages.length,
      processed,
      skipped,
      errors,
      results,
    });
  } catch (error: any) {
    logSystemError("gmail-process-new", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Process new Gmail emails failed",
      },
      { status: 500 }
    );
  }
}