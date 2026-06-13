import { google } from "googleapis";
import {
  hasProcessedEmail,
  markEmailProcessed,
} from "@/lib/operations/workflowProtection";
import { internalFetch } from "@/lib/system/internalFetch";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";
import { auditEmail } from "@/lib/operations/emailAudit";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";

const ALLOWED_DOMAINS = ["davita.com", "davita.sa"];

const ALLOWED_SENDERS = ["info.hlines@gmail.com"];

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

function safeLocation(value: any) {
  return (
    String(value || "general")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "general"
  );
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

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

      const msgId = String(msg.id);

      const alreadyProcessed = hasProcessedEmail(msgId);

      if (!force && alreadyProcessed) {
        results.push({
          id: msgId,
          skipped: true,
          reason: "already_processed",
        });
        continue;
      }

      const readRes = await internalFetch(`/api/gmail/message/${msgId}`);
      const emailData = await readRes.json();

      if (!readRes.ok) {
        auditEmail({
          client: DEFAULT_CLIENT_ID,
          location: "general",
          source_email_id: msgId,
          subject: "",
          from: "",
          status: "Error",
          workflow: "Gmail Intake",
          reason: emailData.error || "Failed to read email",
        });

        results.push({
          id: msgId,
          error: emailData.error || "Failed to read email",
        });

        markEmailProcessed(msgId);
        continue;
      }

      const from = emailData.from || emailData.sender || "";

      if (!isAllowedSender(from)) {
        results.push({
          id: msgId,
          subject: emailData.subject || "",
          from,
          skipped: true,
          reason: "sender_not_allowed",
        });

        markEmailProcessed(msgId);
        continue;
      }

      const safeText = pickEmailText(emailData);

      if (!safeText.trim()) {
        auditEmail({
          client: DEFAULT_CLIENT_ID,
          location: "general",
          source_email_id: msgId,
          subject: emailData.subject || "",
          from,
          status: "Needs Human Review",
          workflow: "Gmail Intake",
          reason: "Allowed email found, but no readable text was extracted.",
        });

        results.push({
          id: msgId,
          subject: emailData.subject || "",
          from,
          skipped: true,
          reason: "empty_email_text",
        });

        markEmailProcessed(msgId);
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
          source_email_id: msgId,
        }),
      });

      const analysis = await analyzeRes.json();

      if (!analyzeRes.ok) {
        auditEmail({
          client: DEFAULT_CLIENT_ID,
          location: "general",
          source_email_id: msgId,
          subject: emailData.subject || "",
          from,
          status: "Error",
          workflow: "Analyze Email",
          reason: analysis.error || "Analyze email failed",
        });

        results.push({
          id: msgId,
          subject: emailData.subject || "",
          from,
          error: analysis.error || "Analyze email failed",
        });

        markEmailProcessed(msgId);
        continue;
      }

      const processRes = await internalFetch("/api/process-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    ...analysis,
    force_process: force,
    already_processed_before_force: alreadyProcessed,
    source_email_id: msgId,
    source_email_from: from,
    subject: emailData.subject || "",
    from,
  }),
});

      const processResult = await processRes.json();

      if (processRes.ok) {
        markEmailProcessed(msgId);
      } else {
        auditEmail({
          client: analysis.client || DEFAULT_CLIENT_ID,
          location: safeLocation(analysis.location || "general"),
          source_email_id: msgId,
          subject: emailData.subject || "",
          from,
          email_type: analysis.email_type || "",
          status: "Error",
          reason: processResult.error || "Process email failed",
          workflow: "Process Email",
          confidence: analysis.confidence,
          delivery_date: analysis.delivery_date || "",
          po_numbers: analysis.po_numbers || analysis.po_number || "",
          dn_numbers: analysis.dn_numbers || "",
          mrn_numbers: analysis.mrn_numbers || "",
          recommended_action: analysis.recommended_action || "",
          notes: analysis.notes || "",
        });
      }

      results.push({
        id: msgId,
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
        force,
      }
    );

    return Response.json({
      success: true,
      checked: allMessages.length,
      processed,
      skipped,
      errors,
      force,
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