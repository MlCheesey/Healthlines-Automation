import { google } from "googleapis";

function getHeader(headers: any[] = [], name: string) {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

function decodeBase64Url(data = "") {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function extractText(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts?.length) {
    return payload.parts.map((part: any) => extractText(part)).join("\n");
  }

  return "";
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
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

    const msg = await gmail.users.messages.get({
      userId: "me",
      id: params.id,
      format: "full",
    });

    const payload = msg.data.payload;
    const headers = payload?.headers || [];

    const subject = getHeader(headers, "Subject");
    const from = getHeader(headers, "From");
    const date = getHeader(headers, "Date");
    const body = extractText(payload);

    return Response.json({
      success: true,
      id: params.id,
      subject,
      from,
      date,
      combined_text: `Subject: ${subject}\nFrom: ${from}\nDate: ${date}\n\n${body}`,
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Failed to read Gmail message" },
      { status: 500 }
    );
  }
}