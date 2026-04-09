import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env.local",
});

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  const db = drizzle(connection);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migration complete.");

  await connection.end();
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
