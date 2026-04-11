import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 7.5
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : score >= 5
        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
        : "bg-red-500/20 text-red-400 border-red-500/30";

  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

function IdeaCard({ idea }: { idea: typeof schema.ideas.$inferSelect }) {
  return (
    <Link
      href={`/idea/${idea.id}`}
      className="block border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 hover:bg-zinc-900/50 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{idea.logoEmoji}</span>
          <div>
            <h2 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
              {idea.name}
            </h2>
            <p className="text-sm text-zinc-400">{idea.tagline}</p>
          </div>
        </div>
        {idea.overallScore !== null && <ScoreBadge score={idea.overallScore} />}
      </div>

      <p className="mt-3 text-sm text-zinc-300 line-clamp-2">{idea.problem}</p>

      <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
        <span className="px-2 py-0.5 bg-zinc-800 rounded-full">{idea.category}</span>
        <span>
          💰 ${((idea.valuation || 1000) / 1000).toFixed(0)}K valuation
        </span>
        <span>📊 ${((idea.totalInvested || 0) / 1000).toFixed(0)}K invested</span>
      </div>
    </Link>
  );
}

export default async function Home() {
  const ideas = await db
    .select()
    .from(schema.ideas)
    .where(eq(schema.ideas.status, "active"))
    .orderBy(desc(schema.ideas.id))
    .limit(20);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Latest Pitches</h1>
        <p className="text-zinc-400">
          AI-generated startup ideas, judged by a panel of AI personalities.
        </p>
      </div>

      {ideas.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-5xl mb-4">🏟️</p>
          <p className="text-lg font-medium">No pitches yet</p>
          <p className="text-sm mt-1">
            The generator runs every 2 hours — fresh ideas on the way.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
}
