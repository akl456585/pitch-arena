import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.join(__dirname, "../../data/pitch-arena.db");
const sqlDir = path.join(__dirname, "../../drizzle");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

const files = fs.readdirSync(sqlDir).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  const sql = fs.readFileSync(path.join(sqlDir, file), "utf-8");
  const statements = sql.split("--> statement-breakpoint");
  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (trimmed) sqlite.exec(trimmed);
  }
  console.log(`Applied: ${file}`);
}

console.log("Migration complete.");
sqlite.close();
