import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "No code provided" },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    return NextResponse.json({
      message: "Gmail connected",
      refresh_token: tokens.refresh_token || null,
      access_token: "received",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "OAuth failed",
      },
      { status: 500 }
    );
  }
}