import path from "path";
import dotenv from "dotenv";
import { google } from "googleapis";
import { NextResponse } from "next/server";

dotenv.config({
  path: path.join(process.cwd(), ".env.local"),
});

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return Response.json(
      {
        success: false,
        error: "Missing Google OAuth env values",
        has_client_id: Boolean(clientId),
        has_client_secret: Boolean(clientSecret),
        has_redirect_uri: Boolean(redirectUri),
      },
      { status: 500 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
    ],
  });

  return NextResponse.redirect(url);
}