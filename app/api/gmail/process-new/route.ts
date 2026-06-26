import { google } from "googleapis";
import {
  hasProcessedEmail,
  markEmailProcessed,
} from "@/lib/operations/workflowProtection";
import { internalFetch } from "@/lib/system/internalFetch";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";
import { auditEmail } from "@/lib/operations/emailAudit";
import { appendMasterRow } from "@/lib/operations/masterWorkbook";
import { appendRowToSheet } from "@/lib/operations/storage";
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

function attachmentPath(attachment: any) {
  return (
    attachment?.filePath ||
    attachment?.path ||
    attachment?.local_path ||
    attachment?.saved_path ||
    attachment?.download_path ||
    attachment?.absolute_path ||
    ""
  );
}

function attachmentName(attachment: any) {
  return (
    attachment?.filename ||
    attachment?.name ||
    attachment?.original_name ||
    attachmentPath(attachment).split("\\").pop() ||
    attachmentPath(attachment).split("/").pop() ||
    "attachment"
  );
}

function getAttachments(emailData: any) {
  const candidates = [
    emailData?.attachments,
    emailData?.attachment_paths,
    emailData?.files,
    emailData?.downloaded_attachments,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

async function analyzeAttachmentsForEmail({
  emailData,
  msgId,
  from,
}: {
  emailData: any;
  msgId: string;
  from: string;
}) {
  const attachments = getAttachments(emailData);
  const analyzedAttachments: any[] = [];
  const attachmentTextParts: string[] = [];

  for (const attachment of attachments) {
    const filePath =
      typeof attachment === "string" ? attachment : attachmentPath(attachment);

    if (!filePath) {
      analyzedAttachments.push({
        filename: attachmentName(attachment),
        skipped: true,
        reason:
          "Attachment metadata exists, but no local file path was available for parsing.",
      });
      continue;
    }

    const res = await internalFetch("/api/analyze-attachment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filePath,
        source_email_id: msgId,
      }),
    });

    const data = await res.json();

    analyzedAttachments.push({
      filename: attachmentName(attachment),
      filePath,
      success: res.ok && data.success,
      ...data,
    });

    if (data?.extracted_text) {
      attachmentTextParts.push(
        `\n\n--- Attachment: ${attachmentName(attachment)} ---\n${data.extracted_text}`
      );
    }

    if (data?.structured?.human_required) {
      const row = {
        client: DEFAULT_CLIENT_ID,
        location: safeLocation(data.structured?.possible_locations?.[0] || "general"),
        source_email_id: msgId,
        subject: emailData.subject || "",
        from,
        email_type: "Attachment Review",
        action_type: "Attachment Needs Human Review",
        pending_action:
          data.structured.recommended_action ||
          "Review scanned attachment manually",
        status: "Open",
        human_required: true,
        po_numbers: (data.structured.po_numbers || []).join(", "),
        dn_numbers: (data.structured.dn_numbers || []).join(", "),
        mrn_numbers: (data.structured.mrn_numbers || []).join(", "),
        reason: (data.structured.review_reasons || []).join(", "),
        notes: `Attachment: ${attachmentName(attachment)}`,
      };

      appendRowToSheet(
        DEFAULT_CLIENT_ID,
        row.location,
        "Pending_Actions",
        row
      );

      appendMasterRow(DEFAULT_CLIENT_ID, "Pending_Actions", row);
    }
  }

  return {
    analyzedAttachments,
    attachmentText: attachmentTextParts.join("\n"),
  };
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

      const baseText = pickEmailText(emailData);

      const attachmentAnalysis = await analyzeAttachmentsForEmail({
        emailData,
        msgId,
        from,
      });

      const safeText = [baseText, attachmentAnalysis.attachmentText]
        .filter((part) => String(part || "").trim())
        .join("\n\n");

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
          attachments: attachmentAnalysis.analyzedAttachments,
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
          attachment_count: attachmentAnalysis.analyzedAttachments.length,
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
          attachments: attachmentAnalysis.analyzedAttachments,
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
          attachment_count: attachmentAnalysis.analyzedAttachments.length,
          attachment_results: attachmentAnalysis.analyzedAttachments,
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
        attachments: attachmentAnalysis.analyzedAttachments,
        analysis,
        processResult,
      });
    }

    const processed = results.filter((r: any) => !r.skipped && !r.error).length;
    const skipped = results.filter((r: any) => r.skipped).length;
    const errors = results.filter((r: any) => r.error).length;
    const attachments_checked = results.reduce(
      (sum: number, row: any) => sum + (row.attachments?.length || 0),
      0
    );

    logSystemEvent(
      "gmail_process_new_completed",
      "Gmail processing completed",
      {
        checked: allMessages.length,
        processed,
        skipped,
        errors,
        force,
        attachments_checked,
      }
    );

    return Response.json({
      success: true,
      checked: allMessages.length,
      processed,
      skipped,
      errors,
      force,
      attachments_checked,
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