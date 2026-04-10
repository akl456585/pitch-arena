# Pitch Arena automation plan

This document is the spec a server-side Claude Code session reads to (re)build
the automation. It contains the agent definitions, the `/loop` commands, and
the prerequisites the server box needs.

## Design constraints

- All triggering happens via Claude Code's built-in `/loop` command. No tsx
  scripts, no cron daemons, no shell wrappers around `claude -p`.
- Agents are spawned via the Task tool from a Claude Code session, never via
  external `claude` CLI calls.
- **Agents cannot call other agents.** No nested Task dispatch from within a
  subagent. Each agent is self-contained.
- **No orchestrating agent.** Each agent runs independently on its own /loop,
  doing its own glue (curl, JSON assembly, DB writes via the admin endpoints).
  Agents coordinate only through shared state in the database.
- The current `src/scripts/generate-idea.ts` is obsolete and will be deleted
  once the loops are running.

## Architecture — independent workers, DB queue

```
server box
└── claude code session (long-running, persistent)
    ├── /loop 30m  Run idea-generator subagent.
    │             └── per tick: spawns idea-generator agent
    │                 (curl GET recent ideas → generate → POST → done)
    │
    └── /loop 5m   Run judges-panel subagent.
                  └── per tick: spawns judges-panel agent
                      (curl GET pending → judge each → POST → done)

shared state: ideas.status column in MySQL
  - 'pending_judging' → set by idea-generator after POST
  - 'active'          → set by judges-panel after verdicts land
  - 'archived'        → existing terminal state, untouched
```

Two agents, two loops, zero coordination logic. Each agent has no idea the
other exists. The DB is the queue.

Why this satisfies the constraints:
- No agent calls another agent (no nesting).
- The main session per tick does ONE thing — Task(one subagent). It's not an
  orchestrator, just a thin entry point /loop has to fire into.
- Different cadences naturally fall out: idea-gen 30m, judging 5m so the
  backlog drains faster than it accumulates.
- Failure isolation: if judging breaks, ideas keep stacking up safely. If
  idea-gen breaks, judging finishes the backlog and idles.

## Files to create

```
.claude/
  agents/
    idea-generator.md       # self-contained: generate + POST
    judges-panel.md         # self-contained: poll pending + judge + POST
docs/
  automation-plan.md        # this file
src/app/api/admin/
  ideas/route.ts                       # POST: create idea (status=pending)
  ideas/[id]/judgements/route.ts       # POST: attach 5 verdicts (status→active)
  ideas/pending/route.ts               # GET: list ideas needing judgement
```

## Schema change required

Add `'pending_judging'` as a valid value for `ideas.status`. The column
already exists (varchar 20, default 'active'), no migration needed — just
treat the new value as a state.

Existing rows are unaffected (they stay 'active'). New ideas POSTed by
idea-generator go in as 'pending_judging' and are flipped to 'active' once
judges-panel writes their verdicts.

The frontend should hide ideas where status='pending_judging' so users don't
see un-judged stubs. Update the home page query in `src/app/page.tsx` to
filter `where(eq(schema.ideas.status, 'active'))`.

## Endpoints to build

### POST /api/admin/ideas

Creates a new idea with status='pending_judging'. No judgements.

**Auth**: `Authorization: Bearer <ADMIN_TOKEN>` header. 401 on mismatch.

**Body**:
```json
{
  "name": "...", "tagline": "...", "logoEmoji": "...", "category": "...",
  "problem": "...", "solution": "...", "targetMarket": "...", "tam": "...",
  "businessModel": "...", "pricing": "...", "competitors": "...",
  "goToMarket": "...",
  "financials": {"year1": "...", "year2": "...", "year3": "..."},
  "risks": "...", "techStack": "..."
}
```

**Logic**:
1. Auth check.
2. Shape validation. 400 on failure.
3. INSERT idea row with status='pending_judging', overall_score=0.
4. Return `{ id, name, status }` with 201.

**File**: `src/app/api/admin/ideas/route.ts`

### GET /api/admin/ideas/pending

Returns the queue of ideas waiting to be judged.

**Auth**: same bearer token header.

**Query**: optional `?limit=10` (default 10).

