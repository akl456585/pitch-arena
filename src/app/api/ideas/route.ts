import { db, schema } from "@/db";
import { and, count, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "latest";
  const limit = Math.min(Number(searchParams.get("limit") || 20), 50);
  const offset = Number(searchParams.get("offset") || 0);

  const activeFilter = eq(schema.ideas.status, "active");
  const whereClause = category
    ? and(activeFilter, eq(schema.ideas.category, category))
    : activeFilter;

  let query = db.select().from(schema.ideas);
  query = query.where(whereClause) as typeof query;

  if (sort === "score") {
    query = query.orderBy(desc(schema.ideas.overallScore)) as typeof query;
  } else if (sort === "trending") {
    query = query.orderBy(desc(schema.ideas.totalInvested)) as typeof query;
  } else {
    query = query.orderBy(desc(schema.ideas.id)) as typeof query;
  }

  const [ideas, [{ total }]] = await Promise.all([
    query.limit(limit).offset(offset),
    db.select({ total: count() }).from(schema.ideas).where(whereClause),
  ]);

  return Response.json({ ideas, count: total });
}
