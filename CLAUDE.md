# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PiggyHub is a family financial-education app. Parents manage money, chores, and savings goals for their children; kids get a simplified, motivational view. Every dollar a child earns is split across three buckets — **Spend / Save / Give** — by per-child ratios that sum to 100%.

`PRD.md` is the authoritative spec: it documents shipped phases 1–4, the database schema, remaining work (phases 5–8), and known tech debt. Read it before non-trivial feature work.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit against tsconfig.app.json
npm run test       # vitest run (one-shot)
npx vitest run src/lib/choreApproval.test.ts   # single test file
npx vitest                                       # watch mode
```

Requires `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Architecture

React 18 + TypeScript + Tailwind, bundled with Vite. Backend is Supabase (Postgres + Auth + Row-Level Security) — there is **no custom server and no API layer**: components and contexts call `supabase` (from [src/lib/supabase.ts](src/lib/supabase.ts)) directly.

### The ledger is the single source of truth

There is **no balance column anywhere**. A child's bucket balances are always derived by summing their `transactions` rows (see `balancesByChild` in [src/context/ChoresContext.tsx](src/context/ChoresContext.tsx) and `sumBalances` in [src/lib/balances.ts](src/lib/balances.ts)). Spends and transfer-outs are stored as **negative** amounts; a transfer is two rows (negative `from`, positive `to`). Goal progress is likewise derived by summing `goal_contributions`. Never add a cached balance field — preserve this invariant when adding money flows.

Money math goes through `splitEarning` in [src/lib/balances.ts](src/lib/balances.ts), which is **cent-correct**: it rounds in integer cents and assigns the remainder to the `give` bucket so splits always sum exactly to the input.

### State: nested React Context, no external store

Provider order in [src/App.tsx](src/App.tsx) is significant — each layer depends on the one above:

```
AuthProvider → FamilyProvider → ChoresProvider → GoalsProvider
```

- [AuthContext](src/context/AuthContext.tsx) — Supabase session.
- [FamilyContext](src/context/FamilyContext.tsx) — the family row (auto-created on first login) and active (non-archived) children; also `awardBadge`.
- [ChoresContext](src/context/ChoresContext.tsx) — chores, completions, **and the transaction ledger + all money mutations** (`addMoney`, `recordSpend`, `transferMoney`, `payAllowance`, approval payouts). This is the largest context; most money logic lives here.
- [GoalsContext](src/context/GoalsContext.tsx) — goals and goal contributions.

Mutations follow a consistent pattern: write to Supabase with `.select().maybeSingle()` (or `.select()` for bulk inserts), throw on error, then **optimistically update local state** with the returned row(s). There is no global refetch after writes — keep returned rows in sync with local state when adding mutations.

Routing is a hand-rolled `view` state union in `App.tsx` (`dashboard` / `child` / `kid`), not a router library. The three top-level pages are [Dashboard](src/pages/Dashboard.tsx), [ChildDetail](src/pages/ChildDetail.tsx) (parent, 3 tabs), and [KidView](src/pages/KidView.tsx) (child-facing). Parent-vs-kid capability differences (kids can contribute to goals but not create/edit/mark-bought) are enforced in the UI only.

### Chore approval flow

The payout logic on chore approval is isolated as a **pure function**, `buildApprovalPlan` in [src/lib/choreApproval.ts](src/lib/choreApproval.ts) — it takes a chore/child/prior-completions and returns the `earn` transactions (split by ratio), an optional `match` transaction (if `savings_match_rate > 0`), and the new streak count, performing no I/O. `ChoresContext.approveCompletion` calls it, then persists. This is the most-tested code in the repo ([choreApproval.test.ts](src/lib/choreApproval.test.ts), 11 cases). **Keep approval/payout math here and unit-tested**, not inlined into the context.

### Database

Migrations live in [supabase/migrations/](supabase/migrations/), named by phase. Tables: `families`, `children`, `chores`, `chore_completions`, `transactions`, `goals`, `goal_contributions`. RLS is enabled on every table; all policies authorize through `families.parent_user_id = auth.uid()`. TypeScript row shapes are hand-maintained in [src/lib/types.ts](src/lib/types.ts) — there is no generated Supabase types file, so update `types.ts` to match any schema change.
