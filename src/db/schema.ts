import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const ideas = sqliteTable("ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  category: text("category").notNull(),
  logoEmoji: text("logo_emoji").notNull(),
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
  overallScore: real("overall_score").default(0),
  valuation: real("valuation").default(1000),
  totalInvested: real("total_invested").default(0),
  status: text("status").default("active"), // active, archived
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const judgements = sqliteTable("judgements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ideaId: integer("idea_id").notNull().references(() => ideas.id),
  judgeName: text("judge_name").notNull(),
  judgePersona: text("judge_persona").notNull(),
  innovation: integer("innovation").notNull(),
  feasibility: integer("feasibility").notNull(),
  marketFit: integer("market_fit").notNull(),
  scalability: integer("scalability").notNull(),
  xFactor: integer("x_factor").notNull(),
  verdict: text("verdict").notNull(),
  investOrPass: text("invest_or_pass").notNull(), // "invest" or "pass"
  rebuttals: text("rebuttals"), // JSON string of rebuttals to other judges
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const marketEvents = sqliteTable("market_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ideaId: integer("idea_id").notNull().references(() => ideas.id),
  eventText: text("event_text").notNull(),
  impactPercent: real("impact_percent").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  avatar: text("avatar"),
  balance: real("balance").default(10000),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const investments = sqliteTable("investments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  ideaId: integer("idea_id").notNull().references(() => ideas.id),
  amount: real("amount").notNull(),
  priceAtInvestment: real("price_at_investment").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// Type exports
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
export type Judgement = typeof judgements.$inferSelect;
export type NewJudgement = typeof judgements.$inferInsert;
export type MarketEvent = typeof marketEvents.$inferSelect;
export type User = typeof users.$inferSelect;
export type Investment = typeof investments.$inferSelect;
