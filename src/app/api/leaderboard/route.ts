import { db, schema } from "@/db";
import { desc, sql, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  // Get top investors by portfolio value
  // Portfolio value = current balance + sum of (investment amount * current idea valuation / valuation at time of investment)
  const investors = db
    .select({
      userId: schema.users.id,
      username: schema.users.username,
      balance: schema.users.balance,
      totalInvested: sql<number>`coalesce(sum(${schema.investments.amount}), 0)`,
      investmentCount: sql<number>`count(${schema.investments.id})`,
    })
    .from(schema.users)
    .leftJoin(schema.investments, eq(schema.users.id, schema.investments.userId))
    .groupBy(schema.users.id)
    .orderBy(desc(sql`coalesce(sum(${schema.investments.amount}), 0)`))
    .limit(50)
    .all();

  // For each investor, calculate portfolio value
  const leaderboard = investors.map((inv) => {
    const investments = db
      .select({
        amount: schema.investments.amount,
        priceAtInvestment: schema.investments.priceAtInvestment,
        currentValuation: schema.ideas.valuation,
        ideaName: schema.ideas.name,
      })
      .from(schema.investments)
      .innerJoin(schema.ideas, eq(schema.investments.ideaId, schema.ideas.id))
      .where(eq(schema.investments.userId, inv.userId))
      .all();

    const portfolioValue = investments.reduce((sum, i) => {
      const currentVal = i.currentValuation || 1000;
      const entryVal = i.priceAtInvestment || 1000;
      return sum + i.amount * (currentVal / entryVal);
    }, 0);

    return {
      ...inv,
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      totalValue: Math.round(((inv.balance || 0) + portfolioValue) * 100) / 100,
    };
  });

  leaderboard.sort((a, b) => b.totalValue - a.totalValue);

  return Response.json({ leaderboard });
}
