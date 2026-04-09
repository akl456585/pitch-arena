import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "pa_user";

function generateUsername(): string {
  const adjectives = [
    "Bold", "Swift", "Clever", "Lucky", "Wild", "Calm", "Sharp", "Brave",
    "Keen", "Savvy", "Witty", "Sly", "Sage", "Deft", "Grit",
  ];
  const nouns = [
    "Shark", "Eagle", "Wolf", "Bear", "Fox", "Hawk", "Lion", "Tiger",
    "Falcon", "Raven", "Otter", "Lynx", "Viper", "Mantis", "Panda",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}${noun}${num}`;
}

export async function getOrCreateUser() {
  const cookieStore = await cookies();
  const userIdStr = cookieStore.get(COOKIE_NAME)?.value;

  if (userIdStr) {
    const userId = Number(userIdStr);
    const [existing] = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)
      .all();

    if (existing) return existing;
  }

  // Create new user
  let username = generateUsername();
  // Ensure unique
  for (let i = 0; i < 5; i++) {
    const [clash] = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1)
      .all();
    if (!clash) break;
    username = generateUsername();
  }

  const [newUser] = db
    .insert(schema.users)
    .values({ username })
    .returning()
    .all();

  cookieStore.set(COOKIE_NAME, String(newUser.id), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });

  return newUser;
}
