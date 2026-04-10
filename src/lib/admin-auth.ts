import { timingSafeEqual } from "node:crypto";

export function checkAdminAuth(request: Request): Response | null {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return Response.json(
      { error: "ADMIN_TOKEN not configured on server" },
      { status: 500 }
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) {
    return Response.json({ error: "missing bearer token" }, { status: 401 });
  }

  const provided = header.slice(prefix.length);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "invalid token" }, { status: 401 });
  }

  return null;
}
