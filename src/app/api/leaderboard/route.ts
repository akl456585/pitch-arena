import { db, schema } from "@/db";
import { desc, sql, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const portfolioValue = sql<number>`COALESCE(SUM(
    ${schema.investments.amount} * COALESCE(${schema.ideas.valuation}, 1000)
    / NULLIF(COALESCE(${schema.investments.priceAtInvestment}, 1000), 0)
  ), 0)`;

  const totalValue = sql<number>`COALESCE(${schema.users.balance}, 0) + COALESCE(SUM(
    ${schema.investments.amount} * COALESCE(${schema.ideas.valuation}, 1000)
    / NULLIF(COALESCE(${schema.investments.priceAtInvestment}, 1000), 0)
  ), 0)`;

  const leaderboard = await db
    .select({
      userId: schema.users.id,
      username: schema.users.username,
      balance: schema.users.balance,
      totalInvested: sql<number>`COALESCE(SUM(${schema.investments.amount}), 0)`,
      investmentCount: sql<number>`COUNT(${schema.investments.id})`,
      portfolioValue: portfolioValue.mapWith(Number),
      totalValue: totalValue.mapWith(Number),
    })
    .from(schema.users)
    .innerJoin(schema.investments, eq(schema.users.id, schema.investments.userId))
    .innerJoin(schema.ideas, eq(schema.investments.ideaId, schema.ideas.id))
    .groupBy(schema.users.id)
    .orderBy(desc(totalValue))
    .limit(50);

  return Response.json({ leaderboard });
}
