import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    DB_HOST: process.env.DB_HOST ? "set" : "MISSING",
    DB_PORT: process.env.DB_PORT || "MISSING",
    DB_USER: process.env.DB_USER ? "set" : "MISSING",
    DB_PASSWORD: process.env.DB_PASSWORD ? "set" : "MISSING",
    DB_NAME: process.env.DB_NAME || "MISSING",
  };

  try {
    const ideas = await db.select().from(schema.ideas).limit(1);
    return Response.json({
      status: "ok",
      env,
      dbConnected: true,
      ideaCount: ideas.length,
      sampleIdea: ideas[0]?.name || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({
      status: "error",
      env,
      dbConnected: false,
      error: message,
    }, { status: 500 });
  }
}