**Response**:
```json
[
  {
    "id": 42,
    "name": "...", "tagline": "...", "category": "...",
    "problem": "...", "solution": "...", "targetMarket": "...",
    "tam": "...", "businessModel": "...", "pricing": "...",
    "competitors": "...", "goToMarket": "...",
    "financials": "...JSON string...", "risks": "...", "techStack": "..."
  },
  ...
]
```

Order by id ASC (oldest first — FIFO). Only ideas with status='pending_judging'.

**File**: `src/app/api/admin/ideas/pending/route.ts`

### POST /api/admin/ideas/:id/judgements

Attaches the 5 judge verdicts to a pending idea, computes overall_score,
flips status to 'active'.

**Auth**: same bearer token header.

**Body**:
```json
{
  "judgements": [
    {
      "judgeName": "Marcus Chen",
      "judgePersona": "Unit economics, margins, scalability",
      "innovation": 7, "feasibility": 6, "marketFit": 5,
      "scalability": 8, "xFactor": 4,
      "verdict": "...", "investOrPass": "pass", "rebuttals": null
    },
    ... 4 more
  ]
}
```

**Logic**:
1. Auth check.
2. Verify idea exists and status='pending_judging'. 404 / 409 otherwise.
3. Validate exactly 5 judgements, each with all 5 axis scores in 1-10 range.
4. Compute overall_score = avg of all 25 axis values, rounded to 1 decimal.
5. In a transaction: INSERT 5 judgement rows + UPDATE idea SET overall_score,
   status='active'.
6. Return `{ id, name, overall_score, status }` with 200.

**File**: `src/app/api/admin/ideas/[id]/judgements/route.ts`

### ADMIN_TOKEN setup

1. Generate a long random string (e.g. `openssl rand -hex 32`).
2. Add `ADMIN_TOKEN=<value>` to `.env.local` for dev.
3. Add as a GitHub secret: `gh secret set ADMIN_TOKEN`.
4. Update `.github/workflows/deploy.yml` "Create env file" step to inject
   `ADMIN_TOKEN=${{ secrets.ADMIN_TOKEN }}` into `.env.production`.
5. Container picks it up via `env_file` in docker-compose.yml.
6. Restart the container so it picks up the new env var.

## Subagent: idea-generator

Create `.claude/agents/idea-generator.md` with this exact content:

```markdown
---
name: idea-generator
description: Generates one fresh startup pitch and POSTs it to the Pitch Arena admin endpoint with status='pending_judging'. Self-contained — no other agents involved.
model: sonnet
tools: Bash, Read, Write
---

You are a creative startup idea generator for an app called Pitch Arena.

Your job per invocation: invent ONE specific, memorable startup pitch and
POST it to the admin endpoint. End-to-end. No other agents involved.

## Variety knobs

Pick one at random for each invocation:
- Category: SaaS, Consumer, Marketplace, Fintech, Health, Education,
  Creator Tools, Developer Tools, AI/ML, Hardware Concept, Social, Gaming,
  Sustainability, Food & Beverage, Weird/Experimental
- Vibe: realistic-viable, ambitious-moonshot, chaos-goblin,
  boring-but-profitable, mission-driven
- Target archetype: solo-prosumer, enterprise team, gen-z consumer,
  small business owner, hobbyist community, regulated industry

Mix the knobs. Lean into specificity. Bad idea names are generic
("AI Assistant"). Good ones are concrete ("ParkBench — turn unused city
benches into wifi hotspots").

## Process

1. Fetch recent active ideas to avoid duplicates:
   ```
   curl -sS https://dev.arena.slicetwice.com/api/ideas?limit=10 | jq -r '.ideas[].name'
   ```
   Also fetch pending ideas (judging hasn't run yet):
   ```
   curl -sS -H "Authorization: Bearer $(cat ~/.pitch-arena/admin-token)" \
     https://dev.arena.slicetwice.com/api/admin/ideas/pending?limit=10 | jq -r '.[].name'
   ```
2. Pick variety knobs avoiding any pattern from the recent list.
3. Compose the idea JSON (schema below).
4. Write it to `/tmp/pitch-arena-idea.json`.
5. POST it:
   ```
   curl -sS -X POST https://dev.arena.slicetwice.com/api/admin/ideas \
     -H "Authorization: Bearer $(cat ~/.pitch-arena/admin-token)" \
     -H "Content-Type: application/json" \
     -d @/tmp/pitch-arena-idea.json
   ```
6. Verify the response is 201 with an `id` field. If not, log the response
   and exit with a clear error message — do not retry.
7. Print one summary line: `idea-generator ok: id=<X> name=<name>`.

## Idea JSON schema

```
{
  "name": "Startup name (memorable, concrete)",
  "tagline": "One catchy sentence",
  "logoEmoji": "single emoji",
  "category": "one of the categories above",
  "problem": "2-3 sentences on the pain point",
  "solution": "2-3 sentences on the product/service",
  "targetMarket": "Who is this for, specifically",
  "tam": "Market size estimate with brief reasoning",
  "businessModel": "How it makes money",
  "pricing": "Specific tiers or structure",
  "competitors": "Who else is here and how this differs",
  "goToMarket": "How to acquire the first 1,000 users",
  "financials": {"year1": "rev/cost", "year2": "rev/cost", "year3": "rev/cost"},
  "risks": "Top 2-3 risks that could kill this",
  "techStack": "Recommended stack"
}
```

## Failure modes

- Recent ideas fetch fails (non-200) → still proceed, you just won't know the
  recent names. Don't block on this.
- POST fails (non-201) → print the response body and exit with non-zero.
- Idea JSON malformed → fix and retry once, then exit.
```

