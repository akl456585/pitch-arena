# Pitch Arena automation plan

This document is the spec a server-side Claude Code session reads to (re)build
the automation. It contains the slash command definitions, the `/loop`
commands, and the prerequisites the server box needs.

## Design constraints

- All triggering happens via Claude Code's built-in `/loop` command.
- **The loop is the agent looping itself.** `/loop` runs a slash command
  directly in the main Claude Code session. The main session IS the agent
  — it executes the work inline. No Task dispatch, no subagents, no nested
  spawning.
- Each slash command is self-contained and idempotent per tick. If a tick
  fails, the next tick starts fresh.
- Independent workers, no orchestrator. The two loops share state only
  through the `ideas.status` column in MySQL.

## Architecture — independent workers, DB queue

```
server box
└── claude code session (long-running, persistent)
    ├── /loop 2h /generate-idea
    │             └── per tick: main session executes .claude/commands/generate-idea.md
    │                 inline (curl GET recent ideas → compose → POST → done)
    │
    └── /loop 1h /judge-pending
                  └── per tick: main session executes .claude/commands/judge-pending.md
                      inline (curl GET pending → judge each → POST → done)

shared state: ideas.status column in MySQL
  - 'pending_judging' → set by /generate-idea after POST
  - 'active'          → set by /judge-pending after verdicts land
  - 'archived'        → existing terminal state, untouched
```

Two slash commands, two loops, zero coordination logic. Each command has no
idea the other exists. The DB is the queue.

Why this satisfies the constraints:
- `/loop` runs the slash command prompt directly in the main session. No
  Task tool, no subagent spawn, no orchestrator.
- Different cadences: idea-gen every 2h, judging every 1h so the backlog
  drains at the same rate as it accumulates (or faster).
- Failure isolation: if judging breaks, ideas keep stacking up as
  `pending_judging` and are hidden from the frontend. If idea-gen breaks,
  judging finishes the backlog and idles.

## Files in the repo

```
.claude/
  commands/
    generate-idea.md        # slash command: compose + POST one idea
    judge-pending.md        # slash command: poll pending + judge + POST verdicts
docs/
  automation-plan.md        # this file
src/app/api/admin/
  ideas/route.ts                       # POST: create idea (status=pending_judging)
  ideas/[id]/judgements/route.ts       # POST: attach 5 verdicts (status→active)
  ideas/pending/route.ts               # GET: list ideas needing judgement
src/lib/admin-auth.ts                  # bearer token check
```

## Schema state

`ideas.status` is a `varchar(20)` with default `'active'`. Valid values:

- `'pending_judging'` — set by /generate-idea after POST; hidden from frontend
- `'active'` — set by /judge-pending after verdicts land; shown on frontend
- `'archived'` — existing terminal state, untouched

No migration needed — the column already exists, we just use a new value.
The home page query (`src/app/page.tsx`) filters
`where(eq(schema.ideas.status, 'active'))` to hide un-judged stubs.

## Endpoints

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

**Response**: array of ideas with full fields, ordered by id ASC (FIFO).
Only ideas with status='pending_judging'.

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

## ADMIN_TOKEN setup

1. Generate a long random string: `openssl rand -hex 32`.
2. Add `ADMIN_TOKEN=<value>` to `.env.local` for dev.
3. Add as a GitHub secret: `gh secret set ADMIN_TOKEN`.
4. The deploy workflow's "Create env file" step injects
   `ADMIN_TOKEN=${{ secrets.ADMIN_TOKEN }}` into `.env.production`.
5. Container picks it up via `env_file` in docker-compose.yml.
6. Restart the container (via redeploy) so it picks up the new env var.
7. On the box running the loops, save the token to
   `~/.pitch-arena/admin-token` (chmod 600).

## Slash commands

The two slash command files under `.claude/commands/` are the agent logic.
`/loop` runs them as normal slash commands in the main Claude Code session —
they are NOT subagent definitions and must not be spawned via the Task tool.

- `.claude/commands/generate-idea.md` — compose + POST one fresh idea.
- `.claude/commands/judge-pending.md` — fetch pending queue, judge each,
  POST verdicts.

Both files are self-contained instructions that the main session reads and
executes inline. The frontmatter only declares a description; there is no
`model` or `tools` field because no subagent is being spawned.

## The two /loop commands

Run both, once each, on the server-side Claude session:

```
/loop 2h /generate-idea
```

```
/loop 1h /judge-pending
```

That's it. Each `/loop` tick fires the slash command into the main session,
which executes the instructions inline. No Task calls, no subagents.

The 2h / 1h cadences mean: ~12 ideas/day generated, judging polls every
hour so a fresh idea gets verdicts within ~1 hour on average. Adjust as
needed.

## Schema reference

From `src/db/schema.ts`:

- `ideas`: id, name, tagline, category, logo_emoji, problem, solution,
  target_market, tam, business_model, pricing, competitors, go_to_market,
  financials (JSON string), risks, tech_stack, overall_score, valuation,
  total_invested, status, created_at
- `judgements`: id, idea_id, judge_name, judge_persona, innovation,
  feasibility, market_fit, scalability, x_factor, verdict, invest_or_pass,
  rebuttals, created_at

Defaults: overall_score 0, valuation 1000, total_invested 0, status 'active'.
`status` can now also be `'pending_judging'`.

## Server prerequisites (for the box running the loops)

1. Claude Code installed and authenticated for the user account that will run
   the loops
2. `curl` and `jq` installed (almost always present)
3. `~/.pitch-arena/admin-token` file containing the admin token (chmod 600)
4. The repo cloned at a known path so `.claude/commands/*.md` is available
   to the Claude Code session
5. A persistent shell (tmux / screen / systemd unit) so the Claude session
   survives disconnects

Note: this box does NOT need MySQL access, node, or any project dependencies.
It only needs to talk to the app's HTTPS endpoint.

## How to bootstrap on the server

A server-side Claude Code session can rebuild everything from this doc:

1. Clone the repo, cd into it.
2. Read this file (`docs/automation-plan.md`).
3. Verify `.claude/commands/generate-idea.md` and
   `.claude/commands/judge-pending.md` exist. (If not, recreate them from
   this doc's schema section plus the persona list below.)
4. Verify `~/.pitch-arena/admin-token` exists and is `chmod 600`.
5. Verify the admin endpoints are reachable and auth works:
   ```
   curl -sS -H "Authorization: Bearer $(cat ~/.pitch-arena/admin-token)" \
     https://dev.arena.slicetwice.com/api/admin/ideas/pending
   ```
   Expect 200 with `[]` (empty queue) or a list.
6. Run the two /loop commands in the same session:
   ```
   /loop 2h /generate-idea
   /loop 1h /judge-pending
   ```
7. Wait one tick of each. Verify a row appears in `ideas` (status starts as
   `pending_judging`, flips to `active` within an hour).
