import { db, schema } from "@/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "latest";
  const limit = Math.min(Number(searchParams.get("limit") || 20), 50);
  const offset = Number(searchParams.get("offset") || 0);

  let query = db.select().from(schema.ideas);

  if (category) {
    const { eq } = await import("drizzle-orm");
    query = query.where(eq(schema.ideas.category, category)) as typeof query;
  }

  if (sort === "score") {
    query = query.orderBy(desc(schema.ideas.overallScore)) as typeof query;
  } else if (sort === "trending") {
    query = query.orderBy(desc(schema.ideas.totalInvested)) as typeof query;
  } else {
    query = query.orderBy(desc(schema.ideas.id)) as typeof query;
  }

  const ideas = await query.limit(limit).offset(offset);

  return Response.json({ ideas, count: ideas.length });
}
