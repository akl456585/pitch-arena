import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = checkAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 10), 50);

  const ideas = await db
    .select()
    .from(schema.ideas)
    .where(eq(schema.ideas.status, "pending_judging"))
    .orderBy(asc(schema.ideas.id))
    .limit(limit);

  return Response.json(ideas);
}
