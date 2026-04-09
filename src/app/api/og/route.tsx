import { ImageResponse } from "next/og";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ideaId = Number(searchParams.get("id"));

  if (!ideaId) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#09090b",
            color: "#fafafa",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 64 }}>🏟️</div>
          <div style={{ fontSize: 48, fontWeight: "bold", marginTop: 20 }}>
            Pitch Arena
          </div>
          <div style={{ fontSize: 24, color: "#a1a1aa", marginTop: 10 }}>
            AI Startup Ideas, Judged by AI
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const [idea] = db
    .select()
    .from(schema.ideas)
    .where(eq(schema.ideas.id, ideaId))
    .limit(1)
    .all();

  if (!idea) {
    return new Response("Not found", { status: 404 });
  }

  const judgements = db
    .select()
    .from(schema.judgements)
    .where(eq(schema.judgements.ideaId, ideaId))
    .all();

  const investCount = judgements.filter((j) => j.investOrPass === "invest").length;
  const scoreColor =
    (idea.overallScore || 0) >= 7.5
      ? "#34d399"
      : (idea.overallScore || 0) >= 5
        ? "#fbbf24"
        : "#f87171";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#09090b",
          color: "#fafafa",
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 32 }}>🏟️</span>
            <span style={{ fontSize: 20, color: "#a1a1aa" }}>Pitch Arena</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#18181b",
              padding: "8px 16px",
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 14, color: "#71717a" }}>SCORE</span>
            <span
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: scoreColor,
                fontFamily: "monospace",
              }}
            >
              {(idea.overallScore || 0).toFixed(1)}
            </span>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flex: 1 }}>
          <span style={{ fontSize: 80 }}>{idea.logoEmoji}</span>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 48, fontWeight: "bold", lineHeight: 1.1 }}>
              {idea.name}
            </div>
            <div style={{ fontSize: 24, color: "#a1a1aa", marginTop: 8 }}>
              {idea.tagline}
            </div>
            <div
              style={{
                fontSize: 18,
                color: "#71717a",
                marginTop: 16,
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                overflow: "hidden",
              }}
            >
              {idea.problem}
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid #27272a",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#18181b",
              padding: "8px 16px",
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 14, color: "#71717a" }}>{idea.category}</span>
          </div>
          <span style={{ fontSize: 16, color: "#a1a1aa" }}>
            {investCount}/{judgements.length} judges invest
          </span>
          <span style={{ fontSize: 16, color: "#a1a1aa" }}>
            💰 ${((idea.valuation || 1000) / 1000).toFixed(0)}K valuation
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
