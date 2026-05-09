import { google } from "googleapis";
import * as XLSX from "xlsx";
import JSZip from "jszip";

function decodeBase64UrlToBuffer(data: string): Buffer {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function decodeBase64UrlToText(data: string): string {
  return decodeBase64UrlToBuffer(data).toString("utf8");
}

function extractBody(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) return decodeBase64UrlToText(payload.body.data);

  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64UrlToText(part.body.data);
      }
    }

    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return "";
}

function excelBufferToText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let text = "";

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    }) as any[][];

    text += `\nSHEET: ${sheetName}\n`;

    rows.forEach((row) => {
      text += row.map((cell) => String(cell)).join(" | ") + "\n";
    });
  });

  return text;
}

async function parseAttachmentFile(
  filename: string,
  buffer: Buffer
): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return excelBufferToText(buffer);
  }

  if (lower.endsWith(".txt")) {
    return buffer.toString("utf8");
  }

  if (lower.endsWith(".pdf")) {
    return "[PDF detected but PDF extraction not enabled yet]";
  }

  if (lower.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(buffer);
    let zipText = "";

    for (const fileName of Object.keys(zip.files)) {
      const file = zip.files[fileName];
      if (file.dir) continue;

      const fileBuffer = Buffer.from(await file.async("nodebuffer"));
      const innerText = await parseAttachmentFile(fileName, fileBuffer);

      zipText += `\n\nZIP FILE: ${fileName}\n${innerText}`;
    }

    return zipText;
  }

  return "";
}

export async function GET() {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID || "",
      process.env.GOOGLE_CLIENT_SECRET || "",
      process.env.GOOGLE_REDIRECT_URI || ""
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN || "",
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: 1,
      q: "in:inbox",
    });

    const messageId = listResponse.data.messages?.[0]?.id;

    if (!messageId) {
      return Response.json({ error: "No emails found" }, { status: 404 });
    }

    const safeMessageId = String(messageId);

    const messageResponse = await gmail.users.messages.get({
      userId: "me",
      id: safeMessageId,
      format: "full",
    });

    const payload = messageResponse.data.payload;
    const headers = payload?.headers || [];

    const subject =
      headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";

    const from =
      headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";

    const body = extractBody(payload);

    let attachmentsText = "";

    const attachments: {
      filename: string;
      type: string;
      text_length: number;
    }[] = [];

    async function processParts(parts: any[]): Promise<void> {
      for (const part of parts) {
        const filename = String(part.filename || "");
        const attachmentId = part.body?.attachmentId;

        if (filename && attachmentId) {
          const attachmentResponse: any =
            await gmail.users.messages.attachments.get({
              userId: "me",
              messageId: safeMessageId,
              id: String(attachmentId),
            });

          const attachmentData = attachmentResponse.data?.data as
            | string
            | undefined;

          if (attachmentData) {
            const buffer = decodeBase64UrlToBuffer(attachmentData);
            const extractedText = await parseAttachmentFile(filename, buffer);

            if (extractedText) {
              const lower = filename.toLowerCase();

              const type = lower.endsWith(".zip")
                ? "zip"
                : lower.endsWith(".pdf")
                ? "pdf"
                : lower.endsWith(".xlsx") || lower.endsWith(".xls")
                ? "excel"
                : lower.endsWith(".txt")
                ? "text"
                : "unknown";

              attachments.push({
                filename,
                type,
                text_length: extractedText.length,
              });

              attachmentsText += `\n\nFILE: ${filename}\n${extractedText}`;
            }
          }
        }

        if (Array.isArray(part.parts)) {
          await processParts(part.parts);
        }
      }
    }

    if (Array.isArray(payload?.parts)) {
      await processParts(payload.parts);
    }

    const combinedText = `SUBJECT:
${subject}

EMAIL BODY:
${body}

ATTACHMENTS:
${attachmentsText}`;

    return Response.json({
      from,
      subject,
      body,
      attachments,
      attachments_text: attachmentsText,
      combined_text: combinedText,
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Failed to fetch Gmail email" },
      { status: 500 }
    );
  }
}