import { cookies } from "next/headers";

export async function POST(req: Request) {
  const body = await req.json();

  const allowedUser = process.env.HEALTHLINES_LOGIN_USER || "";
  const allowedPassword = process.env.HEALTHLINES_LOGIN_PASSWORD || "";

  if (!allowedUser || !allowedPassword) {
    return Response.json(
      { error: "Login credentials are not configured." },
      { status: 500 }
    );
  }

  if (body.username !== allowedUser || body.password !== allowedPassword) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const cookieStore = await cookies();

  cookieStore.set("healthlines_auth", "logged_in", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 10,
  });

  return Response.json({ success: true });
}