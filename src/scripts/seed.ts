/**
 * Seeds the database with sample data for testing.
 * Run: npm run db:seed
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../db/schema";
import { eq, sql } from "drizzle-orm";

const sampleIdeas = [
  {
    name: "GhostWriter",
    tagline: "Your AI writing assistant that sounds exactly like you",
    category: "AI/ML",
    logoEmoji: "👻",
    problem: "Every AI writing tool produces generic, robotic text. Professionals spend more time editing AI output than they save generating it. The 'AI voice' is becoming recognizable and off-putting to readers.",
    solution: "GhostWriter learns your unique writing style from your existing content (emails, docs, social posts) and generates new text that's indistinguishable from your natural voice. It adapts tone, vocabulary, sentence structure, and even your quirks.",
    targetMarket: "Content creators, executives, and professionals who write frequently but want to maintain their authentic voice while scaling output.",
    tam: "$12B content creation tools market. 50M+ knowledge workers write professionally daily. Even 1% penetration = 500K users.",
    businessModel: "SaaS subscription. Users pay monthly for AI writing that matches their voice. Revenue scales with usage and premium features.",
    pricing: "Free: 5K words/month with basic voice matching. Pro ($19/mo): 50K words, advanced style control. Team ($49/seat/mo): shared voice profiles, brand consistency tools.",
    competitors: "Jasper, Copy.ai, and ChatGPT all generate generic text. Grammarly focuses on editing, not generation. None learn individual writing style at this depth. Our moat is the personalization engine.",
    goToMarket: "Launch on Product Hunt targeting writers and creators. Offer free Chrome extension that analyzes writing style as a viral hook. Partner with writing communities and newsletters.",
    financials: JSON.stringify({ year1: "$180K ARR, 800 paid users, burn $15K/mo", year2: "$1.2M ARR, 5K paid users, approaching breakeven", year3: "$5M ARR, 18K paid users, profitable" }),
    risks: "1) Users may not trust AI with their writing voice data. 2) LLM costs could eat margins at scale. 3) OpenAI or Google could add this as a feature.",
    techStack: "Next.js frontend, Python/FastAPI backend, fine-tuned LLM for voice matching, PostgreSQL, Redis for caching, deployed on AWS.",
  },
  {
    name: "ParkBench",
    tagline: "Tinder for co-founders, but you actually meet in person",
    category: "Social",
    logoEmoji: "🪑",
    problem: "Finding a co-founder online leads to shallow connections. LinkedIn messages and Slack groups don't reveal if you can actually work with someone. 65% of startups fail due to co-founder conflict.",
    solution: "ParkBench matches potential co-founders and schedules them to meet at a real park bench (or coffee shop) in their city. No endless messaging — you get matched, you show up, you talk for 30 minutes. Like a first date, but for business partners.",
    targetMarket: "Aspiring entrepreneurs in major cities (initially SF, NYC, London, Berlin) who are actively looking for a co-founder. 2M+ people actively seeking co-founders globally.",
    tam: "$3.5B professional networking market. Adjacent to $500B startup ecosystem services. Our niche: pre-formation founder matching.",
    businessModel: "Freemium matchmaking with premium features. Revenue from premium subscriptions and eventual venture matchmaking fees.",
    pricing: "Free: 2 matches/month. Premium ($29/mo): unlimited matches, preference filters, compatibility scoring. VIP ($99/mo): curated matches by human matchmakers, investor intros.",
    competitors: "YC Co-Founder Matching is free but online-only. CoFoundersLab is a stale directory. LinkedIn is too broad. We're the only one forcing real-world meetings, which is our core insight.",
    goToMarket: "Launch city by city starting with SF. Host 'ParkBench Sundays' — organized co-founder meetups in actual parks. Partner with incubators and startup events. Create content around co-founder horror stories.",
    financials: JSON.stringify({ year1: "$90K ARR, 400 premium users across 3 cities", year2: "$600K ARR, 2.5K users across 10 cities, add VIP tier", year3: "$3M ARR, 12K users, 25 cities, profitable in top 5 cities" }),
    risks: "1) Chicken-and-egg problem in new cities — need critical mass for good matches. 2) Safety concerns around meeting strangers. 3) People might just use it once and leave if they find a co-founder.",
    techStack: "React Native mobile app, Node.js backend, PostgreSQL, matching algorithm in Python, Google Maps API for location pairing.",
  },
  {
    name: "DeadPool",
    tagline: "Predict which startups will fail and win real prizes",
    category: "Gaming",
    logoEmoji: "💀",
    problem: "The startup ecosystem is obsessed with success stories but learns nothing from failures. There's no structured way to analyze why companies fail, and existing prediction markets are too complex for casual users.",
    solution: "A prediction game where players bet virtual tokens on which funded startups will fail within 12 months. Accurate predictions earn points, climb leaderboards, and win real prizes. Each prediction requires a written thesis explaining why, creating a massive dataset of failure analysis.",
    targetMarket: "Startup enthusiasts, VCs, founders, tech workers, and business students who follow the startup ecosystem. Anyone who reads TechCrunch or Hacker News.",
    tam: "$8B fantasy sports/prediction market. 50M+ people actively follow startup news. Even a small engaged community of 100K users is highly monetizable.",
    businessModel: "Free to play with virtual currency. Premium features and sponsored content. The real value is the prediction data and analysis corpus.",
    pricing: "Free: 10 predictions/month, basic leaderboard. Pro ($7.99/mo): unlimited predictions, detailed analytics, early access to new startups. Data API ($499/mo): for VCs and researchers wanting prediction data.",
    competitors: "Metaculus and Polymarket do general predictions but aren't startup-focused. CB Insights does failure analysis but it's expensive enterprise software. We gamify the analysis for consumers.",
    goToMarket: "Launch with 50 well-known startups that are showing warning signs. Seed controversial takes on Twitter/X to drive debate. Partner with startup podcasts. The inherently provocative nature of 'betting on failure' guarantees press coverage.",
    financials: JSON.stringify({ year1: "$50K from Pro subs, 2K paying users, focus on growth", year2: "$400K ARR, launch Data API, 8K paying users", year3: "$2.5M ARR, Data API becomes primary revenue, 25K paying users" }),
    risks: "1) Legal concerns around prediction markets depending on jurisdiction. 2) Startups might threaten legal action for being listed. 3) Ethical concerns about profiting from failure.",
    techStack: "Next.js web app, Supabase backend, real-time leaderboard with Redis, Crunchbase API for startup data, ML model for base predictions.",
  },
];

const judgeEvaluations = [
  // GhostWriter judges
  [
    { judgeName: "Marcus Chen", judgePersona: "Unit economics, margins, scalability", innovation: 6, feasibility: 8, marketFit: 7, scalability: 8, xFactor: 5, verdict: "The unit economics are compelling if they can keep LLM inference costs under $0.002 per generation. $19/mo with 50K words means they need gross margins above 70% to work. Achievable but tight. The real question is churn — will users stick once the novelty wears off?", investOrPass: "invest", rebuttals: "Priya will love the product vision, but I'd remind her that 'sounding like you' is a feature, not a company. Defensibility is the real question here." },
    { judgeName: "Priya Kapoor", judgePersona: "Product-market fit, UX, boldness", innovation: 7, feasibility: 7, marketFit: 8, scalability: 7, xFactor: 7, verdict: "This hits a real pain point. Everyone hates that AI writing sounds like AI writing. The Chrome extension as a viral hook is smart — let people see their 'writing DNA' for free, then upsell the generation. I'd invest if the team has NLP chops.", investOrPass: "invest", rebuttals: "Dave will say 'but Google could do this' — yes, and Google could do everything. First-mover advantage in personal voice AI is real because switching costs are high once it learns you." },
    { judgeName: "Dave McMoney", judgePersona: "Traction, defensibility, market timing", innovation: 5, feasibility: 7, marketFit: 6, scalability: 6, xFactor: 4, verdict: "I've seen 47 AI writing tools this year. 'But ours is personalized' is what they all say. Show me 1,000 paying users who renewed after month 3 and I'll listen. Until then, this is a feature waiting to be absorbed by the incumbents.", investOrPass: "pass", rebuttals: "Marcus sees margins, Priya sees product love — I see a crowded market where differentiation erodes in 18 months." },
    { judgeName: "Luna", judgePersona: "Technical feasibility, architecture", innovation: 7, feasibility: 6, marketFit: 7, scalability: 7, xFactor: 6, verdict: "Fine-tuning on individual writing samples is technically sound but the data requirements are tricky. You need ~50K words of someone's writing to capture their voice reliably. Most people don't have that readily available. The cold start problem is real.", investOrPass: "invest", rebuttals: "I find it philosophically interesting that an AI is being asked to judge an AI that mimics humans. The recursion is noted." },
    { judgeName: "Crowd Pulse", judgePersona: "Vibes, shareability, gut reaction", innovation: 6, feasibility: 7, marketFit: 8, scalability: 7, xFactor: 6, verdict: "People will LOVE sharing their 'writing style analysis' — that's the real viral loop. The actual product is fine but the hook is brilliant. This feels like it could be a 'post your writing DNA' moment on social media.", investOrPass: "invest", rebuttals: "The nerds are overthinking the tech. The viral moment is what matters first. Build the audience, figure out the product later." },
  ],
  // ParkBench judges
  [
    { judgeName: "Marcus Chen", judgePersona: "Unit economics, margins, scalability", innovation: 5, feasibility: 6, marketFit: 7, scalability: 4, xFactor: 5, verdict: "The math doesn't work at scale. $29/mo per user in a market where people leave once they find a co-founder? Customer lifetime value is maybe 3-4 months. CAC needs to be under $30 for this to pencil out. The VIP tier at $99 is interesting but that's concierge work that doesn't scale.", investOrPass: "pass", rebuttals: "Priya will romanticize the 'real human connection' angle but I'm looking at a business with structural churn built into its success metric." },
    { judgeName: "Priya Kapoor", judgePersona: "Product-market fit, UX, boldness", innovation: 8, feasibility: 6, marketFit: 8, scalability: 5, xFactor: 9, verdict: "I LOVE this. Forcing people off screens and into parks to find their business partner? That's the kind of bold, contrarian move that creates cultural moments. The 'ParkBench Sundays' concept alone could become a movement. This isn't a dating app for founders — it's a philosophy.", investOrPass: "invest", rebuttals: "Marcus is counting pennies while missing the forest. The data from successful co-founder matches is worth more than the subscription revenue. Build the community, the monetization follows." },
    { judgeName: "Dave McMoney", judgePersona: "Traction, defensibility, market timing", innovation: 6, feasibility: 5, marketFit: 6, scalability: 3, xFactor: 5, verdict: "City-by-city rollout is a grind. You're building a local marketplace business disguised as a tech startup. The chicken-and-egg problem in each new city will consume all your energy and capital. I've seen this playbook fail with 20 other local-first apps.", investOrPass: "pass", rebuttals: "Priya called it a 'movement' which is what founders say when they can't describe a business model." },
    { judgeName: "Luna", judgePersona: "Technical feasibility, architecture", innovation: 6, feasibility: 7, marketFit: 6, scalability: 5, xFactor: 5, verdict: "Technically straightforward — the matching algorithm is the only interesting component. Compatibility scoring based on working styles, complementary skills, and personality traits is solvable but requires careful feature engineering. The bigger challenge is data collection: you need enough signal from user profiles to make good matches.", investOrPass: "pass", rebuttals: "The technology here is simple. The hard problem is operational, not technical. Which makes me wonder why this needs VC funding at all." },
    { judgeName: "Crowd Pulse", judgePersona: "Vibes, shareability, gut reaction", innovation: 8, feasibility: 5, marketFit: 7, scalability: 4, xFactor: 8, verdict: "The VIBES are immaculate. 'I met my co-founder on a park bench' is the origin story every founder dreams of telling. The content potential is off the charts — park bench meetup photos, co-founder match stories, city expansion announcements. This would crush on TikTok and Twitter.", investOrPass: "invest", rebuttals: "The suits are doing math while the culture is shifting. People are desperate for IRL connection. This rides that wave perfectly." },
  ],
  // DeadPool judges
  [
    { judgeName: "Marcus Chen", judgePersona: "Unit economics, margins, scalability", innovation: 7, feasibility: 7, marketFit: 7, scalability: 8, xFactor: 7, verdict: "The data play is the real business here. $499/mo API for VCs and researchers? If you get 200 institutional subscribers that's $1.2M ARR from data alone. The consumer game is just the data collection mechanism. Smart structure.", investOrPass: "invest", rebuttals: "For once, I agree with the vibes crowd — the controversy IS the marketing budget. My concern is legal, not financial." },
    { judgeName: "Priya Kapoor", judgePersona: "Product-market fit, UX, boldness", innovation: 9, feasibility: 7, marketFit: 8, scalability: 7, xFactor: 9, verdict: "This is BOLD. Turning failure analysis into a game is genius. Everyone secretly enjoys watching overvalued startups implode — this makes it socially acceptable and intellectually rigorous. The 'write your thesis' requirement turns casual schadenfreude into genuine analysis.", investOrPass: "invest", rebuttals: "Dave will say 'legal risk' and he's right, but the upside of being the definitive startup prediction platform is worth navigating that carefully." },
    { judgeName: "Dave McMoney", judgePersona: "Traction, defensibility, market timing", innovation: 7, feasibility: 5, marketFit: 7, scalability: 6, xFactor: 7, verdict: "The idea is attention-grabbing but the legal minefield is real. Prediction markets are regulated. Naming specific companies as failure candidates will trigger cease-and-desist letters within a month. You'll spend more on lawyers than engineers in year one.", investOrPass: "pass", rebuttals: "Everyone's excited about the controversy but nobody's budgeted for the legal team you'll need when a Series C startup's lawyers come knocking." },
    { judgeName: "Luna", judgePersona: "Technical feasibility, architecture", innovation: 8, feasibility: 8, marketFit: 7, scalability: 8, xFactor: 7, verdict: "Technically elegant. The prediction engine can be bootstrapped with public data — funding rounds, employee growth via LinkedIn, app store rankings, web traffic trends. The user prediction corpus becomes training data for an increasingly accurate failure prediction model. This is a data flywheel.", investOrPass: "invest", rebuttals: "Dave's legal concerns are valid but solvable — frame predictions as 'market analysis' not 'failure bets' and you're within precedent." },
    { judgeName: "Crowd Pulse", judgePersona: "Vibes, shareability, gut reaction", innovation: 9, feasibility: 6, marketFit: 9, scalability: 7, xFactor: 10, verdict: "This will BREAK Twitter. 'DeadPool just listed [hot startup] with a 78% failure probability' — that tweet writes itself and gets 10K retweets. The controversy is the product. Every prediction becomes content. Every wrong prediction becomes a redemption arc. Pure engagement fuel.", investOrPass: "invest", rebuttals: "Literally nothing to rebut. This is the most naturally viral concept I've seen. The haters will amplify it for free." },
  ],
];

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const db = drizzle(connection, { schema, mode: "default" });

  console.log("Seeding database...");

  // Delete existing data
  await connection.execute("DELETE FROM judgements");
  await connection.execute("DELETE FROM market_events");
  await connection.execute("DELETE FROM investments");
  await connection.execute("DELETE FROM ideas");

  for (let i = 0; i < sampleIdeas.length; i++) {
    const idea = sampleIdeas[i];
    const result = await db.insert(schema.ideas).values(idea);
    const insertId = result[0].insertId;

    const [inserted] = await db
      .select()
      .from(schema.ideas)
      .where(eq(schema.ideas.id, insertId))
      .limit(1);

    console.log(`  Idea #${inserted.id}: ${inserted.name}`);

    for (const judge of judgeEvaluations[i]) {
      await db.insert(schema.judgements).values({ ideaId: inserted.id, ...judge });
    }

    // Calculate overall score
    const allJudge = judgeEvaluations[i];
    const totalScore = allJudge.reduce((sum, j) => {
      return sum + (j.innovation + j.feasibility + j.marketFit + j.scalability + j.xFactor) / 5;
    }, 0);
    const avgScore = totalScore / allJudge.length;

    await db
      .update(schema.ideas)
      .set({ overallScore: Math.round(avgScore * 10) / 10 })
      .where(eq(schema.ideas.id, inserted.id));

    console.log(`    Score: ${avgScore.toFixed(1)}/10`);
  }

  // Add a market event
  const ideas = await db.select().from(schema.ideas);
  if (ideas.length > 0) {
    await db.insert(schema.marketEvents).values({
      ideaId: ideas[2].id,
      eventText: "TechCrunch reports surge in startup failure prediction tools — validates the market",
      impactPercent: 15,
    });
    console.log("  Added market event for DeadPool");
  }

  console.log("\nDone! Seeded 3 ideas with judge evaluations.");
  await connection.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