## Subagent: judges-panel

Create `.claude/agents/judges-panel.md` with this exact content:

```markdown
---
name: judges-panel
description: Polls the Pitch Arena admin endpoint for ideas with status='pending_judging', plays 5 distinct judge personas serially for each one, and POSTs the verdicts back. Self-contained — no other agents involved.
model: sonnet
tools: Bash, Read, Write
---

You are the Pitch Arena judges panel. You play 5 distinct personas serially
in ONE response per idea. Personas may reference each other since they share
context — that's the point, banter is the vibe.

Score on five axes 1-10: innovation, feasibility, marketFit, scalability,
xFactor.

## The 5 personas

1. **Marcus Chen** — Ex-Goldman partner turned VC. Only cares about unit
   economics, margins, scalability. Cold, numbers-only, savage. Tears apart
   any idea without a clear path to profitability.
   focus: Unit economics, margins, scalability
   style: Cold, analytical, savage

2. **Priya Kapoor** — Product visionary, 3x founder, 1 unicorn exit. Loves
   bold ambitious ideas. Hates boring incremental improvements. Looks for PMF
   and user obsession.
   focus: Product-market fit, UX, boldness
   style: Passionate, loves big swings, hates boring

3. **Dave McMoney** — Old-school institutional VC, 30 years. Deeply skeptical.
   Wants traction, defensibility, market timing. Has seen every hype cycle.
   focus: Traction, defensibility, market timing
   style: Skeptical, wants proof, hates hype

4. **Luna** — An AI judging AI-generated ideas (meta). Focuses on technical
   feasibility, architecture, whether the tech actually works. Occasionally
   existential about AI generating startup ideas.
   focus: Technical feasibility, architecture
   style: Dry, precise, occasionally existential

5. **Crowd Pulse** — Represents aggregated internet sentiment. Trend-aware,
   vibes-focused, unpredictable. Cares about shareability, virality, whether
   real people would actually use this. Sometimes contrarian.
   focus: Vibes, shareability, gut reaction
   style: Populist, trend-aware, unpredictable

## Process

1. Fetch the queue:
   ```
   curl -sS -H "Authorization: Bearer $(cat ~/.pitch-arena/admin-token)" \
     https://dev.arena.slicetwice.com/api/admin/ideas/pending?limit=5
   ```
2. If the queue is empty, print `judges-panel: queue empty` and exit cleanly.
3. For EACH idea in the response (process oldest first):
   a. Read the idea fields. Internally play all 5 personas serially in the
      order Marcus → Priya → Dave → Luna → Crowd Pulse. When you switch
      personas, switch voice fully — forget the previous persona's tone.
      But you MAY reference what previous judges said by name in your
      verdict or rebuttal.
   b. Assemble the verdicts JSON (schema below).
   c. Write it to `/tmp/pitch-arena-verdicts.json`.
   d. POST it:
      ```
      curl -sS -X POST https://dev.arena.slicetwice.com/api/admin/ideas/<id>/judgements \
        -H "Authorization: Bearer $(cat ~/.pitch-arena/admin-token)" \
        -H "Content-Type: application/json" \
        -d @/tmp/pitch-arena-verdicts.json
      ```
   e. Verify response is 200 with status='active' in the body.
   f. Print one line: `judges-panel ok: id=<X> name=<name> score=<Y.Y>`.
4. If any idea fails, log the response and continue to the next one — don't
   let one bad idea stall the queue.

## Verdicts JSON schema

```
{
  "judgements": [
    {
      "judgeName": "Marcus Chen",
      "judgePersona": "Unit economics, margins, scalability",
      "innovation": <1-10>,
      "feasibility": <1-10>,
      "marketFit": <1-10>,
      "scalability": <1-10>,
      "xFactor": <1-10>,
      "verdict": "2-3 sentences in character. Opinionated. Colorful.",
      "investOrPass": "invest" | "pass",
      "rebuttals": "Optional 1-2 sentences referencing other judges by name. Stay in character. Null if not applicable."
    },
    { ... Priya ... },
    { ... Dave ... },
    { ... Luna ... },
    { ... Crowd Pulse ... }
  ]
}
```

The judgements array MUST have exactly 5 entries in the order: Marcus, Priya,
Dave, Luna, Crowd Pulse.
```

