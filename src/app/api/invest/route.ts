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

  // Early check (non-authoritative — real check is inside the transaction)
  if (amount > (user.balance || 0)) {
    return Response.json({ error: "Insufficient balance" }, { status: 400 });
  }

  return await db.transaction(async (tx) => {
    // Lock the user row and re-read balance inside the transaction
    const [userRows] = await tx.execute(
      sql`SELECT id, balance FROM users WHERE id = ${user.id} FOR UPDATE`
    );
    const lockedUser = (userRows as unknown as { id: number; balance: number }[])[0];

    if (!lockedUser || (lockedUser.balance || 0) < amount) {
      return Response.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Lock the idea row to get a consistent valuation snapshot
    const [ideaRows] = await tx.execute(
      sql`SELECT id, valuation FROM ideas WHERE id = ${ideaId} FOR UPDATE`
    );
    const lockedIdea = (ideaRows as unknown as { id: number; valuation: number }[])[0];

    if (!lockedIdea) {
      return Response.json({ error: "Idea not found" }, { status: 404 });
    }

    const currentValuation = lockedIdea.valuation || 1000;

    // All writes are now atomic within the transaction
    await tx.insert(schema.investments).values({
      userId: user.id,
      ideaId,
      amount,
      priceAtInvestment: currentValuation,
    });

    await tx
      .update(schema.users)
      .set({ balance: sql`${schema.users.balance} - ${amount}` })
      .where(eq(schema.users.id, user.id));

    const valuationBoost = amount * 0.1;
    await tx
      .update(schema.ideas)
      .set({
        totalInvested: sql`${schema.ideas.totalInvested} + ${amount}`,
        valuation: sql`${schema.ideas.valuation} + ${valuationBoost}`,
      })
      .where(eq(schema.ideas.id, ideaId));

    // Read updated balance after deduction
    const [updatedUser] = await tx
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
  });
}
