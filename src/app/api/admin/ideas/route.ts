import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const REQUIRED_STRING_FIELDS = [
  "name",
  "tagline",
  "logoEmoji",
  "category",
  "problem",
  "solution",
  "targetMarket",
  "tam",
  "businessModel",
  "pricing",
  "competitors",
  "goToMarket",
  "risks",
  "techStack",
] as const;

type IdeaPayload = {
  name: string;
  tagline: string;
  logoEmoji: string;
  category: string;
  problem: string;
  solution: string;
  targetMarket: string;
  tam: string;
  businessModel: string;
  pricing: string;
  competitors: string;
  goToMarket: string;
  financials: unknown;
  risks: string;
  techStack: string;
};

function validate(body: unknown): { ok: true; idea: IdeaPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  for (const f of REQUIRED_STRING_FIELDS) {
    if (typeof b[f] !== "string" || (b[f] as string).trim() === "") {
      return { ok: false, error: `missing or empty string field: ${f}` };
    }
  }
  if (b.financials === undefined || b.financials === null) {
    return { ok: false, error: "missing field: financials" };
  }
  return { ok: true, idea: b as IdeaPayload };
}

export async function POST(request: Request) {
  const authError = checkAdminAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const result = validate(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  const idea = result.idea;

  const financialsString =
    typeof idea.financials === "string"
      ? idea.financials
      : JSON.stringify(idea.financials);

  const insert = await db.insert(schema.ideas).values({
    name: idea.name,
    tagline: idea.tagline,
    category: idea.category,
    logoEmoji: idea.logoEmoji,
    problem: idea.problem,
    solution: idea.solution,
    targetMarket: idea.targetMarket,
    tam: idea.tam,
    businessModel: idea.businessModel,
    pricing: idea.pricing,
    competitors: idea.competitors,
    goToMarket: idea.goToMarket,
    financials: financialsString,
    risks: idea.risks,
    techStack: idea.techStack,
    status: "pending_judging",
  });

  const insertId = insert[0].insertId;
  const [created] = await db
    .select({
      id: schema.ideas.id,
      name: schema.ideas.name,
      status: schema.ideas.status,
    })
    .from(schema.ideas)
    .where(eq(schema.ideas.id, insertId))
    .limit(1);

  return Response.json(created, { status: 201 });
}
