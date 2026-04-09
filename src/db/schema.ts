import { mysqlTable, int, varchar, text, double, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const ideas = mysqlTable("ideas", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  tagline: varchar("tagline", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  logoEmoji: varchar("logo_emoji", { length: 10 }).notNull(),
  problem: text("problem").notNull(),
  solution: text("solution").notNull(),
  targetMarket: text("target_market").notNull(),
  tam: text("tam").notNull(),
  businessModel: text("business_model").notNull(),
  pricing: text("pricing").notNull(),
  competitors: text("competitors").notNull(),
  goToMarket: text("go_to_market").notNull(),
  financials: text("financials").notNull(), // JSON string: { year1, year2, year3 }
  risks: text("risks").notNull(),
  techStack: text("tech_stack").notNull(),
  overallScore: double("overall_score").default(0),
  valuation: double("valuation").default(1000),
  totalInvested: double("total_invested").default(0),
  status: varchar("status", { length: 20 }).default("active"), // active, archived
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const judgements = mysqlTable("judgements", {
  id: int("id").primaryKey().autoincrement(),
  ideaId: int("idea_id").notNull().references(() => ideas.id),
  judgeName: varchar("judge_name", { length: 100 }).notNull(),
  judgePersona: varchar("judge_persona", { length: 255 }).notNull(),
  innovation: int("innovation").notNull(),
  feasibility: int("feasibility").notNull(),
  marketFit: int("market_fit").notNull(),
  scalability: int("scalability").notNull(),
  xFactor: int("x_factor").notNull(),
  verdict: text("verdict").notNull(),
  investOrPass: varchar("invest_or_pass", { length: 10 }).notNull(), // "invest" or "pass"
  rebuttals: text("rebuttals"), // JSON string of rebuttals to other judges
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const marketEvents = mysqlTable("market_events", {
  id: int("id").primaryKey().autoincrement(),
  ideaId: int("idea_id").notNull().references(() => ideas.id),
  eventText: text("event_text").notNull(),
  impactPercent: double("impact_percent").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  avatar: varchar("avatar", { length: 255 }),
  balance: double("balance").default(10000),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const investments = mysqlTable("investments", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id),
  ideaId: int("idea_id").notNull().references(() => ideas.id),
  amount: double("amount").notNull(),
  priceAtInvestment: double("price_at_investment").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Type exports
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
export type Judgement = typeof judgements.$inferSelect;
export type NewJudgement = typeof judgements.$inferInsert;
export type MarketEvent = typeof marketEvents.$inferSelect;
export type User = typeof users.$inferSelect;
export type Investment = typeof investments.$inferSelect;
