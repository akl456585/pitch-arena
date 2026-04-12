import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ideaId = Number(id);

  const [idea] = await db
    .select()
    .from(schema.ideas)
    .where(eq(schema.ideas.id, ideaId))
    .limit(1);

  if (!idea || idea.status !== "active") {
    return Response.json({ error: "Idea not found" }, { status: 404 });
  }

  const judgements = await db
    .select()
    .from(schema.judgements)
    .where(eq(schema.judgements.ideaId, ideaId));

  const events = await db
    .select()
    .from(schema.marketEvents)
    .where(eq(schema.marketEvents.ideaId, ideaId));

  let financials: unknown = {};
  try {
    financials = JSON.parse(idea.financials);
  } catch {}

  return Response.json({
    ...idea,
    financials,
    judgements,
    marketEvents: events,
  });
}
