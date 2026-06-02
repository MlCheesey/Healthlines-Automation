import { google } from "googleapis";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import * as pdfParse from "pdf-parse";

function getGmailClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail OAuth env values are missing");
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return google.gmail({
    version: "v1",
    auth: oauth2Client,
  });
}

function decodeBase64UrlToBuffer(data: string): Buffer {
  return Buffer.from(
    String(data || "")
      .replace(/-/g, "+")
      .replace(/_/g, "/"),
    "base64"
  );
}

function decodeBase64UrlToText(data: string): string {
  return decodeBase64UrlToBuffer(data).toString("utf8");
}

function getHeader(headers: any[], name: string) {
  return (
    headers.find(
      (h) => String(h.name || "").toLowerCase() === name.toLowerCase()
    )?.value || ""
  );
}

function extractBody(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return decodeBase64UrlToText(payload.body.data);
  }

  if (Array.isArray(payload.parts)) {
    const plainPart = payload.parts.find(
      (part: any) => part.mimeType === "text/plain" && part.body?.data
    );

    if (plainPart?.body?.data) {
      return decodeBase64UrlToText(plainPart.body.data);
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
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    }) as any[][];

    parts.push(`\n--- Sheet: ${sheetName} ---`);

    for (const row of rows) {
      parts.push(row.map((cell) => String(cell ?? "")).join(" | "));
    }
  }

  return parts.join("\n");
}

async function pdfBufferToText(buffer: Buffer): Promise<string> {
  try {
    const parsed = await (pdfParse as any)(buffer);
    return parsed?.text || "";
  } catch (error: any) {
    return `[PDF detected but text extraction failed: ${
      error?.message || String(error)
    }]`;
  }
}

async function parseAttachmentBuffer(
  filename: string,
  buffer: Buffer
): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return excelBufferToText(buffer);
  }

  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    return buffer.toString("utf8");
  }

  if (lower.endsWith(".pdf")) {
    return await pdfBufferToText(buffer);
  }

  if (lower.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(buffer);
    const parts: string[] = [];

    for (const fileName of Object.keys(zip.files)) {
      const file = zip.files[fileName];

      if (file.dir) continue;

      const innerBuffer = Buffer.from(await file.async("nodebuffer"));
      const innerText = await parseAttachmentBuffer(fileName, innerBuffer);

      parts.push(`\n\n--- ZIP FILE: ${fileName} ---\n${innerText}`);
    }

    return parts.join("\n");
  }

  return "";
}

function attachmentType(filename: string) {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".zip")) return "zip";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "excel";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".txt")) return "text";

  return "unknown";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const gmail = getGmailClient();

    const response = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });

    const message = response.data;
    const payload = message.payload;
    const headers = payload?.headers || [];

    const subject = getHeader(headers, "subject");
    const from = getHeader(headers, "from");
    const to = getHeader(headers, "to");
    const date = getHeader(headers, "date");

    const body = extractBody(payload);

    const attachments: {
      filename: string;
      type: string;
      text_length: number;
      parser_status: "parsed" | "empty" | "failed";
    }[] = [];

    const attachmentTextParts: string[] = [];

    async function processParts(parts: any[]): Promise<void> {
      for (const part of parts) {
        const filename = String(part.filename || "").trim();
        const attachmentId = part.body?.attachmentId;

        if (filename && attachmentId) {
          try {
            const attachmentResponse =
              await gmail.users.messages.attachments.get({
                userId: "me",
                messageId: id,
                id: String(attachmentId),
              });

            const attachmentData = attachmentResponse.data?.data;

            if (attachmentData) {
              const buffer = decodeBase64UrlToBuffer(String(attachmentData));
              const extractedText = await parseAttachmentBuffer(
                filename,
                buffer
              );

              attachments.push({
                filename,
                type: attachmentType(filename),
                text_length: extractedText.length,
                parser_status: extractedText ? "parsed" : "empty",
              });

              if (extractedText) {
                attachmentTextParts.push(
                  `\n\nFILE: ${filename}\n${extractedText}`
                );
              }
            }
          } catch (error: any) {
            attachments.push({
              filename,
              type: attachmentType(filename),
              text_length: 0,
              parser_status: "failed",
            });

            attachmentTextParts.push(
              `\n\nFILE: ${filename}\n[Attachment parsing failed: ${
                error?.message || String(error)
              }]`
            );
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

    const attachmentsText = attachmentTextParts.join("\n");

    const combinedText = `SUBJECT:
${subject}

FROM:
${from}

DATE:
${date}

EMAIL BODY:
${body}

ATTACHMENTS:
${attachmentsText}`;

    return Response.json({
      success: true,
      id,
      from,
      to,
      subject,
      date,
      body,
      snippet: message.snippet || "",
      attachments,
      attachments_text: attachmentsText,
      combined_text: combinedText,
      raw_message_id: message.id,
      thread_id: message.threadId,
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}