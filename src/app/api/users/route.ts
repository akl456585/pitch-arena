import { getOrCreateUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getOrCreateUser();
  return Response.json(user);
}
