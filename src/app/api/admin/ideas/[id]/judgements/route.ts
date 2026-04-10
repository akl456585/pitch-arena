import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const AXIS_FIELDS = [
  "innovation",
  "feasibility",
  "marketFit",
  "scalability",
  "xFactor",
] as const;

type Verdict = {
  judgeName: string;
  judgePersona: string;
  innovation: number;
  feasibility: number;
  marketFit: number;
  scalability: number;
  xFactor: number;
  verdict: string;
  investOrPass: string;
  rebuttals: string | null;
};

function validateVerdicts(
  body: unknown
): { ok: true; verdicts: Verdict[] } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "body must be a JSON object" };
  }
  const judgements = (body as Record<string, unknown>).judgements;
  if (!Array.isArray(judgements)) {
    return { ok: false, error: "judgements must be an array" };
  }
  if (judgements.length !== 5) {
    return { ok: false, error: `expected 5 judgements, got ${judgements.length}` };
  }
  for (let i = 0; i < judgements.length; i++) {
    const j = judgements[i] as Record<string, unknown>;
    if (typeof j.judgeName !== "string" || j.judgeName.trim() === "") {
      return { ok: false, error: `judgement[${i}].judgeName missing` };
    }
    if (typeof j.judgePersona !== "string") {
      return { ok: false, error: `judgement[${i}].judgePersona missing` };
    }
    for (const axis of AXIS_FIELDS) {
      const v = j[axis];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 10) {
        return { ok: false, error: `judgement[${i}].${axis} must be integer 1-10` };
      }
    }
    if (typeof j.verdict !== "string" || j.verdict.trim() === "") {
      return { ok: false, error: `judgement[${i}].verdict missing` };
    }
    if (j.investOrPass !== "invest" && j.investOrPass !== "pass") {
      return {
        ok: false,
        error: `judgement[${i}].investOrPass must be "invest" or "pass"`,
      };
    }
    if (j.rebuttals !== null && typeof j.rebuttals !== "string") {
      return { ok: false, error: `judgement[${i}].rebuttals must be string or null` };
    }
  }
  return { ok: true, verdicts: judgements as Verdict[] };
}

function computeOverallScore(verdicts: Verdict[]): number {
  let sum = 0;
  for (const v of verdicts) {
    for (const axis of AXIS_FIELDS) {
      sum += v[axis];
    }
  }
  const avg = sum / (verdicts.length * AXIS_FIELDS.length);
  return Math.round(avg * 10) / 10;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = checkAdminAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const ideaId = Number(id);
  if (!Number.isInteger(ideaId) || ideaId <= 0) {
    return Response.json({ error: "invalid idea id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const result = validateVerdicts(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  const verdicts = result.verdicts;

  const [existing] = await db
    .select({
      id: schema.ideas.id,
      name: schema.ideas.name,
      status: schema.ideas.status,
    })
    .from(schema.ideas)
    .where(eq(schema.ideas.id, ideaId))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "idea not found" }, { status: 404 });
  }
  if (existing.status !== "pending_judging") {
    return Response.json(
      { error: `idea status is "${existing.status}", expected "pending_judging"` },
      { status: 409 }
    );
  }

  const overallScore = computeOverallScore(verdicts);

  await db.transaction(async (tx) => {
    await tx.insert(schema.judgements).values(
      verdicts.map((v) => ({
        ideaId,
        judgeName: v.judgeName,
        judgePersona: v.judgePersona,
        innovation: v.innovation,
        feasibility: v.feasibility,
        marketFit: v.marketFit,
        scalability: v.scalability,
        xFactor: v.xFactor,
        verdict: v.verdict,
        investOrPass: v.investOrPass,
        rebuttals: v.rebuttals,
      }))
    );
    await tx
      .update(schema.ideas)
      .set({ overallScore, status: "active" })
      .where(eq(schema.ideas.id, ideaId));
  });

  return Response.json(
    {
      id: ideaId,
      name: existing.name,
      overallScore,
      status: "active",
    },
    { status: 200 }
  );
}