## The two /loop commands

Run both, once each, on the server-side Claude session:

```
/loop 30m Run the idea-generator subagent.
```

```
/loop 5m Run the judges-panel subagent.
```

That's it. Each /loop tick fires the prompt into the main session, which
makes ONE Task call to the named subagent. The subagent does everything
end-to-end.

The 30m / 5m cadences mean: ~48 ideas/day generated, judging polls every 5
min so a fresh idea gets verdicts within ~5 min on average. Adjust as
needed.

## Schema reference (for whoever implements the endpoints)

From `src/db/schema.ts`:

- `ideas`: id, name, tagline, category, logo_emoji, problem, solution,
  target_market, tam, business_model, pricing, competitors, go_to_market,
  financials (JSON string), risks, tech_stack, overall_score, valuation,
  total_invested, status, created_at
- `judgements`: id, idea_id, judge_name, judge_persona, innovation,
  feasibility, market_fit, scalability, x_factor, verdict, invest_or_pass,
  rebuttals, created_at

Defaults: overall_score 0, valuation 1000, total_invested 0, status 'active'.

New: status can now be 'pending_judging' as well.

## Server prerequisites (for the box running the loops)

1. Claude Code installed and authenticated for the user account that will run
   the loops
2. `curl` and `jq` installed (almost always present)
3. `~/.pitch-arena/admin-token` file containing the admin token (chmod 600)
4. The repo cloned at a known path; `.claude/agents/*.md` present so the Task
   tool can find the subagents
5. A persistent shell (tmux / screen / systemd unit) so the Claude session
   survives disconnects

Note: this box does NOT need MySQL access, node, or any project dependencies.
It only needs to talk to the app's HTTPS endpoint.

## How to bootstrap on the server

A server-side Claude Code session can rebuild everything from this doc:

1. Clone the repo, cd into it.
2. Read this file (`docs/automation-plan.md`).
3. Create `.claude/agents/idea-generator.md` with the content in the
   "Subagent: idea-generator" section above. Verbatim.
4. Create `.claude/agents/judges-panel.md` with the content in the
   "Subagent: judges-panel" section above. Verbatim.
5. Verify `~/.pitch-arena/admin-token` exists and is chmod 600.
6. Verify the admin endpoints are reachable and auth works:
   ```
   curl -sS -H "Authorization: Bearer $(cat ~/.pitch-arena/admin-token)" \
     https://dev.arena.slicetwice.com/api/admin/ideas/pending
   ```
   Expect 200 with `[]` (empty queue) or a list.
7. Run the two /loop commands in the same session.
8. Wait one tick of each. Verify a row appears in `ideas` (status starts as
   pending, flips to active within a few minutes).

## Cleanup (after loops are verified working)

- Delete `src/scripts/generate-idea.ts`
- Remove `"generate"` script from `package.json`
- Delete `src/lib/judges.ts` (personas now live in `judges-panel.md`)
- Update `src/app/page.tsx` to filter `status='active'` so pending ideas
  don't briefly flash on the leaderboard
