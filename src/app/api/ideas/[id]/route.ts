import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ideaId = Number(id);

  const [idea] = db
    .select()
    .from(schema.ideas)
    .where(eq(schema.ideas.id, ideaId))
    .limit(1)
    .all();

  if (!idea) {
    return Response.json({ error: "Idea not found" }, { status: 404 });
  }

  const judgements = db
    .select()
    .from(schema.judgements)
    .where(eq(schema.judgements.ideaId, ideaId))
    .all();

  const events = db
    .select()
    .from(schema.marketEvents)
    .where(eq(schema.marketEvents.ideaId, ideaId))
    .all();

  return Response.json({
    ...idea,
    financials: JSON.parse(idea.financials),
    judgements,
    marketEvents: events,
  });
}
