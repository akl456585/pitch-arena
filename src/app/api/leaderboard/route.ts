import { db, schema } from "@/db";
import { desc, sql, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  // Only users who have actually invested at least once.
  // INNER JOIN filters out ghost accounts (cookie-less visitors who never bet).
  const investors = await db
    .select({
      userId: schema.users.id,
      username: schema.users.username,
      balance: schema.users.balance,
      totalInvested: sql<number>`sum(${schema.investments.amount})`,
      investmentCount: sql<number>`count(${schema.investments.id})`,
    })
    .from(schema.users)
    .innerJoin(schema.investments, eq(schema.users.id, schema.investments.userId))
    .groupBy(schema.users.id)
    .orderBy(desc(sql`sum(${schema.investments.amount})`))
    .limit(50);

  // For each investor, calculate portfolio value
  const leaderboard = await Promise.all(
    investors.map(async (inv) => {
      const investments = await db
        .select({
          amount: schema.investments.amount,
          priceAtInvestment: schema.investments.priceAtInvestment,
          currentValuation: schema.ideas.valuation,
          ideaName: schema.ideas.name,
        })
        .from(schema.investments)
        .innerJoin(schema.ideas, eq(schema.investments.ideaId, schema.ideas.id))
        .where(eq(schema.investments.userId, inv.userId));

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
    })
  );

  leaderboard.sort((a, b) => b.totalValue - a.totalValue);

  return Response.json({ leaderboard });
}
