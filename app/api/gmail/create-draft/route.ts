import fs from "fs";
import path from "path";
import { google } from "googleapis";

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createMimeMessage({
  to,
  subject,
  body,
  attachments = [],
}: {
  to: string;
  subject: string;
  body: string;
  attachments?: string[];
}) {
  const boundary = `healthlines_${Date.now()}`;

  const lines: string[] = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    body,
    "",
  ];

  for (const filePath of attachments) {
    if (!fs.existsSync(filePath)) continue;

    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const encoded = fileBuffer.toString("base64");

    lines.push(
      `--${boundary}`,
      `Content-Type: application/octet-stream; name="${fileName}"`,
      `Content-Disposition: attachment; filename="${fileName}"`,
      `Content-Transfer-Encoding: base64`,
      "",
      encoded,
      ""
    );
  }

  lines.push(`--${boundary}--`);

  return base64Url(lines.join("\r\n"));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const raw = createMimeMessage({
      to: body.to,
      subject: body.subject,
      body: body.body,
      attachments: body.attachments || [],
    });

    const draft = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw,
        },
      },
    });

    return Response.json({
      success: true,
      draft_id: draft.data.id,
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Gmail draft creation failed" },
      { status: 500 }
    );
  }
}