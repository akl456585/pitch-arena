/**
 * Generates a startup idea + pitch deck + judge evaluations using Claude Code CLI.
 * Run: npx tsx src/scripts/generate-idea.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { execSync } from "child_process";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { JUDGES } from "../lib/judges";

const CATEGORIES = [
  "SaaS", "Consumer", "Marketplace", "Fintech", "Health", "Education",
  "Creator Tools", "Developer Tools", "AI/ML", "Hardware Concept",
  "Social", "Gaming", "Sustainability", "Food & Beverage", "Weird/Experimental",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function callClaude(prompt: string): string {
  const output = execSync(
    `claude -p ${JSON.stringify(prompt)} --output-format json`,
    { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024, timeout: 120_000 }
  );

  try {
    const parsed = JSON.parse(output);
    return parsed.result || parsed.content || output;
  } catch {
    return output;
  }
}

function extractJSON(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error("No JSON found in response: " + text.slice(0, 200));
  }
  return JSON.parse(jsonMatch[1]);
}

async function generateIdea(): Promise<void> {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const db = drizzle(connection, { schema, mode: "default" });

  const category = pickRandom(CATEGORIES);
  console.log(`Generating idea in category: ${category}`);

  const ideaPrompt = `You are a startup idea generator for an app called "Pitch Arena". Generate a creative, specific startup idea in the "${category}" category.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "name": "Startup Name",
  "tagline": "One catchy sentence",
  "logoEmoji": "single emoji representing this startup",
  "category": "${category}",
  "problem": "2-3 sentences describing the pain point",
  "solution": "2-3 sentences describing the product/service",
  "targetMarket": "Who is this for? Be specific.",
  "tam": "Total addressable market estimate with reasoning",
  "businessModel": "How it makes money",
  "pricing": "Specific pricing tiers or structure",
  "competitors": "Who else is in this space and how this differs",
  "goToMarket": "How to acquire the first 1,000 users",
  "financials": {"year1": "revenue/cost estimate", "year2": "revenue/cost estimate", "year3": "revenue/cost estimate"},
  "risks": "Top 2-3 risks that could kill this",
  "techStack": "Recommended tech stack to build this"
}

Be creative and specific. Mix realistic viable ideas with occasional wild moonshots. Make the name memorable.`;

  const ideaResponse = callClaude(ideaPrompt);
  const idea = extractJSON(ideaResponse);
  console.log(`Generated idea: ${idea.name}`);

  // Insert idea into database
  const result = await db.insert(schema.ideas).values({
    name: idea.name as string,
    tagline: idea.tagline as string,
    category: idea.category as string,
    logoEmoji: idea.logoEmoji as string,
    problem: idea.problem as string,
    solution: idea.solution as string,
    targetMarket: idea.targetMarket as string,
    tam: idea.tam as string,
    businessModel: idea.businessModel as string,
    pricing: idea.pricing as string,
    competitors: idea.competitors as string,
    goToMarket: idea.goToMarket as string,
    financials: JSON.stringify(idea.financials),
    risks: idea.risks as string,
    techStack: idea.techStack as string,
  });

  const insertId = result[0].insertId;
  const [insertedIdea] = await db
    .select()
    .from(schema.ideas)
    .where(eq(schema.ideas.id, insertId))
    .limit(1);

  console.log(`Inserted idea #${insertedIdea.id}: ${insertedIdea.name}`);

  // Generate judge evaluations
  console.log("Generating judge evaluations...");

  for (const judge of JUDGES) {
    const judgePrompt = `You are ${judge.name}, a startup judge with this personality: ${judge.persona}

You're evaluating this startup pitch:
- Name: ${idea.name}
- Tagline: ${idea.tagline}
- Problem: ${idea.problem}
- Solution: ${idea.solution}
- Target Market: ${idea.targetMarket}
- TAM: ${idea.tam}
- Business Model: ${idea.businessModel}
- Pricing: ${idea.pricing}
- Competitors: ${idea.competitors}
- Go-to-Market: ${idea.goToMarket}
- Financials: ${JSON.stringify(idea.financials)}
- Risks: ${idea.risks}
- Tech Stack: ${idea.techStack}

Score this idea and respond ONLY with valid JSON (no markdown, no code fences):
{
  "innovation": <1-10>,
  "feasibility": <1-10>,
  "marketFit": <1-10>,
  "scalability": <1-10>,
  "xFactor": <1-10>,
  "verdict": "Your 2-3 sentence verdict in character as ${judge.name}. Be opinionated and colorful.",
  "investOrPass": "invest" or "pass",
  "rebuttals": "Optional 1-2 sentence rebuttal to what you imagine other judges might say. Stay in character."
}

Stay in character. Be opinionated. ${judge.style}.`;

    const judgeResponse = callClaude(judgePrompt);
    const evaluation = extractJSON(judgeResponse);

    await db.insert(schema.judgements).values({
      ideaId: insertedIdea.id,
      judgeName: judge.name,
      judgePersona: judge.focus,
      innovation: evaluation.innovation as number,
      feasibility: evaluation.feasibility as number,
      marketFit: evaluation.marketFit as number,
      scalability: evaluation.scalability as number,
      xFactor: evaluation.xFactor as number,
      verdict: evaluation.verdict as string,
      investOrPass: evaluation.investOrPass as string,
      rebuttals: (evaluation.rebuttals as string) || null,
    });

    console.log(`  ${judge.name}: ${evaluation.investOrPass} (${evaluation.innovation}/${evaluation.feasibility}/${evaluation.marketFit}/${evaluation.scalability}/${evaluation.xFactor})`);
  }

  // Calculate overall score
  const allJudgements = await db
    .select()
    .from(schema.judgements)
    .where(eq(schema.judgements.ideaId, insertedIdea.id));

  const totalScore = allJudgements.reduce((sum, j) => {
    return sum + (j.innovation + j.feasibility + j.marketFit + j.scalability + j.xFactor) / 5;
  }, 0);
  const avgScore = totalScore / allJudgements.length;

  await db
    .update(schema.ideas)
    .set({ overallScore: Math.round(avgScore * 10) / 10 })
    .where(eq(schema.ideas.id, insertedIdea.id));

  console.log(`\nDone! "${idea.name}" — Overall Score: ${avgScore.toFixed(1)}/10`);
  await connection.end();
}

generateIdea().catch((err) => {
  console.error("Generation failed:", err);
  process.exit(1);
});
