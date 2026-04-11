import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json(null);
  return Response.json(user);
}
