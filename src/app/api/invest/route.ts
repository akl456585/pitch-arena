import { getOrCreateUser } from "@/lib/user";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getOrCreateUser();
  const body = await request.json();
  const { ideaId, amount } = body as { ideaId: number; amount: number };

  if (!ideaId || !amount || amount <= 0) {
    return Response.json({ error: "Invalid ideaId or amount" }, { status: 400 });
  }

  if (amount > (user.balance || 0)) {
    return Response.json({ error: "Insufficient balance" }, { status: 400 });
  }

  // Get idea
  const [idea] = await db
    .select()
    .from(schema.ideas)
    .where(eq(schema.ideas.id, ideaId))
    .limit(1);

  if (!idea) {
    return Response.json({ error: "Idea not found" }, { status: 404 });
  }

  const currentValuation = idea.valuation || 1000;

  // Create investment
  await db.insert(schema.investments).values({
    userId: user.id,
    ideaId,
    amount,
    priceAtInvestment: currentValuation,
  });

  // Deduct from user balance
  await db
    .update(schema.users)
    .set({ balance: sql`${schema.users.balance} - ${amount}` })
    .where(eq(schema.users.id, user.id));

  // Increase idea's total invested and valuation
  const valuationBoost = amount * 0.1;
  await db
    .update(schema.ideas)
    .set({
      totalInvested: sql`${schema.ideas.totalInvested} + ${amount}`,
      valuation: sql`${schema.ideas.valuation} + ${valuationBoost}`,
    })
    .where(eq(schema.ideas.id, ideaId));

  // Fetch updated user
  const [updatedUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);

  return Response.json({
    success: true,
    investment: { ideaId, amount, priceAtInvestment: currentValuation },
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      balance: updatedUser.balance,
    },
  });
}
