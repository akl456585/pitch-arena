import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InvestPanel } from "@/app/components/InvestPanel";
import { ShareButton } from "@/app/components/ShareButton";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [idea] = await db
    .select()
    .from(schema.ideas)
    .where(eq(schema.ideas.id, Number(id)))
    .limit(1);

  if (!idea || idea.status !== "active") return { title: "Not Found" };

  return {
    title: `${idea.name} — Pitch Arena`,
    description: idea.tagline,
    openGraph: {
      title: `${idea.logoEmoji} ${idea.name} — Score: ${(idea.overallScore || 0).toFixed(1)}/10`,
      description: idea.tagline,
      images: [`/api/og?id=${idea.id}`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${idea.logoEmoji} ${idea.name}`,
      description: idea.tagline,
      images: [`/api/og?id=${idea.id}`],
    },
  };
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  const color =
    value >= 7.5
      ? "bg-emerald-500"
      : value >= 5
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 text-zinc-400 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs w-6 text-right">{value}</span>
    </div>
  );
}

function JudgeCard({ judgement }: { judgement: typeof schema.judgements.$inferSelect }) {
  const avgScore =
    (judgement.innovation +
      judgement.feasibility +
      judgement.marketFit +
      judgement.scalability +
      judgement.xFactor) /
    5;

  const investColor =
    judgement.investOrPass === "invest"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20";

  return (
    <div className="border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold">{judgement.judgeName}</h3>
          <p className="text-xs text-zinc-500">{judgement.judgePersona}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded border ${investColor} uppercase`}>
          {judgement.investOrPass}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <ScoreBar label="Innovation" value={judgement.innovation} />
        <ScoreBar label="Feasibility" value={judgement.feasibility} />
        <ScoreBar label="Market Fit" value={judgement.marketFit} />
        <ScoreBar label="Scalability" value={judgement.scalability} />
        <ScoreBar label="X-Factor" value={judgement.xFactor} />
      </div>

      <p className="text-sm text-zinc-300 italic">&ldquo;{judgement.verdict}&rdquo;</p>

      {judgement.rebuttals && (
        <p className="text-xs text-zinc-500 mt-2 pl-3 border-l-2 border-zinc-700">
          {judgement.rebuttals}
        </p>
      )}

      <div className="mt-3 text-xs text-zinc-500">
        Avg: <span className="font-mono font-bold text-zinc-300">{avgScore.toFixed(1)}</span>/10
      </div>
    </div>
  );
}

function DeckSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
        {title}
      </h3>
      <p className="text-zinc-200 text-sm leading-relaxed">{content}</p>
    </div>
  );
}

export default async function IdeaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ideaId = Number(id);

  const [idea] = await db
    .select()
    .from(schema.ideas)
    .where(eq(schema.ideas.id, ideaId))
    .limit(1);

  if (!idea || idea.status !== "active") notFound();

  const judgements = await db
    .select()
    .from(schema.judgements)
    .where(eq(schema.judgements.ideaId, ideaId));

  const events = await db
    .select()
    .from(schema.marketEvents)
    .where(eq(schema.marketEvents.ideaId, ideaId));

  let financials: Record<string, string> = {};
  try {
    financials = JSON.parse(idea.financials);
  } catch {}

  const investCount = judgements.filter((j) => j.investOrPass === "invest").length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Back to Feed
        </Link>
        <ShareButton ideaId={idea.id} ideaName={idea.name} />
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <span className="text-5xl">{idea.logoEmoji}</span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{idea.name}</h1>
          <p className="text-zinc-400 mt-1">{idea.tagline}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
            <span className="px-2 py-0.5 bg-zinc-800 rounded-full">{idea.category}</span>
            {idea.overallScore !== null && (
              <span className="font-mono">Score: {idea.overallScore.toFixed(1)}/10</span>
            )}
            <span>
              {investCount}/{judgements.length} judges invest
            </span>
          </div>
        </div>
      </div>

      {/* Investment Panel */}
      <section className="mb-8">
        <InvestPanel ideaId={idea.id} />
      </section>

      {/* Pitch Deck */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>📋</span> Pitch Deck
        </h2>
        <div className="space-y-5 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <DeckSection title="Problem" content={idea.problem} />
          <DeckSection title="Solution" content={idea.solution} />
          <DeckSection title="Target Market" content={idea.targetMarket} />
          <DeckSection title="Market Size (TAM)" content={idea.tam} />
          <DeckSection title="Business Model" content={idea.businessModel} />
          <DeckSection title="Pricing" content={idea.pricing} />
          <DeckSection title="Competitors" content={idea.competitors} />
          <DeckSection title="Go-to-Market" content={idea.goToMarket} />
          <DeckSection title="Risks" content={idea.risks} />
          <DeckSection title="Tech Stack" content={idea.techStack} />

          {financials && Object.keys(financials).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Financial Projections
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(financials).map(([year, data]) => (
                  <div key={year} className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">{year}</p>
                    <p className="text-sm text-zinc-200">{String(data)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Judge Panel */}
      {judgements.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>⚖️</span> Judge Panel
          </h2>
          <div className="space-y-4">
            {judgements.map((j) => (
              <JudgeCard key={j.id} judgement={j} />
            ))}
          </div>
        </section>
      )}

      {/* Market Events */}
      {events.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>📰</span> Market Events
          </h2>
          <div className="space-y-2">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between border border-zinc-800 rounded-lg p-3 text-sm"
              >
                <span className="text-zinc-300">{e.eventText}</span>
                <span
                  className={`font-mono text-xs ${e.impactPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {e.impactPercent >= 0 ? "+" : ""}
                  {e.impactPercent}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
